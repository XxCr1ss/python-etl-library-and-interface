import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/auth/AuthForm";
import { safeRedirect } from "@/lib/supabase/redirect";
const mock = vi.hoisted(() => ({ configured: true, signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mock.configured ? { auth: mock } : null }));
beforeEach(() => { mock.configured = true; });
describe("account forms", () => {
  it("confirms signup without persisting the password or assuming an active session", async () => {
    mock.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup(); render(<AuthForm mode="register" />);
    await user.type(screen.getByLabelText("Nombre"), "Persona");
    await user.type(screen.getByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "synthetic-passphrase");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(await screen.findByRole("status")).toHaveTextContent("confirmar la cuenta");
    expect(mock.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "person@example.com", options: expect.objectContaining({ data: { full_name: "Persona" } }) }));
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
    expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
  });
  it("does not echo an authentication provider's error or credentials", async () => {
    mock.signInWithPassword.mockResolvedValue({ error: { message: "private password synthetic-secret" } });
    const user = userEvent.setup(); render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "synthetic-secret");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu correo");
    expect(screen.getByRole("alert")).not.toHaveTextContent("synthetic-secret");
  });
  it("recovery does not reveal account existence", async () => {
    mock.resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup(); render(<AuthForm mode="forgot" />);
    await user.type(screen.getByLabelText("Correo electrónico"), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: "Recuperar acceso" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Si existe una cuenta");
  });
  it("preserves the guest path when Supabase is not configured", () => {
    mock.configured = false; render(<AuthForm mode="register" />);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Continuar como invitado" })).toHaveAttribute("href", "/dashboard");
  });
  it("redirects only to explicit internal destinations", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/auth/callback?code=token", null]) expect(safeRedirect(value)).toBe("/dashboard");
    expect(safeRedirect("/reset-password")).toBe("/reset-password");
  });
});
