import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { warehouseCatalogFixture, warehouseMeta } from "../../src/tests/fixtures/warehouse";
import type { AnalysisSpec } from "../../src/types/analysis";

test("configure calculated indicators, compare series and persist a reusable report", async ({ page }, testInfo) => {
  let analyzed = 0;
  const catalog = structuredClone(warehouseCatalogFixture);
  catalog.capabilities.supported_operations.push("warehouse_analyze", "warehouse_report");
  const result = (spec: AnalysisSpec) => {
    const columns = [...spec.dimensions.map(d => ({ id: d.id, label: d.label || d.field.column, logical_type: "string", encoding: "native", role: "dimension" })),
      ...spec.measures.map(m => ({ id: m.id, label: m.label || m.id, logical_type: "integer", encoding: "native", role: "metric" })),
      ...spec.formulas.map(f => ({ id: f.id, label: f.label, logical_type: "decimal", encoding: "decimal_string", role: "metric" }))];
    return { status: "success", columns, data: [Object.fromEntries([...spec.dimensions.map(d => [d.id, "A"]), ...spec.measures.map((m, i) => [m.id, i ? 20 : 100]), ...spec.formulas.map(f => [f.id, "5"])])],
      summary_kpis: columns.filter(c => c.role === "metric").map((c, i) => ({ metric_id: c.id, aggregation: spec.measures[i]?.aggregation || "FORMULA", value: i === 0 ? 100 : i === 1 ? 20 : "5", logical_type: c.logical_type, encoding: c.encoding })),
      filtered_rows: { value: 100, logical_type: "integer", encoding: "native" }, units: Object.fromEntries([...spec.measures.map(m => [m.id, m.unit || "count"]), ...spec.formulas.map(f => [f.id, "ratio"])]),
      definition: spec, execution_id: "synthetic-result", warnings: [], meta: { ...warehouseMeta, applied_limit: spec.limit, truncated: false } };
  };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname, body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path.endsWith("/warehouse/catalog")) return route.fulfill({ json: catalog });
    if (path.endsWith("/warehouse/analyze")) { analyzed++; return route.fulfill({ json: result(body.analysis) }); }
    if (path.endsWith("/warehouse/definition")) return route.fulfill({ json: body });
    if (path.endsWith("/warehouse/report")) return route.fulfill({ json: { status: "success", version: 1, execution_id: "report", results: body.analyses.map(result) } });
    if (path.endsWith("/health")) return route.fulfill({ json: { status: "success" } });
    throw new Error("Unexpected general analytics endpoint");
  });
  await page.goto("/analytics");
  await page.getByLabel("Base de datos", { exact: true }).fill("synthetic");
  await page.getByLabel("Usuario", { exact: true }).fill("reader");
  await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
  await page.getByRole("button", { name: "Conectar y leer catálogo" }).click();
  await page.getByRole("button", { name: "Nuevo análisis avanzado" }).click();
  await page.getByLabel("Qué representa una fila").fill("Una fila por evento");
  await page.getByRole("button", { name: "Agregar componente" }).click();
  await page.getByLabel("ID de medida 2").fill("people");
  await page.getByLabel("Agregación de medida 2").selectOption("COUNT_DISTINCT");
  await page.getByLabel("Valor de medida 2", { exact: true }).selectOption({ label: "Base · sales.id" });
  await page.getByRole("button", { name: "Agregar indicador calculado" }).click();
  await page.getByLabel("ID de indicador 1").fill("usage");
  await page.getByLabel("Nombre de indicador 1").fill("Utilización media");
  await page.getByLabel("Fórmula 1").fill("events / people");
  await page.getByRole("button", { name: "Agregar agrupación", exact: true }).click();
  await page.getByLabel("Campo de agrupación 1").selectOption({ label: "Base · sales.category" });
  await page.getByRole("button", { name: "Calcular análisis" }).click();
  await expect(page.getByRole("region", { name: "Resultado avanzado 1" })).toContainText("Utilización media");
  await expect(page.getByText("Resultado de una definición anterior")).toHaveCount(0);
  await page.getByLabel("Representación del análisis").selectOption("stack");
  await page.getByLabel("Medida y unidad del gráfico").selectOption("usage");
  expect(analyzed).toBe(1);
  await page.getByRole("button", { name: "Agregar esta definición al reporte" }).click();
  await page.getByRole("button", { name: "Guardar definición del reporte" }).click();
  await expect(page.getByText(/Definición guardada en este navegador/)).toBeVisible();
  await page.getByRole("button", { name: "Ejecutar todos los paneles" }).click();
  await expect(page.getByRole("button", { name: "Ejecutar todos los paneles" })).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar esta tabla CSV" }).click();
  expect((await download).suggestedFilename()).toBe("resultado_analitico.csv");
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).include("#main-content").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(audit.violations).toEqual([]);
  }
  await page.getByRole("heading", { name: "Nuevo análisis", exact: true }).scrollIntoViewIfNeeded();
  await testInfo.attach("advanced-analytics-synthetic", { body: await page.screenshot(), contentType: "image/png" });
});
