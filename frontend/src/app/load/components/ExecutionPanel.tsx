"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Sparkles, Database, FileSpreadsheet } from "lucide-react";

interface ExecutionPanelProps {
  hasSource: boolean;
  recipeLength: number;
  targetConnected: boolean;
  executing: boolean;
  onExecute: () => void;
}

const loadingMessages = [
  "Conectando a las fuentes activas...",
  "Leyendo y parseando datos de origen...",
  "Aplicando receta de transformaciones en el motor...",
  "Verificando esquemas y tipos de datos...",
  "Estableciendo canal seguro con la Bodega de Datos...",
  "Validando integridad de claves foráneas preventiva...",
  "Filtros de integridad activos... Cargando registros...",
  "Persistiendo registros físicamente en la Bodega...",
  "Generando reporte de auditoría final...",
];

export default function ExecutionPanel({
  hasSource,
  recipeLength,
  targetConnected,
  executing,
  onExecute,
}: ExecutionPanelProps) {
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Dynamic progress message rotation when executing
  useEffect(() => {
    if (!executing) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [executing]);

  return (
    <div className="space-y-6">
      {/* Pre-requisites Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Verificación de Pre-requisitos
        </h3>

        <div className="space-y-3">
          {/* Prerequisite 1: Source */}
          <div className="flex items-start justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              {hasSource ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-250">Origen de Datos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {hasSource ? "Fuente activa cargada en caché." : "Debes seleccionar un origen de datos primero."}
                </p>
              </div>
            </div>
            {hasSource && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-full flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                Listo
              </span>
            )}
          </div>

          {/* Prerequisite 2: Recipe */}
          <div className="flex items-start justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-250">Estrategia de Transformación</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {recipeLength > 0
                    ? `Se aplicarán ${recipeLength} paso(s) de transformación.`
                    : "Carga directa (sin pasos de transformación en cola)."}
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold rounded-full flex items-center gap-1 font-mono">
              {recipeLength} pasos
            </span>
          </div>

          {/* Prerequisite 3: Target Connection */}
          <div className="flex items-start justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              {targetConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-250">Conexión a Bodega de Datos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {targetConnected
                    ? "Conexión a Bodega de Datos verificada con éxito."
                    : "Verificación de conexión requerida."}
                </p>
              </div>
            </div>
            {targetConnected ? (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-full flex items-center gap-1">
                <Database className="w-3 h-3" />
                Validado
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold rounded-full">
                Pendiente
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <button
            onClick={onExecute}
            disabled={!targetConnected || executing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Ejecutando Pipeline...
              </>
            ) : (
              <>
                Iniciar Carga en Bodega de Datos
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screen Blocking Overlay */}
      {executing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-slate-800 border-b-indigo-500 animate-spin [animation-direction:reverse]" />
            <Database className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Ejecutando Ingesta de Datos
          </h2>
          
          <div className="h-6 mt-3">
            <p className="text-sm text-slate-400 font-medium animate-in slide-in-from-bottom-2 duration-300">
              {loadingMessages[loadingMessageIndex]}
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-sm mt-8 leading-relaxed">
            Por favor, mantén esta ventana abierta. El motor de transformaciones está compilando los registros y aplicando las validaciones referenciales antes de guardar.
          </p>
        </div>
      )}
    </div>
  );
}
