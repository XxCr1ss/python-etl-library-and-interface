"use client";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { requiredConnections, stepDto } from "@/services/etlSerializers";
import { CredentialStore } from "@/state/credentialStore";
import type { StepType } from "@/types/etl";
import type { TransformStep } from "@/types/etl";
import { StepEditorDialog } from "./step-editor/StepEditorDialog";

interface AddStepModalProps {
  isOpen: boolean; onClose: () => void; availableColumns: string[];
  onAddStep: (step: { type: string; params: Record<string, unknown> }) => void;
  initialStep?: TransformStep; initialType?: StepType;
  onEditStep?: (step: TransformStep, credentials?: CredentialStore) => void;
  dtypes?: Record<string, string>; contextStatus?: "loading" | "success" | "error";
  contextError?: string | null; onRetryContext?: () => void; disabled?: boolean;
}
/** Compatible façade. Each open mounts a fresh editor, with no legacy fallback. */
export default function AddStepModal(props: AddStepModalProps) {
  const session = usePipelineSession();
  if (!props.isOpen) return null;
  return <StepEditorDialog initialStep={props.initialStep} initialType={props.initialType} onClose={props.onClose}
    context={{ columns: props.availableColumns, dtypes: props.dtypes }} status={props.contextStatus} error={props.contextError} onRetry={props.onRetryContext} disabled={props.disabled}
    onConfirm={(step, temporary) => {
      const merged = new CredentialStore();
      try {
        for (const { credentialRef } of requiredConnections(null, [step])) {
          const store = temporary.has(credentialRef) ? temporary : session.credentials;
          merged.set(credentialRef, store.get(credentialRef));
        }
        if (props.initialStep) {
          if (!props.onEditStep) throw new Error("La edición no está disponible.");
          props.onEditStep(step, merged);
        } else {
          const dto = stepDto(step, merged);
          // Preserve the original file display metadata at the public callback boundary.
          for (const key of ["right_source", "secondary_source"] as const) {
            const source = key === "right_source" && "right_source" in step.params ? step.params.right_source
              : key === "secondary_source" && "secondary_source" in step.params ? step.params.secondary_source : undefined;
            if (source?.type === "file" && typeof dto.params[key] === "object" && dto.params[key] !== null) dto.params[key] = { ...dto.params[key], ...(source.filename ? { filename: source.filename } : {}), ...(source.unique_filename ? { unique_filename: source.unique_filename } : {}) };
          }
          props.onAddStep(dto);
        }
      } finally { merged.clear(); }
      props.onClose();
    }} />;
}
