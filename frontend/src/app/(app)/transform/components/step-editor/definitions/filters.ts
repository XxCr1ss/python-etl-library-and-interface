import type { StepParamsByType } from "@/types/etl";
import { columnDependency, defineStep, fieldsFor } from "./factory";
import * as c from "./codecs";
const value = fieldsFor<StepParamsByType["filter_value"]>();
const range = fieldsFor<StepParamsByType["filter_in_range"]>();
const list = fieldsFor<StepParamsByType["filter_in_list"]>();
const nil = fieldsFor<StepParamsByType["filter_is_null"]>();
const present = fieldsFor<StepParamsByType["select_not_none"]>();
const search = fieldsFor<StepParamsByType["search_in_column"]>();
const table = fieldsFor<StepParamsByType["search_in_table"]>();
const length = fieldsFor<StepParamsByType["filter_by_list_length"]>();
const group = "Filtros y búsqueda";
const regexHint = "Patrón Python: la sintaxis y evaluación se validan en el servidor; el navegador no lo ejecuta.";
const operator: c.Codec<string> = { ...c.nonempty, parse: raw => { c.ensure(["eq", "ne", "gt", "ge", "lt", "le"].includes(raw), "Usa eq, ne, gt, ge, lt o le."); return raw; } };
export const filters = {
  filter_value: defineStep("filter_value", "Filtrar Datos", group, "Comparar con un valor de tipo explícito.", { column: "", value: "", operator: "eq" }, [
    columnDependency(value("column", "Columna", "column", c.nonempty), p => p.column), value("value", "Valor", "value", c.jsonValue), value("operator", "Operador", "text", c.optional(operator), "eq, ne, gt, ge, lt o le"),
  ], p => p.value === null ? { value: "Usa Filtrar Vacíos para buscar null." } : {}),
  filter_in_range: defineStep("filter_in_range", "Filtrar por Rango", group, "Conservar valores entre mínimo y máximo.", { column: "", min_value: 0, max_value: 0, complement: false }, [
    columnDependency(range("column", "Columna", "column", c.nonempty), p => p.column), range("min_value", "Mínimo", "number", c.number), range("max_value", "Máximo", "number", c.number), range("complement", "Complemento", "boolean", c.optional(c.boolean)),
  ], p => p.min_value > p.max_value ? { max_value: "El máximo debe ser mayor o igual al mínimo." } : {}),
  filter_in_list: defineStep("filter_in_list", "Filtrar por Lista", group, "Buscar pertenencia a una lista conservando tipos y orden.", { column: "", values: [], complement: false }, [
    columnDependency(list("column", "Columna", "column", c.nonempty), p => p.column), list("values", "Valores (lista JSON)", "json", c.values, 'Ejemplo: ["001", 0, false, ""]'), list("complement", "Complemento", "boolean", c.optional(c.boolean)),
  ], p => !p.values.length ? { values: "Incluye al menos un valor." } : {}),
  filter_is_null: defineStep("filter_is_null", "Filtrar Vacíos", group, "Conservar registros nulos; complemento invierte el resultado.", { column: "", complement: false }, [
    columnDependency(nil("column", "Columna", "column", c.nonempty), p => p.column), nil("complement", "Complemento", "boolean", c.optional(c.boolean)),
  ]),
  select_not_none: defineStep("select_not_none", "Filtrar Completos", group, "Conservar registros no nulos; mantiene su operación independiente.", { column: "", complement: false }, [
    columnDependency(present("column", "Columna", "column", c.nonempty), p => p.column), present("complement", "Complemento", "boolean", c.optional(c.boolean)),
  ]),
  search_in_column: defineStep("search_in_column", "Buscar en Columna", group, "Filtrar una columna con un patrón de búsqueda.", { column: "", pattern: "", complement: false, case_sensitive: false }, [
    columnDependency(search("column", "Columna", "column", c.nonempty), p => p.column), search("pattern", "Patrón", "text", c.nonempty, regexHint), search("complement", "Complemento", "boolean", c.optional(c.boolean)), search("case_sensitive", "Distinguir mayúsculas", "boolean", c.optional(c.boolean)),
  ]),
  search_in_table: defineStep("search_in_table", "Buscar en Tabla", group, "Buscar un patrón en todas las columnas.", { pattern: "", complement: false, case_sensitive: false }, [
    table("pattern", "Patrón", "text", c.nonempty, regexHint), table("complement", "Complemento", "boolean", c.optional(c.boolean)), table("case_sensitive", "Distinguir mayúsculas", "boolean", c.optional(c.boolean)),
  ]),
  filter_by_list_length: defineStep("filter_by_list_length", "Filtrar por Longitud", group, "Buscar listas por una o varias longitudes, incluido cero.", { column: "", length: [], keep_in: true }, [
    columnDependency(length("column", "Columna", "column", c.nonempty), p => p.column), length("length", "Longitudes (entero o lista JSON)", "json", c.lengths), length("keep_in", "Conservar coincidencias", "boolean", c.optional(c.boolean)),
  ]),
};
