"""Validate/allowlist public responses at both HTTP and agent boundaries."""
from typing import Literal
from pydantic import Field, TypeAdapter
from .models import Model, Scalar

LogicalType = Literal["integer", "decimal", "float", "boolean", "string", "date", "datetime"]
Encoding = Literal["native", "decimal_string", "integer_string", "iso8601"]


class Warning(Model):
    code: str
    message: str
    table_id: str | None = None


class Column(Model):
    id: str
    label: str
    logical_type: LogicalType
    encoding: Encoding
    role: Literal["dimension", "metric"]


class Count(Model):
    value: int | str
    logical_type: Literal["integer"]
    encoding: Literal["native", "integer_string"]


class Meta(Model):
    returned_rows: int = Field(ge=0)
    applied_limit: int = Field(ge=1)
    truncated: bool
    generated_at: str
    execution_time_ms: float = Field(ge=0)
    consistency: Literal["snapshot", "statement"]
    temporal_context: dict[Literal["timezone", "calendar", "naive_timestamp"], str]


class Kpi(Model):
    metric_id: str
    aggregation: str
    value: Scalar | None
    logical_type: LogicalType
    encoding: Encoding


class Result(Model):
    status: Literal["success"]
    columns: list[Column]
    data: list[dict[str, Scalar | None]]
    meta: Meta
    warnings: list[Warning]


class QueryResponse(Result):
    summary_kpis: list[Kpi]
    filtered_rows: Count


from .analysis_models import AnalysisSpec


class MeasureCounts(Model):
    metric_id: str
    observed: Count
    valid: Count
    excluded: Count


class AnalysisResponse(Result):
    summary_kpis: list[Kpi]
    filtered_rows: Count
    definition: AnalysisSpec
    execution_id: str
    units: dict[str, str]
    measure_counts: list[MeasureCounts]


class ReportResponse(Model):
    status: Literal["success"]
    version: Literal[1]
    results: list[AnalysisResponse] = Field(min_length=1, max_length=8)
    execution_id: str


class Pagination(Model):
    mode: Literal["page", "sample"]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    has_more: bool
    total_records: Count | None


class DetailResponse(Result):
    pagination: Pagination


class CatalogColumn(Model):
    name: str
    data_type: str
    logical_type: LogicalType | Literal["unsupported"]
    nullable: bool | None
    is_pk: bool
    is_fk: bool
    operations: list[str]


class CatalogTable(Model):
    table_id: str
    schema_name: str = Field(alias="schema")
    table_name: str
    selectable: bool
    role_hint: Literal["fact", "dimension", "table", "unknown"]
    columns: list[CatalogColumn]
    primary_key: list[str]
    unique_keys: list[list[str]]


class RelationshipPair(Model):
    source_column: str
    target_column: str


class Relationship(Model):
    id: str
    source_table_id: str
    target_table_id: str
    column_pairs: list[RelationshipPair]
    evidence: Literal["foreign_key"]
    external: bool
    selectable: bool


class CatalogCapabilities(Model):
    protocol_version: Literal[1]
    supported_operations: list[str]
    effective_limits: dict[str, int]


class CatalogResponse(Model):
    status: Literal["success"]
    schema_name: str = Field(alias="schema")
    tables: list[CatalogTable]
    relationships: list[Relationship]
    warnings: list[Warning]
    capabilities: CatalogCapabilities


class ExportResponse(Model):
    filename: Literal["reporte_bodega.csv", "reporte_bodega.json"]
    mime_type: Literal["application/json", "text/csv; charset=utf-8"]
    size: int = Field(ge=0)
    content_base64: str


RESPONSES = {name: TypeAdapter(model) for name, model in {
    "catalog": CatalogResponse, "query": QueryResponse, "detail": DetailResponse, "export": ExportResponse,
    "analyze": AnalysisResponse, "report": ReportResponse,
}.items()}
