"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, useField, controlClassName, type FieldProps } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, className, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref,
) {
  const field = useField(id, describedBy, hint, error);
  return (
    <Field id={field.id} label={label} hint={hint} error={error}>
      <input {...props} ref={ref} id={field.id} aria-describedby={field.describedBy} aria-invalid={field.hasError || invalid}
        className={cn(controlClassName, className)} />
    </Field>
  );
});
