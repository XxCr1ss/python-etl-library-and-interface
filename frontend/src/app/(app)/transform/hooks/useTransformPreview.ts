"use client";
import { useCallback, useEffect, useRef } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import type { PreviewResponse, SourceDescriptor } from "@/types/etl";

/** The provider validates both revision and request ID; abort also guards unmounts. */
export function useTransformPreview() {
  const session = usePipelineSession();
  const { canTransform, runPreview, state: { revision, source, preview } } = session;
  const previous = useRef<{ source: SourceDescriptor; data: PreviewResponse }>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const controller = useRef<AbortController>();
  const lastSource = useRef<SourceDescriptor | null>(null);
  if (preview.status === "success" && preview.data && source) previous.current = { source, data: preview.data };
  const stop = useCallback(() => { clearTimeout(timer.current); controller.current?.abort(); }, []);
  const request = useCallback(() => {
    stop(); const abort = new AbortController(); controller.current = abort;
    void runPreview(10, abort.signal);
  }, [runPreview, stop]);
  useEffect(() => {
    stop(); if (!canTransform) return;
    const initial = lastSource.current !== source; lastSource.current = source;
    timer.current = setTimeout(request, initial ? 0 : 250);
    return stop;
  }, [canTransform, revision, source, request, stop]);
  return { ...session, refresh: request, displayData: preview.data ?? (previous.current?.source === source ? previous.current.data : undefined),
    stale: preview.status !== "success" || preview.revision !== revision };
}
