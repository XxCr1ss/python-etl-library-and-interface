import type { ExampleTable } from "../types";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value === "") return '"" (texto vacío)';
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
export function DataDiffTable({ data, caption, result = false }: { data: ExampleTable; caption: string; result?: boolean }) {
  return <div role="region" aria-label={caption} tabIndex={0} className="min-w-0 overflow-x-auto rounded-lg border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
    <table className="w-full text-left text-sm">
      <caption className={`p-3 text-left text-xs font-semibold ${result ? "bg-success-surface text-success" : "bg-surface-muted text-content-muted"}`}>{caption}</caption>
      <thead><tr>{data.columns.map(column => <th key={column} scope="col" className="border-y border-line px-3 py-2 font-mono text-xs">{column}</th>)}</tr></thead>
      <tbody>{data.rows.map((row, i) => <tr key={i} className="border-b border-line last:border-0">{data.columns.map(column => <td key={column} className="whitespace-nowrap px-3 py-2 font-mono text-xs">{cell(row[column])}</td>)}</tr>)}</tbody>
    </table>
    {!data.rows.length && <p className="p-3 text-sm text-content-muted">Sin filas; se conservan las cabeceras mostradas.</p>}
  </div>;
}
