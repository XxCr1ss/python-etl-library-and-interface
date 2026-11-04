import { fieldKey, type FieldOption } from "@/features/warehouse/queryFields";
import type { AnalysisSpec, Measure } from "@/types/analysis";
import type { Catalog, WarehouseFilter } from "@/types/warehouse";
import { fieldsFor } from "./AnalysisFields";

export interface AnalysisIssue { tab: string; field: string; message: string }

export const isCount = (measure: Measure) => ["COUNT", "COUNT_ROWS", "COUNT_DISTINCT"].includes(measure.aggregation);

export function defaultCountUnits(spec: AnalysisSpec): AnalysisSpec {
  return { ...spec, measures: spec.measures.map(measure => isCount(measure) && !measure.unit?.trim() ? { ...measure, unit: "count" } : measure) };
}

function validDate(value: unknown) {
  if (typeof value !== "string" || value.startsWith("0000")) return false;
  // The API also accepts ISO basic and week dates. It validates their calendar bounds.
  if (/^(?:\d{8}|\d{4}W\d{2}\d?|\d{4}-W\d{2}(?:-\d)?)$/.test(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function filterIssue(filters: WarehouseFilter[], fields: FieldOption[], tab: string, scope: string, label: string): AnalysisIssue | null {
  for (let index = 0; index < filters.length; index++) {
    const filter = filters[index];
    const field = fields.find(option => option.key === fieldKey(filter.field));
    if (!field || filter.op === "IS_NULL" || filter.op === "IS_NOT_NULL") continue;
    if (field.column.logical_type !== "date") continue;
    const values = filter.op === "BETWEEN" || filter.op === "IN" ? filter.values : [filter.value];
    const invalid = values.findIndex(value => !validDate(value));
    if (invalid !== -1) return {
      tab, field: `${scope}-filter-${index}-${filter.op === "BETWEEN" ? invalid : 0}`,
      message: `${label}, filtro ${index + 1} («${field.column.name}»). Escribe una fecha válida con el formato AAAA-MM-DD.`,
    };
  }
  return null;
}

export function firstAnalysisIssue(spec: AnalysisSpec, catalog: Catalog): AnalysisIssue | null {
  if (!spec.title.trim()) return { tab: "events", field: "title", message: "Escribe un título para el análisis." };
  if (!spec.grain.trim()) return { tab: "events", field: "grain", message: "Indica qué representa una fila." };
  const max = catalog.capabilities.effective_limits.groups;
  if (!Number.isInteger(spec.limit) || spec.limit < 1 || spec.limit > max) {
    return { tab: "output", field: "limit", message: `Elige entre 1 y ${max} grupos.` };
  }
  const events = fieldsFor(catalog, spec.selection);
  const population = spec.population ? fieldsFor(catalog, spec.population.selection) : [];
  const selections = [
    { filters: spec.selection.filters, fields: events, tab: "events", scope: "events", label: "Eventos" },
    ...(spec.population ? [{ filters: spec.population.selection.filters, fields: population, tab: "cohorts", scope: "population", label: "Población" }] : []),
    ...(spec.cohorts || []).map((cohort, i) => ({ filters: cohort.selection.filters, fields: fieldsFor(catalog, cohort.selection), tab: "cohorts", scope: `cohort-${i}`, label: `Cohorte ${i + 1}` })),
  ];
  for (const group of selections) {
    const invalid = filterIssue(group.filters, group.fields, group.tab, group.scope, group.label);
    if (invalid) return invalid;
  }
  for (let index = 0; index < spec.measures.length; index++) {
    const measure = spec.measures[index];
    if (measure.unit !== undefined && !measure.unit?.trim() && !isCount(measure)) {
      return { tab: "measures", field: `unit-${index}`, message: `Escribe una unidad para la medida ${index + 1}.` };
    }
    const fields = measure.scope === "population" || measure.scope === "population_total" ? population : events;
    const invalid = filterIssue(measure.filters || [], fields, "measures", `measure-${index}`, `Medida ${index + 1}`);
    if (invalid) return invalid;
  }
  return null;
}
