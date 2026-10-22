import { useId, type RefObject } from "react";
import { Search } from "lucide-react";
import { Button, Input } from "@/components/ui";

export function ManualSearch({ query, onChange, count, inputRef }: { query: string; onChange: (value: string) => void; count: number; inputRef?: RefObject<HTMLInputElement> }) {
  const id = useId();
  return <div className="space-y-2">
    <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Input ref={inputRef} label="Buscar en el manual" value={query} onChange={event => onChange(event.target.value)} placeholder="Nombre, campo o familia…" aria-describedby={id} /></div>
      {query && <Button variant="ghost" size="sm" onClick={() => onChange("")}>Limpiar</Button>}
    </div>
    <p id={id} role="status" className="flex items-center gap-2 text-xs text-content-muted"><Search aria-hidden className="h-3 w-3 shrink-0" />{query ? `${count} resultados` : "Guías y operaciones por familia"}</p>
  </div>;
}
