"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { List } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import type { ManualEntry } from "../types";
import { ManualSearch } from "./ManualSearch";

function normalize(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function hashTarget() {
  try { return document.getElementById(decodeURIComponent(window.location.hash.slice(1))); }
  catch { return null; }
}

export function ManualSidebar({ entries }: { entries: ManualEntry[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("introduccion");
  const [open, setOpen] = useState(false);
  const focusFrame = useRef<number>();
  const mobileSearch = useRef<HTMLInputElement>(null);
  const offset = useRef(80);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const results = entries.filter(entry => tokens.every(token => normalize(`${entry.title} ${entry.id} ${entry.group} ${entry.keywords}`).includes(token)));
  const groups = Array.from(new Set(results.map(entry => entry.group)));

  useEffect(() => {
    const root = document.getElementById("manual-document");
    const header = document.querySelector("[data-app-header]");
    let scrollFrame: number | undefined;
    const headings = Array.from(root?.querySelectorAll<HTMLElement>("[data-manual-anchor]") ?? []);
    const updateActive = () => {
      const current = headings.filter(heading => heading.getBoundingClientRect().top <= offset.current + 12).at(-1);
      setActive(current?.id ?? "introduccion");
    };
    const schedule = () => { cancelAnimationFrame(scrollFrame ?? 0); scrollFrame = requestAnimationFrame(updateActive); };
    const measure = () => {
      offset.current = Math.ceil(header?.getBoundingClientRect().height ?? 64) + 16;
      root?.style.setProperty("--manual-offset", `${offset.current}px`);
      const sidebar = root?.querySelector(".manual-sidebar");
      if (sidebar && window.getComputedStyle(sidebar).display !== "none") setOpen(false);
      schedule();
    };
    const syncHash = () => {
      const target = hashTarget();
      if (target && root?.contains(target)) {
        target.focus({ preventScroll: true });
        target.scrollIntoView?.({ block: "start", behavior: "auto" });
        setActive(target.id);
      }
    };
    measure();
    // The route may be loaded with a fragment before its client island hydrates.
    syncHash();
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(schedule);
    headings.forEach(heading => observer?.observe(heading));
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (header) resize?.observe(header);
    if (root) resize?.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", syncHash);
    return () => {
      observer?.disconnect(); resize?.disconnect();
      cancelAnimationFrame(scrollFrame ?? 0); cancelAnimationFrame(focusFrame.current ?? 0);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", measure);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    setOpen(false); setActive(id);
    cancelAnimationFrame(focusFrame.current ?? 0);
    focusFrame.current = requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView?.({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    // Keep native fragment navigation and its browser history entry.
  }

  function index(mobile = false) {
    return <div className="space-y-5">
      <ManualSearch query={query} onChange={setQuery} count={results.length} inputRef={mobile ? mobileSearch : undefined} />
      <nav aria-label="Contenido del manual" className="space-y-5">
        {!results.length && <div className="rounded-lg bg-surface-muted p-3 text-sm"><p className="font-semibold">Sin resultados</p><p className="mt-1 text-content-muted">Prueba otro nombre o una clave como group_by. También puedes limpiar la búsqueda.</p></div>}
        {groups.map(group => <div key={group}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">{group}</p>
          <ul className="space-y-1">{results.filter(entry => entry.group === group).map(entry => <li key={entry.id}>
            <a href={`#${entry.id}`} onClick={event => navigate(event, entry.id)} aria-current={active === entry.id ? "location" : undefined}
              className={`block rounded-r-lg border-l-2 px-3 py-2 text-sm leading-5 transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${active === entry.id ? "border-action bg-surface-muted font-semibold text-action" : "border-transparent text-content-muted"}`}>{entry.title}</a>
          </li>)}</ul>
        </div>)}
      </nav>
    </div>;
  }

  return <>
    <div className="manual-index-trigger"><Button variant="outline" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={open ? "manual-mobile-index" : undefined}><List aria-hidden className="mr-2 h-4 w-4" />Contenido del manual</Button></div>
    <aside className="manual-sidebar min-w-0 rounded-xl border border-line bg-surface p-4" aria-label="Índice del manual">{index()}</aside>
    {open && <Modal open onClose={() => setOpen(false)} initialFocusRef={mobileSearch} title="Contenido del manual"><div id="manual-mobile-index">{index(true)}</div></Modal>}
  </>;
}
