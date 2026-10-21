"use client";
import { useEffect, useState } from "react";
import { DiagramClient, type ClientState } from "./client";
import { parseBinding } from "./protocol";
const KEY = "etl_diagram_binding_v1";
export function useDiagramSync() {
  const [client, setClient] = useState<DiagramClient | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [state, setState] = useState<ClientState>({ owner: null, connected: false, invalid: false, error: "Vinculando con la pestaña ETL…", selection: null });
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") { setState(s => ({ ...s, error: "Este navegador no permite vincular pestañas." })); return; }
    let raw: string | null = null;
    try { raw = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : sessionStorage.getItem(KEY); } catch { /* Storage is optional. */ }
    let binding = null;
    try { binding = parseBinding(JSON.parse(raw || "null")); } catch { /* Invalid URL is an empty state. */ }
    if (!binding) { setState(s => ({ ...s, error: "Abre este diagrama desde una conexión comprobada en Extracción." })); return; }
    try { sessionStorage.setItem(KEY, JSON.stringify(binding)); history.replaceState(null, "", window.location.pathname); } catch { setStorageWarning(true); }
    let active = true;
    const connection = new DiagramClient(binding, next => { if (active) setState(next); });
    setClient(connection);
    // pagehide also fires on F5. Keep the owner's lease for the next handshake;
    // an actually closed tab is reclaimed by the owner's presence timeout.
    const exit = () => connection.close();
    window.addEventListener("pagehide", exit);
    return () => { active = false; window.removeEventListener("pagehide", exit); connection.close(); };
  }, []);
  return { client, storageWarning, ...state };
}
