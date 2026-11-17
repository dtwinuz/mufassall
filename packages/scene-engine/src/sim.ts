import type { NodeKind } from "@mufassall/scene-schema";
import { type LabDoc, has } from "./lab";

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
}

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

export function simulate(doc: LabDoc, inputRps: number): SimResult {
  const drop = backEdges(doc);
  const order = topoOrder(doc, drop);
  const arrivals = new Map<string, number>(order.map((id) => [id, 0]));
  const src = sources(doc);
  const input = Math.max(0, inputRps);
  for (const id of src) arrivals.set(id, input / Math.max(1, src.length));

  const nodes: Record<string, NodeSim> = {};
  let dropped = 0;
  // where each node's forwarded traffic went, for the latency pass
  const shares = new Map<string, { to: string; share: number }[]>();

  for (const id of order) {
    const n = doc.nodes[id]!;
    const m = KIND_MODEL[n.kind];
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
    for (const e of live) {
      const part = (forwarded * e.rate) / weight;
      if (e.cut) {
        lost += part;
        continue;
      }
      arrivals.set(e.to, (arrivals.get(e.to) ?? 0) + part);
      list.push({ to: e.to, share: served > 0 ? part / served : 0 });
    }
    shares.set(id, list);
    dropped += lost;
    const rho = Number.isFinite(m.cap) ? rps / m.cap : 0;
    nodes[id] = { rps, rho, dropped: lost, ms: 0 };
  }

  // latency, bottom-up: own time under load plus the expected time of what it waits on
  for (const id of [...order].reverse()) {
    const n = doc.nodes[id]!;
    const m = KIND_MODEL[n.kind];
    const r = Math.min(nodes[id]!.rho, MAX_RHO);
    const own = m.base / (1 - r);
    const down = (shares.get(id) ?? []).reduce((s, x) => s + x.share * (nodes[x.to]?.ms ?? 0), 0);
    nodes[id]!.ms = own + down;
  }

  // nodes cut off by a cycle-break or never reached stay at zero
  for (const id of Object.keys(doc.nodes)) nodes[id] ??= { rps: 0, rho: 0, dropped: 0, ms: 0 };

  // no source at all: nothing can be served
  if (src.length === 0) dropped = input;
  const ok = Math.max(0, input - dropped);
  const ms = ok > 0 && src.length ? src.reduce((s, id) => s + (nodes[id]?.ms ?? 0), 0) / src.length : 0;
  return {
    nodes,
    input,
    ok,
    errorRate: input > 0 ? Math.min(1, dropped / input) : 0,
    ms,
    hot: Object.keys(nodes).filter((id) => nodes[id]!.rho >= 1 && doc.nodes[id]!.state !== "down"),
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
