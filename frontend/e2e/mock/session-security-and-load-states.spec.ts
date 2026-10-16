import fs from "node:fs";
import {
  buildTransformPreviewResponse,
  expect,
  previewContractResponse,
  SAMPLE_SALES_CSV_PATH,
  salesRows,
  test,
  uploadContractResponse,
  type MockStep,
} from "./fixtures";

test.describe("Suite E2E Mock · Escenarios 5, 6 y 8 (Invalidación, Credenciales/Storage, Estado Unknown y Export Seguro)", () => {
  test("Escenario 5: Cambiar fuente invalida receta; cambiar destino invalida conexión; doble clic ejecuta una sola request", async ({
    page,
    mockApi,
  }) => {
    let loadExecuteCalls = 0;

    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/extract/date-dimension/preview", () => ({
      status: "success",
      message: "OK",
      total_rows: 366,
      preview_data: [{ fecha: "2024-01-01" }],
    }));
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const body = json() as { steps: MockStep[]; limit: number };
      return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
    });
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "OK",
    }));
    await mockApi.onJson("POST", "/load/execute", () => {
      loadExecuteCalls += 1;
      return {
        status: "success",
        message: "Carga de hechos exitosa",
        table_name: "fact_ventas",
        table_type: "fact",
        total_rows: 12,
        preview_data: previewContractResponse.preview_data.slice(0, 5),
      };
    });

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);

    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
    await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByText("Receta · 1 pasos")).toBeVisible();

    // Go back to /extract and replace source -> must confirm and clear recipe
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Extracción" }).click();
    await page.getByRole("tab", { name: /Dimensión Temporal/i }).click();
    await page.getByLabel("Año inicial").fill("2024");
    await page.getByLabel("Año final").fill("2024");
    await page.getByRole("button", { name: "Generar dimensión fecha" }).click();

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("Receta · 0 pasos")).toBeVisible();

    // Navigate to Load -> verify editing destination invalidates connection
    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();

    await page.getByLabel("Tabla destino").fill("fact_ventas");
    await page.getByLabel("Tipo de tabla").selectOption("fact");
    const executeBtn = page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" });
    await expect(executeBtn).toBeEnabled();

    // Editing Host invalidates connection
    await page.getByLabel("Host").fill("127.0.0.2");
    await expect(page.getByText("Conexión pendiente de prueba")).toBeVisible();
    await expect(executeBtn).toBeDisabled();

    // Re-test connection and double-click execute -> only 1 request sent
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();
    await executeBtn.dblclick();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(loadExecuteCalls).toBe(1);
  });

  test("Escenario 6: Reload restaura configuración sin passwords y solicita credenciales de origen/secundario/destino; storage corrupto permite recuperación", async ({
    page,
    mockApi,
  }) => {
    const PRIMARY_SECRET = "primary-db-secret-999";
    const SECONDARY_SECRET = "secondary-db-secret-888";
    const previewPayloads: unknown[] = [];

    await mockApi.onJson("POST", "/extract/database", () => ({
      status: "success",
      message: "OK",
      tables: ["ventas_db"],
      schema_preview: { ventas_db: ["id", "col_monto"] },
    }));
    await mockApi.onJson("POST", "/extract/database/preview", () => ({
      status: "success",
      table_name: "ventas_db",
      total_rows: 2,
      preview_data: [
        { id: 1, col_monto: 10 },
        { id: 2, col_monto: 20 },
      ],
    }));
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      previewPayloads.push(json());
      return previewContractResponse;
    });

    await page.goto("/extract");
    await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Base de datos", { exact: true }).fill("origen_db");
    await page.getByLabel("Usuario").fill("user_origen");
    await page.getByLabel("Contraseña", { exact: true }).fill(PRIMARY_SECRET);
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    await page.getByLabel("Tabla de origen").selectOption("ventas_db");
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);

    // Add union step with secondary DB source & secret
    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("textbox", { name: "Buscar operación" }).fill("union");
    await page.getByRole("dialog").getByRole("button", { name: /Unión Vertical/i }).click();
    await page.getByRole("combobox", { name: "Tipo de fuente secundaria" }).selectOption("database");
    await page.getByRole("textbox", { name: "Base de datos", exact: true }).fill("secundaria_db");
    await page.getByRole("textbox", { name: "Usuario" }).fill("user_sec");
    await page.getByLabel("Contraseña", { exact: true }).fill(SECONDARY_SECRET);
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    await page.getByRole("combobox", { name: "Tabla secundaria" }).selectOption("ventas_db");
    await page.getByRole("button", { name: "Confirmar fuente secundaria" }).click();
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByText("Receta · 1 pasos")).toBeVisible();

    // Verify storage never contains secrets
    const rawStorageBeforeReload = await page.evaluate(() => ({
      session: JSON.stringify(sessionStorage),
      local: JSON.stringify(localStorage),
    }));
    expect(rawStorageBeforeReload.session).not.toContain(PRIMARY_SECRET);
    expect(rawStorageBeforeReload.session).not.toContain(SECONDARY_SECRET);
    expect(rawStorageBeforeReload.local).not.toContain(PRIMARY_SECRET);
    expect(rawStorageBeforeReload.local).not.toContain(SECONDARY_SECRET);

    const stepIdBeforeReload = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("etl_pipeline_session_v1") || "{}").recipe[0].id,
    );

    // Wait for the 1-step preview request to finish before reloading
    await expect.poll(() => previewPayloads.length).toBe(2);

    // Reload page -> secrets are cleared from memory, recovery prompt appears, and no preview request is sent without secrets
    await page.reload();
    await expect(page.getByRole("button", { name: "Reingresar credenciales" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(previewPayloads.length).toBe(2);

    await page.getByRole("button", { name: "Reingresar credenciales" }).click();
    const recoveryDialog = page.getByRole("dialog", { name: "Recuperar conexiones" });
    await expect(recoveryDialog).toBeVisible();
    await recoveryDialog.getByLabel("Contraseña · Origen principal").fill(PRIMARY_SECRET);
    await recoveryDialog.getByLabel("Contraseña · Unión 1").fill(SECONDARY_SECRET);
    await recoveryDialog.getByRole("button", { name: "Guardar contraseñas" }).click();

    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(previewPayloads.length).toBe(3);
    const stepIdAfterReload = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("etl_pipeline_session_v1") || "{}").recipe[0].id,
    );
    expect(stepIdAfterReload).toBe(stepIdBeforeReload);

    // Corrupt storage recovery check
    await page.evaluate(() => {
      sessionStorage.setItem("etl_pipeline_session_v1", "{corrupt-json-payload");
    });
    await page.reload();
    await expect(page.getByText(/La sesión guardada es inválida/i)).toBeVisible();
    await page.getByRole("button", { name: "Restablecer sesión" }).click();
    await expect(page.getByText(/La sesión guardada es inválida/i)).toHaveCount(0);
  });

  test("Escenario 8: Load con error post-envío queda unknown; no reenvía al navegar/recargar; historial y export JSON sin secretos", async ({
    page,
    mockApi,
  }) => {
    const TARGET_SECRET = "super-secret-warehouse-pw";
    let loadCalls = 0;
    let mode: "fail500" | "success" = "fail500";

    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/transform/preview", () => previewContractResponse);
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "OK",
    }));
    await mockApi.onJson("POST", "/load/execute", () => {
      loadCalls += 1;
      if (mode === "fail500") {
        return {
          status: 500,
          body: { detail: "Conexión interrumpida durante la verificación post-carga" },
        };
      }
      return {
        status: "success",
        message: "Carga confirmada",
        table_name: "fact_pagos",
        table_type: "fact",
        total_rows: 12,
        preview_data: previewContractResponse.preview_data.slice(0, 5),
      };
    });

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByLabel("Contraseña", { exact: true }).fill(TARGET_SECRET);
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();

    await page.getByLabel("Tabla destino").fill("fact_pagos");
    await page.getByLabel("Tipo de tabla").selectOption("fact");

    const executeBtn = page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" });
    await executeBtn.click();

    await expect(page.getByRole("heading", { name: "Resultado desconocido" })).toBeVisible();
    await expect(
      page.getByText("No se pudo confirmar el resultado; revisa la tabla destino antes de repetir"),
    ).toBeVisible();
    expect(loadCalls).toBe(1);
    await expect(executeBtn).toBeDisabled();

    // Navigate to Dashboard and back -> must NOT retry automatically
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("table")).toContainText("Resultado desconocido");
    expect(loadCalls).toBe(1);

    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Carga" }).click();
    await expect(page).toHaveURL(/\/load$/);
    expect(loadCalls).toBe(1);

    // Reload page -> must NOT retry automatically
    await page.reload();
    expect(loadCalls).toBe(1);

    // Re-enter password, test connection, confirm target review, and execute successful load -> export JSON and check no secrets leaked
    mode = "success";
    await page.getByLabel("Contraseña", { exact: true }).fill(TARGET_SECRET);
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();
    await expect(executeBtn).toBeDisabled();
    await page.getByRole("checkbox", { name: /He revisado la tabla destino antes de repetir esta carga/i }).check();
    await expect(executeBtn).toBeEnabled();
    await executeBtn.click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(loadCalls).toBe(2);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar resumen JSON" }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const exportedContent = fs.readFileSync(downloadPath!, "utf-8");

    expect(exportedContent).not.toContain(TARGET_SECRET);
    expect(exportedContent).not.toContain(uploadContractResponse.filepath);
    const parsedExport = JSON.parse(exportedContent);
    expect(parsedExport).toMatchObject({
      reportVersion: 1,
      status: "success",
      table_name: "fact_pagos",
      table_type: "fact",
      if_exists: "append",
      total_rows: 12,
    });
    expect(parsedExport.password).toBeUndefined();
    expect(parsedExport.source).toBeUndefined();
    expect(parsedExport.recipe).toBeUndefined();
  });
});
