import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-surface-muted text-content-muted",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  error: "bg-danger-surface text-danger",
  pending: "bg-surface-muted text-pipeline-pending",
  active: "bg-surface-muted text-pipeline-active",
  complete: "bg-success-surface text-pipeline-complete",
  blocked: "bg-danger-surface text-pipeline-blocked",
  numeric: "bg-surface-muted text-dtype-numeric font-mono",
  text: "bg-surface-muted text-dtype-text font-mono",
  date: "bg-surface-muted text-dtype-date font-mono",
  boolean: "bg-surface-muted text-dtype-boolean font-mono",
  unknown: "bg-surface-muted text-dtype-unknown font-mono",
};
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: keyof typeof tones }
export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return <span {...props} className={cn("inline-flex rounded px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
