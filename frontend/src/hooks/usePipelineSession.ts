"use client";
import { useContext, useEffect } from "react";
import { PipelineContext } from "@/state/PipelineProvider";
export function usePipelineSession() {
  const session = useContext(PipelineContext);
  if (!session) throw new Error("usePipelineSession requiere PipelineProvider dentro del layout de la aplicación.");
  return session;
}
export function usePipelinePreview(limit: number) {
  const session = usePipelineSession();
  const { canTransform, runPreview, state: { revision } } = session;
  useEffect(() => {
    if (!canTransform) return;
    const controller = new AbortController(); void runPreview(limit, controller.signal);
    return () => controller.abort();
  }, [canTransform, revision, limit, runPreview]);
  return session;
}
