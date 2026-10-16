import type { StepParamsByType } from "@/types/etl";
import { columnDependency, defineStep, fieldsFor, newName } from "./factory";
import * as c from "./codecs";
const mean = fieldsFor<StepParamsByType["group_by"]>();
const sum = fieldsFor<StepParamsByType["group_by_sum"]>();
const count = fieldsFor<StepParamsByType["group_by_count"]>();
const shift = fieldsFor<StepParamsByType["group_by_shift"]>();
const add = fieldsFor<StepParamsByType["add_new_column"]>();
const transform = fieldsFor<StepParamsByType["transform_column"]>();
const filter = fieldsFor<StepParamsByType["filter_by_condition"]>();
const group = "Agregación y expresiones";
const expressionHint = "Expresión Python. El servidor valida la sintaxis y la evalúa; el navegador no la ejecuta. Los errores aparecen en la preview.";
export const expressions = {
  group_by: defineStep("group_by", "Agrupar (Promedio)", group, "Agrupar y calcular el promedio de una columna.", { by: [], column: "" }, [
    columnDependency(mean("by", "Agrupar por", "columns", c.columns), p => p.by), columnDependency(mean("column", "Columna de valores", "column", c.nonempty), p => p.column),
  ]),
  group_by_sum: defineStep("group_by_sum", "Agrupar por Suma", group, "Agrupar y sumar una columna.", { by: [], column: "" }, [
    columnDependency(sum("by", "Agrupar por", "columns", c.columns), p => p.by), columnDependency(sum("column", "Columna de valores", "column", c.nonempty), p => p.column),
  ]),
  group_by_count: defineStep("group_by_count", "Agrupar por Conteo", group, "Contar registros por grupo.", { by: [] }, [columnDependency(count("by", "Agrupar por", "columns", c.columns), p => p.by)]),
  group_by_shift: defineStep("group_by_shift", "Desfase Temporal", group, "Desplazar valores por grupo; periods admite cero y enteros negativos.", { by: [], column: "", new_column_name: "", periods: 1 }, [
    columnDependency(shift("by", "Agrupar por", "columns", c.columns), p => p.by), columnDependency(shift("column", "Columna de valores", "column", c.nonempty), p => p.column), shift("new_column_name", "Nueva columna", "text", c.nonempty), shift("periods", "Períodos", "number", c.optional(c.integer)),
  ], (p, ctx) => { const error = newName(p.new_column_name, ctx); return error ? { new_column_name: error } : {}; }),
  add_new_column: defineStep("add_new_column", "Columna Calculada", group, "Crear una columna con una expresión sobre los nombres de la fila.", { new_column_name: "", expression: "" }, [
    add("new_column_name", "Nueva columna", "text", c.nonempty), add("expression", "Expresión", "text", c.nonempty, expressionHint),
  ], (p, ctx) => { const error = newName(p.new_column_name, ctx); return error ? { new_column_name: error } : {}; }),
  transform_column: defineStep("transform_column", "Transformar Col", group, "Modificar una columna usando x como valor de celda.", { column: "", expression: "" }, [
    columnDependency(transform("column", "Columna", "column", c.nonempty), p => p.column), transform("expression", "Expresión", "text", c.nonempty, expressionHint),
  ]),
  filter_by_condition: defineStep("filter_by_condition", "Filtro Condicional", group, "Conservar filas que cumplen una expresión sobre sus columnas.", { expression: "" }, [filter("expression", "Expresión", "text", c.nonempty, expressionHint)]),
};
