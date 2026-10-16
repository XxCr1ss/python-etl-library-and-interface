import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import LoadPage from "@/app/(app)/load/page";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { persistedSession, SESSION_KEY } from "@/state/pipelineStorage";
import { initialState } from "@/state/pipelineReducer";
import { server } from "./mocks/server";
import { API_URL, previewResponse } from "./fixtures/api";
import { mockDialogMethods } from "./dialog";

let restore: () => void;
const source = { type: "date_dimension" as const, start_year: 2024, end_year: 2024 };
const target = { db_type: "oracle" as const, host: "synthetic", database: "warehouse", user: "etl", port: 1521, service_name: "svc", credentialRef: "target" };
const response = { status: "success", message: "Carga sintética", table_name: "fact_sales", table_type: "fact", total_rows: 999, preview_data: [{ id: 0, value: false, empty: "", missing: null, nested: [1, 2] }] };
const execute = () => screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" });
const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
beforeEach(() => {
  restore = mockDialogMethods();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession({ ...initialState, hydrationStatus: "ready", source, target,
    loadConfig: { table_name: "fact_sales", table_type: "fact", if_exists: "append" } })));
});
afterEach(() => restore());
async function connect(expectReady = true) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
  await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
  await screen.findByText("Conectado Correctamente"); if (expectReady) await waitFor(() => expect(execute()).toBeEnabled());
  return user;
}
function ExternalChanges() {
  const session = usePipelineSession();
  return <>
    <button onClick={() => session.addStep({ type: "rename_columns", params: { columns: { id: "renamed" } } })}>Renombrar externamente</button>
    <button onClick={() => session.setLoadConfig({ ...session.state.loadConfig, table_name: "changed" })}>Cambiar tabla externamente</button>
    <button onClick={() => session.setTarget({ ...target, password: "", host: "changed" })}>Cambiar destino externamente</button>
    <button onClick={session.reset}>Reiniciar externamente</button>
    <p>Historial: {session.state.history.length}</p>
  </>;
}

describe("load validation, snapshots and foreign keys", () => {
  it("direct load in StrictMode validates the current source with a valid empty recipe and Oracle payload", async () => {
    let payload: unknown;
    server.use(http.post(`${API_URL}/load/execute`, async ({ request }) => { payload = await request.json(); return HttpResponse.json(response); }));
    render(<StrictMode><PipelineProvider><LoadPage /></PipelineProvider></StrictMode>); const user = await connect();
    await user.dblClick(execute()); await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(payload).toEqual({ source, recipe: [], target_connection: { db_type: "oracle", host: "synthetic", port: 1521, database: "warehouse", user: "etl", password: "", service_name: "svc" }, load_config: { table_name: "fact_sales", table_type: "fact", if_exists: "append" } });
    expect(stored().history).toHaveLength(1); expect(stored().history[0]).toMatchObject({ status: "success", total_rows: 999, if_exists: "append", reportVersion: 1 });
    expect(screen.getByText("Total de filas en la tabla destino")).toBeVisible();
    expect(screen.getByText("Muestra de la tabla destino")).toBeVisible();
    for (const value of ["0", "false", "Texto vacío", "NULL", "[1,2]"]) expect(screen.getByRole("cell", { name: value })).toBeVisible();
    expect(screen.queryByText(/filas insertadas|filas\/s|execution_time_seconds/i)).not.toBeInTheDocument();
  });
  it("FK incomplete/duplicate/missing columns block loading, survive schema edits and serialize exact pairs", async () => {
    let payload: unknown;
    server.use(http.post(`${API_URL}/load/execute`, async ({ request }) => { payload = await request.json(); return HttpResponse.json(response); }));
    render(<PipelineProvider><ExternalChanges /><LoadPage /></PipelineProvider>); const user = await connect();
    await user.click(screen.getByRole("button", { name: "Agregar FK" })); expect(execute()).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Columna origen FK 1"), "id");
    await user.type(screen.getByLabelText("Tabla dimensión FK 1"), "dim_customer");
    await user.type(screen.getByLabelText("PK destino FK 1"), "pk"); expect(execute()).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Agregar FK" }));
    await user.selectOptions(screen.getByLabelText("Columna origen FK 2"), "id");
    await user.type(screen.getByLabelText("Tabla dimensión FK 2"), "dim_other");
    await user.type(screen.getByLabelText("PK destino FK 2"), "pk");
    expect(screen.getAllByText("La columna origen está repetida.")).toHaveLength(2); expect(execute()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Eliminar FK 2" }));
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ ...previewResponse, columns: ["renamed"], dtypes: { renamed: "int64" } })));
    await user.click(screen.getByRole("button", { name: "Renombrar externamente" }));
    await screen.findByText(/La columna ya no existe/); expect(execute()).toBeDisabled();
    expect(screen.getByLabelText("Tabla dimensión FK 1")).toHaveValue("dim_customer");
    await user.selectOptions(screen.getByLabelText("Columna origen FK 1"), "renamed");
    await user.click(execute()); await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(payload).toMatchObject({ load_config: { foreign_keys: { renamed: ["dim_customer", "pk"] } } });
    expect(JSON.stringify(payload)).not.toContain('"restored-');
    await user.click(screen.getByRole("button", { name: "Nueva carga" }));
    expect(stored().recipe).toHaveLength(1); expect(stored().history).toHaveLength(1);
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" })).toBeVisible();
    expect(screen.getByLabelText("Tabla destino")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Tipo de tabla"), "fact");
    expect(screen.queryByLabelText("Columna origen FK 1")).not.toBeInTheDocument();
  });
  it("changing fact to dimension removes FK rows and uses replace, zero rows need a concrete confirmation", async () => {
    let payload: unknown; let calls = 0;
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ ...previewResponse, total_rows: 0, preview_data: [] })),
      http.post(`${API_URL}/load/execute`, async ({ request }) => { calls++; payload = await request.json(); return HttpResponse.json({ ...response, table_type: "dimension", total_rows: 0, preview_data: [] }); }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect();
    await user.click(screen.getByRole("button", { name: "Agregar FK" }));
    await user.selectOptions(screen.getByLabelText("Tipo de tabla"), "dimension");
    expect(screen.queryByLabelText("Columna origen FK 1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Modo de carga")).toHaveValue("replace");
    await user.click(execute());
    const dialog = screen.getByRole("dialog", { name: "Confirmar reemplazo de tabla" });
    expect(within(dialog).getByText("fact_sales")).toBeVisible(); expect(within(dialog).getByText(/warehouse · synthetic:1521 · oracle · svc/)).toBeVisible();
    expect(within(dialog).getByText(/0 filas.*vaciar/)).toBeVisible(); expect(calls).toBe(0);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" })); expect(calls).toBe(0);
    await user.click(execute()); await user.click(screen.getByRole("button", { name: "Confirmar reemplazo" }));
    await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(payload).toMatchObject({ load_config: { table_type: "dimension", if_exists: "replace" } });
    expect(JSON.stringify(payload)).not.toContain("foreign_keys"); expect(calls).toBe(1);
  });
  it.each(["", " t", "schema.table", "t ", '"Table"'])("table %j is rejected before sending", async table => {
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect();
    await user.clear(screen.getByLabelText("Tabla destino")); if (table) await user.type(screen.getByLabelText("Tabla destino"), table);
    expect(execute()).toBeDisabled(); expect(stored().history).toEqual([]);
  });
  it.each(["Cambiar tabla externamente", "Renombrar externamente", "Cambiar destino externamente"])("confirmation revalidates after %s", async action => {
    let calls = 0; server.use(http.post(`${API_URL}/load/execute`, () => { calls++; return HttpResponse.json(response); }));
    render(<PipelineProvider><ExternalChanges /><LoadPage /></PipelineProvider>); const user = await connect();
    await user.selectOptions(screen.getByLabelText("Modo de carga"), "replace"); await user.click(execute());
    fireEvent.click(screen.getByRole("button", { name: action }));
    await user.click(screen.getByRole("button", { name: "Confirmar reemplazo" }));
    expect(calls).toBe(0); expect(stored().history).toEqual([]);
    expect(screen.getByText(/configuración cambió|Revisa fuente/)).toBeVisible();
  });
});

describe("outcomes, navigation and reload without automatic retries", () => {
  it.each([
    [422, "error"], [400, "unknown"], [500, "unknown"], [401, "unknown"],
    [200, "unknown"], [0, "unknown"],
  ])("HTTP/network %s becomes %s and requires explicit action", async (status, expected) => {
    let calls = 0;
    server.use(http.post(`${API_URL}/load/execute`, () => {
      calls++; if (!status) return HttpResponse.error();
      if (status === 200) return new HttpResponse("<html>invalid response</html>", { status: 200 });
      return HttpResponse.json({ detail: "Mensaje público" }, { status: Number(status) });
    }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect(); await user.click(execute());
    await screen.findByRole("heading", { name: expected === "error" ? "Solicitud rechazada (422)" : "Resultado desconocido" });
    expect(stored().history).toHaveLength(1); expect(stored().history[0].status).toBe(expected); expect(calls).toBe(1);
    if (expected === "unknown") {
      expect(screen.getByText("No se pudo confirmar el resultado; revisa la tabla destino antes de repetir")).toBeVisible();
      expect(execute()).toBeDisabled();
      await user.click(screen.getByRole("checkbox", { name: /He revisado la tabla destino/ })); expect(execute()).toBeEnabled();
    }
    expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("Mensaje público");
  });
  it("in-flight navigation preserves the attempt, locks edits/reset, warns beforeunload and reports once on return", async () => {
    let release!: () => void; let calls = 0;
    server.use(http.post(`${API_URL}/load/execute`, async () => { calls++; await new Promise<void>(r => { release = r; }); return HttpResponse.json(response); }));
    function Routes() {
      const [away, setAway] = useState(false);
      return <><button onClick={() => setAway(!away)}>Navegar</button><ExternalChanges />{away ? <p>Otra ruta</p> : <LoadPage />}</>;
    }
    render(<PipelineProvider><Routes /></PipelineProvider>); const user = await connect();
    await user.dblClick(execute()); await waitFor(() => expect(calls).toBe(1));
    expect(screen.getByLabelText("Tabla destino")).toBeDisabled();
    const exit = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(exit); expect(exit.defaultPrevented).toBe(true);
    await user.click(screen.getByRole("button", { name: "Navegar" }));
    expect(screen.getByText(/Ejecutando pipeline · fact_sales/)).toBeVisible();
    for (const name of ["Cambiar tabla externamente", "Renombrar externamente", "Cambiar destino externamente", "Reiniciar externamente"]) await user.click(screen.getByRole("button", { name }));
    expect(stored().recipe).toEqual([]); expect(stored().loadConfig.table_name).toBe("fact_sales");
    await act(async () => release()); await waitFor(() => expect(stored().history[0].status).toBe("success"));
    await user.click(screen.getByRole("button", { name: "Navegar" }));
    await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" }); expect(calls).toBe(1);
    const after = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(after); expect(after.defaultPrevented).toBe(false);
    expect(screen.getByText("Historial: 1")).toBeVisible();
  });
  it("a valid response for a different table is unknown; explicit reviewed retry creates one new attempt", async () => {
    let calls = 0;
    server.use(http.post(`${API_URL}/load/execute`, () => { calls++; return HttpResponse.json(calls === 1 ? { ...response, table_name: "wrong_table" } : response); }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect();
    await user.click(execute()); await screen.findByRole("heading", { name: "Resultado desconocido" });
    expect(calls).toBe(1); expect(execute()).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /He revisado la tabla destino/ }));
    await user.selectOptions(screen.getByLabelText("Modo de carga"), "replace");
    expect(screen.getByRole("checkbox", { name: /He revisado la tabla destino/ })).not.toBeChecked();
    await user.selectOptions(screen.getByLabelText("Modo de carga"), "append");
    await user.click(screen.getByRole("checkbox", { name: /He revisado la tabla destino/ }));
    await user.click(execute()); await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(calls).toBe(2); expect(stored().history.map((r: { status: string }) => r.status)).toEqual(["unknown", "success"]);
    expect(new Set(stored().history.map((r: { id: string }) => r.id)).size).toBe(2);
  });
  it("restored pending attempt becomes unknown, preview revalidates, connection is untested and no load is resent", async () => {
    const data = stored(); data.history = [{ id: "pending", revision: 0, startedAt: new Date().toISOString(), status: "running", table_name: "fact_sales", table_type: "fact", if_exists: "append" }];
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); let calls = 0;
    server.use(http.post(`${API_URL}/load/execute`, () => { calls++; return HttpResponse.json(response); }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    await screen.findByText("Resultado desconocido"); expect(stored().history[0].status).toBe("unknown"); expect(calls).toBe(0);
    expect(execute()).toBeDisabled(); expect(screen.getByText("Conexión pendiente de prueba")).toBeVisible();
  });
  it.each(["AbortError", "TimeoutError"])("a transport %s leaves unknown without retry", async name => {
    const realFetch = globalThis.fetch; let attempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      if (String(input).endsWith("/load/execute")) { attempts++; throw new DOMException("Transport interrupted", name); }
      return realFetch(input, options);
    });
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect();
    await user.click(execute()); await screen.findByRole("heading", { name: "Resultado desconocido" });
    expect(attempts).toBe(1); expect(stored().history[0].status).toBe("unknown"); expect(execute()).toBeDisabled();
  });
  it("reload preserves incomplete and duplicate FK drafts instead of silently discarding them", async () => {
    const first = render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = await connect();
    for (let i = 1; i <= 2; i++) {
      await user.click(screen.getByRole("button", { name: "Agregar FK" }));
      await user.selectOptions(screen.getByLabelText(`Columna origen FK ${i}`), "id");
    }
    first.unmount(); render(<PipelineProvider><LoadPage /></PipelineProvider>);
    expect(screen.getByLabelText("Columna origen FK 1")).toHaveValue("id");
    expect(screen.getByLabelText("Columna origen FK 2")).toHaveValue("id");
    expect(screen.getAllByText("Completa columna, tabla dimensión y PK destino.")).toHaveLength(2);
    const secondUser = await connect(false); expect(execute()).toBeDisabled();
    await secondUser.click(screen.getByRole("button", { name: "Eliminar FK 2" })); expect(execute()).toBeDisabled();
  });
  it("Transform's successful preview is reused on entering Load", async () => {
    let calls = 0; server.use(http.post(`${API_URL}/transform/preview`, () => { calls++; return HttpResponse.json(previewResponse); }));
    function Routes() {
      const s = usePipelineSession(); const [load, setLoad] = useState(false);
      return load ? <LoadPage /> : <><button onClick={() => void s.runPreview(10)}>Preview en Transform</button><button onClick={() => setLoad(true)}>Ir a Load</button><p>{s.isReadyForLoad ? "Vigente" : "Pendiente"}</p></>;
    }
    render(<PipelineProvider><Routes /></PipelineProvider>); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Preview en Transform" })); await screen.findByText("Vigente");
    await user.click(screen.getByRole("button", { name: "Ir a Load" })); await screen.findByText(/filas en el resultado transformado/); expect(calls).toBe(1);
  });
});
