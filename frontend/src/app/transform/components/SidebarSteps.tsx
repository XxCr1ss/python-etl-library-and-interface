"use client";

import { Trash2, Plus, Play, Settings } from "lucide-react";

interface Step {
  type: string;
  params: Record<string, unknown>;
}

interface SidebarStepsProps {
  steps: Step[];
  onRemoveStep: (index: number) => void;
  onAddStepClick: () => void;
  sourceType: "file" | "database";
  sourceName: string;
}

export default function SidebarSteps({
  steps,
  onRemoveStep,
  onAddStepClick,
  sourceType,
  sourceName,
}: SidebarStepsProps) {
  
  const getStepDetails = (step: Step) => {
    const { type, params } = step;
    switch (type) {
      case "rename_columns":
        const mappings = Object.entries((params.columns as Record<string, string>) || {})
          .map(([k, v]) => `${k} → ${v}`)
          .join(", ");
        return {
          title: "Renombrar Columnas",
          desc: mappings || "Ningún cambio configurado",
        };
      case "convert_types":
        const cols = Array.isArray(params.columns)
          ? (params.columns as string[]).join(", ")
          : String(params.columns || "");
        return {
          title: "Cambiar Tipo de Datos",
          desc: `${cols} a ${params.dtype as string}`,
        };
      case "fill_nulls":
        return {
          title: "Rellenar Nulos",
          desc: `Rellenar '${params.column as string}' con "${params.value as string}"`,
        };
      case "select_columns":
        const keepCols = Array.isArray(params.columns) ? (params.columns as string[]).join(", ") : "";
        return {
          title: "Seleccionar Columnas",
          desc: `Mantener: ${keepCols}`,
        };
      case "remove_columns":
        const dropCols = Array.isArray(params.columns)
          ? (params.columns as string[]).join(", ")
          : String(params.columns || "");
        return {
          title: "Eliminar Columnas",
          desc: `Quitar: ${dropCols}`,
        };
      case "group_by":
        const byCols = Array.isArray(params.by) ? (params.by as string[]).join(", ") : String(params.by || "");
        return {
          title: "Agrupar y Promediar",
          desc: `Agrupar por '${byCols}' y promediar '${params.column as string}'`,
        };
      case "filter_value":
        const opLabels: Record<string, string> = {
          eq: "=",
          ne: "!=",
          gt: ">",
          ge: ">=",
          lt: "<",
          le: "<=",
        };
        const opKey = typeof params.operator === "string" ? params.operator : "eq";
        const op = opLabels[opKey] || "=";
        return {
          title: "Filtrar por Valor",
          desc: `Filtrar '${params.column as string}' ${op} "${params.value as string}"`,
        };
      case "split_column":
        return {
          title: "Dividir Columna",
          desc: `Dividir '${params.column as string}' por "${params.delimiter as string}"`,
        };
      default:
        return {
          title: "Operación Personalizada",
          desc: JSON.stringify(params),
        };
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[calc(100vh-16rem)]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          Pasos del Pipeline
        </h3>
        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-full">
          {steps.length + 1} {steps.length + 1 === 1 ? "paso" : "pasos"}
        </span>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 relative">
        {/* Timeline bar indicator */}
        <div className="absolute left-[1.375rem] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800 pointer-events-none" />

        {/* Step 0: Initial Extract */}
        <div className="relative flex gap-4 animate-in fade-in duration-300">
          <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-md z-10 shrink-0">
            <Play className="w-4 h-4 fill-white" />
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Origen</p>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              Extracción Original
            </h4>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {sourceType === "file" ? `Archivo: ${sourceName}` : `Tabla DB: ${sourceName}`}
            </p>
          </div>
        </div>

        {/* Recipe Steps */}
        {steps.map((step, index) => {
          const { title, desc } = getStepDetails(step);
          return (
            <div key={index} className="relative flex gap-4 group animate-in slide-in-from-bottom-2 duration-300">
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border-4 border-white dark:border-slate-900 group-hover:border-blue-500/20 shadow z-10 shrink-0 transition-colors">
                <span className="text-xs font-bold font-mono">{index + 1}</span>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={desc}>
                      {desc}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveStep(index)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100 absolute top-3 right-3 animate-in fade-in duration-200"
                    title="Eliminar este paso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Step Button */}
      <button
        onClick={onAddStepClick}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Plus className="w-4 h-4" />
        Agregar Transformación
      </button>
    </div>
  );
}
