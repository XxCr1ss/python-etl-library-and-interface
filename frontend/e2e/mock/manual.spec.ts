import AxeBuilder from "@axe-core/playwright";
import { test, expect, buildTransformPreviewResponse, SAMPLE_SALES_CSV_PATH, salesRows, uploadContractResponse, type MockStep } from "./fixtures";

test("enlaces profundos, búsqueda y navegación Atrás/Adelante sin ejecutar ETL", async ({ page, mockApi }) => {
  await page.goto("/manual#left_join");
  await expect(page.getByRole("heading", { name: "Unión Horizontal · Left", exact: true })).toBeFocused();
  const index = page.getByRole("navigation", { name: "Contenido del manual" });
  const search = page.getByRole("textbox", { name: "Buscar en el manual" });
  await search.fill("group_by");
  await expect(index.getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Unión Horizontal · Left", exact: true })).toBeAttached();
  await search.fill("AGREGACION");
  await expect(index.getByRole("link", { name: "Agrupar por Suma", exact: true })).toBeVisible();
  await search.fill("noexistezz");
  await expect(index.getByText("Sin resultados")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await index.getByRole("link", { name: "Unión Horizontal · Inner", exact: true }).click();
  await expect(page).toHaveURL(/#inner_join$/);
  await expect(page.locator("#inner_join")).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/#left_join$/);
  await expect(page.locator("#left_join")).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(/#inner_join$/);
  const titlesVisible = await page.locator("#inner_join").evaluate(element => element.getBoundingClientRect().top >= document.querySelector("[data-app-header]")!.getBoundingClientRect().bottom);
  expect(titlesVisible).toBe(true);
  expect(mockApi.unhandledRequests).toEqual([]);
});

test("conserva origen, receta, destino y credenciales al consultar ayuda y regresar", async ({ page, mockApi }) => {
  await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
  await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
    const body = json() as { steps: MockStep[]; limit: number };
    return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
  });
  await mockApi.onJson("POST", "/load/test-connection", () => ({ status: "success", message: "Conexión sintética verificada" }));
  await page.goto("/extract");
  await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
  await page.getByRole("button", { name: "Procesar Archivo", exact: true }).click();
  await page.getByRole("button", { name: "Continuar a Transformación", exact: true }).click();
  await page.getByRole("button", { name: "Agregar Transformación", exact: true }).click();
  await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
  await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
  await page.getByRole("button", { name: "Aplicar Operación" }).click();
  await expect(page.getByRole("columnheader", { name: /ingreso_total/ })).toBeVisible();
  await page.getByRole("link", { name: "Continuar a la Carga" }).click();
  await page.getByLabel("Host", { exact: true }).fill("127.0.0.1");
  await page.getByLabel("Base de datos", { exact: true }).fill("manual_test");
  await page.getByLabel("Usuario", { exact: true }).fill("test_user");
  await page.getByLabel("Contraseña", { exact: true }).fill("synthetic-in-memory");
  await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
  await expect(page.getByText("Conectado Correctamente")).toBeVisible();
  await page.getByLabel("Tabla destino", { exact: true }).fill("dim_manual");
  const snapshot = await page.evaluate(() => sessionStorage.getItem("etl_pipeline_session_v1"));
  await page.getByRole("link", { name: "Ayuda de esta sección" }).click();
  await expect(page).toHaveURL(/\/manual#carga$/);
  await expect(page.locator("#carga")).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("etl_pipeline_session_v1"))).toBe(snapshot);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Carga", exact: true }).click();
  await expect(page.getByLabel("Tabla destino", { exact: true })).toHaveValue("dim_manual");
  await expect(page.getByText("Conectado Correctamente")).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeEnabled();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Transformación", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Receta · 1 pasos" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /ingreso_total/ })).toBeVisible();
});

for (const theme of ["light", "dark"]) for (const width of [375, 768, 1024, 1440]) {
  test(`manual claro con preferencia heredada ${theme}: accesible y adaptable a ${width}px`, async ({ page, mockApi }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(value => localStorage.setItem("etl_theme_preference", value), theme);
    await page.goto("/manual");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    await expect(page.getByRole("heading", { level: 1, name: "Manual de usuario" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width < 1280) {
      const trigger = page.getByRole("button", { name: "Contenido del manual", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Contenido del manual" });
      await expect(dialog.getByRole("textbox", { name: "Buscar en el manual" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await dialog.getByRole("textbox", { name: "Buscar en el manual" }).fill("left_join");
      await dialog.getByRole("link", { name: "Unión Horizontal · Left", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.locator("#left_join")).toBeFocused();
      expect(await page.locator("#left_join").evaluate(element => element.getBoundingClientRect().top >= document.querySelector("[data-app-header]")!.getBoundingClientRect().bottom)).toBe(true);
      // Return to the start for a consistent visual record.
      await page.goto("/manual");
    }
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`manual-${theme}-${width}.png`) });
    if (width === 1440) {
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    expect(mockApi.unhandledRequests).toEqual([]);
  });
}
