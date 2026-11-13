"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/supabase/redirect";
import { AuthLayout } from "./AuthLayout";

type Mode = "login" | "register" | "forgot" | "reset";

const copy = {
  login: {
    heading: "Inicia sesión", description: "Ingresa tus datos para acceder a tus conexiones y cargas.",
    submit: "Iniciar sesión", pending: "Iniciando sesión…", errorTitle: "No pudimos iniciar sesión",
    error: "Revisa tu correo y contraseña e inténtalo de nuevo.",
  },
  register: {
    heading: "Crea tu cuenta", description: "Guarda tus conexiones y consulta el historial de tus cargas.",
    submit: "Crear cuenta", pending: "Creando cuenta…", errorTitle: "No pudimos crear tu cuenta",
    error: "Revisa los datos e inténtalo de nuevo.",
  },
  forgot: {
    heading: "Recuperar acceso", description: "Ingresa el correo asociado a tu cuenta.",
    submit: "Recuperar acceso", pending: "Enviando…", errorTitle: "No pudimos enviar el correo",
    error: "Inténtalo de nuevo más tarde.",
  },
  reset: {
    heading: "Nueva contraseña", description: "Elige una contraseña para volver a acceder a tu cuenta.",
    submit: "Guardar contraseña", pending: "Guardando…", errorTitle: "No pudimos cambiar la contraseña",
    error: "Solicita un enlace nuevo de recuperación.",
  },
} satisfies Record<Mode, Record<string, string>>;

const inputClass = "h-12 border-public-field placeholder:text-public-muted";

export function AuthForm({ mode }: { mode: Mode }) {
  const [client] = useState(createClient);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const labels = copy[mode];
  const isLogin = mode === "login";
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || pending) return;

    setPending(true);
    setError("");
    setMessage("");

    try {
      switch (mode) {
        case "login": {
          const result = await client.auth.signInWithPassword({ email, password });
          if (result.error) {
            setError(labels.error);
            return;
          }
          router.replace(safeRedirect(new URLSearchParams(window.location.search).get("next")));
          break;
        }
        case "register": {
          const result = await client.auth.signUp({ email, password, options: { data: { full_name: name } } });
          if (result.error) {
            setError(labels.error);
            return;
          }
          setPassword("");
          setShowPassword(false);
          if (result.data.session) router.replace("/dashboard");
          else setError("No se inició una sesión. Intenta iniciar sesión con tus datos.");
          break;
        }
        case "forgot": {
          const result = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/auth/callback?next=/reset-password",
          });
          if (result.error) {
            setError(labels.error);
            return;
          }
          setMessage("Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.");
          break;
        }
        case "reset": {
          const { data: { user } } = await client.auth.getUser();
          if (!user) {
            setError("Abre un enlace de recuperación válido para cambiar la contraseña.");
            return;
          }
          const result = await client.auth.updateUser({ password });
          if (result.error) {
            setError(labels.error);
            return;
          }
          setPassword("");
          setShowPassword(false);
          setMessage("Contraseña actualizada. Ya puedes continuar al dashboard.");
          break;
        }
      }
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout>
      <section aria-labelledby="auth-title" className="space-y-5">
        <div>
          <h1 id="auth-title" className="text-[32px] font-bold leading-[1.15] tracking-[-.035em] lg:text-[38px]">{labels.heading}</h1>
          <p className="mt-2 text-[15px] leading-[23px] text-content-muted">{labels.description}</p>
        </div>
        {!client && (
          <Alert tone="warning" title="El acceso con cuenta no está disponible">
            Puedes usar la consola como invitado.
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-4">
            {isRegister && (
              <Input label="Nombre (opcional)" placeholder="Tu nombre" value={name} maxLength={120} autoComplete="name"
                className={inputClass} onChange={event => setName(event.target.value)} />
            )}
            {mode !== "reset" && (
              <Input label="Correo electrónico" placeholder="tu@ejemplo.com" type="email" required autoComplete="email"
                className={inputClass} value={email} onChange={event => setEmail(event.target.value)} />
            )}
            {mode !== "forgot" && (
              <div>
                <div className="relative">
                  <Input label="Contraseña" placeholder="••••••••••••" type={showPassword ? "text" : "password"}
                    required minLength={isLogin ? 1 : 12} maxLength={128} autoComplete={isLogin ? "current-password" : "new-password"}
                    className={inputClass + " pr-12"} value={password} onChange={event => setPassword(event.target.value)}
                    hint={isLogin ? undefined : <span className="text-xs">Usa al menos 12 caracteres.</span>} />
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(value => !value)}
                    className="absolute right-1 top-[28px] size-11 p-0 text-content-muted"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </Button>
                </div>
                {isLogin && (
                  <Link href="/forgot-password" className="inline-flex min-h-9 items-center text-[13px] font-semibold text-action hover:underline">
                    Olvidé mi contraseña
                  </Link>
                )}
              </div>
            )}
          </div>
          {error && <Alert tone="error" title={labels.errorTitle}>{error}</Alert>}
          {message && <Alert tone="success" title={mode === "forgot" ? "Solicitud recibida" : "Contraseña actualizada"}>{message}</Alert>}
          <Button type="submit" disabled={!client} isLoading={pending}
            className="min-h-12 w-full disabled:bg-public-blue-soft disabled:text-public-blue-ink disabled:opacity-100">
            {pending ? labels.pending : labels.submit}
          </Button>
        </form>
        <p className="text-sm text-content-muted">
          {isLogin ? "¿Aún no tienes cuenta? " : isRegister ? "¿Ya tienes cuenta? " : null}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-action hover:underline">
            {isLogin ? "Crea una cuenta" : "Inicia sesión"}
          </Link>
        </p>
        <div className="border-t border-public-line pt-5">
          <Link href="/dashboard" className="flex min-h-12 items-center justify-center rounded-lg border border-public-field px-4 text-sm font-semibold hover:bg-public-canvas">
            Continuar como invitado
          </Link>
        </div>
      </section>
    </AuthLayout>
  );
}
