import type { JsonValue, SourceDescriptor, SourceDto, StepDto, TargetConnectionDto, TargetDescriptor, TransformStep } from "@/types/etl";
import { parseSource, parseStep, parseTarget } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
export function sourceDto(source: SourceDescriptor, store: CredentialStore): SourceDto {
  const clean = parseSource(source, store);
  if (clean.type === "file") return { type: "file", filepath: clean.filepath, ...(clean.sheet_name !== undefined ? { sheet_name: clean.sheet_name } : {}) };
  if (clean.type === "date_dimension") return { type: "date_dimension", start_year: clean.start_year, end_year: clean.end_year };
  return { type: "database", db_type: clean.db_type, host: clean.host, database: clean.database, user: clean.user,
    table_name: clean.table_name, password: store.get(clean.credentialRef),
    ...(clean.port !== undefined ? { port: clean.port } : {}), ...(clean.service_name !== undefined ? { service_name: clean.service_name } : {}),
    ...(clean.use_agent !== undefined ? { use_agent: clean.use_agent } : {}), ...(clean.agent_id !== undefined ? { agent_id: clean.agent_id } : {}) };
}
export function targetDto(target: TargetDescriptor, store: CredentialStore): TargetConnectionDto {
  const { credentialRef, ...fields } = parseTarget(target, store);
  return { ...fields, password: store.get(credentialRef) };
}
export function stepDto(step: TransformStep, store: CredentialStore): StepDto {
  const clean = parseStep(step, store);
  const params = Object.fromEntries(Object.entries(clean.params).map(([k, v]) =>
    [k, k === "secondary_source" || k === "right_source" ? sourceDto(v as SourceDescriptor, store) : v]));
  return { type: clean.type, params: params as Record<string, JsonValue> };
}
export function requiredConnections(source: SourceDescriptor | null, recipe: TransformStep[], target?: TargetDescriptor | null) {
  const sources: { credentialRef: string; alias: string }[] = [];
  const add = (s: SourceDescriptor, alias: string) => { if (s.type === "database") sources.push({ credentialRef: s.credentialRef, alias }); };
  if (source) add(source, "Origen principal");
  recipe.forEach((step, i) => { if ("right_source" in step.params) add(step.params.right_source, `Cruce ${i + 1}`); if ("secondary_source" in step.params) add(step.params.secondary_source, `Unión ${i + 1}`); });
  if (target) sources.push({ credentialRef: target.credentialRef, alias: "Destino" });
  return sources;
}
