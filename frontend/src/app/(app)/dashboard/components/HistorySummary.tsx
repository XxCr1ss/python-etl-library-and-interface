import type { ExecutionRecord } from "@/types/etl";
import { formatDuration, historyMetrics } from "./historyMetrics";

export function HistorySummary({ history }: { history: ExecutionRecord[] }) {
  const metrics = historyMetrics(history);
  const stats = [
    ["Intentos retenidos", metrics.attempts], ["Éxitos", metrics.successes], ["Fallos", metrics.failures],
    ["Resultado desconocido", metrics.unknown], ["En curso", metrics.running],
    ["Duración media observada por el navegador", formatDuration(metrics.averageMs)],
  ];
  return <section aria-label="Métricas de esta pestaña" className="space-y-3">
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-surface p-5">
      <dt className="text-sm text-content-muted">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd>
    </div>)}</dl>
    <p className="text-sm text-content-muted">Tasa de éxito entre intentos con resultado conocido: {metrics.successRate === null ? "Sin datos" : new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 }).format(metrics.successRate)}.
      {" "}Los resultados desconocidos y en curso se excluyen de la tasa. La duración media usa intentos terminados con duración disponible, incluido el tiempo observado hasta un resultado desconocido.</p>
  </section>;
}
