import { expect, it } from "vitest";
import operations from "../../../backend/tests/fixtures/operations.json";
import catalog from "./fixtures/operations-catalog.json";
import { stepSchemas, parseStep } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
import { getDefinition, stepRegistry } from "@/app/(app)/transform/components/step-editor/StepRegistry";

it("registry cubre exactamente StepType, catálogo y los 42 fixtures de 01A", () => {
  const names = Object.keys(stepRegistry).sort();
  expect(names).toHaveLength(42); expect(names).toEqual(Object.keys(stepSchemas).sort());
  expect(names).toEqual(catalog.map(op => op.type).sort()); expect(names).toEqual(operations.map(op => op.type).sort());
});
it.each(operations)("$type: fromParams → toParams, validación y payload sin pérdida", operation => {
  const params = Object.fromEntries(Object.entries(operation.params).map(([key, value]) => [key, value === "$secondary" ? { type: "file", filepath: "/synthetic/secondary.csv" } : value]));
  const step = parseStep({ id: "fixture", type: operation.type, params }, new CredentialStore());
  const definition = getDefinition(step.type);
  const context = { columns: Object.keys(operation.input), secondaryColumns: operation.secondary ? Object.keys(operation.secondary) : undefined };
  const draft = definition.fromParams(step.params);
  expect(definition.validate(draft, context)).toEqual({});
  expect(definition.toParams(draft, context)).toEqual(step.params);
  expect(definition.toStep(draft, context, step.id)).toEqual(step);
  expect(definition.summary(step.params).trim().length).toBeGreaterThan(0);
  const invalid = definition.fromParams(step.params);
  const field = definition.fields[0]; invalid.changes[field.key] = step.type === "add_sequential_index" ? "a" : field.kind === "value" || field.kind === "json" || field.kind === "source" || field.kind === "map" || field.kind === "columns" ? "{invalid" : "";
  expect(Object.keys(definition.validate(invalid, context)).length).toBeGreaterThan(0);
});
