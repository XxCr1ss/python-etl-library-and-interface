"use client";

import { useState } from "react";
import { Settings, Plus, Trash2, HelpCircle, KeyRound } from "lucide-react";

export interface LoadConfig {
  table_name: string;
  table_type: "dimension" | "fact";
  if_exists: "replace" | "append";
  foreign_keys?: Record<string, [string, string]>; // Map of { col_fk: [dim_table, dim_pk] }
}

interface LoadSettingsProps {
  config: LoadConfig;
  onChange: (newConfig: LoadConfig) => void;
  availableColumns: string[];
}

export default function LoadSettings({
  config,
  onChange,
  availableColumns = [],
}: LoadSettingsProps) {
  // Local state to manage the dynamic FK rows in an easily-editable list
  // [{ id, col_fk, dim_table, dim_pk }]
  interface FKRow {
    id: string;
    col_fk: string;
    dim_table: string;
    dim_pk: string;
  }

  const [fkRows, setFkRows] = useState<FKRow[]>(() => {
    if (config.foreign_keys) {
      return Object.entries(config.foreign_keys).map(([col_fk, [dim_table, dim_pk]], index) => ({
        id: `fk-${index}-${Date.now()}`,
        col_fk,
        dim_table,
        dim_pk,
      }));
    }
    return [];
  });

  const updateConfigWithFks = (updatedRows: FKRow[]) => {
    if (config.table_type !== "fact") {
      onChange({
        ...config,
        foreign_keys: undefined,
      });
      return;
    }

    const fkMap: Record<string, [string, string]> = {};
    let hasValidFks = false;

    updatedRows.forEach((row) => {
      if (row.col_fk && row.dim_table && row.dim_pk) {
        fkMap[row.col_fk] = [row.dim_table, row.dim_pk];
        hasValidFks = true;
      }
    });

    onChange({
      ...config,
      foreign_keys: hasValidFks ? fkMap : undefined,
    });
  };

  const handleTableTypeChange = (type: "dimension" | "fact") => {
    const defaultStrategy = type === "dimension" ? "replace" : "append";
    onChange({
      ...config,
      table_type: type,
      if_exists: defaultStrategy,
      foreign_keys: type === "fact" && fkRows.length > 0 ? config.foreign_keys : undefined,
    });
  };

  const handleAddField = (name: string, value: string) => {
    onChange({
      ...config,
      [name]: value,
    });
  };

  const handleAddFkRow = () => {
    const newRow: FKRow = {
      id: `fk-${Date.now()}`,
      col_fk: availableColumns[0] || "",
      dim_table: "",
      dim_pk: "",
    };
    const updated = [...fkRows, newRow];
    setFkRows(updated);
    updateConfigWithFks(updated);
  };

  const handleRemoveFkRow = (id: string) => {
    const updated = fkRows.filter((r) => r.id !== id);
    setFkRows(updated);
    updateConfigWithFks(updated);
  };

  const handleFkRowChange = (id: string, field: keyof FKRow, value: string) => {
    const updated = fkRows.map((row) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setFkRows(updated);
    updateConfigWithFks(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Ajustes de Almacenamiento</h3>
          <p className="text-xs text-slate-500">Configura la tabla destino y estrategias de escritura.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Nombre de la Tabla */}
        <div>
          <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Nombre de la Tabla Destino
          </label>
          <input
            type="text"
            name="table_name"
            value={config.table_name}
            onChange={(e) => handleAddField("table_name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="ej. dim_medico o fact_consulta"
            required
            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-555 transition-all text-slate-900 dark:text-white font-mono"
          />
        </div>

        {/* Tipo de Tabla & Estrategia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Tipo de Tabla
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTableTypeChange("dimension")}
                className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  config.table_type === "dimension"
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-350 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/10"
                    : "border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-450"
                }`}
              >
                Dimensión
              </button>
              <button
                type="button"
                onClick={() => handleTableTypeChange("fact")}
                className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  config.table_type === "fact"
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-350 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/10"
                    : "border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-450"
                }`}
              >
                Hechos (Fact)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              Modo de Escritura
              <div className="group relative text-slate-400 cursor-help">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-900 text-[10px] text-white rounded shadow-lg z-25 leading-normal normal-case font-normal text-center">
                  Replace: Sobrescribe la tabla entera. Append: Agrega nuevos registros a la tabla existente.
                </span>
              </div>
            </label>
            <select
              name="if_exists"
              value={config.if_exists}
              onChange={(e) => handleAddField("if_exists", e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all text-slate-900 dark:text-white"
            >
              <option value="replace">Reemplazar Tabla (Replace)</option>
              <option value="append">Agregar Datos (Append)</option>
              <option value="fail">Lanzar Error si Existe (Fail)</option>
            </select>
          </div>
        </div>

        {/* Claves Foráneas Dinámicas (Hechos) */}
        {config.table_type === "fact" && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Mapeo de Claves Foráneas (FK)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddFkRow}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar FK
              </button>
            </div>

            {fkRows.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No se han definido relaciones de clave foránea.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Si la tabla hechos contiene relaciones, agrégalas para validar la integridad referencial antes de la ingesta.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {fkRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-10 gap-2 items-center p-3 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 relative group animate-in zoom-in-95 duration-200"
                  >
                    {/* FK DataFrame Column */}
                    <div className="sm:col-span-3">
                      <select
                        value={row.col_fk}
                        onChange={(e) => handleFkRowChange(row.id, "col_fk", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono focus:outline-none text-slate-900 dark:text-white"
                      >
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1 text-center text-[10px] font-bold text-slate-450 uppercase">
                      ➔
                    </div>

                    {/* Dim Table Name */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={row.dim_table}
                        onChange={(e) => handleFkRowChange(row.id, "dim_table", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="dim_tabla"
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-none text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    {/* Dim PK Column */}
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={row.dim_pk}
                        onChange={(e) => handleFkRowChange(row.id, "dim_pk", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="col_pk"
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-none text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    {/* Delete Action */}
                    <div className="sm:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFkRow(row.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
