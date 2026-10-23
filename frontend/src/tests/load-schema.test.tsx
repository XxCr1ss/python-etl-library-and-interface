import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { PipelineProvider } from "@/state/PipelineProvider";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { LoadSchemaEditor } from "@/app/(app)/load/components/LoadSchemaEditor";
import { parseLoadSchema } from "@/types/loadSchemaValidation";

function Form() {
  const s = usePipelineSession();
  return <><button onClick={() => {
    s.confirmSource({ type: "file", filepath: "synthetic.csv" });
    s.setTarget({ db_type: "postgresql", host: "localhost", database: "synthetic", user: "etl", password: "runtime-only" });
    s.setLoadConfig({ table_name: "students", table_type: "dimension", if_exists: "fail" });
    const revision = s.snapshot().revision;
    s.dispatch({ type: "previewStart", revision, requestId: "schema" });
    s.dispatch({ type: "previewSuccess", revision, requestId: "schema", data: { status: "success", columns: ["id", "active", "amount", "occurred"], dtypes: { id: "Int64", active: "boolean", amount: "object", occurred: "datetime64[us]" }, total_rows: 1, preview_data: [] } });
  }}>Prepare</button><LoadSchemaEditor config={s.state.loadConfig} columns={["id", "active", "amount", "occurred"]} onChange={s.setLoadConfig} /><output aria-label="Config">{JSON.stringify(s.state.loadConfig)}</output><output aria-label="Read mode">{s.state.source && "read_mode" in s.state.source ? s.state.source.read_mode : "inferred"}</output></>;
}

async function configure() {
  render(<PipelineProvider><Form /></PipelineProvider>);
  const user = userEvent.setup();
  await user.click(screen.getByText("Prepare")); await user.click(screen.getByRole("button", { name: "Configurar tipos y claves" }));
  return user;
}

describe("explicit schema load UX", () => {
  it("applies nullable types, composite metadata, indexes, checks and exact extraction", async () => {
    const user = await configure();
    await user.type(screen.getByLabelText("Grano de la tabla"), "Una fila por estudiante");
    await user.click(screen.getByLabelText("Parte de PK: id"));
    await user.selectOptions(screen.getByLabelText("Tipo de amount"), "decimal");
    await user.clear(screen.getByLabelText("Precisión de amount")); await user.type(screen.getByLabelText("Precisión de amount"), "30");
    await user.clear(screen.getByLabelText("Escala de amount")); await user.type(screen.getByLabelText("Escala de amount"), "8");
    await user.type(screen.getByLabelText("Unidad de amount"), "money");
    await user.click(screen.getByLabelText("Instante con zona horaria"));
    await user.click(screen.getByRole("button", { name: "Agregar clave única" }));
    await user.click(screen.getByRole("button", { name: "Agregar índice" }));
    await user.click(screen.getByRole("button", { name: "Agregar comprobación" }));
    await user.selectOptions(screen.getByLabelText("Columna de comprobación 1"), "amount");
    await user.selectOptions(screen.getByLabelText("Regla 1"), "range");
    await user.type(screen.getByLabelText("minimum 1"), "0"); await user.type(screen.getByLabelText("maximum 1"), "100");
    await user.selectOptions(screen.getByLabelText("Severidad 1"), "warning");
    await user.click(screen.getByRole("button", { name: "Aplicar esquema" }));
    const config = JSON.parse(screen.getByLabelText("Config").textContent!);
    expect(config.schema_spec.primary_key).toEqual(["id"]); expect(config.schema_spec.columns[2].scale).toBe(8);
    expect(config.schema_spec.checks[0].severity).toBe("warning"); expect(screen.getByLabelText("Read mode")).toHaveTextContent("exact");
    await user.click(screen.getByRole("button", { name: "Quitar comprobación 1" }));
    await user.click(screen.getByRole("button", { name: "Quitar unique_keys 1" }));
    await user.click(screen.getByRole("button", { name: "Quitar indexes 1" }));
    await user.click(screen.getByRole("button", { name: "Usar carga tradicional" }));
    expect(JSON.parse(screen.getByLabelText("Config").textContent!).schema_spec).toBeUndefined();
  });

  it("reviews impact without writing and explains invalid drafts", async () => {
    let received: unknown;
    server.use(http.post(`${API_URL}/load/schema-preview`, async ({ request }) => { received = await request.json(); return HttpResponse.json({ status: "success", message: "Validated", table_name: "students", table_type: "dimension", total_rows: 0, previous_rows: 0, submitted_rows: 1, preview_data: [], schema_actions: ["create_table", "insert_rows"], preview_only: true }); }));
    const user = await configure();
    await user.click(screen.getByRole("button", { name: "Aplicar esquema" }));
    await screen.findByText("Revisa grano, tipos, columnas y claves del esquema.");
    await user.type(screen.getByLabelText("Grano de la tabla"), "Un estudiante");
    await user.click(screen.getByRole("button", { name: "Agregar FK física" }));
    await user.type(screen.getByLabelText("Tabla referenciada 1"), "schools");
    await user.clear(screen.getByLabelText("Columnas FK 1")); await user.type(screen.getByLabelText("Columnas FK 1"), "id");
    await user.clear(screen.getByLabelText("Clave referenciada 1")); await user.type(screen.getByLabelText("Clave referenciada 1"), "id");
    await user.click(screen.getByRole("button", { name: "Aplicar esquema" }));
    await user.click(screen.getByRole("button", { name: "Revisar impacto sin escribir" }));
    await screen.findByText(/No se escribió ningún dato/);
    expect(JSON.stringify(received)).toContain('"read_mode":"exact"');
    expect(screen.getByRole("button", { name: "Revisar impacto sin escribir" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Quitar FK física 1" }));
  });

  it("rejects invalid schemas and strips unexpected imported fields", () => {
    const schema = { version: 1, grain: "one entity", columns: [{ name: "id", type: "integer", nullable: false, token: "excluded" }], primary_key: ["id"], unique_keys: [], indexes: [], foreign_keys: [], checks: [], password: "excluded" };
    const parsed = parseLoadSchema(schema);
    expect(JSON.stringify(parsed)).not.toContain("excluded");
    expect(() => parseLoadSchema({ ...schema, primary_key: ["absent"] })).toThrow();
    expect(() => parseLoadSchema({ ...schema, columns: [{ name: "id", type: "decimal", nullable: true, precision: 4, scale: 8 }] })).toThrow();
    expect(() => parseLoadSchema({ ...schema, columns: [schema.columns[0], schema.columns[0]] })).toThrow();
    expect(() => parseLoadSchema({ ...schema, checks: [{ column: "id", kind: "arbitrary_code", severity: "error" }] })).toThrow();
  });
});
