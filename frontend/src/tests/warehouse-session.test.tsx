import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { WarehouseSessionProvider, useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import AnalyticsPage from "@/app/(app)/analytics/page";
import * as api from "@/services/warehouseApi";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { warehouseCatalogFixture, warehouseDetailResult, warehouseResult } from "./fixtures/warehouse";
import type { DetailRequest, WarehouseQuery } from "@/types/warehouse";

vi.mock("next/dynamic", () => ({ default: () => function Chart() { return null; } }));
let generation: string;
let exported: Record<string, unknown>[];
beforeEach(() => {
  generation = "socket-1"; exported = [];
  localStorage.setItem("etl_agent_id", "warehouse-test-agent");
  server.use(http.get(`${API_URL}/extract/agent/status/:id`, ({ params }) => HttpResponse.json({ agent_id: params.id, connected: true, connection_id: generation })),
    http.post(`${API_URL}/warehouse/catalog`, () => HttpResponse.json(warehouseCatalogFixture)),
    http.post(`${API_URL}/warehouse/query`, async ({ request }) => { const body = await request.json() as { query: WarehouseQuery }; return HttpResponse.json(warehouseResult(body.query)); }),
    http.post(`${API_URL}/warehouse/detail`, async ({ request }) => HttpResponse.json(warehouseDetailResult(await request.json() as DetailRequest))),
    http.post(`${API_URL}/warehouse/export`, async ({ request }) => { exported.push(await request.json() as Record<string, unknown>); return new HttpResponse("{}", { headers: { "Content-Type": "application/json" } }); }));
});
function Controls() {
  const s = usePipelineSession(), w = useWarehouse();
  return <><button onClick={() => s.setTarget({ db_type: "postgresql", host: "copied-host", port: 5432, database: "copied-db", user: "reader", password: "secret123" })}>Configurar destino de prueba</button>
    <button onClick={() => s.setTarget({ db_type: "postgresql", host: "changed-host", database: "changed-db", user: "reader" })}>Cambiar destino de Carga</button>
    <button onClick={s.reset}>Restablecer sesión completa</button><button onClick={() => { void w.loadDetail([], 2); }}>Abrir página dos</button></>;
}
function setup() { return render(<PipelineProvider><WarehouseSessionProvider><Controls /><AnalyticsPage /></WarehouseSessionProvider></PipelineProvider>); }
async function copyAndConnect() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Configurar destino de prueba" }));
  await user.click(screen.getByRole("button", { name: "Usar destino de Carga" }));
  await user.click(screen.getByRole("button", { name: "Conectar y leer catálogo" }));
  await screen.findByRole("heading", { name: "Construye tu consulta" });
  return user;
}

describe("Warehouse session ownership and recovery", () => {
  it("copies target credentials to its own memory and keeps that snapshot after Load changes", async () => {
    let connection: unknown;
    server.use(http.post(`${API_URL}/warehouse/catalog`, async ({ request }) => { connection = (await request.json() as { connection: unknown }).connection; return HttpResponse.json(warehouseCatalogFixture); }));
    setup(); const user = await copyAndConnect();
    expect(connection).toMatchObject({ host: "copied-host", password: "secret123" });
    await user.click(screen.getByRole("button", { name: "Cambiar destino de Carga" }));
    expect(screen.getByLabelText("Host")).toHaveValue("copied-host");
    await user.click(screen.getByRole("button", { name: "Actualizar catálogo" }));
    expect(connection).toMatchObject({ host: "copied-host", database: "copied-db", password: "secret123" });
    await screen.findByRole("heading", { name: "Construye tu consulta" });
    await user.click(screen.getByRole("button", { name: "Usar destino de Carga" }));
    expect(screen.getByLabelText("Host")).toHaveValue("changed-host");
    expect(screen.getByLabelText("Puerto")).toHaveValue(5432);
    await user.click(screen.getByRole("button", { name: "Restablecer sesión completa" }));
    expect(screen.getByRole("button", { name: "Conectar y leer catálogo" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Construye tu consulta" })).not.toBeInTheDocument();
  });
  it("invalidates the catalog when a status probe reports a new agent generation", async () => {
    setup(); const user = await copyAndConnect();
    await user.click(screen.getByText("Configurar conexión", { selector: "summary" }));
    await user.click(screen.getByRole("checkbox", { name: "Usar agente local híbrido" }));
    await screen.findByText("Agente conectado");
    await user.click(screen.getByRole("button", { name: "Conectar y leer catálogo" }));
    await screen.findByRole("heading", { name: "Construye tu consulta" });
    generation = "socket-2";
    await user.click(screen.getByRole("button", { name: "Reintentar estado del agente" }));
    await screen.findByText("La conexión del agente cambió. Vuelve a conectar y leer el catálogo.");
    expect(screen.queryByRole("heading", { name: "Construye tu consulta" })).not.toBeInTheDocument();
  });
  it("exports explicit aggregate or detail scope and preserves typed detail columns", async () => {
    const save = vi.spyOn(api, "saveWarehouseReport").mockImplementation(() => {});
    setup(); const user = await copyAndConnect();
    await user.click(screen.getByRole("button", { name: "Agregar métrica" }));
    await user.click(screen.getByRole("button", { name: "Consultar y graficar" }));
    await screen.findByRole("heading", { name: "Resumen del conjunto filtrado" });
    await user.click(screen.getByRole("button", { name: "Descargar JSON" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(exported[0]).toMatchObject({ mode: "aggregate", format: "json" });
    await user.click(screen.getByRole("button", { name: "Abrir detalle de filtros actuales" }));
    await screen.findByRole("region", { name: "Registros de la bodega" });
    await user.click(screen.getByRole("button", { name: "Calcular total" }));
    await screen.findByText(/3 filas en total/);
    await user.selectOptions(screen.getByLabelText("Alcance del reporte"), "detail");
    await user.click(screen.getByRole("button", { name: "Descargar JSON" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(exported[1]).toMatchObject({ mode: "detail", max_rows: 20000, selection: { base_table_id: warehouseCatalogFixture.tables[0].table_id }, drilldown: [] });
    expect(exported[1]).not.toHaveProperty("page");
  });
});
