import { expect, it, vi } from "vitest";
import operations from "../../../backend/tests/fixtures/operations.json";
import { parseStep } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
import { render, screen, userEvent } from "./render";
import { getDefinition } from "@/app/(app)/transform/components/step-editor/StepRegistry";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";

it.each(operations)("formulario $type: guardar/cancelar fixture conserva identidad y payload", async operation => {
  const params = Object.fromEntries(Object.entries(operation.params).map(([key, value]) => [key, value === "$secondary" ? { type: "file", filepath: "/synthetic/secondary.csv" } : value]));
  const step = parseStep({ id: "same-id", type: operation.type, params }, new CredentialStore());
  const save = vi.fn(); const cancel = vi.fn(); const user = userEvent.setup();
  render(<StepFormHost definition={getDefinition(step.type)} initialParams={step.params} id={step.id} context={{ columns: Object.keys(operation.input), secondaryColumns: operation.secondary ? Object.keys(operation.secondary) : undefined }} onConfirm={next => save(next)} onCancel={cancel} />);
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(save).toHaveBeenCalledExactlyOnceWith(step);
  save.mockClear(); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(cancel).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
});
