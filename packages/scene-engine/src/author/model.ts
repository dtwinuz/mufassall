import {
  EDGE_MODES,
  type EdgeMode,
  type EdgePatch,
  type EdgeState,
  FLOWS,
  type Flow,
  LEVELS,
  type LessonInput,
  type LessonText,
  type Level,
  NODE_KINDS,
  NODE_STATES,
  type NodeKind,
  type NodePatch,
  type NodeState,
  type NodeStatus,
  type SceneState,
  STEP_KINDS,
  type StepCheck,
  type StepInput,
  type StepKind,
  type StepText,
  WIRE_FORMATS,
  type WireFormat,
  type WireMessage,
  resolve,
} from "@mufassall/scene-schema";

export const AUTHOR_LANGS = ["uz", "ru", "en"] as const;
export type AuthorLang = (typeof AUTHOR_LANGS)[number];
type PerLang<T> = Record<AuthorLang, T>;

/** Units the course already uses; the player localises these (`UiStrings.units`). */
export const ALLOWED_UNITS = ["", "%", "ms", "s", "min", "/s", "/min", "/h", "/day", "x", "$", "$/mo", "MB", "GB", "TB", "Gbps"] as const;
export const AUTHOR_STORE_KEY = "mufassall:v1:author";
export const GRID_MAX = 12;
export const ID_RE = /^[a-z][a-z0-9-]*$/;

export interface DraftStepText {
  short: string;
  title: string;
  body: string;
  watch: string;
  /** notes keyed by mark name */
  fields: Record<string, string>;
  /** kept from an imported lesson, not edited here */
  check?: StepCheck;
}

export interface DraftMessage {
  format: WireFormat;
  head: string;
  headers: [string, string][];
  body: string;
}

export interface DraftExchange {
  edge: string;
  request: DraftMessage;
  response?: DraftMessage;
  marks: string[];
  masked: string[];
}

/** One step as a full snapshot of the scene; patches are computed only on export. */
export interface DraftStep {
  id: string;
  kind: StepKind;
  nodes: Record<string, NodeState>;
  edges: Record<string, EdgeState>;
  metrics: Record<string, number>;
  focus: string[];
  exchange?: DraftExchange;
  text: PerLang<DraftStepText>;
}

export interface DraftMetric {
  id: string;
  unit: string;
  better: "up" | "down";
  label: PerLang<string>;
}

export interface Draft {
  v: 1;
  slug: string;
  level: Level;
  minutes: number;
  title: PerLang<string>;
  summary: PerLang<string>;
  learn: PerLang<string[]>;
  /** node names, one per node id across the whole lesson */
  labels: PerLang<Record<string, string>>;
  metrics: DraftMetric[];
  steps: DraftStep[];
}

const perLang = <T>(make: () => T): PerLang<T> => ({ uz: make(), ru: make(), en: make() });
export const emptyText = (): DraftStepText => ({ short: "", title: "", body: "", watch: "", fields: {} });
export const emptyMessage = (format: WireFormat = "http"): DraftMessage => ({ format, head: "", headers: [], body: "" });

export function blankStep(id: string, kind: StepKind, from?: DraftStep): DraftStep {
  const base = from ? cloneStep(from) : undefined;
  return {
    id,
    kind,
    nodes: base?.nodes ?? {},
    edges: base?.edges ?? {},
    metrics: base?.metrics ?? {},
    focus: [],
    text: perLang(emptyText),
  };
}

/** A starting point: two blocks, one line, a problem step and the recap. */
export function newDraft(): Draft {
  const first = blankStep("start", "problem");
  first.nodes = {
    client: { id: "client", kind: "client", at: [2, 6], state: "ok" },
    api: { id: "api", kind: "service", at: [6, 6], state: "ok" },
  };
  first.edges = { call: { id: "call", from: "client", to: "api", flow: "request", rate: 2, cut: false } };
  const recap = blankStep("recap", "recap", first);
  return {
    v: 1,
    slug: "my-lesson",
    level: "beginner",
    minutes: 8,
    title: perLang(() => ""),
    summary: perLang(() => ""),
    learn: perLang(() => []),
    labels: { uz: { client: "Mijoz", api: "API" }, ru: { client: "Клиент", api: "API" }, en: { client: "Client", api: "API" } },
    metrics: [],
    steps: [first, recap],
  };
}

export function cloneStep(s: DraftStep): DraftStep {
  return structuredCloneSafe(s);
}

export function cloneDraft(d: Draft): Draft {
  return structuredCloneSafe(d);
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function snapshotOf(s: DraftStep): SceneState {
  return { nodes: s.nodes, edges: s.edges, metrics: s.metrics, focus: s.focus };
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const stem = base.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^[^a-z]+/, "") || "x";
  if (!set.has(stem)) return stem;
  for (let i = 2; ; i++) if (!set.has(`${stem}-${i}`)) return `${stem}-${i}`;
}

const sameAt = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];
const sameNode = (a: NodeState, b: NodeState) =>
  a.kind === b.kind && sameAt(a.at, b.at) && a.state === b.state && a.load === b.load;
const sameEdge = (a: EdgeState, b: EdgeState) =>
  a.from === b.from && a.to === b.to && a.flow === b.flow && a.rate === b.rate && a.cut === b.cut && a.mode === b.mode;

/**
 * Brings snapshots in line with what a patch can express: `resolve` never forgets a metric, a
 * load gauge or an edge mode once set, so they carry forward. Dangling focus and edges go.
 */
export function normalize(d: Draft): Draft {
  const ids = new Set(d.metrics.map((m) => m.id));
  let prev: DraftStep | undefined;
  const steps = d.steps.map((s0) => {
    const s = cloneStep(s0);
    for (const k of Object.keys(s.metrics)) if (!ids.has(k)) delete s.metrics[k];
    for (const e of Object.values(s.edges)) {
      if (!s.nodes[e.from] || !s.nodes[e.to] || e.from === e.to) delete s.edges[e.id];
    }
    if (prev) {
      for (const [k, v] of Object.entries(prev.metrics)) if (s.metrics[k] === undefined) s.metrics[k] = v;
      for (const n of Object.values(s.nodes)) {
        const p = prev.nodes[n.id];
        if (p && p.load !== undefined && n.load === undefined) n.load = p.load;
      }
      for (const e of Object.values(s.edges)) {
        const p = prev.edges[e.id];
        // an edge that was gone (or whose node was removed) in between starts fresh
        if (p && p.mode !== undefined && e.mode === undefined && prev.nodes[e.from] && prev.nodes[e.to]) e.mode = p.mode;
      }
    }
    s.focus = [...new Set(s.focus)].filter((f) => s.nodes[f]);
    prev = s;
    return s;
  });
  return { ...d, steps };
}

function nodePatch(prev: NodeState | undefined, n: NodeState): NodePatch | undefined {
  if (!prev) {
    const p: { -readonly [K in keyof NodePatch]: NodePatch[K] } = { kind: n.kind, at: [n.at[0], n.at[1]] };
    if (n.state !== "ok") p.state = n.state;
    if (n.load !== undefined) p.load = n.load;
    return p;
  }
  const p: { -readonly [K in keyof NodePatch]: NodePatch[K] } = {};
  if (prev.kind !== n.kind) p.kind = n.kind;
  if (!sameAt(prev.at, n.at)) p.at = [n.at[0], n.at[1]];
  if (prev.state !== n.state) p.state = n.state;
  if (n.load !== undefined && prev.load !== n.load) p.load = n.load;
  return Object.keys(p).length ? p : undefined;
}

function edgePatch(prev: EdgeState | undefined, e: EdgeState): EdgePatch | undefined {
  const p: { -readonly [K in keyof EdgePatch]: EdgePatch[K] } = {};
  if (!prev) {
    p.from = e.from;
    p.to = e.to;
    if (e.flow !== "request") p.flow = e.flow;
    if (e.rate !== 1) p.rate = e.rate;
    if (e.cut) p.cut = true;
    if (e.mode !== undefined) p.mode = e.mode;
    return p;
  }
  if (prev.from !== e.from) p.from = e.from;
  if (prev.to !== e.to) p.to = e.to;
  if (prev.flow !== e.flow) p.flow = e.flow;
  if (prev.rate !== e.rate) p.rate = e.rate;
  if (prev.cut !== e.cut) p.cut = e.cut;
  if (e.mode !== undefined && prev.mode !== e.mode) p.mode = e.mode;
  return Object.keys(p).length ? p : undefined;
}

function messageOut(m: DraftMessage): WireMessage {
  return {
    format: m.format,
    head: m.head,
    ...(m.headers.length ? { headers: m.headers.map(([k, v]) => [k, v] as const) } : {}),
    ...(m.body !== "" ? { body: m.body } : {}),
  };
}

export function exchangeOut(x: DraftExchange) {
  return {
    edge: x.edge,
    request: messageOut(x.request),
    ...(x.response ? { response: messageOut(x.response) } : {}),
    ...(x.marks.length ? { marks: [...x.marks] } : {}),
    ...(x.masked.length ? { masked: [...x.masked] } : {}),
  };
}

/** Snapshots → `defineLesson` patches: only what changed against the previous step, `null` for removals. */
export function toPatches(steps: readonly DraftStep[], opts: { dropBadExchange?: boolean } = {}): StepInput[] {
  let prev: DraftStep | undefined;
  return steps.map((s) => {
    const nodes: Record<string, NodePatch | null> = {};
    const edges: Record<string, EdgePatch | null> = {};
    const prevNodes = prev?.nodes ?? {};
    for (const id of Object.keys(prevNodes)) if (!s.nodes[id]) nodes[id] = null;
    for (const n of Object.values(s.nodes)) {
      const p = nodePatch(prevNodes[n.id], n);
      if (p) nodes[n.id] = p;
    }
    // removing a node already removes its edges inside `resolve`
    const prevEdges = Object.fromEntries(
      Object.entries(prev?.edges ?? {}).filter(([, e]) => s.nodes[e.from] && s.nodes[e.to] && nodes[e.from] !== null && nodes[e.to] !== null),
    ) as Record<string, EdgeState>;
    for (const id of Object.keys(prevEdges)) if (!s.edges[id]) edges[id] = null;
    for (const e of Object.values(s.edges)) {
      const p = edgePatch(prevEdges[e.id], e);
      if (p) edges[e.id] = p;
    }
    const metrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(s.metrics)) if (prev?.metrics[k] !== v) metrics[k] = v;

    const out: { -readonly [K in keyof StepInput]: StepInput[K] } = { id: s.id, kind: s.kind };
    if (Object.keys(nodes).length) out.nodes = nodes;
    if (Object.keys(edges).length) out.edges = edges;
    if (Object.keys(metrics).length) out.metrics = metrics;
    if (s.focus.length) out.focus = [...s.focus];
    if (s.exchange && !(opts.dropBadExchange && !s.edges[s.exchange.edge])) out.exchange = exchangeOut(s.exchange);
    prev = s;
    return out;
  });
}

export function toLessonInput(d: Draft, opts: { dropBadExchange?: boolean } = {}): LessonInput {
  return {
    slug: d.slug,
    level: d.level,
    minutes: d.minutes,
    tier: "public",
    metrics: d.metrics.map((m) => ({ id: m.id, unit: m.unit, better: m.better })),
    steps: toPatches(d.steps, opts),
  };
}

/** Every node id that appears in any step, in first-seen order. */
export function allNodeIds(d: Draft): string[] {
  const seen = new Set<string>();
  for (const s of d.steps) for (const id of Object.keys(s.nodes)) seen.add(id);
  return [...seen];
}

export function toStepText(t: DraftStepText, marks: readonly string[]): StepText {
  const out: StepText = { short: t.short, title: t.title, body: t.body };
  if (t.watch.trim()) out.watch = t.watch;
  const fields = Object.fromEntries(marks.filter((m) => t.fields[m]?.trim()).map((m) => [m, t.fields[m]!]));
  if (Object.keys(fields).length) out.fields = fields;
  if (t.check) out.check = t.check;
  return out;
}

export function toLessonText(d: Draft, lang: AuthorLang): LessonText<LessonInput> {
  const nodes = Object.fromEntries(allNodeIds(d).map((id) => [id, d.labels[lang][id] ?? ""]));
  return {
    title: d.title[lang],
    summary: d.summary[lang],
    learn: d.learn[lang].filter((l) => l.trim()),
    nodes,
    metrics: Object.fromEntries(d.metrics.map((m) => [m.id, m.label[lang]])),
    steps: Object.fromEntries(d.steps.map((s) => [s.id, toStepText(s.text[lang], s.exchange?.marks ?? [])])),
  } as LessonText<LessonInput>;
}

function messageIn(m: WireMessage): DraftMessage {
  return { format: m.format, head: m.head, headers: (m.headers ?? []).map(([k, v]) => [k, v]), body: m.body ?? "" };
}

/** A registered lesson → draft. Scenarios are not part of the author mode and are counted, not kept. */
export function fromLesson(
  lesson: LessonInput,
  texts: Partial<Record<AuthorLang, LessonText<LessonInput>>>,
): { draft: Draft; droppedScenarios: number } {
  const states = resolve(lesson);
  const text = (lang: AuthorLang) => texts[lang] ?? texts.en ?? Object.values(texts)[0];
  const steps: DraftStep[] = lesson.steps.map((step, i) => {
    const st = states[i]!;
    const ex = step.exchange;
    return {
      id: step.id,
      kind: step.kind,
      nodes: JSON.parse(JSON.stringify(st.nodes)) as Record<string, NodeState>,
      edges: JSON.parse(JSON.stringify(st.edges)) as Record<string, EdgeState>,
      metrics: { ...st.metrics },
      focus: [...st.focus],
      ...(ex
        ? {
            exchange: {
              edge: ex.edge,
              request: messageIn(ex.request),
              ...(ex.response ? { response: messageIn(ex.response) } : {}),
              marks: [...(ex.marks ?? [])],
              masked: [...(ex.masked ?? [])],
            },
          }
        : {}),
      text: perLangFrom((lang) => {
        const t = (text(lang)?.steps as Record<string, StepText> | undefined)?.[step.id];
        return {
          short: t?.short ?? "",
          title: t?.title ?? "",
          body: t?.body ?? "",
          watch: t?.watch ?? "",
          fields: { ...(t?.fields ?? {}) },
          ...(t?.check ? { check: JSON.parse(JSON.stringify(t.check)) as StepCheck } : {}),
        };
      }),
    };
  });
  const draft: Draft = {
    v: 1,
    slug: lesson.slug,
    level: lesson.level,
    minutes: lesson.minutes,
    title: perLangFrom((l) => text(l)?.title ?? ""),
    summary: perLangFrom((l) => text(l)?.summary ?? ""),
    learn: perLangFrom((l) => [...(text(l)?.learn ?? [])]),
    labels: perLangFrom((l) => ({ ...((text(l)?.nodes ?? {}) as Record<string, string>) })),
    metrics: lesson.metrics.map((m) => ({
      id: m.id,
      unit: m.unit,
      better: m.better,
      label: perLangFrom((l) => (text(l)?.metrics as Record<string, string> | undefined)?.[m.id] ?? ""),
    })),
    steps,
  };
  return { draft: normalize(draft), droppedScenarios: lesson.scenarios?.length ?? 0 };
}

const perLangFrom = <T>(f: (l: AuthorLang) => T): PerLang<T> => ({ uz: f("uz"), ru: f("ru"), en: f("en") });

/* ---------- editing ---------- */

function cellFree(s: DraftStep, at: readonly number[], except: string): boolean {
  return !Object.values(s.nodes).some((n) => n.id !== except && sameAt(n.at, at));
}

/**
 * Applies an edit to step `i`. With `forward`, each changed field also changes in the following
 * steps that still held the old value, stopping at the first step that overrode it: the same
 * thing a patch does when the later steps never mention that field.
 */
export function editStep(d: Draft, i: number, fn: (s: DraftStep) => DraftStep, forward: boolean): Draft {
  const old = d.steps[i];
  if (!old) return d;
  const next = fn(cloneStep(old));
  const steps = d.steps.map((s, j) => (j === i ? next : j > i && forward ? cloneStep(s) : s));
  if (forward) {
    const nodeIds = new Set([...Object.keys(old.nodes), ...Object.keys(next.nodes)]);
    for (const id of nodeIds) {
      const a = old.nodes[id];
      const b = next.nodes[id];
      if (a && b && sameNode(a, b)) continue;
      for (let j = i + 1; j < steps.length; j++) {
        const s = steps[j]!;
        const cur = s.nodes[id];
        if (!a && b) {
          if (cur || !cellFree(s, b.at, id)) break;
          s.nodes[id] = { ...b, at: [b.at[0], b.at[1]] };
        } else if (a && !b) {
          if (!cur || !sameNode(cur, a)) break;
          delete s.nodes[id];
        } else if (a && b && cur) {
          let applied = false;
          const upd: NodeState = { ...cur, at: [cur.at[0], cur.at[1]] };
          if (a.kind !== b.kind && cur.kind === a.kind) ((upd.kind = b.kind), (applied = true));
          if (a.state !== b.state && cur.state === a.state) ((upd.state = b.state), (applied = true));
          if (a.load !== b.load && cur.load === a.load) {
            if (b.load === undefined) delete upd.load;
            else upd.load = b.load;
            applied = true;
          }
          if (!sameAt(a.at, b.at) && sameAt(cur.at, a.at) && cellFree(s, b.at, id)) ((upd.at = [b.at[0], b.at[1]]), (applied = true));
          if (!applied) break;
          s.nodes[id] = upd;
        } else break;
      }
    }
    const edgeIds = new Set([...Object.keys(old.edges), ...Object.keys(next.edges)]);
    for (const id of edgeIds) {
      const a = old.edges[id];
      const b = next.edges[id];
      if (a && b && sameEdge(a, b)) continue;
      for (let j = i + 1; j < steps.length; j++) {
        const s = steps[j]!;
        const cur = s.edges[id];
        if (!a && b) {
          if (cur || !s.nodes[b.from] || !s.nodes[b.to]) break;
          s.edges[id] = { ...b };
        } else if (a && !b) {
          if (!cur || !sameEdge(cur, a)) break;
          delete s.edges[id];
        } else if (a && b && cur) {
          let applied = false;
          const upd: EdgeState = { ...cur };
          for (const f of ["from", "to", "flow", "rate", "cut", "mode"] as const) {
            if (a[f] !== b[f] && cur[f] === a[f]) {
              (upd as unknown as Record<string, unknown>)[f] = b[f];
              applied = true;
            }
          }
          if (upd.mode === undefined) delete upd.mode;
          if (!applied || !s.nodes[upd.from] || !s.nodes[upd.to]) break;
          s.edges[id] = upd;
        } else break;
      }
    }
    for (const m of new Set([...Object.keys(old.metrics), ...Object.keys(next.metrics)])) {
      const a = old.metrics[m];
      const b = next.metrics[m];
      if (a === b) continue;
      for (let j = i + 1; j < steps.length; j++) {
        const s = steps[j]!;
        if (s.metrics[m] !== a) break;
        if (b === undefined) delete s.metrics[m];
        else s.metrics[m] = b;
      }
    }
  }
  return normalize({ ...d, steps });
}

export function renameNode(d: Draft, from: string, to: string): Draft {
  if (from === to || !ID_RE.test(to) || allNodeIds(d).includes(to)) return d;
  const out = cloneDraft(d);
  for (const s of out.steps) {
    const n = s.nodes[from];
    if (n) {
      delete s.nodes[from];
      s.nodes[to] = { ...n, id: to };
    }
    for (const e of Object.values(s.edges)) {
      if (e.from === from) e.from = to;
      if (e.to === from) e.to = to;
    }
    s.focus = s.focus.map((f) => (f === from ? to : f));
  }
  for (const l of AUTHOR_LANGS) {
    const v = out.labels[l][from];
    delete out.labels[l][from];
    if (v !== undefined) out.labels[l][to] = v;
  }
  return out;
}

export function allEdgeIds(d: Draft): string[] {
  const seen = new Set<string>();
  for (const s of d.steps) for (const id of Object.keys(s.edges)) seen.add(id);
  return [...seen];
}

export function renameEdge(d: Draft, from: string, to: string): Draft {
  if (from === to || !ID_RE.test(to) || allEdgeIds(d).includes(to)) return d;
  const out = cloneDraft(d);
  for (const s of out.steps) {
    const e = s.edges[from];
    if (e) {
      delete s.edges[from];
      s.edges[to] = { ...e, id: to };
    }
    if (s.exchange?.edge === from) s.exchange.edge = to;
  }
  return out;
}

export function renameMetric(d: Draft, from: string, to: string): Draft {
  if (from === to || !ID_RE.test(to) || d.metrics.some((m) => m.id === to)) return d;
  const out = cloneDraft(d);
  for (const m of out.metrics) if (m.id === from) m.id = to;
  for (const s of out.steps) {
    if (s.metrics[from] !== undefined) {
      s.metrics[to] = s.metrics[from]!;
      delete s.metrics[from];
    }
  }
  return out;
}

/* ---------- step list ---------- */

export function addStep(d: Draft, after: number): Draft {
  const at = Math.max(0, Math.min(d.steps.length - 1, after));
  const src = d.steps[at];
  const id = uniqueId("step", d.steps.map((s) => s.id));
  const steps = [...d.steps];
  steps.splice(at + 1, 0, blankStep(id, "case", src));
  return normalize({ ...d, steps });
}

export function duplicateStep(d: Draft, i: number): Draft {
  const src = d.steps[i];
  if (!src) return d;
  const copy = cloneStep(src);
  copy.id = uniqueId(src.id, d.steps.map((s) => s.id));
  const steps = [...d.steps];
  steps.splice(i + 1, 0, copy);
  return normalize({ ...d, steps });
}

export function deleteStep(d: Draft, i: number): Draft {
  if (d.steps.length <= 1 || !d.steps[i]) return d;
  return normalize({ ...d, steps: d.steps.filter((_, j) => j !== i) });
}

export function moveStep(d: Draft, i: number, delta: number): Draft {
  const j = i + delta;
  if (!d.steps[i] || j < 0 || j >= d.steps.length) return d;
  const steps = [...d.steps];
  const [s] = steps.splice(i, 1);
  steps.splice(j, 0, s!);
  return normalize({ ...d, steps });
}

/* ---------- untrusted input (file, storage) ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 20000) => (typeof v === "string" ? v.slice(0, max) : "");
const own = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isId = (v: unknown): v is string => typeof v === "string" && v.length <= 48 && ID_RE.test(v);
const inGrid = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= GRID_MAX;

function cleanMessage(v: unknown): DraftMessage {
  const m = isObj(v) ? v : {};
  return {
    format: WIRE_FORMATS.includes(m.format as WireFormat) ? (m.format as WireFormat) : "text",
    head: str(m.head, 500),
    headers: Array.isArray(m.headers)
      ? m.headers
          .filter((h): h is [string, string] => Array.isArray(h) && typeof h[0] === "string" && typeof h[1] === "string")
          .slice(0, 30)
          .map(([k, val]) => [k.slice(0, 200), val.slice(0, 2000)])
      : [],
    body: str(m.body),
  };
}

function cleanText(v: unknown): DraftStepText {
  const t = isObj(v) ? v : {};
  const fields: Record<string, string> = {};
  if (isObj(t.fields)) for (const [k, val] of Object.entries(t.fields).slice(0, 20)) if (typeof val === "string") fields[k.slice(0, 200)] = val.slice(0, 2000);
  const out: DraftStepText = { short: str(t.short, 200), title: str(t.title, 500), body: str(t.body), watch: str(t.watch, 2000), fields };
  const c = t.check;
  if (isObj(c) && typeof c.q === "string" && typeof c.why === "string" && Array.isArray(c.options) && Number.isInteger(c.answer)) {
    const options = c.options.filter((o): o is string => typeof o === "string").slice(0, 4);
    if (options.length >= 2 && (c.answer as number) >= 0 && (c.answer as number) < options.length) {
      out.check = { q: c.q.slice(0, 1000), options, answer: c.answer as number, why: c.why.slice(0, 2000) };
    }
  }
  return out;
}

function cleanLangMap<T>(v: unknown, f: (x: unknown) => T): PerLang<T> {
  const o = isObj(v) ? v : {};
  return perLangFrom((l) => f(own(o, l) ? o[l] : undefined));
}

/** A draft from a file or storage; anything malformed is dropped. `null` if it is not a draft at all. */
export function sanitizeDraft(raw: unknown): Draft | null {
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.steps)) return null;
  const metrics: DraftMetric[] = [];
  for (const m of Array.isArray(raw.metrics) ? raw.metrics.slice(0, 12) : []) {
    if (!isObj(m) || !isId(m.id) || metrics.some((x) => x.id === m.id)) continue;
    metrics.push({
      id: m.id,
      unit: str(m.unit, 16),
      better: m.better === "up" ? "up" : "down",
      label: cleanLangMap(m.label, (x) => str(x, 200)),
    });
  }
  const steps: DraftStep[] = [];
  const stepIds = new Set<string>();
  for (const s of raw.steps.slice(0, 40)) {
    if (!isObj(s)) continue;
    let id = typeof s.id === "string" ? s.id.slice(0, 48) : "step";
    if (stepIds.has(id)) id = uniqueId(id, stepIds);
    stepIds.add(id);
    const nodes: Record<string, NodeState> = {};
    for (const [nid, v] of Object.entries(isObj(s.nodes) ? s.nodes : {}).slice(0, 40)) {
      if (!isId(nid) || !isObj(v) || !NODE_KINDS.includes(v.kind as NodeKind)) continue;
      if (!Array.isArray(v.at) || !inGrid(v.at[0]) || !inGrid(v.at[1])) continue;
      const n: NodeState = {
        id: nid,
        kind: v.kind as NodeKind,
        at: [v.at[0] as number, v.at[1] as number],
        state: NODE_STATES.includes(v.state as NodeStatus) ? (v.state as NodeStatus) : "ok",
      };
      if (Number.isInteger(v.load) && (v.load as number) >= 0 && (v.load as number) <= 100) n.load = v.load as number;
      nodes[nid] = n;
    }
    const edges: Record<string, EdgeState> = {};
    for (const [eid, v] of Object.entries(isObj(s.edges) ? s.edges : {}).slice(0, 80)) {
      if (!isId(eid) || !isObj(v) || !isId(v.from) || !isId(v.to) || !nodes[v.from] || !nodes[v.to] || v.from === v.to) continue;
      const e: EdgeState = {
        id: eid,
        from: v.from,
        to: v.to,
        flow: FLOWS.includes(v.flow as Flow) ? (v.flow as Flow) : "request",
        rate: typeof v.rate === "number" && v.rate >= 0 && v.rate <= 12 ? v.rate : 1,
        cut: v.cut === true,
      };
      if (EDGE_MODES.includes(v.mode as EdgeMode)) e.mode = v.mode as EdgeMode;
      edges[eid] = e;
    }
    const stepMetrics: Record<string, number> = {};
    if (isObj(s.metrics)) {
      for (const m of metrics) {
        const val = own(s.metrics, m.id) ? s.metrics[m.id] : undefined;
        if (typeof val === "number" && Number.isFinite(val)) stepMetrics[m.id] = val;
      }
    }
    let exchange: DraftExchange | undefined;
    if (isObj(s.exchange) && typeof s.exchange.edge === "string") {
      const x = s.exchange;
      const list = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string" && n !== "").slice(0, 20) : []);
      exchange = {
        edge: x.edge as string,
        request: cleanMessage(x.request),
        ...(x.response !== undefined && x.response !== null ? { response: cleanMessage(x.response) } : {}),
        marks: list(x.marks),
        masked: list(x.masked),
      };
    }
    steps.push({
      id,
      kind: STEP_KINDS.includes(s.kind as StepKind) ? (s.kind as StepKind) : "case",
      nodes,
      edges,
      metrics: stepMetrics,
      focus: Array.isArray(s.focus) ? s.focus.filter((f): f is string => typeof f === "string") : [],
      ...(exchange ? { exchange } : {}),
      text: cleanLangMap(s.text, cleanText),
    });
  }
  if (!steps.length) return null;
  const minutes = Number.isInteger(raw.minutes) ? Math.max(1, Math.min(30, raw.minutes as number)) : 8;
  return normalize({
    v: 1,
    slug: str(raw.slug, 48) || "my-lesson",
    level: LEVELS.includes(raw.level as Level) ? (raw.level as Level) : "beginner",
    minutes,
    title: cleanLangMap(raw.title, (x) => str(x, 300)),
    summary: cleanLangMap(raw.summary, (x) => str(x, 2000)),
    learn: cleanLangMap(raw.learn, (x) => (Array.isArray(x) ? x.filter((l): l is string => typeof l === "string").slice(0, 12).map((l) => l.slice(0, 500)) : [])),
    labels: cleanLangMap(raw.labels, (x) => {
      const o: Record<string, string> = {};
      if (isObj(x)) for (const [k, v] of Object.entries(x).slice(0, 80)) if (isId(k) && typeof v === "string") o[k] = v.slice(0, 64);
      return o;
    }),
    metrics,
    steps,
  });
}
