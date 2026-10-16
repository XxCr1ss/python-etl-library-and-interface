"use client";
import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/services/apiClient";
import { requiredConnections, sourceDto, stepDto, targetDto } from "@/services/etlSerializers";
import { executeLoad, testTargetConnection } from "@/services/loadApi";
import { previewTransform } from "@/services/transformApi";
import type { LoadConfigDto, TargetConnectionDto, TransformStep } from "@/types/etl";
import { parseLoadConfig, parseSource, parseStep, parseTarget } from "@/types/etlValidation";
import { CredentialStore, newId } from "./credentialStore";
import { getAgentIdentity } from "./agentIdentity";
import { browserSessionStorage, hydrateSession, persistSession } from "./pipelineStorage";
import { initialState, pipelineReducer, type PipelineAction } from "./pipelineReducer";
import * as selectors from "./pipelineSelectors";
import { sourceLabel } from "./pipelineLabels";
import { loadConfigDto } from "./loadValidation";
import { unknownLoadMessage } from "./loadReport";

export interface LoadApproval {
  revision: number; targetVersion: number; loadVersion: number; previewRequestId?: string; config: LoadConfigDto;
  reviewedUnknown?: boolean;
}

function useSessionCore() {
  const [state, reactDispatch] = useReducer(pipelineReducer, initialState);
  const current = useRef(state);
  const [credentials] = useState(() => new CredentialStore());
  const [agentId, setAgentId] = useState("");
  const hydrated = useRef(false);
  const previewSequence = useRef(0);
  const loadInFlight = useRef(false);
  const targetTestSequence = useRef(0);
  const dispatch = useCallback((action: PipelineAction) => {
    current.current = pipelineReducer(current.current, action);
    reactDispatch(action);
  }, []);
  const editable = useCallback(() => current.current.hydrationStatus !== "hydrating" && !current.current.recoveryRequired && current.current.execution?.status !== "running", []);
  useEffect(() => {
    if (hydrated.current) return; hydrated.current = true;
    dispatch({ type: "hydrate", state: hydrateSession(browserSessionStorage(), credentials) });
    const identity = getAgentIdentity(); setAgentId(identity.id);
    if (identity.warning) dispatch({ type: "warning", message: [current.current.warning, identity.warning].filter(Boolean).join(" ") });
  }, [credentials, dispatch]);
  useEffect(() => {
    if (state.hydrationStatus === "hydrating" || state.recoveryRequired) return;
    credentials.retain(requiredConnections(state.source, state.recipe, state.target).map(x => x.credentialRef));
    const warning = persistSession(browserSessionStorage(), state);
    if (warning && !state.warning?.includes(warning)) dispatch({ type: "warning", message: [state.warning, warning].filter(Boolean).join(" ") });
  }, [state, credentials, dispatch]);
  useEffect(() => {
    if (state.execution?.status !== "running") return;
    const onExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onExit);
    return () => window.removeEventListener("beforeunload", onExit);
  }, [state.execution?.status]);
  const confirmSource = useCallback((input: unknown) => {
    if (!editable()) return false;
    const source = parseSource(input, credentials, true);
    dispatch({ type: "source", source }); return true;
  }, [credentials, dispatch, editable]);
  const addStep = useCallback((input: unknown) => { if (editable()) dispatch({ type: "addStep", step: parseStep(input, credentials, true) }); }, [credentials, dispatch, editable]);
  const transferCredentials = useCallback((recipe: TransformStep[], temporary?: CredentialStore) => {
    for (const { credentialRef } of requiredConnections(null, recipe)) {
      if (temporary?.has(credentialRef)) credentials.set(credentialRef, temporary.get(credentialRef));
    }
  }, [credentials]);
  const editStep = useCallback((input: unknown, temporary?: CredentialStore) => {
    if (!editable()) return;
    const step = parseStep(input, credentials); transferCredentials([step], temporary);
    dispatch({ type: "editStep", step });
  }, [credentials, dispatch, editable, transferCredentials]);
  const restoreRecipe = useCallback((recipe: TransformStep[], temporary: CredentialStore) => {
    if (!editable()) return;
    const clean = recipe.map(step => parseStep(step, credentials)); transferCredentials(clean, temporary);
    dispatch({ type: "replaceRecipe", recipe: clean });
  }, [credentials, dispatch, editable, transferCredentials]);
  const setTarget = useCallback((input: Omit<TargetConnectionDto, "password"> & { password?: string }) => {
    if (!editable()) return;
    const ref = current.current.target?.credentialRef || newId();
    const target = parseTarget({ ...input, credentialRef: ref }, credentials);
    if (typeof input.password === "string") credentials.set(ref, input.password);
    dispatch({ type: "target", target });
  }, [credentials, dispatch, editable]);
  const recoverCredentials = useCallback((entries: Record<string, string>) => {
    if (!editable()) return;
    const connections = requiredConnections(current.current.source, current.current.recipe, current.current.target);
    for (const [ref, value] of Object.entries(entries)) if (connections.some(x => x.credentialRef === ref)) credentials.set(ref, value);
    const affectsSource = requiredConnections(current.current.source, current.current.recipe).some(x => Object.hasOwn(entries, x.credentialRef));
    dispatch({ type: "credentials", affectsSource });
  }, [credentials, dispatch, editable]);
  const runPreview = useCallback(async (limit: number, signal?: AbortSignal, onlyIfPending = false) => {
    const snapshot = current.current;
    if (onlyIfPending && ["success", "error"].includes(snapshot.preview.status)) return;
    if (!selectors.canTransform(snapshot, credentials) || snapshot.execution?.status === "running") return;
    const requestId = `preview-${++previewSequence.current}`; const revision = snapshot.revision;
    dispatch({ type: "previewStart", requestId, revision });
    try {
      const data = await previewTransform({ source: sourceDto(snapshot.source!, credentials), steps: snapshot.recipe.map(s => stepDto(s, credentials)), limit }, signal);
      if (!signal?.aborted) dispatch({ type: "previewSuccess", revision, requestId, data });
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ApiError && error.kind === "aborted") return;
      dispatch({ type: "previewError", revision, requestId, error: error instanceof Error ? error.message : "No se pudo validar la preview." });
    }
  }, [credentials, dispatch]);
  const testTarget = useCallback(async () => {
    const snapshot = current.current;
    const requestId = ++targetTestSequence.current;
    if (!snapshot.target || !editable()) throw new Error("Configura el destino e ingresa su contraseña.");
    if (![snapshot.target.host, snapshot.target.database, snapshot.target.user].every(x => !!x.trim())) throw new Error("Completa host, base de datos y usuario del destino.");
    dispatch({ type: "targetChecked", version: snapshot.targetVersion, success: false });
    try {
      const response = await testTargetConnection(targetDto(snapshot.target, credentials));
      if (requestId === targetTestSequence.current) dispatch({ type: "targetChecked", version: snapshot.targetVersion, success: true });
      return response;
    } catch (error) {
      if (requestId === targetTestSequence.current) dispatch({ type: "targetChecked", version: snapshot.targetVersion, success: false });
      throw error;
    }
  }, [credentials, dispatch, editable]);
  const runLoad = useCallback(async (approval?: LoadApproval) => {
    const snapshot = current.current;
    if (loadInFlight.current || !selectors.canExecuteLoad(snapshot, credentials)) return;
    if (approval && (approval.revision !== snapshot.revision || approval.targetVersion !== snapshot.targetVersion ||
      approval.loadVersion !== snapshot.loadVersion || approval.previewRequestId !== snapshot.preview.requestId)) throw new Error("La configuración cambió. Revisa y confirma la carga otra vez.");
    if (snapshot.loadConfig.if_exists === "replace" && !approval) throw new Error("Confirma la tabla y el destino antes de reemplazar.");
    const unresolved = snapshot.execution?.status === "unknown" || snapshot.history.some(r => r.status === "unknown" && r.table_name === snapshot.loadConfig.table_name);
    if (unresolved && !approval?.reviewedUnknown) throw new Error(unknownLoadMessage);
    // Build the payload before recording a request that may reach the server.
    const payload = { source: sourceDto(snapshot.source!, credentials), recipe: snapshot.recipe.map(s => stepDto(s, credentials)),
      target_connection: targetDto(snapshot.target!, credentials), load_config: loadConfigDto(snapshot.loadConfig, snapshot.foreignKeys) };
    loadInFlight.current = true;
    const started = Date.now();
    const record = { id: newId(), revision: snapshot.revision, startedAt: new Date(started).toISOString(), status: "running" as const,
      sourceLabel: sourceLabel(snapshot.source),
      reportVersion: 1, if_exists: payload.load_config.if_exists,
      table_name: payload.load_config.table_name, table_type: payload.load_config.table_type };
    dispatch({ type: "executionStart", record });
    const warning = persistSession(browserSessionStorage(), current.current);
    if (warning) dispatch({ type: "warning", message: warning });
    try {
      const report = await executeLoad(payload);
      if (report.table_name !== record.table_name || report.table_type !== record.table_type) throw new ApiError("contract", "La respuesta no corresponde a la tabla y al tipo enviados.");
      dispatch({ type: "executionFinish", record: { ...record, status: "success", finishedAt: new Date().toISOString(), durationMs: Date.now() - started, total_rows: report.total_rows }, report });
    } catch (error) {
      const status = error instanceof ApiError && error.kind === "http" && error.status === 422 ? "error" : "unknown";
      const message = error instanceof Error ? error.message : "No se recibió una respuesta válida.";
      dispatch({ type: "executionFinish", record: { ...record, status, finishedAt: new Date().toISOString(), durationMs: Date.now() - started }, error: message });
    } finally { loadInFlight.current = false; }
  }, [credentials, dispatch]);
  const newLoad = useCallback(() => {
    if (!editable()) return;
    const target = current.current.target;
    if (target) credentials.delete(target.credentialRef);
    dispatch({ type: "clearReport" });
  }, [credentials, dispatch, editable]);
  const reset = useCallback(() => {
    if (current.current.execution?.status === "running" || current.current.hydrationStatus === "hydrating") return;
    credentials.clear(); dispatch({ type: "reset" });
  }, [credentials, dispatch]);
  const setLoadConfig = useCallback((config: LoadConfigDto) => { if (editable()) dispatch({ type: "loadConfig", config: parseLoadConfig(config) }); }, [dispatch, editable]);
  return useMemo(() => ({ state, credentials, agentId, dispatch, confirmSource, addStep, editStep, restoreRecipe, setTarget, recoverCredentials, runPreview, testTarget, runLoad, newLoad, reset, setLoadConfig,
    canTransform: selectors.canTransform(state, credentials), canVisitLoad: selectors.canVisitLoad(state), isReadyForLoad: selectors.isReadyForLoad(state, credentials), canExecuteLoad: selectors.canExecuteLoad(state, credentials) }),
  [state, credentials, agentId, dispatch, confirmSource, addStep, editStep, restoreRecipe, setTarget, recoverCredentials, runPreview, testTarget, runLoad, newLoad, reset, setLoadConfig]);
}
export const PipelineContext = createContext<ReturnType<typeof useSessionCore> | null>(null);
export function PipelineProvider({ children }: { children: ReactNode }) {
  const session = useSessionCore();
  return <PipelineContext.Provider value={session}>
    {session.state.warning && <div role="alert" className="p-3 bg-amber-50 text-amber-950 relative z-50">{session.state.warning}
      {session.state.recoveryRequired && <button className="ml-3 underline" onClick={session.reset}>Restablecer sesión</button>}
    </div>}
    {session.state.historyRecoveryRequired && <div role="alert" className="relative z-50 bg-warning-surface p-3 text-warning">
      No se pudo restaurar el historial de esta pestaña. El pipeline sigue disponible en memoria. Para volver a guardar cambios, revisa y borra el historial desde Dashboard; los datos guardados se conservan hasta confirmar.
    </div>}
    {session.state.execution?.status === "running" && <div role="status" className="border-b border-line bg-surface-muted p-3 text-content">
      Ejecutando pipeline · {session.state.execution.table_name}. Puedes navegar y volver a Carga para ver el resultado. Cerrar o recargar no garantiza cancelar la escritura.
    </div>}
    {children}
  </PipelineContext.Provider>;
}
