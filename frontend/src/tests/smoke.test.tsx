import { expect, it, vi } from "vitest";
import { render, screen } from "./render";
import { API_URL } from "./fixtures/api";
import { consumeUnmatchedRequests } from "./mocks/server";

it("renderiza React con los matchers de jest-dom y fetch interceptado", async () => {
  render(<h1>ETL Flow Ready</h1>);
  expect(screen.getByRole("heading", { name: "ETL Flow Ready" })).toBeInTheDocument();
  expect(await (await fetch(`${API_URL}/health`)).json()).toEqual({ status: "ok", message: "ETL API is running" });
});

it("rechaza una petición no declarada sin acceder a la red", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(fetch(`${API_URL}/undeclared`)).rejects.toThrow(/onUnhandledRequest/);
  expect(error).toHaveBeenCalled();
  // Consume only this deliberately expected violation. Every other test leaves
  // this assertion to global cleanup, even when a component catches fetch.
  expect(consumeUnmatchedRequests()).toEqual([`GET ${API_URL}/undeclared`]);
});
