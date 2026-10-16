"use client";
import { useEffect, useRef, useState } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { initialDatabaseDraft, updateDatabaseDraft, validateDatabaseDraft, type DatabaseDraft, type DatabaseErrors } from "@/components/etl/DatabaseConnectionFields";

const emptyTarget = (): DatabaseDraft => ({ ...initialDatabaseDraft, host: "", use_agent: false });
export function useTargetConnection() {
  const session = usePipelineSession();
  const { state: { target, targetVersion, targetCheckedVersion, hydrationStatus, credentialVersion }, credentials } = session;
  const [draft, setDraft] = useState(emptyTarget);
  const draftRef = useRef(draft);
  const [errors, setErrors] = useState<DatabaseErrors>({});
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const request = useRef(0);
  useEffect(() => {
    if (hydrationStatus === "hydrating") return;
    const value: DatabaseDraft = target ? { ...target, port: target.port == null ? "" : String(target.port),
      password: credentials.has(target.credentialRef) ? credentials.get(target.credentialRef) : undefined,
      service_name: target.service_name || "", use_agent: false } : emptyTarget();
    draftRef.current = value; setDraft(value);
  }, [target, hydrationStatus, credentialVersion, credentials]);
  useEffect(() => { request.current++; setMessage(null); setErrors({}); setTesting(false); }, [targetVersion]);
  useEffect(() => () => { request.current++; }, []);
  const change = (patch: Partial<DatabaseDraft>) => {
    if (session.state.execution?.status === "running") return;
    request.current++; setTesting(false); setMessage(null);
    const value = updateDatabaseDraft(draftRef.current, patch);
    draftRef.current = value; setDraft(value); setErrors({});
    if (Object.keys(validateDatabaseDraft(value)).length) session.dispatch({ type: "targetInvalidated" });
    else session.setTarget({ db_type: value.db_type, host: value.host, port: value.port === "" ? null : Number(value.port),
      database: value.database, user: value.user, password: value.password,
      ...(value.db_type === "oracle" ? { service_name: value.service_name || null } : {}) });
  };
  const test = async () => {
    if (testing || session.state.execution?.status === "running") return;
    const invalid = validateDatabaseDraft(draftRef.current); setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const id = ++request.current; setTesting(true); setMessage(null);
    try { await session.testTarget(); }
    catch (error) { if (id === request.current) setMessage(error instanceof Error ? error.message : "No se pudo probar la conexión."); }
    finally { if (id === request.current) setTesting(false); }
  };
  return { draft, change, test, errors, testing, message,
    connected: targetCheckedVersion !== null && targetCheckedVersion === targetVersion };
}
