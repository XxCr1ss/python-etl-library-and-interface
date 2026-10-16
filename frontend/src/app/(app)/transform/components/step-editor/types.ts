import type { ComponentType } from "react";
import type { SourceDescriptor, StepParamsByType, StepType, TransformStep } from "@/types/etl";
import type { CredentialStore } from "@/state/credentialStore";

export interface StepContext { columns: string[]; dtypes?: Record<string, string>; secondaryColumns?: string[] }
export type FieldErrors = Partial<Record<string, string>>;
export type FieldKind = "text" | "number" | "boolean" | "column" | "columns" | "map" | "value" | "json" | "source";
export interface StepField<P> {
  key: string; label: string; kind: FieldKind; hint?: string;
  format: (params: P) => string;
  apply: (params: P, raw: string) => P;
  validate?: (params: P, context: StepContext) => string | undefined;
}
export interface StepDraft<P> { base: P; changes: Record<string, string> }
export interface StepFormProps<P> {
  value: StepDraft<P>; onChange: (value: StepDraft<P>) => void; errors: FieldErrors;
  context: StepContext; disabled: boolean; fields: StepField<P>[];
  credentials: CredentialStore;
  secondary?: SourceDescriptor; onSecondaryChange?: (source: SourceDescriptor | undefined, columns?: string[]) => void;
}
export interface StepDefinition<K extends StepType> {
  type: K; name: string; description: string; category: string; icon: ComponentType<{ className?: string }>;
  Form: ComponentType<StepFormProps<StepParamsByType[K]>>;
  fields: StepField<StepParamsByType[K]>[];
  requires: { columns: boolean; secondary: boolean };
  createDraft: () => StepDraft<StepParamsByType[K]>;
  fromParams: (params: StepParamsByType[K]) => StepDraft<StepParamsByType[K]>;
  validate: (draft: StepDraft<StepParamsByType[K]>, context: StepContext) => FieldErrors;
  toParams: (draft: StepDraft<StepParamsByType[K]>, context: StepContext) => StepParamsByType[K];
  toStep: (draft: StepDraft<StepParamsByType[K]>, context: StepContext, id: string) => TransformStep;
  summary: (params: StepParamsByType[K]) => string;
}
export type StepRegistry = { [K in StepType]: StepDefinition<K> };
