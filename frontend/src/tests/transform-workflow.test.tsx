import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { render, screen, userEvent, waitFor, within } from "./render";
import { mockDialogMethods } from "./dialog";
import { PipelineProvider } from "@/state/PipelineProvider";
import { SESSION_KEY, persistedSession } from "@/state/pipelineStorage";
import { initialState } from "@/state/pipelineReducer";
import type { StepDto, TransformStep } from "@/types/etl";
import TransformPage from "@/app/(app)/transform/page";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
let restore: () => void;
beforeEach(() => { restore = mockDialogMethods(); });
afterEach(() => { cleanup(); restore(); });
const rename: TransformStep = { id: "rename-id", type: "rename_columns", params: { columns: { a: "x" } } };
const filter: TransformStep = { id: "filter-id", type: "filter_value", params: { column: "x", value: 0 } };
function seed(recipe: TransformStep[] = [rename, filter]) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession({ ...initialState, hydrationStatus: "ready", source: { type: "file", filepath: "/synthetic/main.csv" }, recipe }))); }
const saved = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!).recipe;
function preview(steps: StepDto[]) {
  let columns = ["a", "b"];
  for (const step of steps) {
    if (step.type === "rename_columns") columns = columns.map(c => String((step.params.columns as Record<string, string>)[c] ?? c));
    if (step.type === "filter_value" && !columns.includes(String(step.params.column))) return HttpResponse.json({ detail: "La columna x no existe antes del filtro" }, { status: 400 });
  }
  return HttpResponse.json({ status: "success", columns, dtypes: Object.fromEntries(columns.map(c => [c, "int64"])), preview_data: [{ [columns[0]]: 0 }], total_rows: 1 });
}
function setup() {
  const requests: { limit: number; steps: StepDto[] }[] = [];
  server.use(http.post(`${API_URL}/transform/preview`, async ({ request }) => { const body = await request.json() as { limit: number; steps: StepDto[] }; requests.push(body); return preview(body.steps); }));
  render(<PipelineProvider><TransformPage /></PipelineProvider>); return requests;
}

it("editar i usa solo su prefijo, no valida el pipeline; cancelar conserva receta e ID", async () => {
  seed(); const requests = setup(); const user = userEvent.setup(); await screen.findByRole("columnheader", { name: /x int64/ });
  const before = saved(); await user.click(screen.getByRole("button", { name: /Editar paso 1:/ }));
  const column = await screen.findByRole("combobox", { name: "Columna Original" }); expect(column).toHaveValue("a");
  expect(within(column).queryByRole("option", { name: "x" })).not.toBeInTheDocument();
  expect(requests.filter(r => r.limit === 1)).toEqual([{ source: { type: "file", filepath: "/synthetic/main.csv" }, steps: [], limit: 1 }]);
  await user.type(screen.getByRole("textbox", { name: "Nuevo Nombre" }), "y"); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(saved()).toEqual(before);
  await user.click(screen.getByRole("button", { name: /Editar paso 2:/ })); await screen.findByRole("combobox", { name: "Columna" });
  expect(requests.filter(r => r.limit === 1).at(-1)?.steps).toEqual([{ type: rename.type, params: rename.params }]);
  await user.clear(screen.getByRole("textbox", { name: "Valor" })); await user.type(screen.getByRole("textbox", { name: "Valor" }), "1");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" })); expect(saved()[1]).toEqual({ ...filter, params: { column: "x", value: 1 } });
  expect(saved().map((s: TransformStep) => s.id)).toEqual(["rename-id", "filter-id"]);
});
it("reordenar conserva IDs, conserva pasos inválidos, bloquea carga y permite deshacer", async () => {
  seed(); setup(); const user = userEvent.setup(); await screen.findByRole("columnheader", { name: /x int64/ });
  expect(screen.getByRole("button", { name: /Subir paso 1:/ })).toBeDisabled(); expect(screen.getByRole("button", { name: /Bajar paso 2:/ })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /Subir paso 2:/ })); expect(saved().map((s: TransformStep) => s.id)).toEqual(["filter-id", "rename-id"]);
  expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "true");
  expect(await screen.findByText("La columna x no existe antes del filtro")).toBeVisible(); expect(saved()).toHaveLength(2); expect(screen.getByText(/Datos desactualizados/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Deshacer última modificación" })); expect(saved()).toEqual([rename, filter]);
  await waitFor(() => expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "false"));
});
it("eliminar confirma dependencias, cancelar conserva; deshacer recupera el mismo ID", async () => {
  seed(); setup(); const user = userEvent.setup(); await screen.findByRole("columnheader", { name: /x int64/ });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.click(screen.getAllByRole("button", { name: "Eliminar este paso" })[1]); expect(saved()).toEqual([rename, filter]);
  confirm.mockReturnValue(true); await user.click(screen.getAllByRole("button", { name: "Eliminar este paso" })[1]); expect(saved()).toEqual([rename]);
  await user.click(screen.getByRole("button", { name: "Deshacer última modificación" })); expect(saved()).toEqual([rename, filter]);
});
it("prefijo fallido conserva receta y readiness pendiente; reintento no publica preview final", async () => {
  seed([rename]); let finalCalls = 0; let prefixCalls = 0; const before = saved();
  server.use(http.post(`${API_URL}/transform/preview`, async ({ request }) => {
    const body = await request.json() as { limit: number; steps: StepDto[] };
    if (body.limit === 1) { prefixCalls++; return prefixCalls === 1 ? HttpResponse.json({ detail: "Prefijo fallido" }, { status: 400 }) : preview([]); }
    finalCalls++; return HttpResponse.json({ detail: "Preview final fallida" }, { status: 400 });
  }));
  render(<PipelineProvider><TransformPage /></PipelineProvider>); const user = userEvent.setup(); await screen.findByText("Preview final fallida");
  await user.click(screen.getByRole("button", { name: /Editar paso 1:/ })); await screen.findByText("Prefijo fallido"); expect(saved()).toEqual(before);
  await user.click(screen.getByRole("button", { name: "Reintentar esquema" })); await screen.findByRole("combobox", { name: "Columna Original" });
  expect(finalCalls).toBe(1); expect(prefixCalls).toBe(2); expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(saved()).toEqual(before);
});
it("cambiar tipo confirma descarte; reabrir Agregar limpia los borradores", async () => {
  seed([]); setup(); const user = userEvent.setup(); await screen.findByRole("columnheader", { name: /a int64/ });
  await user.click(screen.getByRole("button", { name: "Agregar Transformación" }));
  await user.type(screen.getByRole("textbox", { name: "Nuevo Nombre" }), "borrador");
  await user.type(screen.getByRole("textbox", { name: "Buscar operación" }), "prefix_header");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); await user.click(screen.getByRole("button", { name: "Agregar Prefijo" }));
  expect(screen.getByRole("textbox", { name: "Nuevo Nombre" })).toHaveValue("borrador");
  confirm.mockReturnValue(true); await user.click(screen.getByRole("button", { name: "Agregar Prefijo" })); expect(screen.queryByRole("textbox", { name: "Nuevo Nombre" })).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Prefijo" }), "pre_"); await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(saved()).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Agregar Transformación" })); expect(screen.getByRole("textbox", { name: "Nuevo Nombre" })).toHaveValue("");
});
it("fuente expirada conserva receta, muestra error HTTP y guía a reextracción", async () => {
  seed([rename]); server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ detail: "Archivo temporal ausente" }, { status: 404 })));
  render(<PipelineProvider><TransformPage /></PipelineProvider>);
  await screen.findByText("Archivo temporal ausente"); expect(saved()).toEqual([rename]); expect(screen.getByRole("link", { name: "vuelve a subir el archivo" })).toHaveAttribute("href", "/extract");
  expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "true");
});
it("BD secundaria Oracle/agente usa contraseña en memoria; cancelar y deshacer no pierden secretos", async () => {
  seed([]); setup(); const user = userEvent.setup(); const bodies: unknown[] = [];
  server.use(
    http.get(`${API_URL}/extract/agent/status/:agentId`, ({ params }) => HttpResponse.json({ agent_id: params.agentId, connected: true })),
    http.post(`${API_URL}/extract/database`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json({ status: "success", message: "Conexión sintética", tables: ["secondary"], schema_preview: { secondary: ["id"] } }); }),
    http.post(`${API_URL}/extract/database/preview`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json({ status: "success", table_name: "secondary", total_rows: 1, preview_data: [{ id: 1 }] }); }),
  );
  await screen.findByRole("columnheader", { name: /a int64/ }); await user.click(screen.getByRole("button", { name: "Agregar Transformación" }));
  await user.type(screen.getByRole("textbox", { name: "Buscar operación" }), "union"); await user.click(screen.getByRole("button", { name: "Unión Vertical" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de fuente secundaria" }), "database");
  await user.selectOptions(screen.getByRole("combobox", { name: "Motor de base de datos" }), "oracle");
  expect(screen.getByRole("textbox", { name: "Puerto" })).toHaveValue("1521");
  await user.type(screen.getByRole("textbox", { name: "Base de datos" }), "test"); await user.type(screen.getByRole("textbox", { name: "Usuario" }), "synthetic");
  await user.type(screen.getByLabelText("Contraseña"), "synthetic-secret"); await user.type(screen.getByRole("textbox", { name: "Service name (Oracle)" }), "XE");
  await user.click(screen.getByRole("checkbox", { name: "Usar agente local híbrido" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Conectar y listar tablas" })).toBeEnabled()); await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
  await user.selectOptions(await screen.findByRole("combobox", { name: "Tabla secundaria" }), "secondary");
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar fuente secundaria" })).toBeEnabled()); await user.click(screen.getByRole("button", { name: "Confirmar fuente secundaria" }));
  expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Aplicar Operación" }));
  expect(saved()[0].params.secondary_source).toMatchObject({ type: "database", db_type: "oracle", service_name: "XE", port: 1521, use_agent: true });
  expect(JSON.stringify(bodies)).toContain("synthetic-secret"); expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("synthetic-secret"); expect(document.body.textContent).not.toContain("synthetic-secret");
  vi.spyOn(window, "confirm").mockReturnValue(true); const id = saved()[0].id;
  await user.click(screen.getByRole("button", { name: "Eliminar este paso" })); expect(saved()).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Deshacer última modificación" })); expect(saved()[0].id).toBe(id);
  await waitFor(() => expect(screen.getByRole("link", { name: /Continuar a la Carga/ })).toHaveAttribute("aria-disabled", "false"));
  expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("synthetic-secret");
});
