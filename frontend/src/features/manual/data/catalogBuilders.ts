import type { JsonValue, StepType } from "@/types/etl";
import type { ExampleTable, ManualParameter, TransformationDoc, TransformationExample } from "../types";

/** Column-oriented examples keep column names and row values in one source. */
export function table(columns: Record<string, JsonValue[]>): ExampleTable {
  const names = Object.keys(columns);
  const length = columns[names[0]]?.length ?? 0;
  if (Object.values(columns).some(values => values.length !== length)) {
    throw new Error("Las columnas del ejemplo deben tener la misma cantidad de filas.");
  }
  return {
    columns: names,
    rows: Array.from({ length }, (_, index) => Object.fromEntries(names.map(name => [name, columns[name][index]]))),
  };
}

export function parameter<K extends string>(key: K, type: string, description: string, defaultLabel?: string): ManualParameter & { key: K } {
  return { key, type, description, required: defaultLabel === undefined, ...(defaultLabel === undefined ? {} : { defaultLabel }) };
}

export function example(params: TransformationExample["params"], before: ExampleTable, after: ExampleTable, secondary?: ExampleTable): TransformationExample {
  return { params, before, after, ...(secondary ? { secondary } : {}) };
}

export function transformation<K extends StepType>(type: K, content: Omit<TransformationDoc<K>, "type" | "instructions">) {
  return {
    type,
    ...content,
    instructions: [
      `En Transformación, elige Agregar Transformación → ${content.family} → ${content.name}.`,
      content.example.secondary
        ? "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce."
        : "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar.",
    ],
  } satisfies TransformationDoc<K>;
}
