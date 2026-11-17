// Runtime-free core: no zod here, so the browser bundle stays small.
// Strict structural validation lives in ./validate (build time and tests).

export const NODE_KINDS = ["actor", "service", "queue", "db", "external", "worker"] as const;
export const NODE_STATES = ["ok", "slow", "down"] as const;
export const FLOWS = ["request", "ack", "fail", "retry", "dup"] as const;
export const STEP_KINDS = ["problem", "fix", "case", "recap"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const TIERS = ["public", "internal", "restricted"] as const;

export type NodeKind = (typeof NODE_KINDS)[number];
export type NodeStatus = (typeof NODE_STATES)[number];
export type Flow = (typeof FLOWS)[number];
export type StepKind = (typeof STEP_KINDS)[number];
export type Level = (typeof LEVELS)[number];
export type Tier = (typeof TIERS)[number];

export interface NodePatch {
  kind?: NodeKind;
  at?: readonly [number, number];
  state?: NodeStatus;
}

export interface EdgePatch {
  from?: string;
  to?: string;
  flow?: Flow;
  /** packets per second at 1x speed, 0 = idle line */
  rate?: number;
  /** packets die half way: a lost message */
  cut?: boolean;
}

export interface StepInput {
  id: string;
  kind: StepKind;
  nodes?: Readonly<Record<string, NodePatch | null>>;
  edges?: Readonly<Record<string, EdgePatch | null>>;
  metrics?: Readonly<Record<string, number>>;
  focus?: readonly string[];
}

export interface MetricDef {
  id: string;
  unit: string;
  better: "up" | "down";
}

export interface LessonInput {
  slug: string;
  level: Level;
  minutes: number;
  tier: Tier;
  metrics: readonly MetricDef[];
  steps: readonly StepInput[];
}

/** Identity helper that keeps literal ids, so lesson texts are type-checked against the scene. */
export function defineLesson<const T extends LessonInput>(lesson: T): T {
  return lesson;
}

type Steps<T extends LessonInput> = T["steps"][number];
type KeysOf<S, K extends string> = S extends { [P in K]?: infer R } ? (R extends object ? keyof R : never) : never;

export type StepId<T extends LessonInput> = Steps<T>["id"];
export type NodeId<T extends LessonInput> = Extract<KeysOf<Steps<T>, "nodes">, string>;
export type MetricId<T extends LessonInput> = T["metrics"][number]["id"];

export interface StepText {
  /** timeline label, 1-2 words */
  short: string;
  title: string;
  body: string;
  watch?: string;
}

export interface LessonText<T extends LessonInput> {
  title: string;
  summary: string;
  learn: string[];
  nodes: Record<NodeId<T>, string>;
  metrics: Record<MetricId<T>, string>;
  steps: Record<StepId<T>, StepText>;
}

export interface NodeState {
  id: string;
  kind: NodeKind;
  at: [number, number];
  state: NodeStatus;
}

export interface EdgeState {
  id: string;
  from: string;
  to: string;
  flow: Flow;
  rate: number;
  cut: boolean;
}

export interface SceneState {
  nodes: Record<string, NodeState>;
  edges: Record<string, EdgeState>;
  metrics: Record<string, number>;
  focus: string[];
}

const empty = (): SceneState => ({ nodes: {}, edges: {}, metrics: {}, focus: [] });

function clone(s: SceneState): SceneState {
  return {
    nodes: Object.fromEntries(Object.entries(s.nodes).map(([k, v]) => [k, { ...v, at: [...v.at] as [number, number] }])),
    edges: Object.fromEntries(Object.entries(s.edges).map(([k, v]) => [k, { ...v }])),
    metrics: { ...s.metrics },
    focus: [],
  };
}

/**
 * Folds the step patches into full scene states. Every step only describes what changes
 * (D2 "steps" semantics); this returns the complete state after each step.
 */
export function resolve(input: LessonInput): SceneState[] {
  const lesson = input;
  const metricIds = new Set(lesson.metrics.map((m) => m.id));
  const seen = new Set<string>();
  let cur = empty();

  return lesson.steps.map((step) => {
    const where = `step "${step.id}"`;
    if (seen.has(step.id)) throw new Error(`${where}: duplicate step id`);
    seen.add(step.id);

    const next = clone(cur);

    for (const [key, patch] of Object.entries(step.nodes ?? {})) {
      if (patch === null) {
        if (!next.nodes[key]) throw new Error(`${where}: removes unknown node "${key}"`);
        delete next.nodes[key];
        for (const [eid, e] of Object.entries(next.edges)) {
          if (e.from === key || e.to === key) delete next.edges[eid];
        }
        continue;
      }
      const prev = next.nodes[key];
      if (!prev && (patch.kind === undefined || patch.at === undefined)) {
        throw new Error(`${where}: new node "${key}" needs kind and at`);
      }
      next.nodes[key] = {
        id: key,
        kind: patch.kind ?? prev!.kind,
        at: patch.at ? [patch.at[0], patch.at[1]] : prev!.at,
        state: patch.state ?? prev?.state ?? "ok",
      };
    }

    for (const [key, patch] of Object.entries(step.edges ?? {})) {
      if (patch === null) {
        if (!next.edges[key]) throw new Error(`${where}: removes unknown edge "${key}"`);
        delete next.edges[key];
        continue;
      }
      const prev = next.edges[key];
      if (!prev && (patch.from === undefined || patch.to === undefined)) {
        throw new Error(`${where}: new edge "${key}" needs from and to`);
      }
      next.edges[key] = {
        id: key,
        from: patch.from ?? prev!.from,
        to: patch.to ?? prev!.to,
        flow: patch.flow ?? prev?.flow ?? "request",
        rate: patch.rate ?? prev?.rate ?? 1,
        cut: patch.cut ?? prev?.cut ?? false,
      };
    }

    for (const e of Object.values(next.edges)) {
      for (const end of [e.from, e.to]) {
        if (!next.nodes[end]) throw new Error(`${where}: edge "${e.id}" points to missing node "${end}"`);
      }
    }

    for (const [key, value] of Object.entries(step.metrics ?? {})) {
      if (!metricIds.has(key)) throw new Error(`${where}: unknown metric "${key}"`);
      next.metrics[key] = value;
    }

    for (const f of step.focus ?? []) {
      if (!next.nodes[f]) throw new Error(`${where}: focus on missing node "${f}"`);
    }
    next.focus = [...(step.focus ?? [])];

    cur = next;
    return next;
  });
}

export type Change =
  | { op: "+" | "-"; type: "node"; id: string }
  | { op: "~"; type: "node-state"; id: string; from: NodeStatus; to: NodeStatus }
  | { op: "+" | "-"; type: "edge"; id: string; from: string; to: string }
  | { op: "~"; type: "edge-flow"; id: string; from: string; to: string; was: Flow; now: Flow }
  | { op: "+" | "-"; type: "edge-cut"; id: string; from: string; to: string }
  | { op: "~"; type: "metric"; id: string; was: number | undefined; now: number };

/** What changed between two consecutive states: the source of the "What changed" panel. */
export function diff(prev: SceneState, next: SceneState): Change[] {
  const out: Change[] = [];

  for (const [k, n] of Object.entries(next.nodes)) {
    const p = prev.nodes[k];
    if (!p) out.push({ op: "+", type: "node", id: k });
    else if (p.state !== n.state) out.push({ op: "~", type: "node-state", id: k, from: p.state, to: n.state });
  }
  for (const k of Object.keys(prev.nodes)) {
    if (!next.nodes[k]) out.push({ op: "-", type: "node", id: k });
  }

  for (const [k, e] of Object.entries(next.edges)) {
    const p = prev.edges[k];
    if (!p) {
      out.push({ op: "+", type: "edge", id: k, from: e.from, to: e.to });
      continue;
    }
    if (p.flow !== e.flow) out.push({ op: "~", type: "edge-flow", id: k, from: e.from, to: e.to, was: p.flow, now: e.flow });
    if (p.cut !== e.cut) out.push({ op: e.cut ? "-" : "+", type: "edge-cut", id: k, from: e.from, to: e.to });
  }
  for (const [k, e] of Object.entries(prev.edges)) {
    if (!next.edges[k] && next.nodes[e.from] && next.nodes[e.to]) {
      out.push({ op: "-", type: "edge", id: k, from: e.from, to: e.to });
    }
  }

  for (const [k, v] of Object.entries(next.metrics)) {
    if (prev.metrics[k] !== v) out.push({ op: "~", type: "metric", id: k, was: prev.metrics[k], now: v });
  }

  return out;
}

export const emptyState = empty;
