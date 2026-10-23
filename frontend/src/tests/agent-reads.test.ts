import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { request } from "@/services/apiClient";
import { API_URL } from "./fixtures/api";
import { server } from "./mocks/server";
import { invalidateAuthRequests } from "@/services/authSession";

const agent = { use_agent: true, agent_id: "source-agent" };
const identity = (value: unknown) => value;
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }

it("serializa esquema y muestras de extracción/transformación que comparten agente, también mediante referencia guardada", async () => {
  const first = gate(), started = gate(); const calls: string[] = [];
  server.use(http.post(API_URL + "/extract/database/schema-graph", async () => {
    calls.push("schema"); started.release(); await first.promise; return HttpResponse.json({ ok: true });
  }), http.post(API_URL + "/extract/database/preview", () => { calls.push("sample"); return HttpResponse.json({ ok: true }); }),
  http.post(API_URL + "/transform/preview", () => { calls.push("transform"); return HttpResponse.json({ ok: true }); }));
  const schema = request("extract/database/schema-graph", identity, agent);
  await started.promise;
  const sample = request("extract/database/preview", identity, agent);
  const transform = request("transform/preview", identity, { source: { runtime_agent_id: "source-agent" }, steps: [{ right_source: agent }] });
  expect(calls).toEqual(["schema"]);
  first.release(); await Promise.all([schema, sample, transform]);
  expect(calls).toEqual(["schema", "sample", "transform"]);
});

it("cancelar una lectura activa descarta su resultado sin liberar el agente hasta terminar, y omite lecturas canceladas en espera", async () => {
  const first = gate(), started = gate(); let samples = 0;
  server.use(http.post(API_URL + "/extract/database", async () => { started.release(); await first.promise; return HttpResponse.json({ ok: true }); }),
    http.post(API_URL + "/extract/database/preview", () => { samples++; return HttpResponse.json({ ok: true }); }));
  const active = new AbortController(), queued = new AbortController();
  const metadata = request("extract/database", identity, agent, active.signal);
  await started.promise;
  const cancelled = request("extract/database/preview", identity, agent, queued.signal);
  const latest = request("extract/database/preview", identity, agent);
  active.abort(); queued.abort(); expect(samples).toBe(0);
  const outcomes = Promise.allSettled([metadata, cancelled, latest]);
  first.release(); const results = await outcomes;
  expect(results.map(result => result.status)).toEqual(["rejected", "rejected", "fulfilled"]);
  expect(samples).toBe(1);
});

it("no envía lecturas de la cuenta anterior que aún estaban en espera", async () => {
  const first = gate(), started = gate(); let samples = 0;
  server.use(http.post(API_URL + "/extract/database", async () => { started.release(); await first.promise; return HttpResponse.json({ ok: true }); }),
    http.post(API_URL + "/extract/database/preview", () => { samples++; return HttpResponse.json({ ok: true }); }));
  const metadata = request("extract/database", identity, agent); await started.promise;
  const sample = request("extract/database/preview", identity, agent);
  invalidateAuthRequests();
  const outcomes = Promise.allSettled([metadata, sample]); first.release();
  expect((await outcomes).map(result => result.status)).toEqual(["rejected", "rejected"]);
  expect(samples).toBe(0);
});
