import { useId, useState } from "react";
import { Alert, Button, Modal } from "@/components/ui";
import { newId, type CredentialStore } from "@/state/credentialStore";
import type { StepType, TransformStep } from "@/types/etl";
import { getDefinition } from "./StepRegistry";
import { StepPicker } from "./StepPicker";
import { StepFormHost } from "./StepFormHost";
import type { StepContext } from "./types";

export function StepEditorDialog({ onClose, onConfirm, initialStep, initialType = "rename_columns", context, status = "success", error, onRetry, disabled = false }: {
  onClose: () => void; onConfirm: (step: TransformStep, credentials: CredentialStore) => void; initialStep?: TransformStep; initialType?: StepType;
  context: StepContext; status?: "loading" | "success" | "error"; error?: string | null; onRetry?: () => void; disabled?: boolean;
}) {
  const [selectedType, setSelectedType] = useState<StepType>(initialStep?.type ?? initialType);
  const [dirty, setDirty] = useState(false); const [id] = useState(() => initialStep?.id ?? newId());
  const definition = getDefinition(selectedType);
  const formId = useId();
  return <Modal open onClose={onClose} title={initialStep ? "Editar transformación" : "Agregar transformación"} className="max-w-5xl"
    description="Configura un borrador. La receta cambia únicamente al guardar. La preview recalcula el dataset completo."
    footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} disabled={disabled || status !== "success"}>{initialStep ? "Guardar cambios" : "Aplicar Operación"}</Button></>}>
    <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <StepPicker selectedType={selectedType} disabled={!!initialStep || disabled} onSelect={type => {
        if (type === selectedType || ((dirty || definition.requires.secondary) && !window.confirm("Cambiar de operación descartará el borrador y las credenciales secundarias temporales. ¿Continuar?"))) return;
        setSelectedType(type); setDirty(false);
      }} />
      <div className="min-w-0">{status === "loading" ? <p role="status">Consultando columnas anteriores al paso…</p>
        : status === "error" ? <Alert title="No se pudo obtener el esquema anterior" tone="error" action={<Button onClick={onRetry}>Reintentar esquema</Button>}>{error}</Alert>
        : <StepFormHost key={selectedType} definition={definition} initialParams={initialStep?.type === selectedType ? initialStep.params : undefined}
          id={id} formId={formId} hideActions context={context} disabled={disabled} onDirtyChange={() => setDirty(true)} onCancel={onClose} onConfirm={onConfirm} />}</div>
    </div>
  </Modal>;
}
