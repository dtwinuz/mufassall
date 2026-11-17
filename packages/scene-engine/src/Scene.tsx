import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import type { NodeKind, NodeState, SceneState } from "@mufassall/scene-schema";
import { BLOCK_A, BLOCK_B, BLOCK_H, type Box, edgeSegment, iso } from "./iso";
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
    case "worker":
      return (
        <>
          <circle r={3.6} />
          <path d="M0 -8.5 V-5.5 M0 5.5 V8.5 M-8.5 0 H-5.5 M5.5 0 H8.5" />
        </>
      );
  }
}

function Block({ node, label, dim, animate }: { node: NodeState; label: string; dim: boolean; animate: boolean }) {
  const [gx, gy] = iso(node.at);
  return (
    <motion.g
      className={`mf-node mf-node--${node.kind} mf-node--${node.state}`}
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
}

export function Scene({ state, box, labels, title, paused, reduced, runKey, active }: SceneProps) {
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
    <svg className="mf-scene" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={title}>
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

      <g key={`edges-${runKey}`}>
        {lanes.map((l) => {
          const cx = l.x1 + (l.x2 - l.x1) * CUT_AT;
          const cy = l.y1 + (l.y2 - l.y1) * CUT_AT;
          return (
            <g
              key={l.id}
              className={`mf-edge mf-edge--${l.flow}${l.cut ? " mf-edge--cut" : ""}${l.id === active ? " mf-edge--active" : ""}`}
            >
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
          <Block key={n.id} node={n} label={labels[n.id] ?? n.id} dim={focus.size > 0 && !focus.has(n.id)} animate />
        ))}
      </AnimatePresence>
    </svg>
  );
}
