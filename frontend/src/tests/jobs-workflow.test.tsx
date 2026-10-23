import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { JobSessionProvider, manifestResponse } from "@/features/jobs/JobSessionProvider";
import JobsPage from "@/app/(app)/jobs/page";
import type { JobDefinition } from "@/types/jobs";

function Controls() {
  const s = usePipelineSession();
  function prepare(table: string) {
    if (!s.state.source) s.confirmSource({ type: "date_dimension", start_year: 2026, end_year: 2026 });
    s.setTarget({ db_type: "postgresql", host: "localhost", database: "synthetic", user: "writer", password: "runtime-only" });
    s.setLoadConfig({ table_name: table, table_type: "dimension", if_exists: "fail", schema_spec: { version: 1, grain: "one entity", columns: [{ name: "id", type: "integer", nullable: false }], primary_key: ["id"], unique_keys: [], indexes: [], foreign_keys: [], checks: [] } });
    const revision = s.snapshot().revision;
    s.dispatch({ type: "previewStart", revision, requestId: "job" });
    s.dispatch({ type: "previewSuccess", revision, requestId: "job", data: { status: "success", columns: ["id"], dtypes: { id: "Int64" }, total_rows: 2, preview_data: [] } });
  }
  return <><button onClick={() => prepare("first_table")}>Prepare first</button><button onClick={() => prepare("second_table")}>Prepare second</button><button onClick={s.reset}>Reset pipeline</button></>;
}

async function setup() {
  render(<PipelineProvider><JobSessionProvider><Controls /><JobsPage /></JobSessionProvider></PipelineProvider>);
  const user = userEvent.setup();
  await user.click(screen.getByText("Prepare first"));
  await user.click(screen.getByRole("button", { name: "Agregar pipeline actual como salida" }));
  return user;
}

describe("multi-output ETL", () => {
  it("recovers a manifest from the context history after navigation", async () => {
    const id = "85c0f9dc-e040-4a4c-93dc-dbf0474c7ef9";
    server.use(http.get(`${API_URL}/jobs`, () => HttpResponse.json({ version: 1, runs: [{ run_id: id, title: "Recovered job", status: "partial", preview_only: false }] })),
      http.get(`${API_URL}/jobs/${id}`, () => HttpResponse.json({ version: 1, run_id: id, status: "partial", preview_only: false, nodes: { first: { status: "unknown" } } })));
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Actualizar historial de trabajos" }));
    await user.click(await screen.findByRole("button", { name: `Abrir ejecución ${id}` }));
    await screen.findByText("unknown");
    expect(screen.getByLabelText(/He revisado los destinos y las escrituras inciertas/)).not.toBeChecked();
  });
  it("captures outputs independently and distinguishes validation from loading", async () => {
    const requests: Record<string, unknown>[] = [];
    server.use(http.post(`${API_URL}/jobs/execute`, async ({ request }) => {
      const body = await request.json() as { run_id: string; preview_only: boolean; definition: JobDefinition };
      requests.push(body);
      return HttpResponse.json({ version: 1, run_id: body.run_id, status: body.preview_only ? "validated" : "success", preview_only: body.preview_only, nodes: Object.fromEntries(body.definition.nodes.map(n => [n.id, { status: body.preview_only ? "validated" : "success", input_rows: 2, output_rows: 2, total_rows: 2 }])) });
    }));
    const user = await setup();
    await user.click(screen.getByText("Prepare second"));
    await user.click(screen.getByRole("button", { name: "Agregar pipeline actual como salida" }));
    const options = Array.from((screen.getByLabelText("Entrada del nodo 2") as HTMLSelectElement).options).map(o => o.value);
    const previous = options.find(v => v.startsWith("node_"))!;
    await user.selectOptions(screen.getByLabelText("Entrada del nodo 2"), previous);
    await user.click(screen.getByLabelText("Exigir conservación de filas en nodo 2"));
    await user.type(screen.getByLabelText("Sumas a conservar en nodo 2"), "id");
    await user.click(screen.getByRole("button", { name: "Validar trabajo sin escribir" }));
    await screen.findByText(/Validación sin escritura: no certifica/);
    expect(requests[0].preview_only).toBe(true);
    expect(JSON.stringify(requests[0].definition)).not.toContain("runtime-only");
    await user.click(screen.getByRole("button", { name: "Ejecutar trabajo" }));
    await screen.findByText(/Todas las salidas requeridas confirmaron/);
    expect(requests).toHaveLength(2);
    expect((requests[1].definition as JobDefinition).nodes[1].input_node).toBe(previous);
    await user.click(screen.getByText("Reset pipeline"));
    await screen.findByRole("heading", { name: "Agrega tu primera salida" });
  });

  it("keeps unknown writes visible and only resumes after an explicit action", async () => {
    const requests: { run_id: string; resume_run_id?: string }[] = [];
    server.use(http.post(`${API_URL}/jobs/execute`, async ({ request }) => {
      const body = await request.json() as { run_id: string; resume_run_id?: string; definition: JobDefinition };
      requests.push(body);
      return HttpResponse.json({ version: 1, run_id: body.run_id, status: body.resume_run_id ? "success" : "partial", preview_only: false, nodes: { [body.definition.nodes[0].id]: { status: body.resume_run_id ? "success" : "unknown", input_rows: 2, output_rows: 2, reused: !!body.resume_run_id } } });
    }));
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Ejecutar trabajo" }));
    await screen.findByText("unknown"); expect(requests).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Conciliar salidas y reanudar" }));
    await screen.findByText(/Todas las salidas requeridas confirmaron/);
    expect(requests[1].resume_run_id).toBe(requests[0].run_id);
  });

  it("validates manifests at the boundary and explains missing pipeline setup", async () => {
    expect(() => manifestResponse({ status: "success" })).toThrow();
    expect(() => manifestResponse({ version: 1, run_id: "r", status: "success", preview_only: false, nodes: { x: { status: "success", total_rows: -1 } } })).toThrow();
    render(<PipelineProvider><JobSessionProvider><JobsPage /></JobSessionProvider></PipelineProvider>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Agregar pipeline actual como salida" }));
    await screen.findByText(/Prepara un origen, una receta validada/);
  });
});
