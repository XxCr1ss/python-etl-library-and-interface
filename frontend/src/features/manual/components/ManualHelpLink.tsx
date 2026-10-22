import Link from "next/link";
import { CircleHelp } from "lucide-react";

export function ManualHelpLink({ section }: { section: "extraccion" | "transformacion" | "carga" }) {
  return <Link href={`/manual#${section}`} className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-action underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"><CircleHelp aria-hidden className="h-4 w-4" />Ayuda de esta sección</Link>;
}
