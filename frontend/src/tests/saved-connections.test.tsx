import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { SavedConnectionsSelector } from "@/components/etl/SavedConnectionsSelector";
import { useDatabaseExtract } from "@/components/etl/hooks/useDatabaseExtract";
import { DatabaseTab } from "@/app/(app)/extract/components/DatabaseTab";
import { ConnectionsManager } from "@/features/connections/ConnectionsManager";
import { RemoteMonitoring } from "@/features/monitoring/RemoteMonitoring";
import { setTokenReader, invalidateAuthRequests } from "@/services/authSession";
import { request } from "@/services/apiClient";
import { sourceDto } from "@/services/etlSerializers";
import { parseSource } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
import { pipelineReducer, initialState } from "@/state/pipelineReducer";
import { mockDialogMethods } from "./dialog";
const auth = vi.hoisted(() => ({ user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null }));
vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ user: auth.user, configured: true, loading: false }) }));
const saved = { id: "22222222-2222-4222-8222-222222222222", name: "Origen registrado", connection_type: "source", db_type: "postgresql", host: "db.example.com", port: 5432, database: "example", user: "reader", service_name: null, transport: "direct", version: 3, has_password: true, last_test_status: "success", last_tested_at: "2026-10-21T10:00:00Z", created_at: "2026-10-21T10:00:00Z", updated_at: "2026-10-21T10:00:00Z" };
afterEach(() => { setTokenReader(null); auth.user = { id: "11111111-1111-4111-8111-111111111111" }; });
function Extract() { const model = useDatabaseExtract(true, "guest-agent"); return <DatabaseTab model={model} agentId="guest-agent" />; }
describe("saved connections and account boundaries", () => {
  it("uses only a connection reference and bearer, without receiving a password", async () => {
    let body: unknown, header: string | null = null;
    setTokenReader(async () => "synthetic-access-token");
    server.use(http.get(`${API_URL}/connections`, () => HttpResponse.json({ items: [saved] })),
      http.post(`${API_URL}/extract/database`, async ({ request }) => { body = await request.json(); header = request.headers.get("Authorization"); return HttpResponse.json({ status: "success", message: "Checked", tables: [], schema_preview: {} }); }));
    const user = userEvent.setup(); render(<Extract />);
    await screen.findByRole("option", { name: /Origen registrado/ });
    await user.selectOptions(screen.getByLabelText("Conexión guardada"), saved.id);
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Conectar y listar tablas" }));
    await screen.findByText(/Conexión comprobada/);
    expect(body).toEqual({ connection_id: saved.id, connection_version: 3 });
    expect(header).toBe("Bearer synthetic-access-token");
    expect(JSON.stringify([...Array(sessionStorage.length)].map((_,i) => sessionStorage.getItem(sessionStorage.key(i)!)))).not.toContain("synthetic-access-token");
  });
  it("serializes saved nested sources without a recovered password", () => {
    const store = new CredentialStore();
    const source = parseSource({ type: "database", db_type: "postgresql", host: saved.host, database: saved.database, user: saved.user, table_name: "table", savedConnection: { connection_id: saved.id, connection_version: 3 } }, store, true);
    expect(sourceDto(source, store)).toEqual({ type: "database", table_name: "table", connection_id: saved.id, connection_version: 3 });
    expect(store.has((source as { credentialRef: string }).credentialRef)).toBe(false);
  });
  it("shows a guest invitation without querying another account's connections", () => {
    auth.user = null; render(<SavedConnectionsSelector type="source" onSelect={() => {}} />);
    expect(screen.getByRole("link", { name: "Crea una cuenta" })).toHaveAttribute("href", "/register");
  });
  it("confirms deletion and keeps secrets out of the connection list", async () => {
    const restore = mockDialogMethods(); let deleted = false;
    server.use(http.get(`${API_URL}/connections`, () => HttpResponse.json({ items: deleted ? [] : [saved] })),
      http.delete(`${API_URL}/connections/${saved.id}`, ({ request }) => { expect(new URL(request.url).searchParams.get("version")).toBe("3"); deleted = true; return HttpResponse.json({ status: "success", message: "Deleted" }); }));
    try {
      const user = userEvent.setup(); render(<ConnectionsManager />);
      await user.click(await screen.findByRole("button", { name: "Eliminar Origen registrado" }));
      expect(deleted).toBe(false);
      await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
      expect(await screen.findByText(/El historial se conserva/)).toBeVisible();
      expect(deleted).toBe(true);
    } finally { restore(); }
  });
  it("discards a response when the account changes during the request", async () => {
    let finish!: () => void; let started!: () => void;
    const waiting = new Promise<void>(resolve => { finish = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    server.use(http.get(`${API_URL}/connections`, async () => { started(); await waiting; return HttpResponse.json({ items: [saved] }); }));
    const promise = request("connections", value => value);
    const assertion = expect(promise).rejects.toMatchObject({ kind: "aborted" });
    await ready; invalidateAuthRequests(); finish(); await assertion;
    const reset = pipelineReducer({ ...initialState, hydrationStatus: "ready", history: [{ id: "old", revision: 0, status: "running", table_name: "t", table_type: "dimension", startedAt: new Date().toISOString() }] }, { type: "accountChanged" });
    expect(reset.history).toEqual([]); expect(reset.source).toBeNull();
  });
  it("shows unconfirmed executions and total destination without inventing inserted rows", async () => {
    server.use(http.get(`${API_URL}/monitoring/executions`, () => HttpResponse.json({ items: [{ id: saved.id, request_id: saved.id, status: "unknown", table_name: "result", table_type: "dimension", started_at: "2026-10-21T10:00:00Z", finished_at: null, duration_ms: null, destination_total_rows: null, error_message: null }], next_cursor: null })),
      http.get(`${API_URL}/monitoring/metrics`, () => HttpResponse.json({ attempts: 1, successes: 0, errors: 0, unknown: 1, running: 0, success_rate: null, average_ms: null })));
    render(<RemoteMonitoring />);
    expect(await screen.findByText("Sin confirmar")).toBeVisible();
    expect(screen.getByText("Total final destino")).toBeVisible();
    expect(screen.queryByText("Filas insertadas")).not.toBeInTheDocument();
  });
});
