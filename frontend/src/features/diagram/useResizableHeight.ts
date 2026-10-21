"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
export function heightLimits(available: number) { const max = Math.max(40, Math.min(available * 0.75, available - 100)); return { min: Math.min(160, max), max }; }
export function useResizableHeight(container: RefObject<HTMLElement>) {
  const [height, setHeight] = useState(280), [collapsed, setCollapsed] = useState(false);
  const [limits, setLimits] = useState({ min: 160, max: 600 });
  const drag = useRef<{ y: number; height: number } | null>(null);
  const clamp = (value: number) => Math.max(limits.min, Math.min(limits.max, value));
  useEffect(() => {
    const resize = () => { const next = heightLimits(container.current?.clientHeight || window.innerHeight); setLimits(next); setHeight(h => Math.max(next.min, Math.min(next.max, h))); };
    resize(); const observer = new ResizeObserver(resize); if (container.current) observer.observe(container.current);
    window.addEventListener("resize", resize); return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [container]);
  const stop = (e: PointerEvent<HTMLElement>) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); };
  return { height, collapsed, limits, toggle: () => setCollapsed(c => !c), expand: () => setCollapsed(false),
    separator: { onPointerDown: (e: PointerEvent<HTMLElement>) => { if (collapsed) return; drag.current = { y: e.clientY, height }; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); },
      onPointerMove: (e: PointerEvent<HTMLElement>) => { if (drag.current) setHeight(clamp(drag.current.height + drag.current.y - e.clientY)); }, onPointerUp: stop, onPointerCancel: stop,
      onLostPointerCapture: () => { drag.current = null; },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => { if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return; e.preventDefault(); setCollapsed(false); setHeight(h => e.key === "Home" ? limits.min : e.key === "End" ? limits.max : clamp(h + (e.key === "ArrowUp" ? 24 : -24))); } } };
}
