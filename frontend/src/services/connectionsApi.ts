import { object, request } from "./apiClient";
import { requireContract as check, message } from "./responseValidators";
import type { DatabaseType, ManualConnectionDto, SavedConnectionReference } from "@/types/etl";

export interface SavedConnection extends Omit<ManualConnectionDto, "password" | "use_agent" | "agent_id"> {
  id: string; name: string; connection_type: "source" | "target"; transport: "direct" | "agent";
  version: number; has_password: boolean; last_test_status: "success" | "error" | null;
  last_tested_at: string | null; created_at: string; updated_at: string;
}
export type ConnectionCreate = Omit<SavedConnection, "id" | "version" | "has_password" | "last_test_status" | "last_tested_at" | "created_at" | "updated_at"> & { password: string; runtime_agent_id?: string };
export function savedConnection(value: unknown): SavedConnection {
  check(object(value) && typeof value.id === "string" && /^[0-9a-f-]{36}$/i.test(value.id) &&
    ["source", "target"].includes(String(value.connection_type)) && ["postgresql", "mysql", "oracle"].includes(String(value.db_type)) &&
    ["direct", "agent"].includes(String(value.transport)) && Number.isInteger(value.version) && Number(value.version) > 0 &&
    [value.name, value.host, value.database, value.user, value.created_at, value.updated_at].every(v => typeof v === "string") &&
    typeof value.has_password === "boolean" && (value.port === null || value.port === undefined || Number.isInteger(value.port)) &&
    [null, "success", "error"].includes(value.last_test_status as string | null));
  check(!("password" in value) && !("encrypted_password" in value));
  return { id: value.id, name: String(value.name), connection_type: value.connection_type as "source" | "target",
    db_type: value.db_type as DatabaseType, host: String(value.host), port: value.port as number | null,
    database: String(value.database), user: String(value.user), service_name: value.service_name as string | null,
    transport: value.transport as "direct" | "agent", version: Number(value.version), has_password: value.has_password,
    last_test_status: value.last_test_status as SavedConnection["last_test_status"], last_tested_at: value.last_tested_at as string | null,
    created_at: String(value.created_at), updated_at: String(value.updated_at) };
}
export const referenceOf = (row: SavedConnection): SavedConnectionReference => ({ connection_id: row.id, connection_version: row.version });
export const listConnections = (type?: "source" | "target", signal?: AbortSignal, offset=0) => request(`connections?limit=50&offset=${offset}${type ? `&type=${type}` : ""}`, v => {
  check(object(v) && Array.isArray(v.items)); return v.items.map(savedConnection);
}, undefined, signal);
export const createConnection = (body: ConnectionCreate) => request("connections", savedConnection, body);
export const updateConnection = (id: string, body: Partial<ConnectionCreate> & { version: number }) => request(`connections/${encodeURIComponent(id)}`, savedConnection, body, undefined, "PATCH");
export const removeConnection = (row: SavedConnection) => request(`connections/${row.id}?version=${row.version}`, message, undefined, undefined, "DELETE");
export const testConnection = (row: SavedConnection, agentId?: string) => request(`connections/${row.id}/test?version=${row.version}${row.transport === "agent" && agentId ? `&runtime_agent_id=${encodeURIComponent(agentId)}` : ""}`, message, {});
