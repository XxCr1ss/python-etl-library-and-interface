import type { StepParamsByType } from "@/types/etl";
import { columnDependency, defineStep, fieldsFor, newName } from "./factory";
import * as c from "./codecs";
const split = fieldsFor<StepParamsByType["split_column"]>();
const normalize = fieldsFor<StepParamsByType["normalize_delimited_column"]>();
const list = fieldsFor<StepParamsByType["convert_column_to_list"]>();
const explode = fieldsFor<StepParamsByType["explode_column_list"]>();
const rows = fieldsFor<StepParamsByType["split_column_into_rows"]>();
const sort = fieldsFor<StepParamsByType["sort_columns"]>();
const by = fieldsFor<StepParamsByType["sort_by"]>();
const duplicates = fieldsFor<StepParamsByType["drop_duplicates"]>();
const group = "Listas, orden y duplicados";
export const lists = {
  split_column: defineStep("split_column", "Dividir Columna", group, "Dividir texto en columnas. Los nombres opcionales se indican como lista JSON.", { column: "", delimiter: ";", new_columns: null }, [
    columnDependency(split("column", "Columna", "column", c.nonempty), p => p.column), split("delimiter", "Delimitador", "text", c.nonempty), split("new_columns", "Nuevas columnas (lista JSON o null)", "json", c.optional(c.nullable(c.strings))),
  ], (p, ctx) => p.new_columns?.some(name => newName(name, ctx)) ? { new_columns: "Usa nombres nuevos sin colisiones." } : {}),
  normalize_delimited_column: defineStep("normalize_delimited_column", "Normalizar Celda", group, "Separar valores delimitados en filas.", { column: "", delimiter: ",", keep_original: true }, [
    columnDependency(normalize("column", "Columna", "column", c.nonempty), p => p.column), normalize("delimiter", "Delimitador", "text", c.optional(c.nonempty)), normalize("keep_original", "Conservar original", "boolean", c.optional(c.boolean)),
  ]),
  convert_column_to_list: defineStep("convert_column_to_list", "Texto a Lista", group, "Convertir texto en una lista JSON.", { column: "", delimiter: ";", new_column: null }, [
    columnDependency(list("column", "Columna", "column", c.nonempty), p => p.column), list("delimiter", "Delimitador", "text", c.optional(c.nonempty)), list("new_column", "Nueva columna (null para predeterminado)", "text", c.optional(c.nullable(c.nonempty))),
  ], (p, ctx) => { const error = p.new_column === p.column ? undefined : newName(p.new_column, ctx); return error ? { new_column: error } : {}; }),
  explode_column_list: defineStep("explode_column_list", "Desglosar Lista", group, "Expandir los elementos de una lista en filas.", { column: "" }, [columnDependency(explode("column", "Columna", "column", c.nonempty), p => p.column)]),
  split_column_into_rows: defineStep("split_column_into_rows", "Dividir en Filas", group, "Expandir texto en filas; eliminar el original solo si se solicita.", { column: "", delimiter: ";", new_column_name: null, drop_original: false }, [
    columnDependency(rows("column", "Columna", "column", c.nonempty), p => p.column), rows("delimiter", "Delimitador", "text", c.nonempty), rows("new_column_name", "Nueva columna (null para predeterminado)", "text", c.optional(c.nullable(c.nonempty))), rows("drop_original", "Eliminar original", "boolean", c.optional(c.boolean)),
  ], (p, ctx) => { const error = p.new_column_name === p.column ? undefined : newName(p.new_column_name, ctx); return error ? { new_column_name: error } : {}; }),
  sort_columns: defineStep("sort_columns", "Ordenar Filas", group, "Ordenar filas por las columnas seleccionadas; no reordena cabeceras.", { columns: [], ascending: true }, [
    columnDependency(sort("columns", "Columnas", "columns", c.columns), p => p.columns), sort("ascending", "Ascendente", "boolean", c.optional(c.boolean)),
  ]),
  sort_by: defineStep("sort_by", "Ordenar Registros", group, "Ordenar filas por columnas clave; conserva el tipo sort_by.", { columns: [], ascending: true }, [
    columnDependency(by("columns", "Columnas", "columns", c.columns), p => p.columns), by("ascending", "Ascendente", "boolean", c.optional(c.boolean)),
  ]),
  drop_duplicates: defineStep("drop_duplicates", "Eliminar Duplicados", group, "Aplicar a todas las columnas (null) o a un subconjunto.", { subset: null }, [columnDependency(duplicates("subset", "Subconjunto", "columns", c.optional(c.nullable(c.columns))), p => p.subset, true)]),
};
