import type { StepParamsByType } from "@/types/etl";
import { columnDependency, defineStep, fieldsFor, newName } from "./factory";
import * as c from "./codecs";

const rename = fieldsFor<StepParamsByType["rename_columns"]>();
const select = fieldsFor<StepParamsByType["select_columns"]>();
const remove = fieldsFor<StepParamsByType["remove_columns"]>();
const headers = fieldsFor<StepParamsByType["replace_all_headers"]>();
const prefix = fieldsFor<StepParamsByType["prefix_header"]>();
const suffix = fieldsFor<StepParamsByType["suffix_header"]>();
const index = fieldsFor<StepParamsByType["add_sequential_index"]>();
export const structure = {
  rename_columns: defineStep("rename_columns", "Renombrar", "Cabeceras y estructura", "Cambiar uno o varios nombres de columnas.", { columns: {} }, [rename("columns", "Renombres", "map", c.stringMap)], (p, ctx) => {
    if (!Object.keys(p.columns).length) return { columns: "Añade al menos un renombre." };
    if (Object.keys(p.columns).some(name => !ctx.columns.includes(name))) return { columns: "La columna original no existe antes de este paso." };
    const result = ctx.columns.map(name => p.columns[name] ?? name);
    return result.some(name => !name.trim()) || new Set(result).size !== result.length ? { columns: "Las cabeceras finales deben ser únicas y no vacías." } : {};
  }),
  select_columns: defineStep("select_columns", "Mantener Cols", "Cabeceras y estructura", "Conservar columnas en el orden seleccionado.", { columns: [] }, [columnDependency(select("columns", "Columnas", "columns", c.strings), p => p.columns)]),
  remove_columns: defineStep("remove_columns", "Eliminar Cols", "Cabeceras y estructura", "Retirar columnas de la receta.", { columns: [] }, [columnDependency(remove("columns", "Columnas", "columns", c.columns), p => p.columns)]),
  replace_all_headers: defineStep("replace_all_headers", "Reemplazar Cabeceras", "Cabeceras y estructura", "Asignar un nombre único por columna, en orden.", { new_headers: [] }, [headers("new_headers", "Cabeceras nuevas (lista JSON)", "json", c.strings)], (p, ctx) => !p.new_headers.length || p.new_headers.length !== ctx.columns.length ? { new_headers: "Incluye un nombre por cada columna de entrada." } : {}),
  prefix_header: defineStep("prefix_header", "Agregar Prefijo", "Cabeceras y estructura", "Añadir texto antes de cada cabecera.", { prefix: "" }, [prefix("prefix", "Prefijo", "text", c.nonempty)]),
  suffix_header: defineStep("suffix_header", "Agregar Sufijo", "Cabeceras y estructura", "Añadir texto después de cada cabecera.", { suffix: "" }, [suffix("suffix", "Sufijo", "text", c.nonempty)]),
  add_sequential_index: defineStep("add_sequential_index", "Índice Secuencial", "Cabeceras y estructura", "Crear una columna autoincremental. El inicio admite cero.", { column_name: "id", start: 1 }, [index("column_name", "Nombre del índice", "text", c.optional(c.nonempty)), index("start", "Inicio", "number", c.optional(c.integer))], (p, ctx) => {
    const error = newName(p.column_name ?? "index", ctx); return error ? { column_name: error } : {};
  }),
};
