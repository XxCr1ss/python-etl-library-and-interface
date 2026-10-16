import { Button, Input, Select } from "@/components/ui";

export function MapField({ raw, columns, onChange }: { raw: string; columns: string[]; onChange: (raw: string) => void }) {
  const decoded: unknown = JSON.parse(raw || "[]");
  const entries = Array.isArray(decoded) ? decoded.filter((v): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string")) : [];
  const pairs = entries.length ? entries : [["", ""]];
  function change(index: number, side: number, text: string) { onChange(JSON.stringify(pairs.map((pair, i) => i === index ? pair.map((value, j) => j === side ? text : value) : pair))); }
  return <div className="space-y-3">{pairs.map((pair, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
    <Select label={index === 0 ? "Columna Original" : `Columna Original ${index + 1}`} value={pair[0]} onChange={e => change(index, 0, e.target.value)}>
      <option value="">Selecciona una columna</option>{Array.from(new Set([...columns, ...(pair[0] ? [pair[0]] : [])])).map(c => <option key={c} value={c}>{c}</option>)}
    </Select>
    <Input label={index === 0 ? "Nuevo Nombre" : `Nuevo Nombre ${index + 1}`} value={pair[1]} onChange={e => change(index, 1, e.target.value)} />
    <Button variant="ghost" aria-label={`Quitar renombre ${index + 1}`} onClick={() => onChange(JSON.stringify(pairs.filter((_, i) => i !== index)))}>Quitar</Button>
  </div>)}
    <Button variant="outline" size="sm" onClick={() => onChange(JSON.stringify([...pairs, ["", ""]]))}>Añadir renombre</Button>
  </div>;
}
