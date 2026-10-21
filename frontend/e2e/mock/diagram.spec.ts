import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { graphFixture, sampleFixture } from "../../src/tests/fixtures/diagram";
import type { SchemaGraph } from "../../src/types/diagram";
import operations from "../../src/tests/fixtures/operations-catalog.json";

async function mock(context: BrowserContext, graph = graphFixture) {
  const previews: { table_name: string; limit?: number }[] = [];
  await context.route("**/api/v1/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace("/api/v1", "");
    const body = request.method() === "POST" ? request.postDataJSON() : {};
    let data: unknown;
    if (path === "/health") data = { status: "ok", message: "OK" };
    else if (path.startsWith("/extract/agent/status/")) data = { agent_id: path.split("/").at(-1), connected: false };
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
async function connect(page: Page) {
  await page.goto("/extract");
  await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
  await page.getByLabel("Base de datos", { exact: true }).fill("synthetic");
  await page.getByLabel("Usuario", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
  await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
  await expect(page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" })).toBeVisible();
}
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
test("medium graph remains readable and accessible in both themes", async ({ page, context }, testInfo) => {
  await mock(context, mediumGraph()); await connect(page); const diagram = await openDiagram(page, context);
  await expect(diagram.locator(".react-flow__node-table")).toHaveCount(20);
  await expect(diagram.locator(".react-flow__edge")).toHaveCount(30);
  for (const dark of [false, true]) {
    await diagram.getByLabel("Tema", { exact: true }).selectOption(dark ? "dark" : "light");
    await expect(diagram.locator("html")).toHaveClass(dark ? /dark/ : /^(?!.*dark)/);
    const violations = (await new AxeBuilder({ page: diagram }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    expect(violations).toEqual([]);
    await diagram.screenshot({ path: testInfo.outputPath("diagram-" + (dark ? "dark" : "light") + ".png") });
    if (process.env.ETL_E2E_VISUAL === "1") await expect(diagram).toHaveScreenshot("diagram-" + (dark ? "dark" : "light") + "-1440.png", { maxDiffPixelRatio: 0.002 });
  }
  await diagram.getByLabel("Buscar tabla", { exact: true }).selectOption("table19");
  await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toBeVisible();
  expect(await diagram.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
