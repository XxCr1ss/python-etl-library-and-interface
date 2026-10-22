import type { LogicalType, Scalar } from "@/types/warehouse";
export function formatScalar(value: Scalar, kind?: LogicalType): string {
  if (value === null) return "Sin valor";
  if (value === "") return "(cadena vacía)";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return new Intl.NumberFormat("es-CO", { maximumSignificantDigits: 21 }).format(value);
  // Keep decimal precision instead of formatting through Number.
  if (kind && ["integer", "decimal", "float"].includes(kind) && /^-?\d+(\.\d+)?$/.test(value)) {
    const [integer, fraction] = value.split(".");
    return BigInt(integer).toLocaleString("es-CO") + (fraction === undefined ? "" : "," + fraction);
  }
  return value;
}
