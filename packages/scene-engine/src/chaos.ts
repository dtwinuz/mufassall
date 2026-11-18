import type { NodeKind } from "@mufassall/scene-schema";
import { type LabDoc, has } from "./lab";
import type { SimOptions, SimResult } from "./sim";

/**
 * Chaos experiments: one deliberate failure laid over the reader's diagram. The diagram itself is never
 * changed; an experiment produces a broken copy plus sim knobs, and stopping it simply drops the copy.
 * Everything is deterministic, so the same design always breaks the same way.
 */
export type Experiment =
  /** one node is down */
  | { kind: "killNode"; target: string }
  /** every node of a kind is down; caches and CDNs go cold instead (every request falls through) */
  | { kind: "killKind"; node: NodeKind }
  /** one node answers SLOW_FACTOR times slower */
  | { kind: "slowNode"; target: string }
  /** SPIKE_FACTOR times the traffic */
  | { kind: "spike" }
  /** one link loses the network */
  | { kind: "cutLink"; target: string }
  /** every third-party dependency answers SLOW_FACTOR times slower */
  | { kind: "slowExternal" };

export type ExperimentKind = Experiment["kind"];
export const EXPERIMENT_KINDS: readonly ExperimentKind[] = ["killNode", "killKind", "slowNode", "spike", "cutLink", "slowExternal"];
export const SLOW_FACTOR = 10;
export const SPIKE_FACTOR = 10;

const COLD = new Set<NodeKind>(["cache", "cdn"]);
const SOURCE = new Set<NodeKind>(["actor", "client"]);

export interface Applied {
  doc: LabDoc;
  rps: number;
  opts: SimOptions;
  /** nodes the experiment acts on */
  nodes: string[];
  /** links the experiment cuts */
  edges: string[];
  /** how each touched node fails */
  how: "down" | "cold" | "slow" | "spike" | "cut";
}

/** What an experiment can aim at: nodes that do work (not users), links, kinds on the diagram. */
export function nodeTargets(doc: LabDoc): string[] {
  return Object.values(doc.nodes)
    .filter((n) => !SOURCE.has(n.kind))
    .map((n) => n.id);
}
export function linkTargets(doc: LabDoc): string[] {
  return Object.keys(doc.edges);
}
export function kindTargets(doc: LabDoc): NodeKind[] {
  const seen: NodeKind[] = [];
  for (const n of Object.values(doc.nodes)) if (!SOURCE.has(n.kind) && !seen.includes(n.kind)) seen.push(n.kind);
  return seen;
}

/** A ready experiment of a kind, aimed at the busiest sensible target; null if the diagram has nothing to aim at. */
export function defaultExperiment(doc: LabDoc, kind: ExperimentKind, sim?: SimResult): Experiment | null {
  const busy = (ids: string[]) => [...ids].sort((a, b) => (sim?.nodes[b]?.rps ?? 0) - (sim?.nodes[a]?.rps ?? 0))[0];
  switch (kind) {
    case "killNode":
    case "slowNode": {
      const t = busy(nodeTargets(doc));
      return t ? { kind, target: t } : null;
    }
    case "killKind": {
      const kinds = kindTargets(doc);
      // a cache is the classic: everything behind it gets the whole load
      const k = kinds.find((x) => COLD.has(x)) ?? kinds[0];
      return k ? { kind, node: k } : null;
    }
    case "cutLink": {
      const t = [...linkTargets(doc)].sort((a, b) => (sim?.nodes[doc.edges[b]!.to]?.rps ?? 0) - (sim?.nodes[doc.edges[a]!.to]?.rps ?? 0))[0];
      return t ? { kind, target: t } : null;
    }
    case "spike":
    case "slowExternal":
      return { kind };
  }
}

/** Does the experiment still point at something on the diagram (after an edit or undo)? */
export function isValid(doc: LabDoc, exp: Experiment): boolean {
  switch (exp.kind) {
    case "killNode":
    case "slowNode":
      return has(doc.nodes, exp.target);
    case "cutLink":
      return has(doc.edges, exp.target);
    case "killKind":
      return Object.values(doc.nodes).some((n) => n.kind === exp.node);
    default:
      return true;
  }
}

export function applyExperiment(doc: LabDoc, exp: Experiment, rps: number): Applied {
  const down = (ids: string[]): LabDoc => {
    const nodes = { ...doc.nodes };
    for (const id of ids) nodes[id] = { ...nodes[id]!, state: "down" };
    return { ...doc, nodes };
  };
  const slow = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, SLOW_FACTOR]));
  switch (exp.kind) {
    case "killNode": {
      const ids = has(doc.nodes, exp.target) ? [exp.target] : [];
      return { doc: down(ids), rps, opts: {}, nodes: ids, edges: [], how: "down" };
    }
    case "killKind": {
      const ids = Object.values(doc.nodes)
        .filter((n) => n.kind === exp.node)
        .map((n) => n.id);
      if (COLD.has(exp.node)) return { doc, rps, opts: { cold: ids }, nodes: ids, edges: [], how: "cold" };
      return { doc: down(ids), rps, opts: {}, nodes: ids, edges: [], how: "down" };
    }
    case "slowNode": {
      const ids = has(doc.nodes, exp.target) ? [exp.target] : [];
      return { doc, rps, opts: { slow: slow(ids) }, nodes: ids, edges: [], how: "slow" };
    }
    case "slowExternal": {
      const ids = Object.values(doc.nodes)
        .filter((n) => n.kind === "external")
        .map((n) => n.id);
      return { doc, rps, opts: { slow: slow(ids) }, nodes: ids, edges: [], how: "slow" };
    }
    case "spike":
      return { doc, rps: rps * SPIKE_FACTOR, opts: {}, nodes: [], edges: [], how: "spike" };
    case "cutLink": {
      const e = has(doc.edges, exp.target) ? doc.edges[exp.target] : undefined;
      if (!e) return { doc, rps, opts: {}, nodes: [], edges: [], how: "cut" };
      return { doc: { ...doc, edges: { ...doc.edges, [e.id]: { ...e, cut: true } } }, rps, opts: {}, nodes: [], edges: [e.id], how: "cut" };
    }
  }
}

/** The scene under an experiment: slowed nodes drawn slow, on top of the load the model computed. */
export function chaosView(view: LabDoc, applied: Applied): LabDoc {
  if (applied.how !== "slow" && applied.how !== "cold") return view;
  const nodes = { ...view.nodes };
  for (const id of applied.nodes) if (nodes[id] && nodes[id]!.state !== "down") nodes[id] = { ...nodes[id]!, state: "slow" };
  return { ...view, nodes };
}

/** One plain-words line of what broke; the UI turns it into a sentence. */
export type Finding =
  | { type: "down"; id: string; lost: number }
  | { type: "cold"; id: string; through: number }
  | { type: "slow"; id: string; ms: number }
  | { type: "spike"; rps: number }
  | { type: "cut"; edge: string; lost: number }
  | { type: "overload"; id: string; rho: number }
  | { type: "stranded"; id: string; lost: number }
  | { type: "latency"; before: number; after: number }
  | { type: "nothing" };

export interface Report {
  /** errors stay under 0.1% and the strict availability does not drop below 99.9% */
  survived: boolean;
  errorRate: number;
  availability: number;
  findings: Finding[];
}

/** Compare the run under the experiment with the calm run and say, in order of cause, what broke. */
export function explain(applied: Applied, before: SimResult, after: SimResult): Report {
  const out: Finding[] = [];
  const touched = new Set(applied.nodes);
  if (applied.how === "spike") out.push({ type: "spike", rps: applied.rps });
  if (applied.how !== "spike" && applied.nodes.length === 0 && applied.edges.length === 0) out.push({ type: "nothing" });
  for (const id of applied.nodes) {
    const s = after.nodes[id];
    if (!s) continue;
    if (applied.how === "down") out.push({ type: "down", id, lost: s.dropped });
    else if (applied.how === "cold") out.push({ type: "cold", id, through: s.rps });
    else if (applied.how === "slow") out.push({ type: "slow", id, ms: s.ms });
  }
  for (const eid of applied.edges) {
    const from = applied.doc.edges[eid]?.from;
    const lost = from ? Math.max(0, (after.nodes[from]?.dropped ?? 0) - (before.nodes[from]?.dropped ?? 0)) : 0;
    out.push({ type: "cut", edge: eid, lost });
  }
  // the knock-on effects: who is now over capacity, who has nowhere to send
  const hot = after.hot.filter((id) => !(applied.how === "down" && touched.has(id))).sort((a, b) => after.nodes[b]!.rho - after.nodes[a]!.rho);
  for (const id of hot) out.push({ type: "overload", id, rho: after.nodes[id]!.rho });
  const cutFrom = new Set(applied.edges.map((e) => applied.doc.edges[e]?.from));
  for (const [id, s] of Object.entries(after.nodes)) {
    // a cold cache with nothing behind it loses what it used to answer: say so too
    if ((touched.has(id) && applied.how !== "cold") || cutFrom.has(id) || hot.includes(id) || s.dropped <= 0) continue;
    // not down, not over capacity, yet losing more than before: its way onward is gone
    if (applied.doc.nodes[id]?.state === "down" || (before.nodes[id]?.dropped ?? 0) >= s.dropped) continue;
    out.push({ type: "stranded", id, lost: s.dropped });
  }
  if (after.ok > 0 && before.p95 > 0 && after.p95 > before.p95 * 1.5) out.push({ type: "latency", before: before.p95, after: after.p95 });
  return {
    survived: after.errorRate < 0.001 && after.availability >= 0.999,
    errorRate: after.errorRate,
    availability: after.availability,
    findings: out,
  };
}
