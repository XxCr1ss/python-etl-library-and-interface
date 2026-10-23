import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import AppLayout from "@/app/(app)/layout";
import ExtractPage from "@/app/(app)/extract/page";
import TransformPage from "@/app/(app)/transform/page";
import { TestChannel } from "./diagram-channel";
import { mockMedia } from "./media";
import { mockDialogMethods } from "./dialog";
import { resetNavigation } from "./navigation";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";

vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
let restoreDialog: () => void;
beforeEach(() => {
  resetNavigation("/extract"); mockMedia(); restoreDialog = mockDialogMethods();
  vi.stubGlobal("BroadcastChannel", TestChannel);
  server.use(http.post(API_URL + "/extract/database", () => HttpResponse.json({ status: "success", message: "OK", tables: ["orders"], schema_preview: { orders: ["id"] } })),
    http.post(API_URL + "/extract/database/preview", () => HttpResponse.json({ status: "success", total_rows: 1, preview_data: [{ id: 42 }] })));
});
afterEach(() => { restoreDialog(); TestChannel.clear(); });
async function configure(agent = false) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: "Base de Datos Relacional" }));
  await user.type(screen.getByLabelText("Base de datos", { exact: true }), "synthetic");
  await user.type(screen.getByLabelText("Usuario", { exact: true }), "tester");
  await user.type(screen.getByLabelText("Contraseña", { exact: true }), "memory-only-secret");
  if (agent) { await user.click(screen.getByLabelText("Usar agente local híbrido")); await screen.findByText("Agente conectado"); }
  await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
  await user.selectOptions(await screen.findByLabelText("Tabla de origen"), "orders");
  await screen.findByRole("cell", { name: "42" });
  return user;
}

it("conserva el formulario y la muestra al cambiar de tipo de origen y volver de Transformación", async () => {
  const view = render(<AppLayout><ExtractPage /></AppLayout>);
  const user = await configure();
  await user.click(screen.getByRole("tab", { name: "Archivo Local" }));
  await user.click(screen.getByRole("tab", { name: "Base de Datos Relacional" }));
  expect(screen.getByLabelText("Tabla de origen")).toHaveValue("orders");
  expect(screen.getByRole("cell", { name: "42" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
  resetNavigation("/transform"); view.rerender(<AppLayout><TransformPage /></AppLayout>);
  expect(await screen.findByRole("link", { name: "Abrir diagrama E-R en otra pestaña" })).toHaveAttribute("aria-disabled", "false");
  resetNavigation("/extract"); view.rerender(<AppLayout><ExtractPage /></AppLayout>);
  expect(screen.getByRole("tab", { name: "Base de Datos Relacional" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("memory-only-secret");
  expect(screen.getByLabelText("Tabla de origen")).toHaveValue("orders");
  expect(screen.getByRole("cell", { name: "42" })).toBeVisible();
  expect(JSON.stringify(sessionStorage)).not.toContain("memory-only-secret");
  expect(JSON.stringify(localStorage)).not.toContain("memory-only-secret");
});

it("verificar un agente al alternar pestañas conserva la conexión y bloquea solo hasta comprobarla", async () => {
  let checking = false, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  server.use(http.get(API_URL + "/extract/agent/status/:id", async ({ params }) => {
    if (checking) await gate;
    return HttpResponse.json({ agent_id: params.id, connected: true, connection_id: "same-agent-connection" });
  }));
  render(<AppLayout><ExtractPage /></AppLayout>); await configure(true);
  checking = true;
  act(() => { hidden.mockReturnValue(true); fireEvent(document, new Event("visibilitychange")); });
  expect(screen.getByLabelText("Tabla de origen")).toHaveValue("orders");
  expect(screen.getByRole("cell", { name: "42" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuar a Transformación" })).toBeDisabled();
  act(() => { hidden.mockReturnValue(false); fireEvent(document, new Event("visibilitychange")); });
  await waitFor(() => expect(release).toBeTypeOf("function"));
  checking = false; await act(async () => release());
  await waitFor(() => expect(screen.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled());
  expect(screen.getByLabelText("Tabla de origen")).toHaveValue("orders");
  expect(screen.getByRole("cell", { name: "42" })).toBeVisible();
});

it("restablecer la sesión descarta el contexto y los secretos de extracción", async () => {
  render(<AppLayout><ExtractPage /></AppLayout>); const user = await configure();
  act(() => window.dispatchEvent(new Event("etl:session-reset")));
  await user.click(screen.getByRole("tab", { name: "Base de Datos Relacional" }));
  expect(screen.getByLabelText("Base de datos", { exact: true })).toHaveValue("");
  expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("");
  expect(screen.queryByLabelText("Tabla de origen")).not.toBeInTheDocument();
});
