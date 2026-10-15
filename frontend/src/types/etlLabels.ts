import type { SourceDescriptor } from "./etl";
export function sourceName(source: SourceDescriptor) {
  return source.type === "file" ? source.filename || "Archivo" : source.type === "database" ? `${source.database}.${source.table_name}` : `Dimensión fecha ${source.start_year}–${source.end_year}`;
}
