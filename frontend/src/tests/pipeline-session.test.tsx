import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { SESSION_KEY, persistedSession } from "@/state/pipelineStorage";
import { initialState } from "@/state/pipelineReducer";
import { getAgentIdentity } from "@/state/agentIdentity";
import { CredentialStore } from "@/state/credentialStore";
import { parseTarget } from "@/types/etlValidation";
import { navigation } from "./navigation";
import { mockDialogMethods } from "./dialog";
import { server } from "./mocks/server";
import { API_URL, previewResponse } from "./fixtures/api";
import TransformPage from "@/app/(app)/transform/page";
import LoadPage from "@/app/(app)/load/page";
import AppLayout from "@/app/(app)/layout";

vi.mock("next/navigation", () => navigation);
let restoreDialog: () => void;
beforeEach(() => { restoreDialog = mockDialogMethods(); });
afterEach(() => restoreDialog());
const file = { type: "file", filepath: "/tmp/synthetic.csv" };
const db = { type: "database", db_type: "postgresql", host: "localhost", database: "db", user: "u", table_name: "t", password: "primary-synthetic" };
function Reader({ name }: { name: string }) {
  const { state, isReadyForLoad, canExecuteLoad } = usePipelineSession();
  return <section aria-label={name}>
    <p>{name}: {state.recipe.map(s => s.id).join(",") || "sin pasos"}</p>
    <p>{name} preview: {isReadyForLoad ? "vigente" : "pendiente"}</p>
    <p>{name} carga: {canExecuteLoad ? "habilitada" : "bloqueada"}</p>
    <p>{name} ejecución: {state.execution?.status || "sin intento"}</p>
    <p>{name} valor: {String(state.preview.data?.preview_data[0]?.id ?? "sin filas")}</p>
  </section>;
}
function Controls() {
  const s = usePipelineSession(); const [error, setError] = useState("");
  return <>
    <button onClick={() => s.confirmSource(file)}>Fuente</button>
    <button onClick={() => s.confirmSource({ type: "date_dimension", start_year: 2024, end_year: 2024 })}>Otra fuente</button>
    <button onClick={() => s.addStep({ type: "prefix_header", params: { prefix: "x" } })}>Paso</button>
    <button onClick={() => s.dispatch({ type: "removeStep", id: s.state.recipe[0]?.id })}>Retirar paso</button>
    <button onClick={() => void s.runPreview(10)}>Preview</button>
    <button onClick={() => s.setTarget({ db_type: "oracle", host: "localhost", database: "db", user: "u", password: "", service_name: "svc" })}>Destino vacío explícito</button>
    <button onClick={() => s.recoverCredentials({ [s.state.target!.credentialRef]: "changed" })}>Cambiar contraseña</button>
    <button onClick={() => void s.testTarget().catch(e => setError(e.message))}>Probar destino</button>
    <button onClick={() => s.setLoadConfig({ table_name: "synthetic", table_type: "fact", if_exists: "append", foreign_keys: { id: ["dim", "pk"] } })}>Configurar carga</button>
    <button onClick={() => void s.runLoad().catch(e => setError(e.message))}>Ejecutar</button>
    <button onClick={s.reset}>Limpiar</button>
    <p role="alert">{error}</p>
  </>;
}
const application = (children = <Controls />) => <PipelineProvider>{children}<Reader name="A" /><Reader name="B" /></PipelineProvider>;
const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
async function prepareLoad() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Fuente" }));
  await user.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByText("A preview: vigente");
  await user.click(screen.getByRole("button", { name: "Destino vacío explícito" }));
  await user.click(screen.getByRole("button", { name: "Configurar carga" }));
  await user.click(screen.getByRole("button", { name: "Probar destino" }));
  await screen.findByText("A carga: habilitada");
  return user;
}
describe("shared provider and mounted consumers", () => {
  it("two consumers update together and the real app layout survives child navigation", async () => {
    const view = render(<AppLayout><Controls /><Reader name="A" /><Reader name="B" /></AppLayout>);
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Fuente" })); await user.click(screen.getByRole("button", { name: "Paso" }));
    const id = stored().recipe[0].id;
    expect(screen.getByText(`A: ${id}`)).toBeVisible(); expect(screen.getByText(`B: ${id}`)).toBeVisible();
    view.rerender(<AppLayout><p>Otra ruta</p><Reader name="A" /><Reader name="B" /></AppLayout>);
    expect(screen.getByText(`A: ${id}`)).toBeVisible(); expect(screen.getByText(`B: ${id}`)).toBeVisible();
  });
  it("later preview wins even if the backend responds out of order without abort", async () => {
    const releases: (() => void)[] = []; let count = 0;
    server.use(http.post(`${API_URL}/transform/preview`, async () => {
      const id = ++count; await new Promise<void>(resolve => releases.push(resolve));
      return HttpResponse.json({ ...previewResponse, preview_data: [{ id }] });
    }));
    render(application()); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Fuente" }));
    await user.click(screen.getByRole("button", { name: "Preview" })); await waitFor(() => expect(count).toBe(1));
    await user.click(screen.getByRole("button", { name: "Paso" }));
    await user.click(screen.getByRole("button", { name: "Preview" })); await waitFor(() => expect(count).toBe(2));
    releases[1](); await screen.findByText("A valor: 2"); releases[0]();
    await waitFor(() => expect(screen.getByText("B valor: 2")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "Otra fuente" }));
    expect(screen.getByText("A preview: pendiente")).toBeVisible(); expect(stored().recipe).toEqual([]);
  });
  it("destination test for an old password cannot authorize the current connection", async () => {
    let release!: () => void; let calls = 0;
    server.use(http.post(`${API_URL}/load/test-connection`, async () => { calls++; await new Promise<void>(r => { release = r; }); return HttpResponse.json({ status: "success", message: "OK" }); }));
    render(application()); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Fuente" })); await user.click(screen.getByRole("button", { name: "Preview" })); await screen.findByText("A preview: vigente");
    await user.click(screen.getByRole("button", { name: "Destino vacío explícito" })); await user.click(screen.getByRole("button", { name: "Configurar carga" }));
    await user.click(screen.getByRole("button", { name: "Probar destino" })); await waitFor(() => expect(calls).toBe(1));
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" })); release();
    await waitFor(() => expect(screen.getByText("A carga: bloqueada")).toBeVisible());
    expect(screen.getByText("A preview: vigente")).toBeVisible();
  });
  it("captures a load snapshot, writes running before sending, prevents double execution and blocks edits", async () => {
    let release!: () => void; let attempts = 0; let payload: unknown;
    server.use(http.post(`${API_URL}/load/execute`, async ({ request }) => {
      attempts++; payload = await request.json(); expect(stored().history[0].status).toBe("running");
      await new Promise<void>(r => { release = r; });
      return HttpResponse.json({ status: "success", message: "OK", table_name: "synthetic", table_type: "fact", total_rows: 999, preview_data: [] });
    }));
    render(application()); const user = await prepareLoad();
    await user.click(screen.getByRole("button", { name: "Ejecutar" })); await waitFor(() => expect(attempts).toBe(1));
    await user.click(screen.getByRole("button", { name: "Ejecutar" })); await user.click(screen.getByRole("button", { name: "Otra fuente" }));
    await user.click(screen.getByRole("button", { name: "Paso" })); await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(stored().source).toMatchObject(file); expect(stored().recipe).toEqual([]); expect(screen.getByText("B ejecución: running")).toBeVisible();
    release(); await screen.findByText("B ejecución: success");
    expect(payload).toEqual({ source: file, recipe: [], target_connection: { db_type: "oracle", host: "localhost", database: "db", user: "u", password: "", service_name: "svc" }, load_config: { table_name: "synthetic", table_type: "fact", if_exists: "append", foreign_keys: { id: ["dim", "pk"] } } });
    expect(attempts).toBe(1); expect(stored().history).toHaveLength(1); expect(stored().history[0]).toMatchObject({ total_rows: 999, status: "success" });
    await user.click(screen.getByRole("button", { name: "Limpiar" })); expect(stored().source).toBeNull(); expect(stored().target).toBeNull(); expect(stored().history).toHaveLength(1);
  });
  it("network loss during load is unknown, is never retried and reload keeps the summary", async () => {
    let attempts = 0; server.use(http.post(`${API_URL}/load/execute`, () => { attempts++; return HttpResponse.error(); }));
    const view = render(application()); const user = await prepareLoad(); await user.click(screen.getByRole("button", { name: "Ejecutar" }));
    await screen.findByText(/Resultado de carga desconocido/); expect(attempts).toBe(1); expect(stored().history[0].status).toBe("unknown");
    view.unmount(); render(application()); expect(stored().history[0].status).toBe("unknown"); expect(attempts).toBe(1);
    expect(screen.getByText("A carga: bloqueada")).toBeVisible();
  });
});
describe("credential recovery UI", () => {
  it("a failed preview prevents loading even with a verified destination", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(file));
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ detail: "Receta inválida" }, { status: 400 })));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    await screen.findByText("Receta inválida"); const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("ej. dim_medico o fact_consulta"), "t");
    await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" })); await screen.findByText("Conectado Correctamente");
    expect(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeDisabled();
    expect(stored().history).toEqual([]);
  });
  it("reload asks for primary and secondary secrets, cancellation stays blocked, reentry preserves recipe IDs", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(db));
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "union", params: { secondary_source: { ...db, password: "secondary-synthetic" } } }]));
    const first = render(<PipelineProvider><TransformPage /></PipelineProvider>);
    await screen.findByRole("columnheader", { name: /col_monto/ }); const before = stored(); first.unmount();
    const requests: unknown[] = []; server.use(http.post(`${API_URL}/transform/preview`, async ({ request }) => { requests.push(await request.json()); return HttpResponse.json(previewResponse); }));
    render(<PipelineProvider><TransformPage /></PipelineProvider>); expect(requests).toHaveLength(0);
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Reingresar credenciales" }));
    expect(screen.getByRole("dialog", { name: "Recuperar conexiones" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "true"); expect(requests).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Reingresar credenciales" }));
    await user.type(screen.getByLabelText("Contraseña · Origen principal"), "restored-primary");
    await user.type(screen.getByLabelText("Contraseña · Unión 1"), "restored-secondary");
    await user.click(screen.getByRole("button", { name: "Guardar contraseñas" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ source: { password: "restored-primary" }, steps: [{ type: "union", params: { secondary_source: { password: "restored-secondary" } } }] });
    expect(stored().recipe).toEqual(before.recipe); expect(stored().source).toEqual(before.source); expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("restored-");
  });
  it("destination password is absent after reload, explicit empty recovery allows testing again", async () => {
    const target = parseTarget({ db_type: "oracle", host: "localhost", database: "db", user: "u", service_name: "svc", credentialRef: "target" }, new CredentialStore());
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession({ ...initialState, hydrationStatus: "ready", source: { type: "file", filepath: "a" }, target })));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Reingresar credenciales" }));
    expect(screen.getByLabelText("Contraseña · Destino")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Guardar contraseñas" }));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" })); await screen.findByText("Conectado Correctamente");
    expect(stored().target.credentialRef).toBe("target"); expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("password");
  });
  it("incomplete destination edits stay local and invalidate the tested connection", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(file));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("ej. dim_medico o fact_consulta"), "dim_local");
    await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" })); await screen.findByText("Conectado Correctamente");
    const host = screen.getByDisplayValue("localhost"); await user.clear(host);
    expect(host).toHaveValue(""); expect(stored().target.host).toBe("localhost");
    expect(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    expect(host).toBeInvalid(); // Native required validation stops submission.
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
  });
  it("agent identity survives reset and unavailable local storage is recoverable", async () => {
    localStorage.setItem("etl_agent_id", "agent-existing"); render(application());
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Fuente" })); await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(getAgentIdentity()).toEqual({ id: "agent-existing" });
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("denied"); });
    expect(getAgentIdentity()).toMatchObject({ id: expect.any(String), warning: expect.any(String) });
  });
});
