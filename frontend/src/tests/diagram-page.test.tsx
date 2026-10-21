import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import DiagramPage from "@/features/diagram/DiagramPage";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { DiagramOwner } from "@/features/diagram/coordinator";
import type { SchemaGraph } from "@/types/diagram";
import { TestChannel } from "./diagram-channel";
import { mockMedia } from "./media";
import { diagramConnection, graphFixture, sampleFixture } from "./fixtures/diagram";
import { API_URL } from "./fixtures/api";
import { server } from "./mocks/server";
vi.mock("next/dynamic", () => ({ default: () => function Canvas({ graph, onSelect }: { graph: SchemaGraph; onSelect: (id: string) => void }) {
  return <div>{graph.nodes.map(n => <button key={n.id} onClick={() => onSelect(n.id)}>Seleccionar {n.table_name}</button>)}</div>;
} }));
let owner: DiagramOwner;
beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", TestChannel);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  mockMedia();
  owner = new DiagramOwner(() => ({ route: "/extract", revision: 0, available: true, reason: "", stamp: "initial", sourceMatches: () => false }), vi.fn(), vi.fn());
  history.replaceState(null, "", owner.open(diagramConnection));
  server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json(graphFixture)),
    http.post(API_URL + "/extract/database/preview", () => HttpResponse.json(sampleFixture)));
});
afterEach(() => { owner.invalidate(); TestChannel.clear(); history.replaceState(null, "", "/"); });
const mount = () => render(<ThemeProvider><DiagramPage /></ThemeProvider>);
describe("diagram page with a real tab bridge", () => {
  it("loads, inspects a table, caches it and keeps a binding for reload without credentials", async () => {
    const user = userEvent.setup(), preview = vi.fn();
    server.use(http.post(API_URL + "/extract/database/preview", () => { preview(); return HttpResponse.json(sampleFixture); }));
    const view = mount(); await screen.findByRole("button", { name: "Seleccionar orders" });
    expect(location.hash).toBe("");
    expect(sessionStorage.getItem("etl_diagram_binding_v1")).not.toContain(diagramConnection.password);
    await user.click(screen.getByRole("button", { name: "Seleccionar orders" }));
    await screen.findByRole("cell", { name: "0" });
    expect(screen.getByRole("button", { name: /Usar como origen/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cerrar datos de la tabla" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar orders" })); await screen.findByRole("cell", { name: "0" });
    expect(preview).toHaveBeenCalledOnce();
    view.unmount(); mount();
    await screen.findByRole("button", { name: "Seleccionar orders" });
    expect(screen.getByRole("heading", { name: "Diagrama entidad-relación" })).toBeVisible();
  });
  it("retains B when A finishes later and exposes partial metadata in text", async () => {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let sawParent = false;
    server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json({ ...graphFixture, warnings: [{ code: "partial", message: "Restricción sin permisos" }] })),
      http.post(API_URL + "/extract/database/preview", async ({ request }) => {
        const body = await request.json() as { table_name: string };
        if (body.table_name === "customers") { sawParent = true; await gate; return HttpResponse.json({ ...sampleFixture, table_name: "customers", preview_data: [{ id: 999, customer_id: 8 }] }); }
        return HttpResponse.json(sampleFixture);
      }));
    const user = userEvent.setup(); mount(); await screen.findByRole("button", { name: "Seleccionar customers" });
    await user.click(screen.getByRole("button", { name: "Seleccionar customers" }));
    await waitFor(() => expect(sawParent).toBe(true));
    await user.click(screen.getByRole("button", { name: "Seleccionar orders" })); await screen.findByRole("cell", { name: "0" });
    release(); await act(async () => { await gate; });
    expect(screen.queryByRole("cell", { name: "999" })).not.toBeInTheDocument();
    await user.click(screen.getByText("Metadatos parciales · 1 avisos")); expect(screen.getByText("Restricción sin permisos")).toBeVisible();
    await user.click(screen.getByText("Tablas y relaciones en texto")); expect(screen.getByRole("button", { name: "public.customers" })).toBeVisible();
  });
  it("reports errors, retries the schema, and displays an empty database", async () => {
    server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json({ detail: "Sin permisos" }, { status: 400 })));
    const user = userEvent.setup(); mount(); await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Sin permisos");
    server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json({ ...graphFixture, nodes: [], edges: [] })));
    await user.click(screen.getByRole("button", { name: "Reintentar esquema" }));
    await screen.findByText(/No hay tablas disponibles/);
  });
  it("requires a valid launch binding and a supported channel", async () => {
    history.replaceState(null, "", "/extract/diagram#bad-json");
    const first = mount(); expect((await screen.findAllByText(/Abre este diagrama desde/)).length).toBeGreaterThan(0); first.unmount();
    vi.stubGlobal("BroadcastChannel", undefined); mount();
    expect((await screen.findAllByText(/Este navegador no permite vincular/)).length).toBeGreaterThan(0);
  });
  it("works in memory when storage is restricted and explains recovery", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    mount(); await screen.findByRole("button", { name: "Seleccionar orders" });
    expect(screen.getByText(/El navegador no permite guardar la vinculación/)).toBeVisible();
  });
  it("invalidates the sample and blocks mutation when the connection changes", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("button", { name: "Seleccionar orders" });
    await user.click(screen.getByRole("button", { name: "Seleccionar orders" })); await screen.findByRole("cell", { name: "0" });
    await act(async () => owner.invalidate());
    await waitFor(() => expect(screen.getAllByText(/La conexión cambió/).length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: /Usar como origen/ })).toBeDisabled();
    expect(screen.queryByRole("cell", { name: "0" })).not.toBeInTheDocument();
  });
  it("retries a sample and updates the schema explicitly", async () => {
    server.use(http.post(API_URL + "/extract/database/preview", () => HttpResponse.json({ detail: "Sin permiso de lectura" }, { status: 400 })));
    const user = userEvent.setup(); mount(); await screen.findByRole("button", { name: "Seleccionar orders" });
    await user.click(screen.getByRole("button", { name: "Seleccionar orders" })); await screen.findByRole("alert");
    server.use(http.post(API_URL + "/extract/database/preview", () => HttpResponse.json(sampleFixture)));
    await user.click(screen.getByRole("button", { name: "Reintentar muestra" })); await screen.findByRole("cell", { name: "0" });
    await user.click(screen.getByRole("button", { name: "Actualizar esquema" }));
    await screen.findByRole("button", { name: "Seleccionar orders" });
    expect(screen.queryByRole("cell", { name: "0" })).not.toBeInTheDocument();
    fireEvent(window, new Event("pagehide"));
  });
});
