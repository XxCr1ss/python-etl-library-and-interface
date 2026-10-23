"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { CredentialStore } from "@/state/credentialStore";
import { sourceDto, stepDto, targetDto } from "@/services/etlSerializers";
import { request, object } from "@/services/apiClient";
import { requireContract as check } from "@/services/responseValidators";
import type { SourceDescriptor, TargetDescriptor } from "@/types/etl";
import type { JobDefinition, JobNode, RunManifest, JobRunSummary } from "@/types/jobs";

export function manifestResponse(v: unknown): RunManifest {
  check(object(v) && v.version === 1 && typeof v.run_id === "string" && ["accepted", "validating", "running", "validated", "success", "failed", "partial"].includes(String(v.status)) && typeof v.preview_only === "boolean" && object(v.nodes));
  check(Object.values(v.nodes).every(n => object(n) && ["pending", "running", "validated", "success", "failed", "blocked", "unknown"].includes(String(n.status)) && [n.input_rows, n.output_rows, n.total_rows].every(x => x === undefined || x === null || Number.isSafeInteger(x) && Number(x) >= 0)));
  return v as unknown as RunManifest;
}

function useJobCore() {
  const pipeline = usePipelineSession();
  const [credentials] = useState(() => new CredentialStore());
  const [definition, setDefinition] = useState<JobDefinition>({ version: 1, title: "Trabajo ETL", nodes: [] });
  const [sources, setSources] = useState<Record<string, SourceDescriptor>>({}), [targets, setTargets] = useState<Record<string, TargetDescriptor>>({});
  const [manifest, setManifest] = useState<RunManifest | null>(null), [runId, setRunId] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [history, setHistory] = useState<JobRunSummary[]>([]);
  const sequence = useRef(0);
  const inFlight = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; credentials.clear(); }; }, [credentials]);
  useEffect(() => {
    const clear = () => { credentials.clear(); setSources({}); setTargets({}); setHistory([]); if (!inFlight.current) { sequence.current++; setDefinition({ version: 1, title: "Trabajo ETL", nodes: [] }); setManifest(null); setRunId(""); } };
    window.addEventListener("etl:session-reset", clear);
    return () => window.removeEventListener("etl:session-reset", clear);
  }, [credentials]);
  function captureDescriptor<T extends SourceDescriptor | TargetDescriptor>(value: T): T {
    if (!("credentialRef" in value)) return structuredClone(value);
    const ref = `job_${crypto.randomUUID()}`;
    if (pipeline.credentials.has(value.credentialRef)) credentials.set(ref, pipeline.credentials.get(value.credentialRef));
    return { ...structuredClone(value), credentialRef: ref };
  }
  function capture() {
    if (inFlight.current) return;
    const { state } = pipeline;
    if (!state.source || !state.target || !state.loadConfig.schema_spec || !pipeline.isReadyForLoad) { setError("Prepara un origen, una receta validada, un destino y un esquema explícito en Carga antes de agregar la salida."); return; }
    if (state.loadConfig.if_exists === "schema_only") { setError("Prepara la estructura por separado en Carga; los nodos del trabajo requieren un modo de carga de datos."); return; }
    const id = `node_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const source_ref = `source_${id}`;
    const incoming = { ...sources, [source_ref]: captureDescriptor(state.source) };
    const nextTargets = { ...targets };
    // Snapshot credentials into an independent in-memory owner before the pipeline changes.
    const targetIdentity = (t: TargetDescriptor) => JSON.stringify([t.db_type, t.host, t.port, t.database, t.user, t.service_name, t.use_agent, t.agent_id, t.savedConnection]);
    const target_ref = Object.keys(nextTargets).find(k => targetIdentity(nextTargets[k]) === targetIdentity(state.target!)) || `target_${id}`;
    nextTargets[target_ref] = captureDescriptor(state.target);
    const recipe = state.recipe.map((step, i) => {
      const dto = stepDto(step, pipeline.credentials);
      for (const key of ["right_source", "secondary_source"] as const) {
        if (key in step.params) {
          const alias = `source_${id}_${i}`;
          incoming[alias] = captureDescriptor((step.params as unknown as Record<string, SourceDescriptor>)[key]);
          dto.params[key] = { source_ref: alias };
        }
      }
      return dto;
    });
    const node: JobNode = { id, source_ref, input_node: null, depends_on: [], recipe, checks: [], preserve_rows: false, preserve_sums: [], output: { target_ref, table_name: state.loadConfig.table_name, table_type: state.loadConfig.table_type, if_exists: state.loadConfig.if_exists || "fail", schema_spec: state.loadConfig.schema_spec } };
    setSources(incoming); setTargets(nextTargets); setDefinition(d => ({ ...d, nodes: [...d.nodes, node] })); setManifest(null); setError("");
  }
  async function run(preview_only: boolean, confirm_destructive = false, resume_run_id?: string, reviewed_unknown = false) {
    if (inFlight.current) return;
    const id = crypto.randomUUID();
    const version = ++sequence.current;
    inFlight.current = true; setBusy(true); setRunId(id); setError(""); setManifest(null);
    try {
      const usedSources = new Set(definition.nodes.flatMap(n => [n.source_ref, ...n.recipe.flatMap(s => [s.params.right_source, s.params.secondary_source].flatMap(v => object(v) && typeof v.source_ref === "string" ? [v.source_ref] : []))]).filter((v): v is string => !!v));
      const usedTargets = new Set(definition.nodes.flatMap(n => n.output ? [n.output.target_ref] : []));
      const runtimeSources = Object.fromEntries(Array.from(usedSources).map(alias => { if (!sources[alias]) throw new Error(`Vincula el origen ${alias} antes de ejecutar.`); return [alias, sourceDto(sources[alias], credentials)]; }));
      const runtimeTargets = Object.fromEntries(Array.from(usedTargets).map(alias => { if (!targets[alias]) throw new Error(`Vincula el destino ${alias} antes de ejecutar.`); return [alias, targetDto(targets[alias], credentials)]; }));
      const value = await request("jobs/execute", manifestResponse, { definition, sources: runtimeSources, targets: runtimeTargets, run_id: id, preview_only, confirm_destructive, reviewed_unknown, ...(resume_run_id ? { resume_run_id } : {}) });
      if (mounted.current && version === sequence.current) setManifest(value);
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "No se confirmó el trabajo. Consulta el estado antes de repetir."); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function status(selected = runId) { if (!selected || inFlight.current) return; const version = ++sequence.current; try { const value = await request(`jobs/${selected}`, manifestResponse); if (version === sequence.current && mounted.current) { setRunId(selected); setManifest(value); setError(""); } } catch (e) { if (version === sequence.current && mounted.current) setError(e instanceof Error ? e.message : "No se pudo consultar el estado."); } }
  async function refreshHistory() { const version = sequence.current; try { const value = await request("jobs", v => { check(object(v) && v.version === 1 && Array.isArray(v.runs) && v.runs.length <= 100 && v.runs.every(r => object(r) && typeof r.run_id === "string" && typeof r.status === "string")); return v.runs as JobRunSummary[]; }); if (mounted.current && version === sequence.current) setHistory(value); } catch { if (mounted.current && version === sequence.current) setError("No se pudo consultar el historial de trabajos."); } }
  return { definition, sources, targets, manifest, runId, busy, error, capture, run, status, history, refreshHistory,
    change: (d: JobDefinition) => { if (!inFlight.current) { setDefinition(d); setError(""); } },
    bindSource: (alias: string) => { if (pipeline.state.source && !inFlight.current) { const source = captureDescriptor(pipeline.state.source); setSources(s => ({ ...s, [alias]: source })); } },
    bindTarget: (alias: string) => { if (pipeline.state.target && !inFlight.current) { const target = captureDescriptor(pipeline.state.target); setTargets(s => ({ ...s, [alias]: target })); } } };
}
const Context = createContext<ReturnType<typeof useJobCore> | null>(null);
export function JobSessionProvider({ children }: { children: ReactNode }) { const value = useJobCore(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useJobs() { const value = useContext(Context); if (!value) throw new Error("Falta la sesión de trabajos."); return value; }
export const useOptionalJobs = () => useContext(Context);
