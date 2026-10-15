"use client";

import { useState, useEffect, useRef } from "react";
import { Database, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

import type { TargetConnectionDto, MessageResponse, DatabaseType } from "@/types/etl";
export type TargetConfig = Omit<TargetConnectionDto, "password"> & { password?: string };
interface TargetConfigFormProps {
  config: TargetConfig;
  onChange: (newConfig: TargetConfig) => void;
  onTestConnection: () => Promise<MessageResponse>;
  connectionVersion: number;
}

export default function TargetConfigForm({
  config,
  onChange,
  onTestConnection,
  connectionVersion,
}: TargetConfigFormProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "success" | "error"; message: string } | null>(null);

  const currentVersion = useRef(connectionVersion);
  currentVersion.current = connectionVersion;
  useEffect(() => { setTestResult(null); }, [connectionVersion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "port") {
      onChange({ ...config, [name]: value ? parseInt(value, 10) : undefined });
    } else if (name === "db_type") {
      const db_type = value as DatabaseType;
      onChange({ ...config, db_type, port: db_type === "mysql" ? 3306 : db_type === "oracle" ? 1521 : 5432 });
    } else {
      onChange({ ...config, [name]: value });
    }
    // Reset connection status on form changes
    setTestResult(null);
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const version = connectionVersion;
    try {
      const data = await onTestConnection();
      if (version !== currentVersion.current) return;
      setTestResult({
        status: "success",
        message: data.message || "¡Conexión verificada exitosamente!",
      });
    } catch (err) {
      if (version !== currentVersion.current) return;
      setTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Error al conectar.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Conexión a la Bodega de Datos</h3>
          <p className="text-xs text-slate-500">Credenciales del almacenamiento destino (Target DB).</p>
        </div>
        
        {testResult?.status === "success" && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full animate-in fade-in duration-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conectado
          </div>
        )}
      </div>

      {config.password === undefined && <button type="button" className="underline text-sm" onClick={() => onChange({ ...config, password: "" })}>Usar contraseña vacía explícitamente</button>}
      <form onSubmit={handleTestConnection} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Motor de BD
            </label>
            <select
              name="db_type"
              value={config.db_type}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Host / IP
            </label>
            <input
              type="text"
              name="host"
              value={config.host}
              onChange={handleChange}
              placeholder="localhost"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Puerto
            </label>
            <input
              type="number"
              name="port"
              value={config.port || ""}
              onChange={handleChange}
              placeholder={config.db_type === "mysql" ? "3306" : config.db_type === "oracle" ? "1521" : "5432"}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Base de Datos
            </label>
            <input
              type="text"
              name="database"
              value={config.database}
              onChange={handleChange}
              placeholder="Nombre de la BD"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Usuario
            </label>
            <input
              type="text"
              name="user"
              value={config.user}
              onChange={handleChange}
              placeholder="postgres"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={config.password ?? ""}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {config.db_type === "oracle" && (
          <div className="animate-in slide-in-from-top-2 duration-250">
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Service Name (Oracle)
            </label>
            <input
              type="text"
              name="service_name"
              value={config.service_name || ""}
              onChange={handleChange}
              placeholder="xe"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            />
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
              testResult.status === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-250 text-rose-805 dark:text-rose-300"
            }`}
          >
            {testResult.status === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="font-semibold">
                {testResult.status === "success" ? "Conectado Correctamente" : "Error de Conexión"}
              </p>
              <p className="text-xs opacity-90 leading-relaxed font-sans">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={testing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Probar Conexión Bodega
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
