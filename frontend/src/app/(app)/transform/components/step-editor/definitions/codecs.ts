import { json } from "@/services/responseValidators";
import type { JsonValue } from "@/types/etl";

export interface Codec<V> { format: (value: V) => string; parse: (raw: string) => V }
export function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export const text: Codec<string> = { format: value => value, parse: raw => raw };
export const nonempty: Codec<string> = { ...text, parse: raw => { ensure(raw.trim(), "Completa este campo."); return raw; } };
export const number: Codec<number> = { format: String, parse: raw => {
  ensure(raw.trim() && Number.isFinite(Number(raw)), "Ingresa un número finito."); return Number(raw);
} };
export const integer: Codec<number> = { ...number, parse: raw => { const value = number.parse(raw); ensure(Number.isInteger(value), "Ingresa un entero."); return value; } };
export const boolean: Codec<boolean> = { format: String, parse: raw => { ensure(raw === "true" || raw === "false", "Elige sí o no."); return raw === "true"; } };
export function optional<V>(codec: Codec<V>): Codec<V | undefined> {
  return { format: value => value === undefined ? "" : codec.format(value), parse: raw => raw === "" ? undefined : codec.parse(raw) };
}
export function nullable<V>(codec: Codec<V>): Codec<V | null> {
  return { format: value => value === null ? "null" : codec.format(value), parse: raw => raw === "null" ? null : codec.parse(raw) };
}
export const jsonValue: Codec<JsonValue> = { format: JSON.stringify, parse: raw => {
  const value: unknown = JSON.parse(raw); ensure(json(value), "Usa un valor JSON válido y finito."); return value;
} };
export const nonNullValue: Codec<Exclude<JsonValue, null>> = { ...jsonValue, parse: raw => {
  const value = jsonValue.parse(raw); ensure(value !== null, "Este valor no admite null."); return value;
} };
export const strings: Codec<string[]> = { format: JSON.stringify, parse: raw => {
  const value: unknown = JSON.parse(raw);
  ensure(Array.isArray(value) && value.every((v): v is string => typeof v === "string" && !!v.trim()), "Escribe una lista de nombres no vacíos.");
  ensure(new Set(value).size === value.length, "No repitas nombres."); return value;
} };
export const columns: Codec<string | string[]> = { format: JSON.stringify, parse: raw => {
  const value = jsonValue.parse(raw); if (typeof value === "string") return nonempty.parse(value); return strings.parse(raw);
} };
export const values: Codec<JsonValue[]> = { format: JSON.stringify, parse: raw => { const value = jsonValue.parse(raw); ensure(Array.isArray(value), "Usa una lista JSON, por ejemplo [0, false, \"001\"]."); return value; } };
export const stringMap: Codec<Record<string, string>> = { format: value => JSON.stringify(Object.entries(value)), parse: raw => {
  const value = jsonValue.parse(raw); ensure(Array.isArray(value), "Revisa las parejas de nombres.");
  const pairs = value.map(pair => { ensure(Array.isArray(pair) && pair.length === 2 && pair.every((v): v is string => typeof v === "string" && !!v.trim()), "Completa las dos columnas de cada pareja."); return pair; });
  ensure(new Set(pairs.map(p => p[0])).size === pairs.length, "No repitas la columna original.");
  return Object.fromEntries(pairs.map(pair => [pair[0], pair[1]]));
} };
export const dtype: Codec<string | Record<string, string>> = { format: JSON.stringify, parse: raw => {
  const value = jsonValue.parse(raw); if (typeof value === "string") return nonempty.parse(value);
  ensure(value && !Array.isArray(value) && typeof value === "object" && Object.keys(value).length && Object.entries(value).every(([key, v]) => !!key.trim() && typeof v === "string" && !!v.trim()), "Usa un tipo o un mapa no vacío de columna a tipo.");
  // Runtime-checked object values retain the exact dtype map supplied by the user.
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, nonempty.parse(String(item))]));
} };
export const lengths: Codec<number | number[]> = { format: JSON.stringify, parse: raw => {
  const value = jsonValue.parse(raw); const items = Array.isArray(value) ? value : [value];
  ensure(items.length && items.every((v): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0), "Usa enteros mayores o iguales a cero.");
  return Array.isArray(value) ? items : items[0];
} };
