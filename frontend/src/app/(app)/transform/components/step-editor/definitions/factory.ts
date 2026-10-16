import { SlidersHorizontal } from "lucide-react";
import { parseStep } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
import type { StepParamsByType, StepType } from "@/types/etl";
import type { FieldErrors, FieldKind, StepContext, StepDefinition, StepDraft, StepField } from "../types";
import { ParameterForm } from "../forms/ParameterForm";
import type { Codec } from "./codecs";

export function fieldsFor<P>() {
  return <K extends keyof P & string>(key: K, label: string, kind: FieldKind, codec: Codec<P[K]>, hint?: string): StepField<P> => ({
    key, label, kind, hint, format: params => codec.format(params[key]),
    apply: (params, raw) => ({ ...params, [key]: codec.parse(raw) }),
  });
}
export function defineStep<K extends StepType>(type: K, name: string, category: string, description: string,
  defaults: StepParamsByType[K], fields: StepField<StepParamsByType[K]>[],
  validateParams: (params: StepParamsByType[K], context: StepContext) => FieldErrors = () => ({}),
): StepDefinition<K> {
  type P = StepParamsByType[K];
  const parse = (draft: StepDraft<P>) => {
    let params = draft.base; const errors: FieldErrors = {};
    for (const field of fields) if (Object.hasOwn(draft.changes, field.key)) {
      try { params = field.apply(params, draft.changes[field.key]); }
      catch (error) { errors[field.key] = error instanceof Error ? error.message : "Revisa el campo."; }
    }
    return { params, errors };
  };
  const validate = (draft: StepDraft<P>, context: StepContext) => {
    const { params, errors } = parse(draft);
    for (const field of fields) {
      if (errors[field.key]) continue;
      try { field.apply(params, field.format(params)); } catch (error) { errors[field.key] = field.kind === "source" ? "Confirma una fuente secundaria válida." : error instanceof Error ? error.message : "Revisa el campo."; }
      const dependency = field.validate?.(params, context); if (dependency) errors[field.key] = dependency;
    }
    return { ...validateParams(params, context), ...errors };
  };
  const toParams = (draft: StepDraft<P>, context: StepContext) => {
    const errors = validate(draft, context); if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    return parse(draft).params;
  };
  return { type, name, category, description, icon: SlidersHorizontal, Form: ParameterForm, fields,
    requires: { columns: fields.some(f => ["column", "columns", "map"].includes(f.kind)), secondary: fields.some(f => f.kind === "source") },
    createDraft: () => ({ base: structuredClone(defaults), changes: {} }),
    fromParams: params => ({ base: structuredClone(params), changes: {} }), validate, toParams,
    toStep: (draft, context, id) => parseStep({ id, type, params: toParams(draft, context) }, new CredentialStore()),
    summary: params => fields.filter(f => f.kind !== "source").map(f => `${f.label}: ${f.format(params)}`).join(" · "),
  };
}
export function columnDependency<P>(field: StepField<P>, get: (params: P) => string | string[] | null | undefined, optional = false): StepField<P> {
  return { ...field, validate: (params, context) => {
    const value = get(params); const items = typeof value === "string" ? [value] : value ?? [];
    if (!items.length && (!optional || value !== null && value !== undefined)) return "Selecciona al menos una columna, o usa todas si está permitido.";
    if (items.some(name => !context.columns.includes(name))) return "La columna no existe antes de este paso.";
  } };
}
export function newName(name: string | null | undefined, context: StepContext): string | undefined {
  if (name !== undefined && name !== null && (!name.trim() || context.columns.includes(name))) return "Usa un nombre nuevo, no vacío y sin colisiones.";
}
