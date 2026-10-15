"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  allowClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, footer, allowClose = true, initialFocusRef, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const initial = initialFocusRef?.current;
    if (initial && dialog.contains(initial)) initial.focus();
    else dialog.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open, initialFocusRef]);

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
      aria-modal="true" tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); if (allowClose) onClose(); }}
      onClose={() => { if (open && allowClose) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, summary, [tabindex]",
        )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          event.preventDefault(); first.focus();
        }
      }}
      onClick={(event) => {
        if (!allowClose || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
      className={cn("m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-line bg-surface p-0 text-content shadow-xl backdrop:bg-slate-950/60", className)}>
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>
            {description && <p id={`${id}-description`} className="mt-1 text-sm text-content-muted">{description}</p>}
          </div>
          {allowClose && <Button variant="ghost" size="sm" aria-label="Cerrar diálogo" onClick={onClose}>×</Button>}
        </header>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-line bg-surface-muted p-5">{footer}</footer>}
      </div>
    </dialog>
  );
}
