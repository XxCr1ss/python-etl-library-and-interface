import { object } from "@/services/apiClient";
import { json, requireContract as check, strings } from "@/services/responseValidators";
import { CredentialStore, newId } from "@/state/credentialStore";
import type { LoadConfigDto, SourceDescriptor, StepType, TargetDescriptor, TransformStep } from "./etl";

// The rules double as an allowlist. '?' denotes optional fields, never a missing required field.
export const stepSchemas = {
  rename_columns: { columns: "map" }, convert_types: { columns: "columns", dtype: "dtype" },
  fill_nulls: { column: "string", value: "value" }, select_columns: { columns: "strings" }, remove_columns: { columns: "columns" },
  left_join: { right_source: "source", on: "columns" }, right_join: { right_source: "source", on: "columns" },
  inner_join: { right_source: "source", on: "columns" }, outer_join: { right_source: "source", on: "columns" },
  group_by: { by: "columns", column: "string" }, filter_value: { column: "string", value: "json", operator: "?string" },
  split_column: { column: "string", delimiter: "string", new_columns: "?nullableStrings" }, union: { secondary_source: "source" },
  add_new_column: { new_column_name: "string", expression: "string" }, transform_column: { column: "string", expression: "string" },
  filter_by_condition: { expression: "string" }, normalize_delimited_column: { column: "string", delimiter: "?string", keep_original: "?boolean" },
  sort_columns: { columns: "columns", ascending: "?boolean" }, convert_column_to_list: { column: "string", delimiter: "?string", new_column: "?nullableString" },
  explode_column_list: { column: "string" }, clean_numeric_columns: { columns: "columns" }, clean_date_format: { column: "string", format_output: "?string" },
  convert_to_ordered_category: { column: "string", categories: "array", ordered: "?boolean" }, boolean_to_binary: { columns: "columns" },
  sort_by: { columns: "columns", ascending: "?boolean" }, search_in_column: { column: "string", pattern: "string", complement: "?boolean", case_sensitive: "?boolean" },
  search_in_table: { pattern: "string", complement: "?boolean", case_sensitive: "?boolean" },
  split_column_into_rows: { column: "string", delimiter: "string", new_column_name: "?nullableString", drop_original: "?boolean" },
  drop_duplicates: { subset: "?nullableColumns" }, replace_values: { column: "string", old_value: "value", new_value: "value" },
  group_by_sum: { by: "columns", column: "string" }, group_by_count: { by: "columns" },
  group_by_shift: { by: "columns", column: "string", new_column_name: "string", periods: "?integer" },
  filter_by_list_length: { column: "string", length: "length", keep_in: "?boolean" }, replace_all_headers: { new_headers: "strings" },
  prefix_header: { prefix: "string" }, suffix_header: { suffix: "string" }, add_sequential_index: { column_name: "?string", start: "?integer" },
  filter_in_range: { column: "string", min_value: "number", max_value: "number", complement: "?boolean" },
  filter_in_list: { column: "string", values: "array", complement: "?boolean" }, filter_is_null: { column: "string", complement: "?boolean" },
  select_not_none: { column: "string", complement: "?boolean" },
} satisfies Record<StepType, Record<string, string>>;

export function connection(v: unknown) {
  check(object(v) && ["postgresql", "mysql", "oracle"].includes(String(v.db_type)));
  check([v.host, v.database, v.user].every(x => typeof x === "string"));
  check(v.port === undefined || v.port === null || (Number.isInteger(v.port) && Number(v.port) > 0 && Number(v.port) <= 65535));
  check(v.service_name === undefined || v.service_name === null || typeof v.service_name === "string");
  return { db_type: v.db_type, host: v.host, database: v.database, user: v.user,
    ...(v.port !== undefined ? { port: v.port } : {}), ...(v.service_name !== undefined ? { service_name: v.service_name } : {}) } as Omit<TargetDescriptor, "credentialRef">;
}
function savedReference(value: unknown) {
  if (value === undefined) return undefined;
  check(object(value) && typeof value.connection_id === "string" && /^[0-9a-f-]{36}$/i.test(value.connection_id) &&
    Number.isInteger(value.connection_version) && Number(value.connection_version) > 0);
  check(value.runtime_agent_id === undefined || (typeof value.runtime_agent_id === "string" && value.runtime_agent_id.length <= 120));
  return { connection_id: value.connection_id, connection_version: Number(value.connection_version),
    ...(typeof value.runtime_agent_id === "string" ? { runtime_agent_id: value.runtime_agent_id } : {}) };
}
function reference(v: Record<string, unknown>, store: CredentialStore, legacy: boolean) {
  const ref = legacy ? newId() : v.credentialRef;
  check(typeof ref === "string" && ref.length > 0);
  if (legacy && !v.savedConnection && Object.hasOwn(v, "password")) { check(typeof v.password === "string"); store.set(ref, v.password); }
  return ref;
}
export function parseTarget(v: unknown, store: CredentialStore, legacy = false): TargetDescriptor {
  const fields = connection(v); check(object(v));
  check(v.use_agent === undefined || typeof v.use_agent === "boolean");
  check(v.agent_id === undefined || v.agent_id === null || typeof v.agent_id === "string");
  check(!v.use_agent || (typeof v.agent_id === "string" && !!v.agent_id.trim()));
  const savedConnection = savedReference(v.savedConnection);
  return { ...fields, credentialRef: reference(v, store, legacy), ...(savedConnection ? { savedConnection } : {}),
    ...(v.use_agent !== undefined ? { use_agent: v.use_agent as boolean } : {}),
    ...(v.agent_id !== undefined ? { agent_id: v.agent_id as string | null } : {}) };
}
export function parseSource(v: unknown, store: CredentialStore, legacy = false): SourceDescriptor {
  check(object(v));
  const meta: { filename?: string; unique_filename?: string; count?: SourceDescriptor["count"] } = {};
  for (const key of ["filename", "unique_filename"] as const) if (typeof v[key] === "string") meta[key] = v[key];
  if (legacy && Number.isInteger(v.total_rows) && Number(v.total_rows) >= 0) meta.count = { kind: v.type === "database" ? "sample" : "dataset", value: Number(v.total_rows) };
  else if (v.count !== undefined) { check(object(v.count) && ["sample", "dataset"].includes(String(v.count.kind)) && Number.isInteger(v.count.value) && Number(v.count.value) >= 0); meta.count = v.count as SourceDescriptor["count"]; }
  if (v.type === "file") {
    check(typeof v.filepath === "string" && !!v.filepath);
    check(v.sheet_name === undefined || v.sheet_name === null || typeof v.sheet_name === "string");
    return { type: "file", filepath: v.filepath, ...(v.sheet_name !== undefined ? { sheet_name: v.sheet_name as string | null } : {}), ...meta };
  }
  if (v.type === "date_dimension") {
    check(Number.isInteger(v.start_year) && Number.isInteger(v.end_year) && Number(v.start_year) >= 100 && Number(v.end_year) <= 9999 && Number(v.start_year) <= Number(v.end_year));
    return { type: "date_dimension", start_year: Number(v.start_year), end_year: Number(v.end_year), ...meta };
  }
  check(v.type === "database" && typeof v.table_name === "string" && v.table_name.length > 0);
  const fields = connection(v);
  check([fields.host, fields.database, fields.user].every(Boolean));
  check(v.use_agent === undefined || typeof v.use_agent === "boolean");
  check(v.agent_id === undefined || v.agent_id === null || typeof v.agent_id === "string");
  check(!v.use_agent || (typeof v.agent_id === "string" && !!v.agent_id));
  const savedConnection = savedReference(v.savedConnection);
  return { type: "database", ...fields, table_name: v.table_name, credentialRef: reference(v, store, legacy), ...(savedConnection ? { savedConnection } : {}),
    ...(v.use_agent !== undefined ? { use_agent: v.use_agent as boolean } : {}), ...(v.agent_id !== undefined ? { agent_id: v.agent_id as string | null } : {}), ...meta };
}
function valid(rule: string, v: unknown): boolean {
  switch (rule) {
    case "string": return typeof v === "string";
    case "nullableString": return v === null || typeof v === "string";
    case "strings": return strings(v);
    case "nullableStrings": return v === null || strings(v);
    case "columns": return typeof v === "string" || strings(v);
    case "nullableColumns": return v === null || valid("columns", v);
    case "map": return object(v) && Object.values(v).every(x => typeof x === "string");
    case "dtype": return typeof v === "string" || valid("map", v);
    case "boolean": return typeof v === "boolean";
    case "integer": return Number.isInteger(v);
    case "number": return typeof v === "number" && Number.isFinite(v);
    case "length": return (Array.isArray(v) ? v : [v]).every(x => Number.isInteger(x) && Number(x) >= 0);
    case "array": return Array.isArray(v) && v.every(json);
    case "value": return v !== null && json(v);
    case "json": return json(v);
    default: return false;
  }
}
export function parseStep(v: unknown, store: CredentialStore, legacy = false): TransformStep {
  check(object(v) && typeof v.type === "string" && Object.hasOwn(stepSchemas, v.type) && object(v.params));
  const schema: Record<string, string> = stepSchemas[v.type as StepType];
  check(Object.keys(v.params).every(k => Object.hasOwn(schema, k)));
  const params: Record<string, unknown> = {};
  for (const [key, rule] of Object.entries(schema)) {
    const value = v.params[key];
    if (rule.startsWith("?") && value === undefined) continue;
    if (rule === "source") params[key] = parseSource(value, store, legacy);
    else { check(valid(rule.replace(/^\?/, ""), value)); params[key] = value; }
  }
  const id = legacy ? newId() : v.id; check(typeof id === "string" && !!id);
  return { id, type: v.type, params } as TransformStep;
}
export function parseLoadConfig(v: unknown): LoadConfigDto {
  check(object(v) && typeof v.table_name === "string" && ["dimension", "fact"].includes(String(v.table_type)) && (v.if_exists === undefined || ["replace", "append", "fail"].includes(String(v.if_exists))));
  if (v.foreign_keys !== undefined) check(object(v.foreign_keys) && Object.values(v.foreign_keys).every(x => strings(x) && x.length === 2));
  return { table_name: v.table_name, table_type: v.table_type as LoadConfigDto["table_type"],
    ...(v.if_exists !== undefined ? { if_exists: v.if_exists as LoadConfigDto["if_exists"] } : {}),
    ...(object(v.foreign_keys) ? { foreign_keys: Object.fromEntries(Object.entries(v.foreign_keys).map(([k, pair]) => [k, [...pair as string[]]])) as Record<string, [string, string]> } : {}) };
}
