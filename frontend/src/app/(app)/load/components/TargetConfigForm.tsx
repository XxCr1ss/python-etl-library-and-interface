"use client";
import { DatabaseConnectionFields } from "@/components/etl/DatabaseConnectionFields";
import { Button } from "@/components/ui";
import { HybridAgentInstructions } from "@/components/etl/HybridAgentInstructions";
import { SavedConnectionsSelector } from "@/components/etl/SavedConnectionsSelector";
import { SaveConnectionInSitu } from "@/components/etl/SaveConnectionInSitu";
import type { useTargetConnection } from "../hooks/useTargetConnection";

export default function TargetConfigForm({ connection }: { connection: ReturnType<typeof useTargetConnection> }) {
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-4" aria-labelledby="target-title">
    <h2 id="target-title" className="text-lg font-bold">Conexión a la Bodega de Datos</h2>
    <p className="text-sm text-content-muted">Prueba el destino después de cada cambio de conexión.</p>
    <SavedConnectionsSelector type="target" selected={connection.draft.savedConnection?.connection_id} onSelect={connection.selectSaved} disabled={connection.testing} />
    <form noValidate onSubmit={e => { e.preventDefault(); void connection.test(); }} className="space-y-4">
      <DatabaseConnectionFields value={connection.draft} onChange={connection.change} errors={connection.errors} />
      <label className="flex items-center gap-2 text-sm text-content">
        <input type="checkbox" checked={connection.draft.use_agent} onChange={e => connection.change({ use_agent: e.target.checked })} />
        Usar agente local híbrido
      </label>
      {connection.draft.use_agent && <>
        <p className="text-sm text-content-muted">El host y puerto del destino se resuelven desde la máquina del agente. Prueba de nuevo después de reconectarlo.</p>
        <HybridAgentInstructions agentId={connection.agentId} status={connection.agent.status} error={connection.agent.error} onRetry={connection.agent.retry} allowLoad />
      </>}
      <Button type="submit" disabled={!connection.agentReady || (connection.draft.use_agent && !connection.agentId)} isLoading={connection.testing}>Probar Conexión Bodega</Button>
    </form>
    <p role="status" className={connection.connected ? "text-success" : "text-content-muted"}>
      {connection.connected ? "Conectado Correctamente" : "Conexión pendiente de prueba"}
    </p>
    {connection.message && <p role="alert" className="text-danger">{connection.message}</p>}
    {connection.connected && <SaveConnectionInSitu key={JSON.stringify([connection.draft.db_type, connection.draft.host, connection.draft.database, connection.draft.user])} draft={connection.draft} type="target" agentId={connection.agentId} />}
  </section>;
}
