"use client";
import { Button, Input, Select } from "@/components/ui";
import type { DatabaseType, SourceConnectionDto, SavedConnectionReference } from "@/types/etl";

export interface DatabaseDraft {
  db_type: DatabaseType; host: string; port: string; database: string; user: string;
  password: string | undefined; service_name: string; use_agent: boolean;
  savedConnection?: SavedConnectionReference;
}
export type DatabaseErrors = Partial<Record<keyof DatabaseDraft, string>>;
export const databasePorts: Record<DatabaseType, string> = { postgresql: "5432", mysql: "3306", oracle: "1521" };
export const initialDatabaseDraft: DatabaseDraft = { db_type: "postgresql", host: "localhost", port: "5432", database: "", user: "", password: undefined, service_name: "", use_agent: false };
export function updateDatabaseDraft(value: DatabaseDraft, patch: Partial<DatabaseDraft>): DatabaseDraft {
  const next = { ...value, ...patch, savedConnection: undefined };
  if (patch.db_type && (value.port === "" || value.port === databasePorts[value.db_type])) next.port = databasePorts[patch.db_type];
  return next;
}
export function validateDatabaseDraft(value: DatabaseDraft): DatabaseErrors {
  const errors: DatabaseErrors = {};
  for (const field of ["host", "database", "user"] as const) if (!value[field].trim()) errors[field] = "Este campo es obligatorio.";
  if (value.password === undefined && !value.savedConnection) errors.password = "Ingresa la contraseña o confirma que es vacía.";
  if (value.port !== "" && (!/^\d+$/.test(value.port) || Number(value.port) < 1 || Number(value.port) > 65535)) errors.port = "Usa un puerto entero entre 1 y 65535, o déjalo vacío.";
  return errors;
}
export function databaseConnection(value: DatabaseDraft, agentId: string): SourceConnectionDto {
  if (value.savedConnection) return { ...value.savedConnection, ...(value.use_agent ? { runtime_agent_id: agentId } : {}), display: { db_type: value.db_type, host: value.host,
    port: value.port ? Number(value.port) : null, database: value.database, user: value.user, service_name: value.service_name || null,
    use_agent: value.use_agent, ...(value.use_agent ? { agent_id: agentId } : {}) } };
  return { db_type: value.db_type, host: value.host, port: value.port === "" ? null : Number(value.port), database: value.database,
    user: value.user, password: value.password!, service_name: value.db_type === "oracle" ? value.service_name || null : null,
    use_agent: value.use_agent, agent_id: value.use_agent ? agentId : null };
}
export function DatabaseConnectionFields({ value, errors, onChange }: {
  value: DatabaseDraft; errors: DatabaseErrors; onChange: (patch: Partial<DatabaseDraft>) => void;
}) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Select label="Motor de base de datos" value={value.db_type} onChange={e => onChange({ db_type: e.target.value as DatabaseType })}>
      <option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option value="oracle">Oracle</option>
    </Select>
    <Input label="Host" value={value.host} error={errors.host} required onChange={e => onChange({ host: e.target.value })} />
    <Input label="Puerto" inputMode="numeric" value={value.port} error={errors.port} onChange={e => onChange({ port: e.target.value })} />
    <Input label="Base de datos" value={value.database} error={errors.database} required onChange={e => onChange({ database: e.target.value })} />
    <Input label="Usuario" value={value.user} error={errors.user} required autoComplete="username" onChange={e => onChange({ user: e.target.value })} />
    <div className="space-y-2">
      {value.savedConnection ? <p role="status" className="text-sm text-content-muted">Contraseña guardada · se utiliza exclusivamente en el servidor.</p> : <><Input label="Contraseña" type="password" autoComplete="off" value={value.password ?? ""} error={errors.password}
        hint="Solo en memoria. Se solicitará de nuevo tras recargar." onChange={e => onChange({ password: e.target.value })} />
      {value.password === undefined && <Button variant="outline" size="sm" onClick={() => onChange({ password: "" })}>Usar contraseña vacía explícitamente</Button>}</>}
    </div>
    {value.db_type === "oracle" && <Input label="Service name (Oracle)" value={value.service_name} onChange={e => onChange({ service_name: e.target.value })} />}
  </div>;
}
