import type { ExecutionRecord } from "@/types/etl";

/** Same allowlist for downloaded reports and persisted attempt summaries. */
export function executionSummary(record: ExecutionRecord) {
  return { reportVersion: 1, id: record.id, revision: record.revision, status: record.status,
    table_name: record.table_name, table_type: record.table_type,
    ...(record.if_exists !== undefined ? { if_exists: record.if_exists } : {}),
    startedAt: record.startedAt,
    ...(record.finishedAt !== undefined ? { finishedAt: record.finishedAt } : {}),
    ...(record.durationMs !== undefined ? { durationMs: record.durationMs } : {}),
    ...(record.total_rows !== undefined ? { total_rows: record.total_rows } : {}) };
}
export function downloadLoadSummary(record: ExecutionRecord) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(executionSummary(record), null, 2)], { type: "application/json" }));
  try {
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `carga-${record.id}.json`;
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  } finally { URL.revokeObjectURL(url); }
}
export const unknownLoadMessage = "No se pudo confirmar el resultado; revisa la tabla destino antes de repetir";
