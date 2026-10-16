import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { StepType } from "@/types/etl";
import { stepRegistry } from "./StepRegistry";

export function StepPicker({ selectedType, onSelect, disabled }: { selectedType: StepType; onSelect: (type: StepType) => void; disabled: boolean }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([stepRegistry[selectedType].category]);
  const definitions = Object.values(stepRegistry);
  return <nav aria-label="Operaciones de transformación" className="max-h-64 space-y-3 overflow-y-auto md:max-h-none md:overflow-visible">
    <Input label="Buscar operación" value={search} onChange={e => setSearch(e.target.value)} />
    <p className="text-sm text-content-muted">42 operaciones. Elegir otra operación descarta su borrador tras confirmar.</p>
    {Array.from(new Set(definitions.map(d => d.category))).map(category => {
      const items = definitions.filter(d => d.category === category && `${d.name} ${d.type} ${d.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
      if (!items.length) return null;
      const open = !!search || expanded.includes(category);
      return <section key={category} className="rounded-lg border border-line p-2">
        <Button variant="ghost" className="w-full justify-between text-left" aria-expanded={open} onClick={() => setExpanded(current => current.includes(category) ? current.filter(c => c !== category) : [...current, category])}>{category}</Button>
        {open && <div className="space-y-1">{items.map(definition => { const Icon = definition.icon; return <Button key={definition.type} variant={selectedType === definition.type ? "primary" : "ghost"} disabled={disabled}
          className="h-auto w-full justify-start whitespace-normal text-left" aria-pressed={selectedType === definition.type} onClick={() => onSelect(definition.type)}><Icon className="mr-2 h-4 w-4 shrink-0" />{definition.name}</Button>; })}</div>}
      </section>;
    })}
  </nav>;
}
