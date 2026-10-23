"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PipelineStepper } from "./PipelineStepper";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [desktopVisible, setDesktopVisible] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  return <div className="min-h-screen">
    <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-24 rounded bg-action p-3 text-on-action focus:translate-y-0">Saltar al contenido</a>
    <div id="desktop-navigation" hidden={!desktopVisible} className={`fixed inset-y-0 left-0 z-20 ${desktopVisible ? "hidden md:block" : "hidden"}`}><Sidebar /></div>
    <div className={`min-w-0 ${desktopVisible ? "md:ml-64" : ""}`}>
      <Header onOpenNavigation={() => setOpen(true)} navigationOpen={open} triggerRef={triggerRef}
        desktopVisible={desktopVisible} onToggleDesktop={() => setDesktopVisible(value => !value)} />
      <div className="p-4 md:px-8">{pathname !== "/analytics" && <PipelineStepper />}</div>
      <main id="main-content" tabIndex={-1} className="min-w-0 p-4 pt-0 md:p-8 md:pt-0">{children}</main>
    </div>
    <div id="mobile-navigation">{open && <Modal open={open} onClose={() => setOpen(false)} title="Navegación" className="max-w-sm">
      <Sidebar onNavigate={() => { setOpen(false); triggerRef.current?.focus(); }} />
    </Modal>}</div>
  </div>;
}
