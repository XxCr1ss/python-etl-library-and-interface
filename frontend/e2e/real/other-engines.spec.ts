import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { REPO_ROOT, resolvePythonExecutable } from "../support/env";

function target(engine: "mysql" | "oracle") {
  const prefix = `ETL_TEST_${engine.toUpperCase()}_`;
  const value = (field: string) => process.env[prefix + field];
  const required = ["HOST", "PORT", "NAME", "USER", "PASSWORD", ...(engine === "oracle" ? ["SERVICE_NAME"] : [])];
  if (!required.some(field => value(field) !== undefined) && !process.env.ETL_REQUIRED_TEST_ENGINES?.split(",").includes(engine)) return null;
  if (required.some(field => value(field) === undefined) || !value("NAME")?.startsWith("etl_test") ||
      (engine === "oracle" && !value("USER")?.startsWith("etl_test"))) {
    throw new Error(`Configuración desechable incompleta para ${engine}`);
  }
  return { db_type: engine, host: value("HOST")!, port: value("PORT")!, database: value("NAME")!,
    user: value("USER")!, password: value("PASSWORD")!, service_name: value("SERVICE_NAME") };
}

function dropOwnedTable(connection: NonNullable<ReturnType<typeof target>>, name: string) {
  execFileSync(resolvePythonExecutable(), ["-c", `
import json, sys
from sqlalchemy import MetaData, Table
from etl import DB_Extractor
from etl.schema_dialects import publication_names

payload = json.load(sys.stdin)
with DB_Extractor(**payload['connection']) as extractor:
    with extractor.engine.begin() as conn:
        for name in (payload['name'], *publication_names(payload['name'])):
            Table(name, MetaData()).drop(conn, checkfirst=True)
`], { cwd: REPO_ROOT, env: { ...process.env, PYTHONUTF8: "1" }, input: JSON.stringify({
    connection: { ...connection, port: Number(connection.port) }, name,
  }), stdio: ["pipe", "ignore", "ignore"] });
}

async function fillConnection(page: Page, connection: NonNullable<ReturnType<typeof target>>, warehouse = false) {
  await page.getByLabel(warehouse ? "Motor de bodega" : "Motor de base de datos").selectOption(connection.db_type);
  const fields = [["Host", connection.host], ["Puerto", connection.port], ["Base de datos", connection.database],
    ["Usuario", connection.user], ["Contraseña", connection.password]];
  for (const [label, value] of fields) await page.getByLabel(label, { exact: true }).fill(value);
  if (connection.service_name) await page.getByLabel(/Service name/).fill(connection.service_name);
}

for (const engine of ["mysql", "oracle"] as const) {
  test(`carga estructurada y consulta avanzada real en ${engine}`, async ({ page }) => {
    const connection = target(engine);
    test.skip(!connection, `Instancia local ${engine} sin configurar`);
    if (!connection) return;
    const table = "etl_e2e_" + randomUUID().replaceAll("-", "").slice(0, 10);
    try {
      await page.goto("/extract");
      await page.getByLabel("Archivo de origen").setInputFiles({ name: "values.csv", mimeType: "text/csv",
        buffer: Buffer.from("amount\n1.125\n3.625\n") });
      await page.getByRole("button", { name: "Procesar Archivo" }).click();
      await page.getByRole("button", { name: "Continuar a Transformación" }).click();
      await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
      await page.getByRole("button", { name: "Configurar tipos y claves" }).click();
      await page.getByRole("tab", { name: /Tabla/ }).click();
      await page.getByLabel("Grano de la tabla").fill("Una venta");
      await page.getByRole("tab", { name: "Columnas" }).click();
      await page.getByLabel(/Tipo de amount/).selectOption("decimal");
      await page.getByRole("button", { name: "Aplicar esquema" }).click();
      const navigation = page.getByRole("navigation", { name: "Navegación principal" });
      await navigation.getByRole("link", { name: "Transformación", exact: true }).click();
      await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
      await fillConnection(page, connection);
      await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
      await expect(page.getByText("Conectado Correctamente")).toBeVisible();
      await page.getByLabel("Tabla destino").fill(table);
      await page.getByLabel("Modo de carga", { exact: true }).selectOption("fail");
      await page.getByRole("button", { name: "Revisar impacto sin escribir" }).click();
      await expect(page.getByText(/publish_table/)).toBeVisible();
      await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
      await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();

      await navigation.getByRole("link", { name: "Bodega de datos", exact: true }).click();
      await fillConnection(page, connection, true);
      await page.getByRole("button", { name: "Conectar y leer catálogo" }).click();
      const baseTable = page.getByLabel("Tabla base", { exact: true });
      await expect(baseTable.getByRole("option", { name: new RegExp(`\\.${table}$`, "i") })).toBeAttached();
      await baseTable.selectOption({ label: (await baseTable.locator("option").allTextContents()).find(label => label.toLowerCase().endsWith(`.${table}`))! });
      await page.getByRole("button", { name: "Nuevo análisis avanzado" }).click();
      await page.getByLabel("Qué representa una fila").fill("Una venta");
      await page.getByRole("tab", { name: "Medidas" }).click();
      await page.getByLabel("Agregación de medida 1").selectOption("PERCENTILE");
      await page.getByLabel("Valor de medida 1", { exact: true }).selectOption({ label: `Base · ${table}.amount` });
      await page.getByRole("button", { name: "Calcular análisis" }).click();
      await expect(page.getByRole("region", { name: "Resultado avanzado 1" })).toContainText(/2,375/);
      await page.getByRole("button", { name: "Agregar esta definición al reporte" }).click();
      await page.getByRole("button", { name: "Ejecutar todos los paneles" }).click();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Descargar este resultado JSON" }).click();
      expect((await download).suggestedFilename()).toBe("resultado_analitico.json");
    } finally { dropOwnedTable(connection, table); }
  });
}
