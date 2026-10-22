import { useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { blankQuery, useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import { fieldKey, newOutputId, queryFields } from "@/features/warehouse/queryFields";
import type { Aggregation, Bucket, Metric } from "@/types/warehouse";
import { RelationshipSelector } from "./RelationshipSelector";
import { FilterEditor } from "./FilterEditor";

const aggregations: Aggregation[] = ["COUNT_ROWS", "SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"];
export function QueryBuilderPanel() {
  const w = useWarehouse(), q = w.draft, catalog = w.catalog;
  const [search, setSearch] = useState("");
  if (!q || !catalog) return null;
  const base = catalog.tables.find(t => t.table_id === q.base_table_id)!;
  const fields = queryFields(catalog, q), limits = catalog.capabilities.effective_limits;
  const update = w.changeDraft;
  const outputs = [...q.dimensions.map(d => ({ id: d.id, label: d.label || d.field.column })), ...q.metrics.map(m => ({ id: m.id, label: m.aggregation + ("column" in m ? ` · ${m.column}` : "") }))];
  const valid = q.metrics.length > 0 && q.metrics.every(m => m.aggregation === "COUNT_ROWS" || base.columns.some(c => c.name === m.column && c.operations.includes(m.aggregation))) && q.joins.every(j => j.via.kind !== "manual" || j.via.pairs.every(p => p.base_column));
  return <Card id="warehouse-query" className="space-y-6" aria-label="Constructor de consulta"><h2 className="text-lg font-semibold">Construye tu consulta</h2>
    <fieldset disabled={!!w.busy} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2"><Input label="Buscar tabla" type="search" value={search} onChange={e => setSearch(e.target.value)} hint="Busca en el catálogo; no consulta filas." />
        <Select label="Tabla base" value={q.base_table_id} onChange={e => update({ ...blankQuery(e.target.value), limit: Math.min(20, limits.groups) })}>{catalog.tables.filter(t => t.selectable && (t.table_id === q.base_table_id || `${t.schema}.${t.table_name}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))).map(t => <option key={t.table_id} value={t.table_id}>{t.schema}.{t.table_name}</option>)}</Select></div>
      <p className="text-sm text-content-muted">Los tipos de tabla son orientativos. Elige operaciones según el significado de tus datos; una columna numérica puede ser un identificador.</p>
      <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Métricas</legend>
        {q.metrics.map((m, i) => <div key={m.id} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label={`Operación ${i + 1}`} value={m.aggregation} onChange={e => {
            const aggregation = e.target.value as Aggregation;
            const metric: Metric = aggregation === "COUNT_ROWS" ? { id: m.id, aggregation } : { id: m.id, aggregation, column: "" };
            update({ ...q, metrics: q.metrics.map((v, n) => n === i ? metric : v) });
          }}>{aggregations.map(a => <option key={a}>{a}</option>)}</Select>
          {m.aggregation !== "COUNT_ROWS" ? <Select label={`Columna de métrica ${i + 1}`} value={m.column} onChange={e => update({ ...q, metrics: q.metrics.map((v, n) => n === i ? { ...m, column: e.target.value } : v) })}><option value="">Selecciona columna</option>{base.columns.filter(c => c.operations.includes(m.aggregation)).map(c => <option key={c.name}>{c.name}</option>)}</Select> : <p className="py-2 text-sm text-content-muted">Cuenta todas las filas filtradas</p>}
          <Button variant="ghost" onClick={() => update({ ...q, metrics: q.metrics.filter(v => v.id !== m.id), order_by: q.order_by.filter(o => o.field_id !== m.id) })}>Quitar métrica {i + 1}</Button>
        </div>)}
        <Button variant="outline" disabled={q.metrics.length >= limits.metrics} onClick={() => update({ ...q, metrics: [...q.metrics, { id: newOutputId("metric"), aggregation: "COUNT_ROWS" }] })}>Agregar métrica</Button>
      </fieldset>
      <RelationshipSelector catalog={catalog} query={q} onChange={update} disabled={!!w.busy} />
      <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Dimensiones de agrupación</legend>
        {q.dimensions.map((d, i) => { const f = fields.find(f => f.key === fieldKey(d.field)); return <div key={d.id} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label={`Dimensión ${i + 1}`} value={fieldKey(d.field)} onChange={e => update({ ...q, dimensions: q.dimensions.map(v => v.id === d.id ? { id: d.id, field: fields.find(f => f.key === e.target.value)!.ref } : v) })}>{fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</Select>
          {f && ["date", "datetime"].includes(f.column.logical_type) ? <Select label={`Calendario ${i + 1}`} value={d.bucket || ""} onChange={e => update({ ...q, dimensions: q.dimensions.map(v => v.id === d.id ? { ...v, bucket: e.target.value ? e.target.value as Bucket : undefined } : v) })}><option value="">Valor exacto</option><option value="year">Año</option><option value="month">Mes</option><option value="day">Día</option></Select> : <span className="py-2 text-sm text-content-muted">Agrupar por valor</span>}
          <Button variant="ghost" onClick={() => update({ ...q, dimensions: q.dimensions.filter(v => v.id !== d.id), order_by: q.order_by.filter(o => o.field_id !== d.id) })}>Quitar dimensión {i + 1}</Button>
        </div>; })}
        <Button variant="outline" disabled={q.dimensions.length >= limits.dimensions || !fields.length} onClick={() => update({ ...q, dimensions: [...q.dimensions, { id: newOutputId("dimension"), field: fields.find(f => ["string", "date", "datetime"].includes(f.column.logical_type))?.ref || fields[0].ref }] })}>Agregar dimensión</Button>
      </fieldset>
      <FilterEditor fields={fields} filters={q.filters} max={limits.filters} disabled={!!w.busy} onChange={filters => update({ ...q, filters })} />
      <div className="grid gap-4 sm:grid-cols-3"><Input label="Top N" type="number" min={1} max={limits.groups} disabled={!q.dimensions.length} value={q.limit} onChange={e => update({ ...q, limit: Number(e.target.value) })} />
        <Select label="Ordenar por" value={q.order_by[0]?.field_id || ""} disabled={!q.dimensions.length} onChange={e => update({ ...q, order_by: e.target.value ? [{ field_id: e.target.value, direction: "DESC" }] : [] })}><option value="">Dimensiones · orden estable</option>{outputs.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
        <Select label="Dirección" value={q.order_by[0]?.direction || "ASC"} disabled={!q.order_by.length} onChange={e => update({ ...q, order_by: [{ ...q.order_by[0], direction: e.target.value as "ASC" | "DESC" }] })}><option value="ASC">Ascendente</option><option value="DESC">Descendente</option></Select></div>
    </fieldset>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={!!w.busy || !valid || !Number.isInteger(q.limit) || q.limit < 1 || q.limit > limits.groups} onClick={() => void w.consult()}>Consultar y graficar</Button>
      {w.result && w.dirty && <><span className="text-sm text-warning">Cambios pendientes de aplicar</span><Button variant="ghost" onClick={w.discardDraft}>Descartar cambios de consulta</Button></>}
      {!q.metrics.length && <p className="text-sm text-content-muted">Agrega al menos una métrica para consultar.</p>}</div>
  </Card>;
}
