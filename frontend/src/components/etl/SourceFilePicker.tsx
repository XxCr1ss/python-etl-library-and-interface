"use client";
import { useId } from "react";
import { Button, Input } from "@/components/ui";

export function SourceFilePicker({ file, onSelect }: { file: File | null; onSelect: (files: File[]) => void }) {
  const id = useId();
  return <div role="group" aria-label="Selección de archivo" className="space-y-4 rounded-xl border-2 border-dashed border-line bg-surface-muted p-4 sm:p-6"
    onDragOver={event => event.preventDefault()}
    onDrop={event => { event.preventDefault(); onSelect(Array.from(event.dataTransfer.files)); }}>
    <Input id={id} type="file" label="Archivo de origen" accept=".csv,.xlsx,.xls"
      hint="Elige un archivo o arrástralo aquí. CSV, XLSX o XLS. La extensión orienta; el servidor valida el contenido."
      onChange={event => { onSelect(Array.from(event.target.files || [])); event.target.value = ""; }} />
    {file && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 break-all text-sm text-content">{file.name} · {file.size.toLocaleString("es-CO")} bytes</p>
      <Button variant="outline" onClick={() => onSelect([])}>Eliminar selección</Button>
    </div>}
    <p className="text-sm text-content-muted">En Excel se utiliza la primera hoja. El archivo subido se almacena temporalmente; si expira, vuelve a subirlo.</p>
  </div>;
}
