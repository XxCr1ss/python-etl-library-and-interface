import { useState } from "react";
import { Button, Card, Select } from "@/components/ui";
import { useWarehouse } from "@/features/warehouse/WarehouseSessionProvider";

export function ReportExportBar() {
  const w = useWarehouse();
  const [mode, setMode] = useState<"aggregate" | "detail" | "sample">("aggregate");
  if (!w.result || !w.catalog) return null;
  const sample = w.detail?.pagination.mode === "sample";
  const active = mode === "aggregate" ? mode : sample ? "sample" : "detail";
  return <Card className="space-y-3" aria-label="Exportación de reportes"><h2 className="text-lg font-semibold">Descargar reporte</h2>
    <Select label="Alcance del reporte" value={active} onChange={e => setMode(e.target.value as typeof mode)}><option value="aggregate">Agregado actual · incluye Top N</option><option value={sample ? "sample" : "detail"} disabled={!w.detailRequest}>{sample ? "Muestra de hasta 100 registros" : "Detalle filtrado completo dentro del límite"}</option></Select>
    <p className="text-sm text-content-muted">{active === "aggregate" ? "Conserva agrupación, orden y límite de la consulta aplicada." : active === "sample" ? "Exporta una muestra; no garantiza orden estable." : `Exporta desde la primera fila, no solo la página visible. Límite: ${w.catalog.capabilities.effective_limits.export_rows.toLocaleString("es-CO")} filas.`} Cada descarga vuelve a consultar la bodega. Máximo {Math.floor(w.catalog.capabilities.effective_limits.export_bytes / 1024 / 1024)} MiB. Si el detalle completo supera el límite, aplica más filtros.</p>
    <p className="text-sm text-content-muted">CSV usa celdas vacías para null y protege texto que pueda interpretarse como fórmula. JSON conserva tipos y nulos.</p>
    <div className="flex flex-wrap gap-2">{(["csv", "json"] as const).map(format => <Button key={format} variant="outline" disabled={!!w.busy || w.dirty || (active !== "aggregate" && !w.detailRequest)} onClick={() => void w.exportReport(active, format)}>Descargar {format.toUpperCase()}</Button>)}</div>
  </Card>;
}
