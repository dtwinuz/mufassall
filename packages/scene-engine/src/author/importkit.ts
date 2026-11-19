import type { EdgeMode, EdgeState, Flow, NodeKind, NodeState, NodeStatus, StepKind, WireFormat } from "@mufassall/scene-schema";
import { slugify, transliterate } from "./bpmn";
import {
  AUTHOR_LANGS,
  type AuthorLang,
  type Draft,
  type DraftCase,
  type DraftMessage,
  type DraftStep,
  GRID_MAX,
  MAX_CASE_STEPS,
  MAX_CASES,
  MAX_NODES,
  MAX_BASE_STEPS,
  type PerLang,
  blankStep,
  normalize,
} from "./model";
import { hasCyrillic } from "./validation";

/*
 * Shared tail of the text importers (pipeline YAML, Mermaid): a small graph with per-language
 * names and a list of beats becomes a Draft that `checkDraft` accepts. Every block is on the scene
 * from the first step; each beat focuses some blocks and carries one message on one line.
 * Alternative paths (a failure, a rejection, a manual gate) become cases next to the base story.
 */

/** a full workflow: the system caps from model.ts, not the 16-step course limit */
export const IMPORT_MAX_NODES = MAX_NODES;
/** base steps, the recap included */
export const IMPORT_MAX_STEPS = MAX_BASE_STEPS;
export const IMPORT_MAX_CASES = MAX_CASES;
export const IMPORT_MAX_CASE_STEPS = MAX_CASE_STEPS;
/** `checkDraft` wants at least 7 steps */
export const IMPORT_MIN_STEPS = 7;
export const LATTICE = GRID_MAX / 2 + 1; // cells 0, 2, .., 12

export type { PerLang };

export type ImportWarningCode =
  | "include"
  | "extends"
  | "unknownStage"
  | "unknownNeeds"
  | "cycle"
  | "notes"
  | "blocks"
  | "subgraph"
  | "unsupported"
  | "selfLoop"
  | "noLines"
  | "maxNodes"
  | "maxSteps"
  | "translate";

export interface ImportWarning {
  code: ImportWarningCode;
  /** names, a count or a snippet */
  x?: string;
}

export const perLangOf = <T>(f: (l: AuthorLang) => T): PerLang<T> => ({ uz: f("uz"), ru: f("ru"), en: f("en") });

/** `{name}` placeholders; unknown ones stay as written. Linear, no regex over user text. */
export function fillIn(t: string, vars: Record<string, string | number>): string {
  let out = "";
  let i = 0;
  while (i < t.length) {
    const open = t.indexOf("{", i);
    if (open < 0) break;
    const close = t.indexOf("}", open + 1);
    if (close < 0) break;
    const key = t.slice(open + 1, close);
    const v = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : undefined;
    out += t.slice(i, open) + (v === undefined ? t.slice(open, close + 1) : String(v));
    i = close + 1;
  }
  return out + t.slice(i);
}

/** A name for one language: uz and en must stay Latin. */
export const nameIn = (s: string, lang: AuthorLang) => (lang !== "ru" && hasCyrillic(s) ? transliterate(s, lang) : s);
export const clip = (s: string, max: number) => ([...s].length > max ? `${[...s].slice(0, max - 1).join("").trimEnd()}…` : s);
/** Whitespace collapsed to single spaces. */
export function oneLine(s: string): string {
  let out = "";
  let sp = false;
  for (const ch of s) {
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") sp = out.length > 0;
    else {
      if (sp) out += " ";
      out += ch;
      sp = false;
    }
  }
  return out;
}

/** "a, b, c, +2" in a language's own list words. */
export function listIn(names: readonly string[], lang: AuthorLang, max = 4): string {
  const shown = names.slice(0, max).map((n) => nameIn(n, lang));
  return names.length > max ? `${shown.join(", ")}, +${names.length - max}` : shown.join(", ");
}

export function uniqueSlug(base: string, fallback: string, taken: Set<string>): string {
  const stem = slugify(base) || fallback;
  let id = stem;
  for (let k = 2; taken.has(id); k++) id = `${stem.slice(0, 28)}-${k}`;
  taken.add(id);
  return id;
}

/** Name words to a block kind: db/sql/postgres -> db, queue/kafka -> queue, and so on. */
export function kindFromName(name: string): NodeKind | undefined {
  const tokens: string[] = [];
  let cur = "";
  for (const ch of transliterate(name, "en").toLowerCase()) {
    const c = ch.charCodeAt(0);
    if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) cur += ch;
    else if (cur) tokens.push(cur), (cur = "");
  }
  if (cur) tokens.push(cur);
  // whole words, a plural, or a longer word that starts with a long stem (postgresql, databases)
  const has = (...words: string[]) => words.some((w) => tokens.some((t) => t === w || t === `${w}s` || (w.length >= 5 && t.startsWith(w))));
  if (has("db", "sql", "postgres", "pg", "mysql", "mariadb", "mongo", "mongodb", "database", "oracle", "clickhouse", "cassandra", "dynamodb", "elasticsearch", "ledger", "baza")) return "db";
  if (has("redis", "memcached", "cache", "valkey", "kesh")) return "cache";
  if (has("kafka", "rabbitmq", "rabbit", "queue", "amqp", "nats", "sqs", "pubsub", "broker", "topic", "stream", "navbat")) return "queue";
  if (has("bucket", "s3", "minio", "storage", "blob", "artifact", "files", "ombor")) return "storage";
  if (has("cdn")) return "cdn";
  if (has("balancer", "lb", "nginx", "haproxy", "ingress", "proxy")) return "lb";
  if (has("user", "client", "browser", "mobile", "frontend", "customer", "mijoz")) return "client";
  if (has("worker", "cron", "job", "scheduler", "consumer")) return "worker";
  if (has("external", "partner", "bank", "provider", "stripe", "paypal", "tashqi")) return "external";
  return undefined;
}

/* ---------- layout ---------- */

/** Ranks of values squeezed into `0..slots-1`. */
function squeeze(values: number[], slots: number): number[] {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, k) => [v, k]));
  const count = sorted.length;
  return values.map((v) => {
    const k = rank.get(v)!;
    return count > slots ? Math.round((k * (slots - 1)) / (count - 1)) : k;
  });
}

/**
 * Lattice points (0..6 each way, may overflow) -> grid cells two apart. Columns and rows that
 * do not fit are squeezed; collisions take the nearest free spot.
 */
export function layoutCells(points: readonly [number, number][]): [number, number][] {
  const maxX = Math.max(0, ...points.map((p) => p[0]));
  const maxY = Math.max(0, ...points.map((p) => p[1]));
  const xs = maxX >= LATTICE ? squeeze(points.map((p) => p[0]), LATTICE) : points.map((p) => Math.max(0, p[0]));
  const ys = maxY >= LATTICE ? squeeze(points.map((p) => p[1]), LATTICE) : points.map((p) => Math.max(0, p[1]));
  const used = new Set<string>();
  return points.map((_, k) => {
    const x = xs[k]!;
    const y = ys[k]!;
    for (let r = 0; r < LATTICE * 2; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= LATTICE || py >= LATTICE || used.has(`${px},${py}`)) continue;
          used.add(`${px},${py}`);
          return [px * 2, py * 2] as [number, number];
        }
      }
    }
    // more blocks than 49 spots: IMPORT_MAX_NODES (40) keeps this unreachable
    return [x * 2, y * 2] as [number, number];
  });
}

/** Rows for `n` blocks in one column, centred. */
export function centredRows(n: number): number[] {
  const start = Math.max(0, Math.floor((LATTICE - n) / 2));
  return Array.from({ length: n }, (_, k) => start + k);
}

/* ---------- graph -> draft ---------- */

export interface KitNode {
  key: string;
  /** id stem; slugified */
  idBase: string;
  fallbackId: string;
  kind: NodeKind;
  label: PerLang<string>;
  /** lattice point, 0..6 (more is squeezed) */
  at: [number, number];
}

export interface KitEdge {
  key: string;
  from: string;
  to: string;
  idBase?: string;
  flow?: Flow;
  mode?: EdgeMode;
}

export interface KitMessage {
  format: WireFormat;
  head: string;
  body?: string;
  headers?: [string, string][];
}

export interface KitBeat {
  idBase: string;
  kind: StepKind;
  focus: string[];
  exchange?: { edge: string; request: KitMessage; response?: KitMessage };
  states?: Record<string, NodeStatus>;
  /** per edge key */
  edgeChange?: Record<string, Partial<Pick<EdgeState, "flow" | "rate" | "cut">>>;
  text: PerLang<{ title: string; short: string; body: string; watch?: string }>;
}

export interface KitCase {
  idBase: string;
  /** index in `KitInput.beats` of the base beat the case branches after */
  from: number;
  label: PerLang<string>;
  beats: KitBeat[];
}

export interface KitInput {
  slugBase: string;
  fallbackSlug: string;
  title: PerLang<string>;
  summary: PerLang<string>;
  learn: PerLang<string[]>;
  nodes: KitNode[];
  edges: KitEdge[];
  beats: KitBeat[];
  cases?: KitCase[];
  recap: PerLang<{ title: string; short: string; body: string }>;
}

const message = (m: KitMessage): DraftMessage => ({
  format: m.format,
  head: clip(oneLine(m.head), 300) || "-",
  headers: (m.headers ?? []).slice(0, 20).map(([k, v]) => [k.slice(0, 200), v.slice(0, 2000)]),
  body: (m.body ?? "").slice(0, 4000),
});

/** Builds the draft. Base beats beyond IMPORT_MAX_STEPS - 1 and cases beyond the caps are dropped. */
export function buildDraft(input: KitInput): Draft {
  const nodeIds = new Set<string>();
  const idOf = new Map<string, string>();
  for (const n of input.nodes.slice(0, IMPORT_MAX_NODES)) idOf.set(n.key, uniqueSlug(n.idBase, n.fallbackId, nodeIds));
  const kitNodes = input.nodes.filter((n) => idOf.has(n.key));
  const cells = layoutCells(kitNodes.map((n) => n.at));
  const nodes: Record<string, NodeState> = {};
  kitNodes.forEach((n, k) => {
    const id = idOf.get(n.key)!;
    nodes[id] = { id, kind: n.kind, at: cells[k]!, state: "ok" };
  });
  const edgeIds = new Set<string>();
  const edgeOf = new Map<string, string>();
  const edges: Record<string, EdgeState> = {};
  for (const e of input.edges) {
    const from = idOf.get(e.from);
    const to = idOf.get(e.to);
    if (!from || !to || from === to || edgeOf.has(e.key)) continue;
    const id = uniqueSlug(e.idBase || `${from.slice(0, 15)}-${to.slice(0, 15)}`, "line", edgeIds);
    edgeOf.set(e.key, id);
    edges[id] = { id, from, to, flow: e.flow ?? "request", rate: 1, cut: false, ...(e.mode ? { mode: e.mode } : {}) };
  }
  const labels = perLangOf((l) => {
    const o: Record<string, string> = {};
    for (const n of kitNodes) o[idOf.get(n.key)!] = clip(nameIn(oneLine(n.label[l]) || n.idBase, l), 48);
    return o;
  });
  // step ids are unique across the base story and every case
  const stepIds = new Set<string>(["recap"]);
  const fresh = () => ({
    nodes: JSON.parse(JSON.stringify(nodes)) as Record<string, NodeState>,
    edges: JSON.parse(JSON.stringify(edges)) as Record<string, EdgeState>,
  });
  const stepOf = (b: KitBeat): DraftStep => {
    const s = blankStep(uniqueSlug(b.idBase, "step", stepIds), b.kind);
    const f = fresh();
    for (const [k, st] of Object.entries(b.states ?? {})) {
      const id = idOf.get(k);
      if (id && f.nodes[id]) f.nodes[id]!.state = st;
    }
    for (const [k, ch] of Object.entries(b.edgeChange ?? {})) {
      const id = edgeOf.get(k);
      if (id && f.edges[id]) Object.assign(f.edges[id]!, ch);
    }
    s.nodes = f.nodes;
    s.edges = f.edges;
    s.focus = [...new Set(b.focus.map((k) => idOf.get(k)).filter((x): x is string => !!x))];
    const ex = b.exchange;
    const edge = ex ? edgeOf.get(ex.edge) : undefined;
    if (ex && edge) {
      s.exchange = { edge, request: message(ex.request), ...(ex.response ? { response: message(ex.response) } : {}), marks: [], masked: [] };
    }
    for (const l of AUTHOR_LANGS) {
      const t = b.text[l];
      s.text[l].title = clip(nameIn(oneLine(t.title), l), 120);
      s.text[l].short = clip(nameIn(oneLine(t.short), l), 24);
      s.text[l].body = nameIn(t.body, l).slice(0, 4000);
      if (t.watch) s.text[l].watch = nameIn(t.watch, l).slice(0, 2000);
    }
    return s;
  };
  const steps: DraftStep[] = input.beats.slice(0, IMPORT_MAX_STEPS - 1).map(stepOf);
  const caseIds = new Set<string>();
  const cases: DraftCase[] = [];
  for (const c of input.cases ?? []) {
    if (cases.length >= IMPORT_MAX_CASES) break;
    const from = steps[c.from];
    if (!from || !c.beats.length) continue;
    cases.push({
      id: uniqueSlug(c.idBase, "case", caseIds),
      from: from.id,
      label: perLangOf((l) => clip(nameIn(oneLine(c.label[l]), l), 60)),
      steps: c.beats.slice(0, IMPORT_MAX_CASE_STEPS).map(stepOf),
    });
  }
  const recap = blankStep("recap", "recap");
  Object.assign(recap, fresh());
  for (const l of AUTHOR_LANGS) {
    recap.text[l].title = clip(input.recap[l].title, 120);
    recap.text[l].short = clip(input.recap[l].short, 24);
    recap.text[l].body = nameIn(input.recap[l].body, l).slice(0, 4000);
  }
  steps.push(recap);
  const draft: Draft = {
    v: 2,
    slug: slugify(input.slugBase, 40) || input.fallbackSlug,
    level: "beginner",
    minutes: Math.max(3, Math.min(30, steps.length)),
    title: perLangOf((l) => clip(nameIn(oneLine(input.title[l]), l), 120)),
    summary: perLangOf((l) => nameIn(input.summary[l], l).slice(0, 2000)),
    learn: perLangOf((l) => input.learn[l].slice(0, 12).map((x) => nameIn(x, l).slice(0, 500))),
    labels,
    metrics: [],
    steps,
    cases,
  };
  return normalize(draft);
}
