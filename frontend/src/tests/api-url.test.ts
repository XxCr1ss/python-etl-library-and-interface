import { expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
it("reads public base URL once and normalizes trailing and relative slashes", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1///");
  vi.resetModules(); const { API_URL, request } = await import("@/services/apiClient");
  expect(API_URL).toBe("http://localhost:8000/api/v1");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://unrelated.invalid");
  server.use(http.get("http://localhost:8000/api/v1/health", () => HttpResponse.json({ status: "ok" })));
  await expect(request("///health", v => v)).resolves.toEqual({ status: "ok" });
});
