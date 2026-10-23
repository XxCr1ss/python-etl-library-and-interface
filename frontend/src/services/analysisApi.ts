import { API_URL, ApiError, object, request } from "./apiClient";
import { requireContract as check } from "./responseValidators";
import { result, count } from "./warehouseValidators";
import type { Connection } from "@/types/warehouse";
import type { AnalysisResult, AnalysisSpec, ReportResult } from "@/types/analysis";

export function analysisResult(v: unknown): AnalysisResult {
  result(v);
  check(object(v) && object(v.definition) && v.definition.version === 1 && typeof v.execution_id === "string" && Array.isArray(v.summary_kpis) && object(v.filtered_rows));
  check(object(v.units) && Object.values(v.units).every(x => typeof x === "string"));
  const definition = v.definition;
  check(typeof definition.title === "string" && typeof definition.grain === "string" && object(definition.selection) && typeof definition.selection.base_table_id === "string" && Array.isArray(definition.measures) && Array.isArray(definition.dimensions) && Array.isArray(definition.formulas));
  if (v.measure_counts !== undefined) {
    check(Array.isArray(v.measure_counts));
    for (const c of v.measure_counts) { check(object(c) && typeof c.metric_id === "string"); count(c.observed); count(c.valid); count(c.excluded); }
  }
  const ids = new Set((v.columns as { id: string; role: string }[]).filter(c => c.role === "metric").map(c => c.id));
  check(v.summary_kpis.every(k => object(k) && ids.has(String(k.metric_id)) && typeof k.aggregation === "string" && ["integer", "decimal", "float", "string", "date", "datetime"].includes(String(k.logical_type)) && ["native", "decimal_string", "integer_string", "iso8601"].includes(String(k.encoding)) && (k.value === null || ["string", "number", "boolean"].includes(typeof k.value))));
  check(v.filtered_rows.logical_type === "integer" && ((v.filtered_rows.encoding === "native" && Number.isSafeInteger(v.filtered_rows.value) && Number(v.filtered_rows.value) >= 0) || (v.filtered_rows.encoding === "integer_string" && typeof v.filtered_rows.value === "string" && /^\d+$/.test(v.filtered_rows.value))));
  return v as unknown as AnalysisResult;
}

export function analyzeWarehouse(connection: Connection, analysis: AnalysisSpec, signal?: AbortSignal) {
  const url = new URL(API_URL);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new ApiError("network", "El backend remoto requiere HTTPS.");
  return request("warehouse/analyze", analysisResult, { connection, analysis }, signal);
}

export function reportWarehouse(connection: Connection, analyses: AnalysisSpec[], signal?: AbortSignal) {
  const url = new URL(API_URL);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new ApiError("network", "El backend remoto requiere HTTPS.");
  return request("warehouse/report", v => {
    check(object(v) && v.status === "success" && v.version === 1 && typeof v.execution_id === "string" && Array.isArray(v.results) && v.results.length === analyses.length);
    v.results.forEach(analysisResult);
    return v as unknown as ReportResult;
  }, { connection, version: 1, analyses }, signal);
}
