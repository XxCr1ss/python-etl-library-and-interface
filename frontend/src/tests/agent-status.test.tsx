import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import * as extractApi from "@/services/extractApi";

describe("polling serial del agente", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.spyOn(document, "hidden", "get").mockReturnValue(false); });
  afterEach(() => vi.useRealTimers());
  it("consulta inmediatamente, espera a terminar más 3 s, diferencia desconexión de error y permite reintento", async () => {
    let release!: (value: { agent_id: string; connected: boolean }) => void;
    const api = vi.spyOn(extractApi, "getAgentStatus").mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const view = renderHook(() => useAgentStatus(true, "existing-id"));
    expect(view.result.current.status).toBe("checking"); expect(api).toHaveBeenCalledOnce();
    expect(api.mock.calls[0][0]).toBe("existing-id");
    await act(() => vi.advanceTimersByTimeAsync(9000)); expect(api).toHaveBeenCalledOnce();
    await act(async () => release({ agent_id: "existing-id", connected: true }));
    expect(view.result.current.status).toBe("connected");
    api.mockResolvedValueOnce({ agent_id: "existing-id", connected: false });
    await act(() => vi.advanceTimersByTimeAsync(2999)); expect(api).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(1)); expect(view.result.current.status).toBe("disconnected");
    api.mockRejectedValueOnce(new Error("Red no disponible"));
    await act(() => vi.advanceTimersByTimeAsync(3000)); expect(view.result.current.status).toBe("error");
    expect(view.result.current.error).toBe("Red no disponible");
    api.mockResolvedValueOnce({ agent_id: "existing-id", connected: true });
    await act(() => view.result.current.retry()); expect(view.result.current.status).toBe("connected");
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it("suspende al ocultar, aborta, ignora respuesta vieja y consulta al volver", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    let release!: (value: { agent_id: string; connected: boolean }) => void;
    const api = vi.spyOn(extractApi, "getAgentStatus").mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const view = renderHook(() => useAgentStatus(true, "id")); const signal = api.mock.calls[0][1]!;
    act(() => { hidden.mockReturnValue(true); document.dispatchEvent(new Event("visibilitychange")); });
    expect(signal.aborted).toBe(true);
    await act(async () => { release({ agent_id: "id", connected: true }); await vi.advanceTimersByTimeAsync(15000); });
    expect(api).toHaveBeenCalledOnce(); expect(view.result.current.status).toBe("checking");
    api.mockResolvedValueOnce({ agent_id: "id", connected: false });
    await act(async () => { hidden.mockReturnValue(false); document.dispatchEvent(new Event("visibilitychange")); });
    expect(api).toHaveBeenCalledTimes(2); expect(view.result.current.status).toBe("disconnected");
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it("sin modo/ID no consulta, desactivar o desmontar cancela y limpia listeners", async () => {
    const api = vi.spyOn(extractApi, "getAgentStatus").mockImplementation(() => new Promise(() => {}));
    const view = renderHook(({ active, id }) => useAgentStatus(active, id), { initialProps: { active: false, id: "id" } });
    expect(api).not.toHaveBeenCalled();
    view.rerender({ active: true, id: "" }); expect(api).not.toHaveBeenCalled();
    view.rerender({ active: true, id: "id" }); const signal = api.mock.calls[0][1]!;
    view.rerender({ active: false, id: "id" }); expect(signal.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10000)); expect(api).toHaveBeenCalledOnce();
    view.rerender({ active: true, id: "id" }); const last = api.mock.calls[1][1]!;
    view.unmount(); expect(last.aborted).toBe(true);
    act(() => document.dispatchEvent(new Event("visibilitychange"))); expect(api).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
