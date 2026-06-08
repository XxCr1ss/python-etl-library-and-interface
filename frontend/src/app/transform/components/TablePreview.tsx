"use client";

import { Clock, Hash, Type, HelpCircle, AlertCircle } from "lucide-react";

interface TablePreviewProps {
  columns: string[];
  dtypes: Record<string, string>;
  previewData: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
}

export default function TablePreview({
  columns,
  dtypes,
  previewData,
  loading,
  error,
}: TablePreviewProps) {
  
  const getTypeIndicator = (colName: string) => {
    const rawType = dtypes[colName]?.toLowerCase() || "";
    if (
      rawType.includes("int") ||
      rawType.includes("float") ||
      rawType.includes("double") ||
      rawType.includes("decimal") ||
      rawType.includes("numeric")
    ) {
      return {
        label: "123",
        icon: <Hash className="w-3 h-3" />,
        tooltip: `Numérico (${rawType})`,
        color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
      };
    } else if (
      rawType.includes("date") ||
      rawType.includes("time") ||
      rawType.includes("timestamp") ||
      rawType.includes("datetime")
    ) {
      return {
        label: "clock",
        icon: <Clock className="w-3 h-3" />,
        tooltip: `Temporal (${rawType})`,
        color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      };
    } else if (
      rawType.includes("object") ||
      rawType.includes("str") ||
      rawType.includes("char") ||
      rawType.includes("text")
    ) {
      return {
        label: "abc",
        icon: <Type className="w-3 h-3" />,
        tooltip: `Texto (${rawType})`,
        color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
      };
    } else {
      return {
        label: "???",
        icon: <HelpCircle className="w-3 h-3" />,
        tooltip: `Otro (${rawType || "desconocido"})`,
        color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-900/30",
      };
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10 rounded-2xl animate-in fade-in duration-300">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <h4 className="font-semibold text-slate-800 dark:text-slate-200">Error de Procesamiento</h4>
        <p className="text-xs text-red-600 dark:text-red-400 text-center mt-1 max-w-md">
          {error}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
        {/* Table skeleton header */}
        <div className="h-16 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center px-6 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse w-2/3" />
              <div className="h-2.5 bg-slate-150 dark:bg-slate-850 rounded-md animate-pulse w-1/3" />
            </div>
          ))}
        </div>
        {/* Table skeleton rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-850/50 animate-in fade-in duration-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 flex items-center px-6 gap-6">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex-1">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-center animate-in fade-in duration-300">
        <p className="text-sm text-slate-500">
          No hay datos o columnas disponibles en este paso.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-350">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              {columns.map((col) => {
                const indicator = getTypeIndicator(col);
                return (
                  <th key={col} className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[150px]">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold truncate" title={col}>
                        {col}
                      </span>
                      <div
                        className={`flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${indicator.color}`}
                        title={indicator.tooltip}
                      >
                        {indicator.icon}
                        <span>{indicator.label}</span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {previewData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td key={col} className="px-6 py-3.5 text-xs font-mono text-slate-600 dark:text-slate-400 break-words max-w-[250px]">
                      {val === null || val === undefined ? (
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-bold tracking-wider italic">
                          null
                        </span>
                      ) : typeof val === "boolean" ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          val 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                            : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                        }`}>
                          {val ? "true" : "false"}
                        </span>
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
    </div>
  );
}
