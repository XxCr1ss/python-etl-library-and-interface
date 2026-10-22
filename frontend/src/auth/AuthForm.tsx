"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Input, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/supabase/redirect";

type Mode = "login" | "register" | "forgot" | "reset";
const titles: Record<Mode, string> = { login: "Iniciar sesión", register: "Crear cuenta", forgot: "Recuperar acceso", reset: "Nueva contraseña" };
export function AuthForm({ mode }: { mode: Mode }) {
  const [client] = useState(createClient);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState("");
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!client || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error("Revisa tu correo, contraseña y confirmación de cuenta.");
        const next = safeRedirect(new URLSearchParams(window.location.search).get("next"));
        window.location.assign(next);
      } else if (mode === "register") {
        const result = await client.auth.signUp({ email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin + "/auth/callback" } });
        if (result.error) throw new Error("No se pudo completar el registro. Revisa los datos e inténtalo después.");
        setPassword("");
        if (result.data.session) window.location.assign("/dashboard");
        else setMessage("Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
      } else if (mode === "forgot") {
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth/callback?next=/reset-password" });
        if (result.error) throw new Error("No se pudo enviar el correo; inténtalo después.");
        setMessage("Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.");
      } else {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error("Abre un enlace de recuperación válido para cambiar la contraseña.");
        const result = await client.auth.updateUser({ password });
        if (result.error) throw new Error("No se pudo cambiar la contraseña. Solicita un enlace nuevo.");
        setPassword(""); setMessage("Contraseña actualizada. Ya puedes continuar al dashboard.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo completar la operación."); }
    finally { setPending(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6 text-content">
    <Link href="/dashboard" className="font-bold text-action">ETL Flow</Link>
    <section className="space-y-5 rounded-xl border border-line bg-surface p-6">
      <h1 className="text-2xl font-bold">{titles[mode]}</h1>
      <p className="text-sm text-content-muted">Guarda conexiones y consulta el historial de tus cargas. También puedes continuar como invitado.</p>
      {!client && <Alert tone="warning" title="Cuentas aún no configuradas">El flujo de invitado sigue disponible. Configura las variables públicas de Supabase para habilitar las cuentas.</Alert>}
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && <Input label="Nombre" value={name} maxLength={120} autoComplete="name" onChange={e => setName(e.target.value)} />}
        {mode !== "reset" && <Input label="Correo electrónico" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />}
        {mode !== "forgot" && <Input label="Contraseña" type="password" required minLength={mode === "login" ? 1 : 12} maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)}
          hint={mode === "login" ? undefined : "Usa al menos 12 caracteres."} />}
        <Button type="submit" disabled={!client} isLoading={pending}>{titles[mode]}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      <div className="flex flex-wrap gap-4 text-sm text-action">
        {mode !== "login" && <Link href="/login">Iniciar sesión</Link>}
        {mode === "login" && <><Link href="/register">Crear cuenta</Link><Link href="/forgot-password">Olvidé mi contraseña</Link></>}
        <Link href="/dashboard">Continuar como invitado</Link>
      </div>
    </section>
  </main>;
}
