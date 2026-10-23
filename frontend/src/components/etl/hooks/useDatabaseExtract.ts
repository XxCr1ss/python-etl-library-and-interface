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
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const epoch = useRef(0);
  const pauseConnection = connection.pause, pausePreview = preview.pause;
  const suspend = diagram?.suspend;
  useEffect(() => {
    if (draft.use_agent && ["disconnected", "error"].includes(agent.status)) {
      epoch.current++; setNeedsRevalidation(true);
      pauseConnection("El agente dejó de estar disponible. Comprueba su estado y vuelve a conectar."); pausePreview();
      suspend?.(databaseConnection(draft, agentId), "El agente no está disponible. Comprueba su conexión; el diagrama se recuperará al volver.");
    }
  }, [draft, agentId, agent.status, pauseConnection, pausePreview, suspend]);
  function edit(patch: Partial<DatabaseDraft>) {
    epoch.current++;
    diagram?.invalidate(databaseConnection(draft, agentId));
    connection.invalidate(); preview.invalidate(); setTable(""); setErrors({});
    setNeedsRevalidation(false);
    setDraft(current => updateDatabaseDraft(current, patch));
  }
  async function connect() {
    if (!agentReady || connection.status === "pending") return;
    const invalid = validateDatabaseDraft(draft); setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const sourceConnection = databaseConnection(draft, agentId);
    const requestEpoch = epoch.current;
    diagram?.suspend(sourceConnection, "Verificando la conexión y actualizando las tablas…");
    const metadata = await connection.run(signal => getDatabaseMetadata(sourceConnection, signal), true);
    if (epoch.current !== requestEpoch) return;
    if (!metadata) { diagram?.suspend(sourceConnection, "No se pudo comprobar la conexión. Vuelve a conectar desde Extracción."); return; }
    setNeedsRevalidation(false); diagram?.refresh(sourceConnection);
    preview.invalidate();
    if (table && metadata.tables.includes(table)) loadTable(table, metadata);
    else setTable("");
  }
  function selectSaved(row: SavedConnection | null) {
    epoch.current++;
    diagram?.invalidate(databaseConnection(draft, agentId)); connection.invalidate(); preview.invalidate(); setTable(""); setErrors({}); setNeedsRevalidation(false);
    setDraft(row ? { db_type: row.db_type, host: row.host, port: row.port == null ? "" : String(row.port),
      database: row.database, user: row.user, password: undefined, service_name: row.service_name || "", use_agent: row.transport === "agent",
      savedConnection: { ...referenceOf(row), ...(row.transport === "agent" ? { runtime_agent_id: agentId } : {}) } } : { ...initialDatabaseDraft, password: undefined });
  }
  function selectTable(name: string) {
    preview.invalidate(); setTable(name);
    if (!name || !agentReady || needsRevalidation || connection.status !== "success" || !connection.result?.tables.includes(name)) return;
    loadTable(name, connection.result);
  }
  function loadTable(name: string, metadata: DatabaseMetadata) {
    const sourceConnection = databaseConnection(draft, agentId);
    const schema = metadata.schema_preview[name];
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
  return { ...preview, draft, errors, edit, table, selectTable, selectSaved, connect, connection, agent, agentReady, needsRevalidation,
    canConfirm: agentReady && !needsRevalidation && connection.status === "success",
    invalidate: () => { diagram?.invalidate(databaseConnection(draft, agentId)); connection.invalidate(); preview.invalidate(); setTable(""); } };
}
