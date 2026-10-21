import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { DiagramCoordinator, useDiagramCoordinator } from "@/features/diagram/DiagramCoordinator";
import { DiagramClient } from "@/features/diagram/client";
import { TestChannel } from "./diagram-channel";
import { graphFixture, diagramConnection } from "./fixtures/diagram";
import { resetNavigation } from "./navigation";
import { mockDialogMethods } from "./dialog";
import { API_URL } from "./fixtures/api";
import { server } from "./mocks/server";
vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
let restore: () => void, url = "", client: DiagramClient | undefined;
beforeEach(() => { resetNavigation("/transform"); vi.stubGlobal("BroadcastChannel", TestChannel); restore = mockDialogMethods(); server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json(graphFixture))); });
afterEach(() => { client?.close(); restore(); TestChannel.clear(); url = ""; });
function Consumer() {
  const session = usePipelineSession(), bridge = useDiagramCoordinator();
  const [mounted, setMounted] = useState(true);
  return <><p>Fuente: {session.state.source?.type === "database" ? session.state.source.table_name : session.state.source?.type ?? "ninguna"}</p><p>Pasos: {session.state.recipe.length}</p>
    <button onClick={() => session.confirmSource({ type: "file", filepath: "/tmp/source.csv" })}>Fuente previa</button>
    <button onClick={() => session.addStep({ type: "prefix_header", params: { prefix: "x" } })}>Agregar paso</button>
    <button onClick={() => { url = bridge!.open(diagramConnection); setMounted(false); }}>Abrir y desmontar formulario</button>
    {mounted && <span>Formulario de conexión</span>}</>;
}
it("keeps connection credentials after the form unmounts and changes source through the real session only after confirmation", async () => {
  const user = userEvent.setup(); render(<PipelineProvider><DiagramCoordinator><Consumer /></DiagramCoordinator></PipelineProvider>);
  await waitFor(() => expect(sessionStorage.getItem("etl_pipeline_session_v1")).not.toBeNull());
  await user.click(screen.getByRole("button", { name: "Fuente previa" })); await user.click(screen.getByRole("button", { name: "Agregar paso" }));
  await user.click(screen.getByRole("button", { name: "Abrir y desmontar formulario" }));
  expect(screen.queryByText("Formulario de conexión")).not.toBeInTheDocument();
  const binding = JSON.parse(decodeURIComponent(url.split("#")[1]));
  await act(async () => { client = new DiagramClient(binding, vi.fn()); });
  await waitFor(() => expect(client!.state.connected).toBe(true)); await act(async () => { await client!.graph(); client!.useTable("child"); });
  await screen.findByRole("dialog", { name: "Usar tabla en Transformación" });
  expect(screen.getByText("Fuente: file")).toBeVisible(); expect(screen.getByText("Pasos: 1")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Cancelar selección" }));
  expect(screen.getByText("Pasos: 1")).toBeVisible();
  await waitFor(() => expect(client!.state.selection?.status).toBe("cancelled"));
  await act(async () => { client!.useTable("child"); }); await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Confirmar tabla" }));
  expect(screen.getByText("Fuente: orders")).toBeVisible(); expect(screen.getByText("Pasos: 0")).toBeVisible();
  expect(sessionStorage.getItem("etl_pipeline_session_v1")).not.toContain(diagramConnection.password);
  expect(JSON.stringify(TestChannel.messages)).not.toContain(diagramConnection.password);
});
