import { Button, Input } from "@/components/ui";
import type { useDateDimensionExtract } from "../hooks/useDateDimensionExtract";

export function DateDimensionTab({ model }: { model: ReturnType<typeof useDateDimensionExtract> }) {
  return <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); model.submit(); }}>
    <p className="text-sm text-content-muted">Genera el calendario para el rango inclusivo indicado. Se conservan ambos años en el pipeline.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Año inicial" inputMode="numeric" value={model.draft.start_year} error={model.errors.start_year} onChange={e => model.edit({ start_year: e.target.value })} />
      <Input label="Año final" inputMode="numeric" value={model.draft.end_year} error={model.errors.end_year} onChange={e => model.edit({ end_year: e.target.value })} />
    </div>
    <Button type="submit" isLoading={model.status === "pending"}>Generar dimensión fecha</Button>
  </form>;
}
