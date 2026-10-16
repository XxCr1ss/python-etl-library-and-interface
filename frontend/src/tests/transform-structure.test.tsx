import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "./render";
import { structure } from "@/app/(app)/transform/components/step-editor/definitions/structure";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";

const context = { columns: ["a", "b"] };
describe("Fase 05 · lote A", () => {
  it("conserva renombres múltiples, orden de selección, ceros y opcionales al editar", () => {
    expect(structure.rename_columns.toParams(structure.rename_columns.fromParams({ columns: { a: "x", b: "y" } }), context)).toEqual({ columns: { a: "x", b: "y" } });
    expect(structure.select_columns.toParams(structure.select_columns.fromParams({ columns: ["b", "a"] }), context)).toEqual({ columns: ["b", "a"] });
    expect(structure.remove_columns.toParams(structure.remove_columns.fromParams({ columns: "b" }), context)).toEqual({ columns: "b" });
    expect(structure.add_sequential_index.toParams(structure.add_sequential_index.fromParams({ column_name: "idx", start: 0 }), context)).toEqual({ column_name: "idx", start: 0 });
    expect(structure.add_sequential_index.toParams(structure.add_sequential_index.fromParams({}), context)).toEqual({});
    for (const raw of ["NaN", "Infinity", "1.2"]) {
      const draft = structure.add_sequential_index.createDraft(); draft.changes.start = raw;
      expect(() => structure.add_sequential_index.toParams(draft, context)).toThrow();
    }
  });
  it("rechaza colisiones, nombres vacíos, referencias inexistentes y cantidad incorrecta", () => {
    expect(structure.rename_columns.validate(structure.rename_columns.fromParams({ columns: { a: "b" } }), context)).toHaveProperty("columns");
    expect(structure.select_columns.validate(structure.select_columns.fromParams({ columns: [] }), context)).toHaveProperty("columns");
    expect(structure.remove_columns.validate(structure.remove_columns.fromParams({ columns: "ausente" }), context)).toHaveProperty("columns");
    expect(structure.replace_all_headers.validate(structure.replace_all_headers.fromParams({ new_headers: ["x"] }), context)).toHaveProperty("new_headers");
    expect(structure.prefix_header.validate(structure.prefix_header.fromParams({ prefix: "" }), context)).toHaveProperty("prefix");
    expect(structure.suffix_header.validate(structure.suffix_header.fromParams({ suffix: "" }), context)).toHaveProperty("suffix");
  });
  it("agrega un renombre y conserva ID al editar; cancelar no emite cambios", async () => {
    const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup();
    const view = render(<StepFormHost definition={structure.rename_columns} id="stable" context={context} onConfirm={step => save(step)} onCancel={cancel} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Columna Original" }), "a");
    await user.type(screen.getByRole("textbox", { name: "Nuevo Nombre" }), "x");
    await user.click(screen.getByRole("button", { name: "Aplicar Operación" }));
    expect(save).toHaveBeenCalledWith({ id: "stable", type: "rename_columns", params: { columns: { a: "x" } } });
    view.unmount(); save.mockClear();
    const initial = { columns: { a: "x" } };
    render(<StepFormHost definition={structure.rename_columns} id="stable" initialParams={initial} context={context} onConfirm={step => save(step)} onCancel={cancel} />);
    await user.type(screen.getByRole("textbox", { name: "Nuevo Nombre" }), "y");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(save).not.toHaveBeenCalled(); expect(initial).toEqual({ columns: { a: "x" } });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(save).toHaveBeenCalledWith({ id: "stable", type: "rename_columns", params: { columns: { a: "xy" } } });
  });
});
