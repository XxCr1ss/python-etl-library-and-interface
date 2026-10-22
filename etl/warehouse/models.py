from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictFloat, StrictInt, StrictStr, model_validator
from .settings import LIMITS

Name = Annotated[str, Field(strict=True, min_length=1, max_length=512)]
OutputId = Annotated[str, Field(strict=True, min_length=1, max_length=64, pattern=r"^[A-Za-z][A-Za-z0-9_]*$")]
Scalar = StrictStr | StrictInt | StrictFloat | StrictBool
Bucket = Literal["year", "month", "day"]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Connection(Model):
    db_type: Literal["postgresql", "mysql", "oracle"]
    host: Name
    port: Annotated[int, Field(strict=True, ge=1, le=65535)] | None = None
    database: Name
    user: Name
    password: Annotated[str, Field(strict=True, max_length=4096)] = Field(repr=False)
    service_name: Name | None = None
    use_agent: StrictBool = False
    agent_id: Name | None = None

    @model_validator(mode="after")
    def valid_connection(self):
        if any(not value.strip() for value in (self.host, self.database, self.user)):
            raise ValueError("Completa host, base de datos y usuario.")
        if self.db_type == "oracle" and not self.service_name:
            raise ValueError("Oracle requiere service_name.")
        if self.use_agent and (not self.agent_id or not self.agent_id.strip()):
            raise ValueError("Falta agent_id para utilizar el agente.")
        return self


class FieldRef(Model):
    relation: OutputId = "base"
    column: Name


class NullFilter(Model):
    field: FieldRef
    op: Literal["IS_NULL", "IS_NOT_NULL"]


class ValueFilter(Model):
    field: FieldRef
    op: Literal["EQ", "NE", "GT", "GTE", "LT", "LTE", "CONTAINS"]
    value: Scalar


class InFilter(Model):
    field: FieldRef
    op: Literal["IN"]
    values: Annotated[list[Scalar], Field(min_length=1, max_length=LIMITS["in_values"])]


class BetweenFilter(Model):
    field: FieldRef
    op: Literal["BETWEEN"]
    values: tuple[Scalar, Scalar]


Filter = Annotated[NullFilter | ValueFilter | InFilter | BetweenFilter, Field(discriminator="op")]


class Pair(Model):
    base_column: Name
    target_column: Name


class ForeignKey(Model):
    kind: Literal["foreign_key"]
    relationship_id: Name


class ManualKey(Model):
    kind: Literal["manual"]
    pairs: Annotated[list[Pair], Field(min_length=1, max_length=16)]


class Join(Model):
    id: OutputId
    target_table_id: Name
    type: Literal["LEFT", "INNER"] = "LEFT"
    via: Annotated[ForeignKey | ManualKey, Field(discriminator="kind")]


class Selection(Model):
    base_table_id: Name
    joins: Annotated[list[Join], Field(max_length=LIMITS["joins"])] = Field(default_factory=list)
    filters: Annotated[list[Filter], Field(max_length=LIMITS["filters"])] = Field(default_factory=list)

    @model_validator(mode="after")
    def unique_joins(self):
        ids = [j.id for j in self.joins]
        if "base" in ids or len(set(ids)) != len(ids):
            raise ValueError("Cada relación requiere un ID único distinto de base.")
        return self


class CountRows(Model):
    id: OutputId
    label: Name | None = None
    aggregation: Literal["COUNT_ROWS"]


class ColumnMetric(Model):
    id: OutputId
    label: Name | None = None
    aggregation: Literal["SUM", "AVG", "MIN", "MAX", "COUNT", "COUNT_DISTINCT"]
    column: Name


Metric = Annotated[CountRows | ColumnMetric, Field(discriminator="aggregation")]


class Dimension(Model):
    id: OutputId
    field: FieldRef
    bucket: Bucket | None = None
    label: Name | None = None


class Order(Model):
    field_id: OutputId
    direction: Literal["ASC", "DESC"] = "ASC"


class Query(Selection):
    metrics: Annotated[list[Metric], Field(min_length=1, max_length=LIMITS["metrics"])]
    dimensions: Annotated[list[Dimension], Field(max_length=LIMITS["dimensions"])] = Field(default_factory=list)
    order_by: Annotated[list[Order], Field(max_length=10)] = Field(default_factory=list)
    limit: Annotated[int, Field(strict=True, ge=1, le=LIMITS["groups"])] = 20

    @model_validator(mode="after")
    def unique_outputs(self):
        ids = [x.id for x in [*self.metrics, *self.dimensions]]
        if len(set(ids)) != len(ids) or any(o.field_id not in ids for o in self.order_by):
            raise ValueError("IDs de salida únicos; ordenar solo por campos seleccionados.")
        return self


class Projection(Model):
    id: OutputId
    field: FieldRef


class Drilldown(Model):
    field: FieldRef
    bucket: Bucket | None = None
    value: Scalar | None


class CatalogRequest(Model):
    connection: Connection


class QueryRequest(CatalogRequest):
    query: Query


class DetailSpec(Model):
    selection: Selection
    columns: Annotated[list[Projection], Field(min_length=1, max_length=LIMITS["columns"])]
    drilldown: Annotated[list[Drilldown], Field(max_length=LIMITS["dimensions"])] = Field(default_factory=list)
    order_by: Annotated[list[Order], Field(max_length=LIMITS["columns"])] = Field(default_factory=list)

    @model_validator(mode="after")
    def unique_columns(self):
        ids = [c.id for c in self.columns]
        if len(set(ids)) != len(ids) or any(o.field_id not in ids for o in self.order_by):
            raise ValueError("Columnas únicas; ordenar solo por columnas seleccionadas.")
        return self


class DetailRequest(CatalogRequest, DetailSpec):
    page: Annotated[int, Field(strict=True, ge=1)] = 1
    page_size: Annotated[int, Field(strict=True, ge=1, le=LIMITS["page_size"])] = 50
    include_total: StrictBool = False

    @model_validator(mode="after")
    def bounded_offset(self):
        if (self.page - 1) * self.page_size > LIMITS["offset"]:
            raise ValueError("Se superó el límite de paginación; aplica más filtros.")
        return self


class AggregateExport(QueryRequest):
    mode: Literal["aggregate"]
    format: Literal["csv", "json"]


class DetailExport(CatalogRequest, DetailSpec):
    mode: Literal["detail"]
    format: Literal["csv", "json"]
    max_rows: Annotated[int, Field(strict=True, ge=1, le=LIMITS["export_rows"])] = LIMITS["export_rows"]


class SampleExport(CatalogRequest, DetailSpec):
    mode: Literal["sample"]
    format: Literal["csv", "json"]
    limit: Annotated[int, Field(strict=True, ge=1, le=LIMITS["page_size"])] = 100


ExportRequest = Annotated[AggregateExport | DetailExport | SampleExport, Field(discriminator="mode")]
