import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDialogMethods } from "./dialog";
import { cleanup } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { render as baseRender, screen, userEvent, waitFor } from "./render";
import { PipelineProvider } from "@/state/PipelineProvider";
import { SESSION_KEY } from "@/state/pipelineStorage";
import type { ReactElement } from "react";
const render = (ui: ReactElement) => baseRender(<PipelineProvider>{ui}</PipelineProvider>);
const wireSource = { type: "file", filepath: fileSource.filepath };
const savedSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
import { navigation, resetNavigation, router } from "./navigation";
import { API_URL, fileSource, previewResponse, uploadResponse } from "./fixtures/api";
import salesCsv from "./fixtures/sample_sales.csv?raw";
import customersCsv from "./fixtures/customers.csv?raw";
import { server } from "./mocks/server";
import ExtractPage from "@/app/(app)/extract/page";
import TransformPage from "@/app/(app)/transform/page";
import LoadPage from "@/app/(app)/load/page";
import AddStepModal from "@/app/(app)/transform/components/AddStepModal";

vi.mock("next/navigation", () => navigation);
let restoreDialog: () => void;
beforeEach(() => { resetNavigation(); restoreDialog = mockDialogMethods(); });
afterEach(() => { cleanup(); restoreDialog(); });

async function selectFile() {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText("Archivo de origen"), new File([salesCsv], "sample_sales.csv", { type: "text/csv" }));
  return user;
}

describe("caracterización del pipeline existente", () => {
  it("sin fuente guía desde Transform a extracción", () => {
    render(<TransformPage />);
    expect(screen.getByRole("heading", { name: /paso bloqueado/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /configurar origen/i })).toHaveAttribute("href", "/extract");
  });

  it("sin fuente guía desde Load a Transform, cuyo bloqueo enlaza a extracción", () => {
    render(<LoadPage />);
    expect(screen.getByRole("heading", { name: /paso bloqueado/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir a transformaciones/i })).toHaveAttribute("href", "/transform");
  });

  it("upload envía multipart file, muestra preview_data y continuar conserva fuente y receta vacía", async () => {
    let uploaded: File | null = null;
    server.use(http.post(`${API_URL}/extract/upload`, async ({ request }) => {
      uploaded = (await request.formData()).get("file") as File;
      return HttpResponse.json(uploadResponse);
    }));
    render(<ExtractPage />);
    const user = await selectFile();
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" }));
    await screen.findByText("Archivo procesado exitosamente para vista previa.");
    expect(screen.getAllByRole("cell", { name: "a;b" })).toHaveLength(2);
    expect(uploaded).toMatchObject({ name: "sample_sales.csv", type: "text/csv" });
    expect(await uploaded!.text()).toBe(salesCsv);
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(savedSession().source).toMatchObject(wireSource);
    expect(savedSession().recipe.map(({ type, params }: { type: string; params: unknown }) => ({ type, params }))).toEqual([]);
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/transform");
  });

  it("durante upload bloquea doble envío y tras HTTP 400 muestra error sin navegar", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    let requests = 0;
    server.use(http.post(`${API_URL}/extract/upload`, async () => {
      requests++;
      await pending;
      return HttpResponse.json({ detail: "CSV inválido" }, { status: 400 });
    }));
    render(<ExtractPage />);
    const user = await selectFile();
    const process = screen.getByRole("button", { name: "Procesar Archivo" });
    await user.click(process);
    expect(process).toBeDisabled();
    await user.click(process);
    finish();
    expect(await screen.findByText("CSV inválido")).toBeVisible();
    expect(requests).toBe(1);
    expect(process).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Continuar a Transformación" })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("etl_active_source")).toBeNull();
  });

  it("Transform envía source/steps/limit 10, renderiza preview_data y conserva orden al añadir/quitar", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    const first = { type: "select_columns", params: { columns: ["id", "col_monto"] } };
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify([first]));
    const requests: unknown[] = [];
    server.use(http.post(`${API_URL}/transform/preview`, async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json({ ...previewResponse, preview_data: [{ id: 91, col_monto: "muestra del servidor" }] });
    }));
    render(<TransformPage />);
    expect(await screen.findByRole("cell", { name: "muestra del servidor" })).toBeVisible();
    expect(requests[0]).toEqual({ source: wireSource, steps: [first], limit: 10 });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Agregar Transformación" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Columna Original" }), "col_monto");
    await user.type(screen.getByRole("textbox", { name: "Nuevo Nombre" }), "ingreso_total");
    await user.click(screen.getByRole("button", { name: "Aplicar Operación" }));
    const second = { type: "rename_columns", params: { columns: { col_monto: "ingreso_total" } } };
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual({ source: wireSource, steps: [first, second], limit: 10 });
    expect(savedSession().recipe.map(({ type, params }: { type: string; params: unknown }) => ({ type, params }))).toEqual([first, second]);
    const confirmRemove = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getAllByRole("button", { name: "Eliminar este paso" })[0]);
    expect(confirmRemove).toHaveBeenCalledWith(expect.stringContaining("puede invalidar los pasos siguientes"));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]).toEqual({ source: wireSource, steps: [second], limit: 10 });
    expect(savedSession().recipe.map(({ type, params }: { type: string; params: unknown }) => ({ type, params }))).toEqual([second]);
  });

  it("Transform muestra error HTTP del motor", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    server.use(http.post(`${API_URL}/transform/preview`, () => HttpResponse.json({ detail: "Archivo no encontrado" }, { status: 404 })));
    render(<TransformPage />);
    expect(await screen.findByText("Archivo no encontrado")).toBeVisible();
    expect(screen.getByRole("link", { name: /continuar a la carga/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("reemplazar fuente exige confirmación y reinicia atómicamente la receta", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    sessionStorage.setItem("etl_transform_recipe", JSON.stringify([{ type: "prefix_header", params: { prefix: "pre_" } }]));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ExtractPage />); const user = await selectFile();
    await user.click(screen.getByRole("button", { name: "Procesar Archivo" })); await screen.findByText("Archivo procesado exitosamente para vista previa.");
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(confirm).toHaveBeenCalledOnce(); expect(savedSession().recipe).toHaveLength(1); expect(router.push).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Continuar a Transformación" }));
    expect(savedSession().recipe).toEqual([]); expect(savedSession().source).toMatchObject(wireSource); expect(router.push).toHaveBeenCalledExactlyOnceWith("/transform");
  });

  it("receta vacía conserva fuente, preview limit 1 y carga simulada con recipe vacío", async () => {
    sessionStorage.setItem("etl_active_source", JSON.stringify(fileSource));
    sessionStorage.setItem("etl_transform_recipe", "[]");
    const transform = render(<TransformPage />);
    expect(await screen.findByRole("columnheader", { name: /col_monto/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuar a la carga/i })).toHaveAttribute("href", "/load");
    transform.unmount();
    const requests: unknown[] = [];
    let loadPayload: unknown;
    server.use(
      http.post(`${API_URL}/transform/preview`, async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(previewResponse);
      }),
      http.post(`${API_URL}/load/execute`, async ({ request }) => {
        loadPayload = await request.json();
        return HttpResponse.json({ status: "success", message: "Carga simulada sin motor real",
          table_name: "dim_muestra", table_type: "dimension", total_rows: 12, preview_data: previewResponse.preview_data });
      }),
    );
    render(<LoadPage />);
    expect(screen.getByText("Carga directa (sin pasos de transformación en cola).")).toBeVisible();
    await waitFor(() => expect(requests).toEqual([{ source: wireSource, steps: [], limit: 1 }]));
    expect(savedSession().source).toMatchObject(wireSource);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("ej. dim_medico o fact_consulta"), "dim_muestra");
    await user.click(screen.getByRole("button", { name: "Usar contraseña vacía explícitamente" }));
    await user.click(screen.getByRole("button", { name: "Probar Conexión Bodega" }));
    await screen.findByText("Conectado Correctamente");
    await user.click(screen.getByRole("button", { name: "Iniciar Carga en Bodega de Datos" }));
    expect(await screen.findByRole("heading", { name: "¡Pipeline de Carga Completado!" })).toBeVisible();
    expect(loadPayload).toEqual({
      source: wireSource, recipe: [],
      target_connection: { db_type: "postgresql", host: "localhost", port: 5432, database: "base_de_destino", user: "postgres", password: "" },
      load_config: { table_name: "dim_muestra", table_type: "dimension", if_exists: "replace" },
    });
  });
});

describe("AddStepModal: identidad de los cuatro joins", () => {
  it.each(["left_join", "right_join", "inner_join", "outer_join"])("emite %s con right_source y on", async (type) => {
    const onAddStep = vi.fn();
    const onClose = vi.fn();
    render(<AddStepModal isOpen onClose={onClose} availableColumns={["id"]} onAddStep={onAddStep} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Buscar operación" }), type);
    await user.click(screen.getByRole("button", { name: /Unión Horizontal/ }));
    await user.upload(screen.getByLabelText("Archivo de origen"), new File([customersCsv], "customers.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: "Procesar archivo secundario" }));
    await screen.findByText(/Origen procesado/);
    await user.click(screen.getByRole("button", { name: "Confirmar fuente secundaria" }));
    await user.clear(screen.getByRole("textbox", { name: /Claves de cruce/ }));
    await user.type(screen.getByRole("textbox", { name: /Claves de cruce/ }), '"id"');
    await user.click(screen.getByRole("button", { name: "Aplicar Operación" }));
    expect(onAddStep).toHaveBeenCalledExactlyOnceWith({
      type, params: { on: "id", right_source: {
        type: "file", filepath: uploadResponse.filepath,
        filename: uploadResponse.filename, unique_filename: uploadResponse.unique_filename,
      } },
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
