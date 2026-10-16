"use client";
import { DatabaseConnectionFields } from "@/components/etl/DatabaseConnectionFields";
import { Button } from "@/components/ui";
import type { useTargetConnection } from "../hooks/useTargetConnection";

export default function TargetConfigForm({ connection }: { connection: ReturnType<typeof useTargetConnection> }) {
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-4" aria-labelledby="target-title">
    <h2 id="target-title" className="text-lg font-bold">Conexión a la Bodega de Datos</h2>
    <p className="text-sm text-content-muted">Prueba el destino después de cada cambio de conexión.</p>
    <form noValidate onSubmit={e => { e.preventDefault(); void connection.test(); }} className="space-y-4">
      <DatabaseConnectionFields value={connection.draft} onChange={connection.change} errors={connection.errors} />
      <Button type="submit" isLoading={connection.testing}>Probar Conexión Bodega</Button>
    </form>
    <p role="status" className={connection.connected ? "text-success" : "text-content-muted"}>
      {connection.connected ? "Conectado Correctamente" : "Conexión pendiente de prueba"}
    </p>
    {connection.message && <p role="alert" className="text-danger">{connection.message}</p>}
  </section>;
}
