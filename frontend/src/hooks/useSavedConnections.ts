"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { listConnections, type SavedConnection } from "@/services/connectionsApi";
import { ApiError } from "@/services/apiClient";
export function useSavedConnections(type?: "source" | "target") {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedConnection[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [offset, setOffset] = useState(0), [more, setMore] = useState(false);
  const refresh = useCallback(() => { setOffset(0); setRevision(n => n+1); }, []);
  useEffect(() => { setItems([]); setOffset(0); }, [user?.id, type]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController(); setLoading(true); setError("");
    listConnections(type, controller.signal, offset).then(rows => {
      if (!controller.signal.aborted) { setItems(previous => offset ? [...previous, ...rows] : rows); setMore(rows.length === 50); }
    }).catch(err => { if (!controller.signal.aborted && !(err instanceof ApiError && err.kind === "aborted")) setError(err instanceof Error ? err.message : "No se pudieron consultar las conexiones."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, type, revision, offset]);
  return { items: user ? items : [], loading, error, refresh, more, loadMore: () => setOffset(n => n+50) };
}
