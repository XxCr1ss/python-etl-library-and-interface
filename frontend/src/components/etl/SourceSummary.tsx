import type { SourceDescriptor } from "@/types/etl";
import { sourceLabel } from "@/state/pipelineLabels";

export function SourceSummary({ source }: { source: SourceDescriptor | null }) {
  return <aside className="rounded-lg border border-line bg-surface-muted p-4 text-sm text-content" aria-label="Fuente confirmada">
    <p className="font-semibold">Fuente activa: {source ? sourceLabel(source) : "Sin confirmar"}</p>
    <p className="mt-1 text-content-muted">{source ? "Los borradores de esta página no reemplazan el pipeline hasta confirmar y continuar." : "Configura un origen y comprueba su vista previa para continuar."}</p>
  </aside>;
}
