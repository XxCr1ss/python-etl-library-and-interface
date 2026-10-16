import type { SourceDescriptor } from "@/types/etl";

// Persist only this safe display name, never the descriptor or connection.
export function sourceLabel(source: SourceDescriptor | null): string {
  if (!source) return "Sin origen confirmado";
  if (source.type === "date_dimension") return `Dimensión fecha · ${source.start_year}–${source.end_year}`;
  if (source.type === "database") return `Tabla · ${source.table_name}`;
  return source.filename?.split(/[\\/]/).pop() || "Archivo";
}
