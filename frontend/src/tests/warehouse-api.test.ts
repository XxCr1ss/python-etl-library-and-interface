import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { exportWarehouse, queryWarehouse, saveWarehouseReport } from "@/services/warehouseApi";
import { warehouseCatalog, warehouseDetail, warehouseQuery } from "@/services/warehouseValidators";
import { formatScalar } from "@/features/warehouse/format";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { warehouseCatalogFixture, warehouseDetailFixture, warehouseQueryFixture, warehouseResult } from "./fixtures/warehouse";

const connection = { db_type: "postgresql" as const, host: "localhost", database: "synthetic", user: "reader", password: "secret123" };
describe("Warehouse contracts and binary reports", () => {
  it("accepts exact values, keeps numeric-looking category labels and distinguishes zero/false/null", () => {
    expect(warehouseCatalog(warehouseCatalogFixture)).toBe(warehouseCatalogFixture);
    expect(warehouseDetail(warehouseDetailFixture)).toBe(warehouseDetailFixture);
    expect(warehouseQuery(warehouseResult()).data[0].total).toBe("90.0000");
    expect(formatScalar("001")).toBe("001"); expect(formatScalar("2026-01")).toBe("2026-01");
    expect(formatScalar("9007199254740993.123400", "decimal")).toBe("9.007.199.254.740.993,123400");
    expect([null, false, 0, ""].map(v => formatScalar(v))).toEqual(["Sin valor", "No", "0", "(cadena vacía)"]);
  });
  it.each(["missing-field", "unsafe-integer", "duplicate-id", "unknown-encoding", "wrong-count", "unknown-kpi"])("rejects malformed aggregate %s", change => {
    const value = warehouseResult();
    if (change === "missing-field") delete value.data[0].total;
    if (change === "unsafe-integer") { value.columns[1].logical_type = "integer"; value.columns[1].encoding = "native"; value.data[0].total = 9007199254740992; }
    if (change === "duplicate-id") value.columns[1].id = value.columns[0].id;
    if (change === "unknown-encoding") Object.assign(value.columns[1], { encoding: "unknown" });
    if (change === "wrong-count") value.meta.returned_rows = 4;
    if (change === "unknown-kpi") value.summary_kpis[0].metric_id = "other";
    expect(() => warehouseQuery(value)).toThrow();
  });
  it("rejects invalid catalog references and impossible sample pagination", () => {
    const catalog = structuredClone(warehouseCatalogFixture); catalog.relationships[0].column_pairs[0].source_column = "missing";
    expect(() => warehouseCatalog(catalog)).toThrow();
    const detail = structuredClone(warehouseDetailFixture); detail.pagination.mode = "sample"; detail.pagination.has_more = true;
    expect(() => warehouseDetail(detail)).toThrow();
  });
  it("rejects a valid-shaped result belonging to another query", async () => {
    const other = warehouseResult(); other.columns[1].id = "different"; other.data[0].different = other.data[0].total; delete other.data[0].total; other.summary_kpis[0].metric_id = "different";
    server.use(http.post(`${API_URL}/warehouse/query`, () => HttpResponse.json(other)));
    await expect(queryWarehouse(connection, warehouseQueryFixture)).rejects.toMatchObject({ kind: "contract" });
  });
  it("downloads the requested type and sanitizes JSON errors before reading a Blob", async () => {
    let body: unknown;
    server.use(http.post(`${API_URL}/warehouse/export`, async ({ request }) => { body = await request.json(); return new HttpResponse("total\r\n90.0000\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8" } }); }));
    const blob = await exportWarehouse(connection, { mode: "aggregate", format: "csv", query: warehouseQueryFixture });
    expect(blob.size).toBeGreaterThan(0); expect(body).toMatchObject({ mode: "aggregate", query: { limit: 1 } });
    server.use(http.post(`${API_URL}/warehouse/export`, () => HttpResponse.json({ detail: "secret123 cannot be shown" }, { status: 413 })));
    await expect(exportWarehouse(connection, { mode: "aggregate", format: "csv", query: warehouseQueryFixture })).rejects.toMatchObject({ status: 413, message: "[oculto] cannot be shown" });
  });
  it("rejects a successful wrong MIME response and reports cancellation", async () => {
    server.use(http.post(`${API_URL}/warehouse/export`, () => new HttpResponse("<html>error</html>", { headers: { "Content-Type": "text/html" } })));
    await expect(exportWarehouse(connection, { mode: "aggregate", format: "csv", query: warehouseQueryFixture })).rejects.toMatchObject({ kind: "contract" });
    const controller = new AbortController(); controller.abort();
    await expect(exportWarehouse(connection, { mode: "aggregate", format: "csv", query: warehouseQueryFixture }, controller.signal)).rejects.toMatchObject({ kind: "aborted" });
  });
  it("creates and revokes its download URL", () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:synthetic"), revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    saveWarehouseReport(new Blob(["{}"]), "json");
    expect(click).toHaveBeenCalledOnce(); expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith("blob:synthetic");
  });
});
