"use client";
import Link from "next/link";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { CredentialRecoveryDialog } from "@/components/etl/CredentialRecoveryDialog";
import { pipelineStages, sourceCount, sourceLabel } from "@/components/layout/pipelinePresentation";

export function SessionBanner() {
  const { state, credentials, canTransform, isReadyForLoad } = usePipelineSession();
  const stages = pipelineStages(state, credentials);
  const next = !state.source ? stages[0] : isReadyForLoad ? stages[2] : stages[1];
  return <section aria-labelledby="session-heading" className="space-y-3 rounded-xl border border-line bg-surface p-5">
    <h2 id="session-heading" className="text-lg font-bold">Sesión activa</h2>
    <p className="break-words font-semibold">{sourceLabel(state.source)}</p>
    <p className="text-sm text-content-muted">{sourceCount(state.source)} · {state.recipe.length} pasos en la receta</p>
    <p className="text-sm">{next.detail}</p>
    {next.available && <Link href={next.href} className="inline-block font-semibold text-action underline">{!state.source ? "Iniciar extracción" : isReadyForLoad ? state.execution?.status === "error" || state.execution?.status === "unknown" ? "Revisar carga" : "Ir a Carga" : "Continuar en Transformación"}</Link>}
    {state.source && !canTransform && <CredentialRecoveryDialog />}
  </section>;
}
