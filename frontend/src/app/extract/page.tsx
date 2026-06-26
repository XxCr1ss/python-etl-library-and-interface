"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Database, 
  UploadCloud, 
  CheckCircle2,
  Table as TableIcon,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  Calendar
} from "lucide-react";

type Tab = "file" | "database" | "date_dimension";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ExtractPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Estados de Base de Datos
  const [dbType, setDbType] = useState("postgresql");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("5432");
  const [database, setDatabase] = useState("colombia_saludable");
  const [user, setUser] = useState("postgres");
  const [password, setPassword] = useState("");
  const [serviceName, setServiceName] = useState("");

  // Estados de Agente Local Híbrido
  const [useAgent, setUseAgent] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [filepath, setFilepath] = useState<string | null>(null);
  const [uniqueFilename, setUniqueFilename] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados de Dimensión Fecha
  const [startYear, setStartYear] = useState<string>(String(new Date().getFullYear() - 5));
  const [endYear, setEndYear] = useState<string>(String(new Date().getFullYear()));

  // Inicializar Agent ID en montaje cliente
  useEffect(() => {
    let savedId = localStorage.getItem("etl_agent_id");
    if (!savedId) {
      savedId = `agent-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("etl_agent_id", savedId);
    }
    setAgentId(savedId);
  }, []);

  // Poll de estado del agente
  useEffect(() => {
    if (!useAgent || !agentId) {
      setAgentConnected(null);
      return;
    }

    let active = true;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/extract/agent/status/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setAgentConnected(data.connected);
          }
        }
      } catch {
        if (active) {
          setAgentConnected(false);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [useAgent, agentId]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewData(null);
    setIsPreviewing(false);
  };

  // Enviar archivo al backend
  const handleFileUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewData(null);
    setIsPreviewing(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/extract/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al procesar el archivo");
      }

      setFilename(data.filename);
      setFilepath(data.filepath);
      setUniqueFilename(data.unique_filename);
      setTotalRows(data.total_rows);
      setPreviewData(data.preview_data);
      setIsPreviewing(true);
      setSuccessMsg("Archivo procesado exitosamente para vista previa.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  // Conectar base de datos y listar tablas
  const handleDatabaseConnect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTables([]);
    setSelectedTable("");
    setPreviewData(null);
    setIsPreviewing(false);

    const reqBody = {
      db_type: dbType,
      host: host,
      port: port ? parseInt(port) : null,
      database: database,
      user: user,
      password: password,
      service_name: serviceName || null,
      use_agent: useAgent,
      agent_id: useAgent ? agentId : null
    };

    try {
      const res = await fetch(`${API_URL}/extract/database`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(reqBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al conectar con la base de datos");
      }

      setTables(data.tables || []);
      setSuccessMsg(`Conectado exitosamente. Se encontraron ${data.tables?.length || 0} tablas.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar vista previa de una tabla de base de datos
  const handleTablePreview = async (tableName: string) => {
    if (!tableName) {
      setSelectedTable("");
      setPreviewData(null);
      setIsPreviewing(false);
      return;
    }
    
    setSelectedTable(tableName);
    setIsLoading(true);
    setErrorMsg(null);
    setPreviewData(null);
    setIsPreviewing(false);

    const reqBody = {
      db_type: dbType,
      host: host,
      port: port ? parseInt(port) : null,
      database: database,
      user: user,
      password: password,
      table_name: tableName,
      service_name: serviceName || null,
      use_agent: useAgent,
      agent_id: useAgent ? agentId : null
    };

    try {
      const res = await fetch(`${API_URL}/extract/database/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(reqBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al obtener vista previa de la tabla");
      }

      setPreviewData(data.preview_data || []);
      setTotalRows(data.total_rows || 0);
      setFilename(tableName);
      setIsPreviewing(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al cargar vista previa");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateDimensionGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsPreviewing(false);

    try {
      const res = await fetch(`${API_URL}/extract/date-dimension/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start_year: parseInt(startYear),
          end_year: parseInt(endYear)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al generar la dimensión fecha");
      }

      setPreviewData(data.preview_data || []);
      setTotalRows(data.total_rows || 0);
      setFilename(`dim_fecha_${startYear}_to_${endYear}`);
      setIsPreviewing(true);
      setSuccessMsg(data.message || "Dimensión de fechas generada correctamente.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al generar la dimensión fecha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToTransform = () => {
    if (activeTab === "file") {
      if (!filepath || !filename) return;
      const source = {
        type: "file",
        filepath: filepath,
        filename: filename,
        unique_filename: uniqueFilename,
        total_rows: totalRows
      };
      sessionStorage.setItem("etl_active_source", JSON.stringify(source));
      sessionStorage.setItem("etl_transform_recipe", JSON.stringify([]));
      router.push("/transform");
    } else if (activeTab === "database") {
      if (!selectedTable) return;
      const source = {
        type: "database",
        db_type: dbType,
        host: host,
        port: port ? parseInt(port) : null,
        database: database,
        user: user,
        password: password,
        table_name: selectedTable,
        service_name: serviceName || null,
        total_rows: totalRows,
        use_agent: useAgent,
        agent_id: useAgent ? agentId : null
      };
      sessionStorage.setItem("etl_active_source", JSON.stringify(source));
      sessionStorage.setItem("etl_transform_recipe", JSON.stringify([]));
      router.push("/transform");
    } else {
      const source = {
        type: "date_dimension",
        start_year: parseInt(startYear),
        end_year: parseInt(endYear),
        total_rows: totalRows
      };
      sessionStorage.setItem("etl_active_source", JSON.stringify(source));
      sessionStorage.setItem("etl_transform_recipe", JSON.stringify([]));
      router.push("/transform");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Extracción de Datos</h1>
        <p className="text-slate-500">Conecta orígenes de datos relacionales o sube archivos estructurados para iniciar el proceso ETL.</p>
      </div>

      {/* Alertas de Feedback */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Ocurrió un error</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Operación exitosa</span>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Tabs Header */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-8 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleTabChange("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              activeTab === "file" 
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Archivo Local
          </button>
          <button
            onClick={() => handleTabChange("database")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              activeTab === "database" 
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            Base de Datos Relacional
          </button>
          <button
            onClick={() => handleTabChange("date_dimension")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              activeTab === "date_dimension" 
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Dimensión Temporal (Fecha)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {activeTab === "file" && (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Haz clic para subir un archivo</h3>
                <p className="text-xs text-slate-500">o arrastra y suelta aquí (Soporta .csv, .xlsx, .xls)</p>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setIsPreviewing(false);
                      setPreviewData(null);
                    }
                  }}
                />
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    disabled={isLoading}
                    className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleFileUpload}
                  >
                    {isLoading && (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-white"></span>
                    )}
                    Procesar Archivo
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "database" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Opción de Agente Local Híbrido */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Agente Local Híbrido
                      </h4>
                      <p className="text-xs text-slate-500">
                        Conecta a bases de datos locales (localhost) de forma segura y sin abrir puertos.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAgent}
                      onChange={(e) => {
                        setUseAgent(e.target.checked);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {useAgent && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-medium text-slate-500">Estado del Túnel:</span>
                      <div className="flex items-center gap-2">
                        {agentConnected === null ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                            Comprobando...
                          </span>
                        ) : agentConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            🟢 Agente Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                            🔴 Agente Desconectado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Instrucciones */}
                    <div className="text-xs space-y-2">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Instrucciones de ejecución:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                        <li>Asegúrate de tener instalado <code>websockets</code> ejecutando <code>pip install websockets</code>.</li>
                        <li>Ejecuta el agente local en la terminal de tu PC:</li>
                      </ol>
                      
                      <div className="relative mt-2 bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] group border border-slate-800">
                        <div className="overflow-x-auto whitespace-pre">
                          {`python etl_agent.py`}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("python etl_agent.py");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Copiar comando"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg space-y-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                        <p className="font-semibold">Parámetros requeridos cuando el script los solicite:</p>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-mono text-slate-400">URL Backend:</span>
                          <span className="col-span-2 font-mono break-all">{API_URL.replace("/api/v1", "")}</span>
                          <span className="font-mono text-slate-400">ID Agente:</span>
                          <span className="col-span-2 font-mono select-all bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-bold text-blue-800 dark:text-blue-200">{agentId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Motor de Base de Datos</label>
                  <select 
                    value={dbType}
                    onChange={(e) => {
                      setDbType(e.target.value);
                      if (e.target.value === "postgresql") setPort("5432");
                      else if (e.target.value === "mysql") setPort("3306");
                      else if (e.target.value === "oracle") setPort("1521");
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Host</label>
                  <input 
                    type="text" 
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Puerto</label>
                  <input 
                    type="text" 
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="5432" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre de Base de Datos</label>
                  <input 
                    type="text" 
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="colombia_saludable" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Usuario</label>
                  <input 
                    type="text" 
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="postgres" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                {dbType === "oracle" && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre de Servicio Oracle (SID/Service Name)</label>
                    <input 
                      type="text" 
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="xe" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={handleDatabaseConnect}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></span>
                  )}
                  Conectar y Listar Tablas
                </button>
              </div>

              {tables.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 rounded-lg animate-in fade-in duration-300">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Selecciona una tabla para previsualizar:
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => handleTablePreview(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Tabla --</option>
                    {tables.map((tbl) => (
                      <option key={tbl} value={tbl}>{tbl}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === "date_dimension" && (
            <div className="space-y-6 max-w-2xl mx-auto p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Generador de Dimensión Temporal
                  </h4>
                  <p className="text-xs text-slate-500">
                    Crea un dataset maestro de fechas con año, mes, día, semana, trimestre y festivos colombianos.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Año de Inicio</label>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    min="1900"
                    max="2100"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Año de Fin</label>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    min="1900"
                    max="2100"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleDateDimensionGenerate}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  Generar Dimensión Temporal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Preview Section */}
      {isPreviewing && previewData && previewData.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TableIcon className="w-4 h-4 text-slate-500 text-blue-500" />
              Vista Previa de Datos: <span className="text-blue-600 dark:text-blue-400 font-mono">{filename}</span>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
              Listo para transformar
            </span>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {Object.keys(previewData[0]).map((key) => (
                    <th key={key} className="px-6 py-3 font-medium">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {previewData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {Object.values(row as Record<string, unknown>).map((val: unknown, idx) => (
                      <td key={idx} className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {val === null || val === undefined ? (
                          <span className="text-slate-400 italic">null</span>
                        ) : typeof val === 'boolean' ? (
                          val ? 'true' : 'false'
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Mostrando {previewData.length} de {totalRows} registros extraídos
            </span>
            <button 
              onClick={handleContinueToTransform}
              className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              Continuar a Transformación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
