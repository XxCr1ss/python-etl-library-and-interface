import { expect, it, vi } from "vitest";
import { render, screen, userEvent } from "./render";
import { filters } from "@/app/(app)/transform/components/step-editor/definitions/filters";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";
const context = { columns: ["a"] };
it("lote C: conserva tipos y opcionales, no evalúa regex Python ni acepta números no finitos", () => {
  for (const value of ["001", 0, false, ""]) expect(filters.filter_value.toParams(filters.filter_value.fromParams({ column: "a", value }), context)).toEqual({ column: "a", value });
  const list = { column: "a", values: ["001", 0, false, ""], complement: false };
  expect(filters.filter_in_list.toParams(filters.filter_in_list.fromParams(list), context)).toEqual(list);
  expect(filters.search_in_table.toParams(filters.search_in_table.fromParams({ pattern: "(?P<name>python)" }), context)).toEqual({ pattern: "(?P<name>python)" });
  expect(filters.search_in_column.validate(filters.search_in_column.fromParams({ column: "a", pattern: "" }), context)).toHaveProperty("pattern");
  expect(filters.filter_in_range.validate(filters.filter_in_range.fromParams({ column: "a", min_value: 2, max_value: 0 }), context)).toHaveProperty("max_value");
  for (const raw of ["[NaN]", "[-1]", "[1.5]", "[]"]) { const d = filters.filter_by_list_length.fromParams({ column: "a", length: [0] }); d.changes.length = raw; expect(() => filters.filter_by_list_length.toParams(d, context)).toThrow(); }
  expect(filters.filter_is_null.toParams(filters.filter_is_null.fromParams({ column: "a" }), context)).toEqual({ column: "a" });
  expect(filters.select_not_none.toParams(filters.select_not_none.fromParams({ column: "a", complement: false }), context)).toEqual({ column: "a", complement: false });
});
it("lote C: agregar/editar/cancelar un filtro mantiene 0 y el ID", async () => {
  const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup();
  render(<StepFormHost definition={filters.filter_value} initialParams={{ column: "a", value: 0 }} id="filter" context={context} onConfirm={step => save(step)} onCancel={cancel} />);
  expect(screen.getByRole("combobox", { name: "Tipo de Valor" })).toHaveValue("number");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).toHaveBeenCalledWith({ id: "filter", type: "filter_value", params: { column: "a", value: 0 } });
  await user.type(screen.getByRole("textbox", { name: "Valor" }), "Infinity"); save.mockClear();
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(cancel).toHaveBeenCalledOnce();
});
