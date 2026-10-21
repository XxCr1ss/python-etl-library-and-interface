import type { ExtractionPreview } from "./etl";
export interface GraphColumn { name: string; data_type: string | null; nullable: boolean | null; is_pk: boolean | null; is_fk: boolean | null }
export interface GraphNode { id: string; schema: string; table_name: string; selectable: boolean; columns: GraphColumn[] }
export interface GraphEdge { id: string; constraint_name: string | null; source_table_id: string; target_table_id: string; column_pairs: { source_column: string; target_column: string }[]; target_schema: string; target_table: string; external: boolean }
export interface SchemaGraph { status: "success"; schema: string; nodes: GraphNode[]; edges: GraphEdge[]; warnings: { code: string; table_id?: string | null; message: string }[] }
export interface TableSample extends ExtractionPreview { table_name: string; columns: string[]; dtypes: Record<string, string>; sample_rows: number; limit: number }
