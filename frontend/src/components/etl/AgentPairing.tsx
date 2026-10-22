"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Input } from "@/components/ui";
import { object, request } from "@/services/apiClient";
import { requireContract as check } from "@/services/responseValidators";
export function AgentPairing({ agentId, connected }: { agentId: string; connected: boolean }) {
  const { user } = useAuth();
  const [code, setCode] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (connected || !user) setCode(""); }, [connected, user]);
  useEffect(() => { if (!code) return; const timer = setTimeout(() => setCode(""), 300000); return () => clearTimeout(timer); }, [code]);
  if (!user) return null;
  return <section className="space-y-3 border-t border-line pt-3" aria-label="Emparejamiento de agente">
    <p>Para utilizar contraseñas guardadas, detén el agente anterior, genera un código e inicia <code>python etl_agent.py --pair</code> (añade <code>--allow-load</code> para carga). Pega el código cuando el programa lo solicite. No se guarda en el historial del terminal.</p>
    <Button size="sm" variant="outline" disabled={!agentId || connected} isLoading={pending} onClick={async () => {
      setPending(true); setError("");
      try { const result = await request("agents/pair", value => { check(object(value) && typeof value.code === "string"); return value.code; }, { agent_id: agentId }); setCode(result); }
      catch (err) { setError(err instanceof Error ? err.message : "No se pudo generar el emparejamiento."); }
      finally { setPending(false); }
    }}>Generar código de emparejamiento</Button>
    {code && <><Input label="Código temporal del agente" type="password" readOnly value={code} autoComplete="off" hint="Un solo uso; vence en 5 minutos. No contiene tu sesión ni la contraseña de la base de datos." />
      <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(code); } catch { setError("No se pudo copiar el código."); } }}>Copiar código temporal</Button></>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
