"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { SchemaGraph, TableSample } from "@/types/diagram";
import { useDiagramSync } from "./useDiagramSync";
import { TablePreviewBottomPanel } from "./TablePreviewBottomPanel";
const Canvas = dynamic(() => import("./ERDiagramCanvas"), { ssr: false, loading: () => <p role="status" className="p-6">Preparando lienzo…</p> });
export default function DiagramPage() {
  const sync = useDiagramSync();
  const [graph, setGraph] = useState<SchemaGraph | null>(null), [graphError, setGraphError] = useState("");
  const [selected, setSelected] = useState<string | null>(null), [sample, setSample] = useState<TableSample | null>(null);
  const [sampleError, setSampleError] = useState(""), [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0), [sampleRefresh, setSampleRefresh] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, TableSample>());
  const select = useCallback((id: string) => setSelected(id), []);
  const client = sync.client;
  useEffect(() => {
    if (!client || !sync.connected || sync.invalid) return;
    const abort = new AbortController();
    setGraphError(""); setGraph(null); setSelected(null); cache.current.clear();
    void client.graph(abort.signal).then(data => { if (!abort.signal.aborted) setGraph(data); }).catch(error => { if (!abort.signal.aborted) setGraphError(error.message); });
    return () => abort.abort();
  }, [client, sync.connected, sync.invalid, refresh]);
  useEffect(() => {
    setSample(null); setSampleError(""); setLoading(false);
    const table = graph?.nodes.find(n => n.id === selected);
    if (!client || !selected || !table?.selectable || !sync.connected || sync.invalid) return;
    const cached = cache.current.get(selected);
    if (cached) { setSample(cached); return; }
    const abort = new AbortController(); setLoading(true);
    void client.preview(selected, abort.signal).then(data => {
      if (abort.signal.aborted) return;
      if (data.table_name !== table.table_name) throw new Error("La muestra no corresponde a la tabla seleccionada.");
      cache.current.set(selected, data);
      if (cache.current.size > 5) cache.current.delete(cache.current.keys().next().value!);
      setSample(data);
    }).catch(error => { if (!abort.signal.aborted) setSampleError(error.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [client, selected, graph, sync.connected, sync.invalid, sampleRefresh]);
  useEffect(() => { if (sync.invalid) { cache.current.clear(); setSample(null); } }, [sync.invalid]);
  const table = graph?.nodes.find(n => n.id === selected);
  const pending = sync.selection && ["sending", "pending_confirmation", "uncertain"].includes(sync.selection.status);
  const reason = !sync.connected ? sync.error : pending ? sync.selection!.message : sync.owner?.route !== "/transform" ? "Abre Transformación en la pestaña ETL para usar esta tabla." : !sync.owner.available ? sync.owner.reason : "";
  return <main ref={container} className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-surface text-content" aria-label="Diagrama entidad-relación">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
      <div><h1 className="text-lg font-bold">Diagrama entidad-relación</h1><p className="text-xs text-content-muted">Inspecciona el esquema y elige una tabla sin salir de tu proceso ETL.</p></div>
      <div className="flex flex-wrap items-center gap-3"><span role="status" className="text-xs">{sync.connected ? "ETL vinculada · " + sync.owner?.route : sync.error}</span><Button size="sm" variant="outline" disabled={!sync.connected} onClick={() => setRefresh(n => n + 1)}>Actualizar esquema</Button><ThemeToggle /></div>
    </header>
    {sync.storageWarning && <p role="status" className="shrink-0 bg-warning-surface px-4 py-2 text-xs text-warning">El navegador no permite guardar la vinculación. Para recuperarla, vuelve a abrir el diagrama desde Extracción.</p>}
    {sync.selection && <div role="status" className="shrink-0 border-b border-line bg-surface-muted px-4 py-2 text-sm">{sync.selection.message}{sync.selection.status === "uncertain" && <Button variant="outline" size="sm" onClick={() => client?.reconcile()}>Consultar resultado</Button>}</div>}
    {graphError && <div role="alert" className="p-4 text-danger">{graphError} <Button variant="outline" onClick={() => setRefresh(n => n + 1)}>Reintentar esquema</Button></div>}
    {!graph && !graphError && <div className="flex min-h-0 flex-1 items-center justify-center p-6"><p role="status">{sync.connected ? "Consultando tablas y relaciones…" : sync.error}</p></div>}
    {graph && <>
      {graph.warnings.length > 0 && <details className="shrink-0 border-b border-line px-4 py-2 text-sm"><summary>Metadatos parciales · {graph.warnings.length} avisos</summary><ul className="max-h-24 overflow-auto">{graph.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></details>}
      {graph.nodes.length ? <div className="min-h-0 flex-1"><Canvas graph={graph} selected={selected} onSelect={select} /></div> : <p className="flex-1 p-6">No hay tablas disponibles en este esquema. Revisa la conexión y sus permisos.</p>}
      <details className="shrink-0 border-t border-line px-4 py-2 text-sm"><summary>Tablas y relaciones en texto</summary><div className="max-h-40 overflow-auto"><ul>{graph.nodes.map(n => <li key={n.id}><button className="text-action underline" onClick={() => select(n.id)}>{n.schema}.{n.table_name}</button></li>)}</ul><ul>{graph.edges.map(e => <li key={e.id}>{graph.nodes.find(n => n.id === e.source_table_id)?.table_name}: {e.column_pairs.map(p => p.source_column).join(", ")} → {e.target_schema}.{e.target_table} ({e.column_pairs.map(p => p.target_column).join(", ")})</li>)}</ul></div></details>
      {table && <TablePreviewBottomPanel key={table.id} table={table} sample={sample} loading={loading} error={sampleError} reason={reason}
        container={container} onClose={() => setSelected(null)} onRetry={() => { cache.current.delete(table.id); setSampleRefresh(n => n + 1); }} onUse={() => client?.useTable(table.id)} />}
    </>}
  </main>;
}
