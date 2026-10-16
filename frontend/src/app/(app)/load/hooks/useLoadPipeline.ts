"use client";
import { useEffect, useRef, useState } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import type { LoadApproval } from "@/state/PipelineProvider";

export function useLoadPipeline() {
  const session = usePipelineSession();
  const { state, canTransform, runPreview } = session;
  const [approval, setApproval] = useState<LoadApproval | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewedUnknown, setReviewedUnknown] = useState(false);
  const submitting = useRef(false);
  const { revision, execution } = state;
  useEffect(() => { setReviewedUnknown(false); }, [revision, state.targetVersion, state.loadVersion]);
  // Reuse Transform's current preview. Direct visits/reloads validate once; failures wait for explicit retry.
  useEffect(() => {
    if (!canTransform) return;
    const controller = new AbortController(); void runPreview(1, controller.signal, true);
    return () => controller.abort();
  }, [canTransform, revision, runPreview]);
  const unknown = execution?.status === "unknown" || state.history.some(r => r.status === "unknown" && r.table_name === state.loadConfig.table_name);
  const begin = async (confirmed?: LoadApproval) => {
    if (submitting.current) return;
    setError(null);
    if (!session.canExecuteLoad) { setApproval(null); setError("Revisa fuente, credenciales, preview, destino, tabla y FK antes de ejecutar."); return; }
    if (unknown && !reviewedUnknown) { setError("Confirma que revisaste la tabla destino antes de repetir."); return; }
    const snapshot: LoadApproval = { revision: state.revision, targetVersion: state.targetVersion, loadVersion: state.loadVersion,
      previewRequestId: state.preview.requestId, config: state.loadConfig, reviewedUnknown };
    if (state.loadConfig.if_exists === "replace" && !confirmed) { setApproval(snapshot); return; }
    submitting.current = true; setApproval(null);
    try { await session.runLoad(confirmed || snapshot); setReviewedUnknown(false); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar la carga."); }
    finally { submitting.current = false; }
  };
  return { session, approval, error, unknown, reviewedUnknown, setReviewedUnknown,
    phase: approval ? "validating" : execution?.status === "running" ? "submitting" : error ? "error" : execution?.status || "idle",
    begin, cancel: () => setApproval(null), confirm: () => begin(approval || undefined) };
}
