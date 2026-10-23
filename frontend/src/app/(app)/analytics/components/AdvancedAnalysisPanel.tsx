"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Skeleton } from "@/components/ui";
import { useAuth } from "@/auth/AuthProvider";
import { useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import { csvResult, downloadArtifact, reportStorageKey, validateReportDefinition } from "@/features/warehouse/reportStorage";
import type { AnalysisSpec, SavedReport } from "@/types/analysis";
import { AnalysisBuilder, newAnalysis } from "./AnalysisBuilder";
import { AggregateDataTable } from "./AggregateDataTable";
import { KpiSummaryCards } from "./KpiSummaryCards";
import { SharedReportFilters } from "./SharedReportFilters";

const Chart = dynamic(() => import("./AdvancedChartViewer"), { ssr: false, loading: () => <Skeleton className="h-80" /> });

export function AdvancedAnalysisPanel() {
  const w = useWarehouse();
  return w.catalog?.capabilities.supported_operations.includes("warehouse_analyze") && w.connection.db_type === "postgresql" ? <AdvancedWorkspace /> : null;
}

function AdvancedWorkspace() {
  const w = useWarehouse(), { user } = useAuth();
  const [panels, setPanels] = useState<AnalysisSpec[]>([]), [saved, setSaved] = useState<SavedReport | null>(null), [message, setMessage] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(false);
  const catalog = w.catalog!;
  const contextKey = reportStorageKey(user?.id || "local", [w.connection.db_type, w.connection.host, w.connection.port, w.connection.database, w.connection.user, w.connection.service_name, w.connection.use_agent, w.agentId]);
  useEffect(() => { setPanels([]); setSaved(null); setMessage(""); try { setStorageAvailable(!!localStorage.getItem(contextKey)); } catch { setStorageAvailable(false); } }, [contextKey]);
  const spec = w.analysisDraft;
  const change = (value: AnalysisSpec) => { if (!w.busy) w.setAnalysisDraft(value); };
  async function save() {
    if (!panels.length) return;
    try {
      const definition = await validateReportDefinition({ version: 1, title: panels[0].title, analyses: panels });
      localStorage.setItem(contextKey, JSON.stringify(definition)); setSaved(definition); setStorageAvailable(true); setMessage("Definición guardada en este navegador y contexto, sin credenciales ni resultados. Exporta una copia para conservarla fuera del navegador.");
    } catch { setMessage("No se pudo guardar la definición. Puedes descargarla como JSON."); }
  }
  async function restore() {
    try {
      const definition = await validateReportDefinition(JSON.parse(localStorage.getItem(contextKey) || "null"));
      setPanels(definition.analyses); setSaved(definition); change(definition.analyses[0]); setMessage("Definición restaurada. Se consultarán datos actuales al ejecutar; todavía no hay un resultado nuevo.");
    } catch { setMessage("La definición guardada no es compatible. Revisa su versión o crea un análisis nuevo."); }
  }
  return <div className="space-y-6"><Card className="space-y-5" aria-label="Análisis avanzados"><h2 className="text-xl font-semibold">Análisis avanzados y reportes</h2><p className="text-sm text-content-muted">Configura indicadores, cohortes, pares y distribuciones reutilizables. Se calculan en el Core sobre toda la selección, con límites de ejecución.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!w.busy || !catalog.tables.length} onClick={() => change(newAnalysis(w.draft?.base_table_id || catalog.tables[0].table_id))}>Nuevo análisis avanzado</Button>{w.draft && <Button variant="outline" disabled={!!w.busy} onClick={() => { const q = w.draft!; change({ ...newAnalysis(q.base_table_id), title: "Análisis de consulta actual", selection: { base_table_id: q.base_table_id, joins: q.joins, filters: q.filters }, dimensions: q.dimensions, measures: q.metrics.map(m => ({ id: m.id, label: m.label, aggregation: m.aggregation, ...("column" in m ? { value: { field: { relation: "base", column: m.column } } } : {}) })), order_by: q.order_by, limit: q.limit }); }}>Usar consulta sencilla</Button>}{storageAvailable && <Button variant="outline" disabled={!!w.busy} onClick={() => void restore()}>Restaurar reporte guardado</Button>}</div>
    {spec && <AnalysisBuilder spec={spec} catalog={catalog} busy={!!w.busy} onChange={change} onRun={() => void w.consultAnalysis(spec)} />}
  </Card>
    {w.analysisResults.map((result, i) => <Card key={result.execution_id} className="space-y-4" aria-label={`Resultado avanzado ${i + 1}`}><h2 className="text-lg font-semibold">{result.definition.title}</h2><p className="text-sm text-content-muted">Grano: {result.definition.grain}. Ejecución {result.execution_id}. {result.meta.generated_at} · consistencia {result.meta.consistency} · zona {result.meta.temporal_context.timezone}. Exportar aquí conserva este resultado; ejecutar nuevamente consulta datos actuales.</p>
      {spec && JSON.stringify(spec) !== JSON.stringify(w.analysisApplied?.[i] || result.definition) && <Alert tone="warning" title="Resultado de una definición anterior">El formulario tiene cambios o corresponde a otro panel. Los datos y exportaciones siguientes conservan la definición de esta ejecución.</Alert>}
      {result.meta.truncated && <Alert tone="warning" title="Grupos limitados">La tabla muestra los primeros {result.meta.applied_limit} grupos. Los KPI se calculan antes del límite.</Alert>}
      {result.warnings.map((warning, n) => <Alert key={n} title="Definición y alcance" tone="warning">{warning.message}</Alert>)}
      <KpiSummaryCards result={result} />{result.measure_counts?.map(count => <p key={count.metric_id} className="text-sm text-content-muted">{result.columns.find(c => c.id === count.metric_id)?.label || count.metric_id}: {count.valid.value} observaciones válidas de {count.observed.value}; {count.excluded.value} sin valor elegible. En medias por entidad se cuentan entidades.</p>)}<Chart result={result} /><AggregateDataTable result={result} caption={`Tabla: ${result.definition.title}`} disabled onDrill={() => {}} />
      <details><summary className="cursor-pointer text-sm font-semibold">Definición reproducible, filtros y denominadores</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(result.definition, null, 2)}</pre></details>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!w.busy || panels.length >= 8} onClick={() => setPanels(p => [...p, result.definition])}>Agregar esta definición al reporte</Button><Button variant="outline" onClick={() => downloadArtifact(result, "resultado_analitico.json")}>Descargar este resultado JSON</Button><Button variant="outline" onClick={() => downloadArtifact(csvResult(result.columns, result.data), "resultado_analitico.csv", "text/csv;charset=utf-8")}>Descargar esta tabla CSV</Button></div>
    </Card>)}
    {!!panels.length && <Card className="space-y-4" aria-label="Reporte de varios paneles"><h2 className="text-lg font-semibold">Reporte de varios paneles</h2><p className="text-sm text-content-muted">Hasta ocho análisis de esta conexión en una operación de lectura. Los filtros quedan guardados en cada definición. Puedes añadir condiciones compartidas con mapeo y excepciones explícitas por panel.</p><SharedReportFilters key={JSON.stringify(panels.map(p => [p.title, p.selection.base_table_id]))} catalog={catalog} panels={panels} busy={!!w.busy} onChange={setPanels} /><ol className="space-y-2">{panels.map((p, i) => <li key={i} className="flex flex-wrap items-center gap-3"><span>{i + 1}. {p.title}</span><Button variant="ghost" disabled={!!w.busy} onClick={() => change(p)}>Editar copia del panel {i + 1}</Button><Button variant="ghost" disabled={!!w.busy} onClick={() => setPanels(panels.filter((_, n) => n !== i))}>Quitar panel {i + 1}</Button></li>)}</ol><div className="flex flex-wrap gap-2"><Button disabled={!!w.busy} onClick={() => void w.consultAnalyses(panels)}>Ejecutar todos los paneles</Button><Button variant="outline" disabled={!!w.busy} onClick={() => void save()}>Guardar definición del reporte</Button><Button variant="outline" onClick={() => downloadArtifact({ version: 1, title: panels[0].title, analyses: panels }, "definicion_reporte.json")}>Exportar definición</Button><Button variant="ghost" onClick={() => { localStorage.removeItem(contextKey); setStorageAvailable(false); setSaved(null); setMessage("Definición eliminada de este navegador."); }}>Eliminar definición guardada</Button></div></Card>}
    <label className="block text-sm font-semibold">Importar definición JSON<input className="mt-2 block max-w-full text-sm" type="file" accept="application/json,.json" disabled={!!w.busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024) { setMessage("La definición supera 1 MiB."); return; } try { const definition = await validateReportDefinition(JSON.parse(await file.text())); setPanels(definition.analyses); setSaved(definition); change(definition.analyses[0]); setMessage("Definición importada y validada. Revisa sus tablas y filtros antes de ejecutar."); } catch { setMessage("El archivo no contiene una definición compatible."); } }} /></label>
    {message && <Alert title={saved?.title || "Reporte"}>{message}</Alert>}
  </div>;
}
