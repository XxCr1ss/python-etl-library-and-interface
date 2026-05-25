"use client";
import { useState } from "react";
import { dbTest, dbTables, dbQuery, dbSample } from "@/lib/api";
import DataTable from "@/components/DataTable";

const DEFAULTS = { db_type: "postgresql", host: "localhost", port: 5432, user: "", password: "", database: "", service_name: "" };

export default function DbPage() {
  const [conn, setConn] = useState(DEFAULTS);
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [query, setQuery] = useState("SELECT * FROM ");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<any>(null);

  const connect = async () => {
    setLoading(true); setError("");
    try {
      const res = await dbTest(conn);
      setConnected(true); setInfo(res.info);
      const { tables: t } = await dbTables(conn);
      setTables(t);
    } catch (e: any) { setError(e.message); setConnected(false); }
    finally { setLoading(false); }
  };

  const sampleTable = async (table: string) => {
    setLoading(true); setError("");
    try { setPreview(await dbSample({ ...conn, table_name: table, limit: 10 })); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runQuery = async () => {
    setLoading(true); setError("");
    try { setPreview(await dbQuery({ ...conn, query })); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const field = (key: string, label: string, type = "text", placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} placeholder={placeholder}
        value={(conn as any)[key]}
        onChange={(e) => setConn({ ...conn, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Extractor Base de datos</h1>

      {/* Connection form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-medium text-gray-700">Conexión</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Motor</label>
            <select value={conn.db_type} onChange={(e) => setConn({ ...conn, db_type: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>
          {field("host",     "Host",     "text",   "localhost")}
          {field("port",     "Puerto",   "number", "5432")}
          {field("user",     "Usuario",  "text",   "root")}
          {field("password", "Contraseña","password","")}
          {field("database", "Base de datos","text","")}
          {conn.db_type === "oracle" && field("service_name","Service name","text","")}
        </div>
        <button onClick={connect}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
          {loading ? "Conectando..." : "Conectar"}
        </button>
        {connected && info && (
          <p className="text-green-600 text-sm">Conectado — {info.tables_count} tablas en {info.database_name}</p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {connected && (
        <>
          {/* Tables list */}
          {tables.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-medium text-gray-700">Tablas disponibles</h2>
              <div className="flex gap-2 flex-wrap">
                {tables.map((t) => (
                  <button key={t} onClick={() => sampleTable(t)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:border-indigo-400 hover:text-indigo-600 transition">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query editor */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-medium text-gray-700">Ejecutar consulta SQL</h2>
            <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <button onClick={runQuery}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
              Ejecutar
            </button>
          </div>
        </>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-700">Resultados</h2>
            <span className="text-xs text-gray-400">{preview.total_rows} filas</span>
          </div>
          <DataTable columns={preview.columns} rows={preview.rows} />
        </div>
      )}
    </div>
  );
}