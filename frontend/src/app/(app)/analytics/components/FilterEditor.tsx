import { Button, Input, Select } from "@/components/ui";
import { fieldKey, type FieldOption } from "@/features/warehouse/queryFields";
import type { WarehouseFilter } from "@/types/warehouse";

const operators = ["EQ", "NE", "GT", "GTE", "LT", "LTE", "CONTAINS", "IN", "BETWEEN", "IS_NULL", "IS_NOT_NULL"] as const;
type Operator = typeof operators[number];
function withOperator(field: WarehouseFilter["field"], op: Operator, boolean = false): WarehouseFilter {
  if (op === "IS_NULL" || op === "IS_NOT_NULL") return { field, op };
  if (op === "IN") return { field, op, values: [boolean ? false : ""] };
  if (op === "BETWEEN") return { field, op, values: ["", ""] };
  return { field, op, value: boolean ? false : "" };
}
export function FilterEditor({ fields, filters, max, disabled, onChange }: { fields: FieldOption[]; filters: WarehouseFilter[]; max: number; disabled: boolean; onChange: (f: WarehouseFilter[]) => void }) {
  const update = (index: number, value: WarehouseFilter) => onChange(filters.map((f, i) => i === index ? value : f));
  return <fieldset disabled={disabled} className="space-y-3"><legend className="mb-2 text-sm font-semibold">Filtros · todas las condiciones (AND)</legend>
    {filters.map((f, i) => { const field = fields.find(x => fieldKey(f.field) === x.key); return <div key={i} className="grid items-end gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select label={`Columna de filtro ${i + 1}`} value={fieldKey(f.field)} onChange={e => { const next = fields.find(x => x.key === e.target.value)!; update(i, withOperator(next.ref, "EQ", next.column.logical_type === "boolean")); }}>{fields.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</Select>
      <Select label={`Operador ${i + 1}`} value={f.op} onChange={e => update(i, withOperator(f.field, e.target.value as Operator, field?.column.logical_type === "boolean"))}>{operators.filter(op => field?.column.logical_type !== "boolean" || ["EQ", "NE", "IS_NULL", "IS_NOT_NULL"].includes(op)).filter(op => op !== "CONTAINS" || field?.column.logical_type === "string").map(op => <option key={op}>{op}</option>)}</Select>
      {f.op === "IS_NULL" || f.op === "IS_NOT_NULL" ? <span className="py-2 text-sm text-content-muted">Sin valor adicional</span> : f.op === "BETWEEN" ? <div className="grid grid-cols-2 gap-2"><Input label={`Inicio ${i + 1}`} value={String(f.values[0])} onChange={e => update(i, { ...f, values: [e.target.value, f.values[1]] })} /><Input label={`Fin ${i + 1}`} value={String(f.values[1])} onChange={e => update(i, { ...f, values: [f.values[0], e.target.value] })} /></div>
        : f.op === "IN" ? <Input label={`Valores ${i + 1}`} hint="Separados por punto y coma" value={f.values.map(String).join(";")} onChange={e => update(i, { ...f, values: e.target.value.split(";") })} />
        : field?.column.logical_type === "boolean" ? <Select label={`Valor ${i + 1}`} value={String(f.value)} onChange={e => update(i, { ...f, value: e.target.value === "true" })}><option value="false">No</option><option value="true">Sí</option></Select>
        : <Input label={`Valor ${i + 1}`} maxLength={1000} value={String(f.value)} hint={field?.column.logical_type === "date" || field?.column.logical_type === "datetime" ? "Fecha/hora ISO" : "Texto literal o número exacto"} onChange={e => update(i, { ...f, value: e.target.value })} />}
      <Button variant="ghost" onClick={() => onChange(filters.filter((_, index) => i !== index))}>Quitar filtro {i + 1}</Button>
    </div>; })}
    <Button variant="outline" disabled={!fields.length || filters.length >= max} onClick={() => onChange([...filters, withOperator(fields[0].ref, "EQ", fields[0].column.logical_type === "boolean")])}>Agregar filtro</Button>
  </fieldset>;
}
