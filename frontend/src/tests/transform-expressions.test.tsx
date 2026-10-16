import { expect, it, vi } from "vitest";
import { render, screen, userEvent } from "./render";
import { expressions } from "@/app/(app)/transform/components/step-editor/definitions/expressions";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";
const context = { columns: ["g", "v"] };
it("lote E: promedio/suma/conteo independientes, períodos cero/negativos y fórmulas Python sin eval JS", () => {
  expect(expressions.group_by.toParams(expressions.group_by.fromParams({ by: "g", column: "v" }), context)).toEqual({ by: "g", column: "v" });
  expect(expressions.group_by_sum.toParams(expressions.group_by_sum.fromParams({ by: ["g"], column: "v" }), context)).toEqual({ by: ["g"], column: "v" });
  expect(expressions.group_by_count.toParams(expressions.group_by_count.fromParams({ by: "g" }), context)).toEqual({ by: "g" });
  for (const periods of [0, -1]) { const p = { by: "g", column: "v", new_column_name: "prev", periods }; expect(expressions.group_by_shift.toParams(expressions.group_by_shift.fromParams(p), context)).toEqual(p); }
  for (const raw of ["Infinity", "NaN", "1.5"]) { const d = expressions.group_by_shift.fromParams({ by: "g", column: "v", new_column_name: "prev" }); d.changes.periods = raw; expect(() => expressions.group_by_shift.toParams(d, context)).toThrow(); }
  const expression = "v if v is not None else 0";
  expect(expressions.add_new_column.toParams(expressions.add_new_column.fromParams({ new_column_name: "x", expression }), context)).toEqual({ new_column_name: "x", expression });
  expect(expressions.transform_column.toParams(expressions.transform_column.fromParams({ column: "v", expression: "str(x)" }), context)).toEqual({ column: "v", expression: "str(x)" });
  expect(expressions.filter_by_condition.validate(expressions.filter_by_condition.fromParams({ expression: "" }), context)).toHaveProperty("expression");
});
it("lote E: guardar edición conserva ID y fórmula; cancelar no aplica; colisión visible", async () => {
  const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup();
  render(<StepFormHost definition={expressions.add_new_column} initialParams={{ new_column_name: "double", expression: "v * 2" }} id="expr" context={context} onConfirm={step => save(step)} onCancel={cancel} />);
  await user.clear(screen.getByRole("textbox", { name: "Nueva columna" })); await user.type(screen.getByRole("textbox", { name: "Nueva columna" }), "v");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).not.toHaveBeenCalled();
  await user.clear(screen.getByRole("textbox", { name: "Nueva columna" })); await user.type(screen.getByRole("textbox", { name: "Nueva columna" }), "double");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).toHaveBeenCalledWith({ id: "expr", type: "add_new_column", params: { new_column_name: "double", expression: "v * 2" } });
  save.mockClear(); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(save).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
});
