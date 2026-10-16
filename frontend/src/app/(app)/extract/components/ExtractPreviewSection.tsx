import { Alert, Button, LoadingSkeleton, Skeleton, Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { JsonRow, JsonValue, RowCount } from "@/types/etl";
import type { ExtractStatus } from "../hooks/useExtractRequest";

function cell(value: JsonValue | undefined) {
  if (value === undefined) return <span className="italic text-content-muted">Sin valor</span>;
  if (value === null) return <span className="italic text-content-muted">NULL</span>;
  if (value === "") return <span className="italic text-content-muted">Texto vacío</span>;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
export function ExtractPreviewSection({ status, error, rows = [], columns, count, label, disabled, onContinue }: {
  status: ExtractStatus; error: string | null; rows?: JsonRow[]; columns?: string[]; count?: RowCount;
  label?: string; disabled: boolean; onContinue: () => void;
}) {
  const headers = columns?.length ? columns : Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return <section aria-label="Vista previa de extracción" className="mt-6 space-y-4 border-t border-line pt-6" aria-busy={status === "pending"}>
    <h2 className="text-lg font-semibold text-content">Vista previa de extracción</h2>
    {status === "pending" && <LoadingSkeleton label="Procesando solicitud…"><div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div></LoadingSkeleton>}
    {error && <Alert tone="error" title="No se pudo extraer">{error}</Alert>}
    {status === "idle" && <p className="text-sm text-content-muted">La muestra aparecerá aquí después de procesar el origen de esta pestaña.</p>}
    {status === "success" && <>
      <p className="break-words font-semibold text-content">Resultado: {label}</p>
      <p className="text-sm text-content-muted">{count?.kind === "sample" ? `${count.value} filas de muestra; total sin consultar` : `${count?.value} filas en el origen`}. Mostrando {rows.length} filas de muestra.</p>
      {headers.length > 0 && <div role="region" aria-label="Muestra del origen" tabIndex={0} className="max-h-80 overflow-auto rounded-lg border border-line">
        <Table><TableCaption>Muestra de {label}</TableCaption><TableHead className="sticky top-0"><TableRow>{headers.map(name => <TableHeader key={name}>{name}</TableHeader>)}</TableRow></TableHead>
          <TableBody>{rows.map((row, index) => <TableRow key={index}>{headers.map(name => <TableCell key={name} className="max-w-sm whitespace-pre-wrap break-words">{cell(row[name])}</TableCell>)}</TableRow>)}</TableBody></Table>
      </div>}
      {rows.length === 0 && <p className="text-sm text-content-muted">El origen es válido y la muestra está vacía. {headers.length ? "Se muestran las columnas disponibles." : "No hay esquema disponible en esta respuesta."} Puedes continuar.</p>}
      <div className="flex flex-col items-start gap-2 sm:items-end"><Button disabled={disabled} onClick={onContinue}>Continuar a Transformación</Button>
        <p className="text-xs text-content-muted">Guardar y continuar confirma este resultado como fuente del pipeline.</p></div>
    </>}
  </section>;
}
