import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export function createClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = cookies(); // Synchronous in the project's Next.js 14.
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components are read-only; middleware refreshes cookies. */ }
      },
    },
  });
}
