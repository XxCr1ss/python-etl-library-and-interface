import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "@/app/(app)/layout";
import { mockMedia } from "./media";
import { resetNavigation } from "./navigation";

vi.mock("next/navigation", async () => (await import("./navigation")).navigation);
beforeEach(() => resetNavigation());
describe("tema claro fijo", () => {
  it.each(["dark", "system"])("ignora la preferencia heredada %s y los cambios del sistema", preference => {
    const media = mockMedia({ "(prefers-color-scheme: dark)": true });
    localStorage.setItem("etl_theme_preference", preference);
    const view = render(<AppLayout><p>Contenido ETL</p></AppLayout>);
    expect(screen.getByText("Contenido ETL")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Tema" })).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("dark");
    act(() => media.change("(prefers-color-scheme: dark)", false));
    act(() => media.change("(prefers-color-scheme: dark)", true));
    expect(document.documentElement).not.toHaveClass("dark");
    view.unmount(); render(<AppLayout><p>Contenido ETL</p></AppLayout>);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(media.listeners.get("(prefers-color-scheme: dark)")?.size ?? 0).toBe(0);
  });
  it("funciona sin almacenamiento local", () => {
    mockMedia({ "(prefers-color-scheme: dark)": true });
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    render(<AppLayout><p>Contenido ETL</p></AppLayout>);
    expect(screen.getByText("Contenido ETL")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Tema" })).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
