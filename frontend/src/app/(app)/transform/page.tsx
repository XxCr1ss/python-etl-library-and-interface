"use client";

import { useState, useEffect } from "react";
import { Lock, ArrowRight, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

import SourceBanner from "./components/SourceBanner";
import SidebarSteps from "./components/SidebarSteps";
import TablePreview from "./components/TablePreview";
import AddStepModal from "./components/AddStepModal";

interface EtlSource {
  type: "file" | "database";
  filename?: string;
  filepath?: string;
  unique_filename?: string;
  total_rows?: number;
  db_type?: string;
  host?: string;
  database?: string;
  table_name?: string;
}

interface Step {
  type: string;
  params: Record<string, unknown>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function TransformPage() {
  
  // Storage States
  const [source, setSource] = useState<EtlSource | null>(null);
  const [recipe, setRecipe] = useState<Step[]>([]);
  const [checkingSource, setCheckingSource] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Transformation engine states
  const [columns, setColumns] = useState<string[]>([]);
  const [dtypes, setDtypes] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePreview = async (activeSource: EtlSource | null, currentRecipe: Step[]) => {
    if (!activeSource) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/transform/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: activeSource,
          steps: currentRecipe,
          limit: 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al procesar la receta de transformación");
      }

      setColumns(data.columns || []);
      setDtypes(data.dtypes || {});
      setPreviewData(data.preview_data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el motor de transformación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedSource = sessionStorage.getItem("etl_active_source");
    if (storedSource) {
      const parsedSource = JSON.parse(storedSource);
      setSource(parsedSource);
      
      const storedRecipe = sessionStorage.getItem("etl_transform_recipe");
      const parsedRecipe = storedRecipe ? JSON.parse(storedRecipe) : [];
      setRecipe(parsedRecipe);
      
      // Load initial preview
      updatePreview(parsedSource, parsedRecipe);
    }
    setCheckingSource(false);
  }, []);

  const handleAddStep = (newStep: Step) => {
    const updated = [...recipe, newStep];
    setRecipe(updated);
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify(updated));
    updatePreview(source, updated);
  };

  const handleRemoveStep = (indexToRemove: number) => {
    const updated = recipe.filter((_, idx) => idx !== indexToRemove);
    setRecipe(updated);
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify(updated));
    updatePreview(source, updated);
  };

  if (checkingSource) {
    return (
      <div className="max-w-4xl mx-auto h-[80vh] flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Verificando configuración de la ETL...</p>
      </div>
    );
  }

  // Lock Feedback screen
  if (!source) {
    return (
      <div className="max-w-md mx-auto h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative">
          <div className="absolute inset-0 bg-red-500/10 dark:bg-red-500/5 rounded-3xl blur-xl" />
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          Paso Bloqueado: Transformación
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
          Para definir la receta de transformación y limpiar los registros, primero debes extraer datos desde un archivo o base de datos.
        </p>
        <Link 
          href="/extract"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm"
        >
          Configurar Origen de Datos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-500 font-medium">
            <span>ETL Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-500 font-semibold">Transformación</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Diseñador de Recetas y Limpieza
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aplica pasos secuenciales y observa los cambios en vivo sobre la muestra.
          </p>
        </div>
        <Link 
          href="/load"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors font-semibold text-sm shadow-sm"
        >
          Continuar a la Carga <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Source Metadata Banner */}
      <SourceBanner source={source} />

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recipes timeline */}
        <div className="lg:col-span-1">
          <SidebarSteps
            steps={recipe}
            onRemoveStep={handleRemoveStep}
            onAddStepClick={() => setIsModalOpen(true)}
            sourceType={source.type}
            sourceName={(source.type === "file" ? source.filename : source.table_name) || "Sin nombre"}
          />
        </div>

        {/* Right Column: Grid Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Vista Previa del Resultado
              </span>
            </div>
            <span className="text-[10px] bg-slate-200/60 text-slate-605 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-medium">
              Límite: 10 filas de muestra
            </span>
          </div>

          <TablePreview
            columns={columns}
            dtypes={dtypes}
            previewData={previewData}
            loading={loading}
            error={error}
          />
        </div>
      </div>

      {/* Add Step Dialog */}
      <AddStepModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableColumns={columns}
        onAddStep={handleAddStep}
      />
    </div>
  );
}
