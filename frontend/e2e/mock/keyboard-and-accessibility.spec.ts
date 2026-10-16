import {
  buildTransformPreviewResponse,
  expect,
  SAMPLE_SALES_CSV_PATH,
  salesRows,
  test,
  uploadContractResponse,
  type MockStep,
} from "./fixtures";

test.describe("Suite E2E Mock · Escenario 9 y Sección 4 (Teclado, Foco, Diálogos, Navegación Móvil, Viewports y Errores de Campo)", () => {
  test("Escenario 9: Teclado en tabs, apertura/cierre/foco de diálogos, reordenación, navegación móvil, viewports sin overflow y errores de campo", async ({
    page,
    mockApi,
  }) => {
    let previewCalls = 0;
    let useWideDataset = false;
    const wideColumns = Array.from({ length: 50 }, (_, idx) => `col_${String(idx + 1).padStart(2, "0")}`);
    const wideDtypes = Object.fromEntries(wideColumns.map((col) => [col, "int64"]));
    const wideRows = Array.from({ length: 10 }, (_, rIdx) =>
      Object.fromEntries(wideColumns.map((col, cIdx) => [col, rIdx * 100 + cIdx])),
    );

    await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      previewCalls += 1;
      const body = json() as { steps: MockStep[]; limit: number };
      if (useWideDataset) {
        return {
          status: "success",
          total_rows: 10,
          columns: wideColumns,
          dtypes: wideDtypes,
          preview_data: wideRows,
        };
      }
      return buildTransformPreviewResponse(salesRows, body.steps, body.limit);
    });
    await mockApi.onJson("POST", "/load/test-connection", () => ({
      status: "success",
      message: "OK",
    }));

    // 1. Keyboard navigation on Extract tabs + field validation error on inverted date range
    await page.goto("/extract");
    const fileTab = page.getByRole("tab", { name: "Archivo Local" });
    await fileTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Base de Datos Relacional" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Dimensión Temporal/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Field validation error on inverted years
    await page.getByLabel("Año inicial").fill("2025");
    await page.getByLabel("Año final").fill("2024");
    await page.getByRole("button", { name: "Generar dimensión fecha" }).click();
    await expect(page.getByText(/El año final debe ser igual o posterior al inicial/i)).toBeVisible();

    // Return to first tab with Home key and upload CSV
    await page.getByRole("tab", { name: /Dimensión Temporal/i }).focus();
    await page.keyboard.press("Home");
    await expect(fileTab).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page).toHaveURL(/\/transform$/);
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();

    // 2. Dialog open/close with keyboard, focus containment/restoration, and zero extra preview requests when recipe does not change
    const callsBeforeDialog = previewCalls;
    const addStepBtn = page.getByRole("button", { name: "Agregar Transformación" });
    await addStepBtn.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Agregar Prefijo/i }).click();
    await dialog.getByRole("button", { name: /Renombrar/i }).click();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(addStepBtn).toBeFocused();
    expect(previewCalls).toBe(callsBeforeDialog);

    // Add 2 steps and test keyboard reordering
    await addStepBtn.click();
    await page.getByRole("combobox", { name: "Columna Original" }).selectOption("col_monto");
    await page.getByRole("textbox", { name: "Nuevo Nombre" }).fill("ingreso_total");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();

    await addStepBtn.click();
    await page.getByRole("textbox", { name: "Buscar operación" }).fill("prefix_header");
    await page.getByRole("button", { name: /Agregar Prefijo/i }).click();
    await page.getByRole("textbox", { name: "Prefijo" }).fill("v_");
    await page.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByText("Receta · 2 pasos")).toBeVisible();

    const moveUpStep2 = page.getByRole("button", { name: /Subir paso 2:/i });
    await moveUpStep2.focus();
    await page.keyboard.press("Enter");
    const firstStepText = page.getByRole("region", { name: "Receta de transformación" }).locator("ol li").first();
    await expect(firstStepText).toContainText("1. Agregar Prefijo");

    // 3. Wide 10x50 fixture + Viewports 375x812, 768x1024, 1440x900: zero horizontal page scroll & mobile drawer keyboard behavior
    useWideDataset = true;
    await page.getByRole("button", { name: "Actualizar vista previa" }).click();
    await expect(page.getByText("10 filas de muestra de 10 transformadas · 50 columnas")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /col_50/ })).toBeVisible();

    for (const vp of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `Horizontal overflow detected at ${vp.width}x${vp.height}`).toBe(false);
    }

    // Mobile drawer at 375x812
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileMenuBtn = page.getByRole("button", { name: "Abrir navegación" });
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();
    const mobileDialog = page.getByRole("dialog", { name: "Navegación" });
    await expect(mobileDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileDialog).toHaveCount(0);
    await expect(mobileMenuBtn).toBeFocused();

    // 4. Restore 6-column dataset & desktop viewport, navigate to Load, verify field errors on table name & duplicate FK
    useWideDataset = false;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Actualizar vista previa" }).click();
    await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();
    await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
    await expect(page).toHaveURL(/\/load$/);

    await page.getByLabel("Tabla destino").fill("esquema.tabla_invalida");
    await expect(page.getByText(/Usa un nombre simple sin espacios exteriores/i)).toBeVisible();
    await page.getByLabel("Tabla destino").fill("fact_valida");
    await page.getByLabel("Tipo de tabla").selectOption("fact");

    await page.getByRole("button", { name: "Agregar FK" }).click();
    await page.getByLabel("Columna origen FK 1").selectOption("v_id");
    await page.getByLabel("Tabla dimensión FK 1").fill("dim_a");
    await page.getByLabel("PK destino FK 1").fill("id");

    await page.getByRole("button", { name: "Agregar FK" }).click();
    await page.getByLabel("Columna origen FK 2").selectOption("v_id");
    await page.getByLabel("Tabla dimensión FK 2").fill("dim_b");
    await page.getByLabel("PK destino FK 2").fill("id");
    await expect(page.getByText("La columna origen está repetida.").first()).toBeVisible();
  });
});
