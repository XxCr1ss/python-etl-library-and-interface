import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagramOwner, type OwnerContext } from "@/features/diagram/coordinator";
import { DiagramClient } from "@/features/diagram/client";
import { channelName, envelope, type Binding, type WireMessage } from "@/features/diagram/protocol";
import { API_URL } from "./fixtures/api";
import { graphFixture, sampleFixture, diagramConnection } from "./fixtures/diagram";
import { TestChannel } from "./diagram-channel";
import { server } from "./mocks/server";
let context: OwnerContext;
let owner: DiagramOwner;
let clients: DiagramClient[];
const confirm = vi.fn(() => true), pending = vi.fn();
beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", TestChannel); clients = [];
  context = { route: "/extract", revision: 1, available: true, reason: "", stamp: "1", sourceMatches: () => false };
  owner = new DiagramOwner(() => context, confirm, pending);
  server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json(graphFixture)),
    http.post(API_URL + "/extract/database/preview", async ({ request }) => {
      expect(await request.json()).toMatchObject({ table_name: "orders", limit: 10, password: diagramConnection.password });
      return HttpResponse.json(sampleFixture);
    }));
});
afterEach(() => { clients.forEach(c => c.close()); owner.invalidate(); TestChannel.clear(); });
async function connect() {
  const url = owner.open(diagramConnection);
  const binding: Binding = JSON.parse(decodeURIComponent(url.split("#")[1]));
  const changed = vi.fn(); const client = new DiagramClient(binding, changed); clients.push(client);
  await waitFor(() => expect(client.state.connected).toBe(true));
  return { client, changed, binding };
}
describe("diagram tab bridge", () => {
  it("handshakes with the current route and proxies metadata/rows without credentials on the channel", async () => {
    const { client } = await connect();
    expect(client.state.owner?.route).toBe("/extract");
    expect(await client.graph()).toEqual(graphFixture);
    expect(await client.preview("child")).toEqual(sampleFixture);
    expect(JSON.stringify(TestChannel.messages)).not.toContain(diagramConnection.password);
    context.route = "/transform"; owner.publish();
    await waitFor(() => expect(client.state.owner?.route).toBe("/transform"));
  });
  it("validates in the receiver even when route information is stale, then applies once after confirmation", async () => {
    context.route = "/transform";
    const { client, binding } = await connect(); await client.graph();
    context.route = "/load";
    client.useTable("child");
    await waitFor(() => expect(client.state.selection?.status).toBe("rejected"));
    expect(confirm).not.toHaveBeenCalled();
    context.route = "/transform"; owner.publish();
    await waitFor(() => expect(client.state.owner?.available).toBe(true));
    client.useTable("child");
    await waitFor(() => expect(client.state.selection?.status).toBe("pending_confirmation"));
    owner.resolve(true);
    await waitFor(() => expect(client.state.selection?.status).toBe("applied"));
    expect(confirm).toHaveBeenCalledExactlyOnceWith(diagramConnection, "orders");
    const request = (TestChannel.messages as WireMessage[]).filter(m => m.type === "USE_TABLE_REQUEST").at(-1)!;
    const duplicate = new TestChannel(channelName(binding)); duplicate.postMessage(request);
    await waitFor(() => expect(client.state.selection?.status).toBe("applied"));
    expect(confirm).toHaveBeenCalledTimes(1); duplicate.close();
  });
  it.each(["cancel", "route", "revision", "busy", "editor"])("preserves the pipeline when confirmation becomes invalid: %s", async mode => {
    context.route = "/transform";
    const { client } = await connect(); await client.graph(); client.useTable("child");
    await waitFor(() => expect(pending).toHaveBeenCalledWith(expect.objectContaining({ table: "orders" })));
    if (mode === "route") context.route = "/extract";
    if (mode === "revision") context.revision++;
    if (mode === "busy") { context.available = false; context.reason = "Carga en curso"; }
    if (mode === "editor") context.stamp = "editor-open";
    owner.resolve(mode !== "cancel");
    await waitFor(() => expect(client.state.selection?.status).toBe("cancelled"));
    expect(confirm).not.toHaveBeenCalled();
  });
  it("does not reset an already active source and rejects unknown tables", async () => {
    context.route = "/transform"; context.sourceMatches = () => true;
    const { client } = await connect(); await client.graph(); client.useTable("child");
    await waitFor(() => expect(client.state.selection?.status).toBe("applied"));
    expect(confirm).not.toHaveBeenCalled();
    await expect(client.preview("missing")).rejects.toThrow(/tabla/);
  });
  it("cancels queries and propagates API failures with no false success", async () => {
    const { client } = await connect();
    const abort = new AbortController(); const request = client.graph(abort.signal); abort.abort();
    await expect(request).rejects.toThrow(/cancelada/);
    server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json({ detail: "Sin permisos" }, { status: 400 })));
    await expect(client.graph()).rejects.toThrow("Sin permisos");
  });
  it("isolates owners, invalidates connections and rejects protocol noise", async () => {
    const { client, binding } = await connect();
    const other = new DiagramOwner(() => ({ ...context, route: "/settings" }), vi.fn(), vi.fn());
    const otherBinding = JSON.parse(decodeURIComponent(other.open(diagramConnection).split("#")[1]));
    const otherClient = new DiagramClient(otherBinding, vi.fn()); clients.push(otherClient);
    await waitFor(() => expect(otherClient.state.connected).toBe(true));
    expect(client.state.owner?.route).toBe("/extract");
    const noise = new TestChannel(channelName(binding)); noise.postMessage({ ...envelope(binding, "intruder", "STATE_PROBE"), password: "bad" });
    owner.invalidate();
    await waitFor(() => expect(client.state.invalid).toBe(true));
    expect(otherClient.state.connected).toBe(true);
    otherClient.close(); clients = clients.filter(c => c !== otherClient); other.invalidate(); noise.close();
  });
  it("times out absent owners and cleans pending registration", async () => {
    vi.useFakeTimers();
    const { client } = (() => { const binding = JSON.parse(decodeURIComponent(owner.open(diagramConnection).split("#")[1])); const client = new DiagramClient(binding, vi.fn()); clients.push(client); return { client }; })();
    owner.invalidate();
    await vi.advanceTimersByTimeAsync(25000);
    expect(client.state.connected).toBe(false);
    await expect(client.graph()).rejects.toThrow(/Vincula/);
    await vi.advanceTimersByTimeAsync(150000); owner.expire();
  });
  it("reconciles a lost selection reply with the same request ID without applying twice", async () => {
    context.route = "/transform";
    const { client } = await connect(); await client.graph();
    const send = TestChannel.prototype.postMessage;
    const blocked = vi.spyOn(TestChannel.prototype, "postMessage").mockImplementation(function (this: TestChannel, data: unknown) {
      if ((data as WireMessage).type !== "USE_TABLE_RESULT") send.call(this, data);
    });
    vi.useFakeTimers(); client.useTable("child");
    await vi.advanceTimersByTimeAsync(1); owner.resolve(true);
    expect(confirm).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(18000);
    expect(client.state.selection?.status).toBe("uncertain");
    blocked.mockRestore(); client.reconcile();
    await vi.advanceTimersByTimeAsync(1);
    expect(client.state.selection?.status).toBe("applied");
    expect(confirm).toHaveBeenCalledOnce();
  });
  it("rejects malformed graph responses and expires an unopened registration", async () => {
    const { client } = await connect();
    server.use(http.post(API_URL + "/extract/database/schema-graph", () => HttpResponse.json({ ...graphFixture, edges: [{ ...graphFixture.edges[0], target_table_id: "missing" }] })));
    await expect(client.graph()).rejects.toThrow(/contrato/);
    owner.open(diagramConnection); vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(21000);
    expect(owner.expire()).toBe(1);
  });
});
