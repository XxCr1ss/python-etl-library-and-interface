import { API_URL, ApiError, object, publicMessage, request } from "./apiClient";
import { warehouseCatalog, warehouseDetail, warehouseQuery } from "./warehouseValidators";
import type { Connection, DetailRequest, ExportSpec, WarehouseQuery } from "@/types/warehouse";
import { requireContract as check } from "./responseValidators";

function secure() {
  const url = new URL(API_URL);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new ApiError("network", "El backend remoto requiere HTTPS.");
}
export const getWarehouseCatalog = (connection: Connection, signal?: AbortSignal) => { secure(); return request("warehouse/catalog", warehouseCatalog, { connection }, signal); };
export const queryWarehouse = (connection: Connection, query: WarehouseQuery, signal?: AbortSignal) => { secure(); return request("warehouse/query", value => {
  const result = warehouseQuery(value);
  check(JSON.stringify(result.columns.map(c => c.id)) === JSON.stringify([...query.dimensions, ...query.metrics].map(c => c.id)) && result.meta.applied_limit === query.limit);
  check(result.summary_kpis.every((k, i) => k.metric_id === query.metrics[i].id && k.aggregation === query.metrics[i].aggregation));
  return result;
}, { connection, query }, signal); };
export const detailWarehouse = (connection: Connection, detail: DetailRequest, signal?: AbortSignal) => { secure(); return request("warehouse/detail", value => {
  const result = warehouseDetail(value);
  check(JSON.stringify(result.columns.map(c => c.id)) === JSON.stringify(detail.columns.map(c => c.id)) && result.pagination.page === detail.page && result.pagination.page_size === detail.page_size);
  return result;
}, { connection, ...detail }, signal); };

export async function exportWarehouse(connection: Connection, spec: ExportSpec, signal?: AbortSignal): Promise<Blob> {
  secure();
  let response: Response;
  try { response = await fetch(`${API_URL}/warehouse/export`, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connection, ...spec }) }); }
  catch { throw new ApiError(signal?.aborted ? "aborted" : "network", signal?.aborted ? "Solicitud cancelada" : "No se pudo descargar el reporte."); }
  if (!response.ok) {
    let data: unknown; try { data = await response.json(); } catch { data = undefined; }
    throw new ApiError("http", publicMessage(object(data) ? data.detail : null, `No se pudo descargar (${response.status}).`, [connection.password]), response.status);
  }
  const mime = response.headers.get("Content-Type") || "";
  if (!mime.startsWith(spec.format === "csv" ? "text/csv" : "application/json")) throw new ApiError("contract", "El archivo recibido no corresponde al formato solicitado.");
  const blob = await response.blob();
  if (blob.size > 10 * 1024 * 1024) throw new ApiError("contract", "El archivo recibido supera el límite de descarga.");
  return blob;
}

export function saveWarehouseReport(blob: Blob, format: "csv" | "json") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `reporte_bodega.${format}`;
  try { document.body.appendChild(link); link.click(); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
