"use client";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Input } from "@/components/ui";
import { createConnection } from "@/services/connectionsApi";
import type { DatabaseDraft } from "./DatabaseConnectionFields";
export function SaveConnectionInSitu({ draft, type, agentId }: { draft: DatabaseDraft; type: "source" | "target"; agentId?: string }) {
  const { user } = useAuth();
  const [name, setName] = useState(""), [pending, setPending] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  if (!user || draft.savedConnection || draft.password === undefined) return null;
  return <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-4">
    <p className="text-sm font-semibold">Guardar esta conexión para futuros usos</p>
    <Input label="Alias de la conexión" value={name} maxLength={120} onChange={e => setName(e.target.value)} />
    <Button size="sm" disabled={!name.trim()} isLoading={pending} onClick={async () => {
      setPending(true); setError(""); setMessage("");
      try { await createConnection({ name: name.trim(), connection_type: type, db_type: draft.db_type, host: draft.host,
        port: draft.port ? Number(draft.port) : null, database: draft.database, user: draft.user, password: draft.password!,
        service_name: draft.service_name || null, transport: draft.use_agent ? "agent" : "direct",
        ...(draft.use_agent ? { runtime_agent_id: agentId } : {}) }); setMessage("Conexión guardada en tu cuenta."); }
      catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); }
      finally { setPending(false); }
    }}>Guardar conexión</Button>
    {message && <p role="status" className="text-sm text-success">{message}</p>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
