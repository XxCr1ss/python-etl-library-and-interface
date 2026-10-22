"use client";
import { useEffect, useRef, useState } from "react";
import { getDatabaseMetadata, previewDatabaseTable } from "@/services/extractApi";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { databaseConnection, initialDatabaseDraft, updateDatabaseDraft, validateDatabaseDraft, type DatabaseDraft, type DatabaseErrors } from "@/components/etl/DatabaseConnectionFields";
import type { DatabaseMetadata } from "@/types/etl";
import { useExtractRequest } from "./useExtractRequest";
import type { ExtractResult } from "./types";
import { useDiagramCoordinator } from "@/features/diagram/DiagramCoordinator";
import { referenceOf, type SavedConnection } from "@/services/connectionsApi";

export function useDatabaseExtract(active: boolean, agentId: string) {
  const diagram = useDiagramCoordinator();
  const [draft, setDraft] = useState<DatabaseDraft>(initialDatabaseDraft);
  const [errors, setErrors] = useState<DatabaseErrors>({});
  const [table, setTable] = useState("");
  const connection = useExtractRequest<DatabaseMetadata>(active);
  const preview = useExtractRequest<ExtractResult>(active);
  const agent = useAgentStatus(active && draft.use_agent, agentId);
  const agentReady = !draft.use_agent || agent.status === "connected";
  const previousAgentReady = useRef(false);
  const invalidateConnection = connection.invalidate;
  const invalidatePreview = preview.invalidate;
  useEffect(() => {
    if (draft.use_agent && !agentReady) {
      invalidateConnection(previousAgentReady.current ? "El agente dejó de estar disponible. Comprueba su estado y vuelve a conectar." : null);
      invalidatePreview(); setTable("");
    }
    previousAgentReady.current = agentReady;
  }, [draft.use_agent, agentReady, invalidateConnection, invalidatePreview]);
  function edit(patch: Partial<DatabaseDraft>) {
    diagram?.invalidate();
    connection.invalidate(); preview.invalidate(); setTable(""); setErrors({});
    setDraft(current => updateDatabaseDraft(current, patch));
  }
  function connect() {
    if (!agentReady || connection.status === "pending") return;
    const invalid = validateDatabaseDraft(draft); setErrors(invalid);
    if (Object.keys(invalid).length) return;
    diagram?.invalidate();
    preview.invalidate(); setTable("");
    void connection.run(signal => getDatabaseMetadata(databaseConnection(draft, agentId), signal));
  }
  function selectSaved(row: SavedConnection | null) {
    diagram?.invalidate(); connection.invalidate(); preview.invalidate(); setTable(""); setErrors({});
    setDraft(row ? { db_type: row.db_type, host: row.host, port: row.port == null ? "" : String(row.port),
      database: row.database, user: row.user, password: undefined, service_name: row.service_name || "", use_agent: row.transport === "agent",
      savedConnection: { ...referenceOf(row), ...(row.transport === "agent" ? { runtime_agent_id: agentId } : {}) } } : { ...initialDatabaseDraft, password: undefined });
  }
  function selectTable(name: string) {
    preview.invalidate(); setTable(name);
    if (!name || !agentReady || connection.status !== "success" || !connection.result?.tables.includes(name)) return;
    const sourceConnection = databaseConnection(draft, agentId);
    const schema = connection.result?.schema_preview[name];
    const columns = schema?.every((column): column is string => typeof column === "string") ? schema : undefined;
    void preview.run(async signal => {
      const data = await previewDatabaseTable({ ...sourceConnection, table_name: name }, signal);
      return { data, columns, label: name, count: { kind: "sample", value: data.total_rows },
        source: { type: "database", ...(draft.savedConnection ? { db_type: draft.db_type, host: draft.host,
          port: draft.port ? Number(draft.port) : null, database: draft.database, user: draft.user, service_name: draft.service_name,
          use_agent: draft.use_agent, ...(draft.use_agent ? { agent_id: agentId } : {}),
          savedConnection: draft.savedConnection } : sourceConnection), table_name: name, total_rows: data.total_rows } };
    });
  }
  return { ...preview, draft, errors, edit, table, selectTable, selectSaved, connect, connection, agent, agentReady,
    invalidate: () => { diagram?.invalidate(); connection.invalidate(); preview.invalidate(); setTable(""); } };
}
