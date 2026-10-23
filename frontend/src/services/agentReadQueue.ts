const tails = new Map<string, Promise<void>>();

export function sourceAgentIds(value: unknown): string[] {
  if (Array.isArray(value)) return Array.from(new Set(value.flatMap(sourceAgentIds)));
  if (!value || typeof value !== "object") return [];
  const fields = value as Record<string, unknown>;
  const id = fields.runtime_agent_id ?? (fields.use_agent ? fields.agent_id : undefined);
  return Array.from(new Set([...(typeof id === "string" && id ? [id] : []), ...Object.values(fields).flatMap(sourceAgentIds)]));
}

// The broker accepts one operation per agent. Reserve all source agents together
// so a transform with secondary sources cannot overlap diagram/extraction reads.
// This queue is local to the owning ETL tab and never schedules writes or retries.
export function queueAgentRead<T>(ids: string[], operation: () => Promise<T>): Promise<T> {
  const keys = Array.from(new Set(ids));
  const result = Promise.all(keys.map(id => tails.get(id))).then(operation);
  const tail = result.then(() => {}, () => {});
  for (const id of keys) tails.set(id, tail);
  void tail.then(() => { for (const id of keys) if (tails.get(id) === tail) tails.delete(id); });
  return result;
}
