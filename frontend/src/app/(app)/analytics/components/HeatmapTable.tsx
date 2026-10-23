import { formatScalar } from "@/features/warehouse/format";
import type { AnalysisResult } from "@/types/analysis";
import type { ResultColumn } from "@/types/warehouse";

export function HeatmapTable({ result, metric }: { result: AnalysisResult; metric: ResultColumn }) {
  const dims = result.columns.filter(c => c.role === "dimension");
  const rows = new Map<string, string>(), columns = new Map<string, string>(), cells = new Map<string, typeof result.data[number]>();
  for (const item of result.data) {
    const row = JSON.stringify(item[dims[0].id]), column = JSON.stringify(dims.slice(1).map(d => item[d.id]));
    rows.set(row, formatScalar(item[dims[0].id]));
    columns.set(column, dims.slice(1).map(d => formatScalar(item[d.id])).join(" / "));
    cells.set(JSON.stringify([row, column]), item);
  }
  if (rows.size * columns.size > 5000) return <p role="status">La matriz supera 5.000 celdas. Reduce grupos o usa la tabla agregada.</p>;
  const maximum = Math.max(1, ...result.data.map(r => Math.abs(Number(r[metric.id]))).filter(Number.isFinite));
  return <div className="space-y-2"><p className="text-sm text-content-muted">Intensidad proporcional al valor absoluto; los valores negativos usan otro tono y conservan su signo. No devuelto indica una combinación ausente de este resultado, no un cero. El Top N puede omitir combinaciones.</p><div className="overflow-x-auto"><table className="w-full text-sm"><caption>Matriz de {metric.label}: primera dimensión por combinación de las restantes</caption><thead><tr><th scope="col" className="border border-line p-2">{dims[0].label}</th>{Array.from(columns).map(([key, label]) => <th key={key} scope="col" className="border border-line p-2">{label}</th>)}</tr></thead><tbody>{Array.from(rows).map(([row, label]) => <tr key={row}><th scope="row" className="border border-line p-2 text-left">{label}</th>{Array.from(columns.keys()).map(column => {
    const item = cells.get(JSON.stringify([row, column])), value = item?.[metric.id], number = Number(value);
    const backgroundColor = value === null || value === undefined || !Number.isFinite(number) ? undefined : `rgba(${number < 0 ? "180,83,9" : "37,99,235"},${0.05 + Math.abs(number) / maximum * 0.25})`;
    return <td key={column} className="border border-line p-2 text-content" style={{ backgroundColor }}>{item ? formatScalar(value ?? null, metric.logical_type) : "No devuelto"}</td>;
  })}</tr>)}</tbody></table></div></div>;
}
