"use client";

import { CheckCircle2, Database, ArrowRight, RotateCcw, Table } from "lucide-react";
import Link from "next/link";

export interface LoadReportData {
  status: string;
  message: string;
  table_name: string;
  table_type: string;
  total_rows: number;
  preview_data: Record<string, unknown>[];
}

interface LoadReportProps {
  report: LoadReportData;
  onReset: () => void;
}

export default function LoadReport({ report, onReset }: LoadReportProps) {
  const columns = report.preview_data.length > 0 ? Object.keys(report.preview_data[0]) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      {/* Banner de Éxito */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-555/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ¡Pipeline de Carga Completado!
          </h2>
          <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed max-w-xl">
            {report.message || "Los datos transformados se han insertado exitosamente en la Bodega de Datos de destino."}
          </p>
        </div>

        <div className="md:ml-auto flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-sm font-semibold shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Nueva Carga
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl transition-colors text-sm font-semibold shadow-sm"
          >
            Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Tabla Destino", value: report.table_name, sub: `Tipo: ${report.table_type.toUpperCase()}`, icon: Database, bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-500" },
          { label: "Registros Totales", value: report.total_rows.toLocaleString(), sub: "Guardados físicamente", icon: Table, bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-500" },
          { label: "Estado del Pipeline", value: "Activo", sub: "Sin advertencias de FK", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-500" },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.text}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">{card.value}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vista Previa de la Tabla Real */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Auditoría: Lectura Real de la Tabla</h3>
            <p className="text-xs text-slate-500">Muestra leída directamente del motor destino después del commit.</p>
          </div>
        </div>

        {columns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No hay registros disponibles para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-700/60 font-mono">
                  {columns.map((col) => (
                    <th key={col} className="px-6 py-3.5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-xs">
                {report.preview_data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    {columns.map((col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="px-6 py-3.5 max-w-[200px] truncate">
                          {val === null || val === undefined ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : typeof val === "boolean" ? (
                            val ? "true" : "false"
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
