import type { LoadConfigDto } from "@/types/etl";

export interface ForeignKeyRow { id: string; column: string; table: string; primaryKey: string }
export const simpleIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
export const foreignKeyRows = (config: LoadConfigDto): ForeignKeyRow[] => Object.entries(config.foreign_keys || {})
  .map(([column, [table, primaryKey]], i) => ({ id: `restored-${i}`, column, table, primaryKey }));
export function foreignKeyError(row: ForeignKeyRow, rows: ForeignKeyRow[], columns: string[]): string | undefined {
  if (!row.column || !row.table || !row.primaryKey) return "Completa columna, tabla dimensión y PK destino.";
  if (!columns.includes(row.column)) return "La columna ya no existe en el esquema de entrada. Ajusta o elimina esta FK.";
  if (rows.filter(other => other.column === row.column).length > 1) return "La columna origen está repetida.";
  if (!simpleIdentifier(row.table) || !simpleIdentifier(row.primaryKey)) return "Usa nombres simples de tabla y PK, sin esquema ni citas.";
}
export function validLoadConfig(config: LoadConfigDto, rows: ForeignKeyRow[], columns: string[]) {
  return simpleIdentifier(config.table_name) && ["replace", "append", "fail", "reload", "schema_only"].includes(config.if_exists || "") &&
    (!["reload", "schema_only"].includes(config.if_exists || "") || !!config.schema_spec) &&
    (!config.schema_spec || (!!config.schema_spec.grain.trim() && config.schema_spec.columns.length === columns.length && config.schema_spec.columns.every(c => columns.includes(c.name)))) &&
    (config.table_type === "dimension" || rows.every(row => !foreignKeyError(row, rows, columns)));
}
export function loadConfigDto(config: LoadConfigDto, rows: ForeignKeyRow[]): LoadConfigDto {
  const { table_name, table_type, if_exists } = config;
  return { table_name, table_type, if_exists, ...(config.schema_spec ? { schema_spec: config.schema_spec } : {}), ...(table_type === "fact" && rows.length
    ? { foreign_keys: Object.fromEntries(rows.map(row => [row.column, [row.table, row.primaryKey] as [string, string]])) } : {}) };
}
