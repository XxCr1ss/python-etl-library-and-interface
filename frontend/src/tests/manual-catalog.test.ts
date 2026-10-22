import { describe, expect, it } from "vitest";
import operations from "../../../backend/tests/fixtures/operations.json";
import catalog from "./fixtures/operations-catalog.json";
import { stepSchemas } from "@/types/etlValidation";
import { stepRegistry } from "@/app/(app)/transform/components/step-editor/StepRegistry";
import { transformations } from "@/features/manual/data/transformationsCatalog";
import { manualSections } from "@/features/manual/data/manualSections";

function columnsToTable(columns: Record<string, unknown[] | undefined>) {
  return { columns: Object.keys(columns), rows: Array.from({ length: Object.values(columns)[0]?.length ?? 0 }, (_, index) => Object.fromEntries(Object.entries(columns).map(([name, values]) => [name, values?.[index]]))) };
}
describe("manual: exactitud y mantenimiento del contenido", () => {
  it("cubre las mismas operaciones que tipos validados, editor y ambos catálogos", () => {
    const names = transformations.map(operation => operation.type).sort();
    expect(new Set(names).size).toBe(names.length);
    for (const keys of [Object.keys(stepRegistry), Object.keys(stepSchemas), catalog.map(operation => operation.type), operations.map(operation => operation.type)]) expect(names).toEqual(keys.sort());
    const ids = [...manualSections.flatMap(section => [section.id, ...section.topics.map(topic => topic.id)]), "catalogo", ...names];
    expect(new Set(ids).size).toBe(ids.length);
    for (const topic of manualSections.flatMap(section => section.topics)) for (const link of topic.links ?? []) if (link.href.startsWith("#")) expect(ids).toContain(link.href.slice(1));
  });
  it.each(transformations)("$type tiene campos, instrucciones y un ejemplo fiel al contrato del motor", operation => {
    const fixture = operations.find(example => example.type === operation.type)!;
    const api = catalog.find(example => example.type === operation.type)!;
    expect(operation.name).toBe(stepRegistry[operation.type].name);
    expect(operation.family).toBe(stepRegistry[operation.type].category);
    expect(operation.description.length).toBeGreaterThan(20);
    expect(operation.instructions.length).toBeGreaterThanOrEqual(3);
    expect(operation.rules.length).toBeGreaterThan(0);
    expect(operation.troubleshooting.length).toBeGreaterThan(20);
    expect(operation.parameters.map(field => field.key).sort()).toEqual(Object.keys(api.params).sort());
    for (const field of operation.parameters) {
      expect(field.type).toBeTruthy(); expect(field.description).toBeTruthy();
      if (!field.required) expect(field.defaultLabel).toBeTruthy();
    }
    expect(operation.example.before).toEqual(columnsToTable(fixture.input));
    expect(operation.example.after).toEqual(columnsToTable(fixture.expected));
    expect(operation.example.params).toEqual(Object.fromEntries(Object.entries(fixture.params).map(([key, value]) => [key, value === "$secondary" ? "Fuente secundaria confirmada" : value])));
    if ("secondary" in fixture && fixture.secondary) expect(operation.example.secondary).toEqual(columnsToTable(fixture.secondary));
  });
});
