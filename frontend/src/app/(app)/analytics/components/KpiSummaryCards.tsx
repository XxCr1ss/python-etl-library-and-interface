import { Card } from "@/components/ui";
import { formatScalar } from "@/features/warehouse/format";
import type { QueryResult } from "@/types/warehouse";

export function KpiSummaryCards({ result }: { result: QueryResult }) {
  return <section aria-label="Métricas globales" className="space-y-3"><h2 className="text-lg font-semibold">Resumen del conjunto filtrado</h2><p className="text-sm text-content-muted">Calculado antes del Top N. Incluye todos los registros que cumplen los filtros y cruces.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{result.summary_kpis.map(k => <Card key={k.metric_id} className="min-w-0"><h3 className="text-sm font-semibold text-content-muted">{result.columns.find(c => c.id === k.metric_id)?.label || k.aggregation}</h3><p className="mt-2 break-all text-2xl font-semibold tabular-nums">{formatScalar(k.value, k.logical_type)}</p></Card>)}
      <Card><h3 className="text-sm font-semibold text-content-muted">Filas filtradas</h3><p className="mt-2 break-all text-2xl font-semibold tabular-nums">{formatScalar(result.filtered_rows.value, "integer")}</p></Card></div>
  </section>;
}
