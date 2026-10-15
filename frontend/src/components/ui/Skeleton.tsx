import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return <div {...props} aria-hidden="true" className={cn("h-4 rounded bg-skeleton motion-safe:animate-pulse", className)} />;
}
export function LoadingSkeleton({ label = "Cargando datos…", children }: { label?: string; children: ReactNode }) {
  return <div role="status" aria-busy="true"><span className="sr-only">{label}</span><div aria-hidden="true">{children}</div></div>;
}
