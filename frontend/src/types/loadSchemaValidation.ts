import { object } from "@/services/apiClient";
import { requireContract as check, strings } from "@/services/responseValidators";
import type { LoadSchemaSpec } from "./etl";

export function parseLoadSchema(value: unknown): LoadSchemaSpec {
  check(object(value) && value.version === 1 && typeof value.grain === "string" && value.grain.length <= 500 && Array.isArray(value.columns) && value.columns.length > 0 && value.columns.length <= 500);
  check(value.allow_add_constraints === undefined || typeof value.allow_add_constraints === "boolean");
  const identifier = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(v);
  const columns = value.columns.map(c => {
    check(object(c) && identifier(c.name) && ["integer", "decimal", "float", "boolean", "string", "date", "datetime"].includes(String(c.type)) && typeof c.nullable === "boolean");
    check(c.precision === undefined || Number.isInteger(c.precision) && Number(c.precision) >= 1 && Number(c.precision) <= 38);
    check(c.scale === undefined || Number.isInteger(c.scale) && Number(c.scale) >= 0 && Number(c.scale) <= Number(c.precision ?? 30));
    check(c.timezone === undefined || typeof c.timezone === "boolean");
    check(c.unit === undefined || c.unit === null || typeof c.unit === "string" && c.unit.length <= 100);
    return { name: c.name, type: c.type, nullable: c.nullable, ...(c.precision !== undefined ? { precision: c.precision } : {}), ...(c.scale !== undefined ? { scale: c.scale } : {}), ...(c.timezone !== undefined ? { timezone: c.timezone } : {}), ...(c.unit !== undefined ? { unit: c.unit } : {}) };
  });
  const names = new Set(columns.map(c => c.name));
  check(names.size === columns.length);
  const key = (v: unknown) => strings(v) && new Set(v).size === v.length && v.every(n => names.has(n));
  check(key(value.primary_key) && Array.isArray(value.unique_keys) && value.unique_keys.length <= 20 && value.unique_keys.every(k => key(k) && k.length));
  check(Array.isArray(value.indexes) && value.indexes.length <= 20 && value.indexes.every(k => key(k) && k.length));
  check(Array.isArray(value.foreign_keys) && value.foreign_keys.length <= 20 && value.foreign_keys.every(f => object(f) && key(f.columns) && Array.isArray(f.columns) && f.columns.length && identifier(f.target_table) && strings(f.target_columns) && f.target_columns.every(identifier) && f.target_columns.length === f.columns.length));
  check(Array.isArray(value.checks) && value.checks.length <= 50 && value.checks.every(c => object(c) && names.has(String(c.column)) && ["not_null", "unique", "range", "sum"].includes(String(c.kind)) && ["error", "warning"].includes(String(c.severity)) && [c.minimum, c.maximum].every(v => v === undefined || v === null || typeof v === "string" && v.length <= 100)));
  // Reconstruct an allowlist; unexpected imported properties cannot carry credentials.
  return { version: 1, grain: value.grain, ...(value.allow_add_constraints !== undefined ? { allow_add_constraints: value.allow_add_constraints } : {}), columns, primary_key: value.primary_key, unique_keys: value.unique_keys, indexes: value.indexes,
    foreign_keys: value.foreign_keys.map(f => { check(object(f)); return { columns: f.columns, target_table: f.target_table, target_columns: f.target_columns }; }),
    checks: value.checks.map(c => { check(object(c)); return { column: c.column, kind: c.kind, severity: c.severity, ...(c.minimum !== undefined ? { minimum: c.minimum } : {}), ...(c.maximum !== undefined ? { maximum: c.maximum } : {}) }; }) } as LoadSchemaSpec;
}
