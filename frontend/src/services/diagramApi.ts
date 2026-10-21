import { object, request } from "./apiClient";
import { extraction, requireContract as check, strings } from "./responseValidators";
import type { SchemaGraph, TableSample } from "@/types/diagram";
import type { SourceConnectionDto } from "@/types/etl";
const flag = (v: unknown) => v === null || typeof v === "boolean";
export function schemaGraph(v: unknown): SchemaGraph {
  check(object(v) && v.status === "success" && typeof v.schema === "string" && Array.isArray(v.nodes) && Array.isArray(v.edges) && Array.isArray(v.warnings));
  const nodes = new Map<string, Set<string>>();
  for (const n of v.nodes) {
    check(object(n) && typeof n.id === "string" && !nodes.has(n.id) && typeof n.schema === "string" && typeof n.table_name === "string" && typeof n.selectable === "boolean" && Array.isArray(n.columns));
    const names = new Set<string>();
    for (const c of n.columns) {
      check(object(c) && typeof c.name === "string" && !names.has(c.name) && (c.data_type === null || typeof c.data_type === "string") && flag(c.nullable) && flag(c.is_pk) && flag(c.is_fk));
      names.add(c.name);
    }
    nodes.set(n.id, names);
  }
  const ids = new Set<string>();
  for (const e of v.edges) {
    check(object(e) && typeof e.id === "string" && !ids.has(e.id) && (e.constraint_name === null || typeof e.constraint_name === "string") && typeof e.source_table_id === "string" && typeof e.target_table_id === "string" && typeof e.target_schema === "string" && typeof e.target_table === "string" && typeof e.external === "boolean" && Array.isArray(e.column_pairs) && e.column_pairs.length > 0);
    const source = nodes.get(e.source_table_id), target = nodes.get(e.target_table_id);
    check(source && target);
    for (const p of e.column_pairs) check(object(p) && typeof p.source_column === "string" && typeof p.target_column === "string" && source.has(p.source_column) && target.has(p.target_column));
    ids.add(e.id);
  }
  for (const w of v.warnings) check(object(w) && typeof w.code === "string" && typeof w.message === "string" && (w.table_id === undefined || w.table_id === null || typeof w.table_id === "string"));
  return v as unknown as SchemaGraph;
}
export function tableSample(v: unknown): TableSample {
  extraction(v);
  check(object(v) && typeof v.table_name === "string" && strings(v.columns) && new Set(v.columns).size === v.columns.length && object(v.dtypes) && Object.values(v.dtypes).every(t => typeof t === "string") && Number.isInteger(v.limit) && Number(v.limit) >= 1 && Number(v.limit) <= 10 && v.sample_rows === v.total_rows && Array.isArray(v.preview_data) && v.preview_data.length === v.sample_rows && Number(v.sample_rows) <= Number(v.limit));
  return v as unknown as TableSample;
}
export const getSchemaGraph = (connection: SourceConnectionDto, signal?: AbortSignal) => request("extract/database/schema-graph", schemaGraph, connection, signal);
export const getTableSample = (connection: SourceConnectionDto, table_name: string, signal?: AbortSignal) => request("extract/database/preview", tableSample, { ...connection, table_name, limit: 10 }, signal);
