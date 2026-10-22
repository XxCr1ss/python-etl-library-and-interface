import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import AnalyticsPage from "@/app/(app)/analytics/page";
import { PipelineProvider } from "@/state/PipelineProvider";
import { WarehouseSessionProvider } from "@/features/warehouse/WarehouseSessionProvider";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { warehouseCatalogFixture, warehouseDetailResult, warehouseResult } from "./fixtures/warehouse";
import type { DetailRequest, WarehouseQuery } from "@/types/warehouse";

vi.mock("next/dynamic", () => ({ default: () => function Chart() { return <p>Gráfico disponible con alternativa tabular</p>; } }));
let queries: WarehouseQuery[];
let details: Record<string, unknown>[];
beforeEach(() => {
  queries = []; details = [];
  server.use(http.post(`${API_URL}/warehouse/catalog`, () => HttpResponse.json(warehouseCatalogFixture)),
    http.post(`${API_URL}/warehouse/query`, async ({ request }) => { const body = await request.json() as { query: WarehouseQuery }; queries.push(body.query); return HttpResponse.json(warehouseResult(body.query)); }),
    http.post(`${API_URL}/warehouse/detail`, async ({ request }) => { const body = await request.json() as DetailRequest; details.push(body as unknown as Record<string, unknown>); return HttpResponse.json(warehouseDetailResult(body)); }));
});
function Harness() {
  const [visible, setVisible] = useState(true);
  return <PipelineProvider><WarehouseSessionProvider><button onClick={() => setVisible(v => !v)}>Cambiar vista</button>{visible ? <AnalyticsPage /> : <p>Otra pantalla</p>}</WarehouseSessionProvider></PipelineProvider>;
}
async function connect() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Base de datos"), "synthetic");
  await user.type(screen.getByLabelText("Usuario"), "reader");
  await user.type(screen.getByLabelText("Contraseña"), "synthetic-only-password");
  await user.click(screen.getByRole("button", { name: "Conectar y leer catálogo" }));
  await screen.findByRole("heading", { name: "Construye tu consulta" });
  return user;
}
async function aggregate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Agregar métrica" }));
  await user.selectOptions(screen.getByLabelText("Operación 1"), "SUM");
  await user.selectOptions(screen.getByLabelText("Columna de métrica 1"), "amount");
  await user.click(screen.getByRole("button", { name: "Agregar dimensión" }));
  await user.click(screen.getByRole("button", { name: "Consultar y graficar" }));
  await screen.findByRole("heading", { name: "Resumen del conjunto filtrado" });
}

describe("Warehouse independent exploration", () => {
  it("connects without an ETL source, queries explicitly, shows global KPI and drills a category", async () => {
    let connected: Record<string, unknown> | undefined;
    server.use(http.post(`${API_URL}/warehouse/catalog`, async ({ request }) => { connected = (await request.json() as { connection: Record<string, unknown> }).connection; return HttpResponse.json(warehouseCatalogFixture); }));
    render(<Harness />); const user = await connect();
    expect(connected).not.toHaveProperty("agent_id");
    expect(connected).not.toHaveProperty("service_name");
    expect(queries).toHaveLength(0);
    await aggregate(user);
    expect(queries).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: "Métricas globales" })).getByText("120,0000")).toBeVisible();
    expect(screen.getByRole("region", { name: "Tabla agregada" })).toHaveTextContent("90,0000");
    await user.click(screen.getByRole("button", { name: "Ver detalle 1" }));
    await screen.findByRole("region", { name: "Registros de la bodega" });
    expect(details[0]).toMatchObject({ drilldown: [{ field: { relation: "base", column: "category" }, value: "B" }], page: 1 });
    expect(details[0]).not.toHaveProperty("query");
    expect(sessionStorage.getItem("etl_pipeline_session_v1") || "").not.toContain("synthetic-only-password");
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain("synthetic-only-password");
  });

  it("keeps state on navigation, disables old exports after editing, and clears secrets on global reset", async () => {
    render(<Harness />); const user = await connect(); await aggregate(user);
    await user.click(screen.getByRole("button", { name: "Cambiar vista" }));
    await user.click(screen.getByRole("button", { name: "Cambiar vista" }));
    expect(screen.getByRole("region", { name: "Tabla agregada" })).toBeVisible();
    await user.clear(screen.getByLabelText("Top N")); await user.type(screen.getByLabelText("Top N"), "10");
    expect(queries).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Descargar CSV" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Descartar cambios de consulta" }));
    expect(screen.getByRole("button", { name: "Descargar CSV" })).toBeEnabled();
    act(() => window.dispatchEvent(new Event("etl:session-reset")));
    expect(screen.queryByRole("region", { name: "Tabla agregada" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar y leer catálogo" })).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("clears incompatible fields when changing base, supports manual composite mapping and typed filters", async () => {
    render(<Harness />); const user = await connect();
    await user.click(screen.getByRole("button", { name: "Agregar métrica" }));
    await user.click(screen.getByRole("button", { name: "Definir mapeo manual" }));
    expect(screen.getByLabelText("Clave única destino 1")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tipo de cruce 1"), "INNER");
    await user.click(screen.getByRole("button", { name: "Agregar filtro" }));
    await user.selectOptions(screen.getByLabelText("Columna de filtro 1"), JSON.stringify({ relation: "base", column: "amount" }));
    await user.selectOptions(screen.getByLabelText("Operador 1"), "BETWEEN");
    await user.type(screen.getByLabelText("Inicio 1"), "10"); await user.type(screen.getByLabelText("Fin 1"), "90");
    await user.click(screen.getByRole("button", { name: "Consultar y graficar" }));
    await screen.findByRole("heading", { name: "Resumen del conjunto filtrado" });
    expect(queries[0]).toMatchObject({ joins: [{ type: "INNER", via: { kind: "manual" } }], filters: [{ op: "BETWEEN", values: ["10", "90"] }] });
    await user.selectOptions(screen.getByLabelText("Tabla base"), warehouseCatalogFixture.tables[2].table_id);
    expect(screen.queryByLabelText("Operación 1")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Columna de filtro 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Consultar y graficar" })).toBeDisabled();
  });

  it("discards a late query after disconnecting and shows empty catalog without pretending it is an error", async () => {
    let release!: () => void;
    server.use(http.post(`${API_URL}/warehouse/query`, async ({ request }) => { const body = await request.json() as { query: WarehouseQuery }; await new Promise<void>(resolve => { release = resolve; }); return HttpResponse.json(warehouseResult(body.query)); }));
    render(<Harness />); const user = await connect();
    await user.click(screen.getByRole("button", { name: "Agregar métrica" }));
    await user.click(screen.getByRole("button", { name: "Consultar y graficar" }));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await user.click(screen.getByRole("button", { name: "Desconectar bodega" }));
    await act(async () => release());
    expect(screen.queryByRole("heading", { name: "Resumen del conjunto filtrado" })).not.toBeInTheDocument();
    server.use(http.post(`${API_URL}/warehouse/catalog`, () => HttpResponse.json({ ...warehouseCatalogFixture, tables: [], relationships: [] })));
    await connectEmpty();
  });

  it("sanitizes HTTP failures and supports deliberate empty password", async () => {
    server.use(http.post(`${API_URL}/warehouse/catalog`, () => HttpResponse.json({ detail: "synthetic-only-password" }, { status: 503 })));
    render(<Harness />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Base de datos"), "synthetic"); await user.type(screen.getByLabelText("Usuario"), "reader");
    await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
    await user.click(screen.getByRole("button", { name: "Conectar y leer catálogo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la operación");
    expect(screen.getByRole("alert")).not.toHaveTextContent("synthetic-only-password");
  });
});

async function connectEmpty() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Base de datos"), "synthetic"); await user.type(screen.getByLabelText("Usuario"), "reader");
  await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
  await user.click(screen.getByRole("button", { name: "Conectar y leer catálogo" }));
  await screen.findByRole("heading", { name: "El esquema no contiene tablas" });
}
