import type { Flow } from "@mufassall/scene-schema";

export interface Lane {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
  flow: Flow;
  rate: number;
  cut: boolean;
}

/** Where a packet on a cut lane is lost. */
export const CUT_AT = 0.55;

const NS = "http://www.w3.org/2000/svg";
const FADE = 0.6;

interface Packet {
  el: SVGCircleElement;
  lane: Lane;
  t: number;
  dur: number;
  dead: number;
}

/**
 * Drives the travelling packets imperatively (no React state per frame).
 * Returns a stop function. The pool stays small: at most rate x duration packets per lane.
 */
export function runPackets(layer: SVGGElement, lanes: Lane[], isPaused: () => boolean): () => void {
  const live: Packet[] = [];
  const due = new Map<string, number>();
  lanes.forEach((l, i) => due.set(l.id, (i * 0.23) % 0.7));

  const spawn = (lane: Lane, delay = 0) => {
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", lane.flow === "ack" ? "3.4" : "4.4");
    el.setAttribute("class", `mf-pkt mf-pkt--${lane.flow}`);
    el.setAttribute("opacity", "0");
    layer.appendChild(el);
    live.push({ el, lane, t: -delay, dur: Math.min(2.2, Math.max(0.8, lane.len / 115)), dead: -1 });
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
        const stop = p.lane.cut ? CUT_AT : 1;
        if (p.t >= stop) {
          if (p.lane.cut) {
            p.dead = 0;
            p.el.setAttribute("class", "mf-pkt mf-pkt--lost");
          } else {
            p.el.remove();
            live.splice(i, 1);
          }
          continue;
        }
        const { x1, y1, x2, y2 } = p.lane;
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
