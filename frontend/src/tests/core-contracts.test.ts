import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import operations from "../../../backend/tests/fixtures/operations.json";
import catalog from "./fixtures/operations-catalog.json";
import { server } from "./mocks/server";
import { API_URL, previewResponse, uploadResponse } from "./fixtures/api";
import * as extract from "@/services/extractApi";
import * as transform from "@/services/transformApi";
import * as load from "@/services/loadApi";
import { CredentialStore } from "@/state/credentialStore";
import { parseLoadConfig, parseSource, parseStep, stepSchemas } from "@/types/etlValidation";
import { sourceDto, stepDto, targetDto } from "@/services/etlSerializers";
import { request } from "@/services/apiClient";
const db = { db_type: "oracle" as const, host: "localhost", port: 1521, database: "db", user: "u", password: "synthetic-secret", service_name: "svc", use_agent: true, agent_id: "a" };
const file = { type: "file", filepath: "/tmp/synthetic.csv" };
describe("HTTP and serialization contracts", () => {
  it.each(operations)("serializes $type with its real parameters and no UI identity", op => {
    const store = new CredentialStore();
    const params = { ...op.params } as Record<string, unknown>;
    for (const k of ["right_source", "secondary_source"]) if (params[k]) params[k] = file;
    const step = parseStep({ type: op.type, params, description: "UI" }, store, true);
    expect(step.id).toBeTruthy(); expect(stepDto(step, store)).toEqual({ type: op.type, params });
  });
  it("keeps three source variants, nested credentials, explicit empty and FK tuples", () => {
    const store = new CredentialStore();
    const source = parseSource({ type: "database", ...db, table_name: "t", total_rows: 5 }, store, true);
    const step = parseStep({ type: "union", params: { secondary_source: { type: "database", ...db, password: "", table_name: "r" } } }, store, true);
    expect(sourceDto(source, store)).toEqual({ type: "database", ...db, table_name: "t" });
    expect(stepDto(step, store).params.secondary_source).toEqual({ type: "database", ...db, password: "", table_name: "r" });
    expect(sourceDto(parseSource(file, store, true), store)).toEqual(file);
    expect(sourceDto(parseSource({ type: "date_dimension", start_year: 2024, end_year: 2024 }, store, true), store)).toEqual({ type: "date_dimension", start_year: 2024, end_year: 2024 });
    expect(parseLoadConfig({ table_name: "f", table_type: "fact", if_exists: "fail", foreign_keys: { id: ["dim", "pk"] } })).toEqual({ table_name: "f", table_type: "fact", if_exists: "fail", foreign_keys: { id: ["dim", "pk"] } });
    expect(() => parseLoadConfig({ table_name: "f", table_type: "fact", foreign_keys: { id: ["dim"] } })).toThrow();
    store.clear(); expect(() => sourceDto(source, store)).toThrow(/contraseña/);
    expect(() => targetDto({ ...db, credentialRef: "missing" }, store)).toThrow();
  });
  it("all service methods use their real route/payload and multipart boundary", async () => {
    const calls: { path: string; body: unknown }[] = [];
    const route = (path: string, result: unknown) => http.post(`${API_URL}/${path}`, async ({ request }) => { calls.push({ path, body: await request.json() }); return HttpResponse.json(result as never); });
    const result = { status: "success", preview_data: [], total_rows: 0 };
    const target = { db_type: db.db_type, host: db.host, port: db.port, database: db.database, user: db.user, password: db.password, service_name: db.service_name };
    const config = { table_name: "f", table_type: "fact" as const, if_exists: "append" as const, foreign_keys: { id: ["dim", "pk"] as [string, string] } };
    server.use(
      http.post(`${API_URL}/extract/upload`, async ({ request }) => { expect(request.headers.get("content-type")).toMatch(/^multipart\/form-data; boundary=/); const f = (await request.formData()).get("file") as File; expect(await f.text()).toBe("id\n1"); return HttpResponse.json(uploadResponse); }),
      route("extract/database", { status: "success", message: "OK", tables: ["t"], schema_preview: { t: ["id"] } }),
      route("extract/database/preview", { ...result, table_name: "t" }), route("extract/date-dimension/preview", { ...result, message: "OK" }),
      route("transform/preview", previewResponse), route("load/test-connection", { status: "success", message: "OK" }),
      route("load/execute", { ...result, message: "OK", table_name: "f", table_type: "fact" }),
      http.get(`${API_URL}/transform/operations`, () => HttpResponse.json(catalog)),
      http.get(`${API_URL}/extract/agent/status/:id`, ({ params }) => HttpResponse.json({ agent_id: params.id, connected: true })),
    );
    await extract.uploadFile(new File(["id\n1"], "a.csv"));
    await extract.getDatabaseMetadata(db); await extract.previewDatabaseTable({ ...db, table_name: "t" });
    await extract.previewDateDimension({ start_year: 2024, end_year: 2024 }); expect(await extract.getAgentStatus("a b")).toEqual({ agent_id: "a b", connected: true });
    expect(await transform.getOperations()).toHaveLength(42);
    expect(new Set(catalog.map(op => op.type))).toEqual(new Set(Object.keys(stepSchemas)));
    for (const op of catalog) expect(Object.keys(op.params).sort()).toEqual(Object.keys(stepSchemas[op.type as keyof typeof stepSchemas]).sort());
    await transform.previewTransform({ source: { type: "file", filepath: "a" }, steps: [], limit: 10 });
    await load.testTargetConnection(target); await load.executeLoad({ source: { type: "file", filepath: "a" }, recipe: [], target_connection: target, load_config: config });
    expect(calls).toEqual([
      { path: "extract/database", body: db }, { path: "extract/database/preview", body: { ...db, table_name: "t" } },
      { path: "extract/date-dimension/preview", body: { start_year: 2024, end_year: 2024 } },
      { path: "transform/preview", body: { source: { type: "file", filepath: "a" }, steps: [], limit: 10 } },
      { path: "load/test-connection", body: target }, { path: "load/execute", body: { source: { type: "file", filepath: "a" }, recipe: [], target_connection: target, load_config: config } },
    ]);
  });
  it.each([400, 404, 422, 500])("preserves HTTP %s and sanitizes validation errors", async status => {
    server.use(http.post(`${API_URL}/load/test-connection`, () => HttpResponse.json({ detail: status === 422 ? [{ msg: "Valor inválido", input: db }] : "synthetic-secret inválido" }, { status })));
    await expect(load.testTargetConnection(db)).rejects.toMatchObject({ kind: "http", status });
    try { await load.testTargetConnection(db); } catch (e) { expect((e as Error).message).not.toContain(db.password); expect((e as Error).message).not.toContain("[object Object]"); }
  });
  it("keeps HTTP errors for non JSON/empty bodies and rejects malformed 200", async () => {
    server.use(http.post(`${API_URL}/load/test-connection`, () => new HttpResponse("<html>secret</html>", { status: 500 })));
    await expect(load.testTargetConnection(db)).rejects.toMatchObject({ kind: "http", status: 500 });
    server.use(http.post(`${API_URL}/load/test-connection`, () => new HttpResponse(null, { status: 404 })));
    await expect(load.testTargetConnection(db)).rejects.toMatchObject({ kind: "http", status: 404 });
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ columns: [] })));
    await expect(transform.previewTransform({ source: { type: "file", filepath: "a" }, steps: [], limit: 1 })).rejects.toMatchObject({ kind: "contract" });
  });
  it("classifies network failures and cancellation without retrying", async () => {
    let attempts = 0;
    server.use(http.post(`${API_URL}/load/test-connection`, () => { attempts++; return HttpResponse.error(); }));
    await expect(load.testTargetConnection(db)).rejects.toMatchObject({ kind: "network" }); expect(attempts).toBe(1);
    const abort = new AbortController(); abort.abort();
    await expect(request("load/test-connection", () => true, db, abort.signal)).rejects.toMatchObject({ kind: "aborted", name: "ApiError" });
  });
});
