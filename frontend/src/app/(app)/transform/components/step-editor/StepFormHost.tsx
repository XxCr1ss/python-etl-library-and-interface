import { useEffect, useState } from "react";
import { CredentialStore } from "@/state/credentialStore";
import { Alert, Button } from "@/components/ui";
import type { StepParamsByType, StepType, TransformStep } from "@/types/etl";
import type { FieldErrors, StepContext, StepDefinition } from "./types";

export function StepFormHost<K extends StepType>({ definition, initialParams, id, context, disabled = false, onConfirm, onCancel, onDirtyChange, formId, hideActions = false }: {
  definition: StepDefinition<K>; initialParams?: StepParamsByType[K]; id: string; context: StepContext; disabled?: boolean;
  onConfirm: (step: TransformStep, credentials: CredentialStore) => void; onCancel: () => void;
  onDirtyChange?: () => void;
  formId?: string; hideActions?: boolean;
}) {
  const [draft, setDraft] = useState(() => initialParams ? definition.fromParams(initialParams) : definition.createDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [credentials] = useState(() => new CredentialStore());
  const [secondaryColumns, setSecondaryColumns] = useState<string[] | undefined>();
  const fullContext = { ...context, secondaryColumns };
  useEffect(() => () => credentials.clear(), [credentials]);
  const Form = definition.Form;
  return <form id={formId} noValidate className="space-y-4" onSubmit={event => {
    event.preventDefault(); if (disabled) return;
    const invalid = definition.validate(draft, fullContext); setErrors(invalid); if (Object.keys(invalid).length) return;
    try { onConfirm(definition.toStep(draft, fullContext, id), credentials); } catch (error) { setFailure(error instanceof Error ? error.message : "No se pudo guardar el paso."); }
  }}>
    <h3 className="text-lg font-semibold">{definition.name}</h3><p className="text-sm text-content-muted">{definition.description}</p>
    <Form credentials={credentials} fields={definition.fields} value={draft} onChange={next => { setDraft(next); setErrors({}); setFailure(null); onDirtyChange?.(); }} errors={errors} context={fullContext} disabled={disabled}
      onSecondaryChange={(_, columns) => setSecondaryColumns(columns)} />
    {failure && <Alert tone="error" title="No se pudo guardar">{failure}</Alert>}
    {!hideActions && <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-line bg-surface py-3">
      <Button variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={disabled}>{initialParams ? "Guardar cambios" : "Aplicar Operación"}</Button>
    </div>}
  </form>;
}
