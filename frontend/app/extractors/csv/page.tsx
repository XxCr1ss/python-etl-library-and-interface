"use client";
import { useState, useRef } from "react";
import { csvStats, csvPreview, csvValidate } from "@/lib/api";
import DataTable from "@/components/DataTable";

export default function CsvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiredCols, setRequiredCols] = useState("");
  const [minRows, setMinRows] = useState(1);
  const dropRef = useRef<HTMLDivElement>(null);

  const handle = async (f: File) => {
    setFile(f); setError(""); setStats(null); setPreview(null); setValidation(null);
    setLoading(true);
    try {
      const [s, p] = await Promise.all([csvStats(f), csvPreview(f, 10)]);
      setStats(s); setPreview(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handle(f);
  };

  const runValidation = async () => {
    if (!file) return;
    setLoading(true);
    try { setValidation(await csvValidate(file, requiredCols, minRows)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Extractor CSV</h1>

      {/* Drop zone */}
      <div ref={dropRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("csvInput")?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 transition">
        <input id="csvInput" type="file" accept=".csv" className="hidden"
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
        <p className="text-gray-500 text-sm">
          {file ? `Archivo: ${file.name}` : "Arrastra un .csv aquí o haz clic para seleccionar"}
        </p>
      </div>

      {loading && <p className="text-indigo-500 text-sm">Procesando...</p>}
      {error  && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Filas",     value: stats.rows },
            { label: "Columnas",  value: stats.columns },
            { label: "Tamaño",    value: `${stats.file_size_mb} MB` },
            { label: "Memoria",   value: `${stats.memory_usage_mb} MB` },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-lg font-semibold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-700">Vista previa</h2>
            <span className="text-xs text-gray-400">{preview.total_rows} filas totales</span>
          </div>
          <DataTable columns={preview.columns} rows={preview.rows} />
        </div>
      )}

      {/* Validation */}
      {file && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-medium text-gray-700">Validación de estructura</h2>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="Columnas requeridas (col1, col2)" value={requiredCols}
              onChange={(e) => setRequiredCols(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input type="number" min={1} placeholder="Mín. filas" value={minRows}
              onChange={(e) => setMinRows(Number(e.target.value))}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={runValidation}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
              Validar
            </button>
          </div>
          {validation && (
            <div className={`rounded-lg px-4 py-2 text-sm ${validation.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {validation.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}