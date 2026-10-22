"use client";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Input, Select } from "@/components/ui";
import { HybridAgentInstructions } from "@/components/etl/HybridAgentInstructions";
import { useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import type { DatabaseType } from "@/types/etl";

export function WarehouseConnectionCard() {
  const w = useWarehouse();
  const c = w.connection;
  const [password, setPassword] = useState("");
  useEffect(() => { if (!w.passwordProvided || w.copied) setPassword(""); }, [w.passwordProvided, w.copied]);
  return <Card className="space-y-4" aria-label="Conexión a la bodega">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Conexión de lectura</h2>
      <Badge tone={w.catalog ? "success" : "neutral"}>{w.catalog ? `Activa · ${c.db_type} · ${c.use_agent ? "agente local" : "directa"}` : "Sin conexión verificada"}</Badge></div>
    <p className="text-sm text-content-muted">Consulta una bodega existente con un usuario de solo lectura. Las credenciales permanecen en memoria de esta pestaña; al recargar debes reingresarlas.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!w.canCopy || !!w.busy} onClick={w.copyTarget}>Usar destino de Carga</Button>
      <Button variant="ghost" disabled={!w.hasConnection} onClick={w.disconnect}>Desconectar bodega</Button></div>
    {w.copied && <Alert title="Conexión copiada de Carga">Los cambios posteriores en Carga se copian únicamente al pulsar de nuevo el botón.</Alert>}
    <details open={!w.catalog}><summary className="cursor-pointer font-semibold text-action">Configurar conexión</summary>
      <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); void w.connect(); }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Motor de bodega" value={c.db_type} onChange={e => { const db_type = e.target.value as DatabaseType; w.updateConnection({ db_type, port: { postgresql: 5432, mysql: 3306, oracle: 1521 }[db_type], service_name: null }); }}>
            <option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option value="oracle">Oracle</option></Select>
          <Input label="Host" required value={c.host} onChange={e => w.updateConnection({ host: e.target.value })} hint={c.use_agent ? "Dirección desde la máquina del agente." : "Dirección desde el backend."} />
          <Input label="Puerto" type="number" min={1} max={65535} required value={c.port ?? ""} onChange={e => w.updateConnection({ port: e.target.value ? Number(e.target.value) : null })} />
          <Input label="Base de datos" required value={c.database} onChange={e => w.updateConnection({ database: e.target.value })} />
          <Input label="Usuario" required autoComplete="off" value={c.user} onChange={e => w.updateConnection({ user: e.target.value })} />
          <Input label="Contraseña" type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); w.updateConnection({ password: e.target.value }); }} hint={w.passwordProvided ? "Credencial proporcionada en memoria." : "Proporciona contraseña o elige vacía explícitamente."} />
          {c.db_type === "oracle" && <Input label="Service name" required value={c.service_name || ""} onChange={e => w.updateConnection({ service_name: e.target.value })} />}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setPassword(""); w.updateConnection({ password: "" }); }}>Usar contraseña vacía explícitamente</Button>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!c.use_agent} onChange={e => w.updateConnection({ use_agent: e.target.checked })} />Usar agente local híbrido</label>
        {c.use_agent && <><Input label="ID del agente de bodega" value={w.agentId} onChange={e => w.updateConnection({ agent_id: e.target.value })} />
          <HybridAgentInstructions agentId={w.agentId} status={w.agent.status} error={w.agent.error} onRetry={w.agent.retry} />
          <p className="text-sm text-content-muted">Analítica requiere un agente actualizado y no necesita habilitar escrituras.</p></>}
        <Button type="submit" disabled={!!w.busy || !w.passwordProvided || (!!c.use_agent && w.agent.status !== "connected")}>Conectar y leer catálogo</Button>
      </form>
    </details>
    {w.catalog && <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-content-muted">Esquema {w.catalog.schema} · {w.catalog.tables.length} tablas</span><Button variant="outline" disabled={!!w.busy} onClick={() => void w.connect()}>Actualizar catálogo</Button></div>}
  </Card>;
}
