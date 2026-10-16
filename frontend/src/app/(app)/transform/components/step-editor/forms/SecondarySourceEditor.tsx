import { useState } from "react";
import { Alert, Button, Select } from "@/components/ui";
import { SourceFilePicker } from "@/components/etl/SourceFilePicker";
import { DatabaseConnectionFields } from "@/components/etl/DatabaseConnectionFields";
import { HybridAgentInstructions } from "@/components/etl/HybridAgentInstructions";
import { useFileExtract } from "@/components/etl/hooks/useFileExtract";
import { useDatabaseExtract } from "@/components/etl/hooks/useDatabaseExtract";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { parseSource } from "@/types/etlValidation";
import { sourceLabel } from "@/state/pipelineLabels";
import type { CredentialStore } from "@/state/credentialStore";
import type { SourceDescriptor } from "@/types/etl";

export function SecondarySourceEditor({ source, credentials, onChange }: {
  source?: SourceDescriptor; credentials: CredentialStore; onChange: (source: SourceDescriptor | undefined, columns?: string[]) => void;
}) {
  const [changing, setChanging] = useState(!source || (source.type === "file" && !source.filepath));
  return <section aria-label="Fuente secundaria" className="space-y-3 rounded-xl border border-line p-3">
    <h4 className="font-semibold">Fuente secundaria</h4>
    {!changing && source ? <><p role="status">Fuente secundaria confirmada: {sourceLabel(source)}</p>
      <Button variant="outline" onClick={() => { credentials.clear(); onChange(undefined); setChanging(true); }}>Cambiar fuente secundaria</Button></>
      : <SecondarySourceDraft credentials={credentials} onConfirm={(next, columns) => { onChange(next, columns); setChanging(false); }} />}
    <p className="text-sm text-content-muted">Confirmar este origen no cambia la fuente principal. Los archivos son temporales; cancelar no elimina el archivo remoto.</p>
  </section>;
}
function SecondarySourceDraft({ credentials, onConfirm }: { credentials: CredentialStore; onConfirm: (source: SourceDescriptor, columns: string[]) => void }) {
  const { agentId } = usePipelineSession();
  const [kind, setKind] = useState("file");
  const file = useFileExtract(kind === "file"); const db = useDatabaseExtract(kind === "database", agentId);
  const model = kind === "file" ? file : db;
  return <div className="space-y-4">
    <Select label="Tipo de fuente secundaria" value={kind} onChange={e => { file.invalidate(); db.invalidate(); setKind(e.target.value); }}><option value="file">Archivo</option><option value="database">Base de datos</option></Select>
    {kind === "file" ? <><SourceFilePicker file={file.file} onSelect={file.select} /><Button variant="outline" isLoading={file.status === "pending"} disabled={!file.file} onClick={file.submit}>Procesar archivo secundario</Button></>
      : <>
        <DatabaseConnectionFields value={db.draft} errors={db.errors} onChange={db.edit} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={db.draft.use_agent} onChange={e => db.edit({ use_agent: e.target.checked })} />Usar agente local híbrido</label>
        {db.draft.use_agent && <HybridAgentInstructions agentId={agentId} {...db.agent} onRetry={db.agent.retry} />}
        <Button variant="outline" isLoading={db.connection.status === "pending"} disabled={!db.agentReady} onClick={db.connect}>Conectar y listar tablas</Button>
        {db.connection.error && <Alert title="No se pudo conectar" tone="error">{db.connection.error}</Alert>}
        {db.connection.status === "success" && <Select label="Tabla secundaria" value={db.table} onChange={e => db.selectTable(e.target.value)}>
          <option value="">Selecciona una tabla</option>{db.connection.result!.tables.map(name => <option key={name} value={name}>{name}</option>)}
        </Select>}
      </>}
    {model.error && <Alert title="No se pudo preparar el origen" tone="error">{model.error}</Alert>}
    {model.status === "success" && <p role="status">Origen procesado. Revisa y confirma la fuente secundaria.</p>}
    <Button disabled={model.status !== "success" || !model.result} onClick={() => {
      if (!model.result || model.status !== "success") return;
      const source = parseSource(model.result.source, credentials, true);
      credentials.retain(source.type === "database" ? [source.credentialRef] : []);
      onConfirm(source, model.result.columns ?? Object.keys(model.result.data.preview_data[0] ?? {}));
    }}>Confirmar fuente secundaria</Button>
  </div>;
}
