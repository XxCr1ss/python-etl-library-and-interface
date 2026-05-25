"use client";
import { useState } from "react";
import { xlsxSheets, xlsxPreview } from "@/lib/api";
import DataTable from "@/components/DataTable";

export default function XlsxPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (f: File) => {
    setFile(f); setError(""); setSheets([]); setPreview(null);
    setLoading(true);
    try {
      const { sheets: s } = await xlsxSheets(f);
      setSheets(s);
      setActiveSheet(s[0]);
      const p = await xlsxPreview(f, s[0]);
      setPreview(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const switchSheet = async (sheet: string) => {
    if (!file) return;
    setActiveSheet(sheet); setLoading(true);
    try { setPreview(await xlsxPreview(file, sheet)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Extractor Excel</h1>

      <div onClick={() => document.getElementById("xlsxInput")?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 transition">
        <input id="xlsxInput" type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <p className="text-gray-500 text-sm">
          {file ? `Archivo: ${file.name}` : "Haz clic para seleccionar un archivo Excel"}
        </p>
      </div>

      {loading && <p className="text-indigo-500 text-sm">Procesando...</p>}
      {error  && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {sheets.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {sheets.map((s) => (
            <button key={s} onClick={() => switchSheet(s)}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                s === activeSheet
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
              }`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-700">Hoja: {preview.sheet_used}</h2>
            <span className="text-xs text-gray-400">{preview.total_rows} filas</span>
          </div>
          <DataTable columns={preview.columns} rows={preview.rows} />
        </div>
      )}
    </div>
  );
}