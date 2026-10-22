import { object, publicMessage, request } from "./apiClient";
import { requireContract as check } from "./responseValidators";
export interface RemoteExecution {
  id: string; request_id: string; status: "running" | "success" | "error" | "unknown";
  source_label: string | null; target_label: string | null; table_name: string; table_type: string;
  started_at: string; finished_at: string | null; duration_ms: number | null;
  destination_total_rows: number | null; error_message: string | null;
}
export interface RemoteMetrics { attempts: number; successes: number; errors: number; unknown: number; running: number; success_rate: number | null; average_ms: number | null }
export function remoteExecution(v: unknown): RemoteExecution {
  check(object(v) && typeof v.id === "string" && typeof v.request_id === "string" &&
    ["running", "success", "error", "unknown"].includes(String(v.status)) && typeof v.table_name === "string" && typeof v.table_type === "string" &&
    typeof v.started_at === "string" && Number.isFinite(Date.parse(v.started_at)) &&
    (v.duration_ms === null || (typeof v.duration_ms === "number" && Number.isFinite(v.duration_ms) && v.duration_ms >= 0)) &&
    (v.destination_total_rows === null || Number.isSafeInteger(v.destination_total_rows)));
  return { id: v.id, request_id: v.request_id, status: v.status as RemoteExecution["status"], table_name: v.table_name, table_type: v.table_type,
    source_label: typeof v.source_label === "string" ? v.source_label : null, target_label: typeof v.target_label === "string" ? v.target_label : null,
    started_at: v.started_at, finished_at: typeof v.finished_at === "string" ? v.finished_at : null,
    duration_ms: v.duration_ms as number | null, destination_total_rows: v.destination_total_rows as number | null,
    error_message: typeof v.error_message === "string" ? publicMessage(v.error_message, "No se pudo confirmar el resultado.") : null };
}
export const getExecutions = (query: string, signal?: AbortSignal) => request(`monitoring/executions?${query}`, v => {
  check(object(v) && Array.isArray(v.items) && (v.next_cursor === null || typeof v.next_cursor === "string"));
  return { items: v.items.map(remoteExecution), next_cursor: v.next_cursor as string | null };
}, undefined, signal);
export const getMetrics = (query: string, signal?: AbortSignal) => request(`monitoring/metrics?${query}`, v => {
  check(object(v) && [v.attempts, v.successes, v.errors, v.unknown, v.running].every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0));
  check([v.success_rate, v.average_ms].every(n => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0)));
  return v as unknown as RemoteMetrics;
}, undefined, signal);
