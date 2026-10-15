import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={cn("rounded-xl border border-line bg-surface p-5 text-content shadow-sm", className)}>{children}</section>;
}
