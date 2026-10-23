export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonRow = Record<string, JsonValue>;
export type DatabaseType = "postgresql" | "mysql" | "oracle";
export interface ManualConnectionDto {
  connection_id?: never; connection_version?: never;
  db_type: DatabaseType; host: string; port?: number | null; database: string;
  user: string; password: string; service_name?: string | null;
  use_agent?: boolean; agent_id?: string | null;
}
export interface SavedConnectionReference { connection_id: string; connection_version: number; runtime_agent_id?: string; display?: Omit<ManualConnectionDto, "password"> }
export type TargetConnectionDto = ManualConnectionDto | (SavedConnectionReference & Partial<Record<Exclude<keyof ManualConnectionDto, "connection_id" | "connection_version">, never>>);
export type SourceConnectionDto = TargetConnectionDto;
export type SourceDto =
  | { type: "file"; filepath: string; sheet_name?: string | null; read_mode?: "inferred" | "exact" }
  | ({ type: "database"; table_name: string; read_mode?: "inferred" | "exact" } & SourceConnectionDto)
  | { type: "date_dimension"; start_year: number; end_year: number };
export type RowCount = { kind: "sample" | "dataset" | "destination_total"; value: number };
type SourceMetadata = { filename?: string; unique_filename?: string; count?: RowCount; read_mode?: "inferred" | "exact" };
export type SourceDescriptor = (
  | Extract<SourceDto, { type: "file" | "date_dimension" }>
  | (Omit<ManualConnectionDto, "password"> & { type: "database"; table_name: string; credentialRef: string; savedConnection?: SavedConnectionReference })
) & SourceMetadata;
export type TargetDescriptor = Omit<ManualConnectionDto, "password"> & { credentialRef: string; savedConnection?: SavedConnectionReference };
type Columns = string | string[];
type Column = { column: string };
type Complement = { complement?: boolean };
type Sort = { columns: Columns; ascending?: boolean };
type Group = { by: Columns; column: string };
type Join = { right_source: SourceDescriptor; on: Columns };
export interface StepParamsByType {
  rename_columns: { columns: Record<string, string> };
  convert_types: { columns: Columns; dtype: string | Record<string, string> };
  fill_nulls: Column & { value: Exclude<JsonValue, null> };
  select_columns: { columns: string[] };
  remove_columns: { columns: Columns };
  left_join: Join; right_join: Join; inner_join: Join; outer_join: Join;
  group_by: Group;
  filter_value: Column & { value: JsonValue; operator?: string };
  split_column: Column & { delimiter: string; new_columns?: string[] | null };
  union: { secondary_source: SourceDescriptor };
  add_new_column: { new_column_name: string; expression: string };
  transform_column: Column & { expression: string };
  filter_by_condition: { expression: string };
  normalize_delimited_column: Column & { delimiter?: string; keep_original?: boolean };
  sort_columns: Sort;
  convert_column_to_list: Column & { delimiter?: string; new_column?: string | null };
  explode_column_list: Column;
  clean_numeric_columns: { columns: Columns };
  clean_date_format: Column & { format_output?: string };
  convert_to_ordered_category: Column & { categories: JsonValue[]; ordered?: boolean };
  boolean_to_binary: { columns: Columns };
  sort_by: Sort;
  search_in_column: Column & Complement & { pattern: string; case_sensitive?: boolean };
  search_in_table: Complement & { pattern: string; case_sensitive?: boolean };
  split_column_into_rows: Column & { delimiter: string; new_column_name?: string | null; drop_original?: boolean };
  drop_duplicates: { subset?: Columns | null };
  replace_values: Column & { old_value: Exclude<JsonValue, null>; new_value: Exclude<JsonValue, null> };
  group_by_sum: Group;
  group_by_count: { by: Columns };
  group_by_shift: Group & { new_column_name: string; periods?: number };
  filter_by_list_length: Column & { length: number | number[]; keep_in?: boolean };
  replace_all_headers: { new_headers: string[] };
  prefix_header: { prefix: string }; suffix_header: { suffix: string };
  add_sequential_index: { column_name?: string; start?: number };
  filter_in_range: Column & Complement & { min_value: number; max_value: number };
  filter_in_list: Column & Complement & { values: JsonValue[] };
  filter_is_null: Column & Complement; select_not_none: Column & Complement;
}
export type StepType = keyof StepParamsByType;
export type TransformStep = { [K in StepType]: { id: string; type: K; params: StepParamsByType[K] } }[StepType];
export interface StepDto { type: StepType; params: Record<string, JsonValue> }
export interface ExtractionPreview { status: "success"; preview_data: JsonRow[]; total_rows: number }
export interface UploadResponse extends ExtractionPreview { filename: string; filepath: string; unique_filename: string; message: string }
export interface DatabaseMetadata { status: "success"; message: string; tables: string[]; schema_preview: Record<string, JsonValue[]> }
export interface PreviewResponse extends ExtractionPreview { columns: string[]; dtypes: Record<string, string> }
export interface MessageResponse { status: "success"; message: string }
export interface LoadConfigDto {
  table_name: string; table_type: "dimension" | "fact"; if_exists?: "replace" | "append" | "fail" | "reload" | "schema_only";
  foreign_keys?: Record<string, [string, string]>;
  schema_spec?: LoadSchemaSpec;
}
export interface LoadColumnSpec { name: string; type: "integer" | "decimal" | "float" | "boolean" | "string" | "date" | "datetime"; nullable: boolean; precision?: number; scale?: number; timezone?: boolean; unit?: string | null }
export interface LoadSchemaSpec { version: 1; grain: string; allow_add_constraints?: boolean; columns: LoadColumnSpec[]; primary_key: string[]; unique_keys: string[][]; indexes: string[][]; foreign_keys: { columns: string[]; target_table: string; target_columns: string[] }[]; checks: { column: string; kind: "not_null" | "unique" | "range" | "sum"; minimum?: string | null; maximum?: string | null; severity: "error" | "warning" }[] }
export interface LoadResponse extends ExtractionPreview { message: string; table_name: string; table_type: "dimension" | "fact"; execution_id?: string; monitoring_pending?: boolean; previous_rows?: number; submitted_rows?: number; preview_only?: boolean; schema_actions?: string[]; checks?: { column: string; kind: string; severity: string; failures: number }[] }
export interface ExecutionRecord {
  reportVersion?: number;
  if_exists?: LoadConfigDto["if_exists"];
  sourceLabel?: string;
  id: string; revision: number; startedAt: string; finishedAt?: string; durationMs?: number;
  status: "running" | "success" | "error" | "unknown";
  table_name: string; table_type: "dimension" | "fact"; total_rows?: number;
}
