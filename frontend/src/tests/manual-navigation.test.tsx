import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppLayout from "@/app/(app)/layout";
import { ManualHelpLink } from "@/features/manual/components/ManualHelpLink";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { initialState } from "@/state/pipelineReducer";
import { persistedSession, SESSION_KEY } from "@/state/pipelineStorage";
import { mockMedia } from "./media";
import { mockDialogMethods } from "./dialog";
import { resetNavigation } from "./navigation";

vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
let restoreDialog: () => void;
beforeEach(() => { resetNavigation("/manual"); mockMedia(); restoreDialog = mockDialogMethods(); });
afterEach(() => { restoreDialog(); document.documentElement.classList.remove("dark"); });

it.each(["empty", "corrupt", "interrupted"])("la ayuda global sigue disponible con sesión %s", async mode => {
  if (mode === "corrupt") sessionStorage.setItem(SESSION_KEY, "invalid");
  if (mode === "interrupted") sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession({ ...initialState, history: [{ id: "pending", revision: 0, startedAt: "2026-10-21T12:00:00Z", status: "running", table_name: "ventas", table_type: "fact" }] })));
  render(<div onClickCapture={event => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }}><AppLayout><h1>Consulta</h1></AppLayout></div>);
  expect(screen.getByRole("link", { name: "Manual" })).toHaveAttribute("href", "/manual");
  const nav = screen.getByRole("navigation", { name: "Navegación principal" });
  expect(within(nav).getByRole("link", { name: "Manual de Usuario" })).toHaveAttribute("aria-current", "page");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Abrir navegación" }));
  const dialog = screen.getByRole("dialog", { name: "Navegación" });
  await user.click(within(dialog).getByRole("link", { name: "Manual de Usuario" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

function RunningFixture() {
  const { dispatch, state } = usePipelineSession();
  return <button disabled={state.hydrationStatus === "hydrating"} onClick={() => dispatch({ type: "executionStart", record: { id: "active", revision: 0, startedAt: "2026-10-22T12:00:00Z", status: "running", table_name: "ventas", table_type: "fact" } })}>Iniciar ejecución sintética</button>;
}
it("mantiene el acceso al manual durante una ejecución que bloquea reiniciar", async () => {
  const user = userEvent.setup();
  render(<AppLayout><h1>Proceso sintético</h1><RunningFixture /></AppLayout>);
  await user.click(await screen.findByRole("button", { name: "Iniciar ejecución sintética" }));
  expect(screen.getByRole("button", { name: "Limpiar pipeline" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Manual" })).toHaveAttribute("href", "/manual");
  expect(screen.getByRole("link", { name: "Manual de Usuario" })).not.toHaveAttribute("aria-disabled", "true");
});

it("enlaza cada ayuda contextual con su capítulo", () => {
  render(<>{(["extraccion", "transformacion", "carga"] as const).map(section => <ManualHelpLink key={section} section={section} />)}</>);
  expect(screen.getAllByRole("link", { name: "Ayuda de esta sección" }).map(link => link.getAttribute("href"))).toEqual(["/manual#extraccion", "/manual#transformacion", "/manual#carga"]);
});
