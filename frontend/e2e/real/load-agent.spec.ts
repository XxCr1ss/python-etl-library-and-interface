import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";
import { expect, test } from "./fixtures";
import { REPO_ROOT, requireRealTestDbConfig, resolvePythonExecutable } from "../support/env";
import { dropTables, inspectTable } from "../support/sqlClient";

test("Carga por agente real, append y respuesta perdida sin reenvío automático", async ({ page, request }) => {
  const suffix = crypto.randomBytes(4).toString("hex");
  const table = `etl_e2e_${suffix}_local`;
  const agentId = `load-e2e-${suffix}`;
  const agent = spawn(resolvePythonExecutable(), ["etl_agent.py", "--allow-load", "--server-url", "http://127.0.0.1:8000", "--agent-id", agentId],
    { cwd: REPO_ROOT, stdio: "ignore", windowsHide: true });
  try {
    await expect.poll(async () => (await request.get(`http://127.0.0.1:8000/api/v1/extract/agent/status/${agentId}`)).json().then(v => v.connected)).toBe(true);
    await page.addInitScript(id => localStorage.setItem("etl_agent_id", id), agentId);
    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(path.join(REPO_ROOT, "frontend/src/tests/fixtures/sample_sales.csv"));
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await page.getByRole("link", { name: /Continuar a la Carga/ }).click();
    const cfg = requireRealTestDbConfig();
    await page.getByLabel("Host", { exact: true }).fill(cfg.host);
    await page.getByLabel("Puerto").fill(String(cfg.port));
    await page.getByLabel("Base de datos", { exact: true }).fill(cfg.database);
    await page.getByLabel("Usuario", { exact: true }).fill(cfg.user);
    if (cfg.password) await page.getByLabel("Contraseña", { exact: true }).fill(cfg.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("checkbox", { name: "Usar agente local híbrido" }).check();
    await expect(page.getByText("Agente conectado", { exact: true })).toBeVisible();
    const firstTest = page.waitForResponse(r => r.url().endsWith("/load/test-connection"));
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    expect((await firstTest).status()).toBe(200);
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();
    await page.getByLabel("Tabla destino").fill(table);
    await page.getByLabel("Tipo de tabla").selectOption("fact");
    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(inspectTable(table).count).toBe(12);
    await page.getByRole("button", { name: "Nueva carga" }).click();
    await expect(page.getByRole("button", { name: "Usar contraseña vacía explícitamente" })).toBeVisible();
    if (cfg.password) await page.getByLabel("Contraseña", { exact: true }).fill(cfg.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    const secondTest = page.waitForResponse(r => r.url().endsWith("/load/test-connection"));
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    const secondResult = await secondTest;
    expect(secondResult.status()).toBe(200);
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();
    await page.getByLabel("Tabla destino").fill(table);
    await page.getByLabel("Tipo de tabla").selectOption("fact");
    let attempts = 0;
    await page.route("**/api/v1/load/execute", async route => {
      attempts++;
      await route.fetch(); // The write finishes; the browser loses its response.
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await expect(page.getByRole("heading", { name: "Resultado desconocido" })).toBeVisible();
    expect(inspectTable(table).count).toBe(24);
    expect(attempts).toBe(1);
    await expect(page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeDisabled();
  } finally {
    agent.kill();
    dropTables([table]);
  }
});
