"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { Button, Modal } from "@/components/ui";
import { getAgentStatus } from "@/services/extractApi";
import type { SourceConnectionDto } from "@/types/etl";
import { DiagramOwner, type Selection } from "./coordinator";
import { sourceName } from "@/types/etlLabels";
import { connectionFromSource, sameConnection } from "./connectionIdentity";

const Context = createContext<{ open: (connection: SourceConnectionDto) => string; invalidate: (connection?: SourceConnectionDto) => void;
  refresh: (connection: SourceConnectionDto) => void; suspend: (connection: SourceConnectionDto, reason: string) => void; setEditorOpen: (value: boolean) => void } | null>(null);
export const useDiagramCoordinator = () => useContext(Context);
export function DiagramCoordinator({ children }: { children: ReactNode }) {
  const session = usePipelineSession(), route = usePathname();
  const [pending, setPending] = useState<Selection | null>(null);
  const [openingWarning, setOpeningWarning] = useState("");
  const editorOpen = useRef(false);
  const current = useRef({ session, route }); current.current = { session, route };
  const [owner] = useState(() => new DiagramOwner(() => {
    const { session: s, route: pathname } = current.current;
    const state = s.snapshot();
    const available = state.hydrationStatus !== "hydrating" && !state.recoveryRequired && state.execution?.status !== "running" && !editorOpen.current;
    return { route: pathname, revision: state.revision, available,
      reason: available ? "" : editorOpen.current ? "Cierra el editor de transformación antes de cambiar el origen." : "Espera a que termine la ejecución o recupera la sesión.",
      stamp: JSON.stringify([pathname, state.revision, state.targetVersion, state.loadVersion, state.credentialVersion, state.execution?.status, editorOpen.current]),
      sourceMatches: (connection, table) => {
        const source = state.source;
        const active = source && connectionFromSource(source, s.credentials);
        return source?.type === "database" && source.table_name === table && !!active && sameConnection(active, connection);
      } };
  }, (connection, table) => current.current.session.confirmSource(connection.connection_id
    ? { type: "database", ...connection.display, savedConnection: { connection_id: connection.connection_id, connection_version: connection.connection_version,
      ...(connection.runtime_agent_id ? { runtime_agent_id: connection.runtime_agent_id } : {}) }, table_name: table }
    : { type: "database", ...connection, table_name: table }), setPending));
  const previous = useRef(session.state);
  useEffect(() => {
    if (!session.state.source && session.state.revision !== previous.current.revision) owner.invalidate();
    previous.current = session.state; owner.publish();
  }, [session.state, route, owner]);
  useEffect(() => {
    const abort = new AbortController();
    let checking = false;
    const check = () => {
      if (document.hidden || abort.signal.aborted) return;
      if (owner.expire()) setOpeningWarning("El diagrama no confirmó su apertura. Revisa el bloqueo de nuevas pestañas y vuelve a abrirlo desde la pestaña ETL.");
      owner.publish();
      if (checking) return;
      const agents = Array.from(new Set(owner.connections().filter(c => c.use_agent || (c.connection_id && c.display?.use_agent))
        .map(c => c.connection_id ? c.runtime_agent_id : c.agent_id).filter((id): id is string => !!id)));
      checking = true;
      void Promise.all(agents.map(async id => {
        try { const state = await getAgentStatus(id, abort.signal); if (!abort.signal.aborted) owner.agentStatus(id, state.connected); }
        catch { if (!abort.signal.aborted) owner.agentStatus(id, false); }
      })).finally(() => { checking = false; });
    };
    const timer = setInterval(check, 5000);
    const exit = () => owner.invalidate();
    window.addEventListener("pagehide", exit);
    window.addEventListener("etl:session-reset", exit);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); abort.abort(); window.removeEventListener("pagehide", exit); window.removeEventListener("etl:session-reset", exit); document.removeEventListener("visibilitychange", check); owner.invalidate(); };
  }, [owner]);
  const bridge = useMemo(() => ({ open: (connection: SourceConnectionDto) => { setOpeningWarning(""); return owner.open(connection); }, invalidate: (connection?: SourceConnectionDto) => owner.invalidate(connection),
    refresh: (connection: SourceConnectionDto) => owner.refresh(connection), suspend: (connection: SourceConnectionDto, reason: string) => owner.suspend(connection, reason),
    setEditorOpen: (value: boolean) => { editorOpen.current = value; owner.publish(); } }), [owner]);
  return <Context.Provider value={bridge}>
    {children}
    {openingWarning && <p role="status" className="border-t border-line bg-warning-surface p-3 text-sm text-warning">{openingWarning}</p>}
    {pending && <Modal open onClose={() => owner.resolve(false)} title="Usar tabla en Transformación"
      footer={<><Button variant="outline" onClick={() => owner.resolve(false)}>Cancelar selección</Button><Button variant={session.state.source ? "destructive" : "primary"} onClick={() => owner.resolve(true)}>Confirmar tabla</Button></>}>
      <p>Usar <strong>{pending.table}</strong> como origen de trabajo.</p>
      {session.state.source && <p className="mt-3">Origen actual: {sourceName(session.state.source)}</p>}
      {session.state.source && <p className="mt-3">Esto sustituye el origen actual, reinicia {session.state.recipe.length} pasos, la vista previa, la configuración de carga y las llaves foráneas. Tendrás que validar el destino otra vez.</p>}
    </Modal>}
  </Context.Provider>;
}
