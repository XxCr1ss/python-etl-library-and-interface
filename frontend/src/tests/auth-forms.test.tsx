import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "@/app/(auth)/login/page";
import Register from "@/app/(auth)/register/page";
import Forgot from "@/app/(auth)/forgot-password/page";
import Reset from "@/app/(auth)/reset-password/page";
import { safeRedirect } from "@/lib/supabase/redirect";
import { router } from "./navigation";

const auth = vi.hoisted(() => ({
  configured: true, signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), getUser: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => auth.configured ? { auth } : null }));
vi.mock("next/navigation", async () => (await import("./navigation")).navigation);

const email = "person@example.com";
const password = "synthetic-passphrase";

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.type(screen.getByLabelText("Contraseña", { exact: true }), password);
}

beforeEach(() => {
  auth.configured = true;
  window.history.replaceState(null, "", "/");
});

describe("account forms", () => {
  it("starts a session immediately after signup and sends the user to the dashboard", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { user: { id: "fixture-user" } } }, error: null });
    const user = userEvent.setup();
    render(<Register />);

    expect(screen.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/login");
    const name = screen.getByLabelText("Nombre (opcional)");
    expect(name).not.toBeRequired();
    await user.type(name, "Persona");
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(auth.signUp).toHaveBeenCalledWith({ email, password, options: { data: { full_name: "Persona" } } });
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("");
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it("blocks a second registration while pending and handles a missing session safely", async () => {
    let resolveSignup!: (value: { data: { session: null }; error: null }) => void;
    auth.signUp.mockReturnValue(new Promise(resolve => { resolveSignup = resolve; }));
    const user = userEvent.setup();
    render(<Register />);
    await fillCredentials(user);
    const submit = screen.getByRole("button", { name: "Crear cuenta" });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleName("Creando cuenta…");
    fireEvent.submit(submit.closest("form")!);
    expect(auth.signUp).toHaveBeenCalledTimes(1);

    resolveSignup({ data: { session: null }, error: null });
    expect(await screen.findByRole("alert")).toHaveTextContent("No se inició una sesión");
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveValue("");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reports signup errors without showing the provider response", async () => {
    auth.signUp.mockResolvedValue({ error: { message: "user already registered" } });
    const user = userEvent.setup();
    render(<Register />);
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos crear tu cuenta");
    expect(alert).not.toHaveTextContent("user already registered");
  });

  it("signs in and returns to an allowed destination", async () => {
    window.history.replaceState(null, "", "/login?next=/settings/connections");
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<Login />);
    expect(screen.getByRole("link", { name: "Crea una cuenta" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Olvidé mi contraseña" })).toHaveAttribute("href", "/forgot-password");
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email, password });
    expect(router.replace).toHaveBeenCalledWith("/settings/connections");
  });

  it("lets users show and hide the password without submitting", async () => {
    const user = userEvent.setup();
    render(<Login />);
    const field = screen.getByLabelText("Contraseña", { exact: true });
    expect(field).toHaveAttribute("type", "password");
    await user.type(field, password);
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(field).toHaveAttribute("type", "text");
    expect(field).toHaveValue(password);
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(field).toHaveAttribute("type", "password");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each(["response error", "network failure"])("sanitizes login errors from a %s", async failure => {
    const cause = new Error("private password synthetic-secret");
    if (failure === "network failure") auth.signInWithPassword.mockRejectedValue(cause);
    else auth.signInWithPassword.mockResolvedValue({ error: cause });
    const user = userEvent.setup();
    render(<Login />);
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Revisa tu correo y contraseña");
    expect(alert).not.toHaveTextContent("synthetic-secret");
  });

  it.each([null, { message: "private error" }])("handles password recovery without revealing account existence", async error => {
    auth.resetPasswordForEmail.mockResolvedValue({ error });
    const user = userEvent.setup();
    render(<Forgot />);
    await user.type(screen.getByLabelText("Correo electrónico"), email);
    await user.click(screen.getByRole("button", { name: "Recuperar acceso" }));

    const feedback = await screen.findByRole(error ? "alert" : "status");
    expect(feedback).toHaveTextContent(error ? "No pudimos enviar el correo" : "Si existe una cuenta");
    expect(feedback).not.toHaveTextContent("private error");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: window.location.origin + "/auth/callback?next=/reset-password",
    });
  });

  it.each([
    { user: null, error: null, feedback: "Abre un enlace de recuperación válido" },
    { user: { id: "fixture-user" }, error: { message: "private error" }, feedback: "Solicita un enlace nuevo" },
    { user: { id: "fixture-user" }, error: null, feedback: "Ya puedes continuar al dashboard" },
  ])("shows feedback when resetting a password", async ({ user, error, feedback }) => {
    auth.getUser.mockResolvedValue({ data: { user } });
    auth.updateUser.mockResolvedValue({ error });
    const browser = userEvent.setup();
    render(<Reset />);
    await browser.type(screen.getByLabelText("Contraseña", { exact: true }), password);
    await browser.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText(new RegExp(feedback))).toBeVisible();
    if (user) expect(auth.updateUser).toHaveBeenCalledWith({ password });
    else expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("preserves guest access when Supabase is unavailable", () => {
    auth.configured = false;
    render(<Register />);

    expect(screen.getByRole("status")).toHaveTextContent("El acceso con cuenta no está disponible");
    const main = screen.getByRole("main");
    const submit = within(main).getByRole("button", { name: "Crear cuenta" });
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(within(main).getByRole("link", { name: "Continuar como invitado" })).toHaveAttribute("href", "/dashboard");
  });

  it("redirects only to explicit internal destinations", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/auth/callback?code=token", null]) {
      expect(safeRedirect(value)).toBe("/dashboard");
    }
    expect(safeRedirect("/reset-password")).toBe("/reset-password");
  });
});
