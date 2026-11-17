import type { EdgeMode, Flow } from "@mufassall/scene-schema";

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Lane extends Segment {
  id: string;
  len: number;
  flow: Flow;
  rate: number;
  cut: boolean;
  mode?: EdgeMode;
  /** call edges: the reply's own track, from the callee back to the caller */
  back?: Segment;
}

/** Where a packet on a cut lane is lost. */
export const CUT_AT = 0.55;
/** How far the dashed reply track of a call runs beside its request line. */
export const RETURN_GAP = 5;
/** Where the async marker sits along the line, from the source. */
export const ASYNC_MARK_AT = 0.16;

/**
 * The reply track of a call: the same line shifted sideways and reversed, a little shorter at
 * both ends so its arrow head does not overlap the request's.
 */
export function returnSegment(s: Segment, gap = RETURN_GAP): Segment {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * gap;
  const ny = (dx / len) * gap;
  const ux = dx / len;
  const uy = dy / len;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const inset = Math.min(6, len / 6);
  return {
    x1: r1(s.x2 + nx - ux * inset),
    y1: r1(s.y2 + ny - uy * inset),
    x2: r1(s.x1 + nx + ux * inset),
    y2: r1(s.y1 + ny + uy * inset),
  };
}

const NS = "http://www.w3.org/2000/svg";
const FADE = 0.6;
/** the callee "works" this long (in travel time) before the reply leaves */
const REPLY_HOLD = 0.25;

interface Packet {
  el: SVGCircleElement;
  lane: Lane;
  /** the track this packet runs on: the lane itself, or its reply track */
  path: Segment;
  reply: boolean;
  t: number;
  dur: number;
  dead: number;
}

/**
 * Drives the travelling packets imperatively (no React state per frame).
 * Returns a stop function. The pool stays small: at most rate x duration packets per lane
 * (twice that on a call lane, whose every request that arrives sends a reply back).
 */
export function runPackets(layer: SVGGElement, lanes: Lane[], isPaused: () => boolean): () => void {
  const live: Packet[] = [];
  const due = new Map<string, number>();
  lanes.forEach((l, i) => due.set(l.id, (i * 0.23) % 0.7));

  const spawn = (lane: Lane, delay = 0, reply = false) => {
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", reply ? "3.2" : lane.flow === "ack" ? "3.4" : "4.4");
    // a reply keeps the request's colour, so the pair reads as one exchange
    el.setAttribute("class", `mf-pkt mf-pkt--${lane.flow}${reply ? " mf-pkt--reply" : ""}`);
    el.setAttribute("opacity", "0");
    layer.appendChild(el);
    const path = reply && lane.back ? lane.back : lane;
    live.push({ el, lane, path, reply, t: -delay, dur: Math.min(2.2, Math.max(0.8, lane.len / 115)), dead: -1 });
  };

  let last = performance.now();
  let raf = 0;

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!isPaused()) {
      for (const lane of lanes) {
        if (lane.rate <= 0) continue;
        let left = (due.get(lane.id) ?? 0) - dt;
        while (left <= 0) {
          spawn(lane);
          if (lane.flow === "dup") spawn(lane, 0.14);
          left += 1 / lane.rate;
        }
        due.set(lane.id, left);
      }

      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i]!;
        if (p.dead >= 0) {
          p.dead += dt;
          p.el.setAttribute("opacity", String(Math.max(0, 1 - p.dead / FADE)));
          p.el.setAttribute("r", String(4.4 + p.dead * 6));
          if (p.dead > FADE) {
            p.el.remove();
            live.splice(i, 1);
          }
          continue;
        }
        p.t += dt / (p.dur * (p.t < 0 ? 0.5 : 1));
        if (p.t < 0) continue;
        const cut = p.lane.cut && !p.reply;
        const stop = cut ? CUT_AT : 1;
        if (p.t >= stop) {
          if (cut) {
            p.dead = 0;
            p.el.setAttribute("class", "mf-pkt mf-pkt--lost");
          } else {
            p.el.remove();
            live.splice(i, 1);
            if (!p.reply && p.lane.mode === "call" && p.lane.back) spawn(p.lane, REPLY_HOLD, true);
          }
          continue;
        }
        const { x1, y1, x2, y2 } = p.path;
        p.el.setAttribute("cx", (x1 + (x2 - x1) * p.t).toFixed(1));
        p.el.setAttribute("cy", (y1 + (y2 - y1) * p.t).toFixed(1));
        p.el.setAttribute("opacity", p.t < 0.06 ? String(p.t / 0.06) : "1");
      }
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    for (const p of live) p.el.remove();
    live.length = 0;
  };
}
