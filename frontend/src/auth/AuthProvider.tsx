"use client";
import { createContext, useContext, useEffect, useRef, useState, Fragment, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { invalidateAuthRequests, setTokenReader } from "@/services/authSession";
import { clearAccountSession } from "@/state/pipelineStorage";

const Context = createContext<{ user: User | null; loading: boolean; configured: boolean; signOut: () => Promise<void> }>({
  user: null, loading: false, configured: false, signOut: async () => {},
});
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createClient);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!client);
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!client) return;
    setTokenReader(async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error("No se pudo renovar la sesión. Vuelve a iniciar sesión.");
      if (!data.session && previous.current) throw new Error("La sesión terminó; vuelve a iniciar sesión.");
      return data.session?.access_token ?? null;
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null;
      if (previous.current !== (next?.id ?? null)) {
        previous.current = next?.id ?? null;
        if (event !== "INITIAL_SESSION") clearAccountSession();
        invalidateAuthRequests();
        window.dispatchEvent(new Event("etl:auth-changed"));
      }
      setUser(next); setLoading(false);
    });
    return () => { subscription.unsubscribe(); setTokenReader(null); };
  }, [client]);
  const signOut = async () => {
    const { error } = await client!.auth.signOut({ scope: "local" });
    if (error) throw new Error("No se pudo cerrar la sesión; inténtalo de nuevo.");
  };
  return <Context.Provider value={{ user, loading, configured: !!client, signOut }}><Fragment key={user?.id ?? "guest"}>{children}</Fragment></Context.Provider>;
}
