import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFileExtract } from "@/app/(app)/extract/hooks/useFileExtract";
import { useExtractRequest } from "@/app/(app)/extract/hooks/useExtractRequest";
import * as extractApi from "@/services/extractApi";
import type { UploadResponse } from "@/types/etl";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL, uploadResponse } from "./fixtures/api";

describe("revisiones de extracción", () => {
  it("descarta A después de B incluso con transporte que ignora abort y bloquea doble envío", async () => {
    let finish!: (value: string) => void;
    const operation = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useExtractRequest<string>(true));
    let old!: Promise<void>;
    act(() => { old = result.current.run(operation); void result.current.run(operation); });
    expect(operation).toHaveBeenCalledOnce();
    act(() => result.current.invalidate());
    await act(() => result.current.run(async () => "B"));
    await act(async () => { finish("A"); await old; });
    expect(result.current.result).toBe("B");
  });
  it("desactivar y desmontar aborta e impide que una respuesta tardía habilite resultado", async () => {
    let finish!: (value: string) => void; let signal!: AbortSignal;
    const view = renderHook(({ active }) => useExtractRequest<string>(active), { initialProps: { active: true } });
    let pending!: Promise<void>;
    act(() => { pending = view.result.current.run(s => { signal = s; return new Promise(resolve => { finish = resolve; }); }); });
    view.rerender({ active: false }); expect(signal.aborted).toBe(true);
    await act(async () => { finish("vieja"); await pending; });
    view.rerender({ active: true }); expect(view.result.current.result).toBeNull();
    act(() => { void view.result.current.run(s => { signal = s; return new Promise(() => {}); }); });
    view.unmount(); expect(signal.aborted).toBe(true);
  });
  it("acepta MIME vacío, invalida al elegir otro archivo y no admite extensión inválida", async () => {
    server.use(http.post(`${API_URL}/extract/upload`, () => HttpResponse.json(uploadResponse)));
    const { result } = renderHook(() => useFileExtract(true));
    act(() => result.current.select([new File(["id\n1"], "datos.CSV")]));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.status).toBe("success"));
    act(() => result.current.select([new File(["id\n2"], "otro.csv")]));
    expect(result.current.result).toBeNull();
    act(() => result.current.select([new File(["x"], "x.parquet")]));
    expect(result.current.file).toBeNull(); expect(result.current.status).toBe("error");
  });
  it("archivo A tardío no habilita continuar con sus metadatos tras seleccionar y procesar B", async () => {
    let finish!: (value: UploadResponse) => void;
    const upload = vi.spyOn(extractApi, "uploadFile")
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ...uploadResponse, status: "success", filename: "B.csv", filepath: "/tmp/B.csv" });
    const { result } = renderHook(() => useFileExtract(true));
    act(() => result.current.select([new File([], "A.csv")]));
    act(() => result.current.submit()); const signal = upload.mock.calls[0][1]!;
    act(() => result.current.select([new File([], "B.csv")])); expect(signal.aborted).toBe(true);
    await act(() => result.current.submit());
    await waitFor(() => expect(result.current.result?.source).toMatchObject({ filepath: "/tmp/B.csv" }));
    await act(async () => finish({ ...uploadResponse, status: "success", filename: "A.csv", filepath: "/tmp/A.csv" }));
    expect(result.current.file?.name).toBe("B.csv"); expect(result.current.result?.label).toBe("B.csv");
    expect(result.current.result?.source).toMatchObject({ filepath: "/tmp/B.csv" });
  });
});
