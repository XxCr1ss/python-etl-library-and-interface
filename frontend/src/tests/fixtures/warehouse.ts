import type { Catalog, CatalogColumn, DetailRequest, DetailResult, QueryResult, WarehouseQuery } from "@/types/warehouse";
const col = (name: string, logical_type: CatalogColumn["logical_type"], pk = false): CatalogColumn => ({ name, logical_type, data_type: logical_type, nullable: !pk, is_pk: pk, is_fk: false,
  operations: logical_type === "unsupported" ? [] : ["COUNT", "COUNT_DISTINCT", ...(["integer", "decimal", "float"].includes(logical_type) ? ["SUM", "AVG", "MIN", "MAX"] : ["date", "datetime"].includes(logical_type) ? ["MIN", "MAX"] : [])] });
export const warehouseCatalogFixture: Catalog = {
  status: "success", schema: "public", tables: [
    { table_id: '["public","sales"]', schema: "public", table_name: "sales", selectable: true, role_hint: "table", primary_key: ["id"], unique_keys: [["id"]], columns: [col("id", "integer", true), col("amount", "decimal"), col("category", "string"), col("occurred", "datetime"), col("approved", "boolean")] },
    { table_id: '["public","labels"]', schema: "public", table_name: "labels", selectable: true, role_hint: "dimension", primary_key: ["code"], unique_keys: [["code"]], columns: [col("code", "integer", true), col("label", "string")] },
    { table_id: '["public","loose"]', schema: "public", table_name: "loose", selectable: true, role_hint: "table", primary_key: [], unique_keys: [], columns: [col("label", "string"), col("value", "integer")] },
  ], relationships: [{ id: "relationship_1", source_table_id: '["public","sales"]', target_table_id: '["public","labels"]', column_pairs: [{ source_column: "id", target_column: "code" }], evidence: "foreign_key", external: false, selectable: true }], warnings: [],
  capabilities: { protocol_version: 1, supported_operations: ["warehouse_catalog", "warehouse_query", "warehouse_detail", "warehouse_export"], effective_limits: { tables: 200, catalog_columns: 5000, metrics: 6, dimensions: 3, joins: 4, filters: 20, in_values: 100, text_length: 1000, groups: 1000, page_size: 100, columns: 50, offset: 10000, export_rows: 20000, export_bytes: 10485760, message_bytes: 16777216, connect_seconds: 10, statement_seconds: 30, export_seconds: 60, operation_seconds: 90 } },
};
export const warehouseQueryFixture: WarehouseQuery = { base_table_id: warehouseCatalogFixture.tables[0].table_id, joins: [], filters: [], metrics: [{ id: "total", aggregation: "SUM", column: "amount" }], dimensions: [{ id: "category", field: { relation: "base", column: "category" } }], order_by: [{ field_id: "total", direction: "DESC" }], limit: 1 };
export const warehouseMeta = { returned_rows: 1, applied_limit: 1, truncated: true, generated_at: "2026-10-21T12:00:00Z", execution_time_ms: 5, consistency: "snapshot" as const, temporal_context: { timezone: "UTC", calendar: "session", naive_timestamp: "local" } };
export function warehouseResult(q = warehouseQueryFixture): QueryResult {
  const columns: QueryResult["columns"] = [...q.dimensions.map(d => ({ id: d.id, label: d.field.column, logical_type: "string" as const, encoding: "native" as const, role: "dimension" as const })),
    ...q.metrics.map(m => ({ id: m.id, label: m.aggregation + ("column" in m ? ` · ${m.column}` : ""), logical_type: m.aggregation.startsWith("COUNT") ? "integer" as const : "decimal" as const, encoding: m.aggregation.startsWith("COUNT") ? "native" as const : "decimal_string" as const, role: "metric" as const }))];
  const value = (m: WarehouseQuery["metrics"][number], global: boolean) => m.aggregation.startsWith("COUNT") ? global ? 3 : 1 : global ? m.aggregation === "AVG" ? "40.0000" : "120.0000" : "90.0000";
  return { status: "success", columns, data: [Object.fromEntries([...q.dimensions.map(d => [d.id, d.bucket ? "2026-01" : "B"]), ...q.metrics.map(m => [m.id, value(m, !q.dimensions.length)])])],
    summary_kpis: q.metrics.map(m => ({ metric_id: m.id, aggregation: m.aggregation, value: value(m, true), logical_type: m.aggregation.startsWith("COUNT") ? "integer" : "decimal", encoding: m.aggregation.startsWith("COUNT") ? "native" : "decimal_string" })),
    filtered_rows: { value: 3, logical_type: "integer", encoding: "native" }, warnings: [], meta: { ...warehouseMeta, applied_limit: q.limit, truncated: !!q.dimensions.length } };
}
export const warehouseDetailFixture: DetailResult = { status: "success", columns: [{ id: "id", label: "id", logical_type: "integer", encoding: "native", role: "dimension" }], data: [{ id: 3 }],
  warnings: [], meta: { ...warehouseMeta, truncated: false, applied_limit: 50 }, pagination: { mode: "page", page: 1, page_size: 50, has_more: false, total_records: null } };

export function warehouseDetailResult(request: DetailRequest): DetailResult {
  const source: Record<string, string | number | boolean> = { id: 3, amount: "90.0000", category: "B", occurred: "2026-02-15T00:00:00", approved: false, label: "B", value: 90 };
  const table = warehouseCatalogFixture.tables.find(t => t.table_id === request.selection.base_table_id)!;
  const sample = !table.primary_key.length;
  return { ...warehouseDetailFixture, columns: request.columns.map(c => {
    const kind = table.columns.find(col => col.name === c.field.column)!.logical_type;
    return { id: c.id, label: c.field.column, logical_type: kind === "unsupported" ? "string" : kind, encoding: kind === "decimal" ? "decimal_string" : kind === "datetime" ? "iso8601" : "native", role: "dimension" };
  }), data: [Object.fromEntries(request.columns.map(c => [c.id, source[c.field.column]]))], pagination: { ...warehouseDetailFixture.pagination, mode: sample ? "sample" : "page", page: request.page, page_size: request.page_size, total_records: request.include_total ? { value: 3, logical_type: "integer", encoding: "native" } : null }, meta: { ...warehouseMeta, applied_limit: request.page_size, truncated: false } };
}
