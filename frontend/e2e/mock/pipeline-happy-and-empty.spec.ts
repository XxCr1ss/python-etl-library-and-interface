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

test.describe("Suite E2E Mock · Escenarios 1, 2 y 7 (Flujo completo, Receta vacía, Dimensión Fecha y Agente)", () => {
  test("Escenario 1: CSV -> preview (5 de 12) -> Transform rename col_monto a ingreso_total (10 de 12) -> Load replace confirmado -> reporte con total en destino -> Dashboard", async ({
    page,
    mockApi,
  }) => {
    const transformRequests: { source: unknown; steps: MockStep[]; limit: number }[] = [];
    let loadPayload: unknown = null;

    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const body = json() as { source: unknown; steps: MockStep[]; limit: number };
      transformRequests.push(body);
      return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
    });
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "Conexión a bodega verificada",
    }));
    await mockApi.onJson("POST", "/load/execute", ({ json }) => {
      loadPayload = json();
      const transformed = buildTransformPreviewResponse(
        salesRows,
        [{ type: "rename_columns", params: { columns: { col_monto: "ingreso_total" } } }],
        5,
      ).body;
      return {
        status: "success",
        message: "Carga completada en dim_ventas",
        table_name: "dim_ventas",
        table_type: "dimension",
        total_rows: 12,
        preview_data: transformed.preview_data,
      };
    });

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();

    await expect(page.getByText("12 filas en el origen. Mostrando 5 filas de muestra.")).toBeVisible();
    const extractTable = page.getByRole("region", { name: "Muestra del origen" }).getByRole("table");
    await expect(extractTable.locator("tbody tr")).toHaveCount(5);

    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();

    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
    await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();

    await expect(page.getByRole("columnheader", { name: /ingreso_total/ })).toBeVisible();
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();

    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByLabel("Contraseña", { exact: true }).fill("secret-runtime-target");
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();

    await page.getByLabel("Tabla destino").fill("dim_ventas");
    await page.getByLabel("Tipo de tabla").selectOption("dimension");
    await page.getByLabel("Modo de carga", { exact: true }).selectOption("replace");

    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    const confirmDialog = page.getByRole("dialog", { name: "Confirmar reemplazo de tabla" });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText("dim_ventas");
    await confirmDialog.getByRole("button", { name: "Confirmar reemplazo" }).click();

    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    await expect(page.getByText("Total de filas en la tabla destino")).toBeVisible();
    await expect(page.getByText("Muestra de la tabla destino")).toBeVisible();
    await expect(page.locator("dl > div").filter({ has: page.getByText("Total de filas en la tabla destino", { exact: true }) }).locator("dd")).toHaveText("12");

    expect(loadPayload).toEqual({
      source: { type: "file", filepath: uploadContractResponse.filepath },
      target_connection: {
        db_type: "postgresql",
        host: "127.0.0.1",
        port: 5432,
        database: "etl_test",
        user: "postgres",
        password: "secret-runtime-target",
      },
      load_config: {
        table_name: "dim_ventas",
        table_type: "dimension",
        if_exists: "replace",
      },
      recipe: [{ type: "rename_columns", params: { columns: { col_monto: "ingreso_total" } } }],
    });

    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const historyTable = page.getByRole("table");
    await expect(historyTable).toContainText("dim_ventas");
    await expect(historyTable).toContainText("12");
  });

  test("Escenario 2: Sin fuente las rutas directas muestran guía; receta vacía carga correctamente con recipe=[]", async ({
    page,
    mockApi,
  }) => {
    let executedPayload: unknown = null;
    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/transform/preview", () => previewContractResponse);
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "OK",
    }));
    await mockApi.onJson("POST", "/load/execute", ({ json }) => {
      executedPayload = json();
      return {
        status: "success",
        message: "Carga directa completada",
        table_name: "dim_directa",
        table_type: "dimension",
        total_rows: 12,
        preview_data: previewContractResponse.preview_data.slice(0, 5),
      };
    });

    await page.goto("/load");
    await expect(page.getByRole("heading", { name: /Paso bloqueado/i })).toBeVisible();
    await page.getByRole("link", { name: /Ir a transformaciones/i }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByRole("heading", { name: /Paso bloqueado/i })).toBeVisible();
    await page.getByRole("link", { name: /Configurar origen/i }).click();
    await expect(page).toHaveURL(/\/extract$/);

    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("Receta · 0 pasos")).toBeVisible();

    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);
    await expect(page.getByText("Carga directa (sin pasos de transformación en cola).")).toBeVisible();

    await page.getByLabel("Host").fill("localhost");
    await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();

    await page.getByLabel("Tabla destino").fill("dim_directa");
    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await page.getByRole("button", { name: "Confirmar reemplazo" }).click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(executedPayload).toMatchObject({
      source: { type: "file", filepath: uploadContractResponse.filepath },
      recipe: [],
    });
  });

  test("Escenario 7: Dimensión fecha 2024–2024 conserva años en requests; agente conectado/desconectado/timeout mediante HTTP simulado", async ({
    page,
    mockApi,
  }) => {
    const extractDateBodies: unknown[] = [];
    const transformSources: unknown[] = [];
    let loadBody: unknown = null;
    let agentConnected = false;
    let dbMetadataMode: "ok" | "timeout" = "timeout";

    await mockApi.onJson("POST", "/extract/date-dimension/preview", ({ json }) => {
      extractDateBodies.push(json());
      return {
        status: "success",
        message: "Dimensión generada",
        total_rows: 366,
        preview_data: [{ fecha: "2024-01-01", anio: 2024, mes: 1, dia: 1 }],
      };
    });
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const body = json() as { source: unknown };
      transformSources.push(body.source);
      return {
        status: "success",
        total_rows: 366,
        columns: ["fecha", "anio", "mes", "dia"],
        dtypes: { fecha: "str", anio: "int64", mes: "int64", dia: "int64" },
        preview_data: [{ fecha: "2024-01-01", anio: 2024, mes: 1, dia: 1 }],
      };
    });
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "OK",
    }));
    await mockApi.onJson("POST", "/load/execute", ({ json }) => {
      loadBody = json();
      return {
        status: "success",
        message: "Fecha cargada",
        table_name: "dim_fecha",
        table_type: "dimension",
        total_rows: 366,
        preview_data: [{ fecha: "2024-01-01", anio: 2024, mes: 1, dia: 1 }],
      };
    });
    await mockApi.onJson("GET", "/extract/agent/status/*", ({ url }) => {
      const agentId = url.pathname.split("/").pop() || "agent";
      return { agent_id: agentId, connected: agentConnected };
    });
    await mockApi.onJson("POST", "/extract/database", () => {
      if (dbMetadataMode === "timeout") {
        return {
          status: 504,
          body: { detail: "Tiempo de espera agotado esperando respuesta del agente local." },
        };
      }
      return {
        status: "success",
        message: "Agente conectado",
        tables: ["ventas_agente"],
        schema_preview: { ventas_agente: ["id", "monto"] },
      };
    });

    await page.goto("/extract");
    // 1. Verify agent disconnected -> connected -> timeout -> success
    await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
    await page.getByLabel("Base de datos", { exact: true }).fill("local_db");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("checkbox", { name: "Usar agente local híbrido" }).check();

    const connectBtn = page.getByRole("button", { name: "Conectar y listar tablas" });
    await expect(connectBtn).toBeDisabled();
    await expect(page.getByText(/Conecta el agente y comprueba su estado/i)).toBeVisible();

    agentConnected = true;
    await page.getByRole("button", { name: /Reintentar estado del agente/i }).click();
    await expect(connectBtn).toBeEnabled();

    await connectBtn.click();
    await expect(page.getByText(/Tiempo de espera agotado esperando respuesta del agente local/i)).toBeVisible();

    dbMetadataMode = "ok";
    await connectBtn.click();
    await expect(page.getByText(/1 tablas disponibles/i)).toBeVisible();

    // 2. Switch to Date Dimension 2024-2024 and verify years preserved through Extract -> Transform -> Load
    await page.getByRole("tab", { name: /Dimensión Temporal/i }).click();
    await page.getByLabel("Año inicial").fill("2024");
    await page.getByLabel("Año final").fill("2024");
    await page.getByRole("button", { name: "Generar dimensión fecha" }).click();
    await expect(page.getByText("366 filas en el origen. Mostrando 1 filas de muestra.")).toBeVisible();
    expect(extractDateBodies).toEqual([{ start_year: 2024, end_year: 2024 }]);

    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("1 filas de muestra de 366 transformadas · 4 columnas")).toBeVisible();
    expect(transformSources[0]).toEqual({ type: "date_dimension", start_year: 2024, end_year: 2024 });

    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Base de datos", { exact: true }).fill("etl_test");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Probar Conexión Bodega" }).click();
    await expect(page.getByText("Conectado Correctamente")).toBeVisible();

    await page.getByLabel("Tabla destino").fill("dim_fecha");
    await page.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }).click();
    await page.getByRole("button", { name: "Confirmar reemplazo" }).click();
    await expect(page.getByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(loadBody).toMatchObject({
      source: { type: "date_dimension", start_year: 2024, end_year: 2024 },
      recipe: [],
    });
  });
});
