import type { ExecutionRecord } from "@/types/etl";
import { parseLoadConfig, parseSource, parseStep, parseTarget } from "@/types/etlValidation";
import { object } from "@/services/apiClient";
import { requireContract as check } from "@/services/responseValidators";
import { CredentialStore } from "./credentialStore";
import { initialState, type PipelineState } from "./pipelineReducer";
export const SESSION_KEY = "etl_pipeline_session_v1";
const legacyKeys = ["etl_active_source", "etl_transform_recipe"];
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function browserSessionStorage(): StoragePort | null { try { return window.sessionStorage; } catch { return null; } }
function record(v: unknown): ExecutionRecord {
  check(object(v) && typeof v.id === "string" && Number.isInteger(v.revision) && Number(v.revision) >= 0 && typeof v.startedAt === "string" && Number.isFinite(Date.parse(v.startedAt)) &&
    ["running", "success", "error", "unknown"].includes(String(v.status)) && typeof v.table_name === "string" && ["dimension", "fact"].includes(String(v.table_type)));
  check(v.finishedAt === undefined || (typeof v.finishedAt === "string" && Number.isFinite(Date.parse(v.finishedAt))));
  check(v.durationMs === undefined || (typeof v.durationMs === "number" && Number.isFinite(v.durationMs) && v.durationMs >= 0));
  check(v.total_rows === undefined || (Number.isInteger(v.total_rows) && Number(v.total_rows) >= 0));
  check(v.sourceLabel === undefined || typeof v.sourceLabel === "string");
  return { id: v.id, revision: Number(v.revision), startedAt: v.startedAt, status: v.status as ExecutionRecord["status"], table_name: v.table_name, table_type: v.table_type as ExecutionRecord["table_type"],
    ...(v.sourceLabel !== undefined ? { sourceLabel: v.sourceLabel as string } : {}),
    ...(v.finishedAt !== undefined ? { finishedAt: v.finishedAt as string } : {}), ...(v.durationMs !== undefined ? { durationMs: Number(v.durationMs) } : {}), ...(v.total_rows !== undefined ? { total_rows: Number(v.total_rows) } : {}) };
}
export function persistedSession(state: PipelineState) {
  const empty = new CredentialStore();
  return { schemaVersion: 1, source: state.source ? parseSource(state.source, empty) : null, recipe: state.recipe.map(s => parseStep(s, empty)), revision: state.revision,
    target: state.target ? parseTarget(state.target, empty) : null, loadConfig: parseLoadConfig(state.loadConfig), history: state.history.slice(-50).map(record) };
}
export function persistSession(storage: StoragePort | null, state: PipelineState): string | null {
  // Preserve unreadable history until the separate, confirmed clearHistory action.
  // The provider displays the recovery flag; the usable pipeline stays in memory.
  if (state.historyRecoveryRequired) return null;
  try { if (!storage) throw new Error(); storage.setItem(SESSION_KEY, JSON.stringify(persistedSession(state))); return null; }
  catch { return "No se pudo guardar la sesión; los cambios se conservan en memoria y no se restaurarán tras recarga."; }
}
function readCurrent(v: unknown, store: CredentialStore): PipelineState {
  check(object(v) && v.schemaVersion === 1 && Array.isArray(v.recipe) && Number.isInteger(v.revision) && Number(v.revision) >= 0);
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
  return { ...initialState, hydrationStatus: source ? "ready" : "empty", source, recipe, revision: Number(v.revision), history, historyRecoveryRequired,
    target: v.target === null ? null : parseTarget(v.target, store), loadConfig: parseLoadConfig(v.loadConfig) };
}
function clearLegacy(storage: StoragePort): string | null {
  let failed = false;
  for (const key of legacyKeys) { try { storage.removeItem(key); if (storage.getItem(key) !== null) failed = true; } catch { failed = true; } }
  return failed ? "No se pudo confirmar la limpieza de los datos previos del navegador." : null;
}
export function hydrateSession(storage: StoragePort | null, store: CredentialStore): PipelineState {
  if (!storage) return { ...initialState, hydrationStatus: "recovered", warning: "Storage no disponible; la sesión se conserva solo en memoria." };
  let currentInvalid = false;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw !== null) {
      try { const state = readCurrent(JSON.parse(raw) as unknown, store); const warning = clearLegacy(storage); return { ...state, warning }; }
      catch { currentInvalid = true; }
    }
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
