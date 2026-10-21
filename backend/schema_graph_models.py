"""Public graph contract. Unknown external attributes remain null."""
from typing import Literal
from pydantic import BaseModel, Field


class GraphColumn(BaseModel):
    name: str
    data_type: str | None
    nullable: bool | None
    is_pk: bool | None
    is_fk: bool | None


class GraphNode(BaseModel):
    id: str
    schema_name: str = Field(alias="schema")
    table_name: str
    selectable: bool
    columns: list[GraphColumn]


class ColumnPair(BaseModel):
    source_column: str
    target_column: str


class GraphEdge(BaseModel):
    id: str
    constraint_name: str | None
    source_table_id: str
    target_table_id: str
    column_pairs: list[ColumnPair]
    target_schema: str
    target_table: str
    external: bool


class GraphWarning(BaseModel):
    code: str
    table_id: str | None = None
    message: str


class SchemaGraphResponse(BaseModel):
    status: Literal["success"]
    schema_name: str = Field(alias="schema")
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    warnings: list[GraphWarning]
