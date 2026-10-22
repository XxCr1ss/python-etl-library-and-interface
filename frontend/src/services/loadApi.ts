import { request } from "./apiClient";
import { load, message } from "./responseValidators";
import type { LoadConfigDto, SourceDto, StepDto, TargetConnectionDto } from "@/types/etl";
export const testTargetConnection = (connection: TargetConnectionDto, signal?: AbortSignal) => request("load/test-connection", message, connection, signal);
export const executeLoad = (body: { source: SourceDto; target_connection: TargetConnectionDto; load_config: LoadConfigDto; recipe: StepDto[]; request_id?: string }) => request("load/execute", load, body);
