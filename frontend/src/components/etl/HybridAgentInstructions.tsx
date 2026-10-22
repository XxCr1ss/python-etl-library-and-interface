"use client";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/services/apiClient";
import { Alert, Button } from "@/components/ui";
import type { AgentStatus } from "@/hooks/useAgentStatus";
import { AgentPairing } from "./AgentPairing";

export const agentBackendUrl = API_URL.replace(/\/api\/v1$/, "");
export const agentSocketUrl = `${agentBackendUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:")}/api/v1/ws/agent/`;
const statusLabels: Record<AgentStatus, string> = { idle: "Esperando ID del agente", checking: "Comprobando agente…", connected: "Agente conectado", disconnected: "Agente desconectado", error: "No se pudo consultar el agente" };
export function HybridAgentInstructions({ agentId, status, error, onRetry, allowLoad = false }: {
  agentId: string; status: AgentStatus; error: string | null; onRetry: () => void; allowLoad?: boolean;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Desde la raíz del proyecto: python etl_agent.py${allowLoad ? " --allow-load" : ""}\nURL del backend: ${agentBackendUrl}\nIdentificador de agente: ${agentId}`);
      if (mounted.current) setFeedback("Instrucciones copiadas.");
    } catch { if (mounted.current) setFeedback("No se pudo copiar. Selecciona y copia las instrucciones manualmente."); }
  }
  return <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-4 text-sm text-content">
    <Alert title={statusLabels[status]} tone={status === "connected" ? "success" : status === "error" ? "error" : "info"}>
      {error || "El agente delega extracción y, al habilitarla, carga local. Su ID es un identificador, no un token de autenticación."}
    </Alert>
    <p>Desde la raíz del proyecto, ejecuta <code>python etl_agent.py{allowLoad ? " --allow-load" : ""}</code>. El programa solicita estos valores interactivamente:</p>
    {allowLoad && <p>Usa un agente actualizado. La opción --allow-load permite escrituras mientras el agente está conectado; úsala en tu entorno controlado. Las transformaciones se ejecutan en el servidor.</p>}
    <dl className="space-y-2 break-all"><dt className="font-semibold">URL del backend (sin /api/v1)</dt><dd>{agentBackendUrl}</dd>
      <dt className="font-semibold">Identificador de agente</dt><dd>{agentId || "Preparando ID…"}</dd></dl>
    <p className="break-all text-content-muted">Conexión WebSocket: {agentSocketUrl}{encodeURIComponent(agentId)}</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!agentId} onClick={() => void copy()}>Copiar instrucciones</Button>
      <Button variant="outline" onClick={onRetry}>Reintentar estado del agente</Button></div>
    {feedback && <p role="status">{feedback}</p>}
    <AgentPairing agentId={agentId} connected={status === "connected"} />
  </div>;
}
