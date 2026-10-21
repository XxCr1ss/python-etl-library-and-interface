import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { requireRealTestDbConfig } from "../support/env";
import { dropTables, seedDiagram } from "../support/sqlClient";

test("real PostgreSQL diagram reflects SQL FK constraints and selects the transformation source across tabs", async ({ page, context }) => {
  const prefix = "etl_e2e_" + randomUUID().replaceAll("-", "").slice(0, 12);
  const names = seedDiagram(prefix);
  try {
    const connection = requireRealTestDbConfig();
    await page.goto("/extract");
    await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
    await page.getByLabel("Host", { exact: true }).fill(connection.host);
    await page.getByLabel("Puerto", { exact: true }).fill(String(connection.port));
    await page.getByLabel("Base de datos", { exact: true }).fill(connection.database);
    await page.getByLabel("Usuario", { exact: true }).fill(connection.user);
    if (connection.password) await page.getByLabel("Contraseña", { exact: true }).fill(connection.password);
    else await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    const opening = context.waitForEvent("page");
    await page.getByRole("link", { name: "Abrir diagrama E-R en otra pestaña" }).click();
    const diagram = await opening;
    const search = diagram.getByLabel("Buscar tabla", { exact: true });
    await search.selectOption({ label: names.child });
    await expect(diagram.getByRole("region", { name: "Muestra de datos", exact: true })).toContainText("sample");
    await expect(diagram.getByRole("button", { name: "Usar como origen en Transformación" })).toBeDisabled();
    // The graph contains one composite FK (two segments), one unique FK and one self FK.
    await expect(diagram.getByLabel(new RegExp("^" + names.child + "_"))).toHaveCount(4);
    await page.getByLabel("Tabla de origen", { exact: true }).selectOption(names.parent);
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await diagram.bringToFront();
    await diagram.getByRole("button", { name: "Usar como origen en Transformación" }).click();
    await page.getByRole("button", { name: "Confirmar tabla" }).click();
    await expect(page.getByRole("heading", { name: connection.database + "." + names.child, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tabla de muestra transformada" })).toContainText("sample");
    await diagram.close();
  } finally { dropTables([names.child, names.parent]); }
});
