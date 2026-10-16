import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import LoadPage from "@/app/(app)/load/page";
import { PipelineProvider } from "@/state/PipelineProvider";
import { SESSION_KEY } from "@/state/pipelineStorage";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { mockDialogMethods } from "./dialog";

let restore: () => void;
beforeEach(() => { restore = mockDialogMethods(); sessionStorage.setItem("etl_active_source", JSON.stringify({ type: "date_dimension", start_year: 2024, end_year: 2024 })); });
afterEach(() => restore());
const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
async function prepare(oracle = false) {
  render(<PipelineProvider><LoadPage /></PipelineProvider>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Host"), "synthetic");
  await user.type(screen.getByLabelText("Base de datos"), "warehouse");
  await user.type(screen.getByLabelText("Usuario"), "etl");
  await user.type(screen.getByLabelText("Tabla destino"), "fact_sales");
  await user.selectOptions(screen.getByLabelText("Tipo de tabla"), "fact");
  if (oracle) {
    await user.selectOptions(screen.getByLabelText("Motor de base de datos"), "oracle");
    await user.type(screen.getByLabelText("Service name (Oracle)"), "svc");
  }
  await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
  await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
  await screen.findByText("Conectado Correctamente");
  expect(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeEnabled();
  return user;
}

describe("destination configuration version and validation", () => {
  it.each(["Host", "Puerto", "Base de datos", "Usuario", "Contraseña", "Service name (Oracle)", "Motor de base de datos"])("editing %s invalidates a successful test", async label => {
    const user = await prepare(true);
    if (label === "Motor de base de datos") await user.selectOptions(screen.getByLabelText(label), "mysql");
    else await user.type(screen.getByLabelText(label), "9");
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeDisabled();
    expect(stored().target).not.toHaveProperty("password");
  });
  it("late success and late failure cannot change a newer test, even when transport finishes", async () => {
    const user = await prepare(); let release!: () => void; let calls = 0;
    server.use(http.post(`${API_URL}/load/test-connection`, async () => {
      calls++; if (calls === 1) await new Promise<void>(r => { release = r; });
      return HttpResponse.json({ status: "success", message: "OK" });
    }));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    await waitFor(() => expect(calls).toBe(1));
    await user.type(screen.getByLabelText("Host"), "_new");
    await act(async () => release());
    expect(screen.queryByText("Conectado Correctamente")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    await screen.findByText("Conectado Correctamente"); expect(calls).toBe(2);
    server.use(http.post(`${API_URL}/load/test-connection`, () => HttpResponse.json({ detail: "Destino desconectado" }, { status: 400 })));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    await screen.findByText("Destino desconectado");
    expect(screen.getByLabelText("Host")).toHaveValue("synthetic_new");
    expect(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" })).toBeDisabled();
  });
  it("missing fields/password and invalid ports prevent requests without inventing defaults", async () => {
    let calls = 0;
    server.use(http.post(`${API_URL}/load/test-connection`, () => { calls++; return HttpResponse.json({ status: "success", message: "OK" }); }));
    render(<PipelineProvider><LoadPage /></PipelineProvider>); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    expect(screen.getAllByText("Este campo es obligatorio.")).toHaveLength(3);
    expect(screen.getByText("Ingresa la contraseña o confirma que es vacía.")).toBeVisible(); expect(calls).toBe(0);
    for (const label of ["Host", "Base de datos", "Usuario"]) await user.type(screen.getByLabelText(label), "test");
    await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
    await user.clear(screen.getByLabelText("Puerto")); await user.type(screen.getByLabelText("Puerto"), "1.5");
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    expect(screen.getByText(/Usa un puerto entero/)).toBeVisible(); expect(calls).toBe(0);
    await user.clear(screen.getByLabelText("Puerto"));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    await screen.findByText("Conectado Correctamente"); expect(stored().target.port).toBeNull();
    expect(screen.queryByLabelText(/agente/i)).not.toBeInTheDocument();
  });
});
