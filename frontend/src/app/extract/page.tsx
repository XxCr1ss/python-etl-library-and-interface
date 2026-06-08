"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Database, 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2,
  Table as TableIcon,
  AlertCircle
} from "lucide-react";
import clsx from "clsx";

type Tab = "file" | "database";

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
      service_name: serviceName || null
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
      service_name: serviceName || null
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
    } else {
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
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <button 
            onClick={() => handleTabChange("file")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2",
              activeTab === "file" 
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Archivo (CSV / Excel)
          </button>
          <button 
            onClick={() => handleTabChange("database")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2",
              activeTab === "database" 
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Database className="w-4 h-4" />
            Base de Datos Relacional
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
