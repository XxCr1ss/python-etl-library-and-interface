import dagre from "@dagrejs/dagre";
import type { SchemaGraph } from "@/types/diagram";
export const CARD_WIDTH = 320;
export const cardHeight = (columns: number) => 76 + columns * 36;
export function diagramLayout(graph: SchemaGraph) {
  const layout = new dagre.graphlib.Graph({ multigraph: true });
  layout.setGraph({ rankdir: "LR", nodesep: 110, ranksep: 180, marginx: 60, marginy: 60 });
  layout.setDefaultEdgeLabel(() => ({}));
  for (const node of graph.nodes) layout.setNode(node.id, { width: CARD_WIDTH, height: cardHeight(node.columns.length) });
  for (const edge of graph.edges) if (edge.source_table_id !== edge.target_table_id) layout.setEdge(edge.source_table_id, edge.target_table_id, {}, edge.id);
  dagre.layout(layout);
  return graph.nodes.map(node => { const point = layout.node(node.id); return { id: node.id, position: { x: point.x - CARD_WIDTH / 2, y: point.y - cardHeight(node.columns.length) / 2 } }; });
}
