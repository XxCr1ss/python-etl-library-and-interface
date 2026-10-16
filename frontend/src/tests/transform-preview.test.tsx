import { StrictMode, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PipelineProvider } from "@/state/PipelineProvider";
import { previewTransform } from "@/services/transformApi";
import { useTransformPreview } from "@/app/(app)/transform/hooks/useTransformPreview";
import { useStepEditor } from "@/app/(app)/transform/hooks/useStepEditor";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { previewResponse as rawPreviewResponse } from "./fixtures/api";
import type { PreviewResponse } from "@/types/etl";
const previewResponse: PreviewResponse = { ...rawPreviewResponse, status: "success" };
vi.mock("@/services/transformApi", () => ({ previewTransform: vi.fn() }));
const request = vi.mocked(previewTransform);
const wrapper = ({ children }: { children: ReactNode }) => <PipelineProvider>{children}</PipelineProvider>;
beforeEach(() => { vi.useFakeTimers(); sessionStorage.setItem("etl_active_source", JSON.stringify({ type: "file", filepath: "/synthetic.csv" })); request.mockResolvedValue(previewResponse); });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { resolve, reject, promise }; }

it("preview inicial con receta vacía usa limit 10; agrupa cambios confirmados en 250 ms", async () => {
  const { result } = renderHook(useTransformPreview, { wrapper }); await tick(0);
  expect(request).toHaveBeenCalledOnce(); expect(request.mock.calls[0][0]).toEqual({ source: { type: "file", filepath: "/synthetic.csv" }, steps: [], limit: 10 });
  act(() => { result.current.addStep({ type: "prefix_header", params: { prefix: "p_" } }); result.current.addStep({ type: "suffix_header", params: { suffix: "_s" } }); });
  expect(result.current.isReadyForLoad).toBe(false); expect(result.current.displayData).toEqual(previewResponse); expect(result.current.stale).toBe(true);
  await tick(249); expect(request).toHaveBeenCalledOnce(); await tick(1); expect(request).toHaveBeenCalledTimes(2); expect(request.mock.calls[1][0].steps.map(s => s.type)).toEqual(["prefix_header", "suffix_header"]);
  expect(result.current.isReadyForLoad).toBe(true);
});
it("A finaliza después de B ignorando aborto y no modifica datos/error/loading de B", async () => {
  const a = deferred<PreviewResponse>(); const b = deferred<PreviewResponse>(); request.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(useTransformPreview, { wrapper }); await tick(0);
  const signalA = request.mock.calls[0][1]; act(() => result.current.addStep({ type: "prefix_header", params: { prefix: "p_" } })); await tick(250);
  expect(signalA?.aborted).toBe(true);
  await act(async () => b.resolve({ ...previewResponse, columns: ["B"], preview_data: [{ B: 0 }] }));
  expect(result.current.state.preview.status).toBe("success"); expect(result.current.displayData?.columns).toEqual(["B"]);
  await act(async () => a.reject(new Error("A tardío")));
  expect(result.current.displayData?.columns).toEqual(["B"]); expect(result.current.state.preview.error).toBeUndefined(); expect(result.current.isReadyForLoad).toBe(true);
});
it("A exitoso tardío tampoco reemplaza el resultado actual; error seguido de refresh exitoso", async () => {
  const a = deferred<PreviewResponse>(); request.mockReturnValueOnce(a.promise).mockResolvedValueOnce({ ...previewResponse, columns: ["B"] });
  const { result } = renderHook(useTransformPreview, { wrapper }); await tick(0);
  act(() => result.current.addStep({ type: "suffix_header", params: { suffix: "_s" } })); await tick(250);
  await act(async () => a.resolve({ ...previewResponse, columns: ["A"] })); expect(result.current.displayData?.columns).toEqual(["B"]);
  request.mockRejectedValueOnce(new Error("error de fórmula")); await act(async () => result.current.refresh());
  expect(result.current.isReadyForLoad).toBe(false); expect(result.current.displayData?.columns).toEqual(["B"]); expect(result.current.state.preview.error).toBe("error de fórmula");
  await act(async () => result.current.refresh()); expect(result.current.isReadyForLoad).toBe(true); expect(result.current.state.preview.error).toBeUndefined();
});
it("Strict Mode y desmontaje limpian timer/abort sin solicitudes duplicadas ni warnings", async () => {
  const errors = vi.spyOn(console, "error"); const a = deferred<PreviewResponse>(); request.mockReturnValueOnce(a.promise);
  const { result, unmount } = renderHook(useTransformPreview, { wrapper: ({ children }) => <StrictMode><PipelineProvider>{children}</PipelineProvider></StrictMode> }); await tick(250);
  expect(request).toHaveBeenCalledOnce(); const signal = request.mock.calls[0][1];
  act(() => result.current.addStep({ type: "prefix_header", params: { prefix: "p_" } })); unmount(); await tick(500);
  await act(async () => a.resolve(previewResponse)); expect(signal?.aborted).toBe(true); expect(request).toHaveBeenCalledOnce(); expect(errors).not.toHaveBeenCalled();
});
it("prefijos A/B descartan respuestas tras cancelar y no validan la preview final", async () => {
  sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "rename_columns", params: { columns: { a: "x" } } }, { type: "filter_value", params: { column: "x", value: 0 } }]));
  const a = deferred<PreviewResponse>(); const b = deferred<PreviewResponse>(); request.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(() => ({ editor: useStepEditor(), session: usePipelineSession() }), { wrapper });
  act(() => result.current.editor.open(result.current.session.state.recipe[0].id));
  const signalA = request.mock.calls[0][1]; act(() => result.current.editor.close()); act(() => result.current.editor.open(result.current.session.state.recipe[1].id));
  expect(signalA?.aborted).toBe(true); expect(request.mock.calls[1][0].steps).toEqual([{ type: "rename_columns", params: { columns: { a: "x" } } }]);
  await act(async () => b.resolve({ ...previewResponse, columns: ["x"] })); await act(async () => a.resolve({ ...previewResponse, columns: ["antiguo"] }));
  expect(result.current.editor.schema.context.columns).toEqual(["x"]); expect(result.current.session.state.preview.status).toBe("pending"); expect(result.current.session.isReadyForLoad).toBe(false);
});
