let fallbackId: string | undefined;
export function getAgentIdentity(): { id: string; warning?: string } {
  try {
    const existing = window.localStorage.getItem("etl_agent_id");
    if (existing) return { id: existing };
    const id = fallbackId || `agent-${crypto.randomUUID()}`;
    window.localStorage.setItem("etl_agent_id", id); return { id };
  } catch { fallbackId ||= `agent-${crypto.randomUUID()}`; return { id: fallbackId, warning: "No se pudo conservar el ID del agente tras recarga." }; }
}
