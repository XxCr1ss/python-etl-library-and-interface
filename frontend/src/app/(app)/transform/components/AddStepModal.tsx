"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Edit3, 
  RefreshCw, 
  Sliders, 
  Filter, 
  CheckSquare, 
  Trash, 
  Layers, 
  Plus,
  UploadCloud,
  Check,
  GitMerge,
  Scissors,
  Calculator,
  Wand2,
  ListFilter,
  Columns as ColumnsIcon,
  SortAsc as SortAscIcon,
  List as ListIcon,
  Grid as GridIcon,
  Hash,
  CalendarRange,
  Layers3,
  ToggleLeft,
  ArrowDownAZ
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
  | "group_by"
  | "union"
  | "left_join"
  | "split_column"
  | "add_new_column"
  | "transform_column"
  | "filter_by_condition"
  | "normalize_delimited_column"
  | "sort_columns"
  | "convert_column_to_list"
  | "explode_column_list"
  | "clean_numeric_columns"
  | "clean_date_format"
  | "convert_to_ordered_category"
  | "boolean_to_binary"
  | "sort_by";

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

  const [unionUploading, setUnionUploading] = useState(false);
  const [unionMetadata, setUnionMetadata] = useState<{
    filepath: string;
    filename: string;
    unique_filename: string;
  } | null>(null);
  const [unionError, setUnionError] = useState<string | null>(null);

  // Estados de unión de base de datos
  const [unionSourceType, setUnionSourceType] = useState<"file" | "database">("file");
  const [unionDbType, setUnionDbType] = useState("postgresql");
  const [unionHost, setUnionHost] = useState("localhost");
  const [unionPort, setUnionPort] = useState("5432");
  const [unionDatabase, setUnionDatabase] = useState("");
  const [unionUser, setUnionUser] = useState("");
  const [unionPassword, setUnionPassword] = useState("");
  const [unionTable, setUnionTable] = useState("");
  const [unionServiceName, setUnionServiceName] = useState("");
  const [unionUseAgent, setUnionUseAgent] = useState(false);

  // Auto-completar datos si la fuente activa es base de datos
  useEffect(() => {
    if (isOpen) {
      const storedSource = sessionStorage.getItem("etl_active_source");
      if (storedSource) {
        const parsed = JSON.parse(storedSource);
        if (parsed.type === "database") {
          setUnionDbType(parsed.db_type || "postgresql");
          setUnionHost(parsed.host || "localhost");
          setUnionPort(parsed.port ? String(parsed.port) : "5432");
          setUnionDatabase(parsed.database || "");
          setUnionUser(parsed.user || "");
          setUnionPassword(parsed.password || "");
          setUnionServiceName(parsed.service_name || "");
          setUnionUseAgent(!!parsed.use_agent);
          setUnionSourceType("database");
        } else {
          setUnionSourceType("file");
        }
      }
    }
  }, [isOpen]);

  const handleUnionFileUpload = async (file: File) => {
    setUnionUploading(true);
    setUnionError(null);
    setUnionMetadata(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/extract/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al subir el archivo secundario");
      }

      setUnionMetadata({
        filepath: data.filepath,
        filename: data.filename,
        unique_filename: data.unique_filename
      });
    } catch (err) {
      setUnionError(err instanceof Error ? err.message : "Error al procesar el archivo");
    } finally {
      setUnionUploading(false);
    }
  };

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

  // Left Join States
  const [joinOnPrimary, setJoinOnPrimary] = useState("");
  const [joinOnSecondary, setJoinOnSecondary] = useState("");

  // Split Column States
  const [splitCol, setSplitCol] = useState("");
  const [splitDelimiter, setSplitDelimiter] = useState(";");
  const [splitNewCols, setSplitNewCols] = useState("");

  // Add New Column States
  const [calcNewColName, setCalcNewColName] = useState("");
  const [calcExpression, setCalcExpression] = useState("");

  // Transform Column States
  const [transCol, setTransCol] = useState("");
  const [transExpression, setTransExpression] = useState("");

  // Filter by Condition States
  const [condExpression, setCondExpression] = useState("");

  // Normalize Delimited Column States
  const [normCol, setNormCol] = useState("");
  const [normDelimiter, setNormDelimiter] = useState(",");
  const [normKeepOrig, setNormKeepOrig] = useState(true);

  // Sort Columns States
  const [sortCols, setSortCols] = useState<Record<string, boolean>>({});
  const [sortAscending, setSortAscending] = useState(true);

  // Convert Column to List States
  const [convCol, setConvCol] = useState("");
  const [convDelimiter, setConvDelimiter] = useState(";");
  const [convNewCol, setConvNewCol] = useState("");

  // Explode Column List States
  const [expCol, setExpCol] = useState("");

  // Clean Numeric Columns States
  const [cleanNumCols, setCleanNumCols] = useState<Record<string, boolean>>({});

  // Clean Date Format States
  const [cleanDateCol, setCleanDateCol] = useState("");
  const [cleanDateFormat, setCleanDateFormat] = useState("%Y-%m-%d");

  // Convert to Ordered Category States
  const [orderedCatCol, setOrderedCatCol] = useState("");
  const [orderedCatList, setOrderedCatList] = useState("");
  const [orderedCatIsOrdered, setOrderedCatIsOrdered] = useState(true);

  // Boolean to Binary States
  const [boolBinCols, setBoolBinCols] = useState<Record<string, boolean>>({});

  // Sort By States
  const [sortByCols, setSortByCols] = useState<Record<string, boolean>>({});
  const [sortByAscending, setSortByAscending] = useState(true);

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
      case "union":
        if (unionSourceType === "file") {
          if (!unionMetadata) return;
          stepParams = {
            secondary_source: {
              type: "file",
              filepath: unionMetadata.filepath,
              filename: unionMetadata.filename,
              unique_filename: unionMetadata.unique_filename
            }
          };
        } else {
          if (!unionTable || !unionDatabase || !unionHost || !unionUser) return;
          stepParams = {
            secondary_source: {
              type: "database",
              db_type: unionDbType,
              host: unionHost,
              port: unionPort ? parseInt(unionPort) : null,
              database: unionDatabase,
              user: unionUser,
              password: unionPassword,
              table_name: unionTable,
              service_name: unionServiceName || null,
              use_agent: unionUseAgent,
              agent_id: unionUseAgent ? localStorage.getItem("etl_agent_id") : null
            }
          };
        }
        break;
      case "left_join":
        if (unionSourceType === "file") {
          if (!unionMetadata || !joinOnPrimary) return;
          stepParams = {
            right_source: {
              type: "file",
              filepath: unionMetadata.filepath,
              filename: unionMetadata.filename,
              unique_filename: unionMetadata.unique_filename
            },
            on: joinOnSecondary ? [joinOnPrimary, joinOnSecondary] : joinOnPrimary
          };
        } else {
          if (!unionTable || !unionDatabase || !unionHost || !unionUser || !joinOnPrimary) return;
          stepParams = {
            right_source: {
              type: "database",
              db_type: unionDbType,
              host: unionHost,
              port: unionPort ? parseInt(unionPort) : null,
              database: unionDatabase,
              user: unionUser,
              password: unionPassword,
              table_name: unionTable,
              service_name: unionServiceName || null,
              use_agent: unionUseAgent,
              agent_id: unionUseAgent ? localStorage.getItem("etl_agent_id") : null
            },
            on: joinOnSecondary ? [joinOnPrimary, joinOnSecondary] : joinOnPrimary
          };
        }
        break;
      case "split_column":
        if (!splitCol || !splitDelimiter) return;
        let newColsArray: string[] | null = null;
        if (splitNewCols.trim() !== "") {
          newColsArray = splitNewCols.split(",").map(c => c.trim()).filter(c => c.length > 0);
        }
        stepParams = {
          column: splitCol,
          delimiter: splitDelimiter,
          new_columns: newColsArray
        };
        break;
      case "add_new_column":
        if (!calcNewColName || !calcExpression) return;
        stepParams = {
          new_column_name: calcNewColName,
          expression: calcExpression
        };
        break;
      case "transform_column":
        if (!transCol || !transExpression) return;
        stepParams = {
          column: transCol,
          expression: transExpression
        };
        break;
      case "filter_by_condition":
        if (!condExpression) return;
        stepParams = {
          expression: condExpression
        };
        break;
      case "normalize_delimited_column":
        if (!normCol || !normDelimiter) return;
        stepParams = {
          column: normCol,
          delimiter: normDelimiter,
          keep_original: normKeepOrig
        };
        break;
      case "sort_columns":
        const sortList = Object.entries(sortCols)
          .filter(entry => entry[1])
          .map(entry => entry[0]);
        if (sortList.length === 0) return;
        stepParams = {
          columns: sortList,
          ascending: sortAscending
        };
        break;
      case "convert_column_to_list":
        if (!convCol || !convDelimiter) return;
        stepParams = {
          column: convCol,
          delimiter: convDelimiter,
          new_column: convNewCol || null
        };
        break;
      case "explode_column_list":
        if (!expCol) return;
        stepParams = {
          column: expCol
        };
        break;
      case "clean_numeric_columns":
        const cleanList = Object.entries(cleanNumCols)
          .filter(entry => entry[1])
          .map(entry => entry[0]);
        if (cleanList.length === 0) return;
        stepParams = {
          columns: cleanList
        };
        break;
      case "clean_date_format":
        if (!cleanDateCol || !cleanDateFormat) return;
        stepParams = {
          column: cleanDateCol,
          format_output: cleanDateFormat
        };
        break;
      case "convert_to_ordered_category":
        if (!orderedCatCol || !orderedCatList) return;
        const catArray = orderedCatList.split(",").map(c => c.trim()).filter(c => c.length > 0);
        stepParams = {
          column: orderedCatCol,
          categories: catArray,
          ordered: orderedCatIsOrdered
        };
        break;
      case "boolean_to_binary":
        const boolList = Object.entries(boolBinCols)
          .filter(entry => entry[1])
          .map(entry => entry[0]);
        if (boolList.length === 0) return;
        stepParams = {
          columns: boolList
        };
        break;
      case "sort_by":
        const sortByList = Object.entries(sortByCols)
          .filter(entry => entry[1])
          .map(entry => entry[0]);
        if (sortByList.length === 0) return;
        stepParams = {
          columns: sortByList,
          ascending: sortByAscending
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
    setUnionUploading(false);
    setUnionMetadata(null);
    setUnionError(null);
    setJoinOnPrimary("");
    setJoinOnSecondary("");
    setSplitCol("");
    setSplitDelimiter(";");
    setSplitNewCols("");
    setUnionTable("");
    setCalcNewColName("");
    setCalcExpression("");
    setTransCol("");
    setTransExpression("");
    setCondExpression("");
    setNormCol("");
    setNormDelimiter(",");
    setNormKeepOrig(true);
    setSortCols({});
    setSortAscending(true);
    setConvCol("");
    setConvDelimiter(";");
    setConvNewCol("");
    setExpCol("");
    setCleanNumCols({});
    setCleanDateCol("");
    setCleanDateFormat("%Y-%m-%d");
    setOrderedCatCol("");
    setOrderedCatList("");
    setOrderedCatIsOrdered(true);
    setBoolBinCols({});
    setSortByCols({});
    setSortByAscending(true);

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
    { id: "union" as StepType, name: "Unión Vertical", icon: <Plus className="w-4 h-4" />, desc: "Apilar filas de otro archivo (Union All)" },
    { id: "left_join" as StepType, name: "Unión Horizontal", icon: <GitMerge className="w-4 h-4" />, desc: "Left join con otro origen mediante clave" },
    { id: "split_column" as StepType, name: "Dividir Columna", icon: <Scissors className="w-4 h-4" />, desc: "Dividir columna de texto usando un delimitador" },
    { id: "add_new_column" as StepType, name: "Columna Calculada", icon: <Calculator className="w-4 h-4" />, desc: "Crear columna con fórmula o cálculo" },
    { id: "transform_column" as StepType, name: "Transformar Col", icon: <Wand2 className="w-4 h-4" />, desc: "Modificar valores con una fórmula" },
    { id: "filter_by_condition" as StepType, name: "Filtro Condicional", icon: <ListFilter className="w-4 h-4" />, desc: "Filtrar usando expresión compleja" },
    { id: "normalize_delimited_column" as StepType, name: "Normalizar Celda", icon: <ColumnsIcon className="w-4 h-4" />, desc: "Separar valores delimitados en filas" },
    { id: "sort_columns" as StepType, name: "Ordenar Filas", icon: <SortAscIcon className="w-4 h-4" />, desc: "Ordenar dataset por columnas" },
    { id: "convert_column_to_list" as StepType, name: "Texto a Lista", icon: <ListIcon className="w-4 h-4" />, desc: "Convertir cadena a array de valores" },
    { id: "explode_column_list" as StepType, name: "Desglosar Lista", icon: <GridIcon className="w-4 h-4" />, desc: "Convertir lista en múltiples filas" },
    { id: "clean_numeric_columns" as StepType, name: "Limpiar Números", icon: <Hash className="w-4 h-4" />, desc: "Eliminar símbolos monetarios o texto de números" },
    { id: "clean_date_format" as StepType, name: "Estandarizar Fecha", icon: <CalendarRange className="w-4 h-4" />, desc: "Normalizar formato de fechas" },
    { id: "convert_to_ordered_category" as StepType, name: "Categoría Ordenada", icon: <Layers3 className="w-4 h-4" />, desc: "Convertir a categoría con orden (Bajo/Medio/Alto)" },
    { id: "boolean_to_binary" as StepType, name: "Booleano a Binario", icon: <ToggleLeft className="w-4 h-4" />, desc: "Convertir lógicos a 0 y 1" },
    { id: "sort_by" as StepType, name: "Ordenar Registros", icon: <ArrowDownAZ className="w-4 h-4" />, desc: "Ordenar dataset por columnas clave" },
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
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
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
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
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
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                  {availableColumns.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none animate-in fade-in duration-100"
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
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                  {availableColumns.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer select-none animate-in fade-in duration-100"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Union Form */}
            {selectedType === "union" && (
              <div className="space-y-4">
                {/* Selector de tipo de origen secundario */}
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-4 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUnionSourceType("file")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      unionSourceType === "file"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Archivo (CSV / Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnionSourceType("database")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      unionSourceType === "database"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Base de Datos
                  </button>
                </div>

                {unionSourceType === "file" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Seleccionar Archivo Secundario (.csv / .xlsx)
                    </label>
                    
                    {!unionMetadata && !unionUploading ? (
                      <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                        onClick={() => document.getElementById("union-file-input")?.click()}
                      >
                        <UploadCloud className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Haz clic para subir el archivo de unión
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Debe poseer la misma estructura de columnas.
                        </p>
                        <input 
                          type="file" 
                          id="union-file-input" 
                          className="hidden" 
                          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleUnionFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    ) : unionUploading ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Subiendo y validando archivo secundario...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200 dark:border-emerald-900/30 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center animate-scale-in">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {unionMetadata?.filename}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Archivo cargado listo para unir.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUnionMetadata(null);
                          }}
                          className="text-xs text-rose-500 hover:text-rose-600 font-semibold transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

                    {unionError && (
                      <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[11px] text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                        {unionError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Motor</label>
                        <select
                          value={unionDbType}
                          onChange={(e) => {
                            setUnionDbType(e.target.value);
                            if (e.target.value === "postgresql") setUnionPort("5432");
                            else if (e.target.value === "mysql") setUnionPort("3306");
                            else if (e.target.value === "oracle") setUnionPort("1521");
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="postgresql">PostgreSQL</option>
                          <option value="mysql">MySQL</option>
                          <option value="oracle">Oracle</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Host</label>
                        <input
                          type="text"
                          value={unionHost}
                          onChange={(e) => setUnionHost(e.target.value)}
                          placeholder="localhost"
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Puerto</label>
                        <input
                          type="text"
                          value={unionPort}
                          onChange={(e) => setUnionPort(e.target.value)}
                          placeholder="5432"
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Base de Datos</label>
                        <input
                          type="text"
                          value={unionDatabase}
                          onChange={(e) => setUnionDatabase(e.target.value)}
                          placeholder="nombre_db"
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Usuario</label>
                        <input
                          type="text"
                          value={unionUser}
                          onChange={(e) => setUnionUser(e.target.value)}
                          placeholder="postgres"
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Contraseña</label>
                        <input
                          type="password"
                          value={unionPassword}
                          onChange={(e) => setUnionPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {unionDbType === "oracle" && (
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Nombre de Servicio (Oracle)</label>
                          <input
                            type="text"
                            value={unionServiceName}
                            onChange={(e) => setUnionServiceName(e.target.value)}
                            placeholder="xe"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Tabla a Unir</label>
                        <input
                          type="text"
                          value={unionTable}
                          onChange={(e) => setUnionTable(e.target.value)}
                          placeholder="ej. hospital_2"
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="text-xs text-slate-500 font-medium">¿Usar Agente Local Híbrido?</span>
                        <input
                          type="checkbox"
                          checked={unionUseAgent}
                          onChange={(e) => setUnionUseAgent(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Left Join Form */}
            {selectedType === "left_join" && (
              <div className="space-y-4">
                {/* Selector de tipo de origen secundario */}
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-4 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUnionSourceType("file")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      unionSourceType === "file"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Archivo (CSV / Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnionSourceType("database")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      unionSourceType === "database"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Base de Datos
                  </button>
                </div>

                {unionSourceType === "file" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Seleccionar Archivo Derecho/Secundario (.csv / .xlsx)
                    </label>
                    
                    {!unionMetadata && !unionUploading ? (
                      <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                        onClick={() => document.getElementById("join-file-input")?.click()}
                      >
                        <UploadCloud className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Haz clic para subir el archivo de cruce
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          CSV o Excel con datos relacionales.
                        </p>
                        <input 
                          type="file" 
                          id="join-file-input" 
                          className="hidden" 
                          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleUnionFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    ) : unionUploading ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Subiendo y validando archivo secundario...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200 dark:border-emerald-900/30 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center animate-scale-in">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {unionMetadata?.filename}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Archivo cargado listo para cruzar.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUnionMetadata(null);
                          }}
                          className="text-xs text-rose-500 hover:text-rose-600 font-semibold transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

                    {unionError && (
                      <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[11px] text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                        {unionError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Motor</label>
                        <select
                          value={unionDbType}
                          onChange={(e) => {
                            setUnionDbType(e.target.value);
                            if (e.target.value === "postgresql") setUnionPort("5432");
                            else if (e.target.value === "mysql") setUnionPort("3306");
                            else if (e.target.value === "oracle") setUnionPort("1521");
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="postgresql">PostgreSQL</option>
                          <option value="mysql">MySQL</option>
                          <option value="oracle">Oracle</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Host</label>
                        <input
                          type="text"
                          value={unionHost}
                          onChange={(e) => setUnionHost(e.target.value)}
                          placeholder="localhost"
                          required={selectedType === "left_join"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Puerto</label>
                        <input
                          type="text"
                          value={unionPort}
                          onChange={(e) => setUnionPort(e.target.value)}
                          placeholder="5432"
                          required={selectedType === "left_join"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Base de Datos</label>
                        <input
                          type="text"
                          value={unionDatabase}
                          onChange={(e) => setUnionDatabase(e.target.value)}
                          placeholder="nombre_db"
                          required={selectedType === "left_join"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Usuario</label>
                        <input
                          type="text"
                          value={unionUser}
                          onChange={(e) => setUnionUser(e.target.value)}
                          placeholder="postgres"
                          required={selectedType === "left_join"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Contraseña</label>
                        <input
                          type="password"
                          value={unionPassword}
                          onChange={(e) => setUnionPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {unionDbType === "oracle" && (
                        <div className="col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Nombre de Servicio (Oracle)</label>
                          <input
                            type="text"
                            value={unionServiceName}
                            onChange={(e) => setUnionServiceName(e.target.value)}
                            placeholder="xe"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Tabla a Cruzar</label>
                        <input
                          type="text"
                          value={unionTable}
                          onChange={(e) => setUnionTable(e.target.value)}
                          placeholder="ej. hospital_2"
                          required={selectedType === "left_join"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="text-[11px] text-slate-500 font-medium">¿Usar Agente Local Híbrido?</span>
                        <input
                          type="checkbox"
                          checked={unionUseAgent}
                          onChange={(e) => setUnionUseAgent(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Columnas clave para el cruce */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Claves de Asociación (Join Keys)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Clave Origen (Actual)</label>
                      <select
                        value={joinOnPrimary}
                        onChange={(e) => setJoinOnPrimary(e.target.value)}
                        required={selectedType === "left_join"}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Seleccionar --</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Clave Destino (Secundario)</label>
                      <input
                        type="text"
                        value={joinOnSecondary}
                        onChange={(e) => setJoinOnSecondary(e.target.value)}
                        placeholder="ej. id_usuario"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Si la columna clave secundaria tiene el mismo nombre que en el origen actual, puedes dejar la Clave Destino en blanco.
                  </p>
                </div>
              </div>
            )}

            {/* Split Column Form */}
            {selectedType === "split_column" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna a Dividir</label>
                  <select
                    value={splitCol}
                    onChange={(e) => setSplitCol(e.target.value)}
                    required={selectedType === "split_column"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delimitador</label>
                  <input
                    type="text"
                    value={splitDelimiter}
                    onChange={(e) => setSplitDelimiter(e.target.value)}
                    required={selectedType === "split_column"}
                    placeholder="ej. ; o , o |"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombres de Nuevas Columnas (Opcional)</label>
                  <input
                    type="text"
                    value={splitNewCols}
                    onChange={(e) => setSplitNewCols(e.target.value)}
                    placeholder="ej. medicamento1, medicamento2, medicamento3"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Escribe los nuevos nombres separados por comas. Si lo dejas en blanco, se autogenerarán (ej. columna_1, columna_2).
                  </span>
                </div>
              </div>
            )}

            {/* Add New Column Form */}
            {selectedType === "add_new_column" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombre de la Nueva Columna</label>
                  <input
                    type="text"
                    value={calcNewColName}
                    onChange={(e) => setCalcNewColName(e.target.value)}
                    required={selectedType === "add_new_column"}
                    placeholder="ej. precio_total"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expresión / Fórmula (Python)</label>
                  <input
                    type="text"
                    value={calcExpression}
                    onChange={(e) => setCalcExpression(e.target.value)}
                    required={selectedType === "add_new_column"}
                    placeholder="ej. cantidad * precio_unitario"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Puedes usar nombres de columnas directamente y operadores matemáticos básicos (*, /, +, -). Ej: subtotal * 1.19 o str(cedula) + &apos;_&apos; + nombre.
                  </span>
                </div>
              </div>
            )}

            {/* Transform Column Form */}
            {selectedType === "transform_column" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna a Modificar</label>
                  <select
                    value={transCol}
                    onChange={(e) => setTransCol(e.target.value)}
                    required={selectedType === "transform_column"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fórmula de Transformación</label>
                  <input
                    type="text"
                    value={transExpression}
                    onChange={(e) => setTransExpression(e.target.value)}
                    required={selectedType === "transform_column"}
                    placeholder="ej. x.lower() o x + 10"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Usa la letra x para representar el valor original de la celda. Ej: x.strip() o x.upper().
                  </span>
                </div>
              </div>
            )}

            {/* Filter by Condition Form */}
            {selectedType === "filter_by_condition" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expresión Lógica del Filtro</label>
                  <input
                    type="text"
                    value={condExpression}
                    onChange={(e) => setCondExpression(e.target.value)}
                    required={selectedType === "filter_by_condition"}
                    placeholder="ej. edad >= 18 and estado == &apos;Activo&apos;"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    El dataset mantendrá solo los registros que cumplan esta condición. Puedes usar and, or, not y nombres de columnas directos. Ej: ciudad == &apos;Bogotá&apos; or estrato &lt; 3.
                  </span>
                </div>
              </div>
            )}

            {/* Normalize Delimited Column Form */}
            {selectedType === "normalize_delimited_column" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna con Delimitadores</label>
                  <select
                    value={normCol}
                    onChange={(e) => setNormCol(e.target.value)}
                    required={selectedType === "normalize_delimited_column"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delimitador</label>
                  <input
                    type="text"
                    value={normDelimiter}
                    onChange={(e) => setNormDelimiter(e.target.value)}
                    required={selectedType === "normalize_delimited_column"}
                    placeholder="ej. , o ; o |"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">¿Conservar Columna Original?</span>
                  <input
                    type="checkbox"
                    checked={normKeepOrig}
                    onChange={(e) => setNormKeepOrig(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
              </div>
            )}

            {/* Sort Columns Form */}
            {selectedType === "sort_columns" && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Selecciona Columna(s) para Ordenar
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white dark:bg-slate-950">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!sortCols[col]}
                        onChange={() => {
                          setSortCols(prev => ({ ...prev, [col]: !prev[col] }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      {col}
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">¿Orden Ascendente (Menor a Mayor)?</span>
                  <input
                    type="checkbox"
                    checked={sortAscending}
                    onChange={(e) => setSortAscending(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
              </div>
            )}

            {/* Convert Column to List Form */}
            {selectedType === "convert_column_to_list" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna a Convertir</label>
                  <select
                    value={convCol}
                    onChange={(e) => setConvCol(e.target.value)}
                    required={selectedType === "convert_column_to_list"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delimitador</label>
                  <input
                    type="text"
                    value={convDelimiter}
                    onChange={(e) => setConvDelimiter(e.target.value)}
                    required={selectedType === "convert_column_to_list"}
                    placeholder="ej. ; o , o |"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Nueva Columna (Opcional)</label>
                  <input
                    type="text"
                    value={convNewCol}
                    onChange={(e) => setConvNewCol(e.target.value)}
                    placeholder="ej. nombre_columna_lista"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Si se deja vacío, la columna original se sobrescribirá con el formato de lista.
                  </span>
                </div>
              </div>
            )}

            {/* Explode Column List Form */}
            {selectedType === "explode_column_list" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna de Tipo Lista</label>
                  <select
                    value={expCol}
                    onChange={(e) => setExpCol(e.target.value)}
                    required={selectedType === "explode_column_list"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Esta operación tomará los elementos de tipo lista dentro de cada celda de esta columna y desglosará la fila en múltiples filas, repitiendo el resto de los valores.
                </p>
              </div>
            )}

            {/* Clean Numeric Columns Form */}
            {selectedType === "clean_numeric_columns" && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Selecciona Columna(s) a Limpiar
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white dark:bg-slate-950">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!cleanNumCols[col]}
                        onChange={() => {
                          setCleanNumCols(prev => ({ ...prev, [col]: !prev[col] }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      {col}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Eliminará automáticamente símbolos de moneda, comas de miles, espacios y cualquier letra para dejar valores puramente numéricos.
                </p>
              </div>
            )}

            {/* Clean Date Format Form */}
            {selectedType === "clean_date_format" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna de Fecha</label>
                  <select
                    value={cleanDateCol}
                    onChange={(e) => setCleanDateCol(e.target.value)}
                    required={selectedType === "clean_date_format"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Formato Destino (ej. %Y-%m-%d)</label>
                  <input
                    type="text"
                    value={cleanDateFormat}
                    onChange={(e) => setCleanDateFormat(e.target.value)}
                    required={selectedType === "clean_date_format"}
                    placeholder="ej. %Y-%m-%d o %d/%m/%Y"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Formato estándar: %Y para año (4 dígitos), %m para mes (2 dígitos), %d para día (2 dígitos).
                  </span>
                </div>
              </div>
            )}

            {/* Convert to Ordered Category Form */}
            {selectedType === "convert_to_ordered_category" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Columna a Categorizar</label>
                  <select
                    value={orderedCatCol}
                    onChange={(e) => setOrderedCatCol(e.target.value)}
                    required={selectedType === "convert_to_ordered_category"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Lista de Categorías Ordenadas (separadas por comas)</label>
                  <input
                    type="text"
                    value={orderedCatList}
                    onChange={(e) => setOrderedCatList(e.target.value)}
                    required={selectedType === "convert_to_ordered_category"}
                    placeholder="ej. Bajo, Medio, Alto o Enero, Febrero, Marzo"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                    Especifica el orden jerárquico de menor a mayor.
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">¿Establecer orden categórico estricto?</span>
                  <input
                    type="checkbox"
                    checked={orderedCatIsOrdered}
                    onChange={(e) => setOrderedCatIsOrdered(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
              </div>
            )}

            {/* Boolean to Binary Form */}
            {selectedType === "boolean_to_binary" && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Selecciona Columna(s) a Binario
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white dark:bg-slate-950">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!boolBinCols[col]}
                        onChange={() => {
                          setBoolBinCols(prev => ({ ...prev, [col]: !prev[col] }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      {col}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Convierte valores booleanos o lógicos (True/False, Verdadero/Falso) en sus representaciones numéricas binarias (1/0).
                </p>
              </div>
            )}

            {/* Sort By Form */}
            {selectedType === "sort_by" && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Selecciona Columna(s) para Ordenar Dataset
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white dark:bg-slate-950">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!sortByCols[col]}
                        onChange={() => {
                          setSortByCols(prev => ({ ...prev, [col]: !prev[col] }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      {col}
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">¿Orden Ascendente (Menor a Mayor)?</span>
                  <input
                    type="checkbox"
                    checked={sortByAscending}
                    onChange={(e) => setSortByAscending(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
              </div>
            )}

          </form>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
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
