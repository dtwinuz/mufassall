import type { NodeState } from "./index";

/**
 * Where a node's load bar goes. Above the block is the default; when that spot hits a
 * neighbour's name or block, the bar moves under the node's own name. Pure geometry shared by
 * the renderer (packages/scene-engine Scene.tsx) and the course tests, so both agree.
 * Numbers mirror the renderer: tile 64x32, block half-width 28, depth 14, height 22.
 */
export type LoadSpot = "top" | "bottom";

interface Rect {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

const CHAR = 7.4; // 12px mono label, with a little air
const hit = (a: Rect, b: Rect) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
export const screen = ([x, y]: readonly [number, number]) => [(x - y) * 32, (x + y) * 16] as const;

/** label baseline offset below the node centre */
export const LABEL_Y = 34;
/** load row offset (top-left y of the bar) for each spot */
export const LOAD_Y: Record<LoadSpot, number> = { top: -48, bottom: 44 };

function labelBox(n: NodeState, text: string): Rect {
  const [x, y] = screen(n.at);
  const half = (Math.max(1, text.length) * CHAR) / 2 + 3;
  return { x1: x - half, x2: x + half, y1: y + LABEL_Y - 12, y2: y + LABEL_Y + 4 };
}
function bodyBox(n: NodeState): Rect {
  const [x, y] = screen(n.at);
  return { x1: x - 30, x2: x + 30, y1: y - 38, y2: y + 16 };
}
function loadBox(n: NodeState, spot: LoadSpot): Rect {
  const [x, y] = screen(n.at);
  const top = y + LOAD_Y[spot];
  return { x1: x - 33, x2: x + 33, y1: top - 4, y2: top + 8 };
}

/**
 * Picks a spot per loaded node. `labels` may hold several texts per node (one per language);
 * the widest counts. Also returns the nodes whose bar collides in both spots.
 */
export function loadSpots(
  nodes: readonly NodeState[],
  labels: (id: string) => readonly string[],
): { spots: Record<string, LoadSpot>; blocked: string[] } {
  const widest = (id: string) => labels(id).reduce((a, b) => (b.length > a.length ? b : a), id);
  const obstacles = nodes.map((n) => ({ id: n.id, boxes: [labelBox(n, widest(n.id)), bodyBox(n)] }));
  const spots: Record<string, LoadSpot> = {};
  const blocked: string[] = [];
  const placed: Rect[] = [];
  for (const n of nodes) {
    if (n.load === undefined || n.state === "down") continue;
    const free = (spot: LoadSpot) => {
      const box = loadBox(n, spot);
      const own = spot === "bottom" ? [labelBox(n, widest(n.id))] : [];
      return (
        obstacles.every((o) => o.id === n.id || o.boxes.every((b) => !hit(box, b))) &&
        placed.every((p) => !hit(box, p)) &&
        own.every((b) => !hit(box, b))
      );
    };
    const spot: LoadSpot = free("top") ? "top" : free("bottom") ? "bottom" : "top";
    if (!free(spot)) blocked.push(n.id);
    spots[n.id] = spot;
    placed.push(loadBox(n, spot));
  }
  return { spots, blocked };
}
