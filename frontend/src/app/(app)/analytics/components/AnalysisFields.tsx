import { Button, Select } from "@/components/ui";
import { fieldKey, newOutputId, queryFields, type FieldOption } from "@/features/warehouse/queryFields";
import type { Catalog, FieldRef, Selection } from "@/types/warehouse";
import type { ValueSpec } from "@/types/analysis";
import { FilterEditor } from "./FilterEditor";

export function FieldPicker({ label, fields, value, optional, onChange }: { label: string; fields: FieldOption[]; value?: FieldRef | null; optional?: boolean; onChange: (v: FieldRef | null) => void }) {
  return <Select label={label} value={value ? fieldKey(value) : ""} onChange={e => onChange(fields.find(f => f.key === e.target.value)?.ref || null)}><option value="">{optional ? "Sin configurar" : "Selecciona columna"}</option>{fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</Select>;
}

export function ValueEditor({ value, fields, onChange, label = "Valor" }: { value?: ValueSpec | null; fields: FieldOption[]; onChange: (v: ValueSpec) => void; label?: string }) {
  return <div className="grid gap-3 sm:grid-cols-2"><FieldPicker label={label} fields={fields} value={value?.field} onChange={field => { if (field) onChange({ ...value, field }); }} />
    {value && <><FieldPicker label={`Multiplicar ${label.toLowerCase()} por`} fields={fields.filter(f => ["integer", "float", "decimal"].includes(f.column.logical_type))} value={value.multiply_by} optional onChange={multiply_by => onChange({ ...value, multiply_by, duration_end: null })} />
      <FieldPicker label={`Fecha final de ${label.toLowerCase()}`} fields={fields.filter(f => ["date", "datetime"].includes(f.column.logical_type))} value={value.duration_end} optional onChange={duration_end => onChange({ ...value, duration_end, multiply_by: null })} />
      {value.duration_end && <><Select label="Unidad de duración" value={value.duration_unit || "minutes"} onChange={e => onChange({ ...value, duration_unit: e.target.value as ValueSpec["duration_unit"] })}>{["seconds", "minutes", "hours", "days"].map(unit => <option key={unit}>{unit}</option>)}</Select><label className="flex gap-2 text-sm"><input type="checkbox" checked={value.exclude_negative !== false} onChange={e => onChange({ ...value, exclude_negative: e.target.checked })} />Excluir duraciones negativas</label></>}
    </>}
  </div>;
}

export const fieldsFor = (catalog: Catalog, selection: Selection) => queryFields(catalog, { ...selection, metrics: [], dimensions: [], order_by: [], limit: 20 });

export function SelectionEditor({ catalog, value, onChange, label }: { catalog: Catalog; value: Selection; onChange: (s: Selection) => void; label: string }) {
  const fields = fieldsFor(catalog, value);
  const base = catalog.tables.find(t => t.table_id === value.base_table_id);
  const relations = [{ id: "base", table: base }, ...value.joins.map(j => ({ id: j.id, table: catalog.tables.find(t => t.table_id === j.target_table_id) }))];
  const updateJoin = (i: number, patch: Partial<Selection["joins"][number]>) => onChange({ ...value, joins: value.joins.map((j, n) => n === i ? { ...j, ...patch } : j) });
  const targets = catalog.tables.filter(t => t.unique_keys.length && t.table_id !== value.base_table_id);
  return <fieldset className="space-y-3 rounded-lg border border-line p-4"><legend className="px-1 font-semibold">{label}</legend>
    <Select label={`Tabla de ${label.toLowerCase()}`} value={value.base_table_id} onChange={e => onChange({ base_table_id: e.target.value, joins: [], filters: [] })}>{catalog.tables.filter(t => t.selectable).map(t => <option key={t.table_id} value={t.table_id}>{t.schema}.{t.table_name}</option>)}</Select>
    {value.joins.map((j, i) => { const parent = relations.find(r => r.id === (j.source_relation || "base"))?.table; const target = catalog.tables.find(t => t.table_id === j.target_table_id); return <div key={j.id} className="space-y-2 rounded-lg bg-surface-muted p-3"><p className="text-sm font-semibold">Relación {i + 1}: {j.id}</p><div className="grid gap-3 sm:grid-cols-3"><Select label={`Partir de relación ${i + 1}`} value={j.source_relation || "base"} onChange={e => updateJoin(i, { source_relation: e.target.value, via: { kind: "manual", pairs: target?.unique_keys[0].map(c => ({ base_column: "", target_column: c })) || [] } })}>{relations.slice(0, i + 1).map(r => <option key={r.id} value={r.id}>{r.id} · {r.table?.table_name}</option>)}</Select>
      <Select label={`Destino de relación ${i + 1}`} value={j.target_table_id} onChange={e => { const t = catalog.tables.find(t => t.table_id === e.target.value)!; updateJoin(i, { target_table_id: t.table_id, via: { kind: "manual", pairs: t.unique_keys[0].map(c => ({ base_column: "", target_column: c })) } }); }}>{catalog.tables.filter(t => t.unique_keys.length && t.table_id !== value.base_table_id).map(t => <option key={t.table_id} value={t.table_id}>{t.table_name}</option>)}</Select>
      <Select label={`Cruce de relación ${i + 1}`} value={j.type} onChange={e => updateJoin(i, { type: e.target.value as "LEFT" | "INNER" })}><option>LEFT</option><option>INNER</option></Select></div>
      {j.via.kind === "manual" && <><Select label={`PK/UNIQUE de relación ${i + 1}`} value={JSON.stringify(j.via.pairs.map(p => p.target_column))} onChange={e => updateJoin(i, { via: { kind: "manual", pairs: (JSON.parse(e.target.value) as string[]).map(c => ({ base_column: "", target_column: c })) } })}>{target?.unique_keys.map(k => <option key={JSON.stringify(k)} value={JSON.stringify(k)}>{k.join(" + ")}</option>)}</Select>{j.via.pairs.map((p, n) => <Select key={p.target_column} label={`Columna para ${p.target_column} · ${j.id}`} value={p.base_column} onChange={e => { if (j.via.kind === "manual") updateJoin(i, { via: { kind: "manual", pairs: j.via.pairs.map((v, k) => n === k ? { ...v, base_column: e.target.value } : v) } }); }}><option value="">Selecciona columna</option>{parent?.columns.filter(c => c.logical_type === target?.columns.find(c => c.name === p.target_column)?.logical_type).map(c => <option key={c.name}>{c.name}</option>)}</Select>)}</>}
      <Button variant="ghost" onClick={() => onChange({ ...value, joins: value.joins.slice(0, i), filters: value.filters.filter(f => f.field.relation === "base" || value.joins.slice(0, i).some(j => j.id === f.field.relation)) })}>Quitar relación y dependientes {i + 1}</Button>
    </div>; })}
    <Button variant="outline" disabled={!targets.length || value.joins.length >= catalog.capabilities.effective_limits.joins} onClick={() => { const target = targets[0]; onChange({ ...value, joins: [...value.joins, { id: newOutputId("relation"), source_relation: "base", target_table_id: target.table_id, type: "LEFT", via: { kind: "manual", pairs: target.unique_keys[0].map(c => ({ target_column: c, base_column: "" })) } }] }); }}>Agregar relación verificada</Button>
    <p className="text-sm text-content-muted">Solo rutas hacia claves únicas completas. Las referencias que dejen de existir se rechazan antes de consultar.</p>
    <FilterEditor fields={fields} filters={value.filters} onChange={filters => onChange({ ...value, filters })} max={catalog.capabilities.effective_limits.filters} disabled={false} />
  </fieldset>;
}
