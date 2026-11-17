import type { SceneState } from "@mufassall/scene-schema";

/** Screen size of one grid unit in a 2:1 isometric projection. */
export const TILE_W = 64;
export const TILE_H = 32;

/** Block footprint (half diagonals) and height, in screen pixels. */
export const BLOCK_A = 28;
export const BLOCK_B = 14;
export const BLOCK_H = 22;

export function iso([x, y]: readonly [number, number]): [number, number] {
  return [((x - y) * TILE_W) / 2, ((x + y) * TILE_H) / 2];
}

/** Screen point back to the nearest grid cell (inverse of `iso`, rounded). */
export function fromIso(sx: number, sy: number): [number, number] {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
}

/** Fixed view over a grid rectangle, used by the editor so the camera never follows a drag. */
export function gridBounds(min: number, max: number): Box {
  const corners = [iso([min, min]), iso([max, max]), iso([min, max]), iso([max, min])];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x = Math.min(...xs) - 40;
  const y = Math.min(...ys) - 60;
  return { x, y, w: Math.max(...xs) - x + 40, h: Math.max(...ys) - y + 40 };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One viewBox for the whole lesson, so the camera never jumps between steps. */
export function lessonBounds(states: SceneState[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of states) {
    for (const n of Object.values(s.nodes)) {
      const [x, y] = iso(n.at);
      minX = Math.min(minX, x - BLOCK_A);
      maxX = Math.max(maxX, x + BLOCK_A);
      minY = Math.min(minY, y - BLOCK_B - BLOCK_H - 28);
      maxY = Math.max(maxY, y + BLOCK_B + 34);
    }
  }
  if (!Number.isFinite(minX)) return { x: -200, y: -120, w: 400, h: 240 };
  const padX = 72;
  const padY = 24;
  return { x: minX - padX, y: minY - padY, w: maxX - minX + padX * 2, h: maxY - minY + padY * 2 };
}

/** Segment between two ground centres, trimmed so it starts and ends at the block edges. */
export function edgeSegment(a: readonly [number, number], b: readonly [number, number]) {
  const [x1, y1] = iso(a);
  const [x2, y2] = iso(b);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // distance from the centre to the diamond edge along (ux, uy)
  const trim = 1 / (Math.abs(ux) / BLOCK_A + Math.abs(uy) / BLOCK_B) + 6;
  return {
    x1: x1 + ux * trim,
    y1: y1 + uy * trim,
    x2: x2 - ux * trim,
    y2: y2 - uy * trim,
    len: Math.max(0, len - trim * 2),
  };
}
