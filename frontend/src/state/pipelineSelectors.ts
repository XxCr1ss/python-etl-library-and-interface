import { requiredConnections } from "@/services/etlSerializers";
import type { CredentialStore } from "./credentialStore";
import type { PipelineState } from "./pipelineReducer";
export const canVisitLoad = (s: PipelineState) => s.hydrationStatus !== "hydrating" && !s.recoveryRequired && !!s.source;
export const canTransform = (s: PipelineState, c: CredentialStore) => canVisitLoad(s) && requiredConnections(s.source, s.recipe).every(x => c.has(x.credentialRef));
export const isReadyForLoad = (s: PipelineState, c: CredentialStore) => canTransform(s, c) && s.preview.status === "success" && s.preview.revision === s.revision;
export const canExecuteLoad = (s: PipelineState, c: CredentialStore) => isReadyForLoad(s, c) && !!s.target && c.has(s.target.credentialRef) &&
  [s.target.host, s.target.database, s.target.user].every(x => !!x.trim()) &&
  s.targetCheckedVersion === s.targetVersion && !!s.loadConfig.table_name.trim() && s.execution?.status !== "running" &&
  Object.entries(s.loadConfig.foreign_keys || {}).every(([col, pair]) => s.preview.data?.columns.includes(col) && pair.length === 2 && pair.every(x => !!x.trim()));
