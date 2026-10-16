import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppLayout from "@/app/(app)/layout";
import Dashboard from "@/app/(app)/dashboard/page";
import { HistorySummary } from "@/app/(app)/dashboard/components/HistorySummary";
import { ExecutionHistory } from "@/app/(app)/dashboard/components/ExecutionHistory";
import { historyMetrics } from "@/app/(app)/dashboard/components/historyMetrics";
import { pipelineStages, sourceCount, sourceLabel } from "@/components/layout/pipelinePresentation";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { CredentialStore } from "@/state/credentialStore";
import { initialState, pipelineReducer, type PipelineState } from "@/state/pipelineReducer";
import { SESSION_KEY, persistedSession, hydrateSession } from "@/state/pipelineStorage";
import type { ExecutionRecord, SourceDescriptor } from "@/types/etl";
import { resetNavigation, router } from "./navigation";
import { mockDialogMethods } from "./dialog";
import { mockMedia } from "./media";

vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
let restoreDialog: () => void;
beforeEach(() => { resetNavigation(); mockMedia(); restoreDialog = mockDialogMethods(); });
afterEach(() => { restoreDialog(); document.documentElement.classList.remove("dark"); });
const file: SourceDescriptor = { type: "file", filepath: "/private/path/data.csv", filename: "C:\\private\\ventas.csv", count: { kind: "dataset", value: 12 } };
const date: SourceDescriptor = { type: "date_dimension", start_year: 2024, end_year: 2024, count: { kind: "dataset", value: 366 } };
const db: SourceDescriptor = { type: "database", db_type: "postgresql", host: "private-host", database: "private-db", user: "private-user", table_name: "ventas", credentialRef: "primary", count: { kind: "sample", value: 5 } };
const base: PipelineState = { ...initialState, hydrationStatus: "ready", source: date };
const preview: PipelineState["preview"] = { status: "success", revision: 0, data: { status: "success", columns: [], dtypes: {}, preview_data: [], total_rows: 0 } };
const makeRecord = (status: ExecutionRecord["status"], overrides: Partial<ExecutionRecord> = {}): ExecutionRecord => ({ id: status, revision: 0, status, table_name: "dim_fecha", table_type: "dimension", startedAt: "2026-10-15T10:00:00Z", ...overrides });
const history = [
  makeRecord("success", { sourceLabel: "Dimensión fecha · 2024–2024", finishedAt: "2026-10-15T10:00:01Z", durationMs: 1000, total_rows: 999 }),
  makeRecord("error", { finishedAt: "2026-10-15T10:00:03Z", durationMs: 3000 }),
  makeRecord("unknown", { finishedAt: "2026-10-15T10:00:08Z", durationMs: 8000 }),
  makeRecord("running"),
];
function save(state: Partial<PipelineState>) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession({ ...initialState, hydrationStatus: "ready", ...state }))); }

describe("stepper readiness independently of the visited route", () => {
  it("without source only extraction is available; hydration and recovery block all stages", () => {
    const c = new CredentialStore();
    expect(pipelineStages({ ...base, source: null }, c).map(s => [s.available, s.complete])).toEqual([[true, false], [false, false], [false, false]]);
    for (const state of [initialState, { ...base, recoveryRequired: true }]) expect(pipelineStages(state, c).every(s => !s.available)).toBe(true);
  });
  it.each([date, file, db])("confirmed $type source and explicit empty password allow transformation with an empty recipe", source => {
    const c = new CredentialStore(); if (source.type === "database") c.set(source.credentialRef, "");
    const state = { ...base, source };
    expect(pipelineStages(state, c).map(s => [s.available, s.complete])).toEqual([[true, true], [true, false], [false, false]]);
    expect(pipelineStages({ ...state, preview }, c).map(s => [s.available, s.complete])).toEqual([[true, true], [true, true], [true, false]]);
  });
  it("missing principal or secondary credentials prevents preview and loading", () => {
    const c = new CredentialStore();
    expect(pipelineStages({ ...base, source: db, preview }, c)[1]).toMatchObject({ available: false, complete: false });
    const state: PipelineState = { ...base, preview, recipe: [{ id: "union", type: "union", params: { secondary_source: db } }] };
    expect(pipelineStages(state, c)[2].available).toBe(false);
  });
  it.each([{ ...preview, revision: 2 }, { status: "error" as const, revision: 0 }, { status: "loading" as const, revision: 0 }])("stale/error/loading preview cannot complete transformation or enable load", value => {
    const stages = pipelineStages({ ...base, preview: value }, new CredentialStore());
    expect(stages[1].complete).toBe(false); expect(stages[2].available).toBe(false);
  });
  it.each(["error", "unknown", "success"] as const)("%s execution gets truthful text and only current success completes load", status => {
    const report = { status: "success" as const, message: "OK", table_name: "dim_fecha", table_type: "dimension" as const, total_rows: 999, preview_data: [] };
    const state = { ...base, preview, execution: makeRecord(status), report };
    const stage = pipelineStages(state, new CredentialStore())[2];
    expect(stage.complete).toBe(status === "success");
    expect(stage.detail).toMatch(status === "success" ? /completada/ : status === "error" ? /fallida/ : /desconocido/);
    expect(pipelineStages({ ...state, execution: makeRecord(status, { revision: 3 }) }, new CredentialStore())[2].complete).toBe(false);
    const changed = pipelineReducer(state, { type: "addStep", step: { id: "p", type: "prefix_header", params: { prefix: "x" } } });
    expect(pipelineStages(changed, new CredentialStore()).slice(1).every(s => !s.complete)).toBe(true);
  });
  it("running load blocks edits but keeps its review route available", () => {
    expect(pipelineStages({ ...base, preview, execution: makeRecord("running") }, new CredentialStore()).map(s => s.available)).toEqual([false, false, true]);
  });
  it("source names and counts do not reveal paths or connections and distinguish a sample", () => {
    expect(sourceLabel(file)).toBe("ventas.csv"); expect(sourceLabel(db)).toBe("Tabla · ventas");
    expect(sourceCount(db)).toBe("5 filas de muestra"); expect(sourceCount(date)).toBe("366 filas del dataset"); expect(sourceCount(null)).toBe("Conteo no disponible");
  });
});

describe("history metrics and presentation", () => {
  it("unknown is separate from success/failure denominator; completed browser durations include observed unknown time", () => {
    expect(historyMetrics(history)).toEqual({ attempts: 4, successes: 1, failures: 1, unknown: 1, running: 1, successRate: 0.5, averageMs: 4000 });
    expect(historyMetrics([makeRecord("unknown")])).toMatchObject({ successRate: null, averageMs: null });
    expect(historyMetrics([makeRecord("success", { finishedAt: "2026-10-15T10:00:00Z", durationMs: 0 })]).averageMs).toBe(0);
    render(<HistorySummary history={history} />);
    expect(screen.getByText(/50\s*%/)).toBeVisible(); expect(screen.getByText("4 s")).toBeVisible();
    expect(screen.queryByText(/registros cargados/i)).not.toBeInTheDocument();
  });
  it("table shows absolute accessible time, safe source, unknown and destination total only for success", () => {
    render(<ExecutionHistory history={history} disabled={false} onClear={vi.fn()} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("999")).toBeVisible(); expect(within(table).getByText("Resultado desconocido")).toBeVisible();
    expect(within(table).getByText("Dimensión fecha · 2024–2024")).toBeVisible();
    const time = table.querySelector("time")!; expect(time).toHaveAttribute("datetime", history[0].startedAt); expect(time.textContent).toMatch(/2026/);
    expect(within(table).getAllByText("No registrado")).toHaveLength(3);
  });
  it("history deletion requires confirmation and can be cancelled", async () => {
    const clear = vi.fn(); render(<ExecutionHistory history={history} disabled={false} onClear={clear} />); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Borrar historial de esta pestaña" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/pipeline activo/); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Borrar historial de esta pestaña" })); await user.click(screen.getByRole("button", { name: "Borrar resúmenes" })); expect(clear).toHaveBeenCalledOnce();
  });
  it("empty dashboard needs no backend and never shows invented success or load action", () => {
    render(<AppLayout><Dashboard /></AppLayout>);
    expect(screen.getByRole("heading", { name: "Aún no hay intentos de carga" })).toBeVisible();
    expect(screen.getByText(/Tasa de éxito.*Sin datos/)).toBeVisible(); expect(screen.queryByRole("link", { name: "Ir a Carga" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar historial de esta pestaña" })).toBeDisabled();
  });
  it("session banner offers loading only after a current preview and removes it when the recipe changes", async () => {
    save({ source: date });
    function PreviewControls() {
      const session = usePipelineSession();
      return <><button onClick={() => void session.runPreview(10)}>Validar sesión</button><button onClick={() => session.addStep({ type: "prefix_header", params: { prefix: "x" } })}>Cambiar receta</button></>;
    }
    render(<AppLayout><Dashboard /><PreviewControls /></AppLayout>); const user = userEvent.setup();
    expect(screen.queryByRole("link", { name: "Ir a Carga" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Validar sesión" })); expect(await screen.findByRole("link", { name: "Ir a Carga" })).toHaveAttribute("href", "/load");
    await user.click(screen.getByRole("button", { name: "Cambiar receta" })); expect(screen.queryByRole("link", { name: "Ir a Carga" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar en Transformación" })).toHaveAttribute("href", "/transform"); expect(screen.getByText(/366 filas del dataset · 1 pasos/)).toBeVisible();
  });
  it("dashboard recovers missing source credentials without discarding the recipe or requesting a preview", async () => {
    save({ source: db, recipe: [{ id: "kept", type: "prefix_header", params: { prefix: "x" } }] });
    render(<AppLayout><Dashboard /></AppLayout>); const user = userEvent.setup();
    expect(screen.queryByRole("link", { name: "Continuar en Transformación" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reingresar credenciales" }));
    await user.type(screen.getByLabelText("Contraseña · Origen principal"), "only-in-memory"); await user.click(screen.getByRole("button", { name: "Guardar contraseñas" }));
    expect(screen.getByRole("link", { name: "Continuar en Transformación" })).toBeVisible(); expect(screen.queryByRole("link", { name: "Ir a Carga" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("only-in-memory"); expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).recipe[0].id).toBe("kept");
  });
  it("restoration error is recoverable and leaves navigation usable", async () => {
    sessionStorage.setItem(SESSION_KEY, "{invalid"); render(<AppLayout><Dashboard /></AppLayout>);
    expect(screen.getByRole("alert")).toHaveTextContent(/inválida/);
    expect(within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    await userEvent.click(screen.getByRole("button", { name: "Restablecer sesión" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("optional source label round-trips, legacy records still restore and arbitrary fields are discarded", () => {
    save({ source: date, history }); const raw = JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
    raw.history[0].password = "must-disappear"; sessionStorage.setItem(SESSION_KEY, JSON.stringify(raw));
    const restored = hydrateSession(sessionStorage, new CredentialStore());
    expect(restored.history[0].sourceLabel).toBe(history[0].sourceLabel); expect(restored.history[1].sourceLabel).toBeUndefined(); expect(JSON.stringify(restored.history)).not.toContain("must-disappear");
  });
  it("corrupt history preserves a valid pipeline and stored evidence until separately confirmed deletion", async () => {
    save({ source: date, recipe: [{ id: "kept", type: "prefix_header", params: { prefix: "x" } }] });
    const raw = JSON.parse(sessionStorage.getItem(SESSION_KEY)!); raw.history = [{ bad: true }];
    const original = JSON.stringify(raw); sessionStorage.setItem(SESSION_KEY, original);
    render(<AppLayout><Dashboard /></AppLayout>); const user = userEvent.setup();
    expect(screen.getByRole("alert")).toHaveTextContent(/historial.*pipeline sigue disponible/i);
    expect(screen.getByRole("heading", { name: "Historial pendiente de recuperación" })).toBeVisible();
    expect(within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", { name: "Transformación" })).toHaveAttribute("href", "/transform");
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(original);
    await user.click(screen.getByRole("button", { name: "Borrar historial de esta pestaña" })); await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(original);
    await user.click(screen.getByRole("button", { name: "Borrar historial de esta pestaña" })); await user.click(screen.getByRole("button", { name: "Borrar resúmenes" }));
    const restored = JSON.parse(sessionStorage.getItem(SESSION_KEY)!); expect(restored.source).toEqual(date); expect(restored.recipe[0].id).toBe("kept"); expect(restored.history).toEqual([]); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

function SessionReader() {
  const session = usePipelineSession();
  return <output aria-label="Sesión leída">{session.state.source?.type || "vacía"} · {session.state.history.length} intentos · {session.agentId} · {session.credentials.has("primary") ? "secreto presente" : "sin secreto"}</output>;
}
function Credentials() {
  const { recoverCredentials } = usePipelineSession();
  return <button onClick={() => recoverCredentials({ primary: "synthetic-only" })}>Recuperar secreto de prueba</button>;
}
describe("shell actions, routing and keyboard", () => {
  it("sidebar route and step route use independent aria-current and blocked links have no href", () => {
    resetNavigation("/load"); render(<AppLayout><p>Ruta directa</p></AppLayout>);
    for (const name of ["Navegación principal", "Etapas del pipeline"]) {
      const load = within(screen.getByRole("navigation", { name })).getByRole("link", { name: "Carga" });
      expect(load).toHaveAttribute("aria-disabled", "true"); expect(load).not.toHaveAttribute("href"); expect(load).toHaveAttribute("aria-current", name === "Navegación principal" ? "page" : "step");
    }
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Bodega de Datos|Monitoreo/ })).not.toBeInTheDocument();
  });
  it("mobile navigation opens with expanded state, closes on route selection and restores trigger focus", async () => {
    render(<AppLayout><p>Contenido</p></AppLayout>); const user = userEvent.setup(); const trigger = screen.getByRole("button", { name: "Abrir navegación" });
    await user.click(trigger); expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Navegación" });
    const settings = within(dialog).getByRole("link", { name: "Configuración" });
    expect(settings).toHaveAttribute("href", "/settings");
    // jsdom cannot navigate; keep the real link and React close/focus handler.
    settings.addEventListener("click", event => event.preventDefault());
    await user.click(settings);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(trigger).toHaveAttribute("aria-expanded", "false"); expect(trigger).toHaveFocus();
    await user.click(trigger); fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true })); expect(trigger).toHaveFocus();
  });
  it("keyboard reaches skip link, activates navigation and resizing to desktop closes the modal", async () => {
    const media = mockMedia(); render(<AppLayout><p>Contenido</p></AppLayout>); const user = userEvent.setup();
    await user.tab(); expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveFocus();
    screen.getByRole("button", { name: "Abrir navegación" }).focus(); await user.keyboard("{Enter}"); expect(screen.getByRole("dialog")).toBeVisible();
    act(() => media.change("(min-width: 768px)", true)); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("new process without work opens extraction immediately", async () => {
    render(<AppLayout><Dashboard /></AppLayout>); await userEvent.click(screen.getByRole("button", { name: "Nuevo proceso" }));
    expect(router.push).toHaveBeenCalledWith("/extract"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each(["Nuevo proceso", "Limpiar pipeline"])("%s shares discard dialog; cancel preserves work, reset keeps history and agent, clears secrets across routes", async label => {
    localStorage.setItem("etl_agent_id", "agent-existing"); save({ source: db, history: [history[0]] });
    function Routes() { const [route, setRoute] = useState(false); return <><button onClick={() => setRoute(!route)}>Otra ruta</button>{route ? <SessionReader /> : <><Dashboard /><Credentials /><SessionReader /></>}</>; }
    render(<AppLayout><Routes /></AppLayout>); const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Recuperar secreto de prueba" }));
    await user.click(screen.getByRole("button", { name: label })); expect(screen.getByRole("dialog", { name: "Reiniciar pipeline" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(screen.getByLabelText("Sesión leída")).toHaveTextContent("database · 1 intentos · agent-existing · secreto presente");
    await user.click(screen.getByRole("button", { name: label })); await user.click(screen.getByRole("button", { name: "Reiniciar e ir a Extracción" }));
    await user.click(screen.getByRole("button", { name: "Otra ruta" })); expect(screen.getByLabelText("Sesión leída")).toHaveTextContent("vacía · 1 intentos · agent-existing · sin secreto"); expect(router.push).toHaveBeenCalledWith("/extract");
  });
  it("history deletion does not reset the pipeline or credentials", async () => {
    save({ source: db, history: [history[0]] }); render(<AppLayout><Dashboard /><Credentials /><SessionReader /></AppLayout>); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Recuperar secreto de prueba" })); await user.click(screen.getByRole("button", { name: "Borrar historial de esta pestaña" })); await user.click(screen.getByRole("button", { name: "Borrar resúmenes" }));
    expect(screen.getByLabelText("Sesión leída")).toHaveTextContent(/database · 0 intentos.*secreto presente/);
  });
});
