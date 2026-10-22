import type { SourceConnectionDto } from "@/types/etl";
// UI/diagram display metadata is never mixed with a reference on the HTTP wire.
export function connectionWire(connection: SourceConnectionDto): SourceConnectionDto {
  if (connection.connection_id) return { connection_id: connection.connection_id, connection_version: connection.connection_version,
    ...(connection.runtime_agent_id ? { runtime_agent_id: connection.runtime_agent_id } : {}) };
  return connection;
}
