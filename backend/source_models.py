"""Shared source contracts for extraction, preview and load (including nested sources)."""
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, BeforeValidator, model_validator
from connection_models import ConnectionInput


def reject_boolean_year(value):
    if isinstance(value, bool):
        raise ValueError("El año debe ser un entero, no un booleano.")
    return value


Year = Annotated[int, BeforeValidator(reject_boolean_year)]


def validate_year_range(start_year, end_year):
    # pandas 3 uses microsecond resolution here (not the older ns bounds).
    # The unpadded year strings in DateTime parse 1..99 as other years;
    # 100..9999 preserve the requested year and fit Python's calendar.
    if start_year is None or end_year is None:
        raise ValueError("La dimensión fecha requiere start_year y end_year.")
    if not 100 <= start_year <= end_year <= 9999:
        raise ValueError("Los años deben cumplir 100 <= start_year <= end_year <= 9999.")


class DateDimensionReq(BaseModel):
    start_year: Year
    end_year: Year

    @model_validator(mode="after")
    def valid_range(self):
        validate_year_range(self.start_year, self.end_year)
        return self


class SourceModel(ConnectionInput):
    type: Literal["file", "database", "date_dimension"]
    filepath: Optional[str] = None
    sheet_name: Optional[str] = None
    table_name: Optional[str] = None
    service_name: Optional[str] = None
    use_agent: Optional[bool] = False
    agent_id: Optional[str] = None
    start_year: Optional[Year] = None
    end_year: Optional[Year] = None

    @model_validator(mode="after")
    def validate_variant(self):
        if self.type == "file" and not self.filepath:
            raise ValueError("La fuente archivo requiere filepath.")
        if self.type == "date_dimension":
            validate_year_range(self.start_year, self.end_year)
        if self.type == "database":
            self.require_connection()
            if not self.table_name:
                raise ValueError("Falta la tabla de origen.")
        elif self.connection_id:
            raise ValueError("Una conexión guardada requiere una fuente database.")
        if self.use_agent:
            if self.type != "database" or not self.agent_id or not self.agent_id.strip():
                raise ValueError("El agente requiere una fuente database y agent_id.")
        return self
