import { describe, expect, it } from "vitest";
import { schemaGraph, tableSample } from "@/services/diagramApi";
import { channelName, envelope, parseBinding, parseMessage, parseOwnerState } from "@/features/diagram/protocol";
import { diagramLayout, CARD_WIDTH, cardHeight } from "@/features/diagram/layout";
import { graphFixture, sampleFixture } from "./fixtures/diagram";

describe("diagram contracts", () => {
  it("accepts relational metadata and bounded empty samples", () => {
    expect(schemaGraph(graphFixture)).toEqual(graphFixture);
    expect(tableSample(sampleFixture).preview_data[0].id).toBe(0);
    expect(tableSample({ ...sampleFixture, preview_data: [], total_rows: 0, sample_rows: 0 }).columns).toEqual(sampleFixture.columns);
    expect(schemaGraph({ ...graphFixture, nodes: [], edges: [] }).nodes).toEqual([]);
    const external = structuredClone(graphFixture); external.nodes[0].selectable = false;
    external.nodes[0].columns[0] = { name: "id", data_type: null, nullable: null, is_pk: null, is_fk: null };
    expect(schemaGraph(external).nodes[0].selectable).toBe(false);
  });
  it.each([
    () => ({ ...graphFixture, nodes: [...graphFixture.nodes, graphFixture.nodes[0]] }),
    () => ({ ...graphFixture, edges: [{ ...graphFixture.edges[0], target_table_id: "missing" }] }),
    () => ({ ...graphFixture, edges: [{ ...graphFixture.edges[0], column_pairs: [{ source_column: "missing", target_column: "id" }] }] }),
    () => ({ ...graphFixture, edges: [{ ...graphFixture.edges[0], column_pairs: [] }] }),
    () => ({ ...graphFixture, warnings: [{ code: 1, message: "bad" }] }),
  ])("rejects corrupt or inconsistent graphs", make => expect(() => schemaGraph(make())).toThrow());
  it.each([0, 11, "10", null])("rejects invalid sample limits", limit => expect(() => tableSample({ ...sampleFixture, limit })).toThrow());
  it("rejects misleading sample counts and duplicated columns", () => {
    expect(() => tableSample({ ...sampleFixture, total_rows: 100 })).toThrow();
    expect(() => tableSample({ ...sampleFixture, columns: ["id", "id"] })).toThrow();
  });
  it("checks binding, version, recipient, request shape and state", () => {
    const binding = { pairingId: "pair", ownerTabId: "owner", connectionVersion: 1 };
    const msg = envelope(binding, "instance", "USE_TABLE_REQUEST", "req", { tableId: "child", revision: 1 });
    expect(parseMessage(msg, binding)).toEqual(msg);
    for (const patch of [{ protocolVersion: 2 }, { ownerTabId: "other" }, { requestId: undefined }, { data: { tableId: "child" } }, { password: "secret" }, { type: "UNKNOWN" }]) expect(parseMessage({ ...msg, ...patch }, binding)).toBeNull();
    expect(parseBinding({ ...binding, connectionVersion: 0 })).toBeNull();
    expect(parseBinding(null)).toBeNull();
    expect(parseOwnerState({ route: "/transform", revision: 1, available: true, reason: "", stateVersion: 2 })).not.toBeNull();
    expect(parseOwnerState({ route: "/transform" })).toBeNull();
    expect(channelName(binding)).not.toBe(channelName({ ...binding, pairingId: "other" }));
  });
  it("lays out variable height cards without overlap, including cycles", () => {
    const graph = structuredClone(graphFixture);
    graph.nodes[0].columns = Array.from({ length: 50 }, (_, i) => ({ ...graph.nodes[0].columns[0], name: "field" + i }));
    graph.edges.push({ ...graph.edges[0], id: "cycle", source_table_id: "parent", target_table_id: "child" });
    const nodes = diagramLayout(graph);
    const [a, b] = nodes;
    const apart = Math.abs(a.position.x - b.position.x) >= CARD_WIDTH || b.position.y >= a.position.y + cardHeight(50) || a.position.y >= b.position.y + cardHeight(2);
    expect(apart).toBe(true);
    expect(nodes.every(n => Number.isFinite(n.position.x) && Number.isFinite(n.position.y))).toBe(true);
    expect(diagramLayout({ ...graphFixture, nodes: [], edges: [] })).toEqual([]);
  });
});
