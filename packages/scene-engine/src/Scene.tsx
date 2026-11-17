import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import type { NodeKind, NodeState, SceneState } from "@mufassall/scene-schema";
import { BLOCK_A, BLOCK_B, BLOCK_H, type Box, edgeSegment, fromIso, iso } from "./iso";
import { CUT_AT, type Lane, runPackets } from "./packets";

const A = BLOCK_A;
const B = BLOCK_B;
const H = BLOCK_H;
const pts = (p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(" ");

const TOP = pts([[0, -B - H], [A, -H], [0, B - H], [-A, -H]]);
const LEFT = pts([[-A, -H], [0, B - H], [0, B], [-A, 0]]);
const RIGHT = pts([[0, B - H], [A, -H], [A, 0], [0, B]]);
const GROUND = pts([[0, -B], [A, 0], [0, B], [-A, 0]]);
const RING = pts([[0, -B - 7], [A + 14, 0], [0, B + 7], [-A - 14, 0]]);

/** Glyphs are drawn in the block's top-face plane: local x maps to (1, .5), local y to (-1, .5). */
function Glyph({ kind }: { kind: NodeKind }) {
  switch (kind) {
    case "actor":
      return (
        <>
          <circle cx={0} cy={-3} r={3.2} />
          <path d="M-6.5 7 Q0 -0.5 6.5 7" />
        </>
      );
    case "service":
      return <path d="M-7.5 -5 H7.5 M-7.5 0 H7.5 M-7.5 5 H7.5" />;
    case "queue":
      return <path d="M-8 -6 V6 M-3 -6 V6 M2 -6 V6 M7 -6 V6" />;
    case "db":
      return (
        <>
          <circle r={7.5} />
          <circle r={3.5} />
        </>
      );
    case "external":
      return (
        <>
          <circle r={7.5} />
          <path d="M-7.5 0 H7.5 M0 -7.5 V7.5" />
        </>
      );
    case "client":
      return (
        <>
          <rect x={-5.5} y={-8} width={11} height={16} rx={2} />
          <path d="M-2 5 H2" />
        </>
      );
    case "lb":
      return <path d="M-8 0 H-2 M-2 0 L7 -6 M-2 0 H7 M-2 0 L7 6" />;
    case "cache":
      return <path d="M2 -8.5 L-4.5 1 H0.5 L-2 8.5 L4.5 -1 H-0.5 Z" />;
    case "cdn":
      return (
        <>
          <path d="M0 -8 L7 -4 V4 L0 8 L-7 4 V-4 Z" />
          <circle r={2.2} />
        </>
      );
    case "storage":
      return <path d="M-6.5 -5 H6.5 L5 7 H-5 Z M-6.5 -5 Q0 -1.5 6.5 -5 M-6.5 -5 Q0 -8.5 6.5 -5" />;
    case "worker":
      return (
        <>
          <circle r={3.6} />
          <path d="M0 -8.5 V-5.5 M0 5.5 V8.5 M-8.5 0 H-5.5 M5.5 0 H8.5" />
        </>
      );
  }
}

interface BlockProps {
  node: NodeState;
  label: string;
  dim: boolean;
  animate: boolean;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
}

function Load({ value }: { value: number }) {
  const w = 40;
  const tone = value >= 85 ? " mf-node__load--hot" : value >= 65 ? " mf-node__load--warm" : "";
  return (
    <g className={`mf-node__load${tone}`} transform={`translate(${-w / 2} ${-H - B - 16})`}>
      <rect className="mf-node__load-track" width={w} height={5} />
      <rect className="mf-node__load-bar" width={(w * Math.min(100, value)) / 100} height={5} />
      <text x={w / 2} y={-4} textAnchor="middle">
        {value}%
      </text>
    </g>
  );
}

function Block({ node, label, dim, animate, selected, onPointerDown }: BlockProps) {
  const [gx, gy] = iso(node.at);
  return (
    <motion.g
      className={`mf-node mf-node--${node.kind} mf-node--${node.state}${selected ? " mf-node--selected" : ""}${onPointerDown ? " mf-node--grab" : ""}`}
      onPointerDown={onPointerDown}
      initial={animate ? { opacity: 0, x: gx, y: gy - 20 } : false}
      animate={{ opacity: dim ? 0.38 : 1, x: gx, y: gy }}
      exit={{ opacity: 0, y: gy - 20, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <polygon className="mf-node__shadow" points={GROUND} transform="translate(5 4)" />
      {node.state === "slow" && <polygon className="mf-node__ring" points={RING} />}
      <polygon className="mf-node__left" points={LEFT} />
      <polygon className="mf-node__right" points={RIGHT} />
      <polygon className="mf-node__top" points={TOP} />
      <g className="mf-node__glyph" transform={`matrix(1 0.5 -1 0.5 0 ${-H})`}>
        <Glyph kind={node.kind} />
      </g>
      {node.load !== undefined && node.state !== "down" && <Load value={node.load} />}
      {node.state === "down" && (
        <g className="mf-node__badge" transform={`translate(0 ${-H - B - 13})`}>
          <circle r={8.5} />
          <path d="M-3.2 -3.2 L3.2 3.2 M3.2 -3.2 L-3.2 3.2" />
        </g>
      )}
      <text className="mf-node__label" y={B + 20} textAnchor="middle">
        {label}
      </text>
    </motion.g>
  );
}

export interface SceneProps {
  state: SceneState;
  box: Box;
  labels: Record<string, string>;
  title: string;
  paused: boolean;
  reduced: boolean;
  /** changes on replay so packets and entrances restart */
  runKey: number;
  /** edge whose wire message is shown under the scene */
  active?: string;
  /** editor hooks; when absent the scene is a passive picture */
  edit?: SceneEdit;
}

export interface SceneEdit {
  selected?: string;
  onNodeDown: (id: string, e: React.PointerEvent<SVGGElement>) => void;
  /** pointer position in grid cells (rounded) */
  onStageDown: (cell: [number, number], e: React.PointerEvent<SVGSVGElement>) => void;
  onStageMove: (cell: [number, number], e: React.PointerEvent<SVGSVGElement>) => void;
  onStageUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onEdgeDown?: (id: string) => void;
  selectedEdge?: string;
  /** grid range [min, max] where nodes may stand; drawn as an outline */
  area?: [number, number];
  /** cell under the pointer while placing a node */
  hover?: [number, number] | null;
}

/** Ground diamond spanning cells [x0..x1] × [y0..y1], as an SVG path. */
function groundPath(x0: number, y0: number, x1: number, y1: number): string {
  const pts = [iso([x0 - 0.5, y0 - 0.5]), iso([x1 + 0.5, y0 - 0.5]), iso([x1 + 0.5, y1 + 0.5]), iso([x0 - 0.5, y1 + 0.5])];
  return `M${pts.map((p) => `${p[0]} ${p[1]}`).join(" L")} Z`;
}

function cellOf(svg: SVGSVGElement, e: React.PointerEvent): [number, number] {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return fromIso(p.x, p.y);
}

export function Scene({ state, box, labels, title, paused, reduced, runKey, active, edit }: SceneProps) {
  const layer = useRef<SVGGElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const lanes = useMemo<Lane[]>(() => {
    const edges = Object.values(state.edges);
    return edges.map((e) => {
      const a = state.nodes[e.from]!;
      const b = state.nodes[e.to]!;
      const seg = edgeSegment(a.at, b.at);
      // a reverse edge between the same nodes gets its own lane, offset to the right of travel
      const twin = edges.some((o) => o.from === e.to && o.to === e.from);
      if (twin) {
        const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) || 1;
        const nx = -(seg.y2 - seg.y1) / len;
        const ny = (seg.x2 - seg.x1) / len;
        seg.x1 += nx * 5;
        seg.x2 += nx * 5;
        seg.y1 += ny * 5;
        seg.y2 += ny * 5;
      }
      return { id: e.id, ...seg, flow: e.flow, rate: e.rate, cut: e.cut };
    });
  }, [state]);

  useEffect(() => {
    if (reduced || !layer.current) return;
    return runPackets(layer.current, lanes, () => pausedRef.current);
  }, [lanes, reduced, runKey]);

  const nodes = Object.values(state.nodes).sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]));
  const focus = new Set(state.focus);

  return (
    <svg
      className={`mf-scene${edit ? " mf-scene--edit" : ""}`}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      role="img"
      aria-label={title}
      onPointerDown={edit ? (e) => edit.onStageDown(cellOf(e.currentTarget, e), e) : undefined}
      onPointerMove={edit ? (e) => edit.onStageMove(cellOf(e.currentTarget, e), e) : undefined}
      onPointerUp={edit ? (e) => edit.onStageUp(e) : undefined}
    >
      <defs>
        <pattern id="mf-grid" width={64} height={32} patternUnits="userSpaceOnUse">
          <path d="M0 16 L32 0 L64 16 L32 32 Z" className="mf-grid__cell" />
        </pattern>
        {(["request", "ack", "fail", "retry", "dup"] as const).map((f) => (
          <marker key={f} id={`mf-arrow-${f}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0 1 L9 5 L0 9 z" className={`mf-arrow mf-arrow--${f}`} />
          </marker>
        ))}
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#mf-grid)" className="mf-grid" />
      {edit?.area && <path className="mf-area" d={groundPath(edit.area[0], edit.area[0], edit.area[1], edit.area[1])} />}
      {edit?.hover && <path className="mf-area__hover" d={groundPath(edit.hover[0], edit.hover[1], edit.hover[0], edit.hover[1])} />}

      <g key={`edges-${runKey}`}>
        {lanes.map((l) => {
          const cx = l.x1 + (l.x2 - l.x1) * CUT_AT;
          const cy = l.y1 + (l.y2 - l.y1) * CUT_AT;
          return (
            <g
              key={l.id}
              className={`mf-edge mf-edge--${l.flow}${l.cut ? " mf-edge--cut" : ""}${l.id === active || l.id === edit?.selectedEdge ? " mf-edge--active" : ""}`}
              onPointerDown={
                edit?.onEdgeDown
                  ? (e) => {
                      e.stopPropagation();
                      edit.onEdgeDown!(l.id);
                    }
                  : undefined
              }
            >
              {edit && <path className="mf-edge__hit" d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} />}
              <motion.path
                d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`}
                markerEnd={l.cut ? undefined : `url(#mf-arrow-${l.flow})`}
                initial={runKey > 0 ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {l.cut && (
                <g className="mf-edge__cut" transform={`translate(${cx} ${cy})`}>
                  <circle r={7} />
                  <path d="M-3 -3 L3 3 M3 -3 L-3 3" />
                </g>
              )}
            </g>
          );
        })}
      </g>

      <g ref={layer} className="mf-packets" aria-hidden="true" />

      <AnimatePresence initial={runKey > 0}>
        {nodes.map((n) => (
          <Block
            key={n.id}
            node={n}
            label={labels[n.id] ?? n.id}
            dim={focus.size > 0 && !focus.has(n.id)}
            animate
            selected={edit?.selected === n.id}
            onPointerDown={
              edit
                ? (e) => {
                    e.stopPropagation();
                    edit.onNodeDown(n.id, e);
                  }
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </svg>
  );
}
