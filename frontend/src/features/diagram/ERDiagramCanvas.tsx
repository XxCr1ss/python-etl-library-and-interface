"use client";
import { useCallback, useEffect, useMemo } from "react";
import { Background, BaseEdge, Controls, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./diagram.css";
import { Button } from "@/components/ui";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { SchemaGraph } from "@/types/diagram";
import { diagramLayout, CARD_WIDTH } from "./layout";
import { TableNode, columnHandle, type TableFlowNode } from "./TableNode";
const nodeTypes = { table: TableNode };
function SelfReference({ sourceX: x, sourceY: y, targetX: tx, targetY: ty, markerEnd, style, id }: EdgeProps) {
  const top = Math.min(y, ty) - 100;
  return <BaseEdge id={id} markerEnd={markerEnd} style={style} path={"M " + x + " " + y + " C " + (x + 90) + " " + y + " " + (x + 90) + " " + top + " " + x + " " + top + " L " + tx + " " + top + " C " + (tx - 70) + " " + top + " " + (tx - 70) + " " + ty + " " + tx + " " + ty} />;
}
const edgeTypes = { selfReference: SelfReference };
function Canvas({ graph, selected, onSelect }: { graph: SchemaGraph; selected: string | null; onSelect: (id: string) => void }) {
  const { preference } = useTheme();
  const flow = useReactFlow<TableFlowNode>();
  const initial = useMemo(() => diagramLayout(graph).map(node => ({ ...node, type: "table" as const, dragHandle: ".table-drag-handle", width: CARD_WIDTH, data: { table: graph.nodes.find(n => n.id === node.id)!, active: false, onSelect } })), [graph, onSelect]);
  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>(initial);
  useEffect(() => { setNodes(initial); }, [initial, setNodes]);
  useEffect(() => { setNodes(current => current.map(n => ({ ...n, data: { ...n.data, active: n.id === selected } }))); }, [selected, setNodes]);
  const edges: Edge[] = useMemo(() => graph.edges.flatMap((edge, index) => edge.column_pairs.map((pair, pairIndex) => ({
    id: edge.id + ":" + pairIndex, source: edge.source_table_id, target: edge.target_table_id,
    sourceHandle: columnHandle(pair.source_column, "out"), targetHandle: columnHandle(pair.target_column, "in"),
    type: edge.source_table_id === edge.target_table_id ? "selfReference" : "smoothstep",
    pathOptions: { offset: 25 + index % 5 * 15 },
    label: selected && [edge.source_table_id, edge.target_table_id].includes(selected) ? edge.constraint_name || "FK" : undefined,
    labelStyle: { fill: "var(--ui-content)", fontSize: 12 }, labelBgStyle: { fill: "var(--ui-surface)" },
    ariaLabel: (edge.constraint_name || "FK") + ": " + pair.source_column + " → " + pair.target_column,
    style: { stroke: "var(--ui-action)", strokeWidth: selected && [edge.source_table_id, edge.target_table_id].includes(selected) ? 3 : 1.5 },
  }))), [graph, selected]);
  const center = useCallback((id: string) => { const n = flow.getNode(id); if (n) void flow.setCenter(n.position.x + CARD_WIDTH / 2, n.position.y + 100, { zoom: 1 }); }, [flow]);
  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface p-2">
      <label className="flex min-w-0 items-center gap-2 text-sm">Buscar tabla<select aria-label="Buscar tabla" className="min-w-0 max-w-52 rounded border border-line bg-surface p-2" value={selected || ""} onChange={e => { if (e.target.value) { onSelect(e.target.value); center(e.target.value); } }}>
        <option value="">Selecciona una tabla</option>{graph.nodes.map(n => <option key={n.id} value={n.id}>{n.table_name}</option>)}
      </select></label>
      <Button size="sm" variant="outline" onClick={() => void flow.zoomTo(1)}>100%</Button>
      <Button size="sm" variant="outline" disabled={!selected} onClick={() => selected && center(selected)}>Centrar selección</Button>
      <Button size="sm" variant="outline" onClick={() => void flow.fitView({ padding: 0.12 })}>Ajustar vista</Button>
      <Button size="sm" variant="outline" onClick={() => setNodes(initial)}>Reorganizar</Button>
      <span className="text-xs text-content-muted">PK: primaria · FK: foránea · {graph.nodes.length} tablas · {graph.edges.length} relaciones</span>
    </div>
    <div className="min-h-0 flex-1" aria-label="Lienzo de relaciones">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange}
        onInit={instance => { const first = initial[0]; if (first) void instance.setViewport({ x: 40 - first.position.x, y: 40 - first.position.y, zoom: 1 }); }}
        onNodeClick={(_, node) => onSelect(node.id)} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null}
        colorMode={preference} minZoom={0.1} maxZoom={2} defaultViewport={{ x: 20, y: 20, zoom: 1 }}
        ariaLabelConfig={{ "controls.zoomIn.ariaLabel": "Acercar", "controls.zoomOut.ariaLabel": "Alejar", "controls.fitView.ariaLabel": "Ajustar vista", "controls.interactive.ariaLabel": "Alternar movimiento de tablas" }}>
        <Background gap={24} /><Controls showInteractive={false} />
      </ReactFlow>
    </div>
  </div>;
}
export default function ERDiagramCanvas(props: { graph: SchemaGraph; selected: string | null; onSelect: (id: string) => void }) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
