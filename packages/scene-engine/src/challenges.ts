import type { NodeKind } from "@mufassall/scene-schema";
import { type LabDoc, emptyDoc, has } from "./lab";
import { simulate } from "./sim";

/**
 * Lab challenges: a starting diagram plus rules checked live against the reader's diagram.
 * Rules are graph walks and runs of the traffic model, so they are deterministic and local.
 */
export type Rule =
  /** at `rps`, errors stay under `errors` (0..1) and, if set, latency under `ms` */
  | { kind: "load"; rps: number; errors: number; ms?: number }
  /** at least `min` (and, if set, at most `max`) nodes of a kind */
  | { kind: "count"; node: NodeKind; min: number; max?: number }
  /** every request path from a `from` node to a `to` node passes a `via` node */
  | { kind: "via"; from: NodeKind; to: NodeKind; via: NodeKind }
  /** at `rps`, taking down any single node of a kind keeps errors under `errors` */
  | { kind: "survive"; node: NodeKind; rps: number; errors: number }
  /**
   * a chain of request links whose node kinds read `kinds` in order; a kind may repeat
   * (two services in a row) and load balancers may sit anywhere in between
   */
  | { kind: "path"; kinds: NodeKind[] }
  /** both kinds are on the diagram and no request link goes straight from a `from` node to a `to` node */
  | { kind: "noEdge"; from: NodeKind; to: NodeKind }
  /** a reply line (ack) from one kind to another, e.g. a registry confirming a registration */
  | { kind: "link"; from: NodeKind; to: NodeKind; flow: "ack" };

export interface Challenge {
  id: string;
  /** interview-style scenario: a whole system to design, not one fix */
  interview?: boolean;
  rules: Rule[];
  start: () => LabDoc;
}

const PASSING = new Set(["request", "retry", "dup"]);

function base(): LabDoc {
  const d = emptyDoc();
  // screen right = (x+1, y-1), screen down = (x+1, y+1)
  d.nodes.users = { id: "users", kind: "client", at: [2, 8], state: "ok" };
  d.nodes.api = { id: "api", kind: "service", at: [5, 5], state: "ok" };
  d.nodes.db = { id: "db", kind: "db", at: [8, 2], state: "ok" };
  d.edges.in = { id: "in", from: "users", to: "api", flow: "request", rate: 3, cut: false };
  d.edges.q = { id: "q", from: "api", to: "db", flow: "request", rate: 2, cut: false };
  return d;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "scale-out",
    rules: [
      { kind: "count", node: "lb", min: 1 },
      { kind: "load", rps: 750, errors: 0.01 },
    ],
    start: base,
  },
  {
    id: "spare-the-db",
    rules: [
      { kind: "via", from: "service", to: "db", via: "cache" },
      { kind: "load", rps: 1500, errors: 0.01 },
    ],
    start: base,
  },
  {
    id: "lose-one",
    rules: [
      { kind: "count", node: "service", min: 2 },
      { kind: "survive", node: "service", rps: 700, errors: 0.01 },
    ],
    start: base,
  },
  {
    id: "fast-at-scale",
    rules: [
      { kind: "load", rps: 4000, errors: 0.01, ms: 60 },
    ],
    start: base,
  },
  // interview scenarios: requirements in the brief, numbers worked out on /tools/estimate/
  {
    id: "design-url-shortener",
    interview: true,
    rules: [
      { kind: "via", from: "service", to: "db", via: "cache" },
      { kind: "load", rps: 8000, errors: 0.01, ms: 80 },
      { kind: "survive", node: "service", rps: 8000, errors: 0.01 },
    ],
    start: base,
  },
  {
    id: "design-chat",
    interview: true,
    rules: [
      { kind: "via", from: "service", to: "worker", via: "queue" },
      { kind: "count", node: "worker", min: 2 },
      { kind: "load", rps: 700, errors: 0.01 },
    ],
    start: base,
  },
  {
    id: "design-feed",
    interview: true,
    rules: [
      { kind: "count", node: "cdn", min: 0, max: 0 },
      { kind: "via", from: "service", to: "db", via: "cache" },
      { kind: "load", rps: 1500, errors: 0.01, ms: 80 },
      { kind: "survive", node: "service", rps: 1500, errors: 0.01 },
    ],
    start: base,
  },
];

/** Is there a request path from `a` to `b` that avoids every node of kind `via`? */
function pathAvoiding(doc: LabDoc, a: string, b: string, via: NodeKind): boolean {
  const seen = new Set<string>([a]);
  const stack = [a];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of Object.values(doc.edges)) {
      if (e.from !== id || !PASSING.has(e.flow) || e.cut || seen.has(e.to)) continue;
      const n = doc.nodes[e.to];
      if (!n) continue;
      if (e.to === b) return true;
      if (n.kind === via) continue;
      seen.add(e.to);
      stack.push(e.to);
    }
  }
  return false;
}

function reaches(doc: LabDoc, a: string, b: string): boolean {
  const seen = new Set<string>([a]);
  const stack = [a];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of Object.values(doc.edges)) {
      if (e.from !== id || !PASSING.has(e.flow) || e.cut || seen.has(e.to) || !doc.nodes[e.to]) continue;
      if (e.to === b) return true;
      seen.add(e.to);
      stack.push(e.to);
    }
  }
  return false;
}

/** Structure, not traffic: a cut link still shows the design, so `path` and `noEdge` count it. */
const links = (doc: LabDoc) => Object.values(doc.edges).filter((e) => PASSING.has(e.flow) && has(doc.nodes, e.from) && has(doc.nodes, e.to));

export function hasKindPath(doc: LabDoc, kinds: readonly NodeKind[]): boolean {
  if (kinds.length === 0) return false;
  const out = new Map<string, string[]>();
  for (const e of links(doc)) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  const last = kinds.length - 1;
  // state = (node, index of the kind it stands for); repeats keep the index, so it is a finite walk
  const seen = new Set<string>();
  const stack: [string, number][] = Object.values(doc.nodes)
    .filter((n) => n.kind === kinds[0])
    .map((n) => [n.id, 0]);
  while (stack.length) {
    const [id, i] = stack.pop()!;
    if (i === last) return true;
    const key = `${id}@${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const to of out.get(id) ?? []) {
      const k = doc.nodes[to]!.kind;
      if (k === kinds[i + 1]) stack.push([to, i + 1]);
      else if (k === kinds[i] || k === "lb") stack.push([to, i]);
    }
  }
  return false;
}

export function checkRule(doc: LabDoc, rule: Rule): boolean {
  const of = (k: NodeKind) => Object.values(doc.nodes).filter((n) => n.kind === k);
  switch (rule.kind) {
    case "count":
      return of(rule.node).length >= rule.min && (rule.max === undefined || of(rule.node).length <= rule.max);
    case "load": {
      const r = simulate(doc, rule.rps);
      return r.ok > 0 && r.errorRate < rule.errors && (rule.ms === undefined || r.ms < rule.ms);
    }
    case "via": {
      const froms = of(rule.from);
      const tos = of(rule.to);
      // the rule means something only if the two are actually connected
      const linked = froms.some((f) => tos.some((t) => reaches(doc, f.id, t.id)));
      return linked && froms.every((f) => tos.every((t) => !pathAvoiding(doc, f.id, t.id, rule.via)));
    }
    case "survive": {
      const targets = of(rule.node);
      if (targets.length === 0) return false;
      return targets.every((n) => {
        const broken: LabDoc = { ...doc, nodes: { ...doc.nodes, [n.id]: { ...n, state: "down" } } };
        const r = simulate(broken, rule.rps);
        return r.ok > 0 && r.errorRate < rule.errors;
      });
    }
    case "path":
      return hasKindPath(doc, rule.kinds);
    case "noEdge": {
      if (of(rule.from).length === 0 || of(rule.to).length === 0) return false;
      return !links(doc).some((e) => doc.nodes[e.from]!.kind === rule.from && doc.nodes[e.to]!.kind === rule.to);
    }
    case "link":
      return Object.values(doc.edges).some((e) => e.flow === rule.flow && doc.nodes[e.from]?.kind === rule.from && doc.nodes[e.to]?.kind === rule.to);
  }
}
