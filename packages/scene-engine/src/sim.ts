import type { NodeKind } from "@mufassall/scene-schema";
import { type LabDoc, MAX_EDGES, MAX_NODES, freeCell, has, nextId } from "./lab";

/**
 * A small steady-state traffic model for the Lab. Deterministic, no randomness:
 * requests enter at the sources, flow along request edges, and each node is an M/M/1-like
 * server: utilisation rho = arrivals / capacity, time in node = base / (1 - rho).
 * It is a teaching model, not a benchmark; the numbers show direction and scale.
 */

interface KindModel {
  /** requests per second one node of this kind serves */
  cap: number;
  /** service time at no load, ms */
  base: number;
  /** share of arrivals passed on downstream (a cache answers most reads itself) */
  forward: number;
}

export const KIND_MODEL: Record<NodeKind, KindModel> = {
  actor: { cap: Infinity, base: 0, forward: 1 },
  client: { cap: Infinity, base: 0, forward: 1 },
  lb: { cap: 20000, base: 0.5, forward: 1 },
  cdn: { cap: 50000, base: 4, forward: 0.05 },
  cache: { cap: 20000, base: 1, forward: 0.1 },
  service: { cap: 600, base: 20, forward: 1 },
  worker: { cap: 300, base: 30, forward: 1 },
  queue: { cap: 30000, base: 2, forward: 1 },
  db: { cap: 800, base: 8, forward: 1 },
  storage: { cap: 2000, base: 25, forward: 1 },
  external: { cap: 400, base: 120, forward: 1 },
};

const PASSING = new Set(["request", "retry", "dup"]);
/** kinds that can answer a request themselves; anything else must pass it on or it is lost */
const ANSWERS = new Set<NodeKind>(["service", "worker", "db", "storage", "external"]);
const linked = (doc: LabDoc, e: { from: string; to: string }) => has(doc.nodes, e.from) && has(doc.nodes, e.to);
const MAX_RHO = 0.97;

/** What-if knobs on top of the diagram, used by the chaos experiments. */
export interface SimOptions {
  /** service-time multiplier per node id: time per request x f, so one node serves f times fewer per second */
  slow?: Readonly<Record<string, number>>;
  /** cache or CDN ids that answer nothing themselves: every request falls through (a cold cache) */
  cold?: readonly string[];
}

/** The node's model with the what-if knobs applied. */
export function modelOf(kind: NodeKind, id: string, opts: SimOptions = {}): KindModel {
  const m = KIND_MODEL[kind];
  const f = opts.slow && has(opts.slow, id) ? Math.max(1, opts.slow[id]!) : 1;
  const cold = opts.cold?.includes(id) && (kind === "cache" || kind === "cdn");
  return { cap: m.cap / f, base: m.base * f, forward: cold ? 1 : m.forward };
}

export interface NodeSim {
  /** arrivals, requests per second */
  rps: number;
  /** arrivals / capacity; above 1 the node is overloaded */
  rho: number;
  /** requests per second this node drops (overload, down, cut link) */
  dropped: number;
  /** expected time from arrival here to the answer, ms (own time plus downstream) */
  ms: number;
}

export interface SimResult {
  nodes: Record<string, NodeSim>;
  /** requests that entered */
  input: number;
  /** requests answered successfully per second */
  ok: number;
  /** share that failed, 0..1 */
  errorRate: number;
  /** expected latency seen at the sources, ms */
  ms: number;
  /** nodes at or above 100% */
  hot: string[];
  /**
   * strict availability, 0..1: the share of input answered by a path on which no node is down or at 100%+
   * (an overloaded node makes everyone wait, so its requests count as timed out even if some get through)
   */
  availability: number;
  /** the route most requests take: from the busiest source along the heaviest link, until most are answered */
  path: string[];
  /** mean time along `path`, ms: sum of base / (1 - rho) per node */
  pathMs: number;
  /** p95 estimate, ms: pathMs x ln 20 (the 95th percentile of an exponential wait is 3x its mean) */
  p95: number;
}

/** p95 of an exponential wait over its mean */
export const P95_FACTOR = Math.log(20);

/** Traffic split over a node's outgoing request edges, weighted by edge rate. */
function outEdges(doc: LabDoc, id: string, drop: Set<string>) {
  // a rate-0 link is drawn idle (no packets), so it carries nothing in the model either
  return Object.values(doc.edges).filter((e) => e.from === id && PASSING.has(e.flow) && e.rate > 0 && !drop.has(e.id) && linked(doc, e));
}

/** Edges that close a cycle are ignored, so traffic always terminates. */
function backEdges(doc: LabDoc): Set<string> {
  const drop = new Set<string>();
  const state = new Map<string, 1 | 2>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const e of Object.values(doc.edges)) {
      if (e.from !== id || !PASSING.has(e.flow) || !linked(doc, e)) continue;
      const s = state.get(e.to);
      if (s === 1) drop.add(e.id);
      else if (!s) visit(e.to);
    }
    state.set(id, 2);
  };
  for (const id of Object.keys(doc.nodes)) if (!state.has(id)) visit(id);
  return drop;
}

function topoOrder(doc: LabDoc, drop: Set<string>): string[] {
  const indeg = new Map<string, number>(Object.keys(doc.nodes).map((id) => [id, 0]));
  for (const e of Object.values(doc.edges)) {
    if (PASSING.has(e.flow) && e.rate > 0 && !drop.has(e.id) && linked(doc, e)) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const queue = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
  const out: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    for (const e of outEdges(doc, id, drop)) {
      const d = (indeg.get(e.to) ?? 1) - 1;
      indeg.set(e.to, d);
      if (d === 0) queue.push(e.to);
    }
  }
  return out;
}

/** Sources: actors and clients; if there are none, nodes nobody sends to. */
export function sources(doc: LabDoc): string[] {
  const named = Object.values(doc.nodes).filter((n) => n.kind === "actor" || n.kind === "client").map((n) => n.id);
  if (named.length) return named;
  const targets = new Set(Object.values(doc.edges).filter((e) => PASSING.has(e.flow) && linked(doc, e)).map((e) => e.to));
  return Object.keys(doc.nodes).filter((id) => !targets.has(id));
}

export function simulate(doc: LabDoc, inputRps: number, opts: SimOptions = {}): SimResult {
  const drop = backEdges(doc);
  const order = topoOrder(doc, drop);
  const arrivals = new Map<string, number>(order.map((id) => [id, 0]));
  const src = sources(doc);
  const input = Math.max(0, inputRps);
  for (const id of src) arrivals.set(id, input / Math.max(1, src.length));

  const nodes: Record<string, NodeSim> = {};
  let dropped = 0;
  // the strict pass: traffic that has met no down or overloaded node so far, and what of it got answered
  const clean = new Map<string, number>();
  for (const id of src) clean.set(id, input / Math.max(1, src.length));
  let answered = 0;
  // where each node's forwarded traffic went, for the latency pass
  const shares = new Map<string, { to: string; share: number }[]>();

  for (const id of order) {
    const n = doc.nodes[id]!;
    const m = modelOf(n.kind, id, opts);
    const rps = arrivals.get(id) ?? 0;
    let lost = 0;
    let served = rps;
    if (n.state === "down") {
      lost = rps;
      served = 0;
    } else if (rps > m.cap) {
      lost = rps - m.cap;
      served = m.cap;
    }
    const forwarded = served * m.forward;
    const outs = outEdges(doc, id, drop);
    // a balancer skips targets that are down; anything else just sends and fails
    const live = n.kind === "lb" ? outs.filter((e) => doc.nodes[e.to]!.state !== "down") : outs;
    const weight = live.reduce((s, e) => s + e.rate, 0);
    const list: { to: string; share: number }[] = [];
    // nowhere to send it: a server answers, a balancer, queue, cache miss or client with no link loses it
    if (forwarded > 0 && live.length === 0 && !ANSWERS.has(n.kind)) lost += forwarded;
    const rho = Number.isFinite(m.cap) ? rps / m.cap : 0;
    const fine = n.state !== "down" && rho < 1 ? (clean.get(id) ?? 0) : 0;
    answered += fine * (1 - m.forward);
    if (live.length === 0 && ANSWERS.has(n.kind)) answered += fine * m.forward;
    for (const e of live) {
      const part = (forwarded * e.rate) / weight;
      if (e.cut) {
        lost += part;
        continue;
      }
      arrivals.set(e.to, (arrivals.get(e.to) ?? 0) + part);
      clean.set(e.to, (clean.get(e.to) ?? 0) + (fine * m.forward * e.rate) / weight);
      list.push({ to: e.to, share: served > 0 ? part / served : 0 });
    }
    shares.set(id, list);
    dropped += lost;
    nodes[id] = { rps, rho, dropped: lost, ms: 0 };
  }

  // latency, bottom-up: own time under load plus the expected time of what it waits on
  const ownMs = (id: string) => modelOf(doc.nodes[id]!.kind, id, opts).base / (1 - Math.min(nodes[id]!.rho, MAX_RHO));
  for (const id of [...order].reverse()) {
    const own = ownMs(id);
    const down = (shares.get(id) ?? []).reduce((s, x) => s + x.share * (nodes[x.to]?.ms ?? 0), 0);
    nodes[id]!.ms = own + down;
  }

  // nodes cut off by a cycle-break or never reached stay at zero
  for (const id of Object.keys(doc.nodes)) nodes[id] ??= { rps: 0, rho: 0, dropped: 0, ms: 0 };

  // no source at all: nothing can be served
  if (src.length === 0) dropped = input;
  const ok = Math.max(0, input - dropped);
  const ms = ok > 0 && src.length ? src.reduce((s, id) => s + (nodes[id]?.ms ?? 0), 0) / src.length : 0;

  // the main path: a node that answers most of what it gets (a warm cache) ends it, a dead one too
  const path: string[] = [];
  let pathMs = 0;
  let at = src.filter((id) => has(nodes, id)).sort((a, b) => nodes[b]!.rps - nodes[a]!.rps)[0];
  while (at && !path.includes(at)) {
    path.push(at);
    const n = doc.nodes[at]!;
    pathMs += ownMs(at);
    if (n.state === "down" || modelOf(n.kind, at, opts).forward < 0.5) break;
    const outs = outEdges(doc, at, drop).filter((e) => !e.cut && (n.kind !== "lb" || doc.nodes[e.to]!.state !== "down"));
    at = outs.reduce<(typeof outs)[number] | undefined>((best, e) => (!best || e.rate > best.rate ? e : best), undefined)?.to;
  }
  if (ok === 0) pathMs = 0;

  return {
    nodes,
    input,
    ok,
    errorRate: input > 0 ? Math.min(1, dropped / input) : 0,
    ms,
    hot: Object.keys(nodes).filter((id) => nodes[id]!.rho >= 1 && doc.nodes[id]!.state !== "down"),
    availability: input > 0 ? Math.min(1, src.length ? answered / input : 0) : 1,
    path,
    pathMs,
    p95: pathMs * P95_FACTOR,
  };
}

/** The doc as the scene should draw it under simulation: load bars and states from the model. */
export function simView(doc: LabDoc, sim: SimResult): LabDoc {
  const out: LabDoc = { nodes: {}, edges: doc.edges, labels: doc.labels };
  for (const n of Object.values(doc.nodes)) {
    const s = sim.nodes[n.id];
    const capped = KIND_MODEL[n.kind].cap !== Infinity;
    if (!s || !capped || n.state === "down") {
      out.nodes[n.id] = n;
      continue;
    }
    const load = Math.min(100, Math.round(s.rho * 100));
    out.nodes[n.id] = { ...n, load, state: s.rho >= 0.85 ? "slow" : "ok" };
  }
  return out;
}

/** A 30-day month, seconds and minutes. */
export const MONTH_S = 30 * 24 * 3600;
export const MONTH_MIN = 30 * 24 * 60;

/** Minutes a month the service may be failing and still meet `target` (0..1), e.g. 99.9% → 43.2. */
export function errorBudgetMinutes(target: number): number {
  return Math.max(0, 1 - target) * MONTH_MIN;
}

export interface SloTarget {
  /** 0..1, e.g. 0.999 */
  availability: number;
  /** p95 latency, ms */
  p95: number;
}

export interface SloVerdict {
  availabilityOk: boolean;
  latencyOk: boolean;
  ok: boolean;
  /** the month's error budget for the target, minutes */
  budget: number;
  /** minutes a month the design fails at this load, if it stayed like this all month */
  burn: number;
}

export function checkSlo(sim: SimResult, target: SloTarget): SloVerdict {
  const availabilityOk = sim.availability >= target.availability;
  const latencyOk = sim.ok > 0 && sim.p95 <= target.p95;
  return {
    availabilityOk,
    latencyOk,
    ok: availabilityOk && latencyOk,
    budget: errorBudgetMinutes(target.availability),
    burn: (1 - sim.availability) * MONTH_MIN,
  };
}

/**
 * Illustrative monthly unit prices, USD, roughly the shape of public cloud list prices.
 * Not a quote: the point is which parts of a design cost money and how replicas add up.
 */
export interface UnitPrice {
  /** per node (instance, managed node) per month */
  node: number;
  /** per million requests reaching the node */
  perMillion?: number;
  /** per GB served: requests x `kbPerRequest` */
  perGb?: number;
  kbPerRequest?: number;
  /** per GB-month stored, `gbStored` assumed per node */
  perGbStored?: number;
  gbStored?: number;
}

export const UNIT_PRICES: Record<NodeKind, UnitPrice> = {
  actor: { node: 0 },
  client: { node: 0 },
  lb: { node: 20 },
  cdn: { node: 0, perGb: 0.08, kbPerRequest: 20 },
  cache: { node: 100 },
  service: { node: 60 },
  worker: { node: 60 },
  queue: { node: 30, perMillion: 0.4 },
  db: { node: 250 },
  storage: { node: 0, perGbStored: 0.023, gbStored: 1000, perMillion: 0.4 },
  external: { node: 0, perMillion: 2 },
};

export interface CostLine {
  kind: NodeKind;
  count: number;
  /** node price x count */
  fixed: number;
  /** traffic and storage */
  usage: number;
  total: number;
}

export interface CostEstimate {
  lines: CostLine[];
  total: number;
}

/** Monthly cost of the diagram at the traffic of `sim` (requests reaching each node, all month long). */
export function monthlyCost(doc: LabDoc, sim: SimResult): CostEstimate {
  const by = new Map<NodeKind, CostLine>();
  for (const n of Object.values(doc.nodes)) {
    const p = UNIT_PRICES[n.kind];
    const rps = sim.nodes[n.id]?.rps ?? 0;
    const millions = (rps * MONTH_S) / 1e6;
    const gb = (rps * MONTH_S * (p.kbPerRequest ?? 0)) / 1e6;
    const usage = millions * (p.perMillion ?? 0) + gb * (p.perGb ?? 0) + (p.gbStored ?? 0) * (p.perGbStored ?? 0);
    const line = by.get(n.kind) ?? { kind: n.kind, count: 0, fixed: 0, usage: 0, total: 0 };
    line.count += 1;
    line.fixed += p.node;
    line.usage += usage;
    line.total = line.fixed + line.usage;
    by.set(n.kind, line);
  }
  const lines = [...by.values()].filter((l) => l.total > 0).sort((a, b) => b.total - a.total);
  return { lines, total: lines.reduce((s, l) => s + l.total, 0) };
}

/** kinds where one more node means one more paid instance next to the others */
const REPLICABLE = new Set<NodeKind>(["service", "worker", "db", "cache", "queue", "lb"]);

/** A copy of node `id` with the same links in and out, on the nearest free cell; null if there is no room. */
export function addReplica(doc: LabDoc, id: string, label?: string): { doc: LabDoc; id: string } | null {
  const n = doc.nodes[id];
  if (!n || !has(doc.nodes, id) || Object.keys(doc.nodes).length >= MAX_NODES) return null;
  const links = Object.values(doc.edges).filter((e) => e.from === id || e.to === id);
  if (Object.keys(doc.edges).length + links.length > MAX_EDGES) return null;
  const at = freeCell(doc, [n.at[0], n.at[1]]);
  if (!at) return null;
  const nid = nextId(doc.nodes, n.kind);
  const next: LabDoc = {
    nodes: { ...doc.nodes, [nid]: { id: nid, kind: n.kind, at, state: "ok" } },
    edges: { ...doc.edges },
    labels: { ...doc.labels, [nid]: label ?? `${doc.labels[id] ?? id} 2` },
  };
  for (const e of links) {
    const eid = nextId(next.edges, "e");
    next.edges[eid] = { ...e, id: eid, from: e.from === id ? nid : e.from, to: e.to === id ? nid : e.to };
  }
  return { doc: next, id: nid };
}

export interface Tradeoff {
  /** the node that gets a copy */
  target: string;
  doc: LabDoc;
  before: { cost: number; availability: number; p95: number };
  after: { cost: number; availability: number; p95: number };
}

/** "One more of the busiest paid node": what it costs and what it buys, at the same traffic. */
export function replicaTradeoff(doc: LabDoc, rps: number, opts: SimOptions = {}): Tradeoff | null {
  const sim = simulate(doc, rps, opts);
  const target = Object.values(doc.nodes)
    .filter((n) => REPLICABLE.has(n.kind) && n.state !== "down" && (sim.nodes[n.id]?.rho ?? 0) > 0)
    .sort((a, b) => sim.nodes[b.id]!.rho - sim.nodes[a.id]!.rho)[0];
  if (!target) return null;
  const copy = addReplica(doc, target.id);
  if (!copy) return null;
  const after = simulate(copy.doc, rps, opts);
  const sum = (d: LabDoc, s: SimResult) => ({ cost: monthlyCost(d, s).total, availability: s.availability, p95: s.p95 });
  return { target: target.id, doc: copy.doc, before: sum(doc, sim), after: sum(copy.doc, after) };
}
