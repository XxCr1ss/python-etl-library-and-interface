"use client";

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem { id: string; label: ReactNode; content: ReactNode; disabled?: boolean }
export interface TabsProps {
  label: string;
  items: TabItem[];
  selectedId: string;
  onChange: (id: string) => void;
}
export function Tabs({ label, items, selectedId, onChange }: TabsProps) {
  const baseId = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const enabled = items.filter((item) => !item.disabled);
  return (
    <div>
      <div role="tablist" aria-label={label} aria-orientation="horizontal" className="flex flex-wrap gap-1 border-b border-line">
        {items.map((item) => (
          <button key={item.id} type="button" role="tab" id={`${baseId}-tab-${item.id}`} aria-controls={`${baseId}-panel-${item.id}`}
            aria-selected={selectedId === item.id} tabIndex={selectedId === item.id ? 0 : -1} disabled={item.disabled}
            ref={(node) => { if (node) refs.current.set(item.id, node); else refs.current.delete(item.id); }}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => {
              const index = enabled.findIndex((tab) => tab.id === item.id);
              let next: TabItem | undefined;
              if (event.key === "ArrowRight") next = enabled[(index + 1) % enabled.length];
              if (event.key === "ArrowLeft") next = enabled[(index - 1 + enabled.length) % enabled.length];
              if (event.key === "Home") next = enabled[0];
              if (event.key === "End") next = enabled[enabled.length - 1];
              if (next) { event.preventDefault(); onChange(next.id); refs.current.get(next.id)?.focus(); }
            }}
            className={cn("rounded-t-lg px-4 py-2 text-sm font-semibold text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50", selectedId === item.id && "bg-surface-muted text-action border-b-2 border-action")}>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div key={item.id} role="tabpanel" id={`${baseId}-panel-${item.id}`} aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={selectedId !== item.id} tabIndex={0} className="py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          {item.content}
        </div>
      ))}
    </div>
  );
}
