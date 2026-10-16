import { expect, it, vi } from "vitest";
import { render, screen, userEvent } from "./render";
import { lists } from "@/app/(app)/transform/components/step-editor/definitions/lists";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";
const context = { columns: ["a", "b"] };
it("lote D: conserva opcionales ausentes/null/false, identidades y orden", () => {
  expect(lists.split_column.toParams(lists.split_column.fromParams({ column: "a", delimiter: ";" }), context)).toEqual({ column: "a", delimiter: ";" });
  expect(lists.normalize_delimited_column.toParams(lists.normalize_delimited_column.fromParams({ column: "a", keep_original: false }), context)).toEqual({ column: "a", keep_original: false });
  expect(lists.convert_column_to_list.toParams(lists.convert_column_to_list.fromParams({ column: "a", new_column: null }), context)).toEqual({ column: "a", new_column: null });
  expect(lists.explode_column_list.toParams(lists.explode_column_list.fromParams({ column: "a" }), context)).toEqual({ column: "a" });
  expect(lists.split_column_into_rows.toParams(lists.split_column_into_rows.fromParams({ column: "a", delimiter: ";", drop_original: false }), context)).toEqual({ column: "a", delimiter: ";", drop_original: false });
  expect(lists.sort_columns.toParams(lists.sort_columns.fromParams({ columns: ["b", "a"], ascending: false }), context)).toEqual({ columns: ["b", "a"], ascending: false });
  expect(lists.sort_by.toParams(lists.sort_by.fromParams({ columns: "a" }), context)).toEqual({ columns: "a" });
  for (const params of [{}, { subset: null }, { subset: "a" }]) expect(lists.drop_duplicates.toParams(lists.drop_duplicates.fromParams(params), context)).toEqual(params);
});
it("lote D: selección ordenada, edición con ID y cancelación; dependencias inválidas visibles", async () => {
  const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup();
  render(<StepFormHost definition={lists.sort_by} initialParams={{ columns: ["b", "a"], ascending: false }} id="sort" context={context} onConfirm={step => save(step)} onCancel={cancel} />);
  await user.click(screen.getByRole("button", { name: "Subir a en Columnas" }));
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).toHaveBeenCalledWith({ id: "sort", type: "sort_by", params: { columns: ["a", "b"], ascending: false } });
  save.mockClear(); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(save).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
  expect(lists.split_column.validate(lists.split_column.fromParams({ column: "a", delimiter: ";", new_columns: ["a"] }), context)).toHaveProperty("new_columns");
});
