import type { PreviewResponse } from "@/types/etl";

export default function SourceSchemaSummary({ data, current }: { data?: PreviewResponse; current: boolean }) {
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-3" aria-labelledby="schema-title">
    <h2 id="schema-title" className="font-bold">Esquema de entrada transformado</h2>
    <p className="text-sm text-content-muted">Columnas y tipos conocidos de entrada. No se ha consultado el esquema del destino.</p>
    {!current ? <p role="status">Esquema pendiente de validar para la revisión actual.</p> : <>
      <p>{data?.total_rows.toLocaleString()} filas en el resultado transformado.</p>
      <ul tabIndex={0} aria-label="Columnas de origen" className="max-h-64 overflow-auto divide-y divide-line text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">{data?.columns.map(column => <li key={column} className="flex flex-wrap justify-between gap-2 py-2">
        <span className="break-all">{column}</span><span className="font-mono text-content-muted">{data.dtypes[column] || "Tipo no informado"}</span>
      </li>)}</ul>
      {!data?.columns.length && <p>El resultado no tiene columnas.</p>}
    </>}
  </section>;
}
