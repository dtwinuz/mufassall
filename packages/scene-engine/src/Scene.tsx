import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeKind, NodeState, SceneState } from "@mufassall/scene-schema";
import { LOAD_Y, type LoadSpot, loadSpots } from "@mufassall/scene-schema/layout";
import { BLOCK_A, BLOCK_B, BLOCK_H, type Box, edgeSegment, fromIso, iso } from "./iso";
import { ASYNC_MARK_AT, CUT_AT, type Lane, returnSegment, runPackets } from "./packets";

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
  /** drop in on mount (read once, so later prop changes never replay it) */
  enter: boolean;
  leaving?: boolean;
  selected?: boolean;
  /** where the load bar sits, picked so it clears neighbours' names */
  spot?: LoadSpot;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  /** set in the editor: the node becomes a focusable button */
  onKeyDown?: (e: React.KeyboardEvent<SVGGElement>) => void;
}

/** load bar with its percent to the right: one short row above the block */
const LOAD_ROW = { w: 34, gap: 4, text: 26 };
function Load({ value, spot }: { value: number; spot: LoadSpot }) {
  const { w, gap, text } = LOAD_ROW;
  const y = LOAD_Y[spot];
  const tone = value >= 85 ? " mf-node__load--hot" : value >= 65 ? " mf-node__load--warm" : "";
  return (
    <g className={`mf-node__load${tone}`} transform={`translate(${-(w + gap + text) / 2} ${y})`}>
      <rect className="mf-node__load-track" width={w} height={5} />
      <rect className="mf-node__load-bar" width={(w * Math.min(100, value)) / 100} height={5} />
      <text x={w + gap} y={6}>
        {value}%
      </text>
    </g>
  );
}

function Block({ node, label, dim, enter, leaving, selected, spot, onPointerDown, onKeyDown }: BlockProps) {
  const [gx, gy] = iso(node.at);
  const entering = useRef(enter).current;
  const cls = `mf-node mf-node--${node.kind} mf-node--${node.state}${dim ? " mf-node--dim" : ""}${selected ? " mf-node--selected" : ""}${onPointerDown ? " mf-node--grab" : ""}${leaving ? " mf-node--leaving" : ""}`;
  // position is a CSS transform so moves between steps glide with a plain transition
  return (
    <g
      className={cls}
      style={{ transform: `translate(${gx}px, ${gy}px)` }}
      onPointerDown={onPointerDown}
      // lowercase on purpose: Preact writes SVG props as attributes verbatim, and SVG attributes are case-sensitive
      {...(onKeyDown ? ({ tabindex: 0, role: "button", "aria-label": label, "aria-pressed": !!selected, onKeyDown } as object) : {})}
    >
      <g className={entering ? "mf-node__body mf-node__body--enter" : "mf-node__body"}>
      <polygon className="mf-node__shadow" points={GROUND} transform="translate(5 4)" />
      {node.state === "slow" && <polygon className="mf-node__ring" points={RING} />}
      <polygon className="mf-node__left" points={LEFT} />
      <polygon className="mf-node__right" points={RIGHT} />
      <polygon className="mf-node__top" points={TOP} />
      <g className="mf-node__glyph" transform={`matrix(1 0.5 -1 0.5 0 ${-H})`}>
        <Glyph kind={node.kind} />
      </g>
      {node.load !== undefined && node.state !== "down" && <Load value={node.load} spot={spot ?? "top"} />}
      {node.state === "down" && (
        <g className="mf-node__badge" transform={`translate(0 ${-H - B - 13})`}>
          <circle r={8.5} />
          <path d="M-3.2 -3.2 L3.2 3.2 M3.2 -3.2 L-3.2 3.2" />
        </g>
      )}
      </g>
    </g>
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
  /** render the shared <defs> (default); false when the page renders <SceneDefs /> once */
  defs?: boolean;
}

export interface SceneEdit {
  selected?: string;
  onNodeDown: (id: string, e: React.PointerEvent<SVGGElement>) => void;
  /** pointer position in grid cells (rounded) */
  onStageDown: (cell: [number, number], e: React.PointerEvent<SVGSVGElement>) => void;
  onStageMove: (cell: [number, number], e: React.PointerEvent<SVGSVGElement>) => void;
  onStageUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onEdgeDown?: (id: string) => void;
  /** keyboard on a focused node: select, connect, move */
  onNodeKey?: (id: string, e: React.KeyboardEvent<SVGGElement>) => void;
  /** pointer left the stage (clears the placement preview) */
  onStageLeave?: () => void;
  selectedEdge?: string;
  /** grid range [min, max] where nodes may stand; drawn as an outline */
  area?: [number, number];
  /** cell under the pointer while placing a node */
  hover?: [number, number] | null;
}

/**
 * Shared grid pattern and arrow markers. A page with many scenes renders them once
 * (inside a hidden <svg>) and passes defs={false} to each scene: ids must be unique.
 */
export function SceneDefs() {
  return (
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
  );
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

export function Scene({ state, box, labels, title, paused, reduced, runKey, active, edit, defs = true }: SceneProps) {
  const layer = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // a scene shrunk to a phone keeps its names readable: labels grow as the drawing shrinks
  const [labelScale, setLabelScale] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const k = Math.min(el.clientWidth / box.w, el.clientHeight / box.h);
      if (!(k > 0)) return;
      const v = Math.min(1.45, Math.max(1, 10.5 / (12 * k)));
      setLabelScale(Math.round(v * 20) / 20);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [box.w, box.h]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const lanes = useMemo<Lane[]>(() => {
    const edges = Object.values(state.edges);
    // one decimal is plenty for a 64px cell and keeps the inline SVG small
    const r1 = (v: number) => Math.round(v * 10) / 10;
    return edges.flatMap((e) => {
      const a = state.nodes[e.from];
      const b = state.nodes[e.to];
      if (!a || !b) return [];
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
      const lane: Lane = { id: e.id, x1: r1(seg.x1), y1: r1(seg.y1), x2: r1(seg.x2), y2: r1(seg.y2), len: seg.len, flow: e.flow, rate: e.rate, cut: e.cut };
      if (e.mode) lane.mode = e.mode;
      if (e.mode === "call") lane.back = returnSegment(lane);
      return [lane];
    });
  }, [state]);

  // restart packets only when the wiring really changes, not on every new state object
  // (a load or status change, e.g. the Lab simulation slider, keeps them flowing)
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const laneKey = lanes.map((l) => `${l.id}:${l.x1},${l.y1},${l.x2},${l.y2},${l.flow},${l.rate},${l.cut ? 1 : 0},${l.mode ?? ""}`).join("|");
  useEffect(() => {
    if (reduced || !layer.current) return;
    return runPackets(layer.current, lanesRef.current, () => pausedRef.current);
  }, [laneKey, reduced, runKey]);

  // nodes that left in this step fade out briefly instead of vanishing
  const prevNodes = useRef(state.nodes);
  const [ghosts, setGhosts] = useState<NodeState[]>([]);
  const ghostTimer = useRef(0);
  useEffect(() => {
    const gone = Object.values(prevNodes.current).filter((n) => !state.nodes[n.id]);
    prevNodes.current = state.nodes;
    if (gone.length === 0 || reduced) return;
    setGhosts(gone);
    // the timer lives outside the effect: a re-render that removes nothing must not cancel it
    window.clearTimeout(ghostTimer.current);
    ghostTimer.current = window.setTimeout(() => setGhosts([]), 280);
  }, [state.nodes, reduced]);
  useEffect(() => () => window.clearTimeout(ghostTimer.current), []);

  const nodes = Object.values(state.nodes).sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]));
  const { spots } = useMemo(() => loadSpots(nodes, (id) => [labels[id] ?? id]), [state.nodes, labels]);
  const focus = new Set(state.focus);

  return (
    <svg
      ref={svgRef}
      style={labelScale !== 1 ? ({ "--mf-ls": String(labelScale) } as Record<string, string>) : undefined}
      className={`mf-scene${edit ? " mf-scene--edit" : ""}`}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      role={edit ? "application" : "img"}
      aria-label={title}
      onPointerDown={edit ? (e) => edit.onStageDown(cellOf(e.currentTarget, e), e) : undefined}
      onPointerMove={edit ? (e) => edit.onStageMove(cellOf(e.currentTarget, e), e) : undefined}
      onPointerUp={edit ? (e) => edit.onStageUp(e) : undefined}
      onPointerCancel={edit ? (e) => edit.onStageUp(e) : undefined}
      onLostPointerCapture={edit ? (e) => edit.onStageUp(e) : undefined}
      onPointerLeave={edit?.onStageLeave}
    >
      {defs && <SceneDefs />}
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#mf-grid)" className="mf-grid" />
      {edit?.area && <path className="mf-area" d={groundPath(edit.area[0], edit.area[0], edit.area[1], edit.area[1])} />}
      {edit?.hover && <path className="mf-area__hover" d={groundPath(edit.hover[0], edit.hover[1], edit.hover[0], edit.hover[1])} />}

      <g key={`edges-${runKey}`}>
        {lanes.map((l) => {
          const e0 = state.edges[l.id]!;
          const cx = l.x1 + (l.x2 - l.x1) * CUT_AT;
          const cy = l.y1 + (l.y2 - l.y1) * CUT_AT;
          return (
            <g
              key={l.id}
              className={`mf-edge mf-edge--${l.flow}${l.cut ? " mf-edge--cut" : ""}${l.mode ? ` mf-edge--${l.mode}` : ""}${l.id === active || l.id === edit?.selectedEdge ? " mf-edge--active" : ""}`}
              onPointerDown={
                edit?.onEdgeDown
                  ? (e) => {
                      e.stopPropagation();
                      edit.onEdgeDown!(l.id);
                    }
                  : undefined
              }
              // the Lab: a link is reachable by Tab like a node, Enter or Space selects it
              {...(edit?.onEdgeDown
                ? {
                    tabindex: 0,
                    role: "button",
                    "aria-label": `${labels[e0.from] ?? e0.from} → ${labels[e0.to] ?? e0.to}`,
                    "aria-pressed": l.id === edit.selectedEdge,
                    onKeyDown: (ev: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                      if (ev.key !== "Enter" && ev.key !== " ") return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      edit.onEdgeDown!(l.id);
                    },
                  }
                : {})}
            >
              {edit && <path className="mf-edge__hit" d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} />}
              <path
                className={runKey > 0 ? "mf-edge__line mf-edge__line--draw" : "mf-edge__line"}
                d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`}
                markerEnd={l.cut ? undefined : `url(#mf-arrow-${l.flow})`}
              />
              {/* the reply of a call returns beside its request; a cut call never gets one */}
              {l.back && !l.cut && (
                <path
                  className={runKey > 0 ? "mf-edge__return mf-edge__line--draw" : "mf-edge__return"}
                  d={`M${l.back.x1} ${l.back.y1} L${l.back.x2} ${l.back.y2}`}
                  markerEnd={`url(#mf-arrow-${l.flow})`}
                />
              )}
              {l.mode === "async" && (
                <g
                  className="mf-edge__async"
                  transform={`translate(${Math.round((l.x1 + (l.x2 - l.x1) * ASYNC_MARK_AT) * 10) / 10} ${Math.round((l.y1 + (l.y2 - l.y1) * ASYNC_MARK_AT) * 10) / 10})`}
                >
                  {/* a small clock: whatever answer there is comes later */}
                  <circle r={5.5} />
                  <path d="M0 -3 V0 H2.6" />
                </g>
              )}
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

      {ghosts.map((n) => (
        <Block key={`ghost-${n.id}`} node={n} label={labels[n.id] ?? n.id} dim={false} enter={false} leaving />
      ))}
      {nodes.map((n) => (
          <Block
            key={n.id}
            node={n}
            label={labels[n.id] ?? n.id}
            dim={focus.size > 0 && !focus.has(n.id)}
            enter={runKey > 0 || edit !== undefined}
            selected={edit?.selected === n.id}
            spot={spots[n.id]}
            onKeyDown={edit?.onNodeKey ? (e) => edit.onNodeKey!(n.id, e) : undefined}
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
      {/* labels last, so a block drawn later never covers a neighbour's name */}
      <g className="mf-labels" aria-hidden="true">
        {nodes.map((n) => {
          const [gx, gy] = iso(n.at);
          const dim = focus.size > 0 && !focus.has(n.id);
          return (
            <text
              key={n.id}
              className={`mf-node__label${dim ? " mf-node__label--dim" : ""}${runKey > 0 || edit ? " mf-node__label--enter" : ""}`}
              style={{ transform: `translate(${gx}px, ${gy + B + 20}px)` }}
              textAnchor="middle"
            >
              {labels[n.id] ?? n.id}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
