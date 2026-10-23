import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Chart from "@/app/(app)/analytics/components/AdvancedChartViewer";
import type { AnalysisResult } from "@/types/analysis";
import { warehouseMeta } from "./fixtures/warehouse";
import { newAnalysis } from "@/app/(app)/analytics/components/AnalysisBuilder";

vi.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Svg = ({ children }: { children?: ReactNode }) => <svg>{children}</svg>;
  const Part = () => <g />;
  return { ResponsiveContainer: Container, BarChart: Svg, LineChart: Svg, Bar: Part, Line: Part, Legend: Part, XAxis: Part, YAxis: Part, CartesianGrid: Part, Tooltip: Part };
});

function result(): AnalysisResult {
  return { status: "success", definition: { ...newAnalysis("sales"), dimensions: [{ id: "month", field: { relation: "base", column: "month" }, bucket: "month" }, { id: "category", field: { relation: "base", column: "category" } }] },
    columns: [{ id: "month", label: "Month", logical_type: "string", encoding: "native", role: "dimension" }, { id: "category", label: "Category", logical_type: "string", encoding: "native", role: "dimension" },
      { id: "total", label: "Amount", logical_type: "decimal", encoding: "decimal_string", role: "metric" }, { id: "events", label: "Events", logical_type: "integer", encoding: "native", role: "metric" }],
    data: [{ month: "2026-01", category: "A", total: "100.12345678", events: 2 }, { month: "2026-02", category: "B", total: null, events: 1 }],
    units: { total: "money", events: "count" }, summary_kpis: [], filtered_rows: { value: 3, logical_type: "integer", encoding: "native" }, execution_id: "chart", warnings: [], meta: { ...warehouseMeta, applied_limit: 20, returned_rows: 2 } };
}

describe("chart semantics and alternatives", () => {
  it("switches representation and units without recomputing data, and exposes exact matrix values", async () => {
    render(<Chart result={result()} />); const user = userEvent.setup();
    expect(screen.getByText(/Unidad: money/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Medida y unidad del gráfico"), "events");
    expect(screen.getByText(/Unidad: count/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Representación del análisis"), "stack");
    await user.selectOptions(screen.getByLabelText("Representación del análisis"), "heatmap");
    expect(screen.getByRole("table")).toHaveTextContent("2026-01");
    await user.selectOptions(screen.getByLabelText("Medida y unidad del gráfico"), "total");
    expect(screen.getByRole("table")).toHaveTextContent("100,12345678");
    expect(screen.getByRole("table")).toHaveTextContent("Sin valor");
  });

  it("offers chronological multi-series and image export from an already computed result", async () => {
    const value = result(); value.definition.dimensions = [value.definition.dimensions[0]];
    const create = vi.fn(() => "blob:synthetic");
    vi.stubGlobal("URL", class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<Chart result={value} />); const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Representación del análisis"), "line");
    await user.click(screen.getByRole("button", { name: "Descargar gráfico SVG" }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("keeps empty and unplottable results in a readable alternative", () => {
    const empty = result(); empty.data = [];
    const view = render(<Chart result={empty} />);
    expect(screen.getByText("Sin valores para representar")).toBeInTheDocument();
    const extreme = result(); extreme.data[0].total = "1e400";
    view.rerender(<Chart result={extreme} />);
    expect(screen.getByRole("status")).toHaveTextContent(/fuera del rango gráfico/);
  });
});
