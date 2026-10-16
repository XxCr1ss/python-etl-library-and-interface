import type { ExecutionRecord } from "@/types/etl";

export function historyMetrics(history: ExecutionRecord[]) {
  const successes = history.filter(record => record.status === "success").length;
  const failures = history.filter(record => record.status === "error").length;
  const durations = history.filter(record => record.status !== "running" && record.finishedAt && record.durationMs !== undefined).map(record => record.durationMs!);
  return {
    attempts: history.length, successes, failures,
    unknown: history.filter(record => record.status === "unknown").length,
    running: history.filter(record => record.status === "running").length,
    successRate: successes + failures ? successes / (successes + failures) : null,
    averageMs: durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : null,
  };
}
export function formatDuration(ms: number | undefined | null) {
  return ms == null ? "Sin datos" : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(ms / 1000)} s`;
}
