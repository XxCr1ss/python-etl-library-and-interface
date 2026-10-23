"use client";
import type { RefObject } from "react";
import Link from "next/link";
import { BookOpen, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui";
import { ResetPipelineButton } from "./ResetPipelineButton";
import { UserNav } from "./UserNav";

export function Header({ onOpenNavigation, navigationOpen, triggerRef, desktopVisible, onToggleDesktop }: {
  onOpenNavigation: () => void; navigationOpen: boolean; triggerRef: RefObject<HTMLButtonElement>;
  desktopVisible: boolean; onToggleDesktop: () => void;
}) {
  return <header data-app-header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-3 md:px-6">
    <Button ref={triggerRef} className="md:hidden" variant="ghost" aria-label="Abrir navegación" aria-expanded={navigationOpen} aria-controls="mobile-navigation" onClick={onOpenNavigation}>
      <Menu aria-hidden="true" className="h-5 w-5" />
    </Button>
    <div className="hidden items-center gap-3 md:flex"><Button variant="ghost" aria-label={desktopVisible ? "Ocultar navegación" : "Mostrar navegación"}
      title={desktopVisible ? "Ocultar navegación" : "Mostrar navegación"} aria-expanded={desktopVisible} aria-controls="desktop-navigation" onClick={onToggleDesktop}>
      {desktopVisible ? <PanelLeftClose aria-hidden className="h-5 w-5" /> : <PanelLeftOpen aria-hidden className="h-5 w-5" />}
    </Button><span className="hidden text-sm font-medium text-content-muted lg:block">Espacio de trabajo · ETL</span></div>
    <div className="flex flex-wrap items-center gap-3"><UserNav /><Link href="/manual" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-action hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><BookOpen aria-hidden className="h-4 w-4" />Manual</Link><ResetPipelineButton /></div>
  </header>;
}
