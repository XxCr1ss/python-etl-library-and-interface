"use client";

import { useState } from "react";
import { 
  X, 
  Edit3, 
  RefreshCw, 
  Sliders, 
  Filter, 
  CheckSquare, 
  Trash, 
  Layers, 
  Plus
} from "lucide-react";

interface AddStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: string[];
  onAddStep: (step: { type: string; params: Record<string, unknown> }) => void;
}

type StepType = 
  | "rename_columns" 
  | "convert_types" 
  | "fill_nulls" 
  | "filter_value" 
  | "select_columns" 
  | "remove_columns" 
  | "group_by";

export default function AddStepModal({
  isOpen,
  onClose,
  availableColumns,
  onAddStep,
}: AddStepModalProps) {
  const [selectedType, setSelectedType] = useState<StepType>("rename_columns");

  // Form states
  const [renameOld, setRenameOld] = useState("");
  const [renameNew, setRenameNew] = useState("");

  const [convertCol, setConvertCol] = useState("");
  const [convertType, setConvertType] = useState("str");

  const [fillCol, setFillCol] = useState("");
  const [fillVal, setFillVal] = useState("");

  const [filterCol, setFilterCol] = useState("");
  const [filterOp, setFilterOp] = useState("eq");
  const [filterVal, setFilterVal] = useState("");

  const [selectedCols, setSelectedCols] = useState<Record<string, boolean>>({});
  const [removedCols, setRemovedCols] = useState<Record<string, boolean>>({});

  const [groupByCol, setGroupByCol] = useState("");
  const [groupValCol, setGroupValCol] = useState("");

  if (!isOpen) return null;

  const handleToggleColSelect = (col: string) => {
    setSelectedCols(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const handleToggleColRemove = (col: string) => {
    setRemovedCols(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let stepParams: Record<string, unknown> = {};
    const type = selectedType;

    switch (selectedType) {
      case "rename_columns":
        if (!renameOld || !renameNew) return;
        stepParams = {
          columns: { [renameOld]: renameNew }
        };
        break;
      case "convert_types":
        if (!convertCol || !convertType) return;
        stepParams = {
          columns: convertCol,
          dtype: convertType
        };
        break;
      case "fill_nulls":
        if (!fillCol || fillVal === "") return;
        // Try parsing number
        let parsedFill: string | number = fillVal;
        if (!isNaN(Number(fillVal)) && fillVal.trim() !== "") {
          parsedFill = Number(fillVal);
        }
        stepParams = {
          column: fillCol,
          value: parsedFill
        };
        break;
      case "filter_value":
        if (!filterCol || filterVal === "") return;
        let parsedFilter: string | number | boolean = filterVal;
        if (!isNaN(Number(filterVal)) && filterVal.trim() !== "") {
          parsedFilter = Number(filterVal);
        } else if (filterVal.toLowerCase() === "true") {
          parsedFilter = true;
        } else if (filterVal.toLowerCase() === "false") {
          parsedFilter = false;
        }
        stepParams = {
          column: filterCol,
          value: parsedFilter,
          operator: filterOp
        };
        break;
      case "select_columns":
        const keepList = Object.entries(selectedCols)
          .filter((entry) => entry[1])
          .map((entry) => entry[0]);
        if (keepList.length === 0) return;
        stepParams = {
          columns: keepList
        };
        break;
      case "remove_columns":
        const removeList = Object.entries(removedCols)
          .filter((entry) => entry[1])
          .map((entry) => entry[0]);
        if (removeList.length === 0) return;
        stepParams = {
          columns: removeList
        };
        break;
      case "group_by":
        if (!groupByCol || !groupValCol) return;
        stepParams = {
          by: groupByCol,
          column: groupValCol
        };
        break;
    }

    onAddStep({
      type,
      params: stepParams
    });

    // Reset states
    setRenameOld("");
    setRenameNew("");
    setConvertCol("");
    setConvertType("str");
    setFillCol("");
    setFillVal("");
    setFilterCol("");
    setFilterOp("eq");
    setFilterVal("");
    setSelectedCols({});
    setRemovedCols({});
    setGroupByCol("");
    setGroupValCol("");

    onClose();
  };

  const categories = [
    { id: "rename_columns" as StepType, name: "Renombrar", icon: <Edit3 className="w-4 h-4" />, desc: "Cambiar nombres de columnas" },
    { id: "convert_types" as StepType, name: "Cambiar Tipo", icon: <RefreshCw className="w-4 h-4" />, desc: "Castear a Texto, Entero, etc." },
    { id: "fill_nulls" as StepType, name: "Rellenar Nulos", icon: <Sliders className="w-4 h-4" />, desc: "Imputar nulos con default" },
    { id: "filter_value" as StepType, name: "Filtrar Datos", icon: <Filter className="w-4 h-4" />, desc: "Filtrar por comparación" },
    { id: "select_columns" as StepType, name: "Mantener Cols", icon: <CheckSquare className="w-4 h-4" />, desc: "Seleccionar columnas a mantener" },
    { id: "remove_columns" as StepType, name: "Eliminar Cols", icon: <Trash className="w-4 h-4" />, desc: "Eliminar columnas del dataset" },
    { id: "group_by" as StepType, name: "Agrupar", icon: <Layers className="w-4 h-4" />, desc: "Agrupar y calcular promedio" },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-205">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Left Side: Operations Menu */}
        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 p-5 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Operación</h3>
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`flex items-start gap-3 p-3 rounded-xl text-left border transition-all ${
                selectedType === cat.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${
                selectedType === cat.id ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-950/30 text-blue-500"
              }`}>
                {cat.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{cat.name}</p>
                <p className={`text-[10px] mt-0.5 ${selectedType === cat.id ? "text-blue-100" : "text-slate-400"}`}>
                  {cat.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Right Side: Form Configuration */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {categories.find(c => c.id === selectedType)?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura los parámetros de esta transformación.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Rename Form */}
            {selectedType === "rename_columns" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna Original</label>
                  <select
                    value={renameOld}
                    onChange={(e) => setRenameOld(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nuevo Nombre</label>
                  <input
                    type="text"
                    value={renameNew}
                    onChange={(e) => setRenameNew(e.target.value)}
                    required
                    placeholder="ej. primer_nombre"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Convert Types Form */}
            {selectedType === "convert_types" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna</label>
                  <select
                    value={convertCol}
                    onChange={(e) => setConvertCol(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tipo Destino</label>
                  <select
                    value={convertType}
                    onChange={(e) => setConvertType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="str">Texto (str)</option>
                    <option value="int">Entero (int)</option>
                    <option value="float">Decimal (float)</option>
                    <option value="datetime">Fecha (datetime)</option>
                    <option value="bool">Booleano (bool)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Impute Nulls Form */}
            {selectedType === "fill_nulls" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna</label>
                  <select
                    value={fillCol}
                    onChange={(e) => setFillCol(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valor por Defecto</label>
                  <input
                    type="text"
                    value={fillVal}
                    onChange={(e) => setFillVal(e.target.value)}
                    required
                    placeholder="ej. Sin asignar o 0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-450 mt-1 block">
                    Los valores numéricos se parsearán a número de forma automática.
                  </span>
                </div>
              </div>
            )}

            {/* Filter Form */}
            {selectedType === "filter_value" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna</label>
                  <select
                    value={filterCol}
                    onChange={(e) => setFilterCol(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Operador</label>
                  <select
                    value={filterOp}
                    onChange={(e) => setFilterOp(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="eq">Igual a (=)</option>
                    <option value="ne">Diferente de (!=)</option>
                    <option value="gt">Mayor que (&gt;)</option>
                    <option value="ge">Mayor o igual que (&gt;=)</option>
                    <option value="lt">Menor que (&lt;)</option>
                    <option value="le">Menor o igual que (&lt;=)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valor de Comparación</label>
                  <input
                    type="text"
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                    required
                    placeholder="ej. Bogotá o 30"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Select Columns Form */}
            {selectedType === "select_columns" && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Marca las columnas a MANTENER (las demás se eliminarán)
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                  {availableColumns.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer select-none animate-in fade-in duration-100"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedCols[col]}
                        onChange={() => handleToggleColSelect(col)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={col}>
                        {col}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Remove Columns Form */}
            {selectedType === "remove_columns" && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Marca las columnas a ELIMINAR
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-955/20">
                  {availableColumns.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer select-none animate-in fade-in duration-100"
                    >
                      <input
                        type="checkbox"
                        checked={!!removedCols[col]}
                        onChange={() => handleToggleColRemove(col)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={col}>
                        {col}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Group By Form */}
            {selectedType === "group_by" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agrupar por Columna</label>
                  <select
                    value={groupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna Numérica a Promediar</label>
                  <select
                    value={groupValCol}
                    onChange={(e) => setGroupValCol(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

          </form>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-250 dark:border-slate-850 rounded-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-405 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Aplicar Operación
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
