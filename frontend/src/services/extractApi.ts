import { object, request } from "./apiClient";
import { extraction, metadata, requireContract, upload } from "./responseValidators";
import type { SourceConnectionDto } from "@/types/etl";
import { connectionWire } from "./connectionWire";
export function uploadFile(file: File, signal?: AbortSignal) { const form = new FormData(); form.append("file", file); return request("extract/upload", upload, form, signal); }
export const getDatabaseMetadata = (connection: SourceConnectionDto, signal?: AbortSignal) => request("extract/database", metadata, connectionWire(connection), signal);
export const previewDatabaseTable = (connection: SourceConnectionDto & { table_name: string }, signal?: AbortSignal) => request("extract/database/preview", extraction, { ...connectionWire(connection), table_name: connection.table_name }, signal);
export const previewDateDimension = (years: { start_year: number; end_year: number }, signal?: AbortSignal) => request("extract/date-dimension/preview", extraction, years, signal);
export const getAgentStatus = (id: string, signal?: AbortSignal) => request(`extract/agent/status/${encodeURIComponent(id)}`, v => {
  requireContract(object(v) && typeof v.agent_id === "string" && typeof v.connected === "boolean");
  requireContract(v.agent_id === id && (v.connection_id === undefined || v.connection_id === null || typeof v.connection_id === "string"));
  return { agent_id: v.agent_id, connected: v.connected,
    ...(v.connection_id !== undefined ? { connection_id: v.connection_id as string | null } : {}) };
}, undefined, signal);
