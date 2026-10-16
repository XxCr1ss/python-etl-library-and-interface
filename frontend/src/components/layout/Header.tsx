"use client";
import type { RefObject } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { ResetPipelineButton } from "./ResetPipelineButton";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ onOpenNavigation, navigationOpen, triggerRef }: {
  onOpenNavigation: () => void; navigationOpen: boolean; triggerRef: RefObject<HTMLButtonElement>;
}) {
  return <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-3 md:px-6">
    <Button ref={triggerRef} className="md:hidden" variant="ghost" aria-label="Abrir navegación" aria-expanded={navigationOpen} aria-controls="mobile-navigation" onClick={onOpenNavigation}>
      <Menu aria-hidden="true" className="h-5 w-5" />
    </Button>
    <span className="hidden text-sm font-medium text-content-muted lg:block">Espacio de trabajo · ETL</span>
    <div className="flex flex-wrap items-center gap-3"><ThemeToggle /><ResetPipelineButton /></div>
  </header>;
}
