import AxeBuilder from "@axe-core/playwright";
import { expect, SAMPLE_SALES_CSV_PATH, test, uploadContractResponse } from "./fixtures";

const columns = Array.from({ length: 50 }, (_, i) => `col_${i + 1}`);
const wide = {
  status: "success", total_rows: 10, columns,
  dtypes: Object.fromEntries(columns.map(c => [c, "int64"])),
  preview_data: Array.from({ length: 10 }, (_, r) => Object.fromEntries(columns.map((c, i) => [c, r * 100 + i]))),
};

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    test(`auditoría claro (sistema ${theme}) ${viewport.width}: semántica, contraste, tabla 10×50, modal, foco y movimiento`, async ({ page, mockApi }, testInfo) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
      await mockApi.onJson("POST", "/transform/preview", () => wide);
      await mockApi.onJson("POST", "/load/test-connection", () => ({ status: "success", message: "OK" }));
      await mockApi.onJson("POST", "/load/execute", () => ({ status: "success", message: "OK", table_name: "etl_e2e_audit", table_type: "dimension", total_rows: 10, preview_data: wide.preview_data.slice(0, 5) }));
      const audit = async (name: string) => {
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        await testInfo.attach(`${name}-axe`, { body: JSON.stringify({ violations: result.violations, incomplete: result.incomplete }, null, 2), contentType: "application/json" });
        expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      };
      for (const route of ["dashboard", "extract", "load", "settings"]) {
        await page.goto(`/${route}`);
        await expect(page.getByRole("main")).toBeVisible();
        await audit(route);
      }
      await page.goto("/extract");
      await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
      await page.getByRole("button", { name: "Procesar Archivo" }).click();
      await page.getByRole("button", { name: "Continuar a Transformación" }).click();
      await expect(page.getByText("10 filas de muestra de 10 transformadas · 50 columnas")).toBeVisible();
      await audit("transform");
      await testInfo.attach("transform-semantic", { body: await page.getByRole("main").ariaSnapshot(), contentType: "text/plain" });
      await page.evaluate(() => window.scrollTo(0, 0));
      await testInfo.attach("transform", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      if (process.env.ETL_E2E_VISUAL === "1") await expect(page).toHaveScreenshot(`transform-light-${viewport.width}.png`, { fullPage: true, maxDiffPixelRatio: 0.002 });
      const trigger = page.getByRole("button", { name: "Agregar Transformación" });
      await trigger.focus(); await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await audit("editor");
      // Walk both directions through more than one full cycle of controls.
      const count = await dialog.locator("button,input,select,textarea,a[href]").count();
      for (const key of ["Tab", "Shift+Tab"]) for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      const durations = await dialog.getByRole("button").first().evaluate(el => {
        const s = getComputedStyle(el); return [s.animationDuration, s.transitionDuration];
      });
      expect(durations.every(d => d.split(",").every(v => parseFloat(v) <= 0.00001))).toBe(true);
      await testInfo.attach("editor", { body: await page.screenshot(), contentType: "image/png" });
      if (process.env.ETL_E2E_VISUAL === "1") await expect(page).toHaveScreenshot(`editor-light-${viewport.width}.png`, { maxDiffPixelRatio: 0.002 });
      await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
      // 720×450 reproduces the CSS reflow area of a 1440×900 display at 200%.
      // This assertion does not certify every native browser zoom implementation.
      if (viewport.width === 1440) {
        await page.setViewportSize({ width: 720, height: 450 });
        await trigger.click();
        await dialog.getByRole("combobox", { name: "Columna Original" }).selectOption("col_1");
        await dialog.getByRole("textbox", { name: "Nuevo Nombre" }).fill("renombrada");
        await expect(dialog.getByRole("button", { name: "Aplicar Operación" })).toBeInViewport();
        await dialog.getByRole("button", { name: "Aplicar Operación" }).click();
        await expect(dialog).toHaveCount(0);
        await testInfo.attach("zoom-reflow", { body: await page.screenshot(), contentType: "image/png" });
        await page.setViewportSize(viewport);
      }
      await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
      await page.getByLabel("Host").fill("127.0.0.1");
      await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
      await page.getByLabel("Usuario").fill("audit_user");
      await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
      await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
      await expect(page.getByText("Conectado Correctamente")).toBeVisible();
      await page.getByLabel("Tabla destino").fill("etl_e2e_audit");
      await page.getByLabel("Modo de carga", { exact: true }).selectOption("replace");
      await audit("load-ready");
      const schema = page.getByRole("list", { name: "Columnas de origen" });
      await schema.focus();
      await page.keyboard.press("End");
      await expect.poll(() => schema.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
      const confirm = page.getByRole("dialog", { name: "Confirmar reemplazo de tabla" });
      await expect(confirm).toBeVisible();
      await audit("confirm-replace");
      await testInfo.attach("confirm-replace", { body: await page.screenshot(), contentType: "image/png" });
      await confirm.getByRole("button", { name: "Confirmar reemplazo" }).click();
      await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
      await audit("load-report");
    });
  }
}

test("rendimiento React: commits con 10×50 y editor sin preview adicional", async ({ page, mockApi }, testInfo) => {
  await page.addInitScript(() => {
    type Fiber = { actualDuration?: number; child?: Fiber; sibling?: Fiber };
    const win = window as typeof window & { __etlCommits?: number[]; __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown };
    win.__etlCommits = [];
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, inject: () => 1,
      onCommitFiberRoot: (_id: number, root: { current: Fiber }) => {
        win.__etlCommits!.push(root.current.actualDuration ?? 0);
      }, onCommitFiberUnmount: () => {},
    };
  });
  let previews = 0;
  await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
  await mockApi.onJson("POST", "/transform/preview", () => { previews++; return wide; });
  await page.goto("/extract");
  await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
  await page.getByRole("button", { name: "Procesar Archivo" }).click();
  await page.getByRole("button", { name: "Continuar a Transformación" }).click();
  await expect(page.getByText("10 filas de muestra de 10 transformadas · 50 columnas")).toBeVisible();
  const before = previews;
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Agregar Prefijo/ }).click();
    await page.keyboard.press("Escape");
  }
  expect(previews).toBe(before);
  const durations = await page.evaluate(() => (window as typeof window & { __etlCommits: number[] }).__etlCommits);
  expect(durations.some(n => n > 0)).toBe(true);
  await testInfo.attach("react-profile", { body: JSON.stringify({ fixture: "10x50", commitDurationsMs: durations, maxCommitMs: Math.max(...durations), extraPreviewRequests: previews - before }), contentType: "application/json" });
});
