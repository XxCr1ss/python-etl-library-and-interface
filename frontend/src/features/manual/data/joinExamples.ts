import type { TransformationExample } from "../types";

// Additional left-join cases verified with the backend dispatcher and synthetic CSV sources.
export const joinExamples: (TransformationExample & { title: string; explanation: string })[] = [
  {
    title: "Claves distintas y coincidencias repetidas",
    explanation: "Dos nombres que no son ambos compartidos representan clave izquierda y derecha. Dos coincidencias para id=2 generan dos filas. Las columnas nombre reciben sufijos _x y _y.",
    params: { on: ["id", "customer_id"] },
    before: { columns: ["id", "nombre"], rows: [{ id: 1, nombre: "A" }, { id: 2, nombre: "B" }] },
    secondary: { columns: ["customer_id", "nombre"], rows: [{ customer_id: 2, nombre: "B1" }, { customer_id: 2, nombre: "B2" }] },
    after: { columns: ["id", "nombre_x", "customer_id", "nombre_y"], rows: [{ id: 1, nombre_x: "A", customer_id: null, nombre_y: null }, { id: 2, nombre_x: "B", customer_id: 2, nombre_y: "B1" }, { id: 2, nombre_x: "B", customer_id: 2, nombre_y: "B2" }] },
  },
  {
    title: "Clave compuesta compartida",
    explanation: "id y region existen en ambas tablas: deben coincidir los dos campos. id=2 por sí solo no basta para la fila de la región S.",
    params: { on: ["id", "region"] },
    before: { columns: ["id", "region", "v"], rows: [{ id: 2, region: "N", v: 10 }, { id: 2, region: "S", v: 20 }] },
    secondary: { columns: ["id", "region", "b"], rows: [{ id: 2, region: "N", b: 200 }] },
    after: { columns: ["id", "region", "v", "b"], rows: [{ id: 2, region: "N", v: 10, b: 200 }, { id: 2, region: "S", v: 20, b: null }] },
  },
  {
    title: "Claves nulas que coinciden",
    explanation: "Con claves numéricas compatibles, el motor pandas puede emparejar claves nulas. No supongas el comportamiento de igualdad de NULL de una consulta SQL. Los tipos de las claves deben ser compatibles antes de cruzar.",
    params: { on: "id" },
    before: { columns: ["id", "a"], rows: [{ id: null, a: "Sin código" }, { id: 1, a: "Con código" }] },
    secondary: { columns: ["id", "b"], rows: [{ id: null, b: 200 }, { id: 2, b: 300 }] },
    after: { columns: ["id", "a", "b"], rows: [{ id: null, a: "Sin código", b: 200 }, { id: 1, a: "Con código", b: null }] },
  },
];
