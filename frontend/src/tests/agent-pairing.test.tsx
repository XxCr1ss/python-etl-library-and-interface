import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { API_URL } from "./fixtures/api";
import { AgentPairing } from "@/components/etl/AgentPairing";
const auth = vi.hoisted(() => ({ user: { id: "account-a" } as { id: string } | null }));
vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => auth }));
afterEach(() => { auth.user = { id: "account-a" }; });
it("issues an ephemeral pairing code and removes it on connection", async () => {
  let body: unknown;
  server.use(http.post(`${API_URL}/agents/pair`, async ({ request }) => { body = await request.json(); return HttpResponse.json({ code: "synthetic-one-time-code", expires_in: 300 }); }));
  const user = userEvent.setup(), view = render(<AgentPairing agentId="agent-example" connected={false} />);
  await user.click(screen.getByRole("button", { name: "Generar código de emparejamiento" }));
  expect(await screen.findByLabelText("Código temporal del agente")).toHaveValue("synthetic-one-time-code");
  expect(body).toEqual({ agent_id: "agent-example" });
  expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
  view.rerender(<AgentPairing agentId="agent-example" connected />);
  expect(screen.queryByLabelText("Código temporal del agente")).not.toBeInTheDocument();
});
it("never creates a pairing for a guest or overwrites an active channel", () => {
  const view=render(<AgentPairing agentId="agent-example" connected />);
  expect(screen.getByRole("button",{name:"Generar código de emparejamiento"})).toBeDisabled();
  auth.user=null; view.rerender(<AgentPairing agentId="agent-example" connected={false} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
