"use client";
import { Alert, Badge, LoadingSkeleton, Skeleton, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { JsonRow, JsonValue } from "@/types/etl";

function dtypeTone(raw: string) {
  const type = raw.toLowerCase();
  if (/bool/.test(type)) return "boolean";
  if (/int|float|double|decimal|numeric/.test(type)) return "numeric";
  if (/date|time/.test(type)) return "date";
  if (/str|text|char|object/.test(type)) return "text";
  return "unknown";
}
function CellValue({ value }: { value: JsonValue | undefined }) {
  if (value === undefined) return <span className="italic text-content-muted">Sin valor</span>;
  if (value === null) return <Badge>NULL</Badge>;
  if (value === "") return <span className="italic text-content-muted">Texto vacío</span>;
  if (typeof value === "boolean") return <Badge tone="boolean">{String(value)}</Badge>;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 120 ? <details><summary className="cursor-pointer break-all">{text.slice(0, 120)}… <span className="sr-only">Mostrar valor completo</span></summary><span className="whitespace-pre-wrap break-all">{text}</span></details> : <span className="whitespace-pre-wrap break-words">{text}</span>;
}
export default function TablePreview({ columns, dtypes, previewData, loading, error, totalRows, stale = false, hasResult = true }: {
  columns: string[]; dtypes: Record<string, string>; previewData: JsonRow[]; loading: boolean; error: string | null;
  totalRows?: number; stale?: boolean; hasResult?: boolean;
}) {
  return <section aria-label="Vista previa del resultado" aria-busy={loading} className="min-w-0 space-y-3">
    {error && <Alert tone="error" title="Error de Procesamiento"><p>{error}</p><p>La receta se conserva; edita un paso, deshaz el último cambio o reintenta.</p></Alert>}
    {stale && hasResult && <p role="status" className="text-sm text-warning">Datos desactualizados. La carga se habilitará tras validar la revisión actual.</p>}
    {loading && !hasResult && <LoadingSkeleton label="Calculando vista previa…"><div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div></LoadingSkeleton>}
    {loading && hasResult && <p role="status" className="text-sm text-content-muted">Actualizando vista previa…</p>}
    {hasResult && columns.length > 0 && <div role="region" tabIndex={0} aria-label="Tabla de muestra transformada" className="max-h-[max(24rem,calc(100dvh-24rem))] max-w-full overflow-auto rounded-xl border border-line bg-surface">
      <Table><TableCaption>{previewData.length} filas de muestra de {totalRows ?? "total desconocido"} transformadas · {columns.length} columnas</TableCaption>
        <TableHead className="sticky top-0 z-10"><TableRow>{columns.map(column => <TableHeader key={column} className="min-w-[9rem] align-top">
          <span className="block break-words">{column}</span><Badge tone={dtypeTone(dtypes[column] ?? "")} title={`Tipo de ${column}: ${dtypes[column] ?? "desconocido"}`}>{dtypes[column] ?? "desconocido"}</Badge>
        </TableHeader>)}</TableRow></TableHead>
        <TableBody>{previewData.map((row, i) => <TableRow key={i}>{columns.map(column => <TableCell key={column} className="max-w-xs align-top font-mono text-xs"><CellValue value={row[column]} /></TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>}
    {hasResult && columns.length === 0 && <p className="rounded-lg border border-line p-4 text-content-muted">Resultado válido sin columnas disponibles.</p>}
    {hasResult && previewData.length === 0 && <p className="text-sm text-content-muted">Resultado válido sin filas. Se conservan las columnas informadas por el servidor.</p>}
    {!hasResult && !loading && !error && <p className="text-sm text-content-muted">La muestra aparecerá al validar la receta.</p>}
  </section>;
}
