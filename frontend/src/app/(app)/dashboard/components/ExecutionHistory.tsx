"use client";
import { useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import type { ExecutionRecord } from "@/types/etl";
import { Button, EmptyState, Modal } from "@/components/ui";
import { formatDuration } from "./historyMetrics";

const statuses = { running: "En curso", success: "Éxito", error: "Fallido", unknown: "Resultado desconocido" };
const colors = { running: "text-action", success: "text-success", error: "text-danger", unknown: "text-warning" };
const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
function relativeDate(iso: string, now: number) {
  const minutes = Math.round((Date.parse(iso) - now) / 60000);
  const formatter = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
  return Math.abs(minutes) < 60 ? formatter.format(minutes, "minute") : Math.abs(minutes) < 1440 ? formatter.format(Math.round(minutes / 60), "hour") : formatter.format(Math.round(minutes / 1440), "day");
}
export function ExecutionHistory({ history, onClear, disabled, recoveryRequired = false }: { history: ExecutionRecord[]; onClear: () => void; disabled: boolean; recoveryRequired?: boolean }) {
  const [confirm, setConfirm] = useState(false);
  // One instant per mounted table, no timers and no per-row clocks.
  const [now] = useState(() => Date.now());
  return <section aria-labelledby="history-heading" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="history-heading" className="text-lg font-bold">Historial de esta pestaña (hasta 50 intentos)</h2>
      <Button variant="outline" size="sm" disabled={(!history.length && !recoveryRequired) || disabled} onClick={() => setConfirm(true)}>Borrar historial de esta pestaña</Button>
    </div>
    {!history.length ? <EmptyState icon={<History />} title={recoveryRequired ? "Historial pendiente de recuperación" : "Aún no hay intentos de carga"} description={recoveryRequired ? "Los resúmenes guardados no se pueden interpretar. Puedes borrarlos con confirmación y conservar el pipeline activo." : "Las cargas de esta pestaña aparecerán aquí. Comienza configurando un origen."}
      action={<Link href="/extract" className="font-semibold text-action underline">Iniciar extracción</Link>} />
      : <div role="region" aria-label="Historial de ejecuciones" tabIndex={0} className="max-h-[32rem] overflow-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[780px] text-left text-sm">
          <caption className="sr-only">Intentos locales de carga, del más reciente al más antiguo</caption>
          <thead className="sticky top-0 bg-surface-muted"><tr>{["Origen", "Tabla destino", "Estado", "Fecha", "Duración del navegador", "Total en destino"].map(label => <th scope="col" key={label} className="p-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{[...history].reverse().map(record => <tr key={record.id} className="border-t border-line">
            <td className="max-w-60 break-words p-4">{record.sourceLabel || "No registrado"}</td>
            <td className="max-w-60 break-words p-4 font-mono">{record.table_name}</td>
            <td className={`p-4 font-semibold ${colors[record.status]}`}>{statuses[record.status]}</td>
            <td className="p-4"><time dateTime={record.startedAt}>{dateFormat.format(new Date(record.startedAt))}</time><span className="mt-1 block text-xs text-content-muted">{relativeDate(record.startedAt, now)}</span></td>
            <td className="p-4">{record.status === "running" ? "En curso" : formatDuration(record.durationMs)}</td>
            <td className="p-4">{record.status === "success" && record.total_rows !== undefined ? new Intl.NumberFormat("es-CO").format(record.total_rows) : "Sin datos"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <Modal open={confirm} onClose={() => setConfirm(false)} title="Borrar historial de esta pestaña" description="Se eliminarán únicamente los resúmenes locales de intentos. El pipeline activo y las tablas de base de datos se conservan."
      footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button><Button variant="destructive" disabled={disabled} onClick={() => { onClear(); setConfirm(false); }}>Borrar resúmenes</Button></>}>
      <p>Esta acción no se puede deshacer.</p>
    </Modal>
  </section>;
}
