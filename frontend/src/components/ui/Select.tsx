"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, useField, controlClassName, type FieldProps } from "./Field";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, error, className, children, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref,
) {
  const field = useField(id, describedBy, hint, error);
  return (
    <Field id={field.id} label={label} hint={hint} error={error}>
      <select {...props} ref={ref} id={field.id} aria-describedby={field.describedBy} aria-invalid={field.hasError || invalid}
        className={cn(controlClassName, className)}>{children}</select>
    </Field>
  );
});
