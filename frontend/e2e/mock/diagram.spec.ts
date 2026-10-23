import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { graphFixture, sampleFixture } from "../../src/tests/fixtures/diagram";
import type { SchemaGraph } from "../../src/types/diagram";
import operations from "../../src/tests/fixtures/operations-catalog.json";

async function mock(context: BrowserContext, graph = graphFixture, agentConnected = false) {
  const previews: { table_name: string; limit?: number }[] = [];
  await context.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace("/api/v1", "");
    const body = request.method() === "POST" ? request.postDataJSON() : {};
    let data: unknown;
    if (path === "/health") data = { status: "ok", message: "OK" };
    else if (path.startsWith("/extract/agent/status/")) data = { agent_id: path.split("/").at(-1), connected: agentConnected, connection_id: agentConnected ? "same-agent" : null };
    else if (path === "/extract/database") data = { status: "success", message: "OK", tables: graph.nodes.filter(n => n.selectable).map(n => n.table_name), schema_preview: Object.fromEntries(graph.nodes.map(n => [n.table_name, n.columns.map(c => c.name)])) };
    else if (path === "/extract/database/schema-graph") data = graph;
    else if (path === "/extract/database/preview") {
      previews.push(body);
      const node = graph.nodes.find(n => n.table_name === body.table_name)!;
      data = { ...sampleFixture, table_name: node.table_name, columns: node.columns.map(c => c.name), dtypes: Object.fromEntries(node.columns.map(c => [c.name, c.data_type || "unknown"])), preview_data: [Object.fromEntries(node.columns.map((c, i) => [c.name, i]))] };
    } else if (path === "/transform/preview") {
      const node = graph.nodes.find(n => n.table_name === body.source.table_name)!;
      data = { status: "success", columns: node.columns.map(c => c.name), dtypes: Object.fromEntries(node.columns.map(c => [c.name, c.data_type || "unknown"])), preview_data: [{ id: 1 }], total_rows: 12 };
    } else if (path === "/transform/operations") data = operations;
    else throw new Error("Unexpected diagram API request: " + path);
    await route.fulfill({ json: data });
  });
  return previews;
}
async function connect(page: Page, agent = false) {
  await page.goto("/extract");
  await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
  await page.getByLabel("Base de datos", { exact: true }).fill("synthetic");
  await page.getByLabel("Usuario", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
  if (agent) { await page.getByLabel("Usar agente local híbrido").check(); await expect(page.getByText("Agente conectado", { exact: true })).toBeVisible(); }
  await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
  await expect(page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" })).toBeVisible();
}

for (const agent of [false, true]) test(`preserves extraction and an open diagram across focus, reconnect and transformation (${agent ? "agent" : "direct"})`, async ({ page, context }) => {
  const previews = await mock(context, graphFixture, agent);
  await connect(page, agent);
  await page.getByLabel("Tabla de origen", { exact: true }).selectOption("customers");
  await expect(page.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
  const diagram = await openDiagram(page, context);
  await diagram.getByLabel("Buscar tabla", { exact: true }).selectOption("child");
  await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("customer_id");
  for (let i = 0; i < 5; i++) {
    await diagram.bringToFront(); await page.bringToFront();
    // Also dispatch in headless Chromium, which can keep both pages visible.
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByLabel("Tabla de origen", { exact: true })).toHaveValue("customers");
    await expect(page.getByRole("region", { name: "Muestra del origen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
  }
  const before = previews.filter(p => p.table_name === "orders").length;
  await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
  await expect(page.getByLabel("Tabla de origen", { exact: true })).toBeEnabled();
  await expect.poll(() => previews.filter(p => p.table_name === "orders").length).toBeGreaterThan(before);
  await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("customer_id");
  await expect(diagram.getByText("La tabla no contiene filas de muestra.")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar a Transformación" }).click();
  await expect(page).toHaveURL(/\/transform$/);
  await expect(page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" })).toHaveAttribute("aria-disabled", "false");
  await diagram.getByRole("button", { name: "Usar como origen en Transformación" }).click();
  await page.getByRole("button", { name: "Confirmar tabla" }).click();
  await expect(page.getByRole("heading", { name: "synthetic.orders", exact: true })).toBeVisible();
  const another = await openDiagram(page, context);
  await expect(another.getByLabel("Buscar tabla", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Extracción", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Base de Datos Relacional" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Tabla de origen", { exact: true })).toHaveValue("customers");
});

test("transformation aligns with the pipeline and grows when desktop navigation is hidden", async ({ page, context }, testInfo) => {
  await mock(context); await connect(page);
  await page.getByLabel("Tabla de origen", { exact: true }).selectOption("customers");
  await page.getByRole("button", { name: "Continuar a Transformación" }).click();
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    const stages = page.getByRole("navigation", { name: "Etapas del pipeline" });
    const title = page.getByText("Paso 2 · Transformación", { exact: true });
    const next = page.getByRole("link", { name: "Continuar a la Carga" });
    const verify = async () => {
      const box = (await stages.boundingBox())!, left = (await title.boundingBox())!, right = (await next.boundingBox())!;
      expect(Math.abs(box.x - left.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(box.x + box.width - right.x - right.width)).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      return box.width;
    };
    const before = await verify();
    await page.screenshot({ path: testInfo.outputPath(`transform-expanded-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Ocultar navegación" }).click();
    expect(await verify() - before).toBe(256);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "synthetic.customers", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`transform-collapsed-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Mostrar navegación" }).focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    expect(await verify()).toBe(before);
  }
});
async function openDiagram(page: Page, context: BrowserContext) {
  const next = context.waitForEvent("page");
  await page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" }).click();
  const diagram = await next;
  await expect(diagram.getByRole("heading", { name: "Diagrama entidad-relación" })).toBeVisible();
  await expect(diagram.getByLabel("Buscar tabla", { exact: true })).toBeVisible();
  return diagram;
}
test("two tabs inspect data and select a source only in transformation, with cancellation and reconnect states", async ({ page, context }) => {
  const previews = await mock(context); await connect(page);
  const diagram = await openDiagram(page, context);
  await expect(page).toHaveURL(/\/extract$/);
  await expect(diagram.locator(".react-flow__edge")).toHaveCount(1);
  await diagram.getByLabel("Buscar tabla", { exact: true }).selectOption("child");
  await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("customer_id");
  await expect(diagram.getByRole("button", { name: "Usar como origen en Transformación" })).toBeDisabled();
  expect(previews).toEqual([expect.objectContaining({ table_name: "orders", limit: 10 })]);
  await diagram.getByRole("button", { name: "Ocultar datos" }).click(); await diagram.getByRole("button", { name: "Mostrar datos" }).click();
  expect(previews).toHaveLength(1);
  // Confirm an initial source through the existing extraction flow.
  await page.getByLabel("Tabla de origen", { exact: true }).selectOption("customers");
  await page.getByRole("button", { name: "Continuar a Transformación" }).click();
  await expect(page).toHaveURL(/\/transform$/);
  await diagram.bringToFront();
  await expect(diagram.getByRole("button", { name: "Usar como origen en Transformación" })).toBeEnabled();
  await diagram.getByRole("button", { name: "Usar como origen en Transformación" }).click();
  await expect(page.getByRole("dialog", { name: "Usar tabla en Transformación" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar selección" }).click();
  await expect(diagram.getByText("Selección cancelada.", { exact: true })).toBeVisible();
  await diagram.getByRole("button", { name: "Usar como origen en Transformación" }).click();
  await page.getByRole("button", { name: "Confirmar tabla" }).click();
  await expect(page.getByRole("heading", { name: "synthetic.orders", exact: true })).toBeVisible();
  await expect(diagram.getByText(/Tabla seleccionada\./)).toBeVisible();
  await diagram.reload();
  await expect(diagram.getByLabel("Buscar tabla", { exact: true })).toBeVisible();
  await page.reload();
  await expect(diagram.getByText(/La conexión cambió/).first()).toBeVisible();
});

test("panel supports pointer and keyboard resize, bounded scroll and viewport reflow", async ({ page, context }) => {
  await mock(context); await connect(page); const diagram = await openDiagram(page, context);
  await diagram.getByLabel("Buscar tabla", { exact: true }).selectOption("child");
  const splitter = diagram.getByRole("separator", { name: "Altura del panel de datos" });
  const before = Number(await splitter.getAttribute("aria-valuenow"));
  const box = (await splitter.boundingBox())!;
  await diagram.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await diagram.mouse.down(); await diagram.mouse.move(box.x + box.width / 2, box.y - 60); await diagram.mouse.up();
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
  await splitter.focus(); await splitter.press("Home");
  expect(await splitter.getAttribute("aria-valuenow")).toBe(await splitter.getAttribute("aria-valuemin"));
  await splitter.press("End"); expect(await splitter.getAttribute("aria-valuenow")).toBe(await splitter.getAttribute("aria-valuemax"));
  for (const size of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 720, height: 450 }]) {
    await diagram.setViewportSize(size);
    await expect(diagram.getByRole("button", { name: "Ocultar datos" })).toBeVisible();
    expect(await diagram.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

function mediumGraph(): SchemaGraph {
  const graph = structuredClone(graphFixture);
  for (let i = 2; i < 20; i++) graph.nodes.push({ ...graph.nodes[0], id: "table" + i, table_name: "table_" + i,
    columns: Array.from({ length: i === 19 ? 50 : 4 }, (_, c) => ({ ...graph.nodes[0].columns[0], name: c === 0 ? "id" : "column_" + c, is_pk: c === 0, is_fk: c > 0 })) });
  for (let i = 1; graph.edges.length < 30; i++) {
    const source = graph.nodes[i % graph.nodes.length], target = graph.nodes[(i + 1) % graph.nodes.length];
    graph.edges.push({ ...graph.edges[0], id: "fk_" + i, source_table_id: source.id, target_table_id: target.id, target_table: target.table_name,
      column_pairs: [{ source_column: source.columns[0].name, target_column: target.columns[0].name }] });
  }
  return graph;
}
test("medium graph stays light and accessible with either system theme", async ({ page, context }, testInfo) => {
  await context.addInitScript(() => localStorage.setItem("etl_theme_preference", "dark"));
  await mock(context, mediumGraph()); await connect(page); const diagram = await openDiagram(page, context);
  await expect(diagram.locator(".react-flow__node-table")).toHaveCount(20);
  await expect(diagram.locator(".react-flow__edge")).toHaveCount(30);
  for (const dark of [false, true]) {
    await diagram.emulateMedia({ colorScheme: dark ? "dark" : "light" });
    await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
    await expect(diagram.getByLabel("Tema", { exact: true })).toHaveCount(0);
    await expect(diagram.locator("html")).not.toHaveClass(/dark/);
    await expect(diagram.locator(".react-flow")).toHaveClass(/light/);
    expect(await diagram.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    const violations = (await new AxeBuilder({ page: diagram }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    expect(violations).toEqual([]);
    await diagram.screenshot({ path: testInfo.outputPath("diagram-system-" + (dark ? "dark" : "light") + ".png") });
    if (process.env.ETL_E2E_VISUAL === "1") await expect(diagram).toHaveScreenshot("diagram-light-1440.png", { maxDiffPixelRatio: 0.002 });
  }
  await diagram.getByLabel("Buscar tabla", { exact: true }).selectOption("table19");
  await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toBeVisible();
  expect(await diagram.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
