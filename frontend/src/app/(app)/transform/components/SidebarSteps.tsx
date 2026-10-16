"use client";
import { Button } from "@/components/ui";
import type { SourceDescriptor, TransformStep } from "@/types/etl";
import { getDefinition } from "./step-editor/StepRegistry";

interface SidebarStepsProps {
  steps: TransformStep[]; onRemoveStep: (id: string) => void; onAddStepClick: () => void;
  onEditStep?: (id: string) => void; onMoveStep?: (id: string, to: number) => void;
  sourceType: SourceDescriptor["type"]; sourceName: string; disabled?: boolean;
}
export default function SidebarSteps({ steps, onRemoveStep, onAddStepClick, onEditStep, onMoveStep, sourceName, disabled }: SidebarStepsProps) {
  return <section aria-label="Receta de transformación" className="min-w-0 space-y-4 rounded-xl border border-line bg-surface p-4">
    <h2 className="text-lg font-bold">Receta · {steps.length} pasos</h2><p className="break-words text-sm text-content-muted">Origen: {sourceName}</p>
    {!steps.length && <p className="text-sm text-content-muted">Aún no hay transformaciones. La receta vacía permite cargar los datos originales después de validar su preview.</p>}
    <ol className="space-y-3">{steps.map((step, index) => {
      const definition = getDefinition(step.type); const summary = definition.summary(step.params);
      return <li key={step.id} className="min-w-0 rounded-lg border border-line p-3">
        <p className="font-semibold">{index + 1}. {definition.name}</p>
        <p className="mt-1 max-h-24 overflow-auto break-words text-sm text-content-muted" title={summary}>{summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={disabled || !onEditStep} aria-label={`Editar paso ${index + 1}: ${definition.name}`} onClick={() => onEditStep?.(step.id)}>Editar</Button>
          <Button size="sm" variant="ghost" disabled={disabled || index === 0 || !onMoveStep} aria-label={`Subir paso ${index + 1}: ${definition.name}`} onClick={() => onMoveStep?.(step.id, index - 1)}>↑</Button>
          <Button size="sm" variant="ghost" disabled={disabled || index === steps.length - 1 || !onMoveStep} aria-label={`Bajar paso ${index + 1}: ${definition.name}`} onClick={() => onMoveStep?.(step.id, index + 1)}>↓</Button>
          <Button size="sm" variant="destructive" disabled={disabled} aria-label="Eliminar este paso" onClick={() => onRemoveStep(step.id)}>Eliminar</Button>
        </div>
      </li>;
    })}</ol>
    <Button className="w-full" disabled={disabled} onClick={onAddStepClick}>Agregar Transformación</Button>
  </section>;
}
