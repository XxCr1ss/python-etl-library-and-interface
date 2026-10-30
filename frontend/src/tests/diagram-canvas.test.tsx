import { useEffect, useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { Node, NodeChange } from "@xyflow/react";
import Canvas from "@/features/diagram/ERDiagramCanvas";
import { graphFixture } from "./fixtures/diagram";
import { CARD_WIDTH, diagramLayout } from "@/features/diagram/layout";

const flow = vi.hoisted(() => ({ getNode: vi.fn(), setCenter: vi.fn(), zoomTo: vi.fn(), fitView: vi.fn(), setViewport: vi.fn() }));
vi.mock("@xyflow/react", async importOriginal => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return { ...actual, useReactFlow: () => flow, ReactFlow: ({ nodes, onInit, onNodeClick, onNodesChange, children }: {
    nodes: Node[]; onInit: (instance: typeof flow) => void; onNodeClick: (event: null, node: Node) => void;
    onNodesChange: (changes: NodeChange[]) => void; children?: React.ReactNode;
  }) => {
    const init = useRef(onInit);
    useEffect(() => { init.current(flow); }, []);
    return <>{children}{nodes.map(node => <button key={node.id} aria-pressed={Boolean(node.data.active)} onClick={() => onNodeClick(null, node)}>Tabla {node.id}</button>)}
      <button onClick={() => onNodesChange([{ id: "parent", type: "position", position: { x: 999, y: 999 } }])}>Mover tabla</button>
      <output aria-label="Posiciones">{JSON.stringify(nodes.map(n => n.position))}</output></>;
  }, Background: () => null, Controls: () => null };
});

function Harness() {
  const [selected, select] = useState<string | null>(null);
  return <Canvas graph={graphFixture} selected={selected} onSelect={select} />;
}

it("selects tables, centers and restores the graph after moving a table", async () => {
  flow.getNode.mockReturnValue({ position: { x: 10, y: 20 } });
  const user = userEvent.setup(); render(<Harness />);
  expect(screen.getByRole("button", { name: "Centrar selección" })).toBeDisabled();
  expect(flow.setViewport).toHaveBeenCalled();
  await user.selectOptions(screen.getByRole("combobox", { name: "Buscar tabla" }), "parent");
  expect(screen.getByRole("button", { name: "Tabla parent" })).toHaveAttribute("aria-pressed", "true");
  expect(flow.setCenter).toHaveBeenCalledWith(10 + CARD_WIDTH / 2, 120, { zoom: 1 });
  await user.click(screen.getByRole("button", { name: "Centrar selección" }));
  await user.click(screen.getByRole("button", { name: "100%" }));
  expect(flow.zoomTo).toHaveBeenCalledWith(1);
  await user.click(screen.getByRole("button", { name: "Ajustar vista" }));
  expect(flow.fitView).toHaveBeenCalledWith({ padding: 0.12 });
  await user.click(screen.getByRole("button", { name: "Tabla child" }));
  expect(screen.getByRole("combobox", { name: "Buscar tabla" })).toHaveValue("child");
  await user.click(screen.getByRole("button", { name: "Mover tabla" }));
  expect(screen.getByLabelText("Posiciones")).toHaveTextContent("999");
  await user.click(screen.getByRole("button", { name: "Reorganizar" }));
  expect(screen.getByLabelText("Posiciones")).toHaveTextContent(JSON.stringify(diagramLayout(graphFixture).map(n => n.position)));
});

it("handles empty graphs and a selected node no longer available in the renderer", async () => {
  flow.getNode.mockReturnValue(undefined);
  const user = userEvent.setup();
  const view = render(<Canvas graph={graphFixture} selected="parent" onSelect={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Centrar selección" }));
  expect(flow.setCenter).not.toHaveBeenCalled();
  view.rerender(<Canvas graph={{ ...graphFixture, nodes: [], edges: [] }} selected={null} onSelect={vi.fn()} />);
  expect(screen.getByText(/0 tablas · 0 relaciones/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Centrar selección" })).toBeDisabled();
});
