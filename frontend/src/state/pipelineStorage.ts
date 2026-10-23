import type { ExecutionRecord } from "@/types/etl";
import { parseLoadConfig, parseSource, parseStep, parseTarget } from "@/types/etlValidation";
import { object } from "@/services/apiClient";
import { requireContract as check } from "@/services/responseValidators";
import { CredentialStore } from "./credentialStore";
import { initialState, type PipelineState } from "./pipelineReducer";
import { foreignKeyRows, loadConfigDto, type ForeignKeyRow } from "./loadValidation";
import { executionSummary } from "./loadReport";
export const SESSION_KEY = "etl_pipeline_session_v1";
const legacyKeys = ["etl_active_source", "etl_transform_recipe"];
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function browserSessionStorage(): StoragePort | null { try { return window.sessionStorage; } catch { return null; } }
export function clearAccountSession() {
  const storage = browserSessionStorage();
  for (const key of [SESSION_KEY, ...legacyKeys]) { try { storage?.removeItem(key); } catch { /* Ownership checks also block restoration. */ } }
}
function record(v: unknown): ExecutionRecord {
  check(object(v) && typeof v.id === "string" && Number.isInteger(v.revision) && Number(v.revision) >= 0 && typeof v.startedAt === "string" && Number.isFinite(Date.parse(v.startedAt)) &&
    ["running", "success", "error", "unknown"].includes(String(v.status)) && typeof v.table_name === "string" && ["dimension", "fact"].includes(String(v.table_type)));
  check(v.finishedAt === undefined || (typeof v.finishedAt === "string" && Number.isFinite(Date.parse(v.finishedAt))));
  check(v.durationMs === undefined || (typeof v.durationMs === "number" && Number.isFinite(v.durationMs) && v.durationMs >= 0));
  check(v.total_rows === undefined || (Number.isInteger(v.total_rows) && Number(v.total_rows) >= 0));
  check(v.sourceLabel === undefined || typeof v.sourceLabel === "string");
  check(v.if_exists === undefined || ["replace", "append", "fail", "reload", "schema_only"].includes(String(v.if_exists)));
  return { id: v.id, revision: Number(v.revision), startedAt: v.startedAt, status: v.status as ExecutionRecord["status"], table_name: v.table_name, table_type: v.table_type as ExecutionRecord["table_type"],
    ...(v.if_exists !== undefined ? { if_exists: v.if_exists as ExecutionRecord["if_exists"] } : {}),
    ...(v.sourceLabel !== undefined ? { sourceLabel: v.sourceLabel as string } : {}),
    ...(v.finishedAt !== undefined ? { finishedAt: v.finishedAt as string } : {}), ...(v.durationMs !== undefined ? { durationMs: Number(v.durationMs) } : {}), ...(v.total_rows !== undefined ? { total_rows: Number(v.total_rows) } : {}) };
}
export function persistedSession(state: PipelineState, ownerId: string | null = null) {
  const empty = new CredentialStore();
  return { schemaVersion: ownerId ? 2 : 1, ...(ownerId ? { ownerId } : {}), source: state.source ? parseSource(state.source, empty) : null, recipe: state.recipe.map(s => parseStep(s, empty)), revision: state.revision,
    target: state.target ? parseTarget(state.target, empty) : null, loadConfig: parseLoadConfig(loadConfigDto(state.loadConfig, state.foreignKeys)),
    foreignKeys: state.foreignKeys.map(({ id, column, table, primaryKey }) => ({ id, column, table, primaryKey })),
    history: state.history.slice(-50).map(r => ({ ...executionSummary(record(r)), ...(r.sourceLabel ? { sourceLabel: r.sourceLabel } : {}) })) };
}
export function persistSession(storage: StoragePort | null, state: PipelineState, ownerId: string | null = null): string | null {
  // Preserve unreadable history until the separate, confirmed clearHistory action.
  // The provider displays the recovery flag; the usable pipeline stays in memory.
  if (state.historyRecoveryRequired) return null;
  try { if (!storage) throw new Error(); storage.setItem(SESSION_KEY, JSON.stringify(persistedSession(state, ownerId))); return null; }
  catch { return "No se pudo guardar la sesión; los cambios se conservan en memoria y no se restaurarán tras recarga."; }
}
function readCurrent(v: unknown, store: CredentialStore): PipelineState {
  check(object(v) && (v.schemaVersion === 1 || (v.schemaVersion === 2 && typeof v.ownerId === "string" && !!v.ownerId)) && Array.isArray(v.recipe) && Number.isInteger(v.revision) && Number(v.revision) >= 0);
  const source = v.source === null ? null : parseSource(v.source, store);
  const recipe = v.recipe.map(s => parseStep(s, store));
  check(new Set(recipe.map(s => s.id)).size === recipe.length && (!!source || !recipe.length));
  let history: ExecutionRecord[] = [];
  let historyRecoveryRequired = false;
  try {
    check(Array.isArray(v.history));
    history = v.history.map(record).slice(-50).map(r => r.status === "running" ? { ...r, status: "unknown" as const } : r);
    check(new Set(history.map(r => r.id)).size === history.length);
  } catch { history = []; historyRecoveryRequired = true; }
  const loadConfig = parseLoadConfig(v.loadConfig);
  let rows = foreignKeyRows(loadConfig);
  if (v.foreignKeys !== undefined) {
    check(Array.isArray(v.foreignKeys));
    rows = v.foreignKeys.map((row: unknown): ForeignKeyRow => {
      check(object(row) && typeof row.id === "string" && typeof row.column === "string" && typeof row.table === "string" && typeof row.primaryKey === "string");
      return { id: row.id, column: row.column, table: row.table, primaryKey: row.primaryKey };
    });
    check(new Set(rows.map(row => row.id)).size === rows.length);
  }
  return { ...initialState, hydrationStatus: source ? "ready" : "empty", source, recipe, revision: Number(v.revision), history, historyRecoveryRequired,
    foreignKeys: loadConfig.table_type === "fact" ? rows : [], target: v.target === null ? null : parseTarget(v.target, store), loadConfig };
}
function clearLegacy(storage: StoragePort): string | null {
  let failed = false;
  for (const key of legacyKeys) { try { storage.removeItem(key); if (storage.getItem(key) !== null) failed = true; } catch { failed = true; } }
  return failed ? "No se pudo confirmar la limpieza de los datos previos del navegador." : null;
}
export function hydrateSession(storage: StoragePort | null, store: CredentialStore, ownerId: string | null = null): PipelineState {
  if (!storage) return { ...initialState, hydrationStatus: "recovered", warning: "Storage no disponible; la sesión se conserva solo en memoria." };
  let currentInvalid = false;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw !== null) {
      try {
        const input: unknown = JSON.parse(raw);
        if (object(input) && (input.ownerId ?? null) !== ownerId) {
          store.clear();
          try { storage.removeItem(SESSION_KEY); } catch { /* Never restore another account even when deletion fails. */ }
          clearLegacy(storage);
          return { ...initialState, hydrationStatus: "empty" };
        }
        const state = readCurrent(input, store); const warning = clearLegacy(storage); return { ...state, warning };
      }
      catch { currentInvalid = true; }
    }
    if (ownerId) { store.clear(); clearLegacy(storage); return { ...initialState, hydrationStatus: "empty" }; }
    const oldSource = storage.getItem(legacyKeys[0]); const oldRecipe = storage.getItem(legacyKeys[1]);
    if (oldSource !== null) {
      const source = parseSource(JSON.parse(oldSource) as unknown, store, true);
      const rawRecipe: unknown = oldRecipe === null ? [] : JSON.parse(oldRecipe);
      check(Array.isArray(rawRecipe)); const recipe = rawRecipe.map(v => parseStep(v, store, true));
      const state: PipelineState = { ...initialState, hydrationStatus: "ready", source, recipe };
      const writeWarning = persistSession(storage, state); const cleanupWarning = clearLegacy(storage);
      return { ...state, warning: [writeWarning, cleanupWarning, currentInvalid ? "Se recuperó la sesión heredada; la sesión nueva era inválida." : null].filter(Boolean).join(" ") || null };
    }
    check(!currentInvalid && oldRecipe === null);
    return { ...initialState, hydrationStatus: "empty" };
  } catch {
    store.clear(); const cleanupWarning = clearLegacy(storage);
    return { ...initialState, hydrationStatus: "recovered", recoveryRequired: true,
      warning: ["La sesión guardada es inválida o usa una versión no compatible. Restablece la sesión para continuar; no se ejecutó ni se recortó la receta.", cleanupWarning].filter(Boolean).join(" ") };
  }
}
