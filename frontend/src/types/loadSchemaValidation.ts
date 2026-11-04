import { object } from "@/services/apiClient";
import { requireContract as check, strings } from "@/services/responseValidators";
import type { LoadSchemaSpec } from "./etl";

export class LoadSchemaError extends Error {
  constructor(public tab: string, public field: string, message: string) { super(message); }
}

function requireField(condition: unknown, tab: string, field: string, message: string): asserts condition {
  if (!condition) throw new LoadSchemaError(tab, field, message);
}

export function parseLoadSchema(value: unknown): LoadSchemaSpec {
  check(object(value) && value.version === 1 && Array.isArray(value.columns) && value.columns.length > 0 && value.columns.length <= 500);
  requireField(typeof value.grain === "string" && value.grain.length <= 500, "table", "load-grain", "El grano admite hasta 500 caracteres.");
  check(value.allow_add_constraints === undefined || typeof value.allow_add_constraints === "boolean");
  const identifier = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(v);
  const columns = value.columns.map((c, i) => {
    requireField(object(c) && identifier(c.name) && ["integer", "decimal", "float", "boolean", "string", "date", "datetime"].includes(String(c.type)) && typeof c.nullable === "boolean",
      "columns", `load-column-type-${i}`, `Revisa el nombre y el tipo de la columna ${i + 1}. El nombre debe ser un identificador SQL simple.`);
    requireField(c.precision === undefined || Number.isInteger(c.precision) && Number(c.precision) >= 1 && Number(c.precision) <= 38,
      "columns", `load-column-precision-${i}`, `La precisión de «${c.name}» debe estar entre 1 y 38.`);
    const scale = c.scale === undefined ? 8 : c.scale;
    requireField(Number.isInteger(scale) && Number(scale) >= 0 && Number(scale) <= Number(c.precision ?? 30),
      "columns", `load-column-scale-${i}`, `La escala de «${c.name}» debe estar entre 0 y la precisión.`);
    check(c.timezone === undefined || typeof c.timezone === "boolean");
    requireField(c.unit === undefined || c.unit === null || typeof c.unit === "string" && c.unit.length <= 100,
      "columns", `load-column-unit-${i}`, `La unidad de «${c.name}» admite hasta 100 caracteres.`);
    return { name: c.name, type: c.type, nullable: c.nullable, ...(c.precision !== undefined ? { precision: c.precision } : {}), ...(c.scale !== undefined ? { scale: c.scale } : {}), ...(c.timezone !== undefined ? { timezone: c.timezone } : {}), ...(c.unit !== undefined ? { unit: c.unit } : {}) };
  });
  const names = new Set(columns.map(c => c.name));
  check(names.size === columns.length);
  const key = (v: unknown): v is string[] => strings(v) && new Set(v).size === v.length && v.every(n => names.has(n));
  requireField(key(value.primary_key) && value.primary_key.length <= 16, "keys", "load-primary-key", "La PK debe usar hasta 16 columnas existentes sin repetirlas.");
  for (const [group, tab] of [["unique_keys", "keys"], ["indexes", "indexes"]] as const) {
    const entries = value[group];
    requireField(Array.isArray(entries) && entries.length <= 20, tab, `load-add-${group}`, "Puedes configurar hasta 20 elementos en esta sección.");
    const seen = new Set<string>();
    entries.forEach((entry, i) => {
      const field = `load-${group}-${i}`;
      requireField(key(entry) && entry.length, tab, field, `La entrada ${i + 1} requiere columnas existentes sin repetirlas.`);
      const signature = JSON.stringify(group === "unique_keys" ? [...entry].sort() : entry);
      requireField(!seen.has(signature), tab, field, `La entrada ${i + 1} repite una definición de esta sección.`);
      seen.add(signature);
    });
  }
  requireField(Array.isArray(value.foreign_keys) && value.foreign_keys.length <= 20, "keys", "load-add-fk", "Puedes configurar hasta 20 FK físicas.");
  value.foreign_keys.forEach((f, i) => {
    requireField(object(f) && key(f.columns) && f.columns.length > 0 && f.columns.length <= 16, "keys", `load-fk-columns-${i}`, `Selecciona de 1 a 16 columnas locales válidas para la FK física ${i + 1}.`);
    requireField(identifier(f.target_table), "keys", `load-fk-table-${i}`, `Completa la tabla referenciada de la FK física ${i + 1} con un identificador SQL simple.`);
    requireField(strings(f.target_columns) && f.target_columns.every(identifier) && new Set(f.target_columns).size === f.columns.length && f.target_columns.length === f.columns.length,
      "keys", `load-fk-target-${i}`, `La FK física ${i + 1} requiere una columna referenciada distinta por cada columna local.`);
  });
  requireField(Array.isArray(value.checks) && value.checks.length <= 50, "quality", "load-add-check", "Puedes configurar hasta 50 comprobaciones.");
  value.checks.forEach((c, i) => requireField(object(c) && names.has(String(c.column)) && ["not_null", "unique", "range", "sum"].includes(String(c.kind)) && ["error", "warning"].includes(String(c.severity)) && [c.minimum, c.maximum].every(v => v === undefined || v === null || typeof v === "string" && v.length <= 100),
    "quality", `load-check-${i}`, `Revisa la columna, la regla y los límites de la comprobación ${i + 1}.`));
  // Reconstruct an allowlist; unexpected imported properties cannot carry credentials.
  return { version: 1, grain: value.grain, ...(value.allow_add_constraints !== undefined ? { allow_add_constraints: value.allow_add_constraints } : {}), columns, primary_key: value.primary_key, unique_keys: value.unique_keys, indexes: value.indexes,
    foreign_keys: value.foreign_keys.map(f => { check(object(f)); return { columns: f.columns, target_table: f.target_table, target_columns: f.target_columns }; }),
    checks: value.checks.map(c => { check(object(c)); return { column: c.column, kind: c.kind, severity: c.severity, ...(c.minimum !== undefined ? { minimum: c.minimum } : {}), ...(c.maximum !== undefined ? { maximum: c.maximum } : {}) }; }) } as LoadSchemaSpec;
}
