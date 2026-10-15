import { object, publicMessage } from "./apiClient";
import type { DatabaseMetadata, ExtractionPreview, JsonValue, LoadResponse, MessageResponse, PreviewResponse, UploadResponse } from "@/types/etl";
export function requireContract(condition: unknown): asserts condition { if (!condition) throw new Error("Contrato inválido"); }
export const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
export function json(v: unknown): v is JsonValue {
  return v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) ||
    (Array.isArray(v) ? v.every(json) : object(v) && Object.values(v).every(json));
}
export function extraction(v: unknown): ExtractionPreview {
  requireContract(object(v) && v.status === "success" && Number.isInteger(v.total_rows) && Number(v.total_rows) >= 0 && Array.isArray(v.preview_data) && v.preview_data.every(r => object(r) && json(r)));
  return v as unknown as ExtractionPreview;
}
export function message(v: unknown): MessageResponse {
  requireContract(object(v) && v.status === "success" && typeof v.message === "string");
  return { status: "success", message: publicMessage(v.message, "Operación completada") };
}
export function upload(v: unknown): UploadResponse {
  extraction(v); message(v);
  requireContract(object(v) && [v.filename, v.filepath, v.unique_filename].every(x => typeof x === "string" && x.length > 0));
  return v as unknown as UploadResponse;
}
export function metadata(v: unknown): DatabaseMetadata {
  message(v);
  requireContract(object(v) && strings(v.tables) && object(v.schema_preview) && Object.values(v.schema_preview).every(x => Array.isArray(x) && x.every(json)));
  return v as unknown as DatabaseMetadata;
}
export function preview(v: unknown): PreviewResponse {
  extraction(v);
  requireContract(object(v) && strings(v.columns) && object(v.dtypes) && Object.values(v.dtypes).every(x => typeof x === "string"));
  return v as unknown as PreviewResponse;
}
export function load(v: unknown): LoadResponse {
  extraction(v); const safe = message(v);
  requireContract(object(v) && typeof v.table_name === "string" && ["dimension", "fact"].includes(String(v.table_type)));
  return { ...v, ...safe } as unknown as LoadResponse;
}
