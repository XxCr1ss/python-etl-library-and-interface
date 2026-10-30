import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";
import { GET } from "@/app/auth/callback/route";

const state = vi.hoisted(() => ({ user: null as { id: string } | null, error: null as { message: string } | null,
  cookie: { name: "session", value: "refreshed", options: { httpOnly: true, path: "/" } }, exchange: vi.fn(), saved: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: state.saved }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: { cookies: {
  getAll: () => unknown; setAll: (values: typeof state.cookie[], headers?: Record<string, string>) => void;
} }) => ({ auth: {
  getUser: async () => {
    options.cookies.getAll();
    options.cookies.setAll([state.cookie], { expires: "0", pragma: "no-cache" });
    return { data: { user: state.user } };
  },
  exchangeCodeForSession: async (code: string) => {
    state.exchange(code); options.cookies.setAll([state.cookie]); return { error: state.error };
  },
} }) }));

beforeEach(() => {
  state.user = null; state.error = null;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
});

it("keeps guest ETL available when authentication is not configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  const response = await middleware(new NextRequest("https://app.example/extract"));
  expect(response.headers.get("x-middleware-next")).toBe("1");
});

it("redirects protected guest requests and preserves refreshed cookies and cache headers", async () => {
  const response = await middleware(new NextRequest("https://app.example/settings/connections?old=1"));
  expect(response.headers.get("location")).toBe("https://app.example/login?next=/settings/connections");
  expect(response.cookies.get("session")?.value).toBe("refreshed");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
});

it.each(["/extract", "/settings/connections"])("allows authenticated access to %s without caching", async path => {
  state.user = { id: "owner" };
  const response = await middleware(new NextRequest("https://app.example" + path));
  expect(response.headers.get("location")).toBeNull();
  expect(response.cookies.get("session")?.value).toBe("refreshed");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each(["/settings/connections", "https://evil.example", "//evil.example"])("exchanges a code and restricts the return URL (%s)", async next => {
  const response = await GET(new NextRequest("https://app.example/auth/callback?code=one-time&next=" + encodeURIComponent(next)));
  expect(state.exchange).toHaveBeenCalledWith("one-time");
  expect(response.headers.get("location")).toBe("https://app.example" + (next === "/settings/connections" ? next : "/dashboard"));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(state.saved).toHaveBeenCalledWith("session", "refreshed", state.cookie.options);
});

it("sends failed or incomplete callbacks back to login", async () => {
  state.error = { message: "expired" };
  for (const suffix of ["?code=expired", ""]) {
    const response = await GET(new NextRequest("https://app.example/auth/callback" + suffix));
    expect(response.headers.get("location")).toBe("https://app.example/login?error=invalid_link");
  }
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const response = await GET(new NextRequest("https://app.example/auth/callback?code=unused"));
  expect(response.headers.get("location")).toContain("error=invalid_link");
});
