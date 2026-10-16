import { Button, Select } from "@/components/ui";

export function ColumnsField({ label, raw, columns, onChange, single = false }: {
  label: string; raw: string; columns: string[]; onChange: (raw: string) => void; single?: boolean;
}) {
  let value: unknown; try { value = JSON.parse(raw); } catch { value = raw; }
  const selected: string[] = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  if (single) return <Select label={label} value={raw} onChange={e => onChange(e.target.value)}>
    <option value="">Selecciona una columna</option>{Array.from(new Set([...columns, ...(raw ? [raw] : [])])).map(c => <option key={c} value={c}>{c}</option>)}
  </Select>;
  function move(index: number, to: number) {
    const next = [...selected]; const [name] = next.splice(index, 1); next.splice(to, 0, name); onChange(JSON.stringify(next));
  }
  return <fieldset className="space-y-2 rounded-lg border border-line p-3"><legend className="text-sm font-medium">{label}</legend>
    {Array.from(new Set([...columns, ...selected])).map(column => <label key={column} className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={selected.includes(column)} onChange={e => onChange(JSON.stringify(e.target.checked ? [...selected, column] : selected.filter(c => c !== column)))} />{column}
    </label>)}
    {!columns.length && <p className="text-sm text-content-muted">No hay columnas disponibles.</p>}
    {selected.length > 0 && <ol className="space-y-1">{selected.map((column, index) => <li key={column} className="flex flex-wrap items-center gap-2 text-sm">
      <span>{index + 1}. {column}</span>
      <Button size="sm" variant="ghost" disabled={index === 0} aria-label={`Subir ${column} en ${label}`} onClick={() => move(index, index - 1)}>↑</Button>
      <Button size="sm" variant="ghost" disabled={index === selected.length - 1} aria-label={`Bajar ${column} en ${label}`} onClick={() => move(index, index + 1)}>↓</Button>
    </li>)}</ol>}
    <Button size="sm" variant="ghost" onClick={() => onChange("null")}>Usar todas (si la operación lo permite)</Button>
  </fieldset>;
}
