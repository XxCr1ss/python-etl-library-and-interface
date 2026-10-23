import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { test, expect } from "./fixtures";
import { REPO_ROOT, requireRealTestDbConfig, resolvePythonExecutable } from "../support/env";
import { dropTables, seedDiagram } from "../support/sqlClient";

for (const useAgent of [false, true]) test(`real PostgreSQL diagram preserves state, reconnects and selects a source (${useAgent ? "CLI agent" : "direct"})`, async ({ page, context, request }) => {
  const prefix = "etl_e2e_" + randomUUID().replaceAll("-", "").slice(0, 12);
  const names = seedDiagram(prefix);
  const agentId = prefix + "_agent";
  const agent = useAgent ? spawn(resolvePythonExecutable(), ["etl_agent.py", "--server-url", "http://127.0.0.1:8000", "--agent-id", agentId],
    { cwd: REPO_ROOT, stdio: "ignore", windowsHide: true }) : null;
  try {
    const connection = requireRealTestDbConfig();
    if (useAgent) {
      await expect.poll(async () => (await request.get(`http://127.0.0.1:8000/api/v1/extract/agent/status/${agentId}`)).json().then(value => value.connected)).toBe(true);
      await page.addInitScript(id => localStorage.setItem("etl_agent_id", id), agentId);
    }
    await page.goto("/extract");
    await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
    await page.getByLabel("Host", { exact: true }).fill(connection.host);
    await page.getByLabel("Puerto", { exact: true }).fill(String(connection.port));
    await page.getByLabel("Base de datos", { exact: true }).fill(connection.database);
    await page.getByLabel("Usuario", { exact: true }).fill(connection.user);
    if (connection.password) await page.getByLabel("Contraseña", { exact: true }).fill(connection.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    if (useAgent) {
      await page.getByRole("checkbox", { name: "Usar agente local híbrido" }).check();
      await expect(page.getByText("Agente conectado", { exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    await page.getByLabel("Tabla de origen", { exact: true }).selectOption(names.parent);
    await expect(page.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
    const opening = context.waitForEvent("page");
    await page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" }).click();
    const diagram = await opening;
    const search = diagram.getByLabel("Buscar tabla", { exact: true });
    await search.selectOption({ label: names.child });
    await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("sample");
    await expect(diagram.getByRole("button", { name: "Usar como origen en Transformación" })).toBeDisabled();
    for (let i = 0; i < 5; i++) {
      await diagram.bringToFront(); await page.bringToFront();
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await expect(page.getByLabel("Tabla de origen", { exact: true })).toHaveValue(names.parent);
      await expect(page.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
    }
    // The graph contains one composite FK (two segments), one unique FK and one self FK.
    await expect(diagram.getByLabel(new RegExp("^" + names.child + "_"))).toHaveCount(4);
    const refreshed = page.waitForRequest(request => request.url().endsWith("/extract/database/schema-graph"));
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    await refreshed;
    await expect(diagram.getByRole("button", { name: "Actualizar esquema" })).toBeEnabled();
    await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("sample");
    await page.getByLabel("Tabla de origen", { exact: true }).selectOption(names.parent);
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await diagram.bringToFront();
    await diagram.getByRole("button", { name: "Usar como origen en Transformación" }).click();
    await page.getByRole("button", { name: "Confirmar tabla" }).click();
    await expect(page.getByRole("heading", { name: connection.database + "." + names.child, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tabla de muestra transformada" })).toContainText("sample");
    await diagram.close();
    const reopening = context.waitForEvent("page");
    await page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" }).click();
    const fromTransform = await reopening;
    await expect(fromTransform.getByLabel("Buscar tabla", { exact: true })).toBeVisible();
    await fromTransform.close();
  } finally { agent?.kill(); dropTables([names.child, names.parent]); }
});
