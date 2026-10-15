"use client";

import { useId, type ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}
function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false && value !== "";
}
export function useField(id: string | undefined, describedBy: string | undefined, hint: ReactNode, error: ReactNode) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hasError = hasContent(error);
  return {
    id: fieldId, hasError,
    describedBy: [describedBy, hasContent(hint) ? `${fieldId}-hint` : null, hasError ? `${fieldId}-error` : null].filter(Boolean).join(" ") || undefined,
  };
}
export function Field({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-content">{label}</label>
      {children}
      {hasContent(hint) && <p id={`${id}-hint`} className="text-sm text-content-muted">{hint}</p>}
      {hasContent(error) && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
export const controlClassName = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";
