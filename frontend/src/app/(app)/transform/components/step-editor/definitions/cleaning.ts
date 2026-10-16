import type { StepParamsByType } from "@/types/etl";
import { columnDependency, defineStep, fieldsFor } from "./factory";
import * as c from "./codecs";
const convert = fieldsFor<StepParamsByType["convert_types"]>();
const fill = fieldsFor<StepParamsByType["fill_nulls"]>();
const numeric = fieldsFor<StepParamsByType["clean_numeric_columns"]>();
const date = fieldsFor<StepParamsByType["clean_date_format"]>();
const category = fieldsFor<StepParamsByType["convert_to_ordered_category"]>();
const binary = fieldsFor<StepParamsByType["boolean_to_binary"]>();
const replace = fieldsFor<StepParamsByType["replace_values"]>();
const group = "Conversión y limpieza";
export const cleaning = {
  convert_types: defineStep("convert_types", "Cambiar Tipo", group, "Convertir columnas con un tipo o un mapa de tipos por columna.", { columns: [], dtype: "str" }, [
    columnDependency(convert("columns", "Columnas", "columns", c.columns), p => p.columns), convert("dtype", "Tipo de datos", "value", c.dtype, "Ejemplos: str, int64, float64, bool; JSON permite un mapa de columna a tipo."),
  ], (p, ctx) => typeof p.dtype === "object" && Object.keys(p.dtype).some(name => !ctx.columns.includes(name)) ? { dtype: "El mapa contiene una columna inexistente." } : {}),
  fill_nulls: defineStep("fill_nulls", "Rellenar Nulos", group, "Sustituir nulos con un valor explícito. Admite 0, false y texto vacío.", { column: "", value: "" }, [
    columnDependency(fill("column", "Columna", "column", c.nonempty), p => p.column), fill("value", "Valor de relleno", "value", c.nonNullValue),
  ]),
  clean_numeric_columns: defineStep("clean_numeric_columns", "Limpiar Números", group, "Limpiar símbolos y texto de columnas numéricas.", { columns: [] }, [columnDependency(numeric("columns", "Columnas", "columns", c.columns), p => p.columns)]),
  clean_date_format: defineStep("clean_date_format", "Estandarizar Fecha", group, "Normalizar fechas con el formato de salida Python indicado.", { column: "", format_output: "%Y-%m-%d" }, [
    columnDependency(date("column", "Columna", "column", c.nonempty), p => p.column), date("format_output", "Formato de salida", "text", c.optional(c.nonempty)),
  ]),
  convert_to_ordered_category: defineStep("convert_to_ordered_category", "Categoría Ordenada", group, "El orden de la lista define el orden de categorías.", { column: "", categories: [], ordered: true }, [
    columnDependency(category("column", "Columna", "column", c.nonempty), p => p.column), category("categories", "Categorías (lista JSON)", "json", c.values), category("ordered", "Categorías ordenadas", "boolean", c.optional(c.boolean)),
  ], p => !p.categories.length ? { categories: "Incluye al menos una categoría." } : {}),
  boolean_to_binary: defineStep("boolean_to_binary", "Booleano a Binario", group, "Convertir true a 1 y false a 0.", { columns: [] }, [columnDependency(binary("columns", "Columnas", "columns", c.columns), p => p.columns)]),
  replace_values: defineStep("replace_values", "Reemplazar Valores", group, "Sustituir valores conservando sus tipos. El texto vacío es válido.", { column: "", old_value: "", new_value: "" }, [
    columnDependency(replace("column", "Columna", "column", c.nonempty), p => p.column), replace("old_value", "Valor anterior", "value", c.nonNullValue), replace("new_value", "Valor nuevo", "value", c.nonNullValue),
  ]),
};
