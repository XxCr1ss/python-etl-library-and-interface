import { expect, it } from "vitest";
import { render, screen, userEvent, within } from "./render";
import TablePreview from "@/app/(app)/transform/components/TablePreview";
it("tabla distingue NULL/vacío/0/false/objetos/listas, conserva dtype raw y permite expandir", async () => {
  const long = "x".repeat(150);
  render(<TablePreview columns={["nil", "empty", "zero", "false", "list", "object", "long"]} dtypes={{ nil: "custom_type" }} totalRows={20} loading={false} error={null}
    previewData={[{ nil: null, empty: "", zero: 0, false: false, list: [1, false], object: { a: 0 }, long }]} />);
  expect(screen.getByRole("cell", { name: "NULL" })).toBeVisible(); expect(screen.getByRole("cell", { name: "Texto vacío" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "0" })).toBeVisible(); expect(screen.getByRole("cell", { name: "false" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "[1,false]" })).toBeVisible(); expect(screen.getByRole("cell", { name: '{"a":0}' })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: /nil custom_type/ })).toHaveAttribute("scope", "col"); expect(screen.getByText("1 filas de muestra de 20 transformadas · 7 columnas")).toBeVisible();
  await userEvent.setup().click(screen.getByText(/Mostrar valor completo/)); expect(screen.getByText(long)).toBeVisible();
});
it("resultado vacío conserva columnas, cero total, estado stale y datos durante actualización/error", () => {
  const view = render(<TablePreview columns={["id"]} dtypes={{ id: "int64" }} previewData={[]} totalRows={0} loading={false} error={null} />);
  expect(screen.getByRole("columnheader", { name: /id/ })).toBeVisible(); expect(screen.getByText(/0 filas de muestra de 0 transformadas/)).toBeVisible(); expect(screen.getByText(/Resultado válido sin filas/)).toBeVisible();
  view.rerender(<TablePreview columns={["id"]} dtypes={{ id: "int64" }} previewData={[{ id: 0 }]} totalRows={1} loading stale error={null} />);
  expect(screen.getByText(/Datos desactualizados/)).toBeVisible(); expect(screen.getByRole("cell", { name: "0" })).toBeVisible();
  expect(screen.getByRole("region", { name: "Vista previa del resultado" })).toHaveAttribute("aria-busy", "true");
  view.rerender(<TablePreview columns={["id"]} dtypes={{}} previewData={[{ id: 0 }]} loading={false} stale error="Fallo de fórmula" />);
  expect(within(screen.getByRole("alert")).getByText("Fallo de fórmula")).toBeVisible(); expect(screen.getByRole("cell", { name: "0" })).toBeVisible();
});
