"use client";
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { GraphNode } from "@/types/diagram";
export type TableFlowNode = Node<{ table: GraphNode; active: boolean; onSelect: (id: string) => void }, "table">;
export const columnHandle = (name: string, side: "in" | "out") => side + ":" + name;
export const TableNode = memo(function TableNode({ data }: NodeProps<TableFlowNode>) {
  const { table } = data;
  return <article className={"w-80 rounded-xl border-2 bg-surface text-content shadow-sm " + (data.active ? "border-action ring-2 ring-action/25" : "border-line")} aria-label={"Tabla " + table.table_name}>
    <header className="table-drag-handle flex h-[72px] cursor-grab flex-col justify-center rounded-t-lg border-b border-line bg-surface-muted px-4">
      <p className="truncate text-xs text-content-muted" title={table.schema}>{table.schema || "Esquema predeterminado"}{!table.selectable && " · Referencia de consulta"}</p>
      <button type="button" className="nodrag truncate text-left font-bold text-action underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        title={table.table_name} onClick={() => data.onSelect(table.id)} aria-label={"Seleccionar tabla " + table.table_name}>{table.table_name}</button>
    </header>
    <ul aria-label={"Columnas de " + table.table_name}>{table.columns.map(column => <li key={column.name} className="relative flex h-9 items-center gap-2 border-b border-line/30 px-4 text-sm last:border-0">
      <Handle type="target" position={Position.Left} id={columnHandle(column.name, "in")} isConnectable={false} style={{ background: "var(--ui-action)", width: 8, height: 8 }} />
      <span className="w-12 shrink-0 font-mono text-xs font-bold text-action">{[column.is_pk && "PK", column.is_fk && "FK"].filter(Boolean).join(" ")}</span>
      <span className="min-w-0 flex-1 truncate" title={column.name}>{column.name}</span>
      <span className="max-w-24 truncate font-mono text-xs text-content-muted" title={column.data_type || "Tipo desconocido"}>{column.data_type || "?"}</span>
      <Handle type="source" position={Position.Right} id={columnHandle(column.name, "out")} isConnectable={false} style={{ background: "var(--ui-action)", width: 8, height: 8 }} />
    </li>)}</ul>
  </article>;
});
