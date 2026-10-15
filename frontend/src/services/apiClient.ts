export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");
export class ApiError extends Error {
  constructor(public kind: "http" | "network" | "contract" | "aborted", message: string, public status?: number) { super(message); this.name = "ApiError"; }
}
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
// Only allow public validation text. Never render HTML, request input or a driver URL.
export function publicMessage(value: unknown, fallback: string, secrets: string[] = []): string {
  if (typeof value !== "string" || /<[^>]+>|\b(?:password|passwd|pwd)\b|:\/\//i.test(value)) return fallback;
  let message = value;
  for (const secret of secrets) if (secret) message = message.split(secret).join("[oculto]");
  return message.slice(0, 400);
}
function passwords(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(passwords);
  if (!object(value)) return [];
  return Object.entries(value).flatMap(([k, v]) => k === "password" && typeof v === "string" ? [v] : passwords(v));
}
export async function request<T>(path: string, validate: (v: unknown) => T, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, {
      method: body === undefined ? "GET" : "POST", signal,
      ...(body === undefined ? {} : body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw new ApiError("aborted", "Solicitud cancelada");
    throw new ApiError("network", "No se pudo confirmar la respuesta del servidor. Comprueba la conexión.");
  }
  let data: unknown;
  try { data = await response.json(); } catch {
    if (signal?.aborted) throw new ApiError("aborted", "Solicitud cancelada");
    data = undefined;
  }
  if (!response.ok) {
    const fallback = `Error del servidor (${response.status})`;
    const detail = object(data) ? data.detail : undefined;
    const message = Array.isArray(detail)
      ? detail.map(e => object(e) ? publicMessage(e.msg, "Solicitud inválida", passwords(body)) : "Solicitud inválida").join("; ")
      : publicMessage(detail, fallback, passwords(body));
    throw new ApiError("http", message || fallback, response.status);
  }
  try { return validate(data); } catch { throw new ApiError("contract", "La respuesta del servidor no cumple el contrato esperado.", response.status); }
}
