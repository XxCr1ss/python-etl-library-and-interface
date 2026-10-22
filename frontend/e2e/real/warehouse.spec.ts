import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { requireRealTestDbConfig } from "../support/env";
import { dropTables, seedWarehouse } from "../support/sqlClient";
import { warehouseCatalog } from "../../src/services/warehouseValidators";

test("real warehouse aggregate, independent KPIs, detail and JSON report", async ({ page }) => {
  const prefix = "etl_e2e_" + randomUUID().replaceAll("-", "").slice(0, 12);
  const tables = seedWarehouse(prefix);
  try {
    const connection = requireRealTestDbConfig();
    await page.goto("/analytics");
    for (const [label, value] of [["Host", connection.host], ["Puerto", String(connection.port)], ["Base de datos", connection.database], ["Usuario", connection.user]]) await page.getByLabel(label, { exact: true }).fill(value);
    if (connection.password) await page.getByLabel("Contraseña", { exact: true }).fill(connection.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    const catalogResponse = page.waitForResponse(response => response.url().endsWith("/api/v1/warehouse/catalog"));
    await page.getByRole("button", { name: "Conectar y leer catálogo" }).click();
    const received = await catalogResponse;
    expect(received.status(), "Public catalog HTTP status").toBe(200);
    warehouseCatalog(await received.json());
    await page.getByLabel("Tabla base", { exact: true }).selectOption({ label: "public." + tables.fact });
    await page.getByRole("button", { name: "Agregar métrica" }).click();
    await page.getByLabel("Operación 1", { exact: true }).selectOption("SUM");
    await page.getByLabel("Columna de métrica 1", { exact: true }).selectOption("amount");
    await page.getByRole("button", { name: "Agregar relación FK" }).click();
    const relationship = page.getByLabel("Relación 1", { exact: true });
    const options = await relationship.locator("option").allTextContents();
    const chosen = options.find(label => label.includes("dim_id → id") && !label.includes("other_dim_id"));
    expect(chosen).toBeTruthy(); await relationship.selectOption({ label: chosen! });
    await page.getByRole("button", { name: "Agregar dimensión", exact: true }).click();
    const dimension = page.getByLabel("Dimensión 1", { exact: true });
    await dimension.selectOption({ label: `Relación 1 · ${tables.dimension}.category` });
    const metricOption = await page.getByLabel("Ordenar por", { exact: true }).locator("option").allTextContents();
    await page.getByLabel("Ordenar por", { exact: true }).selectOption({ label: metricOption.find(s => s.includes("SUM"))! });
    await page.getByLabel("Top N", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Consultar y graficar" }).click();
    await expect(page.getByRole("region", { name: "Métricas globales" })).toContainText("120,0000");
    await expect(page.getByRole("region", { name: "Tabla agregada", exact: true })).toContainText("90,0000");
    await page.getByRole("button", { name: "Ver detalle 1", exact: true }).click();
    await expect(page.getByRole("region", { name: "Registros de la bodega", exact: true })).toContainText("90,0000");
    const report = page.waitForEvent("download"); await page.getByRole("button", { name: "Descargar JSON" }).click();
    expect((await report).suggestedFilename()).toBe("reporte_bodega.json");
  } finally { dropTables([tables.fact, tables.dimension]); }
});
