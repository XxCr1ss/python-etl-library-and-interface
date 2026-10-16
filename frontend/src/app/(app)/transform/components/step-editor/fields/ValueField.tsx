import { useState } from "react";
import { Input, Select } from "@/components/ui";

function typeOf(raw: string) {
  try { const value: unknown = JSON.parse(raw); return value === null ? "null" : typeof value === "object" ? "json" : typeof value; } catch { return "number"; }
}
export function ValueField({ label, raw, onChange }: { label: string; raw: string; onChange: (raw: string) => void }) {
  const [type, setType] = useState(() => typeOf(raw));
  let displayed = raw;
  if (type === "string") { try { const value: unknown = JSON.parse(raw); displayed = typeof value === "string" ? value : raw; } catch { /* Keep the user's draft. */ } }
  return <div className="space-y-2">
    <Select label={`Tipo de ${label}`} value={type} onChange={e => {
      const next = e.target.value; setType(next); onChange(next === "string" ? '""' : next === "number" ? "0" : next === "boolean" ? "false" : next === "null" ? "null" : "[]");
    }}><option value="string">Texto</option><option value="number">Número</option><option value="boolean">Booleano</option><option value="null">Null</option><option value="json">JSON (lista u objeto)</option></Select>
    {type === "boolean" ? <Select label={label} value={raw} onChange={e => onChange(e.target.value)}><option value="false">false</option><option value="true">true</option></Select>
      : type !== "null" && <Input label={label} value={displayed} inputMode={type === "number" ? "decimal" : undefined}
        onChange={e => onChange(type === "string" ? JSON.stringify(e.target.value) : e.target.value)} />}
  </div>;
}
