const allowed = new Set(["/dashboard", "/settings/connections", "/reset-password"]);
export function safeRedirect(value: string | null | undefined) {
  return value && allowed.has(value) ? value : "/dashboard";
}
