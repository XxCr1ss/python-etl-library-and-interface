"use client";
import Link from "next/link";
import { Button } from "@/components/ui";
import { downloadLoadSummary } from "@/state/loadReport";
import type { ExecutionRecord, LoadResponse } from "@/types/etl";

export default function LoadReport({ report, record, onReset }: { report: LoadResponse; record: ExecutionRecord; onReset: () => void }) {
  const columns = Array.from(new Set(report.preview_data.flatMap(row => Object.keys(row))));
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-5">
    <h2 className="text-xl font-bold text-success">¡Pipeline de Carga Completado!</h2>
    <p>{report.message}</p>
    <dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="text-content-muted">Tabla enviada</dt><dd className="font-mono break-all">{record.table_name}</dd></div>
      <div><dt className="text-content-muted">Tipo y modo enviados</dt><dd>{record.table_type} · {record.if_exists || "No registrado"}</dd></div>
      <div><dt className="text-content-muted">Total de filas en la tabla destino</dt><dd className="text-2xl font-bold">{report.total_rows.toLocaleString()}</dd></div>
      <div><dt className="text-content-muted">Duración local del navegador</dt><dd>{((record.durationMs || 0) / 1000).toFixed(1)} s</dd></div>
      <div><dt className="text-content-muted">Inicio local</dt><dd>{new Date(record.startedAt).toLocaleString()}</dd></div>
      <div><dt className="text-content-muted">Fin local</dt><dd>{record.finishedAt ? new Date(record.finishedAt).toLocaleString() : "No registrado"}</dd></div>
    </dl>
    <p className="text-sm text-content-muted">En append, el total incluye filas anteriores. La muestra puede incluir datos de cargas previas.</p>
    <div role="region" tabIndex={0} aria-label="Muestra de la tabla destino" className="max-h-80 overflow-auto rounded-lg border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
      <table className="w-full text-sm"><caption className="p-3 text-left font-semibold">Muestra de la tabla destino</caption>
        <thead className="sticky top-0 bg-surface-muted"><tr>{columns.map(column => <th scope="col" className="p-3 text-left" key={column}>{column}</th>)}</tr></thead>
        <tbody>{report.preview_data.map((row, i) => <tr key={i} className="border-t border-line">{columns.map(column => <td key={column} className="p-3 whitespace-nowrap">
          {row[column] === null || row[column] === undefined ? "NULL" : row[column] === "" ? "Texto vacío" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}
        </td>)}</tr>)}</tbody>
      </table>{!report.preview_data.length && <p className="p-3">Sin filas de muestra en la respuesta.</p>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => downloadLoadSummary(record)}>Descargar resumen JSON</Button>
      <Link className="underline" href="/dashboard">Dashboard</Link>
      <Button onClick={onReset}>Nueva carga</Button>
    </div>
  </section>;
}
