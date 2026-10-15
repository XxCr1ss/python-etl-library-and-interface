"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-action text-on-action hover:bg-action-hover",
  secondary: "border border-line bg-surface-muted text-content hover:bg-surface",
  outline: "border border-line bg-surface text-content hover:bg-surface-muted",
  ghost: "text-content hover:bg-surface-muted",
  destructive: "bg-danger-solid text-on-danger hover:opacity-90",
};
const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  isLoading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", disabled, isLoading = false, className, children, ...props }, ref,
) {
  return (
    <button {...props} ref={ref} type={type} disabled={disabled || isLoading} aria-busy={isLoading || undefined}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)}>
      {isLoading && <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />}
      {children}
    </button>
  );
});
