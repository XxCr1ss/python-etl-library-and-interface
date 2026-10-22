"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui";
export function UserNav() {
  const { user, loading, configured, signOut } = useAuth();
  const [error, setError] = useState(""), [pending, setPending] = useState(false);
  if (!configured) return null;
  if (loading) return <span role="status" className="text-sm text-content-muted">Comprobando sesión…</span>;
  if (!user) return <nav aria-label="Cuenta" className="flex gap-3 text-sm text-action"><Link href="/login">Iniciar sesión</Link><Link href="/register">Registrarse</Link></nav>;
  return <div className="flex flex-wrap items-center gap-3 text-sm">
    <span className="max-w-48 truncate" title={user.email}>{user.email}</span>
    <Link href="/settings/connections" className="text-action">Mis conexiones</Link>
    <Button variant="outline" size="sm" isLoading={pending} onClick={async () => { setPending(true); setError(""); try { await signOut(); } catch { setError("No se pudo cerrar la sesión."); } finally { setPending(false); } }}>Cerrar sesión</Button>
    {error && <span role="alert" className="text-danger">{error}</span>}
  </div>;
}
