import type { SourceConnectionDto, SourceDescriptor } from "@/types/etl";
import { sourceDto } from "@/services/etlSerializers";
import type { CredentialStore } from "@/state/credentialStore";

// Compare secrets only in memory. Never use this identity in storage or messages.
export function sameConnection(a: SourceConnectionDto, b: SourceConnectionDto) {
  if (a.connection_id || b.connection_id) return !!a.connection_id && !!b.connection_id && a.connection_id === b.connection_id &&
    a.connection_version === b.connection_version && a.runtime_agent_id === b.runtime_agent_id;
  return (["db_type", "host", "database", "user", "password"] as const).every(key => a[key] === b[key]) &&
    (a.port ?? null) === (b.port ?? null) && (a.service_name || null) === (b.service_name || null) &&
    !!a.use_agent === !!b.use_agent && (!a.use_agent || a.agent_id === b.agent_id);
}

export function connectionFromSource(source: SourceDescriptor, credentials: CredentialStore): SourceConnectionDto | null {
  if (source.type !== "database" || (!source.savedConnection && !credentials.has(source.credentialRef))) return null;
  const dto = sourceDto(source, credentials);
  if (dto.type !== "database") return null;
  if (dto.connection_id) return { connection_id: dto.connection_id, connection_version: dto.connection_version,
    ...(dto.runtime_agent_id ? { runtime_agent_id: dto.runtime_agent_id } : {}), display: { db_type: source.db_type, host: source.host,
    port: source.port, database: source.database, user: source.user, service_name: source.service_name,
    use_agent: source.use_agent, agent_id: source.agent_id } };
  if (!dto.db_type) return null;
  return { db_type: dto.db_type, host: dto.host, port: dto.port, database: dto.database, user: dto.user,
    password: dto.password, service_name: dto.service_name, use_agent: dto.use_agent, agent_id: dto.agent_id };
}
