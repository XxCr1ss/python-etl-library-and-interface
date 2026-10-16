import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoadReport from "@/app/(app)/load/components/LoadReport";
import { downloadLoadSummary, executionSummary } from "@/state/loadReport";
import { persistedSession } from "@/state/pipelineStorage";
import { initialState } from "@/state/pipelineReducer";
import type { ExecutionRecord } from "@/types/etl";

const attempt: ExecutionRecord = { id: "local-id", revision: 3, table_name: "fact_sales", table_type: "fact", if_exists: "append", status: "success", startedAt: "2026-10-16T05:00:00.000Z", finishedAt: "2026-10-16T05:00:01.500Z", durationMs: 1500, total_rows: 999 };
const report = { status: "success" as const, message: "Carga simulada", table_name: "fact_sales", table_type: "fact" as const, total_rows: 999, preview_data: [] };
describe("sanitized local report export", () => {
  it("downloads the same allowlisted summary as history, revokes its URL, and defines dashboard/new load", async () => {
    const unsafe = { ...attempt, source: { password: "synthetic-secret", filepath: "C:/private/file.csv" }, recipe: [{ expression: "private SQL" }], preview_data: [{ confidential: 1 }], error: "raw driver", target_connection: { password: "target-secret" } };
    const create = vi.fn<(blob: Blob) => string>().mockReturnValue("blob:summary"); const revoke = vi.fn();
    vi.stubGlobal("URL", class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const reset = vi.fn(); render(<LoadReport report={report} record={unsafe} onReset={reset} />);
    const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Descargar resumen JSON" }));
    expect(click).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:summary");
    const blob = create.mock.calls[0][0] as Blob;
    const exported = await blob.text();
    const summary = JSON.parse(exported);
    expect(summary).toEqual({ reportVersion: 1, ...attempt });
    expect(persistedSession({ ...initialState, history: [unsafe] }).history[0]).toEqual(summary);
    expect(exported).not.toMatch(/password|secret|private|raw driver|confidential|preview_data|recipe|source|target_connection/);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    await user.click(screen.getByRole("button", { name: "Nueva carga" })); expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByText("Duración local del navegador")).toBeVisible(); expect(screen.getByText("1.5 s")).toBeVisible();
    expect(document.querySelector('a[download]')).toBeNull();
  });
  it("revokes the URL even when the browser cannot start the download", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:failed"); static revokeObjectURL = revoke; });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { throw new Error("denied"); });
    expect(() => downloadLoadSummary(attempt)).toThrow("denied"); expect(revoke).toHaveBeenCalledWith("blob:failed");
    expect(document.querySelector('a[download]')).toBeNull();
  });
  it.each(["error", "unknown"] as const)("%s summary has no invented destination count", status => {
    const { total_rows, ...withoutCount } = attempt;
    expect(total_rows).toBe(999);
    expect(executionSummary({ ...withoutCount, status })).not.toHaveProperty("total_rows");
  });
});
