"use client";
import dynamic from "next/dynamic";
import { Alert, Button, Card, EmptyState, LoadingSkeleton, Skeleton } from "@/components/ui";
import { useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";
import type { Scalar } from "@/types/warehouse";
import { WarehouseConnectionCard } from "./components/WarehouseConnectionCard";
import { QueryBuilderPanel } from "./components/QueryBuilderPanel";
import { AggregateDataTable } from "./components/AggregateDataTable";
import { KpiSummaryCards } from "./components/KpiSummaryCards";
import { DetailDataGrid } from "./components/DetailDataGrid";
import { ReportExportBar } from "./components/ReportExportBar";

const Chart = dynamic(() => import("./components/AnalyticsChartViewer"), { ssr: false, loading: () => <Skeleton className="h-80" /> });
export default function AnalyticsPage() {
  const w = useWarehouse();
  function drill(row: Record<string, Scalar>) {
    if (!w.applied) return;
    void w.loadDetail(w.applied.dimensions.map(d => ({ field: d.field, bucket: d.bucket, value: row[d.id] })), 1);
  }
  return <div className="space-y-6 text-content">
    <div><p className="text-sm font-semibold text-action">Exploración y reportes</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Bodega de datos</h1><p className="mt-2 max-w-3xl text-content-muted">Convierte tus datos cargados en métricas y comparaciones. Explora una bodega existente aunque no hayas ejecutado un pipeline en esta sesión.</p></div>
    <WarehouseConnectionCard />
    {w.error && <Alert tone="error" title="No se pudo completar la operación">{w.error}</Alert>}
    {w.notice && <Alert title="Bodega de datos">{w.notice}</Alert>}
    {w.busy && <LoadingSkeleton label={w.busy}><Skeleton className="h-12" /><Button variant="outline" onClick={w.cancel}>Cancelar espera</Button><p className="text-sm">Cancelar la espera no garantiza detener una consulta que ya está ejecutándose.</p></LoadingSkeleton>}
    {!w.catalog && !w.busy && <EmptyState title="Conecta tu bodega para comenzar" description="Configura una conexión de lectura o copia el destino disponible de Carga. Después podrás elegir métricas y dimensiones." action={<a href="#main-content" className="text-action underline">Configurar conexión arriba</a>} />}
    {w.catalog?.warnings.map((warning, i) => <Alert key={i} tone="warning" title="Aviso del catálogo">{warning.message}</Alert>)}
    {w.catalog && !w.catalog.tables.length && <EmptyState title="El esquema no contiene tablas" description="Comprueba la base, el esquema predeterminado y los permisos del usuario. Actualiza el catálogo para volver a consultar." action={<Button variant="outline" disabled={!!w.busy} onClick={() => void w.connect()}>Volver a leer catálogo</Button>} />}
    <QueryBuilderPanel />
    {w.result && w.applied && <>
      {w.dirty && <Alert tone="warning" title="Resultados de la consulta anterior">Aplica o descarta los cambios del constructor para abrir detalle o exportar.</Alert>}
      <KpiSummaryCards result={w.result} />
      <Card className="space-y-4" aria-label="Resultados agregados"><h2 className="text-lg font-semibold">Visualización y tabla agregada</h2><p className="text-sm text-content-muted">{w.result.meta.returned_rows} grupos · límite {w.result.meta.applied_limit} · {new Date(w.result.meta.generated_at).toLocaleString("es-CO")} · {w.result.meta.execution_time_ms} ms · zona {w.result.meta.temporal_context.timezone}</p>
        {w.result.meta.truncated && <Alert tone="warning" title="Top N aplicado">Hay más grupos que los mostrados. Los KPI incluyen el conjunto filtrado completo.</Alert>}
        {w.result.meta.consistency === "statement" && <Alert tone="warning" title="Consistencia por sentencia">El motor no garantiza el mismo snapshot para gráfico y KPI en esta configuración.</Alert>}
        {w.result.warnings.map((warning, i) => <Alert key={i} tone="warning" title="Aviso de resultados">{warning.message}</Alert>)}
        <Chart result={w.result} query={w.applied} disabled={w.dirty || !!w.busy} onDrill={drill} />
        <AggregateDataTable result={w.result} caption="Tabla agregada" onDrill={drill} disabled={w.dirty || !!w.busy} />
      </Card>
      <DetailDataGrid /><ReportExportBar />
    </>}
  </div>;
}
