import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AuthProvider } from "@/auth/AuthProvider";
import { CredentialStore } from "@/state/credentialStore";
import { initialState } from "@/state/pipelineReducer";
import { SESSION_KEY, hydrateSession, persistedSession } from "@/state/pipelineStorage";

const auth = vi.hoisted(() => ({ listener: undefined as undefined | ((event: AuthChangeEvent, session: Session | null) => void) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (callback: typeof auth.listener) => { auth.listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
} }) }));
const session = (id: string): Session => ({ access_token: "synthetic", refresh_token: "synthetic", expires_in: 3600, token_type: "bearer",
  user: { id, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-10-21T00:00:00Z" } });
const snapshot = { ...initialState, hydrationStatus: "ready" as const, source: { type: "date_dimension" as const, start_year: 2024, end_year: 2024 } };

it("remounts local form drafts on account changes and clears the account's stored pipeline", async () => {
  function Draft() { const [password, setPassword] = useState(""); return <input aria-label="Contraseña temporal" type="password" value={password} onChange={e => setPassword(e.target.value)} />; }
  render(<AuthProvider><Draft /></AuthProvider>);
  act(() => auth.listener?.("INITIAL_SESSION", session("account-a")));
  const user=userEvent.setup(); await user.type(screen.getByLabelText("Contraseña temporal"),"synthetic-private-draft");
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession(snapshot,"account-a")));
  act(() => auth.listener?.("SIGNED_IN",session("account-b")));
  expect(screen.getByLabelText("Contraseña temporal")).toHaveValue("");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});
it("restores only the same owner's metadata and never imports guest state", () => {
  const raw=JSON.stringify(persistedSession(snapshot,"account-a"));
  const storage={ getItem: (key: string) => key===SESSION_KEY ? raw : null, setItem() {}, removeItem() {} };
  expect(hydrateSession(storage,new CredentialStore(),"account-a").source).not.toBeNull();
  expect(hydrateSession(storage,new CredentialStore(),"account-b").source).toBeNull();
  expect(hydrateSession(storage,new CredentialStore()).source).toBeNull();
  const guest={ ...storage, getItem: (key: string) => key===SESSION_KEY ? JSON.stringify(persistedSession(snapshot)) : null };
  expect(hydrateSession(guest,new CredentialStore(),"account-a").source).toBeNull();
});
it("blocks another account's history even when browser storage cannot be deleted", () => {
  const raw=JSON.stringify(persistedSession(snapshot,"account-a"));
  const storage={ getItem: (key: string) => key===SESSION_KEY ? raw : null, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  expect(hydrateSession(storage,new CredentialStore(),"account-b").source).toBeNull();
  expect(persistedSession(snapshot,"account-a").schemaVersion).toBe(2);
  expect(persistedSession(snapshot).schemaVersion).toBe(1);
});
