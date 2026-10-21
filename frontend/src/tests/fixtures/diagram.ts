import type { SchemaGraph, TableSample } from "@/types/diagram";
export const graphFixture: SchemaGraph = { status: "success", schema: "public", warnings: [], nodes: [
  { id: "parent", schema: "public", table_name: "customers", selectable: true, columns: [
    { name: "id", data_type: "INTEGER", nullable: false, is_pk: true, is_fk: false },
    { name: "name", data_type: "TEXT", nullable: true, is_pk: false, is_fk: false }] },
  { id: "child", schema: "public", table_name: "orders", selectable: true, columns: [
    { name: "id", data_type: "INTEGER", nullable: false, is_pk: true, is_fk: false },
    { name: "customer_id", data_type: "INTEGER", nullable: true, is_pk: false, is_fk: true }] },
], edges: [{ id: "orders_customer", constraint_name: "orders_customer_fk", source_table_id: "child", target_table_id: "parent", target_schema: "public", target_table: "customers", external: false, column_pairs: [{ source_column: "customer_id", target_column: "id" }] }] };
export const sampleFixture: TableSample = { status: "success", table_name: "orders", columns: ["id", "customer_id"], dtypes: { id: "int64", customer_id: "int64" }, preview_data: [{ id: 0, customer_id: null }], total_rows: 1, sample_rows: 1, limit: 10 };
// Generate a synthetic credential so isolation checks never rely on a static secret.
export const diagramConnection = { db_type: "postgresql" as const, host: "localhost", database: "synthetic", user: "test", password: crypto.randomUUID() };
