import {
  type EdgeState,
  FLOWS,
  type Flow,
  NODE_KINDS,
  NODE_STATES,
  type NodeKind,
  type NodeState,
  type SceneState,
} from "@mufassall/scene-schema";

/** A diagram the reader builds in the Lab: a scene plus free-text labels. */
export interface LabDoc {
  nodes: Record<string, NodeState>;
  edges: Record<string, EdgeState>;
  labels: Record<string, string>;
}

export const GRID_MIN = 0;
export const GRID_MAX = 12;
export const MAX_NODES = 40;
export const MAX_EDGES = 80;
export const MAX_LABEL = 32;

export const emptyDoc = (): LabDoc => ({ nodes: {}, edges: {}, labels: {} });

export function toScene(doc: LabDoc): SceneState {
  return { nodes: doc.nodes, edges: doc.edges, metrics: {}, focus: [] };
}

export function fromScene(state: SceneState, labels: Record<string, string>): LabDoc {
  const doc = emptyDoc();
  for (const n of Object.values(state.nodes)) {
    doc.nodes[n.id] = { ...n, at: [n.at[0], n.at[1]] };
    doc.labels[n.id] = (labels[n.id] ?? n.id).slice(0, MAX_LABEL);
  }
  for (const e of Object.values(state.edges)) doc.edges[e.id] = { ...e };
  return doc;
}

const inGrid = (v: unknown) => Number.isInteger(v) && (v as number) >= GRID_MIN && (v as number) <= GRID_MAX;
const isId = (v: unknown): v is string => typeof v === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(v);

/** Untrusted input (URL, file, storage) → a valid doc; anything malformed is dropped. */
export function sanitize(raw: unknown): LabDoc {
  const doc = emptyDoc();
  if (!raw || typeof raw !== "object") return doc;
  const r = raw as Partial<Record<keyof LabDoc, Record<string, unknown>>>;
  const taken = new Set<string>();
  for (const [id, v] of Object.entries(r.nodes ?? {}).slice(0, MAX_NODES)) {
    const n = v as Partial<NodeState> | null;
    if (!isId(id) || !n || !NODE_KINDS.includes(n.kind as NodeKind)) continue;
    if (!Array.isArray(n.at) || !inGrid(n.at[0]) || !inGrid(n.at[1])) continue;
    const cell = `${n.at[0]},${n.at[1]}`;
    if (taken.has(cell)) continue;
    taken.add(cell);
    const node: NodeState = {
      id,
      kind: n.kind as NodeKind,
      at: [n.at[0], n.at[1]],
      state: NODE_STATES.includes(n.state as never) ? (n.state as NodeState["state"]) : "ok",
    };
    if (Number.isInteger(n.load) && (n.load as number) >= 0 && (n.load as number) <= 100) node.load = n.load;
    doc.nodes[id] = node;
    const label = (r.labels ?? {})[id];
    doc.labels[id] = (typeof label === "string" && label.trim() ? label : id).slice(0, MAX_LABEL);
  }
  for (const [id, v] of Object.entries(r.edges ?? {}).slice(0, MAX_EDGES)) {
    const e = v as Partial<EdgeState> | null;
    if (!isId(id) || !e || !isId(e.from) || !isId(e.to) || e.from === e.to) continue;
    if (!doc.nodes[e.from] || !doc.nodes[e.to]) continue;
    doc.edges[id] = {
      id,
      from: e.from,
      to: e.to,
      flow: FLOWS.includes(e.flow as Flow) ? (e.flow as Flow) : "request",
      rate: typeof e.rate === "number" && e.rate >= 0 && e.rate <= 12 ? e.rate : 1,
      cut: e.cut === true,
    };
  }
  return doc;
}

/** Compact JSON → base64url, for the `#d=` share link. */
export function encodeDoc(doc: LabDoc): string {
  const compact = {
    n: Object.values(doc.nodes).map((n) => [n.id, n.kind, n.at[0], n.at[1], n.state, n.load ?? -1, doc.labels[n.id] ?? n.id]),
    e: Object.values(doc.edges).map((e) => [e.id, e.from, e.to, e.flow, e.rate, e.cut ? 1 : 0]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDoc(code: string): LabDoc {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const c = JSON.parse(json) as { n?: unknown[][]; e?: unknown[][] };
    const raw = { nodes: {} as Record<string, unknown>, edges: {} as Record<string, unknown>, labels: {} as Record<string, unknown> };
    for (const [id, kind, x, y, state, load, label] of c.n ?? []) {
      raw.nodes[String(id)] = { kind, at: [x, y], state, load: load === -1 ? undefined : load };
      raw.labels[String(id)] = label;
    }
    for (const [id, from, to, flow, rate, cut] of c.e ?? []) raw.edges[String(id)] = { from, to, flow, rate, cut: cut === 1 };
    return sanitize(raw);
  } catch {
    return emptyDoc();
  }
}

/** The diagram as a lesson step patch, ready to paste into a lesson.ts. */
export function toLessonCode(doc: LabDoc): string {
  const q = (s: string) => (/^[a-z][a-z0-9]*$/.test(s) ? s : JSON.stringify(s));
  const nodes = Object.values(doc.nodes).map((n) => {
    const extra = `${n.state !== "ok" ? `, state: "${n.state}"` : ""}${n.load !== undefined ? `, load: ${n.load}` : ""}`;
    return `    ${q(n.id)}: { kind: "${n.kind}", at: [${n.at[0]}, ${n.at[1]}]${extra} },`;
  });
  const edges = Object.values(doc.edges).map((e) => {
    const extra = `${e.flow !== "request" ? `, flow: "${e.flow}"` : ""}${e.rate !== 1 ? `, rate: ${e.rate}` : ""}${e.cut ? ", cut: true" : ""}`;
    return `    ${q(e.id)}: { from: "${e.from}", to: "${e.to}"${extra} },`;
  });
  const labels = Object.values(doc.nodes).map((n) => `    ${q(n.id)}: ${JSON.stringify(doc.labels[n.id] ?? n.id)},`);
  return [
    "// lesson.ts: one step",
    "{",
    '  id: "my-step",',
    '  kind: "case",',
    "  nodes: {",
    ...nodes,
    "  },",
    "  edges: {",
    ...edges,
    "  },",
    "},",
    "",
    "// <lang>.ts: nodes",
    "{",
    ...labels,
    "}",
  ].join("\n");
}

export function cellTaken(doc: LabDoc, at: readonly [number, number], except?: string): boolean {
  return Object.values(doc.nodes).some((n) => n.id !== except && n.at[0] === at[0] && n.at[1] === at[1]);
}

export function freeCell(doc: LabDoc, near: [number, number] = [6, 6]): [number, number] | null {
  for (let r = 0; r <= GRID_MAX; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = near[0] + dx;
        const y = near[1] + dy;
        if (x < GRID_MIN || y < GRID_MIN || x > GRID_MAX || y > GRID_MAX) continue;
        if (!cellTaken(doc, [x, y])) return [x, y];
      }
    }
  }
  return null;
}

export function nextId(existing: Record<string, unknown>, base: string): string {
  const stem = base.replace(/[^a-z0-9-]/g, "") || "n";
  for (let i = 1; ; i++) {
    const id = `${stem}-${i}`;
    if (!(id in existing)) return id;
  }
}
