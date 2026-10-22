"use client";
import Link from "next/link";
import { useState, useContext, type FormEvent } from "react";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { PipelineContext } from "@/state/PipelineProvider";
import { HybridAgentInstructions } from "@/components/etl/HybridAgentInstructions";
import { useAuth } from "@/auth/AuthProvider";
import { useSavedConnections } from "@/hooks/useSavedConnections";
import { Alert, Button, Input, Select, Modal } from "@/components/ui";
import { DatabaseConnectionFields, initialDatabaseDraft, updateDatabaseDraft, validateDatabaseDraft, type DatabaseDraft } from "@/components/etl/DatabaseConnectionFields";
import { createConnection, updateConnection, testConnection, removeConnection, referenceOf, type SavedConnection } from "@/services/connectionsApi";

export function ConnectionsManager() {
  const { user, configured, loading: authLoading } = useAuth();
  const [type, setType] = useState<"source" | "target">("source"), saved = useSavedConnections(type);
  const [draft, setDraft] = useState<DatabaseDraft>({ ...initialDatabaseDraft, host: "" });
  const [name, setName] = useState(""), [editing, setEditing] = useState<SavedConnection | null>(null);
  const [open, setOpen] = useState(false), [deleting, setDeleting] = useState<SavedConnection | null>(null);
  const pipeline = useContext(PipelineContext), agentId = pipeline?.agentId || "";
  const agent = useAgentStatus(open && draft.use_agent, agentId);
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  function begin(row: SavedConnection | null) {
    setEditing(row); setName(row?.name || ""); setError(""); setMessage("");
    setDraft(row ? { db_type: row.db_type, host: row.host, port: row.port == null ? "" : String(row.port),
      database: row.database, user: row.user, password: undefined, service_name: row.service_name || "", use_agent: row.transport === "agent",
      savedConnection: referenceOf(row) } : { ...initialDatabaseDraft, host: "", password: undefined });
    setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (pending) return;
    const invalid = validateDatabaseDraft({ ...draft, ...(editing && draft.password === undefined ? { savedConnection: referenceOf(editing) } : {}) });
    if (!name.trim() || Object.keys(invalid).length) { setError("Completa el alias y los datos de la conexión."); return; }
    setPending(true); setError("");
    try {
      const fields = { name: name.trim(), db_type: draft.db_type, host: draft.host, port: draft.port ? Number(draft.port) : null,
        database: draft.database, user: draft.user, service_name: draft.service_name || null, transport: (draft.use_agent ? "agent" : "direct") as "agent" | "direct", ...(draft.use_agent ? { runtime_agent_id: agentId } : {}) };
      if (editing) await updateConnection(editing.id, { ...fields, version: editing.version, ...(draft.password !== undefined ? { password: draft.password } : {}) });
      else await createConnection({ ...fields, connection_type: type, password: draft.password! });
      setOpen(false); setDraft({ ...initialDatabaseDraft, password: undefined }); setEditing(null);
      setMessage("Conexión comprobada y guardada."); saved.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); }
    finally { setPending(false); }
  }
  if (authLoading) return <p role="status">Comprobando sesión…</p>;
  if (!user) return <div className="space-y-3"><h1 className="text-2xl font-bold">Mis conexiones</h1><p>{configured ? "Inicia sesión para guardar conexiones." : "Las cuentas aún no están configuradas."}</p><Link href="/login" className="text-action underline">Iniciar sesión</Link></div>;
  return <div className="mx-auto max-w-5xl space-y-6 text-content">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Mis conexiones</h1><p className="mt-2 text-sm text-content-muted">Credenciales cifradas para reutilizar en Extracción y Carga. Las contraseñas guardadas no se muestran.</p></div><Button onClick={() => begin(null)}>Nueva conexión</Button></div>
    <Select label="Tipo de conexiones" value={type} onChange={e => { setType(e.target.value as typeof type); setError(""); setMessage(""); }}><option value="source">Orígenes de datos</option><option value="target">Bodegas de destino</option></Select>
    {(error && !open) && <Alert tone="error" title="No se pudo completar la operación">{error}</Alert>}
    {saved.error && <Alert tone="error" title="Conexiones no disponibles">{saved.error}<Button variant="outline" size="sm" onClick={saved.refresh}>Reintentar</Button></Alert>}
    {message && <p role="status" className="text-success">{message}</p>}
    {saved.loading && <p role="status">Consultando conexiones…</p>}
    {!saved.loading && !saved.error && !saved.items.length && <section className="rounded-xl border border-dashed border-line p-8 text-center"><h2 className="font-semibold">Aún no tienes conexiones guardadas</h2><p className="mt-2 text-sm text-content-muted">Agrega una conexión directa o guárdala después de comprobarla en el pipeline.</p><Button className="mt-4" variant="outline" onClick={() => begin(null)}>Agregar conexión</Button></section>}
    <ul className="space-y-3">{saved.items.map(row => <li key={row.id} className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <div><h2 className="font-semibold">{row.name} <span className="text-xs text-content-muted">{row.db_type}</span></h2><p className="break-all text-sm text-content-muted">{row.host}:{row.port || "predeterminado"} / {row.database} · {row.user}</p>
        <p className="mt-1 text-xs text-content-muted">{row.last_test_status === "success" ? "Última prueba correcta" : row.last_test_status === "error" ? "Última prueba fallida" : "Sin prueba"}{row.last_tested_at ? " · " + new Date(row.last_tested_at).toLocaleString() : ""}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={pending} onClick={async () => { setPending(true); setError(""); try { await testConnection(row, agentId); setMessage("Conexión comprobada."); saved.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo conectar."); saved.refresh(); } finally { setPending(false); } }}>Probar {row.name}</Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => begin(row)}>Editar {row.name}</Button><Button variant="destructive" size="sm" disabled={pending} onClick={() => setDeleting(row)}>Eliminar {row.name}</Button></div>
    </li>)}</ul>
    {saved.more && <Button variant="outline" onClick={saved.loadMore}>Cargar más conexiones</Button>}
    {open && <Modal open onClose={() => { setOpen(false); setDraft({ ...initialDatabaseDraft, password: undefined }); }} allowClose={!pending} title={editing ? "Editar conexión" : "Nueva conexión"}>
      <form onSubmit={save} className="space-y-5"><fieldset disabled={pending} className="space-y-4"><Input label="Alias" value={name} required maxLength={120} onChange={e => setName(e.target.value)} />
        <Select label="Acceso a la base de datos" value={draft.use_agent ? "agent" : "direct"} onChange={e => setDraft(value => updateDatabaseDraft(value, { use_agent: e.target.value === "agent" }))}><option value="direct">Directo desde el backend</option><option value="agent">Agente local emparejado</option></Select>
        {draft.use_agent && <HybridAgentInstructions agentId={agentId} {...agent} onRetry={agent.retry} allowLoad={type === "target"} />}
        <DatabaseConnectionFields value={draft} errors={{}} onChange={patch => setDraft(value => updateDatabaseDraft(value, patch))} />
        {editing && <p className="text-sm text-content-muted">Deja la contraseña sin modificar para conservar la guardada. Los cambios de conexión se prueban antes de guardar.</p>}
        {error && <p role="alert" className="text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setOpen(false); setDraft({ ...initialDatabaseDraft, password: undefined }); }}>Cancelar</Button><Button type="submit" isLoading={pending}>Comprobar y guardar</Button></div>
      </fieldset></form>
    </Modal>}
    {deleting && <Modal open onClose={() => setDeleting(null)} allowClose={!pending} title="Eliminar conexión" footer={<><Button variant="outline" disabled={pending} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" isLoading={pending} onClick={async () => { setPending(true); setError(""); try { await removeConnection(deleting); setDeleting(null); saved.refresh(); setMessage("Conexión eliminada. El historial se conserva."); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar."); setDeleting(null); } finally { setPending(false); } }}>Confirmar eliminación</Button></>}><p>Se eliminará <strong>{deleting.name}</strong> junto con su contraseña guardada. Esta acción no elimina tus tablas ni el historial.</p></Modal>}
  </div>;
}
