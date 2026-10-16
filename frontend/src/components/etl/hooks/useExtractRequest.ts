"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type ExtractStatus = "idle" | "pending" | "success" | "error";
interface RequestState<T> {
  status: ExtractStatus;
  revision: number;
  requestId: number;
  result: T | null;
  error: string | null;
}

// The revision and ID checks also protect against transports that ignore abort.
export function useExtractRequest<T>(active: boolean) {
  const revision = useRef(0);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const enabled = useRef(active);
  enabled.current = active;
  const [state, setState] = useState<RequestState<T>>({ status: "idle", revision: 0, requestId: 0, result: null, error: null });
  const cancel = useCallback(() => {
    revision.current++;
    controller.current?.abort(); controller.current = null;
  }, []);
  const invalidate = useCallback((error: string | null = null) => {
    cancel();
    setState({ status: error ? "error" : "idle", revision: revision.current, requestId: requestId.current, result: null, error });
  }, [cancel]);
  useEffect(() => {
    if (!active) invalidate();
    return cancel;
  }, [active, invalidate, cancel]);
  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<T>) => {
    if (!enabled.current || controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    const capturedRevision = revision.current;
    const id = ++requestId.current;
    const current = () => enabled.current && !abort.signal.aborted && capturedRevision === revision.current && id === requestId.current;
    setState({ status: "pending", revision: capturedRevision, requestId: id, result: null, error: null });
    try {
      const result = await operation(abort.signal);
      if (current()) setState({ status: "success", revision: capturedRevision, requestId: id, result, error: null });
    } catch (error) {
      if (current()) setState({ status: "error", revision: capturedRevision, requestId: id, result: null, error: error instanceof Error ? error.message : "No se pudo consultar el origen." });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, []);
  return { ...state, invalidate, run };
}
