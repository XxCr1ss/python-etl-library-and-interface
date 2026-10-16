import type { SourceDescriptor } from "@/types/etl";
import type { PipelineState } from "@/state/pipelineReducer";
import type { CredentialStore } from "@/state/credentialStore";
import { canTransform, isReadyForLoad } from "@/state/pipelineSelectors";

export { sourceLabel } from "@/state/pipelineLabels";
export function sourceCount(source: SourceDescriptor | null): string {
  if (!source?.count) return "Conteo no disponible";
  const { kind, value } = source.count;
  const label = kind === "sample" ? "filas de muestra" : kind === "dataset" ? "filas del dataset" : "filas totales en destino";
  return `${new Intl.NumberFormat("es-CO").format(value)} ${label}`;
}
export interface PipelineStage {
  name: string; href: string; available: boolean; complete: boolean; detail: string;
}
export function pipelineStages(state: PipelineState, credentials: CredentialStore): PipelineStage[] {
  const hydrating = state.hydrationStatus === "hydrating";
  const running = state.execution?.status === "running";
  const editable = !hydrating && !state.recoveryRequired && !running;
  const transform = canTransform(state, credentials);
  const ready = isReadyForLoad(state, credentials);
  const common = hydrating ? "Restaurando sesión…" : state.recoveryRequired ? "Restablece la sesión guardada para continuar." : running ? "Carga en curso. Espera su resultado." : null;
  return [
    { name: "Extracción", href: "/extract", available: editable, complete: !!state.source,
      detail: common || (!state.source ? "Configura y confirma un origen." : !transform ? "Origen confirmado; faltan credenciales." : "Origen confirmado.") },
    { name: "Transformación", href: "/transform", available: editable && transform, complete: ready,
      detail: common || (!state.source ? "Primero confirma un origen en Extracción." : !transform ? "Faltan credenciales. Recupéralas desde Dashboard para continuar." : ready ? "Preview vigente; receta vacía también válida." : state.preview.status === "error" ? "Preview fallida. Revisa la receta y vuelve a validarla." : "Valida la preview de la revisión actual.") },
    { name: "Carga", href: "/load", available: !hydrating && !state.recoveryRequired && (running || ready),
      complete: ready && state.execution?.status === "success" && state.execution.revision === state.revision && !!state.report,
      detail: hydrating || state.recoveryRequired ? common! : running ? "Carga en curso." : !ready ? "Necesitas credenciales y una preview vigente en Transformación." : state.execution?.status === "error" ? "Carga fallida. Revisa el intento en Carga." : state.execution?.status === "unknown" ? "Resultado desconocido. Revisa el destino antes de otro intento." : state.execution?.status === "success" && state.report ? "Carga completada para esta configuración." : "Configura el destino y comprueba su conexión." },
  ];
}
