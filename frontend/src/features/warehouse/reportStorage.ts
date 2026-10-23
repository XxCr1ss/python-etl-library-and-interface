import { object, request } from "@/services/apiClient";
import { requireContract as check } from "@/services/responseValidators";
import type { SavedReport } from "@/types/analysis";

export async function validateReportDefinition(value: unknown): Promise<SavedReport> {
  return request("warehouse/definition", v => {
    check(object(v) && v.version === 1 && typeof v.title === "string" && Array.isArray(v.analyses) && v.analyses.length > 0 && v.analyses.length <= 8);
    return v as unknown as SavedReport;
  }, value);
}

export function reportStorageKey(owner: string, connectionContext: unknown) {
  // Identity only: callers must never pass a password, token or connection object with secrets.
  return `etl:reports:v1:${owner}:${JSON.stringify(connectionContext)}`;
}

export function downloadArtifact(value: unknown, filename: string, mime = "application/json") {
  const blob = new Blob([typeof value === "string" ? value : JSON.stringify(value, null, 2)], { type: mime });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename;
  try { document.body.appendChild(link); link.click(); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function csvResult(columns: { id: string; label: string; logical_type?: string }[], data: Record<string, unknown>[]) {
  const cell = (v: unknown, protect = true) => { const text = v === null || v === undefined ? "" : String(v); return `"${(protect && (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) ? "'" + text : text).replaceAll('"', '""')}"`; };
  return [columns.map(c => cell(c.label)).join(","), ...data.map(r => columns.map(c => cell(r[c.id], !c.logical_type || c.logical_type === "string")).join(","))].join("\r\n");
}
