import { object } from "@/services/apiClient";
export const PROTOCOL_VERSION = 1;
export const PRESENCE_TTL = 20000;
export const REQUEST_TIMEOUT = 18000;
export interface Binding { pairingId: string; ownerTabId: string; connectionVersion: number }
export interface OwnerState { route: string; revision: number; available: boolean; reason: string; stateVersion: number; generation?: number; suspended?: boolean }
export type MessageType = "DIAGRAM_READY" | "OWNER_STATE" | "STATE_PROBE" | "SCHEMA_REQUEST" | "SCHEMA_RESULT" | "PREVIEW_REQUEST" | "PREVIEW_RESULT" | "CANCEL_REQUEST" | "USE_TABLE_REQUEST" | "USE_TABLE_RESULT" | "CONTEXT_INVALIDATED" | "DIAGRAM_CLOSED";
export interface WireMessage extends Binding { protocolVersion: 1; diagramInstanceId: string; type: MessageType; requestId?: string; data?: unknown }
const types: MessageType[] = ["DIAGRAM_READY", "OWNER_STATE", "STATE_PROBE", "SCHEMA_REQUEST", "SCHEMA_RESULT", "PREVIEW_REQUEST", "PREVIEW_RESULT", "CANCEL_REQUEST", "USE_TABLE_REQUEST", "USE_TABLE_RESULT", "CONTEXT_INVALIDATED", "DIAGRAM_CLOSED"];
const id = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(v);
export function parseBinding(v: unknown): Binding | null {
  return object(v) && id(v.pairingId) && id(v.ownerTabId) && Number.isSafeInteger(v.connectionVersion) && Number(v.connectionVersion) > 0
    ? { pairingId: v.pairingId, ownerTabId: v.ownerTabId, connectionVersion: Number(v.connectionVersion) } : null;
}
export function parseMessage(v: unknown, binding: Binding): WireMessage | null {
  if (!object(v) || v.protocolVersion !== 1 || !id(v.diagramInstanceId) || !types.includes(v.type as MessageType) || !parseBinding(v) ||
    v.pairingId !== binding.pairingId || v.ownerTabId !== binding.ownerTabId || v.connectionVersion !== binding.connectionVersion ||
    Object.keys(v).some(k => !["protocolVersion", "pairingId", "ownerTabId", "connectionVersion", "diagramInstanceId", "type", "requestId", "data"].includes(k))) return null;
  if (v.requestId !== undefined && !id(v.requestId)) return null;
  if (["SCHEMA_REQUEST", "SCHEMA_RESULT", "PREVIEW_REQUEST", "PREVIEW_RESULT", "CANCEL_REQUEST", "USE_TABLE_REQUEST", "USE_TABLE_RESULT"].includes(String(v.type)) && !id(v.requestId)) return null;
  if (v.type === "PREVIEW_REQUEST" && (!object(v.data) || typeof v.data.tableId !== "string" || Object.keys(v.data).length !== 1)) return null;
  if (v.type === "USE_TABLE_REQUEST" && (!object(v.data) || typeof v.data.tableId !== "string" || !Number.isSafeInteger(v.data.revision) ||
    (v.data.generation !== undefined && (!Number.isSafeInteger(v.data.generation) || Number(v.data.generation) < 0)) ||
    Object.keys(v.data).some(k => !["tableId", "revision", "generation"].includes(k)))) return null;
  return v as unknown as WireMessage;
}
export function parseOwnerState(v: unknown): OwnerState | null {
  return object(v) && typeof v.route === "string" && Number.isSafeInteger(v.revision) && typeof v.available === "boolean" && typeof v.reason === "string" && Number.isSafeInteger(v.stateVersion) &&
    (v.generation === undefined || (Number.isSafeInteger(v.generation) && Number(v.generation) >= 0)) && (v.suspended === undefined || typeof v.suspended === "boolean")
    ? v as unknown as OwnerState : null;
}
export const channelName = (binding: Binding) => "etl_diagram_sync:" + binding.pairingId;
export const envelope = (binding: Binding, diagramInstanceId: string, type: MessageType, requestId?: string, data?: unknown): WireMessage =>
  ({ ...binding, protocolVersion: 1, diagramInstanceId, type, ...(requestId ? { requestId } : {}), ...(data === undefined ? {} : { data }) });
