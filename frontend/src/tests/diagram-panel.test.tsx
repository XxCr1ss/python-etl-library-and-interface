import { createRef } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TablePreviewBottomPanel } from "@/features/diagram/TablePreviewBottomPanel";
import { heightLimits } from "@/features/diagram/useResizableHeight";
import { graphFixture, sampleFixture } from "./fixtures/diagram";
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
function mount(patch = {}) {
  const onUse = vi.fn(), onClose = vi.fn(), onRetry = vi.fn();
  const props = { table: graphFixture.nodes[1], sample: sampleFixture, loading: false, error: "", reason: "", onUse, onClose, onRetry, container: createRef<HTMLDivElement>(), ...patch };
  const view = render(<TablePreviewBottomPanel {...props} />);
  return { ...view, props, onUse, onClose, onRetry };
}
describe("lower table panel", () => {
  it("shows bounded data including zero/null and collapses without discarding it", async () => {
    const user = userEvent.setup(); const { onUse, onClose } = mount();
    expect(screen.getByRole("cell", { name: "0" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "NULL" })).toBeVisible();
    expect(screen.getByText(/no es el total/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ocultar datos" }));
    expect(screen.queryByRole("region", { name: "Muestra de datos" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar datos" }));
    expect(screen.getByRole("cell", { name: "0" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Usar como origen en Transformación" })); expect(onUse).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Cerrar datos de la tabla" })); expect(onClose).toHaveBeenCalledOnce();
  });
  it("explains restrictions and keeps empty-table columns", () => {
    mount({ sample: { ...sampleFixture, preview_data: [], total_rows: 0, sample_rows: 0 }, reason: "Abre Transformación en la pestaña ETL para usar esta tabla." });
    expect(screen.getByRole("button", { name: /Usar como origen/ })).toBeDisabled();
    expect(screen.getByText(/Abre Transformación/)).toBeVisible();
    expect(screen.getByRole("columnheader", { name: /customer_id/ })).toBeVisible();
    expect(screen.getByText(/no contiene filas/)).toBeVisible();
  });
  it("supports keyboard resize, bounds and restores previous height", async () => {
    const user = userEvent.setup(); mount();
    const splitter = screen.getByRole("separator", { name: "Altura del panel de datos" });
    splitter.focus(); await user.keyboard("{End}");
    const maximum = splitter.getAttribute("aria-valuemax"); expect(splitter).toHaveAttribute("aria-valuenow", maximum);
    await user.keyboard("{ArrowUp}"); expect(splitter).toHaveAttribute("aria-valuenow", maximum);
    await user.keyboard("{Home}"); expect(splitter).toHaveAttribute("aria-valuenow", splitter.getAttribute("aria-valuemin"));
    await user.keyboard("{ArrowUp}"); const previous = splitter.getAttribute("aria-valuenow");
    await user.click(screen.getByRole("button", { name: "Ocultar datos" })); await user.click(screen.getByRole("button", { name: "Mostrar datos" }));
    expect(splitter).toHaveAttribute("aria-valuenow", previous);
    expect(heightLimits(120).min).toBeLessThanOrEqual(heightLimits(120).max);
  });
  it("shows errors/retry, loading and non-selectable references", async () => {
    const user = userEvent.setup(); const { props, rerender, onRetry } = mount({ error: "Sin permisos" });
    expect(screen.getByRole("alert")).toHaveTextContent("Sin permisos");
    await user.click(screen.getByRole("button", { name: "Reintentar muestra" })); expect(onRetry).toHaveBeenCalledOnce();
    rerender(<TablePreviewBottomPanel {...props} error="" loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Consultando muestra");
    rerender(<TablePreviewBottomPanel {...props} error="" table={{ ...props.table, selectable: false }} sample={null} />);
    expect(screen.getByRole("button", { name: /Usar como origen/ })).toBeDisabled();
    expect(screen.getByText(/Referencia de consulta/)).toBeVisible();
  });
  it("renders false, empty text and recursive values without HTML", () => {
    const sample = { ...sampleFixture, columns: ["a", "b", "c"], dtypes: {}, preview_data: [{ a: false, b: "", c: { value: "<script>" } }] };
    mount({ sample });
    const table = screen.getByRole("table");
    for (const text of ["false", "Texto vacío", '{"value":"<script>"}']) expect(within(table).getByRole("cell", { name: text })).toBeVisible();
  });
  it("ignores unrelated keys and pointer movements without an active drag", () => {
    mount(); const splitter = screen.getByRole("separator"); const height = splitter.getAttribute("aria-valuenow");
    fireEvent.keyDown(splitter, { key: "Enter" }); fireEvent.pointerMove(splitter, { clientY: 1 });
    expect(splitter).toHaveAttribute("aria-valuenow", height);
  });
  it("captures a pointer drag and stops resizing after cancellation", () => {
    mount(); const splitter = screen.getByRole("separator");
    const capture = vi.fn(), release = vi.fn();
    Object.defineProperties(splitter, { setPointerCapture: { value: capture }, hasPointerCapture: { value: () => true }, releasePointerCapture: { value: release } });
    const pointer = (type: string, y: number) => { const event = new Event(type, { bubbles: true }); Object.defineProperties(event, { clientY: { value: y }, pointerId: { value: 1 } }); fireEvent(splitter, event); };
    const initial = Number(splitter.getAttribute("aria-valuenow"));
    pointer("pointerdown", 300); pointer("pointermove", 250);
    expect(capture).toHaveBeenCalledWith(1); expect(Number(splitter.getAttribute("aria-valuenow"))).toBe(initial + 50);
    pointer("pointercancel", 250); expect(release).toHaveBeenCalledWith(1);
    pointer("pointermove", 100); expect(Number(splitter.getAttribute("aria-valuenow"))).toBe(initial + 50);
  });
});
