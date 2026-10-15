import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import { consumeUnmatchedRequests, server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  expect(consumeUnmatchedRequests(), "Peticiones sin handler o sin respuesta; declarar cada endpoint y esperar su resolución").toEqual([]);
});
afterAll(() => server.close());
