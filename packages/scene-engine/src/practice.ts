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
  const i = finalIndex(lesson);
  return i < 0 ? null : (resolve(lesson)[i] ?? null);
}

function finalIndex(lesson: LessonInput): number {
  for (let i = lesson.steps.length - 1; i >= 0; i--) if (lesson.steps[i]!.kind !== "recap") return i;
  return -1;
}

/** Kinds along a walk with consecutive repeats folded: service, service → service. */
export function collapse(kinds: readonly NodeKind[]): NodeKind[] {
  return kinds.filter((k, i) => i === 0 || kinds[i - 1] !== k);
}

const isRequest = (e: EdgeState) => e.flow === "request";

/**
 * Where request walks start. A client or actor that sends something is the natural entry;
 * a design without one (a provider calling you back, a service publishing to a queue,
 * a cluster of peers) starts where requests originate: nodes that send but receive no request.
 * A pure request cycle has no such node, so then every sender is a start.
 */
export function startNodes(state: SceneState, out: ReadonlyMap<string, readonly string[]>): string[] {
  const senders = Object.values(state.nodes).filter((n) => (out.get(n.id)?.length ?? 0) > 0);
  const entries = senders.filter((n) => ENTRY.has(n.kind));
  if (entries.length) return entries.map((n) => n.id);
  const received = new Set([...out.values()].flat());
  const sources = senders.filter((n) => !received.has(n.id));
  return (sources.length ? sources : senders).map((n) => n.id);
}

/**
 * Every distinct kind sequence of a request walk from a start node (see `startNodes`) to a terminal one:
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
  for (const id of startNodes(state, out)) walk(id, [id]);
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

/**
 * One axis of scene coordinates → Lab grid cells. A range that fits is only shifted, so the
 * lesson's layout is kept exactly; a wider (or fractional) one is squeezed, keeping the order of
 * the coordinates and never merging two different ones. Null only if there are more distinct
 * coordinates than grid cells.
 */
export function fitAxis(values: readonly number[]): Map<number, number> | null {
  const span = GRID_MAX - GRID_MIN;
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  if (distinct.length === 0) return new Map();
  if (distinct.length > span + 1) return null;
  const lo = distinct[0]!;
  const hi = distinct[distinct.length - 1]!;
  if (hi - lo <= span && distinct.every(Number.isInteger)) {
    const d = lo < GRID_MIN ? GRID_MIN - lo : hi > GRID_MAX ? GRID_MAX - hi : 0;
    return new Map(distinct.map((v) => [v, v + d]));
  }
  // proportional first (keeps relative distances), ranks if rounding would merge two coordinates
  const scaled = distinct.map((v) => GRID_MIN + Math.round(((v - lo) * span) / (hi - lo || 1)));
  const cells = scaled.every((c, i) => i === 0 || c > scaled[i - 1]!) ? scaled : distinct.map((_, i) => GRID_MIN + i);
  return new Map(distinct.map((v, i) => [v, cells[i]!]));
}

/** The scene as a Lab diagram: ids the Lab accepts, everything inside its 13×13 grid. */
export function toSolution(state: SceneState, labels: Record<string, string>): LabDoc | null {
  const nodes = Object.values(state.nodes);
  const fx = fitAxis(nodes.map((n) => n.at[0]));
  const fy = fitAxis(nodes.map((n) => n.at[1]));
  if (!fx || !fy) return null;
  const nid = safeIds(nodes.map((n) => n.id));
  const eid = safeIds(Object.keys(state.edges));
  const doc = emptyDoc();
  for (const n of nodes) {
    const id = nid.get(n.id)!;
    doc.nodes[id] = { id, kind: n.kind, at: [fx.get(n.at[0])!, fy.get(n.at[1])!], state: n.state, ...(n.load === undefined ? {} : { load: n.load }) };
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

  const acks: Rule[] = [];
  for (const e of Object.values(state.edges)) {
    if (e.flow !== "ack") continue;
    const from = state.nodes[e.from]?.kind;
    const to = state.nodes[e.to]?.kind;
    if (from && to && !acks.some((r) => r.kind === "link" && r.from === from && r.to === to)) acks.push({ kind: "link", from, to, flow: "ack" });
  }

  const rules: Rule[] = [
    ...kinds.map(([node, min]): Rule => ({ kind: "count", node, min })),
    ...paths.map((p): Rule => ({ kind: "path", kinds: p })),
    ...shortcuts,
    ...acks,
  ];
  return { rules, hints: { kinds, links, paths } };
}

/**
 * The practice task for a lesson: built from its final scene, or, if that one cannot be rebuilt
 * (see `explainState`), from the richest other step that can. Null when no step can.
 * `labels` are the lesson's node names in one language.
 */
export function practiceFor(lesson: LessonInput, labels: Record<string, string> = {}): Practice | null {
  for (const state of designStates(lesson)) {
    const { practice } = explainState(state, labels);
    if (practice) return practice;
  }
  return null;
}

/** Fewest rules a task needs to be worth doing; the block counts alone usually reach it. */
export const MIN_RULES = 3;

export type Blocker = "small" | "no path" | "few rules" | "grid" | "fails own rules";

/** The task for one scene state, or null with the guard that stopped it. */
export function explainState(state: SceneState, labels: Record<string, string> = {}): { practice: Practice | null; blocker?: Blocker } {
  if (Object.keys(state.nodes).length < 3) return { practice: null, blocker: "small" };
  const { rules, hints } = rulesFor(state);
  if (hints.paths.length === 0) return { practice: null, blocker: "no path" };
  if (rules.length < MIN_RULES) return { practice: null, blocker: "few rules" };
  const solution = toSolution(state, labels);
  if (!solution || Object.keys(solution.nodes).length !== Object.keys(state.nodes).length) return { practice: null, blocker: "grid" };
  // never offer a task whose own answer would not pass
  if (!rules.every((r) => checkRule(solution, r))) return { practice: null, blocker: "fails own rules" };
  return { practice: { rules, hints, solution } };
}

/**
 * Scene states worth rebuilding, best first: the final design, then the other non-recap steps
 * from the richest down (a lesson may end on a reduced scene, e.g. one zoomed in on a failure).
 */
export function designStates(lesson: LessonInput): SceneState[] {
  const states = resolve(lesson);
  const at = finalIndex(lesson);
  const last = at < 0 ? undefined : states[at];
  const size = (s: SceneState) => Object.keys(s.nodes).length * 100 + Object.keys(s.edges).length;
  const rest = states
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => i !== at && lesson.steps[i]?.kind !== "recap")
    // stable on ties: the later step, being closer to the final design, comes first
    .sort((a, b) => size(b.s) - size(a.s) || b.i - a.i)
    .map(({ s }) => s);
  return last ? [last, ...rest] : rest;
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
  if (r.kind === "link" && isKind(r.from) && isKind(r.to) && r.flow === "ack") return { kind: "link", from: r.from, to: r.to, flow: "ack" };
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
