"use client";
import { useEffect, useState } from "react";
import { getAgentStatus } from "@/services/extractApi";

export type AgentStatus = "idle" | "checking" | "connected" | "disconnected" | "error";
// ID supplied by the session, whose sole identity adapter is agentIdentity.
export function useAgentStatus(enabled: boolean, agentId: string) {
  const [state, setState] = useState<{ status: AgentStatus; error: string | null; connectionId?: string | null }>({ status: "idle", error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !agentId) { setState({ status: "idle", error: null }); return; }
    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    setState({ status: "checking", error: null });
    async function check() {
      if (disposed || document.hidden) return;
      const version = ++generation;
      controller = new AbortController();
      try {
        const data = await getAgentStatus(agentId, controller.signal);
        if (!disposed && version === generation) setState({ status: data.connected ? "connected" : "disconnected", error: null, connectionId: data.connection_id });
      } catch (error) {
        if (!disposed && version === generation) setState({ status: "error", error: error instanceof Error ? error.message : "No se pudo consultar el agente." });
      } finally {
        if (!disposed && version === generation && !document.hidden) timer = setTimeout(check, 3000);
      }
    }
    function visibility() {
      generation++; clearTimeout(timer); controller?.abort();
      setState(previous => ({ ...previous, status: "checking", error: null }));
      if (!document.hidden) void check();
    }
    void check(); document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; generation++; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, agentId, retry]);
  return { ...state, retry: () => setRetry(value => value + 1) };
}
