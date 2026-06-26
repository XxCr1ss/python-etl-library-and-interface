"use client";

import { FileSpreadsheet, Database, HardDrive } from "lucide-react";

interface SourceBannerProps {
  source: {
    type: "file" | "database";
    filename?: string;
    filepath?: string;
    unique_filename?: string;
    total_rows?: number;
    db_type?: string;
    host?: string;
    database?: string;
    table_name?: string;
  };
}

export default function SourceBanner({ source }: SourceBannerProps) {
  const isFile = source.type === "file";

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
          {isFile ? (
            <FileSpreadsheet className="w-6 h-6" />
          ) : (
            <Database className="w-6 h-6" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {isFile ? "Archivo" : "Base de Datos"}
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Conectado
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {isFile ? source.filename : `${source.database}.${source.table_name}`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            {isFile ? source.filepath : `${source.db_type}://${source.host}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
        <div className="flex-1 md:flex-initial text-center md:text-right">
          <p className="text-xs text-slate-400 dark:text-slate-500">Filas Totales</p>
          <p className="text-xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            {source.total_rows !== undefined && source.total_rows !== null
              ? source.total_rows.toLocaleString()
              : "Desconocido"}
          </p>
        </div>
      </div>
    </div>
  );
}
