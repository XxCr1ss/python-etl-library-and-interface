"use client";
import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, EmptyState, Select } from "@/components/ui";
import { formatScalar } from "@/features/warehouse/format";
import { downloadArtifact } from "@/features/warehouse/reportStorage";
import type { AnalysisResult } from "@/types/analysis";
import { HeatmapTable } from "./HeatmapTable";

export default function AdvancedChartViewer({ result }: { result: AnalysisResult }) {
  const [kind, setKind] = useState("bar"), [selected, setSelected] = useState("");
  const chart = useRef<HTMLDivElement>(null);
  const dimensions = result.columns.filter(c => c.role === "dimension"), allMetrics = result.columns.filter(c => c.role === "metric" && ["integer", "float", "decimal"].includes(c.logical_type));
  const metric = allMetrics.find(m => m.id === selected) || allMetrics[0];
  if (!metric || !result.data.length) return <EmptyState title="Sin valores para representar" description="La tabla conserva el resultado y sus tipos. Revisa las medidas y los filtros para consultar otro conjunto." action={<a href="#main-content" className="text-action underline">Revisar configuración</a>} />;
  const unit = result.units[metric.id];
  const compatible = allMetrics.filter(m => result.units[m.id] === unit);
  const series = Array.from(new Set(result.data.map(row => JSON.stringify(dimensions.slice(1).map(d => row[d.id])))));
  const channels = series.flatMap((seriesKey, i) => compatible.map((m, j) => ({ key: `v${i}_${j}`, seriesKey, metric: m, label: [...JSON.parse(seriesKey).map((v: unknown) => formatScalar(v as string | number | boolean | null)), m.label].join(" · ") })));
  const grouped = new Map<string, { label: string; [key: string]: string | number | null }>();
  result.data.forEach(row => {
    const x = dimensions.length ? JSON.stringify(row[dimensions[0].id]) : "total";
    const record = grouped.get(x) || { label: dimensions.length ? formatScalar(row[dimensions[0].id]) : "Total" };
    const seriesKey = JSON.stringify(dimensions.slice(1).map(d => row[d.id]));
    channels.filter(c => c.seriesKey === seriesKey).forEach(c => { record[c.key] = row[c.metric.id] === null ? null : Number(row[c.metric.id]); record[`${c.key}_exact`] = formatScalar(row[c.metric.id], c.metric.logical_type); });
    grouped.set(x, record);
  });
  const temporal = result.definition.dimensions.length === 1 && !!result.definition.dimensions[0].bucket;
  const data = Array.from(grouped.values()).sort((a, b) => temporal ? a.label.localeCompare(b.label) : 0);
  const color = (i: number) => `hsl(${210 + i * 53} 62% 43%)`;
  const plotAllowed = channels.length <= 30 && data.every(row => channels.every(c => row[c.key] === undefined || row[c.key] === null || Number.isFinite(row[c.key])));
  function exportSvg() {
    const svg = chart.current?.querySelector("svg");
    if (svg) downloadArtifact(new XMLSerializer().serializeToString(svg), "grafico_analitico.svg", "image/svg+xml");
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-3"><Select label="Medida y unidad del gráfico" value={metric.id} onChange={e => setSelected(e.target.value)}>{allMetrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</Select><Select label="Representación del análisis" value={kind} onChange={e => setKind(e.target.value)}><option value="bar">Barras agrupadas</option><option value="stack">Barras apiladas</option><option value="line" disabled={!temporal}>Series temporales</option><option value="heatmap" disabled={dimensions.length < 2}>Matriz de intensidad</option></Select></div>
    <p className="text-sm text-content-muted">Unidad: {unit}. Se representan juntas únicamente medidas de esa unidad. Los números se aproximan para dibujar; la tabla conserva los valores exactos. Las barras apiladas no implican que las categorías sean excluyentes.</p>
    {kind === "heatmap" && dimensions.length >= 2 ? <HeatmapTable result={result} metric={metric} /> : !plotAllowed ? <p role="status">Hay demasiadas series o valores fuera del rango gráfico. Usa cortes de dimensiones o la tabla.</p> : <div ref={chart} className="h-80 min-w-0" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" minWidth={1}>{kind === "line" && temporal ? <LineChart data={data} accessibilityLayer={false}><CartesianGrid stroke="#cbd5e1" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(_, name, item) => [item.payload[`${String(item.dataKey)}_exact`], name]} /><Legend />{channels.map((c, i) => <Line key={c.key} name={c.label} dataKey={c.key} stroke={color(i)} connectNulls={false} isAnimationActive={false} />)}</LineChart> : <BarChart data={data} accessibilityLayer={false}><CartesianGrid stroke="#cbd5e1" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(_, name, item) => [item.payload[`${String(item.dataKey)}_exact`], name]} /><Legend />{channels.map((c, i) => <Bar key={c.key} name={c.label} dataKey={c.key} fill={color(i)} stackId={kind === "stack" ? "values" : undefined} isAnimationActive={false} />)}</BarChart>}</ResponsiveContainer></div>}
    {plotAllowed && kind !== "heatmap" && <Button variant="outline" onClick={exportSvg}>Descargar gráfico SVG</Button>}
  </div>;
}
