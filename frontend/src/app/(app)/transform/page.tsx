"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useDiagramCoordinator } from "@/features/diagram/DiagramCoordinator";
import { Alert, Button } from "@/components/ui";
import { CredentialRecoveryDialog } from "@/components/etl/CredentialRecoveryDialog";
import { sourceName } from "@/types/etlLabels";
import SourceBanner from "./components/SourceBanner";
import SidebarSteps from "./components/SidebarSteps";
import TablePreview from "./components/TablePreview";
import AddStepModal from "./components/AddStepModal";
import { useTransformPreview } from "./hooks/useTransformPreview";
import { useStepEditor } from "./hooks/useStepEditor";

export default function TransformPage() {
  const session = useTransformPreview(); const editor = useStepEditor();
  const diagram = useDiagramCoordinator();
  const setEditorOpen = diagram?.setEditorOpen;
  const editorOpen = !!editor.target;
  useEffect(() => { setEditorOpen?.(editorOpen); return () => setEditorOpen?.(false); }, [setEditorOpen, editorOpen]);
  const { source, recipe, preview } = session.state; const data = session.displayData;
  if (session.state.hydrationStatus === "hydrating") return <p role="status">Verificando configuración de la ETL…</p>;
  if (!source) return <section className="mx-auto max-w-xl space-y-4 rounded-xl border border-line bg-surface p-6 text-center">
    <h1 className="text-2xl font-bold">Paso Bloqueado: Transformación</h1><p>Primero extrae datos desde un archivo, una base de datos o una dimensión fecha.</p>
    <Link href="/extract" className="text-action underline">Configurar Origen de Datos</Link>
  </section>;
  return <div className="mx-auto min-w-0 max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold text-action">Paso 2 · Transformación</p><h1 className="mt-1 text-2xl font-bold">Diseñador de Recetas y Limpieza</h1>
        <p className="mt-2 text-sm text-content-muted">Los pasos se aplican en orden. Cada preview recalcula el dataset completo y muestra hasta 10 filas.</p></div>
      <Link href={session.isReadyForLoad ? "/load" : "#"} aria-disabled={!session.isReadyForLoad} onClick={e => { if (!session.isReadyForLoad) e.preventDefault(); }} className="rounded-lg bg-action px-4 py-2 text-on-action aria-disabled:opacity-50">Continuar a la Carga</Link>
    </header>
    <CredentialRecoveryDialog /><SourceBanner source={source} />
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!session.canTransform || preview.status === "loading" || session.state.execution?.status === "running"} onClick={session.refresh}>Actualizar vista previa</Button>
      <Button variant="outline" disabled={!editor.canUndo} onClick={editor.undo}>Deshacer última modificación</Button></div>
    {source.type === "file" && preview.error && <Alert title="Archivo temporal"><Link href="/extract" className="underline">vuelve a subir el archivo</Link> si ya no está disponible. La receta actual se conserva para su revisión hasta que confirmes otra fuente.</Alert>}
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <SidebarSteps steps={recipe} onAddStepClick={() => editor.open()} onEditStep={editor.open} onRemoveStep={editor.remove} onMoveStep={editor.move} disabled={editor.blocked} sourceType={source.type} sourceName={sourceName(source)} />
      <div className="min-w-0 space-y-3"><h2 className="text-lg font-bold">Vista Previa del Resultado</h2>
        <TablePreview columns={data?.columns ?? []} dtypes={data?.dtypes ?? {}} previewData={data?.preview_data ?? []} totalRows={data?.total_rows}
          loading={preview.status === "loading" || preview.status === "pending" && session.canTransform} stale={session.stale} hasResult={!!data} error={preview.error ?? null} />
      </div>
    </div>
    <AddStepModal isOpen={!!editor.target} onClose={editor.close} availableColumns={editor.schema.context.columns} dtypes={editor.schema.context.dtypes}
      initialStep={editor.target?.step} onAddStep={editor.add} onEditStep={editor.edit} contextStatus={editor.schema.status} contextError={editor.schema.error} onRetryContext={editor.retry} disabled={editor.blocked} />
  </div>;
}
