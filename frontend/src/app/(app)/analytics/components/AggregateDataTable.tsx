import { Button, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatScalar } from "@/features/warehouse/format";
import type { Result, Scalar } from "@/types/warehouse";

export function AggregateDataTable({ result, caption, onDrill, disabled }: { result: Result; caption: string; onDrill?: (row: Record<string, Scalar>) => void; disabled?: boolean }) {
  return <div className="max-h-[32rem] overflow-auto rounded-lg border border-line" role="region" aria-label={caption} tabIndex={0}>
    <Table><TableCaption>{caption} · {result.data.length} filas</TableCaption><TableHead className="sticky top-0 bg-surface"><TableRow>{result.columns.map(c => <TableHeader key={c.id}>{c.label}</TableHeader>)}{onDrill && <TableHeader>Detalle</TableHeader>}</TableRow></TableHead>
      <TableBody>{result.data.map((row, i) => <TableRow key={i}>{result.columns.map(c => <TableCell key={c.id} className={c.role === "metric" || ["integer", "decimal", "float"].includes(c.logical_type) ? "text-right tabular-nums" : ""}>{formatScalar(row[c.id], c.logical_type)}</TableCell>)}{onDrill && <TableCell><Button variant="outline" size="sm" disabled={disabled} onClick={() => onDrill(row)}>Ver detalle {i + 1}</Button></TableCell>}</TableRow>)}
        {!result.data.length && <TableRow><TableCell colSpan={result.columns.length + (onDrill ? 1 : 0)}>Sin coincidencias para estos filtros.</TableCell></TableRow>}</TableBody></Table>
  </div>;
}
