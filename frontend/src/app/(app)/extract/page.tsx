"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Tabs } from "@/components/ui";
import { SourceSummary } from "@/components/etl/SourceSummary";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { useFileExtract } from "./hooks/useFileExtract";
import { useDatabaseExtract } from "./hooks/useDatabaseExtract";
import { useDateDimensionExtract } from "./hooks/useDateDimensionExtract";
import { FileUploadTab } from "./components/FileUploadTab";
import { DatabaseTab } from "./components/DatabaseTab";
import { DateDimensionTab } from "./components/DateDimensionTab";
import { ExtractPreviewSection } from "./components/ExtractPreviewSection";

type Tab = "file" | "database" | "date_dimension";
export default function ExtractPage() {
  const router = useRouter();
  const session = usePipelineSession();
  const [activeTab, setActiveTab] = useState<Tab>("file");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const file = useFileExtract(activeTab === "file");
  const database = useDatabaseExtract(activeTab === "database", session.agentId);
  const date = useDateDimensionExtract(activeTab === "date_dimension");
  const current = { file, database, date_dimension: date }[activeTab];
  const blocked = session.state.execution?.status === "running" || session.state.hydrationStatus === "hydrating" || session.state.recoveryRequired;
  function changeTab(id: string) {
    if (id === activeTab) return;
    current.invalidate(); setConfirmationError(null); setActiveTab(id as Tab);
  }
  function confirm() {
    if (blocked || current.status !== "success" || !current.result) return;
    const previous = session.state.source;
    if (previous && !window.confirm(`Confirmar «${current.result.label}» reemplazará la fuente activa y descartará ${session.state.recipe.length} pasos, la preview y la configuración de carga. ¿Continuar?`)) return;
    try {
      if (session.confirmSource(current.result.source)) router.push("/transform");
    } catch { setConfirmationError("La configuración del origen es inválida. Revisa los campos y genera de nuevo su vista previa."); }
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-sm font-semibold text-action">Paso 1 · Origen</p><h1 className="mt-1 text-2xl font-bold text-content">Extracción de Datos</h1>
      <p className="mt-2 text-content-muted">Conecta una base de datos, sube un archivo o genera una dimensión fecha. Revisa la muestra antes de confirmar.</p></header>
    <SourceSummary source={session.state.source} />
    {confirmationError && <Alert tone="error" title="No se pudo confirmar">{confirmationError}</Alert>}
    {blocked && <Alert title="Confirmación no disponible">Espera a que termine la ejecución o recupera la sesión para cambiar el origen.</Alert>}
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
      <Tabs label="Tipo de origen" selectedId={activeTab} onChange={changeTab} items={[
        { id: "file", label: "Archivo Local", content: <FileUploadTab model={file} /> },
        { id: "database", label: "Base de Datos Relacional", content: <DatabaseTab model={database} agentId={session.agentId} /> },
        { id: "date_dimension", label: "Dimensión Temporal (Fecha)", content: <DateDimensionTab model={date} /> },
      ]} />
      <ExtractPreviewSection status={current.status} error={current.error} rows={current.result?.data.preview_data}
        columns={current.result?.columns}
        count={current.result?.count} label={current.result?.label} disabled={blocked} onContinue={confirm} />
    </div>
  </div>;
}
