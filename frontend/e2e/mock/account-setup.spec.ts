import { test, expect } from "@playwright/test";

test("account pages preserve the guest flow when Supabase is not configured", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
  await page.getByRole("link", { name: "Continuar como invitado" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard ETL" })).toBeVisible();
});
