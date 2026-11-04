import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { warehouseCatalogFixture, warehouseMeta } from "./fixtures/warehouse";
import { AnalysisBuilder, newAnalysis } from "@/app/(app)/analytics/components/AnalysisBuilder";
import { AdvancedAnalysisPanel } from "@/app/(app)/analytics/components/AdvancedAnalysisPanel";
import { PipelineProvider } from "@/state/PipelineProvider";
import { WarehouseSessionProvider, useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import { analysisResult, analyzeWarehouse, reportWarehouse } from "@/services/analysisApi";
import { csvResult, reportStorageKey } from "@/features/warehouse/reportStorage";
import type { AnalysisSpec } from "@/types/analysis";
import { SharedReportFilters } from "@/app/(app)/analytics/components/SharedReportFilters";

vi.mock("next/dynamic", () => ({ default: () => function Chart() { return null; } }));
const catalog = structuredClone(warehouseCatalogFixture);
catalog.capabilities.supported_operations.push("warehouse_analyze", "warehouse_report");
const key = (column: string) => JSON.stringify({ relation: "base", column });
function Builder({ initial = newAnalysis(catalog.tables[0].table_id) }: { initial?: AnalysisSpec }) {
  const [value, setValue] = useState(initial);
  return <><AnalysisBuilder spec={value} catalog={catalog} busy={false} onChange={setValue} onRun={() => {}} /><output aria-label="Definition">{JSON.stringify(value)}</output></>;
}

function advancedResult(analysis: AnalysisSpec) {
  return { status: "success", columns: [{ id: "events", label: "Eventos", logical_type: "integer", encoding: "native", role: "metric" }], data: [{ events: 100 }],
    summary_kpis: [{ metric_id: "events", aggregation: "COUNT_ROWS", value: 100, logical_type: "integer", encoding: "native" }], filtered_rows: { value: 100, logical_type: "integer", encoding: "native" },
    units: { events: "count" }, warnings: [], definition: analysis, execution_id: "execution-1", meta: { ...warehouseMeta, applied_limit: analysis.limit, truncated: false } };
}
function ConnectionControls() {
  const w = useWarehouse();
  return <><button onClick={() => w.updateConnection({ database: "synthetic", user: "reader", password: "runtime-only" })}>Configure</button><button onClick={() => void w.connect()}>Connect</button>{w.busy && <p role="status">{w.busy}</p>}{w.error && <p role="alert">{w.error}</p>}<AdvancedAnalysisPanel /></>;
}
async function workspace() {
  server.use(http.post(`${API_URL}/warehouse/catalog`, () => HttpResponse.json(catalog)),
    http.post(`${API_URL}/warehouse/analyze`, async ({ request }) => { const body = await request.json() as { analysis: AnalysisSpec }; return HttpResponse.json(advancedResult(body.analysis)); }),
    http.post(`${API_URL}/warehouse/definition`, async ({ request }) => HttpResponse.json(await request.json())),
    http.post(`${API_URL}/warehouse/report`, async ({ request }) => { const body = await request.json() as { analyses: AnalysisSpec[] }; return HttpResponse.json({ status: "success", version: 1, execution_id: "report-1", results: body.analyses.map(advancedResult) }); }));
  render(<PipelineProvider><WarehouseSessionProvider><ConnectionControls /></WarehouseSessionProvider></PipelineProvider>);
  const user = userEvent.setup();
  await user.click(screen.getByText("Configure")); await user.click(screen.getByText("Connect"));
  await screen.findByRole("heading", { name: "Análisis avanzados y reportes" });
  return user;
}

describe("general analytics user flows", () => {
  it("requires an explicit mapping or exception before applying shared report filters", async () => {
    const user = userEvent.setup(), changed = vi.fn();
    const panels = [newAnalysis(catalog.tables[0].table_id), { ...newAnalysis(catalog.tables[1].table_id), title: "Population" }];
    render(<SharedReportFilters catalog={catalog} panels={panels} busy={false} onChange={changed} />);
    await user.click(screen.getByText("Añadir filtros compartidos con mapeo por panel"));
    await user.click(screen.getByRole("button", { name: "Agregar filtro" }));
    await user.type(screen.getByLabelText("Valor 1"), "42");
    const apply = screen.getByRole("button", { name: "Añadir condiciones a los paneles" });
    expect(apply).toBeDisabled();
    await user.selectOptions(screen.getByLabelText(/Filtro compartido 1 en panel 1:/), key("id"));
    expect(apply).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Excluir panel 2 del filtro 1" }));
    await user.click(apply);
    expect(changed.mock.calls[0][0][0].selection.filters).toEqual([{ field: { relation: "base", column: "id" }, op: "EQ", value: "42" }]);
    expect(changed.mock.calls[0][0][1].selection.filters).toEqual([]);
    expect(screen.getByText(/Paneles con excepciones explícitas: Population/)).toBeInTheDocument();
  });
  it("configures an entity average, derived measure, units, own filters and date roles", async () => {
    render(<Builder />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Qué representa una fila"), "Una venta");
    await user.click(screen.getByRole("tab", { name: "Medidas" }));
    await user.selectOptions(screen.getByLabelText("Agregación de medida 1"), "ENTITY_AVG");
    await user.selectOptions(screen.getByLabelText("Valor de medida 1"), key("amount"));
    await user.selectOptions(screen.getByLabelText("Entidad de medida 1"), key("id"));
    await user.selectOptions(screen.getByLabelText("Etapa interior de medida 1"), "COUNT_ROWS");
    await user.click(screen.getByText("Condiciones propias de Eventos"));
    const own = screen.getByText("Condiciones propias de Eventos").parentElement!;
    await user.click(within(own).getByRole("button", { name: "Agregar filtro" }));
    await user.click(screen.getByRole("button", { name: "Agregar indicador calculado" }));
    await user.type(screen.getByLabelText("Fórmula 1"), "events / 2");
    await user.click(screen.getByRole("tab", { name: "Dimensiones" }));
    await user.click(screen.getByRole("button", { name: "Agregar agrupación" }));
    await user.selectOptions(screen.getByLabelText("Campo de agrupación 1"), key("occurred"));
    await user.selectOptions(screen.getByLabelText("Período de agrupación 1"), "month");
    await user.click(screen.getByRole("button", { name: "Configurar calendario de observación" }));
    fireEvent.change(screen.getByLabelText("Inicio de observación"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Fin de observación"), { target: { value: "2026-03-31" } });
    await user.click(screen.getByLabelText(/Confirmo cobertura/));
    const value = JSON.parse(screen.getByLabelText("Definition").textContent!);
    expect(value.measures[0].entity.column).toBe("id"); expect(value.calendar.observed).toBe(true); expect(value.formulas[0].expression).toBe("events / 2");
    expect(screen.getByRole("button", { name: "Calcular análisis" })).toBeEnabled();
  });

  it("configures cohort membership separately from measurement and a reference population", async () => {
    render(<Builder />); const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Población y cohortes" }));
    await user.click(screen.getByRole("button", { name: "Agregar cohorte" }));
    await user.selectOptions(screen.getByLabelText("Entidad de cohorte 1"), key("id"));
    await user.selectOptions(screen.getByLabelText("Entidad de eventos para cohorte 1"), key("id"));
    await user.selectOptions(screen.getByLabelText("Combinar cohortes"), "any");
    await user.click(screen.getByRole("button", { name: "Agregar población de referencia" }));
    await user.selectOptions(screen.getByLabelText("Clave de entidad en población"), key("id"));
    await user.selectOptions(screen.getByLabelText("Clave de entidad en eventos"), key("id"));
    await user.click(screen.getByRole("tab", { name: "Medidas" }));
    await user.selectOptions(screen.getByLabelText("Alcance de medida 1"), "population");
    expect(JSON.parse(screen.getByLabelText("Definition").textContent!).cohorts[0].selection.filters).toEqual([]);
    await user.click(screen.getByRole("tab", { name: "Población y cohortes" }));
    await user.click(screen.getByRole("button", { name: "Quitar cohorte 1" }));
    await user.click(screen.getByRole("button", { name: "Quitar población de referencia" }));
  });

  it("offers pairs, support definition and server histogram boundaries", async () => {
    render(<Builder />); const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Patrón de análisis"), "pairs");
    await user.click(screen.getByRole("tab", { name: "Pares" }));
    await user.selectOptions(screen.getByLabelText("Clave de canasta o documento"), key("id"));
    await user.selectOptions(screen.getByLabelText("Código de elemento"), key("category"));
    expect(screen.getByText(/incluye todas las canastas elegibles/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Eventos" }));
    await user.selectOptions(screen.getByLabelText("Patrón de análisis"), "histogram");
    await user.click(screen.getByRole("tab", { name: "Distribución" }));
    await user.selectOptions(screen.getByLabelText("Valor de distribución"), key("amount"));
    fireEvent.change(screen.getByLabelText("Límites de intervalos"), { target: { value: "0,20,60" } });
    expect(JSON.parse(screen.getByLabelText("Definition").textContent!).histogram.boundaries).toEqual(["0", "20", "60"]);
  });

  it("calculates, saves and restores reusable panel definitions without credentials or rows", async () => {
    const user = await workspace();
    await user.click(screen.getByRole("button", { name: "Nuevo análisis avanzado" }));
    await user.type(screen.getByLabelText("Qué representa una fila"), "Una venta");
    await user.click(screen.getByRole("button", { name: "Calcular análisis" }));
    await screen.findByRole("heading", { name: "Nuevo análisis" });
    expect(screen.queryByText("Resultado de una definición anterior")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agregar esta definición al reporte" }));
    await user.click(screen.getByRole("button", { name: "Guardar definición del reporte" }));
    await screen.findByText(/Definición guardada en este navegador/);
    const stored = Object.keys(localStorage).filter(k => k.startsWith("etl:reports:")).map(k => localStorage.getItem(k)).join("");
    expect(stored).not.toContain("runtime-only"); expect(stored).not.toContain("execution-1"); expect(stored).not.toContain('"data"');
    await user.click(screen.getByRole("button", { name: "Ejecutar todos los paneles" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ejecutar todos los paneles" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Restaurar reporte guardado" }));
    await screen.findByText(/Definición restaurada/);
    await user.type(screen.getByLabelText("Título del análisis"), " editado");
    expect(screen.getByText("Resultado de una definición anterior")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar definición guardada" }));
  });

  it("shows backend errors and keeps the definition editable", async () => {
    const user = await workspace();
    server.use(http.post(`${API_URL}/warehouse/analyze`, () => HttpResponse.json({ detail: "Denominador no compatible.", code: "invalid_query", technical_detail: "No se pudo validar el denominador." }, { status: 422 })));
    await user.click(screen.getByRole("button", { name: "Nuevo análisis avanzado" }));
    await user.type(screen.getByLabelText("Qué representa una fila"), "Una venta");
    await user.click(screen.getByRole("button", { name: "Calcular análisis" }));
    await screen.findByText("Denominador no compatible.");
    await user.click(screen.getByText("Ver detalle técnico"));
    expect(screen.getByText(/HTTP 422 · invalid_query/)).toBeVisible();
    expect(screen.getByLabelText("Qué representa una fila")).toBeEnabled();
  });

  it("sends the visible count default after the unit is cleared", async () => {
    const user = await workspace();
    const sent = vi.fn();
    server.use(http.post(`${API_URL}/warehouse/analyze`, async ({ request }) => {
      const { analysis } = await request.json() as { analysis: AnalysisSpec };
      sent(analysis.measures[0].unit);
      return HttpResponse.json(advancedResult(analysis));
    }));
    await user.click(screen.getByRole("button", { name: "Nuevo análisis avanzado" }));
    await user.type(screen.getByLabelText("Qué representa una fila"), "Una venta");
    await user.click(screen.getByRole("tab", { name: "Medidas" }));
    await user.clear(screen.getByLabelText("Unidad de medida 1"));
    await user.click(screen.getByRole("tab", { name: "Salida" }));
    await user.click(screen.getByRole("button", { name: "Calcular análisis" }));
    await waitFor(() => expect(sent).toHaveBeenCalledWith("count"));
    await user.click(screen.getByRole("tab", { name: "Medidas" }));
    expect(screen.getByLabelText("Unidad de medida 1")).toHaveValue("count");
  });

  it("focuses the date bound in the second cohort from another tab", async () => {
    const user = userEvent.setup(), run = vi.fn();
    const datedCatalog = structuredClone(catalog);
    const table = datedCatalog.tables[0];
    table.columns.find(column => column.name === "occurred")!.logical_type = "date";
    const spec = newAnalysis(table.table_id);
    const entity = { relation: "base", column: "id" };
    const selection = { ...spec.selection, filters: [] };
    const cohorts: AnalysisSpec["cohorts"] = [
      { selection, entity, event_entity: entity },
      { selection: { ...selection, filters: [{ field: { relation: "base", column: "occurred" }, op: "BETWEEN", values: ["2006-01-0", "2008-12-31"] }] }, entity, event_entity: entity },
    ];
    render(<AnalysisBuilder spec={{ ...spec, grain: "Una venta", cohorts }} catalog={datedCatalog} busy={false} onChange={() => {}} onRun={run} />);
    await user.click(screen.getByRole("tab", { name: "Salida" }));
    await user.click(screen.getByRole("button", { name: "Calcular análisis" }));
    expect(screen.getByRole("tab", { name: "Población y cohortes", selected: true })).toBeVisible();
    const bound = within(screen.getByRole("group", { name: "Cohorte 2" })).getByLabelText("Inicio 1");
    await waitFor(() => expect(bound).toHaveFocus());
    expect(bound).toHaveAccessibleDescription(/AAAA-MM-DD/);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects malformed responses, protects CSV and separates saved contexts", async () => {
    expect(() => analysisResult({})).toThrow();
    const definition = newAnalysis(catalog.tables[0].table_id);
    expect(() => analysisResult({ ...advancedResult(definition), units: null })).toThrow();
    expect(csvResult([{ id: "x", label: "=formula" }], [{ x: "@command" }, { x: null }])).toContain("'@command");
    expect(reportStorageKey("alice", ["a"])).not.toBe(reportStorageKey("bob", ["a"]));
    server.use(http.post(`${API_URL}/warehouse/analyze`, () => HttpResponse.json(advancedResult(definition))), http.post(`${API_URL}/warehouse/report`, () => HttpResponse.json({ status: "success", version: 1, execution_id: "r", results: [advancedResult(definition)] })));
    const connection = { db_type: "postgresql" as const, host: "localhost", database: "test", user: "reader", password: "" };
    expect((await analyzeWarehouse(connection, definition)).data[0].events).toBe(100);
    expect((await reportWarehouse(connection, [definition])).results).toHaveLength(1);
  });
});
