"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import type { ExecutionRecord } from "@/types/etl";

export default function ExecutionPanel({ canExecute, recipeLength, execution, onExecute }: {
  canExecute: boolean; recipeLength: number; execution: ExecutionRecord | null; onExecute: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const running = execution?.status === "running";
  useEffect(() => {
    if (!running) return;
    setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-4" aria-labelledby="execute-title">
    <h2 id="execute-title" className="text-lg font-bold">Ejecutar carga</h2>
    <p className="text-sm">{recipeLength ? `${recipeLength} pasos de transformación.` : "Carga directa (sin pasos de transformación en cola)."}</p>
    <p className="text-sm text-content-muted">Requiere preview vigente, conexión probada y configuración válida.</p>
    {running && <div role="status" aria-live="polite" className="space-y-2">
      <p><span aria-hidden="true" className="inline-block mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />Ejecutando pipeline</p>
      <p>Inicio local: {new Date(execution.startedAt).toLocaleString()}</p>
      <p>Tiempo transcurrido del navegador: {Math.max(0, Math.floor((now - Date.parse(execution.startedAt)) / 1000))} s</p>
    </div>}
    <Button className="w-full" disabled={!canExecute || running} isLoading={running} onClick={onExecute}>Iniciar Carga en Bodega de Datos</Button>
  </section>;
}
