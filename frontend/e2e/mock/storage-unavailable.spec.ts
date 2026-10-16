import { test, expect, SAMPLE_SALES_CSV_PATH, uploadContractResponse, previewContractResponse } from "./fixtures";

test("storage bloqueado conserva el pipeline en memoria y permite continuar", async ({ page, mockApi }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await mockApi.onJson("POST", "/extract/upload", () => uploadContractResponse);
  await mockApi.onJson("POST", "/transform/preview", () => previewContractResponse);
  await page.goto("/extract");
  await expect(page.getByText(/Storage no disponible/)).toBeVisible();
  await page.getByLabel("Archivo de origen").setInputFiles(SAMPLE_SALES_CSV_PATH);
  await page.getByRole("button", { name: "Procesar Archivo" }).click();
  await page.getByRole("button", { name: "Continuar a Transformación" }).click();
  await expect(page.getByText("10 filas de muestra de 12 transformadas · 6 columnas")).toBeVisible();
  await expect(page.getByText(/No se pudo guardar la sesión/)).toBeVisible();
  await page.getByRole("link", { name: /Continuar a la Carga/i }).click();
  await expect(page.getByLabel("Tabla destino")).toBeVisible();
});
