"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { Button, Modal } from "@/components/ui";
import { getAgentStatus } from "@/services/extractApi";
import type { SourceConnectionDto } from "@/types/etl";
import { DiagramOwner, type Selection } from "./coordinator";
import { sourceName } from "@/types/etlLabels";

const Context = createContext<{ open: (connection: SourceConnectionDto) => string; invalidate: () => void; setEditorOpen: (value: boolean) => void } | null>(null);
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
        if (connection.connection_id) return source?.type === "database" && source.table_name === table &&
          source.savedConnection?.connection_id === connection.connection_id && source.savedConnection.connection_version === connection.connection_version &&
          source.savedConnection.runtime_agent_id === connection.runtime_agent_id;
        return source?.type === "database" && source.table_name === table &&
          (["db_type", "host", "port", "database", "user", "service_name", "use_agent", "agent_id"] as const).every(k => (source[k] ?? null) === (connection[k] ?? null)) &&
          s.credentials.has(source.credentialRef) && s.credentials.get(source.credentialRef) === connection.password;
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
    const timer = setInterval(() => {
      if (owner.expire()) setOpeningWarning("El diagrama no confirmó su apertura. Revisa el bloqueo de nuevas pestañas del navegador y vuelve a abrirlo desde Extracción.");
      if (checking) return;
      const agents = Array.from(new Set(owner.connections().filter(c => c.use_agent || (c.connection_id && c.display?.use_agent))
        .map(c => c.connection_id ? c.runtime_agent_id : c.agent_id).filter((id): id is string => !!id)));
      checking = true;
      void Promise.all(agents.map(id => getAgentStatus(id, abort.signal))).then(states => {
        if (!abort.signal.aborted && states.some(s => !s.connected)) owner.invalidate();
      }).catch(() => { if (!abort.signal.aborted) owner.invalidate(); }).finally(() => { checking = false; });
    }, 5000);
    const exit = () => owner.invalidate();
    window.addEventListener("pagehide", exit);
    return () => { clearInterval(timer); abort.abort(); window.removeEventListener("pagehide", exit); owner.invalidate(); };
  }, [owner]);
  const bridge = useMemo(() => ({ open: (connection: SourceConnectionDto) => { setOpeningWarning(""); return owner.open(connection); }, invalidate: () => owner.invalidate(),
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
