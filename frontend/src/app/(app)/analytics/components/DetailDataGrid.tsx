import { Button, Card } from "@/components/ui";
import { formatScalar } from "@/features/warehouse/format";
import { useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import { AggregateDataTable } from "./AggregateDataTable";

export function DetailDataGrid() {
  const w = useWarehouse();
  if (!w.applied || !w.catalog) return null;
  const columns = w.catalog.tables.find(t => t.table_id === w.applied!.base_table_id)!.columns.filter(c => c.logical_type !== "unsupported");
  const disabled = !!w.busy || w.dirty;
  const p = w.detail?.pagination;
  return <Card className="space-y-4" aria-label="Detalle filtrado"><h2 className="text-lg font-semibold">Detalle de registros</h2>
    <p className="text-sm text-content-muted">Elige columnas y abre el detalle. La consulta es remota y puede reflejar cambios posteriores al gráfico.</p>
    <details><summary className="cursor-pointer text-sm font-semibold text-action">Columnas del detalle ({w.detailColumns.length})</summary><div className="mt-3 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{columns.map((c, i) => <label key={c.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={w.detailColumns.some(v => v.field.column === c.name)} disabled={disabled || (!w.detailColumns.some(v => v.field.column === c.name) && w.detailColumns.length >= w.catalog!.capabilities.effective_limits.columns)} onChange={e => w.changeDetailColumns(e.target.checked ? [...w.detailColumns, { id: `col_${i}`, field: { relation: "base", column: c.name } }] : w.detailColumns.filter(v => v.field.column !== c.name))} />{c.name}</label>)}</div></details>
    <Button variant="outline" disabled={disabled || !w.detailColumns.length} onClick={() => void w.loadDetail([], 1)}>Abrir detalle de filtros actuales</Button>
    {!!w.detailRequest?.drilldown.length && <div className="flex flex-wrap items-center gap-2"><p className="text-sm">Categoría: {w.detailRequest.drilldown.map(d => `${d.field.column}${d.bucket ? ` (${d.bucket})` : ""}: ${formatScalar(d.value)}`).join(" · ")}</p><Button variant="ghost" disabled={disabled} onClick={() => void w.loadDetail([], 1)}>Limpiar categoría</Button></div>}
    {w.detail && <><AggregateDataTable result={w.detail} caption={p?.mode === "sample" ? "Muestra de registros sin clave estable" : "Registros de la bodega"} />
      <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-content-muted">{p?.mode === "sample" ? "Muestra inicial · sin paginación estable" : `Página ${p?.page}${p?.has_more ? " · hay más resultados" : " · fin de resultados"}`}{p?.total_records ? ` · ${formatScalar(p.total_records.value)} filas en total` : " · total no calculado"}</p>
        {p?.mode === "page" && <><Button variant="outline" disabled={disabled || p.page <= 1} onClick={() => void w.loadDetail(undefined, p.page - 1)}>Anterior</Button><Button variant="outline" disabled={disabled || !p.has_more || p.page * p.page_size > w.catalog!.capabilities.effective_limits.offset} onClick={() => void w.loadDetail(undefined, p.page + 1)}>Siguiente</Button></>}
        <Button variant="ghost" disabled={disabled} onClick={() => void w.loadDetail(undefined, p?.page || 1, true)}>Calcular total</Button></div>
      {w.detail.warnings.map((warning, i) => <p key={i} className="text-sm text-warning">{warning.message}</p>)}</>}
  </Card>;
}
