import { Alert, Button, Select } from "@/components/ui";
import { DatabaseConnectionFields } from "@/components/etl/DatabaseConnectionFields";
import { HybridAgentInstructions } from "@/components/etl/HybridAgentInstructions";
import type { useDatabaseExtract } from "../hooks/useDatabaseExtract";

export function DatabaseTab({ model, agentId }: { model: ReturnType<typeof useDatabaseExtract>; agentId: string }) {
  return <div className="space-y-5">
    <form noValidate className="space-y-5" onSubmit={event => { event.preventDefault(); model.connect(); }}>
      <DatabaseConnectionFields value={model.draft} errors={model.errors} onChange={model.edit} />
      <label className="flex items-center gap-2 text-sm text-content"><input type="checkbox" checked={model.draft.use_agent}
        onChange={e => model.edit({ use_agent: e.target.checked })} />Usar agente local híbrido</label>
      {model.draft.use_agent && <HybridAgentInstructions agentId={agentId} {...model.agent} onRetry={model.agent.retry} />}
      <Button type="submit" disabled={!model.agentReady} isLoading={model.connection.status === "pending"}>Conectar y listar tablas</Button>
      {!model.agentReady && <p className="text-sm text-content-muted">Conecta el agente y comprueba su estado para iniciar la extracción.</p>}
    </form>
    {model.connection.error && <Alert tone="error" title="No se pudo conectar">{model.connection.error}</Alert>}
    {model.connection.status === "success" && <>
      <p role="status" className="text-sm text-success">Conexión comprobada. {model.connection.result!.tables.length} tablas disponibles.</p>
      {model.connection.result!.tables.length === 0 ? <p className="text-content-muted">La conexión no devolvió tablas. Revisa la base de datos y sus permisos.</p>
        : <Select label="Tabla de origen" value={model.table} onChange={e => model.selectTable(e.target.value)}>
          <option value="">Selecciona una tabla</option>{model.connection.result!.tables.map(name => <option key={name} value={name}>{name}</option>)}
        </Select>}
    </>}
  </div>;
}
