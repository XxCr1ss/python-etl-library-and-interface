import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen, userEvent, within } from "./render";
import { mockDialogMethods } from "./dialog";
import { Button, Input, Select, Modal, Tabs, Badge, Card, Skeleton, LoadingSkeleton, EmptyState, Alert,
  Table, TableCaption, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui";

describe("Button", () => {
  it("mantiene nombre/ref, no envía un form por defecto y respeta disabled/loading", async () => {
    const click = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    const ref = createRef<HTMLButtonElement>();
    const view = render(<form onSubmit={submit}><Button ref={ref} onClick={click}>Guardar</Button></form>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(click).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    expect(ref.current).toBe(screen.getByRole("button"));
    view.rerender(<Button disabled onClick={click}>Guardar</Button>);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    view.rerender(<Button isLoading onClick={click}>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-busy", "true");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(click).toHaveBeenCalledOnce();
  });
});

it("Input enlaza label/hint/error, conserva ID y combina descripciones del consumidor", async () => {
  const ref = createRef<HTMLInputElement>();
  const view = render(<Input ref={ref} label="Host" hint="Servidor" error="Host obligatorio" aria-describedby="context" />);
  const input = screen.getByRole("textbox", { name: "Host" });
  const id = input.id;
  expect(ref.current).toBe(input);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", `context ${id}-hint ${id}-error`);
  expect(input).toHaveAccessibleDescription("Servidor Host obligatorio");
  await userEvent.setup().type(input, "localhost");
  expect(input).toHaveValue("localhost");
  view.rerender(<Input label="Host" hint="Servidor" />);
  expect(screen.getByRole("textbox", { name: "Host" }).id).toBe(id);
  expect(input).not.toHaveAttribute("aria-invalid", "true");
});

it("Select conserva props/ref y permite elegir con etiqueta y ayuda accesibles", async () => {
  const ref = createRef<HTMLSelectElement>();
  render(<Select ref={ref} id="motor" label="Motor" hint="Origen" error="Elige un motor" defaultValue="">
    <option value="">Seleccionar</option><option value="postgresql">PostgreSQL</option>
  </Select>);
  const select = screen.getByRole("combobox", { name: "Motor" });
  expect(ref.current).toBe(select);
  expect(select).toHaveAccessibleDescription("Origen Elige un motor");
  expect(select).toHaveAttribute("aria-invalid", "true");
  await userEvent.setup().selectOptions(select, "postgresql");
  expect(select).toHaveValue("postgresql");
});

function TabsExample() {
  const [selected, setSelected] = useState("file");
  return <Tabs label="Fuente" selectedId={selected} onChange={setSelected} items={[
    { id: "file", label: "Archivo", content: "Datos de archivo" },
    { id: "disabled", label: "Deshabilitada", content: "No disponible", disabled: true },
    { id: "database", label: "Base de datos", content: "Conexión" },
    { id: "date", label: "Fecha", content: "Años" },
  ]} />;
}

it("Tabs responde a flechas/Home/End, omite disabled y vincula paneles", async () => {
  render(<TabsExample />);
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByRole("tab", { name: "Archivo" })).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  const database = screen.getByRole("tab", { name: "Base de datos" });
  expect(database).toHaveFocus();
  expect(database).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveAttribute("id", database.getAttribute("aria-controls"));
  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "Fecha" })).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Archivo" })).toHaveFocus();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("tab", { name: "Fecha" })).toHaveFocus();
  await user.keyboard("{Home}");
  expect(screen.getByRole("tab", { name: "Archivo" })).toHaveFocus();
  await user.click(database);
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Conexión");
});

function ModalExample({ allowClose = true }: { allowClose?: boolean }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <>
    <Button onClick={() => setOpen(true)}>Configurar</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Conexión" description="Configura el origen" allowClose={allowClose}
      initialFocusRef={input} footer={<Button onClick={() => setOpen(false)}>Guardar</Button>}>
      <Input label="Servidor" ref={input} />
    </Modal>
  </>;
}

describe("Modal nativo", () => {
  let restoreDialog: () => void;
  beforeEach(() => { restoreDialog = mockDialogMethods(); });
  afterEach(() => restoreDialog());

  it("abre con nombre/descripción/foco inicial y restaura foco al cerrar", async () => {
    render(<ModalExample />);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Configurar" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Conexión" });
    expect(dialog).toHaveAccessibleDescription("Configura el origen");
    expect(screen.getByRole("textbox", { name: "Servidor" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Cerrar diálogo" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Escape nativo solicita cierre; clic interior no cierra y backdrop sí", async () => {
    render(<ModalExample />);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Configurar" });
    await user.click(trigger);
    await user.click(screen.getByRole("heading", { name: "Conexión" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    fireEvent.click(screen.getByRole("dialog"), { clientX: -1, clientY: -1 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierre bloqueado ignora Escape y backdrop; el propietario puede completar la operación", async () => {
    render(<ModalExample allowClose={false} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Configurar" }));
    expect(screen.queryByRole("button", { name: "Cerrar diálogo" })).not.toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    fireEvent.click(screen.getByRole("dialog"), { clientX: -1, clientY: -1 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

it("tabla HTML conserva caption y scope; estado vacío ofrece acción", async () => {
  const add = vi.fn();
  render(<Card aria-label="Muestra">
    <Badge tone="success">Conectado</Badge>
    <Table><TableCaption>Primeras filas</TableCaption><TableHead><TableRow><TableHeader>ID</TableHeader></TableRow></TableHead>
      <TableBody><TableRow><TableCell>0</TableCell></TableRow></TableBody></Table>
    <EmptyState title="Sin pasos" description="Agrega una transformación" action={<Button onClick={add}>Agregar</Button>} />
  </Card>);
  expect(screen.getByRole("region", { name: "Muestra" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Primeras filas" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "ID" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("cell", { name: "0" })).toBeVisible();
  expect(screen.getByText("Conectado")).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "Agregar" }));
  expect(add).toHaveBeenCalledOnce();
});

it("anuncia carga una vez y usa alert para errores, status para información", () => {
  const view = render(<LoadingSkeleton label="Cargando muestra"><Skeleton /><Skeleton /></LoadingSkeleton>);
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando muestra");
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  view.rerender(<Alert title="Error de conexión" tone="error">Revisa el host</Alert>);
  expect(screen.getByRole("alert")).toHaveTextContent("Revisa el host");
  view.rerender(<Alert title="Información">Muestra disponible</Alert>);
  expect(screen.getByRole("status")).toHaveTextContent("Muestra disponible");
});
