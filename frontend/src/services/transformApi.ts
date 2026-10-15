import { object, request } from "./apiClient";
import { preview, requireContract } from "./responseValidators";
import { stepSchemas } from "@/types/etlValidation";
import type { SourceDto, StepDto, StepType } from "@/types/etl";
export const getOperations = (signal?: AbortSignal) => request("transform/operations", v => {
  requireContract(Array.isArray(v) && v.length === 42 && v.every(x => object(x) && typeof x.type === "string" && Object.hasOwn(stepSchemas, x.type) && typeof x.name === "string" && typeof x.description === "string" && object(x.params) && Object.values(x.params).every(p => object(p) && typeof p.type === "string" && typeof p.required === "boolean" && typeof p.description === "string")) && new Set(v.map(x => x.type)).size === 42);
  return v as { type: StepType; name: string; description: string; params: Record<string, { type: string; description: string; required: boolean }> }[];
}, undefined, signal);
export const previewTransform = (body: { source: SourceDto; steps: StepDto[]; limit: number }, signal?: AbortSignal) => request("transform/preview", preview, body, signal);
