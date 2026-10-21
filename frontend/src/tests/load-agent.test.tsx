import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import LoadPage from "@/app/(app)/load/page";
import { PipelineProvider } from "@/state/PipelineProvider";
import { SESSION_KEY } from "@/state/pipelineStorage";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { mockDialogMethods } from "./dialog";

let restore: () => void;
let connected: boolean;
let generation: string;
beforeEach(() => {
  restore = mockDialogMethods(); connected = true; generation = "connection-1";
  localStorage.setItem("etl_agent_id", "local-load-agent");
  sessionStorage.setItem("etl_active_source", JSON.stringify({ type: "date_dimension", start_year: 2024, end_year: 2024 }));
  server.use(http.get(`${API_URL}/extract/agent/status/:agentId`, ({ params }) =>
    HttpResponse.json({ agent_id: params.agentId, connected, connection_id: connected ? generation : null })));
});
afterEach(() => restore());
const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
const testButton = () => screen.getByRole("button", { name: "Probar Conexión Bodega" });
const executeButton = () => screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" });
const agentToggle = () => screen.getByRole("checkbox", { name: "Usar agente local híbrido" });

async function configure() {
  const user = userEvent.setup();
  for (const label of ["Host", "Base de datos", "Usuario"]) await user.type(screen.getByLabelText(label), "synthetic");
  await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
  await user.type(screen.getByLabelText("Tabla destino"), "fact_local");
  await user.selectOptions(screen.getByLabelText("Tipo de tabla"), "fact");
  await user.click(agentToggle());
  await screen.findByText("Agente conectado");
  await waitFor(() => expect(testButton()).toBeEnabled());
  return user;
}

describe("Load through the local agent", () => {
  it("advertises local opt-in even on an incomplete form and blocks a disconnected agent", async () => {
    connected = false;
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = userEvent.setup(); await user.click(agentToggle());
    await screen.findByText("Agente desconectado");
    expect(screen.getByText("python etl_agent.py --allow-load")).toBeVisible();
    expect(screen.getByText("local-load-agent")).toBeVisible();
    expect(testButton()).toBeDisabled(); expect(executeButton()).toBeDisabled();
    connected = true;
    await user.click(screen.getByRole("button", { name: "Reintentar estado del agente" }));
    await screen.findByText("Agente conectado");
    expect(testButton()).toBeEnabled();
  });

  it("sends independent destination agent fields, preserves report semantics and stores no password", async () => {
    let tested: unknown; let loaded: unknown; let calls = 0;
    server.use(
      http.post(`${API_URL}/load/test-connection`, async ({ request }) => {
        tested = await request.json(); return HttpResponse.json({ status: "success", message: "OK" });
      }),
      http.post(`${API_URL}/load/execute`, async ({ request }) => {
        calls++; loaded = await request.json();
        return HttpResponse.json({ status: "success", message: "OK", table_name: "fact_local", table_type: "fact", total_rows: 99, preview_data: [{ id: 1 }] });
      }),
    );
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure();
    await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    expect(tested).toMatchObject({ use_agent: true, agent_id: "local-load-agent", password: "" });
    await user.dblClick(executeButton());
    await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(calls).toBe(1);
    expect(loaded).toMatchObject({ source: { type: "date_dimension" }, recipe: [], target_connection: { use_agent: true, agent_id: "local-load-agent" } });
    expect(stored().history[0]).toMatchObject({ status: "success", total_rows: 99 });
    expect(stored().target).toMatchObject({ use_agent: true, agent_id: "local-load-agent" });
    expect(stored().target).not.toHaveProperty("password");
  });

  it("toggling transport invalidates the destination test and a late success cannot restore it", async () => {
    let release!: () => void;
    server.use(http.post(`${API_URL}/load/test-connection`, async () => {
      await new Promise<void>(resolve => { release = resolve; });
      return HttpResponse.json({ status: "success", message: "OK" });
    }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure(); await user.click(testButton());
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await user.click(agentToggle()); await act(async () => release());
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
    expect(executeButton()).toBeDisabled(); expect(stored().target.use_agent).toBe(false);
  });

  it("a reconnection invalidates the test and requires another successful test", async () => {
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure(); await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    expect(executeButton()).toBeEnabled();
    generation = "connection-2";
    await user.click(screen.getByRole("button", { name: "Reintentar estado del agente" }));
    await screen.findByText("Agente conectado");
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
    expect(executeButton()).toBeDisabled();
    await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    expect(executeButton()).toBeEnabled();
  });

  it("restores agent routing after reload but requires credentials and a fresh test", async () => {
    const first = render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure(); await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    first.unmount(); render(<PipelineProvider><LoadPage /></PipelineProvider>);
    await screen.findByText(/filas en el resultado transformado/);
    expect(agentToggle()).toBeChecked(); expect(screen.getByLabelText("Host")).toHaveValue("synthetic");
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" })).toBeVisible();
    expect(executeButton()).toBeDisabled();
  });

  it("a lost write response remains unknown without a retry", async () => {
    let calls = 0;
    server.use(http.post(`${API_URL}/load/execute`, () => { calls++; return HttpResponse.error(); }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure(); await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    await user.click(executeButton()); await screen.findByRole("heading", { name: "Resultado desconocido" });
    expect(calls).toBe(1); expect(stored().history[0].status).toBe("unknown");
    expect(executeButton()).toBeDisabled();
  });

  it("agent presence loss during a write preserves the in-flight attempt and accepts its eventual report", async () => {
    let release!: () => void;
    server.use(http.post(`${API_URL}/load/execute`, async () => {
      await new Promise<void>(resolve => { release = resolve; });
      return HttpResponse.json({ status: "success", message: "OK", table_name: "fact_local", table_type: "fact", total_rows: 1, preview_data: [] });
    }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>);
    const user = await configure(); await user.click(testButton()); await screen.findByText("Conectado Correctamente");
    await user.click(executeButton()); await waitFor(() => expect(release).toBeTypeOf("function"));
    connected = false;
    fireEvent(document, new Event("visibilitychange"));
    await screen.findByText("Agente desconectado");
    expect(screen.getByText(/Ejecutando pipeline · fact_local/)).toBeVisible();
    expect(stored().history).toHaveLength(1); expect(stored().history[0].status).toBe("running");
    await act(async () => release());
    await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" });
    expect(stored().history).toHaveLength(1); expect(stored().history[0].status).toBe("success");
  });
});
