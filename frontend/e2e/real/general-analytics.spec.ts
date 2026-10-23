import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { requireRealTestDbConfig } from "../support/env";
import { dropTables, seedWarehouse } from "../support/sqlClient";

test("real configurable calculated report from PostgreSQL to the browser", async ({ page }) => {
  const tables = seedWarehouse("etl_e2e_" + randomUUID().replaceAll("-", "").slice(0, 12));
  try {
    const connection = requireRealTestDbConfig();
    await page.goto("/analytics");
    for (const [label, value] of [["Host", connection.host], ["Puerto", String(connection.port)], ["Base de datos", connection.database], ["Usuario", connection.user]]) await page.getByLabel(label, { exact: true }).fill(value);
    if (connection.password) await page.getByLabel("Contraseña", { exact: true }).fill(connection.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Conectar y leer catálogo" }).click();
    await page.getByLabel("Tabla base", { exact: true }).selectOption({ label: "public." + tables.fact });
    await page.getByRole("button", { name: "Nuevo análisis avanzado" }).click();
    await page.getByLabel("Qué representa una fila").fill("Una transacción de prueba");
    await page.getByLabel("ID de medida 1").fill("amount");
    await page.getByLabel("Agregación de medida 1").selectOption("SUM");
    await page.getByLabel("Valor de medida 1", { exact: true }).selectOption({ label: `Base · ${tables.fact}.amount` });
    await page.getByLabel("Unidad de medida 1").fill("money");
    await page.getByRole("button", { name: "Agregar componente" }).click();
    await page.getByLabel("ID de medida 2").fill("transactions");
    await page.getByLabel("Agregación de medida 2").selectOption("COUNT_DISTINCT");
    await page.getByLabel("Valor de medida 2", { exact: true }).selectOption({ label: `Base · ${tables.fact}.id` });
    await page.getByRole("button", { name: "Agregar indicador calculado" }).click();
    await page.getByLabel("ID de indicador 1").fill("average");
    await page.getByLabel("Nombre de indicador 1").fill("Importe medio");
    await page.getByLabel("Fórmula 1").fill("amount / transactions");
    await page.getByRole("button", { name: "Calcular análisis" }).click();
    const result = page.getByRole("region", { name: "Resultado avanzado 1" });
    await expect(result).toContainText("Importe medio");
    await expect(result.getByRole("region", { name: "Métricas globales" })).toContainText(/40,0+/);
    await expect(page.getByText("Resultado de una definición anterior")).toHaveCount(0);
    await page.getByRole("button", { name: "Agregar esta definición al reporte" }).click();
    await page.getByRole("button", { name: "Guardar definición del reporte" }).click();
    await expect(page.getByText(/Definición guardada en este navegador/)).toBeVisible();
    await page.getByRole("button", { name: "Ejecutar todos los paneles" }).click();
    await expect(page.getByRole("button", { name: "Ejecutar todos los paneles" })).toBeEnabled();
    const file = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar este resultado JSON" }).click();
    expect((await file).suggestedFilename()).toBe("resultado_analitico.json");
  } finally { dropTables([tables.fact, tables.dimension]); }
});
