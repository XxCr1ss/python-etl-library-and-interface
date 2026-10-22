"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { ApiError } from "@/services/apiClient";
import { getExecutions, getMetrics, type RemoteExecution, type RemoteMetrics } from "@/services/monitoringApi";
const labels = { running: "En curso", success: "Exitoso", error: "Fallido", unknown: "Sin confirmar" };
export function RemoteMonitoring() {
  const [status, setStatus] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null), [previous, setPrevious] = useState<(string | null)[]>([]);
  const [next, setNext] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const [items, setItems] = useState<RemoteExecution[]>([]), [metrics, setMetrics] = useState<RemoteMetrics | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const resetPage = () => { setCursor(null); setPrevious([]); };
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setItems([]); setMetrics(null);
    const filters = new URLSearchParams();
    if (status) filters.set("status", status);
    if (from) filters.set("from", new Date(from + "T00:00:00").toISOString());
    if (to) { const end = new Date(to + "T00:00:00"); end.setDate(end.getDate()+1); filters.set("to", end.toISOString()); }
    const list = new URLSearchParams(filters); if (cursor) list.set("cursor", cursor);
    Promise.all([getExecutions(list.toString(), controller.signal), getMetrics(filters.toString(), controller.signal)])
      .then(([history, totals]) => { if (!controller.signal.aborted) { setItems(history.items); setNext(history.next_cursor); setMetrics(totals); } })
      .catch(err => { if (!controller.signal.aborted && !(err instanceof ApiError && err.kind === "aborted")) setError(err instanceof Error ? err.message : "No se pudo consultar el historial."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, from, to, cursor, revision]);
  return <section className="space-y-5" aria-label="Historial persistente">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Historial de tu cuenta</h2><p className="text-sm text-content-muted">Cargas registradas por el servidor. Retención prevista: 90 días. Fechas en tu zona horaria.</p></div><Button variant="outline" disabled={loading} onClick={() => setRevision(n => n+1)}>Actualizar historial</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Select label="Estado" value={status} onChange={e => { setStatus(e.target.value); resetPage(); }}><option value="">Todos los estados</option>{Object.entries(labels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select>
      <Input label="Desde" type="date" value={from} onChange={e => { setFrom(e.target.value); resetPage(); }} /><Input label="Hasta" type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); resetPage(); }} /></div>
    {loading && <div role="status" className="rounded-lg border border-line p-6 motion-safe:animate-pulse">Consultando historial y métricas…</div>}
    {error && <Alert tone="error" title="Historial remoto no disponible">{error} El historial de esta pestaña no sustituye los registros de tu cuenta.</Alert>}
    {metrics && <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Intentos", metrics.attempts], ["Cargas exitosas", metrics.successes],
      ["Tasa de éxito", metrics.success_rate === null ? "Sin datos" : `${Math.round(metrics.success_rate*100)} %`],
      ["Duración media", metrics.average_ms === null ? "Sin datos" : `${(metrics.average_ms/1000).toFixed(1)} s`],
    ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-line bg-surface p-5"><dt className="text-sm text-content-muted">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>}
    {!loading && !error && !items.length && <div className="rounded-xl border border-dashed border-line p-8 text-center"><h3 className="font-semibold">Sin cargas en este rango</h3><p className="mt-2 text-sm text-content-muted">Ejecuta una carga con tu cuenta o ajusta los filtros. Las pruebas de conexión y vistas previas no cuentan como cargas.</p></div>}
    {!!items.length && <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-sm"><caption className="sr-only">Intentos de carga persistentes</caption><thead className="bg-surface-muted"><tr>{["Inicio", "Destino", "Estado", "Duración", "Total final destino", "Detalle"].map(label => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{items.map(row => <tr key={row.id} className="border-t border-line"><td className="p-3">{new Date(row.started_at).toLocaleString()}</td><td className="p-3">{row.table_name}</td><td className="p-3">{labels[row.status]}</td><td className="p-3">{row.duration_ms === null ? "Sin confirmar" : `${(row.duration_ms/1000).toFixed(1)} s`}</td><td className="p-3">{row.destination_total_rows === null ? "Sin confirmar" : row.destination_total_rows.toLocaleString()}</td><td className="p-3"><details><summary className="cursor-pointer text-action">Ver detalle</summary><p className="mt-2 break-all">ID: {row.id}</p><p>{row.source_label} → {row.target_label}</p>{row.error_message && <p className="mt-2">{row.error_message}</p>}{row.status === "unknown" && <p className="mt-2 text-warning">Revisa la tabla destino antes de iniciar otro intento. No se repetirá automáticamente.</p>}</details></td></tr>)}</tbody></table></div>}
    {!loading && !error && <div className="flex justify-end gap-2"><Button variant="outline" disabled={!previous.length} onClick={() => { setCursor(previous.at(-1) ?? null); setPrevious(p => p.slice(0,-1)); }}>Anterior</Button><Button variant="outline" disabled={!next} onClick={() => { setPrevious(p => [...p,cursor]); setCursor(next); }}>Siguiente</Button></div>}
  </section>;
}
