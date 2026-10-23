"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { CredentialStore } from "@/state/credentialStore";
import { targetDto } from "@/services/etlSerializers";
import { ApiError, publicMessage } from "@/services/apiClient";
import { detailWarehouse, exportWarehouse, getWarehouseCatalog, queryWarehouse, saveWarehouseReport } from "@/services/warehouseApi";
import type { Catalog, Connection, DetailRequest, DetailResult, Drilldown, ExportSpec, Projection, QueryResult, WarehouseQuery } from "@/types/warehouse";
import type { AnalysisResult, AnalysisSpec } from "@/types/analysis";
import { analyzeWarehouse, reportWarehouse } from "@/services/analysisApi";

const initialConnection: Omit<Connection, "password"> = { db_type: "postgresql", host: "localhost", port: 5432, database: "", user: "", use_agent: false, agent_id: "" };
export const blankQuery = (base_table_id: string): WarehouseQuery => ({ base_table_id, joins: [], filters: [], metrics: [], dimensions: [], order_by: [], limit: 20 });
export const selectionOf = (q: WarehouseQuery) => ({ base_table_id: q.base_table_id, joins: q.joins, filters: q.filters });

function useWarehouseCore() {
  const pipeline = usePipelineSession();
  const [credentials] = useState(() => new CredentialStore());
  const [connection, setConnection] = useState(initialConnection);
  const [passwordProvided, setPasswordProvided] = useState(false);
  const [copied, setCopied] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<WarehouseQuery | null>(null);
  const [applied, setApplied] = useState<WarehouseQuery | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [detailRequest, setDetailRequest] = useState<DetailRequest | null>(null);
  const [detailColumns, setDetailColumns] = useState<Projection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisSpec | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analysisApplied, setAnalysisApplied] = useState<AnalysisSpec[]>([]);
  const sequence = useRef(0), controller = useRef<AbortController | null>(null), inFlight = useRef(false);
  const agentId = connection.agent_id || pipeline.agentId;
  const agent = useAgentStatus(!!connection.use_agent, agentId);
  const previousAgent = useRef<{ status: string; connectionId?: string | null }>({ status: "idle" });
  const dirty = !applied || JSON.stringify(applied) !== JSON.stringify(draft);

  const cancel = useCallback(() => {
    sequence.current++; controller.current?.abort(); controller.current = null;
    inFlight.current = false; setBusy(null);
  }, []);
  const invalidate = useCallback(() => {
    cancel(); setCatalog(null); setDraft(null); setApplied(null); setResult(null);
    setDetail(null); setDetailRequest(null); setDetailColumns([]); setError(null); setNotice(null);
    setAnalysisDraft(null); setAnalysisResults([]); setAnalysisApplied([]);
  }, [cancel]);
  const disconnect = useCallback(() => {
    invalidate(); credentials.clear(); setPasswordProvided(false); setCopied(false); setConnection(initialConnection);
  }, [credentials, invalidate]);
  const disposeRequests = useCallback(() => { sequence.current++; controller.current?.abort(); }, []);
  useEffect(() => {
    window.addEventListener("etl:session-reset", disconnect);
    return () => { window.removeEventListener("etl:session-reset", disconnect); credentials.clear(); disposeRequests(); };
  }, [disconnect, credentials, disposeRequests]);
  useEffect(() => {
    const previous = previousAgent.current;
    // Visibility probes briefly enter checking. Keep the last confirmed generation
    // so a reconnect while the tab was hidden cannot preserve a stale catalog.
    if (agent.status !== "checking" && agent.status !== "idle") previousAgent.current = { status: agent.status, connectionId: agent.connectionId };
    if (catalog && connection.use_agent && previous.status === "connected" &&
        (["disconnected", "error"].includes(agent.status) || (agent.status === "connected" && previous.connectionId !== agent.connectionId))) {
      invalidate(); setError("La conexión del agente cambió. Vuelve a conectar y leer el catálogo.");
    }
  }, [agent.status, agent.connectionId, catalog, connection.use_agent, invalidate]);

  function updateConnection(patch: Partial<Connection>) {
    invalidate(); setCopied(false);
    const { password, ...fields } = patch;
    if (password !== undefined) { credentials.set("warehouse", password); setPasswordProvided(true); }
    setConnection(current => ({ ...current, ...fields }));
  }
  function dto(): Connection {
    const { use_agent, agent_id: configuredAgent, service_name, ...fields } = connection;
    return { ...fields, password: credentials.get("warehouse"), ...(service_name ? { service_name } : {}),
      ...(use_agent ? { use_agent: true, agent_id: configuredAgent || agentId } : {}) };
  }
  async function run<T>(label: string, work: (signal: AbortSignal) => Promise<T>, apply: (value: T) => void) {
    if (inFlight.current) return;
    const version = ++sequence.current;
    const aborter = new AbortController(); controller.current = aborter; inFlight.current = true;
    setBusy(label); setError(null); setNotice(null);
    try { const value = await work(aborter.signal); if (version === sequence.current) apply(value); }
    catch (e) {
      if (version === sequence.current && !(e instanceof ApiError && e.kind === "aborted") && !aborter.signal.aborted)
        setError(publicMessage(e instanceof Error ? e.message : null, "No se pudo completar la operación.", credentials.has("warehouse") ? [credentials.get("warehouse")] : []));
    } finally { if (version === sequence.current) { inFlight.current = false; setBusy(null); controller.current = null; } }
  }
  function connect() {
    if (!passwordProvided || !connection.host.trim() || !connection.database.trim() || !connection.user.trim()) { setError("Completa la conexión y proporciona una contraseña, incluso si es vacía."); return; }
    if (connection.use_agent && agent.status !== "connected") { setError("Conecta el agente antes de consultar el catálogo."); return; }
    setResult(null); setApplied(null); setDetail(null); setDetailRequest(null); setCatalog(null); setDraft(null);
    return run("Leyendo catálogo…", signal => getWarehouseCatalog(dto(), signal), value => {
      setCatalog(value); setDraft(value.tables.length ? { ...blankQuery(value.tables[0].table_id), limit: Math.min(20, value.capabilities.effective_limits.groups) } : null);
      setNotice("Catálogo de la bodega actualizado. Configura tu consulta.");
    });
  }
  function copyTarget() {
    if (!pipeline.state.target) return;
    try {
      const target = targetDto(pipeline.state.target, pipeline.credentials);
      if (target.password === undefined) throw new Error("Usa una conexión manual de lectura en Bodega de datos.");
      invalidate(); const { password, ...fields } = target;
      credentials.set("warehouse", password); setPasswordProvided(true);
      setConnection({ ...fields, port: fields.port ?? { postgresql: 5432, mysql: 3306, oracle: 1521 }[fields.db_type] }); setCopied(true);
      setNotice("Conexión copiada de Carga. Conecta para verificar permisos de lectura.");
    } catch { setError("Reingresa las credenciales del destino o configura una conexión propia."); }
  }
  function changeDraft(query: WarehouseQuery) {
    if (inFlight.current) return;
    setDraft(query); setDetail(null); setDetailRequest(null); setError(null); setNotice(null);
  }
  function consult() {
    if (!draft || !draft.metrics.length || !catalog) return;
    const query = structuredClone(draft);
    setResult(null); setApplied(null); setDetail(null); setDetailRequest(null);
    return run("Consultando bodega…", signal => queryWarehouse(dto(), query, signal), value => {
      setApplied(query); setResult(value);
      setDetailColumns((catalog.tables.find(t => t.table_id === query.base_table_id)?.columns || []).filter(c => c.logical_type !== "unsupported").slice(0, Math.min(8, catalog.capabilities.effective_limits.columns)).map((c, i) => ({ id: `col_${i}`, field: { relation: "base", column: c.name } })));
    });
  }
  function loadDetail(drilldown: Drilldown[] = detailRequest?.drilldown || [], page = 1, include_total = false, columns = detailColumns) {
    if (!applied || dirty || !columns.length) return;
    const request: DetailRequest = { selection: selectionOf(applied), columns, drilldown, order_by: [], page, page_size: Math.min(50, catalog?.capabilities.effective_limits.page_size || 50), include_total };
    return run("Consultando detalle…", signal => detailWarehouse(dto(), request, signal), value => { setDetail(value); setDetailRequest(request); });
  }
  function changeDetailColumns(columns: Projection[]) { if (inFlight.current) return; setDetailColumns(columns); setDetail(null); setDetailRequest(null); }
  function exportReport(mode: "aggregate" | "detail" | "sample", format: "csv" | "json") {
    if (!applied || dirty || !catalog) return;
    let spec: ExportSpec;
    if (mode === "aggregate") spec = { mode, format, query: applied };
    else {
      if (!detailRequest) return;
      const { selection, columns, drilldown, order_by } = detailRequest;
      spec = mode === "sample" ? { mode, format, selection, columns, drilldown, order_by, limit: Math.min(100, catalog.capabilities.effective_limits.page_size) } :
        { mode, format, selection, columns, drilldown, order_by, max_rows: catalog.capabilities.effective_limits.export_rows };
    }
    return run("Preparando reporte…", signal => exportWarehouse(dto(), spec, signal), blob => { saveWarehouseReport(blob, format); setNotice("Reporte descargado con datos consultados de nuevo en la bodega."); });
  }
  function consultAnalysis(analysis: AnalysisSpec) {
    const captured = structuredClone(analysis);
    return run("Calculando análisis…", signal => analyzeWarehouse(dto(), captured, signal), value => { setAnalysisResults([value]); setAnalysisApplied([captured]); });
  }
  function consultAnalyses(analyses: AnalysisSpec[]) {
    const captured = structuredClone(analyses);
    return run("Calculando paneles en una operación de lectura…", signal => reportWarehouse(dto(), captured, signal), value => { setAnalysisResults(value.results); setAnalysisApplied(captured); });
  }
  return { connection, passwordProvided, copied, catalog, draft, applied, result, detail, detailRequest, detailColumns,
    analysisDraft, analysisResults, analysisApplied, setAnalysisDraft, consultAnalysis, consultAnalyses,
    busy, error, notice, dirty, agent, agentId, hasConnection: passwordProvided || !!catalog,
    canCopy: !!pipeline.state.target && pipeline.credentials.has(pipeline.state.target.credentialRef),
    updateConnection, disconnect, connect, copyTarget, changeDraft, consult, loadDetail, changeDetailColumns, exportReport, cancel,
    discardDraft: () => { if (applied) setDraft(structuredClone(applied)); } };
}

export const WarehouseContext = createContext<ReturnType<typeof useWarehouseCore> | null>(null);
export function WarehouseSessionProvider({ children }: { children: ReactNode }) {
  const session = useWarehouseCore();
  return <WarehouseContext.Provider value={session}>{children}</WarehouseContext.Provider>;
}
export function useWarehouse() { const value = useContext(WarehouseContext); if (!value) throw new Error("Se requiere una sesión de bodega."); return value; }
