"use client";
import Link from "next/link";
import { useId } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Workflow } from "lucide-react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { pipelineStages } from "./pipelinePresentation";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const id = useId();
  const { state, credentials } = usePipelineSession();
  const items = [{ name: "Dashboard", href: "/dashboard", available: true, detail: "" }, ...pipelineStages(state, credentials),
    { name: "Bodega de datos", href: "/analytics", available: true, detail: "" },
    { name: "Mis conexiones", href: "/settings/connections", available: true, detail: "" },
    { name: "Configuración", href: "/settings", available: true, detail: "" },
    { name: "Manual de Usuario", href: "/manual", available: true, detail: "" }];
  return <aside className="flex h-full w-64 max-w-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-content">
    <Link href="/dashboard" onClick={onNavigate} className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--sidebar-border)] px-6 font-bold">
      <Workflow aria-hidden="true" className="h-6 w-6 text-action" /> ETL Flow
    </Link>
    <nav aria-label="Navegación principal" className="flex-1 space-y-2 overflow-y-auto p-3">
      {items.map((item, index) => <div key={item.href}>
        {item.available ? <Link href={item.href} onClick={onNavigate} aria-current={pathname === item.href ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-muted ${pathname === item.href ? "bg-surface-muted text-action" : "text-content"}`}>{item.href === "/manual" && <BookOpen aria-hidden className="h-4 w-4" />}{item.name}</Link>
          : <><span role="link" aria-disabled="true" aria-current={pathname === item.href ? "page" : undefined} aria-describedby={`${id}-${index}`} className="block px-3 py-2 text-sm font-semibold text-content-muted">{item.name}</span>
            <p id={`${id}-${index}`} className="px-3 pb-2 text-xs text-content-muted">{item.detail}</p></>}
      </div>)}
    </nav>
    <p className="border-t border-[var(--sidebar-border)] p-5 text-sm text-content-muted">Espacio de trabajo local<br /><span className="text-xs">Sesión de esta pestaña</span></p>
  </aside>;
}
