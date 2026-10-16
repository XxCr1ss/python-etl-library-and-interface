import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import ExtractPage from "@/app/(app)/extract/page";
import TransformPage from "@/app/(app)/transform/page";
import { ExtractPreviewSection } from "@/app/(app)/extract/components/ExtractPreviewSection";
import { PipelineProvider } from "@/state/PipelineProvider";
import { PipelineStepper } from "@/components/layout/PipelineStepper";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { SESSION_KEY } from "@/state/pipelineStorage";
import { HybridAgentInstructions, agentBackendUrl, agentSocketUrl } from "@/components/etl/HybridAgentInstructions";
import { databaseConnection, initialDatabaseDraft, updateDatabaseDraft, validateDatabaseDraft } from "@/components/etl/DatabaseConnectionFields";
import { server } from "./mocks/server";
import { API_URL, fileSource, previewResponse, uploadResponse } from "./fixtures/api";
import { resetNavigation, router } from "./navigation";

vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
const metadata = { status: "success", message: "OK", tables: ["A", "B"], schema_preview: {} };
const empty = { status: "success", total_rows: 0, preview_data: [] };
const sample = (value: string) => ({ status: "success", total_rows: 1, preview_data: [{ id: value }] });
function mount() { resetNavigation(); return render(<PipelineProvider><ExtractPage /></PipelineProvider>); }
async function databaseForm() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: "Base de Datos Relacional" }));
  await user.type(screen.getByLabelText("Base de datos"), "synthetic");
  await user.type(screen.getByLabelText("Usuario"), "tester");
  await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
  return user;
}
async function dateForm() {
  const user = userEvent.setup(); await user.click(screen.getByRole("tab", { name: /Dimensión Temporal/ }));
  for (const name of ["Año inicial", "Año final"]) { await user.clear(screen.getByLabelText(name)); await user.type(screen.getByLabelText(name), "2024"); }
  return user;
}

describe("extracción por pestaña", () => {
  it.each(["input", "drop"])("%s sube el mismo multipart con MIME vacío y muestra escalares JSON seguros", async mode => {
    let body: File | undefined;
    server.use(http.post(`${API_URL}/extract/upload`, async ({ request }) => {
      body = (await request.formData()).get("file") as File;
      return HttpResponse.json({ ...uploadResponse, preview_data: [{ cero: 0, falso: false, vacío: "", nulo: null, lista: [0, false], objeto: { a: "<script>" } }] });
    }));
    mount(); const user = userEvent.setup(); const file = new File(["id\n1"], "datos.CSV");
    if (mode === "input") await user.upload(screen.getByLabelText("Archivo de origen"), file);
    else fireEvent.drop(screen.getByRole("group", { name: "Selección de archivo" }), { dataTransfer: { files: [file] } });
    expect(screen.getByText(/datos.CSV · 4 bytes/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" }));
    await screen.findByRole("cell", { name: "0" });
    for (const name of ["false", "Texto vacío", "NULL", "[0,false]", '{"a":"<script>"}']) expect(screen.getByRole("cell", { name })).toBeVisible();
    expect(body?.name).toBe("datos.CSV"); expect(await body!.text()).toBe("id\n1");
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(stored().source.filepath).toBe(uploadResponse.filepath); expect(router.push).toHaveBeenCalledWith("/transform");
  });
  it("rechaza selección múltiple y extensión inválida; retirar archivo invalida resultado", async () => {
    mount(); const user = userEvent.setup({ applyAccept: false });
    const picker = screen.getByRole("group", { name: "Selección de archivo" });
    fireEvent.drop(picker, { dataTransfer: { files: [new File([], "a.csv"), new File([], "b.csv")] } });
    expect(screen.getByText("Selecciona un solo archivo por vez.")).toBeVisible();
    await user.upload(screen.getByLabelText("Archivo de origen"), new File([], "datos.parquet"));
    expect(screen.getByText(/Formato no soportado/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Procesar Archivo" })).toBeDisabled();
    await user.upload(screen.getByLabelText("Archivo de origen"), new File([], "a.csv"));
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" })); await screen.findByText("Archivo procesado exitosamente para vista previa.");
    await user.click(screen.getByRole("button", { name: "Eliminar selección" }));
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
    expect(stored().source).toBeNull();
  });
  it("un corrupto no sustituye fuente activa ni receta", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "prefix_header", params: { prefix: "pre_" } }]));
    server.use(http.post(`${API_URL}/extract/upload`, () => HttpResponse.json({ detail: "Archivo corrupto" }, { status: 400 })));
    mount(); const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Archivo de origen"), new File(["bad"], "bad.xlsx"));
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" })); await screen.findByText("Archivo corrupto");
    expect(stored().source.filepath).toBe(fileSource.filepath); expect(stored().recipe).toHaveLength(1);
    expect(router.push).not.toHaveBeenCalled();
  });
  it("cambiar pestaña aborta upload; volver conserva selección y exige nueva preview", async () => {
    let release!: () => void; let calls = 0;
    server.use(http.post(`${API_URL}/extract/upload`, async () => { calls++; await new Promise<void>(r => { release = r; }); return HttpResponse.json(uploadResponse); }));
    mount(); const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Archivo de origen"), new File([], "A.csv"));
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" })); await waitFor(() => expect(calls).toBe(1));
    await user.click(screen.getByRole("tab", { name: /Dimensión Temporal/ }));
    await act(async () => release());
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Archivo Local" }));
    expect(screen.getByText(/A.csv · 0 bytes/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
  });
  it("BD A→B muestra B aunque A termine después y editar conexión retira tablas y preview", async () => {
    let release!: () => void; let calls = 0;
    server.use(http.post(`${API_URL}/extract/database`, () => HttpResponse.json(metadata)),
      http.post(`${API_URL}/extract/database/preview`, async ({ request }) => {
        const body = await request.json() as { table_name: string }; calls++;
        if (body.table_name === "A") await new Promise<void>(r => { release = r; });
        return HttpResponse.json(sample(body.table_name === "A" ? "vieja A" : "actual B"));
      }));
    mount(); const user = await databaseForm();
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    await user.selectOptions(await screen.findByLabelText("Tabla de origen"), "A"); await waitFor(() => expect(calls).toBe(1));
    await user.selectOptions(screen.getByLabelText("Tabla de origen"), "B");
    await screen.findByRole("cell", { name: "actual B" }); await act(async () => release());
    expect(screen.queryByRole("cell", { name: "vieja A" })).not.toBeInTheDocument();
    expect(screen.getByText(/1 filas de muestra; total sin consultar/)).toBeVisible();
    await user.type(screen.getByLabelText("Host"), "2");
    expect(screen.queryByLabelText("Tabla de origen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
  });
  it.each(["postgresql", "mysql", "oracle"] as const)("%s confirma DTO/credencial en memoria y jamás la persiste", async engine => {
    const secret = "synthetic-runtime-only"; let payload: unknown; let transformed: unknown;
    const log = vi.spyOn(console, "log"); const errorLog = vi.spyOn(console, "error");
    server.use(http.post(`${API_URL}/extract/database`, async ({ request }) => { payload = await request.json(); return HttpResponse.json(metadata); }),
      http.post(`${API_URL}/extract/database/preview`, () => HttpResponse.json(empty)),
      http.post(`${API_URL}/transform/preview`, async ({ request }) => { transformed = await request.json(); return HttpResponse.json({ ...previewResponse, preview_data: [], total_rows: 0 }); }));
    const view = mount(); const user = await databaseForm();
    await user.selectOptions(screen.getByLabelText("Motor de base de datos"), engine);
    await user.type(screen.getByLabelText("Contraseña"), secret);
    if (engine === "oracle") await user.type(screen.getByLabelText("Service name (Oracle)"), "XEPDB1");
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    await user.selectOptions(await screen.findByLabelText("Tabla de origen"), "B");
    await screen.findByText(/No hay esquema disponible/);
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    const expected = { db_type: engine, host: "localhost", port: { postgresql: 5432, mysql: 3306, oracle: 1521 }[engine], database: "synthetic", user: "tester", password: secret, service_name: engine === "oracle" ? "XEPDB1" : null, use_agent: false, agent_id: null };
    expect(payload).toEqual(expected); expect(stored().source.count).toEqual({ kind: "sample", value: 0 });
    expect(sessionStorage.getItem(SESSION_KEY)).not.toContain(secret); expect(JSON.stringify(localStorage)).not.toContain(secret);
    expect(document.body.textContent).not.toContain(secret); expect(log).not.toHaveBeenCalled(); expect(errorLog).not.toHaveBeenCalled();
    view.rerender(<PipelineProvider><TransformPage /></PipelineProvider>);
    await waitFor(() => expect(transformed).toEqual({ source: { type: "database", ...expected, table_name: "B" }, steps: [], limit: 10 }));
  });
  it("cero tablas es éxito; error de conexión es recuperable y conserva borrador", async () => {
    server.use(http.post(`${API_URL}/extract/database`, () => HttpResponse.json({ ...metadata, tables: [] })));
    mount(); const user = await databaseForm(); await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    expect(await screen.findByText(/0 tablas disponibles/)).toBeVisible();
    server.use(http.post(`${API_URL}/extract/database`, () => HttpResponse.error()));
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    expect(await screen.findByText(/No se pudo confirmar la respuesta/)).toBeVisible();
    expect(screen.getByLabelText("Base de datos")).toHaveValue("synthetic");
    expect(stored().source).toBeNull();
  });
  it("tabla vacía utiliza columnas de metadata sin inventarlas", async () => {
    server.use(http.post(`${API_URL}/extract/database`, () => HttpResponse.json({ ...metadata, schema_preview: { B: ["id", "amount"] } })),
      http.post(`${API_URL}/extract/database/preview`, () => HttpResponse.json(empty)));
    mount(); const user = await databaseForm();
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    await user.selectOptions(await screen.findByLabelText("Tabla de origen"), "B");
    expect(await screen.findByRole("columnheader", { name: "amount" })).toBeVisible();
    expect(screen.getByText(/Se muestran las columnas disponibles/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
  });
  it("conserva ID existente, bloquea agente desconocido y aborta extracción si deja de estar conectado", async () => {
    localStorage.setItem("etl_agent_id", "existing-agent");
    let state: "error" | "connected" | "disconnected" = "error"; let queried = ""; let calls = 0; let release!: () => void;
    server.use(http.get(`${API_URL}/extract/agent/status/:id`, ({ params }) => {
      queried = String(params.id);
      return state === "error" ? HttpResponse.error() : HttpResponse.json({ agent_id: params.id, connected: state === "connected" });
    }), http.post(`${API_URL}/extract/database`, async () => { calls++; await new Promise<void>(r => { release = r; }); return HttpResponse.json(metadata); }));
    mount(); const user = await databaseForm();
    await user.click(screen.getByLabelText("Usar agente local híbrido"));
    expect(await screen.findByText("No se pudo consultar el agente")).toBeVisible();
    expect(queried).toBe("existing-agent"); expect(screen.getByText("existing-agent")).toBeVisible();
    expect(screen.getByRole("button", { name: "Conectar y listar tablas" })).toBeDisabled();
    state = "connected"; await user.click(screen.getByRole("button", { name: "Reintentar estado del agente" }));
    await screen.findByText("Agente conectado");
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" })); await waitFor(() => expect(calls).toBe(1));
    state = "disconnected"; await user.click(screen.getByRole("button", { name: "Reintentar estado del agente" }));
    await screen.findByText("Agente desconectado"); await act(async () => release());
    expect(screen.getByLabelText("Base de datos")).toHaveValue("synthetic");
    expect(screen.queryByLabelText("Tabla de origen")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar y listar tablas" })).toBeDisabled();
    expect(screen.getByText(/El agente dejó de estar disponible/)).toBeVisible();
  });
  it("valida enteros y campos requeridos sin enviar defaults ocultos", async () => {
    let calls = 0;
    server.use(http.post(`${API_URL}/extract/database`, () => { calls++; return HttpResponse.json(metadata); }));
    mount(); const user = userEvent.setup(); await user.click(screen.getByRole("tab", { name: "Base de Datos Relacional" }));
    await user.clear(screen.getByLabelText("Host")); await user.clear(screen.getByLabelText("Puerto")); await user.type(screen.getByLabelText("Puerto"), "5432abc");
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    expect(screen.getByLabelText("Host")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Puerto")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-invalid", "true"); expect(calls).toBe(0);
  });
  it("fecha 2024–2024 conserva años en sesión y Transform; editar invalida resultado", async () => {
    let years: unknown; let transformed: unknown;
    server.use(http.post(`${API_URL}/extract/date-dimension/preview`, async ({ request }) => { years = await request.json(); return HttpResponse.json({ ...empty, total_rows: 366 }); }),
      http.post(`${API_URL}/transform/preview`, async ({ request }) => { transformed = await request.json(); return HttpResponse.json({ ...previewResponse, total_rows: 366 }); }));
    const view = mount(); const user = await dateForm();
    await user.click(screen.getByRole("button", { name: "Generar dimensión fecha" }));
    await screen.findByText("Resultado: Dimensión fecha 2024–2024");
    expect(years).toEqual({ start_year: 2024, end_year: 2024 });
    await user.type(screen.getByLabelText("Año final"), "5");
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Año final")); await user.type(screen.getByLabelText("Año final"), "2024");
    await user.click(screen.getByRole("button", { name: "Generar dimensión fecha" }));
    await user.click(await screen.findByRole("button", { name: "Continuar a Transformación" }));
    expect(stored().source).toMatchObject({ type: "date_dimension", start_year: 2024, end_year: 2024, count: { kind: "dataset", value: 366 } });
    view.rerender(<PipelineProvider><TransformPage /></PipelineProvider>);
    await waitFor(() => expect(transformed).toEqual({ source: { type: "date_dimension", start_year: 2024, end_year: 2024 }, steps: [], limit: 10 }));
  });
  it.each([["99", "2024"], ["2024.5", "2025"], ["2025", "2024"], ["2024", "10000"]])("fecha inválida %s–%s no permite preview", async (start, end) => {
    mount(); const user = await dateForm();
    for (const [label, value] of [["Año inicial", start], ["Año final", end]]) { await user.clear(screen.getByLabelText(label)); await user.type(screen.getByLabelText(label), value); }
    await user.click(screen.getByRole("button", { name: "Generar dimensión fecha" }));
    expect(screen.getAllByText(/Usa un año entero|El año final debe/).length).toBeGreaterThan(0);
    expect(stored().source).toBeNull();
  });
  it("reemplazo cancelado conserva receta, preview y destino; confirmado limpia todo atómicamente", async () => {
    function Seed() { const s = usePipelineSession(); return <><button onClick={() => { s.confirmSource(fileSource); s.addStep({ type: "prefix_header", params: { prefix: "x" } }); s.setTarget({ db_type: "postgresql", host: "localhost", database: "db", user: "u", password: "" }); s.setLoadConfig({ table_name: "dim_x", table_type: "dimension", foreign_keys: { id: ["dim", "pk"] } }); void s.runPreview(10); void s.testTarget(); }}>Preparar sesión</button><output aria-label="Dependencias">{s.state.preview.status} / {s.state.targetCheckedVersion === s.state.targetVersion ? "comprobado" : "pendiente"}</output></>; }
    server.use(http.post(`${API_URL}/extract/date-dimension/preview`, () => HttpResponse.json(empty)));
    render(<PipelineProvider><Seed /><ExtractPage /></PipelineProvider>);
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Preparar sesión" }));
    await screen.findByText("success / comprobado");
    const before = sessionStorage.getItem(SESSION_KEY);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await dateForm(); await user.click(screen.getByRole("button", { name: "Generar dimensión fecha" }));
    await user.click(await screen.findByRole("button", { name: "Continuar a Transformación" }));
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(before);
    expect(screen.getByLabelText("Dependencias")).toHaveTextContent("success / comprobado");
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("1 pasos"));
    confirm.mockReturnValue(true); await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(stored().recipe).toEqual([]); expect(stored().target.database).toBe("db"); expect(stored().loadConfig.foreign_keys).toBeUndefined();
    expect(screen.getByLabelText("Dependencias")).toHaveTextContent("pending / pendiente");
  });
  it("stepper solo habilita Transform al confirmar y reclicar la pestaña activa conserva preview", async () => {
    server.use(http.post(`${API_URL}/extract/date-dimension/preview`, () => HttpResponse.json(empty)));
    render(<PipelineProvider><PipelineStepper /><ExtractPage /></PipelineProvider>);
    const user = await dateForm();
    const stepper = within(screen.getByRole("navigation", { name: "Etapas del pipeline" }));
    expect(stepper.getByRole("link", { name: "Transformación" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Generar dimensión fecha" }));
    await screen.findByRole("button", { name: "Continuar a Transformación" });
    await user.click(screen.getByRole("tab", { name: /Dimensión Temporal/ }));
    expect(screen.getByRole("button", { name: "Continuar a Transformación" })).toBeEnabled();
    expect(stepper.getByRole("link", { name: "Transformación" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(stepper.getByRole("link", { name: "Transformación" })).toHaveAttribute("href", "/transform");
  });
  it("el archivo temporal ausente en Transform ofrece volver a subir", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ detail: "Archivo no encontrado" }, { status: 404 })));
    render(<PipelineProvider><TransformPage /></PipelineProvider>);
    expect(await screen.findByRole("link", { name: "vuelve a subir el archivo" })).toHaveAttribute("href", "/extract");
  });
});

describe("primitivas de origen reutilizables", () => {
  it("cambia puertos automáticos, conserva personalizados y serializa vacío como null", () => {
    let draft = initialDatabaseDraft;
    draft = updateDatabaseDraft(draft, { db_type: "mysql" }); expect(draft.port).toBe("3306");
    draft = updateDatabaseDraft(draft, { db_type: "oracle" }); expect(draft.port).toBe("1521");
    draft = updateDatabaseDraft(draft, { port: "15432" });
    draft = updateDatabaseDraft(draft, { db_type: "postgresql" }); expect(draft.port).toBe("15432");
    draft = updateDatabaseDraft(draft, { port: "", password: "", database: "db", user: "u" });
    expect(databaseConnection(draft, "id").port).toBeNull(); expect(validateDatabaseDraft(draft)).toEqual({});
    expect(updateDatabaseDraft(draft, { db_type: "oracle" }).port).toBe("1521");
    for (const port of ["0", "65536", "1.2", "NaN"]) expect(validateDatabaseDraft({ ...draft, port }).port).toBeDefined();
  });
  it("preview vacía con columnas preservadas permite continuar", async () => {
    const next = vi.fn(); render(<ExtractPreviewSection status="success" error={null} columns={["id", "amount"]} count={{ kind: "sample", value: 0 }} label="vacía" disabled={false} onContinue={next} />);
    expect(screen.getByRole("columnheader", { name: "amount" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Continuar a Transformación" })); expect(next).toHaveBeenCalledOnce();
  });
  it("instrucciones reales sin flags; error de clipboard visible y copia sin secretos", async () => {
    const user = userEvent.setup(); const write = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denegado"));
    render(<HybridAgentInstructions agentId="existing-id" status="error" error="Error de red" onRetry={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copiar instrucciones" })); expect(await screen.findByText(/No se pudo copiar/)).toBeVisible();
    write.mockResolvedValueOnce(); await user.click(screen.getByRole("button", { name: "Copiar instrucciones" }));
    expect(await screen.findByText("Instrucciones copiadas.")).toBeVisible();
    expect(write).toHaveBeenLastCalledWith(`Desde la raíz del proyecto: python etl_agent.py\nURL del backend: ${agentBackendUrl}\nIdentificador de agente: existing-id`);
    expect(agentBackendUrl).toBe("http://localhost:8000"); expect(agentSocketUrl).toBe("ws://localhost:8000/api/v1/ws/agent/");
    expect(within(screen.getByRole("alert")).getByText("Error de red")).toBeVisible();
  });
});
