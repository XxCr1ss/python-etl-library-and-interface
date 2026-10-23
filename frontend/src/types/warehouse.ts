import type { ManualConnectionDto } from "./etl";

export type Scalar = string | number | boolean | null;
export type LogicalType = "integer" | "decimal" | "float" | "boolean" | "string" | "date" | "datetime";
export type Encoding = "native" | "decimal_string" | "integer_string" | "iso8601";
export type Aggregation = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT_ROWS" | "COUNT" | "COUNT_DISTINCT";
export type Bucket = "year" | "month" | "day";
export type FieldRef = { relation: string; column: string };
export type Metric = { id: string; label?: string } & ({ aggregation: "COUNT_ROWS" } | { aggregation: Exclude<Aggregation, "COUNT_ROWS">; column: string });
export type WarehouseFilter = { field: FieldRef } & (
  | { op: "IS_NULL" }
  | { op: "IS_NOT_NULL" }
  | { op: "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS"; value: Exclude<Scalar, null> }
  | { op: "IN"; values: Exclude<Scalar, null>[] }
  | { op: "BETWEEN"; values: [Exclude<Scalar, null>, Exclude<Scalar, null>] }
);
export interface WarehouseJoin {
  id: string; target_table_id: string; type: "LEFT" | "INNER";
  source_relation?: string;
  via: { kind: "foreign_key"; relationship_id: string } | { kind: "manual"; pairs: { base_column: string; target_column: string }[] };
}
export interface Selection { base_table_id: string; joins: WarehouseJoin[]; filters: WarehouseFilter[] }
export interface Dimension { id: string; field: FieldRef; bucket?: Bucket; label?: string }
export interface Order { field_id: string; direction: "ASC" | "DESC" }
export interface WarehouseQuery extends Selection { metrics: Metric[]; dimensions: Dimension[]; order_by: Order[]; limit: number }
export interface Projection { id: string; field: FieldRef }
export interface Drilldown { field: FieldRef; bucket?: Bucket; value: Scalar }
export interface DetailSpec { selection: Selection; columns: Projection[]; drilldown: Drilldown[]; order_by: Order[] }
export interface DetailRequest extends DetailSpec { page: number; page_size: number; include_total: boolean }
export type ExportSpec = { format: "csv" | "json" } & (
  | { mode: "aggregate"; query: WarehouseQuery }
  | ({ mode: "detail"; max_rows: number } & DetailSpec)
  | ({ mode: "sample"; limit: number } & DetailSpec)
);
export interface CatalogColumn { name: string; data_type: string; logical_type: LogicalType | "unsupported"; nullable: boolean | null; is_pk: boolean; is_fk: boolean; operations: string[] }
export interface CatalogTable { table_id: string; schema: string; table_name: string; selectable: boolean; role_hint: "fact" | "dimension" | "table" | "unknown"; columns: CatalogColumn[]; primary_key: string[]; unique_keys: string[][] }
export interface Relationship { id: string; source_table_id: string; target_table_id: string; column_pairs: { source_column: string; target_column: string }[]; evidence: "foreign_key"; external: boolean; selectable: boolean }
export interface WarehouseWarning { code: string; message: string; table_id?: string | null }
export interface Catalog { status: "success"; schema: string; tables: CatalogTable[]; relationships: Relationship[]; warnings: WarehouseWarning[]; capabilities: { protocol_version: 1; supported_operations: string[]; effective_limits: Record<string, number> } }
export interface ResultColumn { id: string; label: string; logical_type: LogicalType; encoding: Encoding; role: "dimension" | "metric" }
export interface CountValue { value: number | string; logical_type: "integer"; encoding: "native" | "integer_string" }
export interface ResultMeta { returned_rows: number; applied_limit: number; truncated: boolean; generated_at: string; execution_time_ms: number; consistency: "snapshot" | "statement"; temporal_context: { timezone: string; calendar: string; naive_timestamp: string } }
export interface Result { status: "success"; columns: ResultColumn[]; data: Record<string, Scalar>[]; warnings: WarehouseWarning[]; meta: ResultMeta }
export interface QueryResult extends Result { summary_kpis: { metric_id: string; aggregation: string; value: Scalar; logical_type: LogicalType; encoding: Encoding }[]; filtered_rows: CountValue }
export interface DetailResult extends Result { pagination: { mode: "page" | "sample"; page: number; page_size: number; has_more: boolean; total_records: CountValue | null } }
export type Connection = ManualConnectionDto;
