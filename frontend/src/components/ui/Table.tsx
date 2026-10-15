import { type HTMLAttributes, type TableHTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={cn("w-full border-collapse text-left text-sm text-content", className)} />;
}
export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption {...props} className={cn("caption-bottom p-3 text-left text-sm text-content-muted", className)} />;
}
export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn("bg-surface-muted", className)} />;
}
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) { return <tbody {...props} />; }
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("border-b border-line", className)} />;
}
export function TableHeader({ scope = "col", className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} scope={scope} className={cn("px-4 py-3 font-semibold", className)} />;
}
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn("px-4 py-3", className)} />;
}
