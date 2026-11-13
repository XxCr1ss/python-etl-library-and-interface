import Link from "next/link";
import { Workflow } from "lucide-react";

export function PublicBrand() {
  return (
    <Link href="/" aria-label="ETL Flow, inicio" className="inline-flex w-fit items-center gap-2 rounded-lg text-lg font-bold tracking-tight text-content">
      <span className="grid size-[34px] place-items-center rounded-[10px] bg-action text-on-action">
        <Workflow size={19} aria-hidden="true" />
      </span>
      ETL Flow
    </Link>
  );
}
