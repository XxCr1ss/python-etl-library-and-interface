import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { removeOwnedUpload } from "../support/uploads";
import { E2E_UPLOAD_DIR, REPO_ROOT, requireRealTestDbConfig } from "../support/env";
import { checkDbConnectivity, dropTables, inspectTable, seedTable } from "../support/sqlClient";

const SAMPLE_SALES_CSV_PATH = path.join(
  REPO_ROOT,
  "frontend",
  "src",
  "tests",
  "fixtures",
  "sample_sales.csv",
);

const runId = crypto.randomBytes(3).toString("hex");
const trackedTables: string[] = [];

function trackTable(suffix: string): string {
  const name = `etl_e2e_${runId}_${suffix}`;
  if (!trackedTables.includes(name)) {
    trackedTables.push(name);
  }
  return name;
}

async function fillAndTestTargetConnection(page: Page) {
  const cfg = requireRealTestDbConfig();
  await page.getByLabel("Motor de base de datos").selectOption(cfg.db_type);
  await page.getByLabel("Host").fill(cfg.host);
  await page.getByLabel("Puerto").fill(String(cfg.port));
  await page.getByLabel("Base de datos", { exact: true }).fill(cfg.database);
  await page.getByLabel("Usuario").fill(cfg.user);
  if (cfg.password === "") {
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
  } else {
    await page.getByLabel("Contraseña", { exact: true }).fill(cfg.password);
  }
  await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
  await expect(page.getByText("Conectado Correctamente")).toBeVisible();
}

test.describe.serial("Suite E2E Real · Navegador + FastAPI + PostgreSQL (etl_test)", () => {
  test.beforeAll(() => {
    const status = checkDbConnectivity();
    expect(status.status).toBe("ok");
  });

  test.afterAll(() => {
    dropTables(trackedTables);
  });

  test("Caso 1 y 2: CSV 12 filas -> rename col_monto a ingreso_total -> dimensión replace (12) -> segunda carga append (24) verificadas por SQL independiente", async ({
    page,
  }) => {
    const tableName = trackTable("dim_ventas");

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await expect(page.getByText("12 filas en el origen. Mostrando 5 filas de muestra.")).toBeVisible();

    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();

    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
    await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByRole("columnheader", { name: /ingreso_total/ })).toBeVisible();

    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    await fillAndTestTargetConnection(page);
    await page.getByLabel("Tabla destino").fill(tableName);
    await page.getByLabel("Tipo de tabla").selectOption("dimension");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("replace");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    const confirmDialog = page.getByRole("dialog", { name: "Confirmar reemplazo de tabla" });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Confirmar reemplazo" }).click();

    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    await expect(page.getByText("Total de filas en la tabla destino")).toBeVisible();
    await expect(page.locator("dl > div").filter({ has: page.getByText("Total de filas en la tabla destino", { exact: true }) }).locator("dd")).toHaveText("12");

    // Verificación SQL directa independiente tras primera carga (replace)
    const sqlFirst = inspectTable(tableName);
    expect(sqlFirst.exists).toBe(true);
    expect(sqlFirst.count).toBe(12);
    expect(sqlFirst.columns).toEqual([
      "id",
      "cliente_id",
      "ingreso_total",
      "fecha",
      "activo",
      "etiquetas",
    ]);
    expect(sqlFirst.rows.map((r) => r.ingreso_total)).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110,
    ]);

    // Segunda carga en modo append -> conteo pasa de 12 a 24
    await page.getByRole("button", { name: "Nueva carga" }).click();
    await fillAndTestTargetConnection(page);
    await page.getByLabel("Tabla destino").fill(tableName);
    await page.getByLabel("Tipo de tabla").selectOption("dimension");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("append");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    await expect(page.getByText("Total de filas en la tabla destino")).toBeVisible();
    await expect(page.locator("dl > div").filter({ has: page.getByText("Total de filas en la tabla destino", { exact: true }) }).locator("dd")).toHaveText("24");
    await expect(
      page.getByText("En append, el total incluye filas anteriores. La muestra puede incluir datos de cargas previas."),
    ).toBeVisible();
    await expect(page.getByText(/filas insertadas/i)).toHaveCount(0);

    // Verificación SQL directa independiente tras segunda carga (append)
    const sqlSecond = inspectTable(tableName);
    expect(sqlSecond.exists).toBe(true);
    expect(sqlSecond.count).toBe(24);
  });

  test("Caso 3 y 4: Dimensión + hechos con FK válida e intento con FK inexistente sin alterar tabla destino", async ({
    page,
  }) => {
    const dimValidTable = trackTable("dim_cliente");
    const factValidTable = trackTable("fact_ventas");
    const dimPartialTable = trackTable("dim_parcial");
    const factProtectedTable = trackTable("fact_protegida");

    seedTable(dimValidTable, [
      { id: 1, nombre: "Cliente 1" },
      { id: 2, nombre: "Cliente 2" },
      { id: 3, nombre: "Cliente 3" },
    ]);
    seedTable(dimPartialTable, [
      { id: 1, nombre: "Cliente 1" },
      { id: 2, nombre: "Cliente 2" },
    ]);
    seedTable(factProtectedTable, [
      { id: 501, cliente_id: "1", col_monto: 10, fecha: "2024-01-01", activo: true, etiquetas: null },
      { id: 502, cliente_id: "2", col_monto: 20, fecha: "2024-01-01", activo: false, etiquetas: null },
    ]);

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    // Caso 3: Carga de tabla de hechos con FK válida
    await fillAndTestTargetConnection(page);
    await page.getByLabel("Tabla destino").fill(factValidTable);
    await page.getByLabel("Tipo de tabla").selectOption("fact");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("append");

    await page.getByRole("button", { name: "Agregar FK" }).click();
    await page.getByLabel("Columna origen FK 1").selectOption("cliente_id");
    await page.getByLabel("Tabla dimensión FK 1").fill(dimValidTable);
    await page.getByLabel("PK destino FK 1").fill("id");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();

    const sqlFactValid = inspectTable(factValidTable);
    expect(sqlFactValid.exists).toBe(true);
    expect(sqlFactValid.count).toBe(12);
    expect(new Set(sqlFactValid.rows.map((r) => String(r.cliente_id)))).toEqual(new Set(["1", "2", "3"]));

    // Caso 4: Carga de tabla de hechos con FK inexistente (cliente_id=3 ausente en dimPartialTable)
    await page.getByRole("button", { name: "Nueva carga" }).click();
    await fillAndTestTargetConnection(page);
    await page.getByLabel("Tabla destino").fill(factProtectedTable);
    await page.getByLabel("Tipo de tabla").selectOption("fact");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("append");

    await page.getByRole("button", { name: "Agregar FK" }).click();
    await page.getByLabel("Columna origen FK 1").selectOption("cliente_id");
    await page.getByLabel("Tabla dimensión FK 1").fill(dimPartialTable);
    await page.getByLabel("PK destino FK 1").fill("id");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await expect(page.getByRole("heading", { name: "Resultado desconocido" })).toBeVisible();
    await expect(page.getByText(/Valores no encontrados en dimensión/i)).toBeVisible();

    // Verificar por SQL independiente que factProtectedTable conserva exactamente sus 2 filas previas
    const sqlFactProtected = inspectTable(factProtectedTable);
    expect(sqlFactProtected.exists).toBe(true);
    expect(sqlFactProtected.count).toBe(2);
    expect(sqlFactProtected.rows.map((r) => r.id)).toEqual([501, 502]);
  });

  test("Caso 5: Dimensión fecha 2024–2024 sin receta carga 366 filas con límites 2024-01-01..2024-12-31 en PostgreSQL", async ({
    page,
  }) => {
    const dateTable = trackTable("dim_fecha_2024");

    await page.goto("/extract");
    await page.getByRole("tab", { name: /Dimensión Temporal/i }).click();
    await page.getByLabel("Año inicial").fill("2024");
    await page.getByLabel("Año final").fill("2024");
    await page.getByRole("button", { name: "Generar dimensión fecha" }).click();
    await expect(page.getByText("366 filas en el origen. Mostrando 5 filas de muestra.")).toBeVisible();

    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("Receta · 0 pasos")).toBeVisible();
    await expect(page.getByText(/10 filas de muestra de 366 transformadas/)).toBeVisible();

    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    await fillAndTestTargetConnection(page);
    await page.getByLabel("Tabla destino").fill(dateTable);
    await page.getByLabel("Tipo de tabla").selectOption("dimension");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("replace");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await page.getByRole("dialog", { name: "Confirmar reemplazo de tabla" }).getByRole("button", { name: "Confirmar reemplazo" }).click();

    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    await expect(page.locator("dl > div").filter({ has: page.getByText("Total de filas en la tabla destino", { exact: true }) }).locator("dd")).toHaveText("366");

    const sqlDate = inspectTable(dateTable);
    expect(sqlDate.exists).toBe(true);
    expect(sqlDate.count).toBe(366);
    expect(sqlDate.min_fecha).toBe("2024-01-01");
    expect(sqlDate.max_fecha).toBe("2024-12-31");
  });

  test("Caso 6: Archivo faltante / fuente expirada muestra error recuperable sin escribir ni alterar PostgreSQL", async ({
    page,
  }) => {
    const expiredTargetTable = trackTable("dim_no_escrita");

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();

    // Only expire this source. A neighbouring CSV must survive the operation.
    const filepath = await page.evaluate(() => JSON.parse(sessionStorage.getItem("etl_pipeline_session_v1")!).source.filepath as string);
    const neighbour = path.join(E2E_UPLOAD_DIR, `neighbour-${runId}.csv`);
    fs.writeFileSync(neighbour, "id\n999\n");
    try {
      removeOwnedUpload(E2E_UPLOAD_DIR, filepath);
      expect(fs.readFileSync(neighbour, "utf8")).toBe("id\n999\n");
    } finally { fs.unlinkSync(neighbour); }

    await page.getByRole("button", { name: "Actualizar vista previa" }).click();
    await expect(page.getByText(/no existe en el disco/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "vuelve a subir el archivo" })).toHaveAttribute(
      "href",
      "/extract",
    );
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    const sqlCheck = inspectTable(expiredTargetTable);
    expect(sqlCheck.exists).toBe(false);
  });
});
