import { describe, expect, it } from "vitest";
import { CredentialStore } from "@/state/credentialStore";
import { hydrateSession, persistSession, persistedSession, SESSION_KEY, type StoragePort } from "@/state/pipelineStorage";
import { initialState, pipelineReducer as reduce, type PipelineState } from "@/state/pipelineReducer";
import { canTransform, isReadyForLoad } from "@/state/pipelineSelectors";
import { sourceDto } from "@/services/etlSerializers";
import { previewResponse as fixturePreview } from "./fixtures/api";
const previewResponse = { ...fixturePreview, status: "success" as const };
const file = { type: "file" as const, filepath: "/tmp/synthetic.csv" };
const db = { type: "database", db_type: "postgresql", host: "localhost", database: "db", user: "u", table_name: "t", password: "legacy-synthetic-secret" };
const fresh = (): PipelineState => ({ ...initialState, hydrationStatus: "empty" });
describe("session persistence and transitions", () => {
  it("migrates primary and secondary passwords only to memory, IDs survive reload", () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(db));
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "union", params: { secondary_source: { ...db, password: "" } } }]));
    const credentials = new CredentialStore(); const state = hydrateSession(sessionStorage, credentials);
    expect(canTransform(state, credentials)).toBe(true); expect(sourceDto(state.source!, credentials)).toMatchObject({ password: db.password });
    expect(sessionStorage.getItem("etl_active_source")).toBeNull(); expect(sessionStorage.getItem("etl_transform_recipe")).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).not.toContain("password"); expect(sessionStorage.getItem(SESSION_KEY)).not.toContain(db.password);
    const reloaded = hydrateSession(sessionStorage, new CredentialStore()); expect(reloaded.source).toEqual(state.source); expect(reloaded.recipe).toEqual(state.recipe);
    expect(canTransform(reloaded, new CredentialStore())).toBe(false); expect(reloaded.preview.status).toBe("pending"); expect(reloaded.targetCheckedVersion).toBeNull();
  });
  it("prefers the current session and still cleans stale legacy secrets", () => {
    const state = reduce(fresh(), { type: "source", source: file }); persistSession(sessionStorage, state);
    sessionStorage.setItem("etl_active_source", JSON.stringify(db));
    expect(hydrateSession(sessionStorage, new CredentialStore()).source).toEqual(file); expect(sessionStorage.getItem("etl_active_source")).toBeNull();
  });
  it("persists only allowed fields and at most 50 summaries, never data/DTOs/messages or a connection authorization", () => {
    const history = Array.from({ length: 55 }, (_, i) => ({ id: String(i), revision: 1, startedAt: new Date().toISOString(), status: "success" as const, table_name: "t", table_type: "dimension" as const,
      message: "untrusted", recipe: [{ password: "secret" }], preview_data: [{ secret: true }] }));
    const persisted = persistedSession({ ...fresh(), source: file, targetCheckedVersion: 1, history, preview: { status: "success", revision: 0, data: previewResponse } });
    expect(persisted.history).toHaveLength(50); expect(persisted.history[0].id).toBe("5");
    expect(persisted).not.toHaveProperty("preview"); expect(persisted).not.toHaveProperty("targetCheckedVersion");
    expect(JSON.stringify(persisted)).not.toMatch(/untrusted|secret|preview_data|password/);
  });
  it("credential references are independent, orphan references are removed and empty stays supplied", () => {
    const store = new CredentialStore(); store.set("primary", "one"); store.set("secondary", ""); store.set("target", "two");
    expect(store.has("secondary")).toBe(true); expect(store.get("secondary")).toBe("");
    store.retain(["primary", "target"]); expect(store.has("secondary")).toBe(false);
    expect(() => store.get("secondary")).toThrow(/contraseña/); expect(store.get("primary")).toBe("one");
    store.clear(); expect(store.has("primary")).toBe(false); expect(store.has("target")).toBe(false);
  });
  it.each(["{", JSON.stringify({ schemaVersion: 99 }), JSON.stringify({ schemaVersion: 1, source: { type: "unknown" }, recipe: [] })])("recovers corrupt/future/unknown data without executing or overwriting it", raw => {
    sessionStorage.setItem(SESSION_KEY, raw); const state = hydrateSession(sessionStorage, new CredentialStore());
    expect(state.recoveryRequired).toBe(true); expect(state.hydrationStatus).toBe("recovered"); expect(sessionStorage.getItem(SESSION_KEY)).toBe(raw);
  });
  it("never truncates an invalid legacy recipe", () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(file)); sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "future", params: {} }]));
    expect(hydrateSession(sessionStorage, new CredentialStore())).toMatchObject({ recoveryRequired: true, source: null, recipe: [] });
  });
  it("handles quota, denied removal and unavailable storage honestly", () => {
    const values = new Map([["etl_active_source", JSON.stringify(db)]]);
    const quota: StoragePort = { getItem: k => values.get(k) ?? null, setItem: () => { throw new Error("quota"); }, removeItem: k => { values.delete(k); } };
    const state = hydrateSession(quota, new CredentialStore()); expect(state.source?.type).toBe("database"); expect(state.warning).toMatch(/memoria/); expect(values.size).toBe(0);
    const denied: StoragePort = { ...quota, getItem: k => k === "etl_active_source" ? JSON.stringify(db) : null, removeItem: () => { throw new Error(); } };
    expect(hydrateSession(denied, new CredentialStore()).warning).toMatch(/no se pudo confirmar/i);
    expect(hydrateSession(null, new CredentialStore()).warning).toMatch(/no disponible/);
    const unavailable: StoragePort = { ...quota, getItem: () => { throw new Error(); } };
    expect(hydrateSession(unavailable, new CredentialStore()).warning).toBeTruthy();
  });
  it("preserves IDs through move/edit, rejects stale previews, accepts zero rows and empty recipe", () => {
    const c = new CredentialStore(); let s = reduce(fresh(), { type: "source", source: file });
    s = reduce(s, { type: "previewStart", revision: s.revision, requestId: "old" }); const old = s.revision;
    s = reduce(s, { type: "addStep", step: { id: "a", type: "prefix_header", params: { prefix: "a" } } });
    s = reduce(s, { type: "addStep", step: { id: "b", type: "suffix_header", params: { suffix: "b" } } });
    s = reduce(s, { type: "moveStep", id: "b", to: 0 }); expect(s.recipe.map(x => x.id)).toEqual(["b", "a"]);
    s = reduce(s, { type: "editStep", step: { id: "a", type: "prefix_header", params: { prefix: "new" } } }); expect(s.recipe[1].id).toBe("a");
    s = reduce(s, { type: "previewSuccess", revision: old, requestId: "old", data: previewResponse }); expect(isReadyForLoad(s, c)).toBe(false);
    s = reduce(s, { type: "source", source: file }); expect(s.recipe).toEqual([]);
    s = reduce(s, { type: "previewStart", revision: s.revision, requestId: "new" });
    s = reduce(s, { type: "previewSuccess", revision: s.revision, requestId: "old", data: previewResponse }); expect(isReadyForLoad(s, c)).toBe(false);
    s = reduce(s, { type: "previewSuccess", revision: s.revision, requestId: "new", data: { ...previewResponse, preview_data: [], total_rows: 0 } }); expect(isReadyForLoad(s, c)).toBe(true);
    s = reduce(s, { type: "credentials", affectsSource: true }); expect(isReadyForLoad(s, c)).toBe(false);
  });
  it("locks running snapshots, records once, recovers running as unknown without reexecution, retains history on reset", () => {
    let s = reduce(fresh(), { type: "source", source: file });
    const record = { id: "attempt", revision: s.revision, startedAt: new Date().toISOString(), table_name: "t", table_type: "dimension" as const, status: "running" as const };
    s = reduce(s, { type: "executionStart", record }); const running = s;
    expect(reduce(s, { type: "reset" })).toBe(s); expect(reduce(s, { type: "source", source: { ...file, filepath: "other" } })).toBe(s);
    expect(reduce(s, { type: "targetChecked", version: 0, success: true })).toBe(s);
    persistSession(sessionStorage, running); const recovered = hydrateSession(sessionStorage, new CredentialStore()); expect(recovered.history[0].status).toBe("unknown"); expect(recovered.execution).toBeNull();
    s = reduce(s, { type: "executionFinish", record: { ...record, status: "success", total_rows: 999 } });
    expect(reduce(s, { type: "executionFinish", record: { ...record, status: "error" } })).toBe(s); expect(s.history).toHaveLength(1);
    expect(reduce(s, { type: "reset" }).history).toEqual(s.history); expect(persistedSession(s)).not.toHaveProperty("preview");
  });
});
