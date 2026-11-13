import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";

describe("ETL Flow home", () => {
  it("links to sign-in, registration, guest access, and the installation instructions", () => {
    render(<LandingPage />);

    const navigation = screen.getByRole("navigation", { name: "Acceso" });
    const main = screen.getByRole("main");
    expect(within(navigation).getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
    expect(within(navigation).getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/register");
    expect(within(main).getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/register");
    expect(within(main).getByRole("link", { name: "Explorar como invitado" })).toHaveAttribute("href", "/dashboard");
    expect(within(main).getByRole("link", { name: "Ver guía de instalación" })).toHaveAttribute("href", "#install-section");
    expect(screen.getByRole("region", { name: "Instala el agente local" })).toHaveAttribute("id", "install-section");
    expect(screen.getByRole("figure")).toHaveTextContent("Agente Python");
  });

  it("copies the entire installation sequence and announces success", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<LandingPage />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^git clone .*\ncd .*\npip install -r requirements\.txt\npython etl_agent\.py$/));
    expect(screen.getByRole("status")).toHaveTextContent("Comandos copiados.");
  });

  it("keeps the commands visible when the browser refuses clipboard access", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard unavailable"));
    render(<LandingPage />);

    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Selecciona los comandos para copiarlos manualmente.");
    expect(screen.getByText(/pip install -r requirements.txt/)).toBeVisible();
  });
});
