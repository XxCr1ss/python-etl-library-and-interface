"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { pipelineStages } from "./pipelinePresentation";

export function PipelineStepper() {
  const { state, credentials } = usePipelineSession();
  const pathname = usePathname();
  return <nav aria-label="Etapas del pipeline"><ol className="grid gap-3 lg:grid-cols-3">
    {pipelineStages(state, credentials).map((stage, index) => <li key={stage.href} className={`rounded-xl border bg-surface p-3 text-sm text-content ${pathname === stage.href ? "border-action ring-1 ring-action" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        <span aria-hidden="true" className={stage.complete ? "text-pipeline-complete" : "text-content-muted"}>{stage.complete ? "✓" : index + 1}</span>
        {stage.available ? <Link href={stage.href} aria-current={pathname === stage.href ? "step" : undefined} className="text-action underline underline-offset-4">{stage.name}</Link>
          : <span role="link" aria-disabled="true" aria-current={pathname === stage.href ? "step" : undefined} aria-describedby={`stage-${index}`}>{stage.name}</span>}
        <span className="ml-auto text-xs text-content-muted">{stage.complete ? "Completada" : stage.available ? "Disponible" : "Bloqueada"}</span>
      </div>
      <p id={`stage-${index}`} className="mt-2 text-xs text-content-muted">{stage.detail}</p>
    </li>)}
  </ol></nav>;
}
