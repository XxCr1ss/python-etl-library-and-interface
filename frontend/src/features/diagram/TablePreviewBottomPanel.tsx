"use client";
import type { RefObject } from "react";
import { Button, Skeleton } from "@/components/ui";
import type { GraphNode, TableSample } from "@/types/diagram";
import { useResizableHeight } from "./useResizableHeight";
export function TablePreviewBottomPanel({ table, sample, loading, error, reason, unavailable = "", onUse, onClose, onRetry, container }: {
  table: GraphNode; sample: TableSample | null; loading: boolean; error: string; reason: string; unavailable?: string;
  onUse: () => void; onClose: () => void; onRetry: () => void; container: RefObject<HTMLElement>;
}) {
  const resize = useResizableHeight(container);
  const columns = sample?.columns ?? table.columns.map(c => c.name);
  return <section aria-label="Datos de la tabla seleccionada" className="flex min-h-0 shrink-0 flex-col border-t border-line bg-surface" style={{ height: resize.collapsed ? "auto" : resize.height }}>
    <div role="separator" tabIndex={0} aria-label="Altura del panel de datos" aria-orientation="horizontal" aria-valuemin={Math.round(resize.limits.min)} aria-valuemax={Math.round(resize.limits.max)} aria-valuenow={Math.round(resize.height)}
      {...resize.separator} className="flex h-3 shrink-0 touch-none cursor-row-resize select-none items-center justify-center bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><span aria-hidden className="h-1 w-12 rounded bg-content-muted" /></div>
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line p-2 sm:px-4">
      <h2 className="min-w-0 break-all text-sm font-bold">{table.table_name} <span className="font-normal text-content-muted">· Muestra de {sample?.sample_rows ?? 0} filas · límite 10</span></h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onUse} disabled={!!reason || !table.selectable} aria-describedby={reason ? "diagram-use-reason" : undefined}>Usar como origen en Transformación</Button>
        <Button size="sm" variant="outline" onClick={resize.toggle} aria-expanded={!resize.collapsed}>{resize.collapsed ? "Mostrar datos" : "Ocultar datos"}</Button>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Cerrar datos de la tabla">×</Button>
      </div>
      {reason && <p id="diagram-use-reason" className="w-full text-xs text-content-muted">{reason}</p>}
      {!table.selectable && <p className="w-full text-xs text-warning">Referencia de consulta. Esta tabla no está disponible como origen en el esquema actual.</p>}
    </header>
    {!resize.collapsed && <>
      {loading && <div role="status" className="space-y-2 p-4"><span className="sr-only">Consultando muestra…</span>{[0, 1, 2].map(i => <Skeleton key={i} className="h-6" />)}</div>}
      {error && <div role="alert" className="p-3 text-sm text-danger">{error} <Button size="sm" variant="outline" onClick={onRetry}>Reintentar muestra</Button></div>}
      {unavailable && <p role="status" className="p-3 text-sm text-warning">{unavailable}</p>}
      {!loading && !error && !unavailable && <div role="region" aria-label="Muestra de datos" tabIndex={0} className="min-h-0 max-w-full flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm"><caption className="sr-only">Muestra de {table.table_name}</caption>
          <thead className="sticky top-0 bg-surface-muted"><tr>{columns.map(column => <th key={column} scope="col" className="min-w-36 border-b border-line px-4 py-2 align-top"><span className="block break-all">{column}</span><span className="font-mono text-xs font-normal text-content-muted">{sample?.dtypes[column] ?? table.columns.find(c => c.name === column)?.data_type ?? "Desconocido"}</span></th>)}</tr></thead>
          <tbody>{sample?.preview_data.map((row, index) => <tr key={index} className="border-b border-line/30 hover:bg-surface-muted">{columns.map(column => <td key={column} className="max-w-xs px-4 py-2 align-top font-mono text-xs"><span className="block max-w-xs whitespace-pre-wrap break-all">{row[column] === null ? "NULL" : row[column] === "" ? "Texto vacío" : row[column] === undefined ? "Sin valor" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}</span></td>)}</tr>)}</tbody>
        </table>
        {!sample && <p role="status" className="p-4 text-sm text-content-muted">{table.selectable ? "La muestra está pendiente de consulta." : "Selecciona una tabla disponible para consultar sus datos."}</p>}
        {sample && sample.preview_data.length === 0 && <p className="p-4 text-sm text-content-muted">La tabla no contiene filas de muestra.</p>}
      </div>}
      <p className="shrink-0 border-t border-line px-4 py-1 text-xs text-content-muted">{columns.length} columnas · Muestra acotada; no es el total de registros de la tabla.</p>
    </>}
  </section>;
}
