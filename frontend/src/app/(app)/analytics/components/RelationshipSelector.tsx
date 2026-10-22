import { Button, Select } from "@/components/ui";
import { newOutputId } from "@/features/warehouse/queryFields";
import type { Catalog, WarehouseJoin, WarehouseQuery } from "@/types/warehouse";

export function RelationshipSelector({ catalog, query, onChange, disabled }: { catalog: Catalog; query: WarehouseQuery; onChange: (q: WarehouseQuery) => void; disabled: boolean }) {
  const base = catalog.tables.find(t => t.table_id === query.base_table_id)!;
  const foreign = catalog.relationships.filter(r => r.source_table_id === base.table_id && r.selectable && r.target_table_id !== base.table_id);
  const targets = catalog.tables.filter(t => t.table_id !== base.table_id && t.unique_keys.length);
  const update = (joins: WarehouseJoin[]) => { const relations = new Set(["base", ...joins.map(j => j.id)]); onChange({ ...query, joins, dimensions: query.dimensions.filter(d => relations.has(d.field.relation)), filters: query.filters.filter(f => relations.has(f.field.relation)), order_by: [] }); };
  const manualPairs = (tableId: string, key?: string[]) => (key || catalog.tables.find(t => t.table_id === tableId)?.unique_keys[0] || []).map(target_column => {
    const target = catalog.tables.find(t => t.table_id === tableId)?.columns.find(c => c.name === target_column);
    return { target_column, base_column: base.columns.find(c => c.name === target_column && c.logical_type === target?.logical_type)?.name || base.columns.find(c => c.logical_type === target?.logical_type)?.name || "" };
  });
  return <fieldset className="space-y-3 rounded-lg border border-line p-4" disabled={disabled}>
    <legend className="px-1 text-sm font-semibold">Relaciones directas con dimensiones</legend>
    <p className="text-sm text-content-muted">Solo cruces hacia PK/UNIQUE completas. LEFT conserva filas sin coincidencia; un filtro de dimensión puede excluirlas. Sin claves verificables puedes analizar la tabla base.</p>
    {query.joins.map((join, index) => <div key={join.id} className="space-y-3 rounded-lg bg-surface-muted p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {join.via.kind === "foreign_key" ? <Select label={`Relación ${index + 1}`} value={join.via.relationship_id} onChange={e => {
          const r = foreign.find(r => r.id === e.target.value)!; update(query.joins.map(j => j.id === join.id ? { ...j, target_table_id: r.target_table_id, via: { kind: "foreign_key", relationship_id: r.id } } : j));
        }}>{foreign.map(r => <option key={r.id} value={r.id}>{catalog.tables.find(t => t.table_id === r.target_table_id)?.table_name} · {r.column_pairs.map(p => `${p.source_column} → ${p.target_column}`).join(", ")}</option>)}</Select>
          : <Select label={`Dimensión manual ${index + 1}`} value={join.target_table_id} onChange={e => update(query.joins.map(j => j.id === join.id ? { ...j, target_table_id: e.target.value, via: { kind: "manual", pairs: manualPairs(e.target.value) } } : j))}>
            {targets.map(t => <option key={t.table_id} value={t.table_id}>{t.table_name}</option>)}</Select>}
        <Select label={`Tipo de cruce ${index + 1}`} value={join.type} onChange={e => update(query.joins.map(j => j.id === join.id ? { ...j, type: e.target.value as "LEFT" | "INNER" } : j))}><option value="LEFT">LEFT · conservar base</option><option value="INNER">INNER · solo coincidencias</option></Select>
        <Button variant="ghost" onClick={() => update(query.joins.filter(j => j.id !== join.id))}>Quitar relación {index + 1}</Button>
      </div>
      {join.via.kind === "manual" && <div className="grid gap-3 sm:grid-cols-2">
        <Select label={`Clave única destino ${index + 1}`} value={JSON.stringify(join.via.pairs.map(p => p.target_column))} onChange={e => {
          const key = catalog.tables.find(t => t.table_id === join.target_table_id)!.unique_keys.find(k => JSON.stringify(k) === e.target.value)!;
          update(query.joins.map(j => j.id === join.id ? { ...j, via: { kind: "manual", pairs: manualPairs(join.target_table_id, key) } } : j));
        }}>{catalog.tables.find(t => t.table_id === join.target_table_id)!.unique_keys.map(k => <option key={JSON.stringify(k)} value={JSON.stringify(k)}>{k.join(" + ")}</option>)}</Select>
        {join.via.pairs.map((pair, p) => <Select key={pair.target_column} label={`Base para ${pair.target_column} · relación ${index + 1}`} value={pair.base_column} onChange={e => update(query.joins.map(j => j.id === join.id && j.via.kind === "manual" ? { ...j, via: { kind: "manual", pairs: j.via.pairs.map((v, i) => i === p ? { ...v, base_column: e.target.value } : v) } } : j))}>
          <option value="">Selecciona columna</option>{base.columns.filter(c => c.logical_type === catalog.tables.find(t => t.table_id === join.target_table_id)?.columns.find(c => c.name === pair.target_column)?.logical_type).map(c => <option key={c.name}>{c.name}</option>)}</Select>)}
      </div>}
    </div>)}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!foreign.length || query.joins.length >= catalog.capabilities.effective_limits.joins} onClick={() => { const r = foreign[0]; update([...query.joins, { id: newOutputId("join"), target_table_id: r.target_table_id, type: "LEFT", via: { kind: "foreign_key", relationship_id: r.id } }]); }}>Agregar relación FK</Button>
      <Button variant="outline" disabled={!targets.length || query.joins.length >= catalog.capabilities.effective_limits.joins} onClick={() => { const t = targets[0]; update([...query.joins, { id: newOutputId("join"), target_table_id: t.table_id, type: "LEFT", via: { kind: "manual", pairs: manualPairs(t.table_id) } }]); }}>Definir mapeo manual</Button></div>
  </fieldset>;
}
