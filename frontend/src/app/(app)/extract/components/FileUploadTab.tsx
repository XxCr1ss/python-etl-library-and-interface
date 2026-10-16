import { Button } from "@/components/ui";
import { SourceFilePicker } from "@/components/etl/SourceFilePicker";
import type { useFileExtract } from "../hooks/useFileExtract";

export function FileUploadTab({ model }: { model: ReturnType<typeof useFileExtract> }) {
  return <div className="space-y-4">
    <SourceFilePicker file={model.file} onSelect={model.select} />
    <Button disabled={!model.file} isLoading={model.status === "pending"} onClick={model.submit}>Procesar Archivo</Button>
    {model.status === "success" && <p role="status" className="text-sm text-success">Archivo procesado exitosamente para vista previa.</p>}
  </div>;
}
