"use client";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { ResetPipelineButton } from "@/components/layout/ResetPipelineButton";
import { SessionBanner } from "./SessionBanner";
import { HistorySummary } from "./HistorySummary";
import { ExecutionHistory } from "./ExecutionHistory";

export function SessionDashboard() {
  const { state, dispatch } = usePipelineSession();
  const blocked = state.hydrationStatus === "hydrating" || state.recoveryRequired || state.execution?.status === "running";
  return <div className="mx-auto max-w-6xl space-y-6 text-content">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Dashboard ETL</h1><p className="mt-2 text-sm text-content-muted">Tu pipeline y los intentos de carga de esta pestaña.</p></div>
      <ResetPipelineButton>Nuevo proceso</ResetPipelineButton>
    </div>
    {state.hydrationStatus === "hydrating" ? <p role="status">Restaurando sesión e historial…</p> : <>
      <SessionBanner /><HistorySummary history={state.history} />
      <ExecutionHistory history={state.history} disabled={blocked} recoveryRequired={state.historyRecoveryRequired} onClear={() => dispatch({ type: "clearHistory" })} />
    </>}
  </div>;
}
