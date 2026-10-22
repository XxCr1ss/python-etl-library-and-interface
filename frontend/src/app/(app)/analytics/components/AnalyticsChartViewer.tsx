"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, EmptyState, Select } from "@/components/ui";
import { formatScalar } from "@/features/warehouse/format";
import type { QueryResult, Scalar, WarehouseQuery } from "@/types/warehouse";

export default function AnalyticsChartViewer({ result, query, disabled, onDrill }: { result: QueryResult; query: WarehouseQuery; disabled: boolean; onDrill: (row: Record<string, Scalar>) => void }) {
  const [kind, setKind] = useState("bar");
  const [metric, setMetric] = useState(query.metrics[0].id);
  const active = query.metrics.some(m => m.id === metric) ? metric : query.metrics[0].id;
  const column = result.columns.find(c => c.id === active)!;
  const data = result.data.map((row, index) => ({ label: query.dimensions.map(d => formatScalar(row[d.id])).join(" / ") || "Total", value: row[active] === null ? null : Number(row[active]), exact: formatScalar(row[active], column.logical_type), index }));
  const numerical = ["integer", "decimal", "float"].includes(column.logical_type) && data.every(d => d.value === null || Number.isFinite(d.value));
  const pieAllowed = numerical && data.length <= 12 && data.every(d => d.value !== null && d.value >= 0) && data.some(d => Number(d.value) > 0);
  const lineAllowed = query.dimensions.length === 1 && !!query.dimensions[0].bucket && query.order_by.every(o => o.field_id === query.dimensions[0].id && o.direction === "ASC");
  const selected = kind === "pie" && !pieAllowed || kind === "line" && !lineAllowed ? "bar" : kind;
  const plotted = selected === "line" ? [...data].sort((a, b) => a.label.localeCompare(b.label)) : data;
  if (!result.data.length || !numerical) return <EmptyState title={result.data.length ? "Esta métrica se consulta en la tabla" : "Sin coincidencias"} description={result.data.length ? "Usa la tabla agregada para métricas temporales o valores fuera del rango gráfico." : "Revisa los filtros y vuelve a consultar."} action={<a href="#warehouse-query" className="text-action underline">Revisar consulta</a>} />;
  return <div className="space-y-4" aria-label="Gráfico de consulta">
    <div className="flex flex-wrap items-end gap-3"><Select label="Métrica del gráfico" value={active} onChange={e => setMetric(e.target.value)}>{result.columns.filter(c => c.role === "metric").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de gráfico">{[["bar", "Barras", true], ["line", "Líneas", lineAllowed], ["pie", "Dona", pieAllowed]].map(([id, label, allowed]) => <Button key={String(id)} variant={selected === id ? "primary" : "outline"} aria-pressed={selected === id} disabled={!allowed} onClick={() => setKind(String(id))}>{label}</Button>)}</div></div>
    <p className="text-sm text-content-muted">Una métrica por eje. El gráfico aproxima valores para dibujar; la tabla y los reportes conservan precisión. Abre una categoría desde la tabla para consultar su detalle.</p>
    {!pieAllowed && <p className="text-sm text-content-muted">La dona requiere hasta 12 categorías con valores no negativos, sin nulos y total positivo.</p>}
    {!lineAllowed && <p className="text-sm text-content-muted">Las líneas requieren una dimensión de calendario ordenada cronológicamente.</p>}
    {selected === "pie" && <p className="text-sm text-content-muted">Porcentajes sobre categorías mostradas{result.meta.truncated ? "; el Top N excluye otras categorías" : ""}.</p>}
    <div className="h-80 min-w-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" minWidth={1}>
        {selected === "pie" ? <PieChart accessibilityLayer={false}><Pie data={data} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="75%" isAnimationActive={false} onClick={(_, index) => { if (!disabled) onDrill(result.data[index]); }}>
          {data.map((d, i) => <Cell key={d.index} fill={`hsl(${210 + i * 39} 58% ${45 + i % 3 * 8}%)`} />)}</Pie><Tooltip formatter={(_, __, item) => item.payload.exact} /></PieChart>
          : selected === "line" ? <LineChart accessibilityLayer={false} data={plotted} margin={{ top: 10, right: 20, left: 5, bottom: 35 }}><CartesianGrid stroke="var(--ui-line)" /><XAxis dataKey="label" tick={{ fill: "var(--ui-content)" }} /><YAxis width={65} tick={{ fill: "var(--ui-content)" }} /><Tooltip formatter={(_, __, item) => item.payload.exact} /><Line dataKey="value" name={column.label} stroke="var(--ui-action)" strokeWidth={2} isAnimationActive={false} connectNulls={false} /></LineChart>
          : <BarChart accessibilityLayer={false} data={data} margin={{ top: 10, right: 20, left: 5, bottom: 35 }}><CartesianGrid stroke="var(--ui-line)" /><XAxis dataKey="label" tick={{ fill: "var(--ui-content)" }} /><YAxis width={65} tick={{ fill: "var(--ui-content)" }} /><Tooltip formatter={(_, __, item) => item.payload.exact} /><Bar dataKey="value" name={column.label} fill="var(--ui-action)" isAnimationActive={false} onClick={(_, index) => { if (!disabled) onDrill(result.data[index]); }} /></BarChart>}
      </ResponsiveContainer>
    </div>
  </div>;
}
