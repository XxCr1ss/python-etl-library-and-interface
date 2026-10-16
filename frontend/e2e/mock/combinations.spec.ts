import path from "node:path";
import contracts from "../../src/tests/fixtures/backend-contracts.json";
import { expect, FIXTURES_DIR, test } from "./fixtures";

for (const kind of ["left_join", "right_join", "inner_join", "outer_join", "union"] as const) {
  test(`${kind}: payload exacto, fuente secundaria distinta y filas verificadas por contrato HTTP`, async ({ page, mockApi }) => {
    const primary = contracts.combinationLeftUpload;
    const secondary = contracts.combinationRightUpload;
    const expected = contracts.combinations[kind];
    let uploaded = 0;
    let combined = 0;
    await mockApi.onJson("POST", "/extract/upload", ({ rawText }) => {
      const response = uploaded++ === 0 ? primary : secondary;
      expect(rawText()).toContain(response.filename);
      return response;
    });
    await mockApi.onJson("POST", "/transform/preview", ({ json }) => {
      const request = json() as { source: unknown; steps: unknown[]; limit: number };
      expect(request.source).toEqual({ type: "file", filepath: primary.filepath });
      if (request.steps.length === 0) return {
        status: "success", total_rows: 2, columns: ["id", "a"],
        dtypes: { id: "int64", a: "int64" }, preview_data: primary.preview_data,
      };
      const source = { type: "file", filepath: secondary.filepath };
      expect(request).toEqual({
        source: { type: "file", filepath: primary.filepath }, limit: 10,
        steps: [{ type: kind, params: kind === "union" ? { secondary_source: source } : { right_source: source, on: "id" } }],
      });
      combined++;
      return expected;
    });
    await page.goto("/extract");
    await page.getByLabel("Archivo de origen").setInputFiles(path.join(FIXTURES_DIR, primary.filename));
    await page.getByRole("button", { name: "Procesar Archivo" }).click();
    await page.getByRole("button", { name: "Continuar a Transformación" }).click();
    await expect(page.getByText("2 filas de muestra de 2 transformadas · 2 columnas")).toBeVisible();
    await page.getByRole("button", { name: "Agregar Transformación" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Buscar operación" }).fill(kind);
    await dialog.getByRole("button", { name: kind === "union" ? /Unión Vertical/i : /Unión Horizontal/i }).click();
    await dialog.getByLabel("Archivo de origen").setInputFiles(path.join(FIXTURES_DIR, secondary.filename));
    await dialog.getByRole("button", { name: "Procesar archivo secundario" }).click();
    await dialog.getByRole("button", { name: "Confirmar fuente secundaria" }).click();
    if (kind !== "union") await dialog.getByRole("textbox", { name: /Claves de cruce/i }).fill('"id"');
    await dialog.getByRole("button", { name: "Aplicar Operación" }).click();
    await expect(page.getByText(`${expected.total_rows} filas de muestra de ${expected.total_rows} transformadas · 3 columnas`)).toBeVisible();
    const rows = page.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(expected.total_rows);
    for (let index = 0; index < expected.preview_data.length; index++) {
      const row = expected.preview_data[index];
      const cells = rows.nth(index).locator("td");
      for (let columnIndex = 0; columnIndex < expected.columns.length; columnIndex++) {
        const column = expected.columns[columnIndex];
        const value = (row as Record<string, unknown>)[column];
        await expect(cells.nth(columnIndex)).toHaveText(value === null ? "NULL" : String(value));
      }
    }
    expect(uploaded).toBe(2);
    expect(combined).toBe(1);
  });
}
