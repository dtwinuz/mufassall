import { type EdgeState, type LessonInput, type NodeKind, NODE_KINDS, type SceneState, resolve } from "@mufassall/scene-schema";
import { type Rule, checkRule } from "./challenges";
import { GRID_MAX, GRID_MIN, type LabDoc, MAX_LABEL, emptyDoc, sanitize } from "./lab";

/**
 * Lesson practice: the reader rebuilds a lesson's final design on an empty Lab canvas.
 * The rubric is derived from the lesson's own scene, so it is deterministic and the lesson's
 * scene always passes it; it is lenient where another design would do as well
 * (extra nodes, repeated kinds, a balancer in between).
 */
export interface PracticeHints {
  /** level 1: which blocks, and how many of each */
  kinds: [NodeKind, number][];
  /** level 2: which kinds talk to which */
  links: [NodeKind, NodeKind][];
  /** level 3: the whole request paths */
  paths: NodeKind[][];
}

export interface Practice {
  rules: Rule[];
  hints: PracticeHints;
  /** the lesson's final scene as a Lab diagram, labels in the language that was passed */
  solution: LabDoc;
}

const ENTRY = new Set<NodeKind>(["client", "actor"]);
const TERMINAL = new Set<NodeKind>(["db", "storage", "external", "queue"]);
/** a reader's app must not talk to these straight away when the lesson puts something in front */
const GUARDED = new Set<NodeKind>(["db", "storage"]);
const MAX_PATHS = 4;
/** DFS budget per lesson: final scenes are small, this only guards against a pathological one */
const MAX_WALK = 20_000;

/** The state after the last step that is not a recap: the design the lesson arrives at. */
export function finalState(lesson: LessonInput): SceneState | null {
  const states = resolve(lesson);
  for (let i = lesson.steps.length - 1; i >= 0; i--) if (lesson.steps[i]!.kind !== "recap") return states[i] ?? null;
  return null;
}

/** Kinds along a walk with consecutive repeats folded: service, service → service. */
export function collapse(kinds: readonly NodeKind[]): NodeKind[] {
  return kinds.filter((k, i) => i === 0 || kinds[i - 1] !== k);
}

const isRequest = (e: EdgeState) => e.flow === "request";

/**
 * Every distinct kind sequence of a request walk from an entry node to a terminal one:
 * a store (db, storage, external, queue) or any block that passes nothing on (a cache that only answers).
 */
export function kindPaths(state: SceneState): NodeKind[][] {
  const out = new Map<string, string[]>();
  for (const e of Object.values(state.edges)) {
    if (!isRequest(e) || !state.nodes[e.from] || !state.nodes[e.to]) continue;
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  }
  const found = new Map<string, NodeKind[]>();
  let budget = MAX_WALK;
  const walk = (id: string, trail: string[]) => {
    if (--budget < 0) return;
    const here = state.nodes[id]!;
    if (trail.length > 1 && (TERMINAL.has(here.kind) || !out.has(id))) {
      const seq = collapse(trail.map((t) => state.nodes[t]!.kind));
      found.set(seq.join(">"), seq);
    }
    for (const to of out.get(id) ?? []) if (!trail.includes(to)) walk(to, [...trail, to]);
  };
  for (const n of Object.values(state.nodes)) if (ENTRY.has(n.kind)) walk(n.id, [n.id]);
  const all = [...found.values()];
  // a walk that reaches further also covers its own beginning
  const kept = all.filter((p) => !all.some((q) => q.length > p.length && p.every((k, i) => q[i] === k)));
  if (kept.length <= MAX_PATHS) return kept;
  const longest = [...kept].sort((a, b) => b.length - a.length).slice(0, MAX_PATHS);
  return kept.filter((p) => longest.includes(p));
}

const ID = /^[a-z][a-z0-9-]{0,31}$/;
function safeIds(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const id of ids) {
    let v = ID.test(id) ? id : id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^[^a-z]+/, "").slice(0, 28) || "n";
    for (let i = 2; used.has(v); i++) v = `${v.slice(0, 28)}-${i}`;
    used.add(v);
    map.set(id, v);
  }
  return map;
}

/** Shift a 1-D coordinate range into the Lab grid, or null if it is wider than the grid. */
function shift(values: number[]): number | null {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi - lo > GRID_MAX - GRID_MIN) return null;
  if (lo < GRID_MIN) return GRID_MIN - lo;
  if (hi > GRID_MAX) return GRID_MAX - hi;
  return 0;
}

/** The scene as a Lab diagram: ids the Lab accepts, everything inside its 13×13 grid. */
export function toSolution(state: SceneState, labels: Record<string, string>): LabDoc | null {
  const nodes = Object.values(state.nodes);
  const dx = shift(nodes.map((n) => n.at[0]));
  const dy = shift(nodes.map((n) => n.at[1]));
  if (dx === null || dy === null || nodes.some((n) => !Number.isInteger(n.at[0]) || !Number.isInteger(n.at[1]))) return null;
  const nid = safeIds(nodes.map((n) => n.id));
  const eid = safeIds(Object.keys(state.edges));
  const doc = emptyDoc();
  for (const n of nodes) {
    const id = nid.get(n.id)!;
    doc.nodes[id] = { id, kind: n.kind, at: [n.at[0] + dx, n.at[1] + dy], state: n.state, ...(n.load === undefined ? {} : { load: n.load }) };
    doc.labels[id] = (labels[n.id] ?? n.id).slice(0, MAX_LABEL);
  }
  for (const e of Object.values(state.edges)) {
    const id = eid.get(e.id)!;
    // only the Lab's own edge fields: newer scene fields must not leak into a Lab doc
    doc.edges[id] = { id, from: nid.get(e.from)!, to: nid.get(e.to)!, flow: e.flow, rate: e.rate, cut: e.cut };
  }
  return sanitize(doc);
}

export function rulesFor(state: SceneState): { rules: Rule[]; hints: PracticeHints } {
  const counts = new Map<NodeKind, number>();
  for (const n of Object.values(state.nodes)) counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
  const kinds = NODE_KINDS.filter((k) => counts.has(k)).map((k): [NodeKind, number] => [k, counts.get(k)!]);
  const paths = kindPaths(state);

  const links: [NodeKind, NodeKind][] = [];
  for (const p of paths)
    for (let i = 1; i < p.length; i++) if (!links.some(([a, b]) => a === p[i - 1] && b === p[i])) links.push([p[i - 1]!, p[i]!]);

  const direct = (a: NodeKind, b: NodeKind) =>
    Object.values(state.edges).some((e) => e.flow !== "ack" && e.flow !== "fail" && state.nodes[e.from]?.kind === a && state.nodes[e.to]?.kind === b);
  const shortcuts: Rule[] = [];
  for (const p of paths) {
    const from = p[0]!;
    const to = p[p.length - 1]!;
    if (!GUARDED.has(to) || direct(from, to)) continue;
    if (!shortcuts.some((r) => r.kind === "noEdge" && r.from === from && r.to === to)) shortcuts.push({ kind: "noEdge", from, to });
  }

  const rules: Rule[] = [
    ...kinds.map(([node, min]): Rule => ({ kind: "count", node, min })),
    ...paths.map((p): Rule => ({ kind: "path", kinds: p })),
    ...shortcuts,
  ];
  return { rules, hints: { kinds, links, paths } };
}

/**
 * The practice task for a lesson, or null when its final scene is too small to rebuild
 * (fewer than 3 blocks, no request path from a client to a store) or does not fit the Lab grid.
 * `labels` are the lesson's node names in one language.
 */
export function practiceFor(lesson: LessonInput, labels: Record<string, string> = {}): Practice | null {
  const state = finalState(lesson);
  if (!state || Object.keys(state.nodes).length < 3) return null;
  const { rules, hints } = rulesFor(state);
  if (hints.paths.length === 0) return null;
  const solution = toSolution(state, labels);
  // never offer a task whose own answer would not pass
  if (!solution || !rules.every((r) => checkRule(solution, r))) return null;
  return { rules, hints, solution };
}

/** How many hint levels there are; the UI opens them one at a time. */
export const HINT_LEVELS = 3;

/** What /<lang>/practice/<slug>.json carries. */
export interface PracticeFile extends Practice {
  slug: string;
  title: string;
}

const isKind = (v: unknown): v is NodeKind => NODE_KINDS.includes(v as NodeKind);
const MAX_RULES = 40;

/** One rule from the network; only the structural kinds practice uses, anything else is dropped. */
function parseRule(raw: unknown): Rule | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  if (r.kind === "count" && isKind(r.node) && Number.isInteger(r.min) && (r.min as number) >= 0 && (r.min as number) <= 40)
    return { kind: "count", node: r.node, min: r.min as number };
  if (r.kind === "path" && Array.isArray(r.kinds) && r.kinds.length >= 2 && r.kinds.length <= 12 && r.kinds.every(isKind))
    return { kind: "path", kinds: [...r.kinds] };
  if (r.kind === "noEdge" && isKind(r.from) && isKind(r.to)) return { kind: "noEdge", from: r.from, to: r.to };
  return null;
}

/** The fetched practice file, checked like any untrusted input; null if it is not usable. */
export function parsePractice(raw: unknown, slug: string): PracticeFile | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object" || r.slug !== slug || typeof r.title !== "string") return null;
  const rules = (Array.isArray(r.rules) ? r.rules : []).slice(0, MAX_RULES).map(parseRule).filter((x): x is Rule => x !== null);
  if (rules.length === 0) return null;
  const h = (r.hints ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, MAX_RULES) : []);
  const hints: PracticeHints = {
    kinds: list(h.kinds).filter((x): x is [NodeKind, number] => Array.isArray(x) && isKind(x[0]) && Number.isInteger(x[1])),
    links: list(h.links).filter((x): x is [NodeKind, NodeKind] => Array.isArray(x) && isKind(x[0]) && isKind(x[1])),
    paths: list(h.paths).filter((x): x is NodeKind[] => Array.isArray(x) && x.length <= 12 && x.every(isKind)),
  };
  return { slug, title: r.title.slice(0, 120), rules, hints, solution: sanitize(r.solution) };
}

/** Slug from `?practice=`; null when absent or not a plain slug. */
export function practiceSlug(search: string): string | null {
  const v = new URLSearchParams(search).get("practice");
  return v && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v) ? v : null;
}

export const PRACTICE_KEY = "mufassall:v1:practice";

/** `{ [slug]: "YYYY-MM-DD" }` with this solve added; a corrupted entry starts over. */
export function recordSolved(raw: string | null, slug: string, day: string): Record<string, string> {
  let prev: Record<string, string> = {};
  try {
    const v = JSON.parse(raw ?? "{}");
    if (v && typeof v === "object" && !Array.isArray(v))
      prev = Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string"));
  } catch {
    /* start over */
  }
  return { ...prev, [slug]: day };
}

/** Local calendar day, without Intl (it differs between server and browser). */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
