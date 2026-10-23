"use client";
import { useDiagramCoordinator } from "./DiagramCoordinator";
import type { SourceConnectionDto } from "@/types/etl";

export function OpenDiagramLink({ connection, disabled = false, reason = "" }: { connection: SourceConnectionDto | null; disabled?: boolean; reason?: string }) {
  const diagram = useDiagramCoordinator();
  if (!diagram) return null;
  const unsupported = typeof window !== "undefined" && typeof BroadcastChannel === "undefined";
  const blocked = disabled || !connection || unsupported;
  return <div className="space-y-1">
    <a href="/extract/diagram" target="_blank" rel="noopener noreferrer" aria-disabled={blocked}
      className="inline-flex rounded-lg border border-line px-4 py-2 text-sm font-semibold text-action aria-disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      onClick={event => {
        if (blocked || !connection) { event.preventDefault(); return; }
        event.currentTarget.href = diagram.open(connection);
      }}>Abrir diagrama E-R en otra pestaña</a>
    {unsupported ? <p role="status" className="text-sm text-content-muted">Este navegador no permite vincular el diagrama entre pestañas.</p>
      : blocked && reason && <p role="status" className="text-sm text-content-muted">{reason}</p>}
  </div>;
}
