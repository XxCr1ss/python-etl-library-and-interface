"use client";

import { useState, useEffect } from "react";
import { Lock, ArrowLeft, RefreshCw, ChevronRight, XCircle } from "lucide-react";
import Link from "next/link";

import TargetConfigForm, { TargetConfig } from "./components/TargetConfigForm";
import LoadSettings, { LoadConfig } from "./components/LoadSettings";
import ExecutionPanel from "./components/ExecutionPanel";
import LoadReport, { LoadReportData } from "./components/LoadReport";

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

export default function LoadPage() {
  // Source & Recipe from session
  const [source, setSource] = useState<EtlSource | null>(null);
  const [recipe, setRecipe] = useState<Step[]>([]);
  const [checkingSource, setCheckingSource] = useState(true);

  // Schema state (columns)
  const [columns, setColumns] = useState<string[]>([]);

  // Database Connection state
  const [targetConfig, setTargetConfig] = useState<TargetConfig>({
    db_type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "carga_colombia",
    user: "postgres",
    password: "",
  });
  const [targetConnected, setTargetConnected] = useState(false);

  // Load configuration state
  const [loadConfig, setLoadConfig] = useState<LoadConfig>({
    table_name: "",
    table_type: "dimension",
    if_exists: "replace",
  });

  // Loading Execution & Report states
  const [executing, setExecuting] = useState(false);
  const [loadReport, setLoadReport] = useState<LoadReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the final transformed schema to populate FK drop downs
  const fetchTransformedSchema = async (activeSource: EtlSource, currentRecipe: Step[]) => {
    try {
      const res = await fetch(`${API_URL}/transform/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: activeSource,
          steps: currentRecipe,
          limit: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || []);
      }
    } catch (err) {
      console.error("Error fetching schema preview:", err);
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
      
      // Fetch current column schema
      fetchTransformedSchema(parsedSource, parsedRecipe);
    }
    setCheckingSource(false);
  }, []);

  const handleExecuteLoad = async () => {
    if (!source || !targetConnected) return;

    setExecuting(true);
    setError(null);
    setLoadReport(null);

    try {
      const payload = {
        source,
        target_connection: {
          db_type: targetConfig.db_type,
          host: targetConfig.host || "localhost",
          port: targetConfig.port,
          database: configDatabaseName(targetConfig.database),
          user: targetConfig.user,
          password: targetConfig.password || "",
          ...(targetConfig.db_type === "oracle" && targetConfig.service_name ? { service_name: targetConfig.service_name } : {}),
        },
        load_config: {
          table_name: loadConfig.table_name,
          table_type: loadConfig.table_type,
          if_exists: loadConfig.if_exists,
          ...(loadConfig.table_type === "fact" && loadConfig.foreign_keys ? { foreign_keys: loadConfig.foreign_keys } : {}),
        },
        recipe,
      };

      const res = await fetch(`${API_URL}/load/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Fallo al ejecutar el pipeline de carga.");
      }

      setLoadReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado al procesar la carga.");
    } finally {
      setExecuting(false);
    }
  };

  const configDatabaseName = (db: string) => {
    return db.trim();
  };

  const handleReset = () => {
    setLoadReport(null);
    setError(null);
    setTargetConnected(false);
    setLoadConfig({
      table_name: "",
      table_type: "dimension",
      if_exists: "replace",
    });
  };

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
            Origen: <span className="font-semibold text-blue-500">{source.type === "file" ? "Archivo" : "DB"}</span>
          </span>

          <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-205/60 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${targetConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            Bodega: <span className={`font-semibold ${targetConnected ? "text-emerald-500" : "text-rose-500"}`}>
              {targetConnected ? "Conectado" : "Desconectado"}
            </span>
          </span>
        </div>
      </div>

      {loadReport ? (
        /* Report Panel */
        <LoadReport report={loadReport} onReset={handleReset} />
      ) : (
        /* Design Panel (Config & Action) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Formularios (Columna de la Izquierda) */}
          <div className="lg:col-span-2 space-y-6">
            <TargetConfigForm
              config={targetConfig}
              onChange={setTargetConfig}
              onConnectionStatusChange={setTargetConnected}
            />

            <LoadSettings
              config={loadConfig}
              onChange={setLoadConfig}
              availableColumns={columns}
            />
          </div>

          {/* Panel de Ejecución (Columna de la Derecha) */}
          <div className="lg:col-span-1 space-y-6">
            <ExecutionPanel
              hasSource={!!source}
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
