import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { warehouseCatalogFixture, warehouseDetailResult, warehouseResult } from "../../src/tests/fixtures/warehouse";

test("independent analytics, global KPIs, drill-down, export and responsive keyboard access", async ({ page }, testInfo) => {
  let queries = 0;
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
    let data: unknown;
    if (path.endsWith("/warehouse/catalog")) data = warehouseCatalogFixture;
    else if (path.endsWith("/warehouse/query")) { queries++; data = warehouseResult(body.query); }
    else if (path.endsWith("/warehouse/detail")) data = warehouseDetailResult(body);
    else if (path.endsWith("/warehouse/export")) { await route.fulfill({ body: "category,total\r\nB,90.0000\r\n", headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reporte_bodega.csv"' } }); return; }
    else if (path.endsWith("/health")) data = { status: "ok", message: "OK" };
    else throw new Error("Unexpected warehouse test endpoint");
    await route.fulfill({ json: data });
  });
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Bodega de datos", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Etapas del pipeline" })).toHaveCount(0);
  await page.getByLabel("Base de datos", { exact: true }).fill("synthetic");
  await page.getByLabel("Usuario", { exact: true }).fill("reader");
  await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
  await page.getByRole("button", { name: "Conectar y leer catálogo" }).click();
  await page.getByRole("button", { name: "Agregar métrica" }).click();
  await page.getByLabel("Operación 1", { exact: true }).selectOption("SUM");
  await page.getByLabel("Columna de métrica 1", { exact: true }).selectOption("amount");
  await page.getByRole("button", { name: "Agregar dimensión", exact: true }).click();
  await page.getByRole("button", { name: "Consultar y graficar" }).click();
  await expect(page.getByRole("region", { name: "Métricas globales" })).toContainText("120,0000");
  await expect(page.getByRole("region", { name: "Tabla agregada", exact: true })).toContainText("90,0000");
  await page.getByRole("button", { name: "Dona", exact: true }).click();
  await page.getByRole("button", { name: "Barras", exact: true }).click();
  expect(queries).toBe(1);
  await page.getByRole("button", { name: "Ver detalle 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Registros de la bodega", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  expect((await download).suggestedFilename()).toBe("reporte_bodega.csv");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), theme === "dark");
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).include("#main-content").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(audit.violations).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await testInfo.attach(`warehouse-${theme}-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    }
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Desconectar bodega" }).click();
  await expect(page.getByRole("heading", { name: "Conecta tu bodega para comenzar" })).toBeVisible();
});
