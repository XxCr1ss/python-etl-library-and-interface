import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import type { Catalog, FieldRef, WarehouseFilter } from "@/types/warehouse";
import type { AnalysisSpec } from "@/types/analysis";
import { fieldKey } from "@/features/warehouse/queryFields";
import { FieldPicker, fieldsFor } from "./AnalysisFields";
import { FilterEditor } from "./FilterEditor";

export function SharedReportFilters({ catalog, panels, busy, onChange }: { catalog: Catalog; panels: AnalysisSpec[]; busy: boolean; onChange: (p: AnalysisSpec[]) => void }) {
  const [filters, setFilters] = useState<WarehouseFilter[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldRef | null>>({});
  const [notice, setNotice] = useState("");
  const anchor = fieldsFor(catalog, panels[0].selection);
  const ready = filters.length > 0 && panels.every((_, i) => filters.every((_, j) => Object.hasOwn(mapping, `${i}_${j}`)));
  function apply() {
    const next = panels.map((panel, i) => ({ ...panel, selection: { ...panel.selection, filters: [...panel.selection.filters, ...filters.flatMap((filter, j) => mapping[`${i}_${j}`] ? [{ ...filter, field: mapping[`${i}_${j}`]! }] : [])] } }));
    if (next.some(p => p.selection.filters.length > catalog.capabilities.effective_limits.filters)) { setNotice("Un panel superaría el límite de filtros. Reduce sus condiciones antes de añadir otras."); return; }
    const skipped = panels.map((p, i) => filters.some((_, j) => mapping[`${i}_${j}`] === null) ? p.title : null).filter(Boolean);
    onChange(next); setFilters([]); setMapping({});
    setNotice(`Condiciones añadidas con AND a las definiciones seleccionadas.${skipped.length ? ` Paneles con excepciones explícitas: ${skipped.join(", ")}.` : ""} Ejecuta el reporte para actualizar resultados. Para sustituir una condición anterior, edita la definición de ese panel.`);
  }
  return <details className="space-y-4 rounded-lg border border-line p-4"><summary className="cursor-pointer font-semibold">Añadir filtros compartidos con mapeo por panel</summary><p className="text-sm text-content-muted">Define condiciones usando el primer panel como referencia. Para cada panel, elige una columna del mismo tipo o confirma Sin configurar para excluirlo. Se guardará el filtro real en cada definición; no se ejecuta SQL al aplicarlo.</p><fieldset disabled={busy} className="space-y-4">
    <FilterEditor fields={anchor} filters={filters} max={catalog.capabilities.effective_limits.filters} disabled={busy} onChange={value => { setFilters(value); setMapping({}); }} />
    {filters.map((filter, j) => { const type = anchor.find(f => f.key === fieldKey(filter.field))?.column.logical_type; return <div key={j} className="grid gap-3 md:grid-cols-2">{panels.map((panel, i) => <FieldPicker key={i} label={`Filtro compartido ${j + 1} en panel ${i + 1}: ${panel.title}`} fields={fieldsFor(catalog, panel.selection).filter(f => f.column.logical_type === type)} optional value={mapping[`${i}_${j}`]} onChange={value => setMapping(previous => ({ ...previous, [`${i}_${j}`]: value }))} />)}</div>; })}
    {filters.map((_, j) => <div key={j} className="flex flex-wrap gap-2">{panels.map((panel, i) => <Button key={i} variant="ghost" onClick={() => setMapping(previous => ({ ...previous, [`${i}_${j}`]: null }))}>Excluir panel {i + 1} del filtro {j + 1}</Button>)}</div>)}
    <Button variant="outline" disabled={!ready} onClick={apply}>Añadir condiciones a los paneles</Button>
  </fieldset>{notice && <Alert title="Filtros del reporte">{notice}</Alert>}</details>;
}
