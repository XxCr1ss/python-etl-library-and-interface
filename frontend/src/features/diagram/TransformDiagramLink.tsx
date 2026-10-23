"use client";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { connectionFromSource } from "./connectionIdentity";
import { OpenDiagramLink } from "./OpenDiagramLink";

export function TransformDiagramLink() {
  const session = usePipelineSession();
  const source = session.state.source;
  const connection = source && connectionFromSource(source, session.credentials);
  const useAgent = source?.type === "database" && !!source.use_agent;
  const agentId = connection?.connection_id ? connection.runtime_agent_id : connection?.agent_id;
  const agent = useAgentStatus(useAgent, agentId || "");
  if (source?.type !== "database") return null;
  const disabled = !connection || (useAgent && agent.status !== "connected") || session.state.recoveryRequired || session.state.execution?.status === "running";
  return <OpenDiagramLink connection={connection} disabled={disabled}
    reason={!connection ? "Recupera las credenciales del origen para abrir el diagrama." : useAgent && agent.status !== "connected" ? "Comprueba la conexión del agente antes de abrir el diagrama." : ""} />;
}
