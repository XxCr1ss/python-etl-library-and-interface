import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: "border-line bg-surface-muted text-content",
  success: "border-success bg-success-surface text-success",
  warning: "border-warning bg-warning-surface text-warning",
  error: "border-danger bg-danger-surface text-danger",
};
export function Alert({ title, children, action, tone = "info" }: {
  title: ReactNode; children: ReactNode; action?: ReactNode; tone?: keyof typeof tones;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-atomic="true" className={cn("rounded-lg border p-4 text-sm", tones[tone])}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
