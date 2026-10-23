import { object } from "./apiClient";
import { requireContract as check } from "./responseValidators";
import type { Catalog, DetailResult, QueryResult, Result } from "@/types/warehouse";

const logical = ["integer", "decimal", "float", "boolean", "string", "date", "datetime"];
const encodings = ["native", "decimal_string", "integer_string", "iso8601"];
const scalar = (v: unknown) => v === null || typeof v === "boolean" || typeof v === "string" || (typeof v === "number" && Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)));
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const nonnegative = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
function warnings(v: unknown) { check(Array.isArray(v) && v.every(w => object(w) && typeof w.code === "string" && typeof w.message === "string" && (w.table_id === undefined || w.table_id === null || typeof w.table_id === "string"))); }
export function count(v: unknown) { check(object(v) && v.logical_type === "integer" && ((v.encoding === "native" && nonnegative(v.value)) || (v.encoding === "integer_string" && typeof v.value === "string" && /^\d+$/.test(v.value)))); }
function typedValue(value: unknown, kind: string, encoding: string) {
  check(scalar(value));
  if (value === null) return;
  if (encoding === "integer_string") check(typeof value === "string" && /^-?\d+$/.test(value));
  else if (encoding === "decimal_string") check(typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(value));
  else if (encoding === "iso8601") check(typeof value === "string" && Number.isFinite(Date.parse(value)));
  else if (kind === "integer" || kind === "float") check(typeof value === "number" && (kind !== "integer" || Number.isSafeInteger(value)));
  else if (kind === "boolean") check(typeof value === "boolean");
  else check(typeof value === "string");
}

export function warehouseCatalog(v: unknown): Catalog {
  check(object(v) && v.status === "success" && typeof v.schema === "string" && Array.isArray(v.tables) && v.tables.length <= 200 && Array.isArray(v.relationships) && object(v.capabilities));
  warnings(v.warnings);
  check(v.capabilities.protocol_version === 1 && strings(v.capabilities.supported_operations) && object(v.capabilities.effective_limits) && Object.values(v.capabilities.effective_limits).every(positive));
  const tables = new Map<string, Set<string>>();
  for (const t of v.tables) {
    check(object(t) && typeof t.table_id === "string" && !tables.has(t.table_id) && typeof t.schema === "string" && typeof t.table_name === "string" && typeof t.selectable === "boolean" && ["fact", "dimension", "table", "unknown"].includes(String(t.role_hint)) && Array.isArray(t.columns) && strings(t.primary_key) && Array.isArray(t.unique_keys) && t.unique_keys.every(strings));
    const names = new Set<string>();
    for (const c of t.columns) {
      check(object(c) && typeof c.name === "string" && !names.has(c.name) && typeof c.data_type === "string" && [...logical, "unsupported"].includes(String(c.logical_type)) && (c.nullable === null || typeof c.nullable === "boolean") && typeof c.is_pk === "boolean" && typeof c.is_fk === "boolean" && strings(c.operations));
      names.add(c.name);
    }
    check([...t.primary_key, ...t.unique_keys.flat()].every(c => names.has(c)));
    tables.set(t.table_id, names);
  }
  const ids = new Set<string>();
  for (const r of v.relationships) {
    check(object(r) && typeof r.id === "string" && !ids.has(r.id) && typeof r.source_table_id === "string" && tables.has(r.source_table_id) && typeof r.target_table_id === "string" && r.evidence === "foreign_key" && typeof r.external === "boolean" && typeof r.selectable === "boolean" && Array.isArray(r.column_pairs) && r.column_pairs.length > 0);
    for (const p of r.column_pairs) check(object(p) && typeof p.source_column === "string" && tables.get(r.source_table_id)?.has(p.source_column) && typeof p.target_column === "string" && (!r.selectable || tables.get(r.target_table_id)?.has(p.target_column)));
    ids.add(r.id);
  }
  return v as unknown as Catalog;
}

export function result(v: unknown): Result {
  check(object(v) && v.status === "success" && Array.isArray(v.columns) && v.columns.length > 0 && Array.isArray(v.data) && object(v.meta));
  warnings(v.warnings);
  const ids = new Set<string>();
  for (const c of v.columns) {
    check(object(c) && typeof c.id === "string" && !ids.has(c.id) && typeof c.label === "string" && logical.includes(String(c.logical_type)) && encodings.includes(String(c.encoding)) && ["metric", "dimension"].includes(String(c.role)));
    ids.add(c.id);
  }
  const m = v.meta;
  check(nonnegative(m.returned_rows) && m.returned_rows === v.data.length && positive(m.applied_limit) && v.data.length <= Number(m.applied_limit) && typeof m.truncated === "boolean" && typeof m.generated_at === "string" && Number.isFinite(Date.parse(m.generated_at)) && typeof m.execution_time_ms === "number" && m.execution_time_ms >= 0 && ["snapshot", "statement"].includes(String(m.consistency)) && object(m.temporal_context) && ["timezone", "calendar", "naive_timestamp"].every(k => typeof m.temporal_context === "object" && m.temporal_context !== null && typeof (m.temporal_context as Record<string, unknown>)[k] === "string"));
  for (const row of v.data) {
    check(object(row) && Object.keys(row).length === ids.size && Object.keys(row).every(k => ids.has(k)));
    for (const c of v.columns) { check(object(c)); typedValue(row[String(c.id)], String(c.logical_type), String(c.encoding)); }
  }
  return v as unknown as Result;
}

export function warehouseQuery(v: unknown): QueryResult {
  result(v);
  check(object(v) && Array.isArray(v.summary_kpis) && Array.isArray(v.columns));
  const metricIds = new Set(v.columns.filter(c => object(c) && c.role === "metric").map(c => object(c) ? c.id : null));
  check(v.summary_kpis.length === metricIds.size);
  const ids = new Set<string>();
  for (const k of v.summary_kpis) {
    check(object(k) && typeof k.metric_id === "string" && !ids.has(k.metric_id) && metricIds.has(k.metric_id) && typeof k.aggregation === "string" && logical.includes(String(k.logical_type)) && encodings.includes(String(k.encoding)));
    typedValue(k.value, String(k.logical_type), String(k.encoding)); ids.add(k.metric_id);
  }
  count(v.filtered_rows);
  return v as unknown as QueryResult;
}

export function warehouseDetail(v: unknown): DetailResult {
  result(v);
  check(object(v) && object(v.pagination));
  const p = v.pagination;
  check(["page", "sample"].includes(String(p.mode)) && positive(p.page) && positive(p.page_size) && typeof p.has_more === "boolean" && (p.mode !== "sample" || (p.page === 1 && p.has_more === false)));
  if (p.total_records !== null) count(p.total_records);
  return v as unknown as DetailResult;
}
