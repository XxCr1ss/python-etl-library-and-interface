import { expect, it, vi } from "vitest";
import { render, screen, userEvent } from "./render";
import { cleaning } from "@/app/(app)/transform/components/step-editor/definitions/cleaning";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";
const context = { columns: ["a", "b"] };
it("lote B: preserva conversión por mapa, orden, cero, false, texto vacío y opcionales", () => {
  const params = { columns: ["b", "a"], dtype: { a: "int64", b: "str" } };
  expect(cleaning.convert_types.toParams(cleaning.convert_types.fromParams(params), context)).toEqual(params);
  for (const value of [0, false, "", "001", [0, false], { a: 1 }]) expect(cleaning.fill_nulls.toParams(cleaning.fill_nulls.fromParams({ column: "a", value }), context)).toEqual({ column: "a", value });
  expect(cleaning.clean_date_format.toParams(cleaning.clean_date_format.fromParams({ column: "a" }), context)).toEqual({ column: "a" });
  expect(cleaning.convert_to_ordered_category.toParams(cleaning.convert_to_ordered_category.fromParams({ column: "a", categories: [false, 0, "001"], ordered: false }), context)).toEqual({ column: "a", categories: [false, 0, "001"], ordered: false });
  expect(cleaning.clean_numeric_columns.validate(cleaning.clean_numeric_columns.fromParams({ columns: [] }), context)).toHaveProperty("columns");
  expect(cleaning.boolean_to_binary.validate(cleaning.boolean_to_binary.fromParams({ columns: "missing" }), context)).toHaveProperty("columns");
});
it("lote B: editar no reinterpreta 001; reemplazo permite false y nuevo texto vacío", async () => {
  const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup(); const params = { column: "a", old_value: "001", new_value: "" };
  render(<StepFormHost definition={cleaning.replace_values} id="same" initialParams={params} context={context} onConfirm={step => save(step)} onCancel={cancel} />);
  expect(screen.getByRole("textbox", { name: "Valor anterior" })).toHaveValue("001");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).toHaveBeenLastCalledWith({ id: "same", type: "replace_values", params });
  await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de Valor anterior" }), "boolean");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(save).toHaveBeenLastCalledWith({ id: "same", type: "replace_values", params: { ...params, old_value: false } });
  save.mockClear(); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(cancel).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
});
