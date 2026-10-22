import { afterEach, beforeEach, expect, it } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManualPage from "@/app/(app)/manual/page";
import { ManualSidebar } from "@/features/manual/components/ManualSidebar";
import { DataDiffTable } from "@/features/manual/components/DataDiffTable";
import { mockMedia } from "./media";
import { mockDialogMethods } from "./dialog";

let restoreDialog: () => void;
beforeEach(() => { mockMedia(); restoreDialog = mockDialogMethods(); window.history.replaceState(null, "", "/manual"); });
afterEach(() => { restoreDialog(); window.history.replaceState(null, "", "/"); });

it("ofrece las seis guías, las fichas y búsqueda sin desmontar los destinos", async () => {
  const user = userEvent.setup();
  render(<ManualPage />);
  expect(screen.getByRole("heading", { level: 1, name: "Manual de usuario" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Extracción de datos" })).toHaveAttribute("id", "extraccion");
  const nav = screen.getByRole("navigation", { name: "Contenido del manual" });
  await user.type(screen.getByRole("textbox", { name: "Buscar en el manual" }), "  AGREGACION  ");
  expect(within(nav).getByRole("link", { name: "Agrupar por Suma" })).toBeInTheDocument();
  expect(within(nav).queryByRole("link", { name: "Renombrar" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Renombrar" })).toHaveAttribute("id", "rename_columns");
  await user.click(screen.getByRole("button", { name: "Limpiar" }));
  await user.type(screen.getByRole("textbox", { name: "Buscar en el manual" }), "group_by");
  expect(within(nav).getAllByRole("link")).toHaveLength(4);
  await user.clear(screen.getByRole("textbox", { name: "Buscar en el manual" }));
  await user.type(screen.getByRole("textbox", { name: "Buscar en el manual" }), "noexistezz");
  expect(within(nav).getByText("Sin resultados")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("0 resultados");
});

it("sincroniza hashes válidos, ignora hashes malformados y enfoca el destino del índice móvil", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/manual#left_join");
  const entries = [{ id: "left_join", title: "Cruce izquierdo", group: "Cruces", keywords: "left" }];
  const view = render(<div id="manual-document"><ManualSidebar entries={entries} /><h2 id="left_join" data-manual-anchor tabIndex={-1}>Cruce</h2></div>);
  expect(screen.getByRole("heading", { name: "Cruce" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Contenido del manual" }));
  const dialog = screen.getByRole("dialog", { name: "Contenido del manual" });
  await user.click(within(dialog).getByRole("link", { name: "Cruce izquierdo" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("heading", { name: "Cruce" })).toHaveFocus());
  window.history.replaceState(null, "", "/manual#%E0%A4");
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  view.unmount();
});

it("distingue ausencia, texto vacío, cero y false en los ejemplos", () => {
  render(<DataDiffTable caption="Valores de ejemplo" data={{ columns: ["valor"], rows: [{ valor: null }, { valor: "" }, { valor: 0 }, { valor: false }] }} />);
  const table = screen.getByRole("table", { name: "Valores de ejemplo" });
  for (const text of ["NULL", '\"\" (texto vacío)', "0", "false"]) expect(within(table).getByRole("cell", { name: text })).toBeVisible();
});
