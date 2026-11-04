import { accessToken, authEpoch } from "./authSession";
import { queueAgentRead, sourceAgentIds } from "./agentReadQueue";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");
export class ApiError extends Error {
  constructor(public kind: "http" | "network" | "contract" | "aborted", message: string, public status?: number,
    public code?: string, public technicalDetail?: string) { super(message); this.name = "ApiError"; }
}
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
// Only allow public validation text. Never render HTML, request input or a driver URL.
export function publicMessage(value: unknown, fallback: string, secrets: string[] = []): string {
  if (typeof value !== "string" || /<[^>]+>|\b(?:password|passwd|pwd)\b|:\/\//i.test(value)) return fallback;
  let message = value;
  for (const secret of secrets) if (secret) message = message.split(secret).join("[oculto]");
  return message.slice(0, 400);
}
function publicDiagnostic(value: unknown, secrets: string[]) {
  if (typeof value !== "string" || /[\r\n]|\bbearer\b|\b(?:select|insert|update|delete|alter|drop)\s.+\b(?:from|into|table|set)\b/i.test(value)) return undefined;
  return publicMessage(value, "", secrets) || undefined;
}
function passwords(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(passwords);
  if (!object(value)) return [];
  return Object.entries(value).flatMap(([k, v]) => k === "password" && typeof v === "string" ? [v] : passwords(v));
}
const sourceReadPaths = new Set(["extract/database", "extract/database/preview", "extract/database/schema-graph", "transform/preview"]);
export function request<T>(path: string, validate: (v: unknown) => T, body?: unknown, signal?: AbortSignal, method?: "GET" | "POST" | "PATCH" | "DELETE"): Promise<T> {
  const agents = sourceReadPaths.has(path.replace(/^\/+/, "")) ? sourceAgentIds(body) : [];
  if (!agents.length) return performRequest(path, validate, body, signal, method);
  const epoch = authEpoch();
  const check = () => {
    if (signal?.aborted || epoch !== authEpoch()) throw new ApiError("aborted", "Solicitud cancelada");
  };
  return queueAgentRead(agents, async () => {
    check();
    // An active read must finish before releasing the agent's slot. Aborting
    // fetch does not prove that the CLI agent has finished its command.
    try { const data = await performRequest(path, validate, body, undefined, method); check(); return data; }
    catch (error) { check(); throw error; }
  });
}
async function performRequest<T>(path: string, validate: (v: unknown) => T, body?: unknown, signal?: AbortSignal, method?: "GET" | "POST" | "PATCH" | "DELETE"): Promise<T> {
  let response: Response;
  const epoch = authEpoch();
  try {
    const token = await accessToken();
    if (epoch !== authEpoch()) throw new ApiError("aborted", "La cuenta cambió; vuelve a intentar la operación.");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    response = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, {
      method: method ?? (body === undefined ? "GET" : "POST"), signal, headers, cache: "no-store",
      ...(body === undefined ? {} : body instanceof FormData ? { body } : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw new ApiError("aborted", "Solicitud cancelada");
    throw new ApiError("network", "No se pudo confirmar la respuesta del servidor. Comprueba la conexión.");
  }
  let data: unknown;
  try { data = await response.json(); } catch {
    if (signal?.aborted) throw new ApiError("aborted", "Solicitud cancelada");
    data = undefined;
  }
  if (epoch !== authEpoch()) throw new ApiError("aborted", "La cuenta cambió; se descartó la respuesta anterior.");
  if (!response.ok) {
    const fallback = `Error del servidor (${response.status})`;
    const detail = object(data) ? data.detail : undefined;
    const secrets = passwords(body);
    const message = Array.isArray(detail)
      ? detail.map(e => object(e) ? publicMessage(e.msg, "Solicitud inválida", secrets) : "Solicitud inválida").join("; ")
      : publicMessage(detail, fallback, secrets);
    const code = object(data) && typeof data.code === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(data.code) ? publicMessage(data.code, "", secrets) : undefined;
    const technical = object(data) ? publicDiagnostic(data.technical_detail, secrets) : undefined;
    throw new ApiError("http", message || fallback, response.status, code, technical);
  }
  try { return validate(data); } catch { throw new ApiError("contract", "La respuesta del servidor no cumple el contrato esperado.", response.status); }
}
