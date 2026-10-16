"use client";
import Link from "next/link";
import { CredentialRecoveryDialog } from "@/components/etl/CredentialRecoveryDialog";
import { Button, Modal } from "@/components/ui";
import { downloadLoadSummary, unknownLoadMessage } from "@/state/loadReport";
import { useLoadPipeline } from "./hooks/useLoadPipeline";
import { useTargetConnection } from "./hooks/useTargetConnection";
import TargetConfigForm from "./components/TargetConfigForm";
import LoadSettings from "./components/LoadSettings";
import ExecutionPanel from "./components/ExecutionPanel";
import LoadReport from "./components/LoadReport";
import SourceSchemaSummary from "./components/SourceSchemaSummary";

export default function LoadPage() {
  const load = useLoadPipeline(); const connection = useTargetConnection();
  const { session } = load;
  const { state, canTransform, isReadyForLoad } = session;
  const { source, recipe, preview, loadConfig, execution, report } = state;
  const running = execution?.status === "running";
  const recoveredUnknown = !execution && state.history.at(-1)?.status === "unknown";
  if (state.hydrationStatus === "hydrating") return <p role="status">Cargando sesión…</p>;
  if (!source) return <section className="mx-auto max-w-lg py-12 space-y-4">
    <h1 className="text-2xl font-bold">Paso Bloqueado: Carga y Persistencia</h1>
    <p>Define primero un origen. Puedes cargar con una receta vacía después de validar su preview.</p>
    <Link className="underline" href="/transform">Ir a Transformaciones</Link>
  </section>;
  return <div className="mx-auto max-w-7xl space-y-6">
    <header><h1 className="text-2xl font-bold">Carga y reporte de ejecución</h1><p className="text-content-muted">Configura el destino y revisa el resultado de cada intento.</p></header>
    <CredentialRecoveryDialog includeTarget />
    {preview.status === "error" && <div role="alert" className="text-danger"><p>{preview.error}</p>
      {source.type === "file" && <Link href="/extract" className="underline">Volver a subir el archivo temporal</Link>}
    </div>}
    {!isReadyForLoad && <p role="status">La carga requiere una vista previa correcta de la revisión actual.</p>}
    <Button variant="outline" disabled={!canTransform || running || preview.status === "loading"} onClick={() => void session.runPreview(1)}>Actualizar vista previa</Button>
    {report && execution?.status === "success" ? <LoadReport report={report} record={execution} onReset={session.newLoad} /> : <>
      {(execution?.status === "error" || execution?.status === "unknown" || recoveredUnknown) && <section role="alert" className="rounded-xl border border-line p-4 space-y-2">
        <h2 className="font-bold">{execution?.status === "error" ? "Solicitud rechazada (422)" : "Resultado desconocido"}</h2>
        {(execution?.status === "unknown" || recoveredUnknown) && <p>{unknownLoadMessage}</p>}
        {state.executionError && <p>{state.executionError}</p>}
        {execution && <Button variant="outline" onClick={() => downloadLoadSummary(execution)}>Descargar resumen JSON</Button>}
      </section>}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <fieldset disabled={running} className="min-w-0 space-y-6 lg:col-span-2">
          <TargetConfigForm connection={connection} />
          <LoadSettings config={loadConfig} onChange={session.setLoadConfig} availableColumns={preview.data?.columns || []}
            rows={state.foreignKeys} onRowsChange={rows => session.dispatch({ type: "foreignKeys", rows })} />
        </fieldset>
        <div className="min-w-0 space-y-6">
          <SourceSchemaSummary data={preview.data} current={isReadyForLoad} />
          {load.unknown && <label className="flex gap-2 text-sm"><input type="checkbox" checked={load.reviewedUnknown} disabled={running} onChange={e => load.setReviewedUnknown(e.target.checked)} />He revisado la tabla destino antes de repetir esta carga.</label>}
          <ExecutionPanel canExecute={session.canExecuteLoad && (!load.unknown || load.reviewedUnknown)} recipeLength={recipe.length} execution={execution} onExecute={() => void load.begin()} />
          {load.error && <p role="alert" className="text-danger">{load.error}</p>}
        </div>
      </div>
    </>}
    <Modal open={!!load.approval} onClose={load.cancel} title="Confirmar reemplazo de tabla" footer={<>
      <Button variant="outline" onClick={load.cancel}>Cancelar</Button><Button variant="destructive" onClick={() => void load.confirm()}>Confirmar reemplazo</Button>
    </>}>
      <p>Se reemplazará la tabla <strong>{load.approval?.config.table_name}</strong> en <strong className="break-all">{state.target?.database} · {state.target?.host}{state.target?.port ? `:${state.target.port}` : ""} · {state.target?.db_type}{state.target?.service_name ? ` · ${state.target.service_name}` : ""}</strong>.</p>
      <p>Se eliminarán los datos existentes de esta tabla.</p>
      {preview.data?.total_rows === 0 && <p className="mt-3 font-bold text-danger">El resultado contiene 0 filas. Confirmar puede vaciar la tabla destino.</p>}
    </Modal>
  </div>;
}
