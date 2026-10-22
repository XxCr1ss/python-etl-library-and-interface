import type { ExecutionRecord, LoadConfigDto, LoadResponse, PreviewResponse, SourceDescriptor, TargetDescriptor, TransformStep } from "@/types/etl";
import { foreignKeyRows, type ForeignKeyRow } from "./loadValidation";
export interface PipelineState {
  hydrationStatus: "hydrating" | "ready" | "empty" | "recovered";
  recoveryRequired: boolean; warning: string | null;
  source: SourceDescriptor | null; recipe: TransformStep[]; revision: number;
  preview: { status: "pending" | "loading" | "success" | "error"; revision: number; requestId?: string; data?: PreviewResponse; error?: string };
  target: TargetDescriptor | null; targetVersion: number; targetCheckedVersion: number | null;
  loadConfig: LoadConfigDto; execution: ExecutionRecord | null; history: ExecutionRecord[]; report: LoadResponse | null;
  historyRecoveryRequired: boolean;
  credentialVersion: number;
  foreignKeys: ForeignKeyRow[];
  executionError: string | null;
  loadVersion: number;
}
export const emptyLoadConfig = (): LoadConfigDto => ({ table_name: "", table_type: "dimension", if_exists: "replace" });
export const initialState: PipelineState = {
  hydrationStatus: "hydrating", recoveryRequired: false, warning: null, source: null, recipe: [], revision: 0,
  preview: { status: "pending", revision: 0 }, target: null, targetVersion: 0, targetCheckedVersion: null,
  loadConfig: emptyLoadConfig(), execution: null, history: [], report: null, credentialVersion: 0,
  historyRecoveryRequired: false,
  foreignKeys: [], executionError: null, loadVersion: 0,
};
export type PipelineAction =
  | { type: "accountChanged" }
  | { type: "hydrate"; state: PipelineState }
  | { type: "warning"; message: string }
  | { type: "source"; source: SourceDescriptor }
  | { type: "addStep"; step: TransformStep }
  | { type: "editStep"; step: TransformStep }
  | { type: "removeStep"; id: string }
  | { type: "moveStep"; id: string; to: number }
  | { type: "replaceRecipe"; recipe: TransformStep[] }
  | { type: "credentials"; affectsSource: boolean }
  | { type: "previewStart"; revision: number; requestId: string }
  | { type: "previewSuccess"; revision: number; requestId: string; data: PreviewResponse }
  | { type: "previewError"; revision: number; requestId: string; error: string }
  | { type: "target"; target: TargetDescriptor }
  | { type: "targetInvalidated" }
  | { type: "targetChecked"; version: number; success: boolean }
  | { type: "targetTransportInvalidated" }
  | { type: "loadConfig"; config: LoadConfigDto }
  | { type: "foreignKeys"; rows: ForeignKeyRow[] }
  | { type: "executionStart"; record: ExecutionRecord }
  | { type: "executionFinish"; record: ExecutionRecord; report?: LoadResponse; error?: string }
  | { type: "clearReport" } | { type: "reset" } | { type: "clearHistory" };
function invalidate(state: PipelineState): PipelineState {
  const revision = state.revision + 1;
  return { ...state, revision, preview: { status: "pending", revision }, report: null, execution: null, executionError: null };
}
export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  if (action.type === "accountChanged") return { ...initialState, hydrationStatus: "empty", revision: state.revision + 1 };
  if (action.type === "hydrate") return state.hydrationStatus === "hydrating" ? action.state : state;
  if (action.type === "warning") return { ...state, warning: action.message };
  if ((state.hydrationStatus === "hydrating" || state.recoveryRequired) && action.type !== "reset") return state;
  // Execution owns its snapshot even if navigation unmounts the originating page.
  if (state.execution?.status === "running" && !["executionFinish", "warning", "previewSuccess", "previewError", "targetTransportInvalidated"].includes(action.type)) return state;
  switch (action.type) {
    case "source": return { ...invalidate(state), source: action.source, recipe: [], loadConfig: emptyLoadConfig(), foreignKeys: [], targetCheckedVersion: null, hydrationStatus: "ready" };
    case "addStep": return { ...invalidate(state), recipe: [...state.recipe, action.step] };
    case "editStep": return { ...invalidate(state), recipe: state.recipe.map(s => s.id === action.step.id ? action.step : s) };
    case "removeStep": return { ...invalidate(state), recipe: state.recipe.filter(s => s.id !== action.id) };
    case "replaceRecipe": return { ...invalidate(state), recipe: action.recipe };
    case "moveStep": {
      const recipe = [...state.recipe]; const index = recipe.findIndex(s => s.id === action.id);
      if (index < 0 || action.to < 0 || action.to >= recipe.length) return state;
      const [step] = recipe.splice(index, 1); recipe.splice(action.to, 0, step);
      return { ...invalidate(state), recipe };
    }
    case "credentials": return { ...(action.affectsSource ? invalidate(state) : state), credentialVersion: state.credentialVersion + 1, targetVersion: state.targetVersion + 1, targetCheckedVersion: null, report: null };
    case "previewStart": return action.revision === state.revision ? { ...state, preview: { status: "loading", revision: action.revision, requestId: action.requestId } } : state;
    case "previewSuccess": case "previewError":
      if (action.revision !== state.revision || action.requestId !== state.preview.requestId) return state;
      return { ...state, preview: { status: action.type === "previewSuccess" ? "success" : "error", revision: action.revision, requestId: action.requestId,
        ...(action.type === "previewSuccess" ? { data: action.data } : { error: action.error }) } };
    case "target": return { ...state, target: action.target, targetVersion: state.targetVersion + 1, targetCheckedVersion: null, report: null, execution: null };
    case "targetInvalidated": return { ...state, targetVersion: state.targetVersion + 1, targetCheckedVersion: null, report: null, execution: null };
    case "targetTransportInvalidated": return { ...state, targetVersion: state.targetVersion + 1, targetCheckedVersion: null };
    case "targetChecked": return action.version === state.targetVersion ? { ...state, targetCheckedVersion: action.success ? action.version : null } : state;
    case "loadConfig": return { ...state, loadVersion: state.loadVersion + 1, loadConfig: action.config, foreignKeys: action.config.table_type === "dimension" ? [] :
      (action.config.foreign_keys && action.config.foreign_keys !== state.loadConfig.foreign_keys ? foreignKeyRows(action.config) : state.foreignKeys), report: null };
    case "foreignKeys": return { ...state, loadVersion: state.loadVersion + 1, foreignKeys: action.rows, report: null };
    case "executionStart": return state.execution?.id === action.record.id || state.history.some(r => r.id === action.record.id) ? state : { ...state, execution: action.record, executionError: null, report: null, history: [...state.history, action.record].slice(-50) };
    case "executionFinish":
      if (state.execution?.id !== action.record.id || state.execution.status !== "running") return state;
      return { ...state, execution: action.record, executionError: action.error || null, report: action.report || null, history: state.history.map(r => r.id === action.record.id ? action.record : r) };
    case "clearReport": return { ...state, report: null, execution: null, executionError: null, targetVersion: state.targetVersion + 1, credentialVersion: state.credentialVersion + 1, targetCheckedVersion: null, loadConfig: emptyLoadConfig(), foreignKeys: [] };
    case "reset": return { ...initialState, hydrationStatus: "empty", history: state.history, historyRecoveryRequired: state.historyRecoveryRequired, revision: state.revision + 1 };
    case "clearHistory": return { ...state, history: [], historyRecoveryRequired: false };
  }
}
