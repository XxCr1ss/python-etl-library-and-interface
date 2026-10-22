import type { Catalog, CatalogColumn, FieldRef, WarehouseQuery } from "@/types/warehouse";
export type FieldOption = { key: string; label: string; ref: FieldRef; column: CatalogColumn };
export const newOutputId = (prefix: string) => prefix + "_" + crypto.randomUUID().replaceAll("-", "");
export function queryFields(catalog: Catalog, query: WarehouseQuery): FieldOption[] {
  return [{ id: "base", table: query.base_table_id, label: "Base" }, ...query.joins.map((j, i) => ({ id: j.id, table: j.target_table_id, label: `Relación ${i + 1}` }))].flatMap(relation => {
    const table = catalog.tables.find(t => t.table_id === relation.table);
    return (table?.columns || []).filter(c => c.logical_type !== "unsupported").map(column => {
      const ref = { relation: relation.id, column: column.name };
      return { key: JSON.stringify(ref), label: `${relation.label} · ${table?.table_name}.${column.name}`, ref, column };
    });
  });
}
export const fieldKey = (ref: FieldRef) => JSON.stringify(ref);
