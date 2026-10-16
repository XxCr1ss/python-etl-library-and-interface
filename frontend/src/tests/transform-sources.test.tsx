import { expect, it, vi } from "vitest";
import { PipelineProvider } from "@/state/PipelineProvider";
import { CredentialStore } from "@/state/credentialStore";
import { render, screen, userEvent } from "./render";
import { sources } from "@/app/(app)/transform/components/step-editor/definitions/sources";
import { StepFormHost } from "@/app/(app)/transform/components/step-editor/StepFormHost";
import { uploadResponse } from "./fixtures/api";
import { act, renderHook } from "@testing-library/react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { parseSource } from "@/types/etlValidation";
import { stepDto } from "@/services/etlSerializers";

it.each(["left_join", "right_join", "inner_join", "outer_join"] as const)("lote F: editar %s preserva modalidad y claves comunes/diferentes/compuestas", type => {
  const def = sources[type]; const right_source = { type: "file" as const, filepath: "/synthetic/right.csv" };
  for (const on of ["id", ["id", "region"], ["id", "customer_id"]]) {
    const params = { right_source, on }; const context = { columns: ["id", "region"], secondaryColumns: ["id", "region", "customer_id"] };
    expect(def.toStep(def.fromParams(params), context, "join")).toEqual({ id: "join", type, params });
  }
});
it("lote F: upload y confirmación independientes, reemplazo invalida claves; cancelar no emite", async () => {
  const user = userEvent.setup(); const save = vi.fn(); const cancel = vi.fn();
  render(<PipelineProvider><StepFormHost definition={sources.right_join} id="join" context={{ columns: ["id"] }} onConfirm={save} onCancel={cancel} /></PipelineProvider>);
  await user.upload(screen.getByLabelText("Archivo de origen"), new File(["id\n1"], "right.csv", { type: "text/csv" }));
  await user.click(screen.getByRole("button", { name: "Procesar archivo secundario" }));
  await screen.findByText(/Origen procesado/); await user.click(screen.getByRole("button", { name: "Confirmar fuente secundaria" }));
  await user.clear(screen.getByRole("textbox", { name: /Claves de cruce/ }));
  await user.type(screen.getByRole("textbox", { name: /Claves de cruce/ }), '"id"');
  await user.click(screen.getByRole("button", { name: "Aplicar Operación" }));
  expect(save.mock.calls[0][0]).toMatchObject({ id: "join", type: "right_join", params: { on: "id", right_source: { type: "file", filepath: uploadResponse.filepath } } });
  save.mockClear(); await user.click(screen.getByRole("button", { name: "Cambiar fuente secundaria" }));
  expect(screen.getByRole("textbox", { name: /Claves de cruce/ })).toHaveValue('""');
  await user.click(screen.getByRole("button", { name: "Aplicar Operación" })); expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(cancel).toHaveBeenCalledOnce();
});
it("lote F: descriptores BD preservan Oracle/agente sin contraseña en parámetros", () => {
  const secondary_source = { type: "database" as const, db_type: "oracle" as const, host: "localhost", port: 1521, database: "test", table_name: "items", user: "synthetic", credentialRef: "temporary", service_name: "XE", use_agent: true, agent_id: "agent" };
  const d = sources.union.fromParams({ secondary_source });
  expect(sources.union.fields[0].apply(d.base, sources.union.fields[0].format(d.base))).toEqual({ secondary_source });
  expect(sources.union.toParams(d, { columns: [] })).toEqual({ secondary_source });
  expect(JSON.stringify(d)).not.toContain('"password"');
  expect(sources.union.summary({ secondary_source })).toBe("Apilar filas de Tabla · items");
  const store = new CredentialStore(); store.set("temporary", "synthetic-secret"); store.clear(); expect(store.has("temporary")).toBe(false);
});
it("editar y deshacer una BD secundaria transfiere credenciales con la revisión, retirando referencias huérfanas", () => {
  const { result } = renderHook(usePipelineSession, { wrapper: PipelineProvider });
  const connection = { type: "database", db_type: "postgresql", host: "localhost", database: "synthetic", user: "synthetic", table_name: "right" };
  act(() => result.current.addStep({ type: "union", params: { secondary_source: { ...connection, password: "old-synthetic-secret" } } }));
  const oldStep = result.current.state.recipe[0]; if (!("secondary_source" in oldStep.params) || oldStep.params.secondary_source.type !== "database") throw new Error("Expected database source");
  const oldRef = oldStep.params.secondary_source.credentialRef; const oldSecrets = new CredentialStore(); oldSecrets.set(oldRef, result.current.credentials.get(oldRef));
  const temporary = new CredentialStore(); const secondary_source = parseSource({ ...connection, password: "new-synthetic-secret" }, temporary, true);
  const revision = result.current.state.revision;
  act(() => result.current.editStep({ id: oldStep.id, type: "union", params: { secondary_source } }, temporary));
  expect(result.current.state.revision).toBe(revision + 1); expect(result.current.credentials.has(oldRef)).toBe(false);
  expect(stepDto(result.current.state.recipe[0], result.current.credentials).params.secondary_source).toMatchObject({ password: "new-synthetic-secret" });
  act(() => result.current.restoreRecipe([oldStep], oldSecrets));
  expect(result.current.state.recipe[0].id).toBe(oldStep.id); expect(result.current.state.preview.status).toBe("pending");
  expect(stepDto(result.current.state.recipe[0], result.current.credentials).params.secondary_source).toMatchObject({ password: "old-synthetic-secret" });
  expect(JSON.stringify(sessionStorage)).not.toContain("synthetic-secret");
});
