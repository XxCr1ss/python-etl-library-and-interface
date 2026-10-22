"""Wire references are mutually exclusive with manual connection credentials."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator


class ConnectionInput(BaseModel):
    connection_id: UUID | None = None
    connection_version: int | None = Field(default=None, ge=1)
    runtime_agent_id: str | None = Field(default=None, max_length=120)
    db_type: str | None = None
    host: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    database: str | None = None
    user: str | None = None
    password: str | None = Field(default=None, repr=False)
    service_name: str | None = None
    use_agent: bool = False
    agent_id: str | None = None

    @field_validator("db_type")
    @classmethod
    def engine(cls, value):
        if value is not None and value.lower() not in {"postgresql", "mysql", "oracle"}:
            raise ValueError("Motor no soportado: postgresql, mysql u oracle.")
        return value.lower() if value else value

    @model_validator(mode="after")
    def reference_mode(self):
        if self.connection_id:
            if self.connection_version is None:
                raise ValueError("La conexión guardada requiere su versión.")
            manual = {"db_type", "host", "port", "database", "user", "password", "service_name", "use_agent", "agent_id"}
            if manual & self.model_fields_set:
                raise ValueError("No mezcles una conexión guardada con credenciales manuales.")
        elif self.connection_version is not None:
            raise ValueError("Falta la referencia de conexión guardada.")
        return self

    def require_connection(self):
        if not self.connection_id:
            if not all((self.db_type, self.host, self.database, self.user)) or self.password is None:
                raise ValueError("La conexión requiere motor, host, base de datos, usuario y contraseña.")
            if self.use_agent and not (self.agent_id and self.agent_id.strip()):
                raise ValueError("Falta agent_id para utilizar el agente local.")
        return self


class DatabaseConnectionInput(ConnectionInput):
    @model_validator(mode="after")
    def complete(self):
        return self.require_connection()


class SavedConnectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    connection_type: Literal["source", "target"]
    db_type: Literal["postgresql", "mysql", "oracle"]
    host: str = Field(min_length=1, max_length=255, pattern=r"^[A-Za-z0-9.\-:]+$")
    port: int | None = Field(default=None, ge=1, le=65535)
    database: str = Field(min_length=1, max_length=120)
    user: str = Field(min_length=1, max_length=120)
    password: str = Field(max_length=8192, repr=False)
    service_name: str | None = Field(default=None, max_length=120)
    transport: Literal["direct", "agent"] = "direct"
    runtime_agent_id: str | None = Field(default=None, max_length=120)

    @field_validator("name", "host", "database", "user")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Este campo es obligatorio.")
        return value.strip()


class SavedConnectionPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    db_type: Literal["postgresql", "mysql", "oracle"] | None = None
    host: str | None = Field(default=None, min_length=1, max_length=255, pattern=r"^[A-Za-z0-9.\-:]+$")
    port: int | None = Field(default=None, ge=1, le=65535)
    database: str | None = Field(default=None, min_length=1, max_length=120)
    user: str | None = Field(default=None, min_length=1, max_length=120)
    password: str | None = Field(default=None, max_length=8192, repr=False)
    service_name: str | None = Field(default=None, max_length=120)
    transport: Literal["direct", "agent"] | None = None
    runtime_agent_id: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def explicit_null(self):
        for field in self.model_fields_set - {"port", "service_name", "runtime_agent_id"}:
            if getattr(self, field) is None:
                raise ValueError("No se admite null en este campo.")
        return self
