"use client";

import { useState } from "react";
import { 
  Database, 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import clsx from "clsx";

type Tab = "file" | "database";

export default function ExtractPage() {
  const [activeTab, setActiveTab] = useState<Tab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Extracción de Datos</h1>
        <p className="text-slate-500">Conecta orígenes de datos relacionales o sube archivos estructurados para iniciar el proceso ETL.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <button 
            onClick={() => setActiveTab("file")}
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
            onClick={() => setActiveTab("database")}
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
                <p className="text-xs text-slate-500">o arrastra y suelta aquí (Soporta .csv, .xlsx)</p>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
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
                    className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                    onClick={() => setIsPreviewing(true)}
                  >
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
                  <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Host</label>
                  <input type="text" placeholder="localhost" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Puerto</label>
                  <input type="text" placeholder="5432" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre de Base de Datos</label>
                  <input type="text" placeholder="colombia_saludable" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Usuario</label>
                  <input type="text" placeholder="postgres" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Probar Conexión
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setIsPreviewing(true)}
                >
                  Conectar y Extraer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Preview Section (Placeholder for actual table) */}
      {isPreviewing && (
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TableIcon className="w-4 h-4 text-slate-500" />
              Vista Previa de Datos
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
              Listo para transformar
            </span>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Fecha Registro</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-slate-300">#{row}049</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Dato de prueba {row}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">2026-05-25</td>
                    <td className="px-6 py-4">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2"></span>
                      Válido
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
            <span className="text-xs text-slate-500">Mostrando 5 de 1,240 registros</span>
            <button className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
              Continuar a Transformación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
