import {
  buildTransformPreviewResponse,
  expect,
  SAMPLE_SALES_CSV_PATH,
  salesRows,
  test,
  uploadContractResponse,
  type MockStep,
} from "./fixtures";

// These synthetic scenarios intentionally exercise failures and recovery.
// Trace is worker-scoped, so the override belongs at file level.
test.use({ trace: "on" });

test.describe("Suite E2E Mock · Escenarios 3 y 4 (Errores/Carreras A-B y Edición/Reordenación/Prefijo)", () => {
  test("Escenario 3: Error de upload/conexión/preview, respuestas A/B fuera de orden y recuperación", async ({
    page,
    mockApi,
  }) => {
    let uploadShouldFail = true;
    let dbShouldFail = true;
    let resolveTableA!: () => void;
    const tableAPromise = new Promise<void>((r) => {
      resolveTableA = r;
    });

    await mockApi.onJson("POST", "/extract/upload", () => {
      if (uploadShouldFail) {
        return { status: 400, body: { detail: "Archivo CSV corrupto o ilegible" } };
      }
      return uploadContractResponse;
    });

    await mockApi.onJson("POST", "/extract/database", () => {
      if (dbShouldFail) {
        return { status: 400, body: { detail: "Credenciales rechazadas por el motor" } };
      }
      return {
        status: "success",
        message: "OK",
        tables: ["tabla_a", "tabla_b"],
        schema_preview: { tabla_a: ["id"], tabla_b: ["id"] },
      };
    });

    await mockApi.onJson("POST", "/extract/database/preview", async ({ json }) => {
      const body = json() as { table_name: string };
      if (body.table_name === "tabla_a") {
        await tableAPromise;
        return {
          status: "success",
          table_name: "tabla_a",
          total_rows: 1,
          preview_data: [{ id: "fila_vieja_A" }],
        };
      }
      return {
        status: "success",
        table_name: "tabla_b",
        total_rows: 1,
        preview_data: [{ id: "fila_actual_B" }],
      };
    });

    let failTransformPreview = true;
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const body = json() as { steps: MockStep[]; limit: number };
      if (failTransformPreview) {
        return { status: 400, body: { detail: "Error temporal en motor de transformación" } };
      }
      return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
    });

    await page.goto("/extract");
    // 1. Upload error and recovery
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await expect(page.getByText("Archivo CSV corrupto o ilegible")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a Transformación" })).toHaveCount(0);

    // 2. Database connection error -> recovery -> A/B out-of-order table preview
    await page.getByRole("tab", { name: "Base de Datos Relacional" }).click();
    await page.getByLabel("Base de datos", { exact: true }).fill("warehouse");
    await page.getByLabel("Usuario").fill("postgres");
    await page.getByRole("button", { name: "Usar contraseña vacía explícitamente" }).click();
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    await expect(page.getByText("Credenciales rechazadas por el motor")).toBeVisible();
    await expect(page.getByLabel("Base de datos", { exact: true })).toHaveValue("warehouse");

    dbShouldFail = false;
    await page.getByRole("button", { name: "Conectar y listar tablas" }).click();
    const tableSelect = page.getByLabel("Tabla de origen");
    await expect(tableSelect).toBeVisible();

    await tableSelect.selectOption("tabla_a");
    await tableSelect.selectOption("tabla_b");
    await expect(page.getByRole("cell", { name: "fila_actual_B" })).toBeVisible();
    resolveTableA();
    await expect(page.getByRole("cell", { name: "fila_actual_B" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "fila_vieja_A" })).toHaveCount(0);

    // 3. Switch back to File upload, succeed, and test Transform preview error + recovery
    await page.getByRole("tab", { name: "Archivo Local" }).click();
    uploadShouldFail = false;
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);

    await expect(page.getByText("Error temporal en motor de transformación")).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    failTransformPreview = false;
    await page.getByRole("button", { name: "Actualizar vista previa" }).click();
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  test("Escenario 4: Editar con esquema de prefijo, mover, eliminar/deshacer, cancelar pasos", async ({
    page,
    mockApi,
  }) => {
    const prefixRequests: { steps: MockStep[]; limit: number }[] = [];

    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const body = json() as { steps: MockStep[]; limit: number };
      if (body.limit === 1) {
        prefixRequests.push(body);
      }
      return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
    });

    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);

    // Add Step 1: rename col_monto -> ingreso_total
    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
    await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByRole("columnheader", { name: /ingreso_total/ })).toBeVisible();

    // Add Step 2: filter_value on ingreso_total
    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    await page.getByRole("textbox", { name: "Buscar operación" }).fill("filter_value");
    await page.getByRole("button", { name: /Filtrar Datos/i }).click();
    await page.getByRole("combobox", { name: "Columna" }).selectOption("ingreso_total");
    await page.getByRole("textbox", { name: "Valor" }).fill("0");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByText("Receta · 2 pasos")).toBeVisible();

    // Edit Step 1: prefix schema request must have steps: [] and expose col_monto (not ingreso_total)
    await page.getByRole("button", { name: /Editar paso 1:/i }).click();
    const originalColSelect = page.getByRole("combobox", { name: "Columna Original" });
    await expect(originalColSelect).toHaveValue("col_monto");
    await expect(originalColSelect.locator("option", { hasText: "ingreso_total" })).toHaveCount(0);
    expect(prefixRequests.at(-1)?.steps).toEqual([]);
    await page.getByRole("button", { name: "Cancelar" }).click();

    // Edit Step 2: prefix schema request has step 1 and exposes ingreso_total
    await page.getByRole("button", { name: /Editar paso 2:/i }).click();
    await expect(page.getByRole("combobox", { name: "Columna" })).toHaveValue("ingreso_total");
    expect(prefixRequests.at(-1)?.steps).toEqual([
      { type: "rename_columns", params: { columns: { col_monto: "ingreso_total" } } },
    ]);
    await page.getByRole("textbox", { name: "Valor" }).fill("10");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    // Move Step 2 up -> invalidates pipeline because ingreso_total does not exist before rename -> Undo restores
    await page.getByRole("button", { name: /Subir paso 2:/i }).click();
    await expect(page.getByText("La columna ingreso_total no existe antes del filtro")).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.getByRole("button", { name: "Deshacer última modificación" }).click();
    await expect(page.getByRole("link", { name: /Continuar a la Carga/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );

    // Delete Step 2 and Undo
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Eliminar este paso" }).nth(1).click();
    await expect(page.getByText("Receta · 1 pasos")).toBeVisible();
    await page.getByRole("button", { name: "Deshacer última modificación" }).click();
    await expect(page.getByText("Receta · 2 pasos")).toBeVisible();

  });
});
