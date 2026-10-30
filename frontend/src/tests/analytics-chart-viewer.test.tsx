import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import Chart from "@/app/(app)/analytics/components/AnalyticsChartViewer";
import type { QueryResult, WarehouseQuery } from "@/types/warehouse";
import { warehouseMeta } from "./fixtures/warehouse";

// Only the drawing library is replaced; the chart's decisions and controls are real.
vi.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Part = () => null;
  const Series = ({ onClick, children }: { onClick?: (value: null, index: number) => void; children?: ReactNode }) =>
    <><button onClick={() => onClick?.(null, 0)}>Abrir fila del gráfico</button>{children}</>;
  return { ResponsiveContainer: Container, BarChart: Container, LineChart: Container, PieChart: Container,
    Bar: Series, Pie: Series, Line: Part, Cell: Part, CartesianGrid: Part, Tooltip: Part, XAxis: Part, YAxis: Part };
});

function fixture() {
  const query: WarehouseQuery = { base_table_id: "sales", joins: [], metrics: [{ id: "total", label: "Importe", aggregation: "SUM", column: "amount" }],
    dimensions: [{ id: "month", field: { relation: "base", column: "month" }, bucket: "month" }], filters: [], order_by: [{ field_id: "month", direction: "ASC" }], limit: 20 };
  const result: QueryResult = { status: "success", columns: [
    { id: "month", label: "Mes", logical_type: "string", encoding: "native", role: "dimension" },
    { id: "total", label: "Importe", logical_type: "decimal", encoding: "decimal_string", role: "metric" }],
    data: [{ month: "2026-02", total: "12.30" }, { month: "2026-01", total: "7.70" }],
    meta: { ...warehouseMeta, applied_limit: 20, returned_rows: 2 }, warnings: [], summary_kpis: [], filtered_rows: { value: 2, logical_type: "integer", encoding: "native" } };
  return { query, result };
}

it("switches eligible chart types and drills the original row only when enabled", async () => {
  const value = fixture(), drill = vi.fn(), user = userEvent.setup();
  const view = render(<Chart {...value} disabled={false} onDrill={drill} />);
  expect(screen.getByRole("button", { name: "Barras" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Dona" }));
  expect(screen.getByRole("button", { name: "Dona" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Abrir fila del gráfico", hidden: true }));
  expect(drill).toHaveBeenCalledWith(value.result.data[0]);
  view.rerender(<Chart {...value} disabled onDrill={drill} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir fila del gráfico", hidden: true }));
  expect(drill).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Líneas" }));
  expect(screen.getByRole("button", { name: "Líneas" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Barras" }));
  fireEvent.click(screen.getByRole("button", { name: "Abrir fila del gráfico", hidden: true }));
  expect(drill).toHaveBeenCalledTimes(1);
});

it.each([null, "-1", "0"])("rejects invalid pie data (%s) and resets a previously selected pie", async amount => {
  const value = fixture(), user = userEvent.setup();
  const view = render(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Dona" }));
  value.result = { ...value.result, data: [{ month: "2026-01", total: amount }] };
  view.rerender(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Dona" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Barras" })).toHaveAttribute("aria-pressed", "true");
});

it("restricts category count and chronological order, and explains Top N", async () => {
  const value = fixture(), user = userEvent.setup();
  value.result.meta.truncated = true;
  const view = render(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Dona" }));
  expect(screen.getByText(/Top N excluye otras categorías/)).toBeVisible();
  value.result = { ...value.result, data: Array.from({ length: 13 }, (_, i) => ({ month: String(i), total: "1" })) };
  value.query = { ...value.query, order_by: [{ field_id: "month", direction: "DESC" }] };
  view.rerender(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Dona" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Líneas" })).toBeDisabled();
});

it("offers an alternative for empty, nonnumeric and overflowing results", () => {
  const value = fixture();
  const view = render(<Chart {...value} result={{ ...value.result, data: [] }} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByText("Sin coincidencias")).toBeVisible();
  view.rerender(<Chart {...value} result={{ ...value.result, data: [{ month: "x", total: "1e400" }] }} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByText("Esta métrica se consulta en la tabla")).toBeVisible();
  value.result.columns[1].logical_type = "date";
  view.rerender(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Revisar consulta" })).toHaveAttribute("href", "#warehouse-query");
});

it("changes metrics and recovers when a selected metric is removed", async () => {
  const value = fixture(), user = userEvent.setup();
  value.query.metrics.push({ id: "count", label: "Conteo", aggregation: "COUNT_ROWS" });
  value.result.columns.push({ id: "count", label: "Conteo", logical_type: "integer", encoding: "native", role: "metric" });
  value.result.data.forEach(row => { row.count = 1; });
  const view = render(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Métrica del gráfico" }), "count");
  expect(screen.getByRole("combobox", { name: "Métrica del gráfico" })).toHaveValue("count");
  value.query = { ...value.query, metrics: value.query.metrics.slice(0, 1) };
  view.rerender(<Chart {...value} disabled={false} onDrill={vi.fn()} />);
  expect(screen.getByRole("combobox", { name: "Métrica del gráfico" })).toHaveValue("total");
});
