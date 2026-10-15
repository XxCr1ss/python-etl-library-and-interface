"use client";

import { useState, useEffect } from "react";
import { Lock, ArrowLeft, RefreshCw, ChevronRight, XCircle } from "lucide-react";
import Link from "next/link";

import TargetConfigForm from "./components/TargetConfigForm";
import LoadSettings from "./components/LoadSettings";
import ExecutionPanel from "./components/ExecutionPanel";
import LoadReport from "./components/LoadReport";

import { usePipelinePreview } from "@/hooks/usePipelineSession";
import { CredentialRecoveryDialog } from "@/components/etl/CredentialRecoveryDialog";
import type { TargetConnectionDto } from "@/types/etl";

export default function LoadPage() {
  const session = usePipelinePreview(1);
  const { source, recipe, loadConfig, report: loadReport, preview } = session.state;
  const checkingSource = session.state.hydrationStatus === "hydrating";
  const columns = preview.data?.columns ?? [];
  const [targetConfig, setTargetDraft] = useState<Omit<TargetConnectionDto, "password"> & { password?: string }>({ db_type: "postgresql", host: "localhost", port: 5432, database: "base_de_destino", user: "postgres" });
  const { target, credentialVersion, hydrationStatus } = session.state;
  const { credentials } = session;
  useEffect(() => {
    if (hydrationStatus === "hydrating" || !target) return;
    setTargetDraft({ ...target, password: credentials.has(target.credentialRef) ? credentials.get(target.credentialRef) : undefined });
  }, [hydrationStatus, target, credentialVersion, credentials]);
  const targetDraftValid = (config: typeof targetConfig) => [config.host, config.database, config.user].every(x => !!x.trim()) &&
    (config.port === undefined || config.port === null || (Number.isInteger(config.port) && config.port > 0 && config.port <= 65535));
  const setTargetConfig = (config: typeof targetConfig) => {
    setTargetDraft(config);
    if (targetDraftValid(config)) session.setTarget(config);
    else session.dispatch({ type: "targetInvalidated" });
  };
  const setLoadConfig = session.setLoadConfig;
  const targetConnected = session.state.targetCheckedVersion !== null && session.state.targetCheckedVersion === session.state.targetVersion;
  const executing = session.state.execution?.status === "running";
  const [error, setError] = useState<string | null>(null);
  const handleExecuteLoad = async () => {
    setError(null);
    try { await session.runLoad(); } catch (err) { setError(err instanceof Error ? err.message : "Error al ejecutar la carga."); }
  };
  const handleReset = () => { session.dispatch({ type: "clearReport" }); setError(null); };

  if (checkingSource) {
    return (
      <div className="max-w-4xl mx-auto h-[80vh] flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Cargando módulo de persistencia...</p>
      </div>
    );
  }

  // Lock screen if no source has been set
  if (!source) {
    return (
      <div className="max-w-md mx-auto h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative">
          <div className="absolute inset-0 bg-red-500/10 dark:bg-red-500/5 rounded-3xl blur-xl" />
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          Paso Bloqueado: Carga y Persistencia
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
          Para persistir datos en la Bodega de Datos de destino, primero debes definir un origen de datos activo y aplicar las transformaciones deseadas.
        </p>
        <Link 
          href="/transform"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm"
        >
          Ir a Transformaciones <ArrowLeft className="w-4 h-4 rotate-180" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>ETL Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-500 font-semibold font-sans">Carga y Persistencia</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Persistencia en Bodega de Datos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configura el destino, valida llaves foráneas y ejecuta el commit final.
          </p>
        </div>

        {/* Semáforos / Badges de Conexión */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-205/60 dark:border-slate-700">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Origen: <span className="font-semibold text-blue-500">{source.type === "file" ? "Archivo" : source.type === "database" ? "DB" : "Fecha"}</span>
          </span>

          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-205/60 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${targetConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            Bodega: <span className={`font-semibold ${targetConnected ? "text-emerald-500" : "text-rose-500"}`}>
              {targetConnected ? "Conectado" : "Desconectado"}
            </span>
          </span>
        </div>
      </div>

      <CredentialRecoveryDialog includeTarget />
      {preview.error && <p role="alert">{preview.error}</p>}
      {!session.isReadyForLoad && <p role="status">La carga requiere una vista previa correcta de la revisión actual.</p>}
      <button className="underline text-sm" disabled={!session.canTransform || executing || preview.status === "loading"} onClick={() => void session.runPreview(1)}>Actualizar vista previa</button>
      {loadReport ? (
        /* Report Panel */
        <LoadReport report={loadReport} onReset={handleReset} />
      ) : (
        /* Design Panel (Config & Action) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Formularios (Columna de la Izquierda) */}
          <fieldset disabled={executing} className="lg:col-span-2 space-y-6">
            <TargetConfigForm
              config={targetConfig}
              onChange={setTargetConfig}
              onTestConnection={() => {
                if (!targetDraftValid(targetConfig)) return Promise.reject(new Error("Completa los campos del destino."));
                return session.testTarget();
              }}
              connectionVersion={session.state.targetVersion}
            />

            <LoadSettings
              key={session.state.revision}
              config={loadConfig}
              onChange={setLoadConfig}
              availableColumns={columns}
            />
          </fieldset>

          {/* Panel de Ejecución (Columna de la Derecha) */}
          <div className="lg:col-span-1 space-y-6">
            <ExecutionPanel
              hasSource={!!source}
              canExecute={session.canExecuteLoad}
              recipeLength={recipe.length}
              targetConnected={targetConnected}
              executing={executing}
              onExecute={handleExecuteLoad}
            />

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300 animate-in shake duration-300">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Fallo en la Ejecución</p>
                  <p className="text-xs opacity-90 leading-relaxed font-sans">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
