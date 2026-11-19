import type { NodeKind } from "@mufassall/scene-schema";
import { type LabDoc, has } from "./lab";
import { ANSWERS, KIND_MODEL, PASSING, type SimOptions, backEdges, linked, modelOf, simulate, sources } from "./sim";

/**
 * A seeded discrete-event simulation of the Lab diagram over time. Where `simulate` gives the steady
 * state, this one lets a queue fill during a spike and drain afterwards, a node stall and catch up.
 *
 * Each node with a finite capacity is c parallel servers with exponential service and a bounded FIFO
 * queue; actors and clients pass requests on instantly. Routing follows the same rules as `simulate`:
 * request/retry/dup links weighted by rate, cycle edges ignored, a cache answers its share itself,
 * a balancer skips targets that are down, a cut link or a missing way onward loses the request.
 *
 * Same seed and inputs give byte-identical output.
 */

export type TrafficProfile = "constant" | "spike" | "ramp";
export const TRAFFIC_PROFILES: readonly TrafficProfile[] = ["constant", "spike", "ramp"];

export const DES_MAX_DURATION = 120;
export const DES_MAX_EVENTS = 300_000;
/** waiting requests per node before new arrivals are dropped */
export const DES_QUEUE = 2000;
/** a message queue is built to hold a backlog */
const QUEUE_KIND_FACTOR = 10;

export interface DesFailure {
  node: string;
  /** seconds from the start; the node is down for [from, to) */
  from: number;
  to: number;
}

export interface DesInput {
  profile: TrafficProfile;
  /** base requests per second entering at the sources */
  rps: number;
  /** spike: traffic x factor inside the window; ramp: traffic grows linearly to base x factor at the end */
  factor: number;
  /** seconds, 1..120 */
  duration: number;
  /** spike window, seconds; defaults to the second quarter of the run */
  spikeStart?: number;
  spikeLength?: number;
  seed: number;
  failure?: DesFailure | null;
  /** waiting requests per node (real requests, not simulated ones) */
  maxQueue?: number;
  maxEvents?: number;
  /** force how many real requests one simulated request stands for (default: chosen from the event budget) */
  scale?: number;
  opts?: SimOptions;
}

export interface DesNodeSeries {
  arrivals: number[];
  completed: number[];
  dropped: number[];
  /** waiting (not in service) at the end of each second */
  queue: number[];
  /** time in this node (wait + service) of requests it finished that second, ms; null if none */
  p50: (number | null)[];
  p95: (number | null)[];
}

export interface DesNodeTotals {
  arrivals: number;
  completed: number;
  dropped: number;
  peakQueue: number;
  /** second (index) of the peak */
  peakAt: number;
  /** parallel servers simulated (after scaling) */
  servers: number;
  /** requests per second the node serves, from the model */
  capacity: number;
  queueLimit: number;
  /** time-average requests in the node (waiting + in service): L in Little's law */
  meanInSystem: number;
  /** mean time in the node, ms: W in Little's law */
  meanSojournMs: number;
}

export interface DesResult {
  /** fully simulated seconds (shorter than the duration if truncated) */
  seconds: number;
  /** one simulated request stands for `scale` real ones (1 unless the event budget forced it) */
  scale: number;
  truncated: boolean;
  events: number;
  /** nodes that have servers, in diagram order */
  ids: string[];
  nodes: Record<string, DesNodeSeries>;
  node: Record<string, DesNodeTotals>;
  /** per second: entered, answered, lost, end-to-end latency of answered requests */
  input: number[];
  ok: number[];
  dropped: number[];
  p50: (number | null)[];
  p95: (number | null)[];
  totals: { input: number; ok: number; dropped: number };
}

/** mulberry32: a tiny, fast, well-mixed 32-bit PRNG. Returns [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** traffic multiplier at time t */
export function trafficAt(input: Pick<DesInput, "profile" | "factor" | "duration" | "spikeStart" | "spikeLength">, t: number): number {
  const f = Math.max(0, input.factor);
  if (input.profile === "spike") {
    const { start, length } = spikeWindow(input);
    return t >= start && t < start + length ? f : 1;
  }
  if (input.profile === "ramp") return 1 + (f - 1) * Math.min(1, Math.max(0, t / Math.max(1, input.duration)));
  return 1;
}

export function spikeWindow(input: Pick<DesInput, "duration" | "spikeStart" | "spikeLength">): { start: number; length: number } {
  const d = clampDuration(input.duration);
  const start = Math.min(d, Math.max(0, input.spikeStart ?? Math.round(d / 4)));
  const length = Math.min(d - start, Math.max(0, input.spikeLength ?? Math.round(d / 4)));
  return { start, length };
}

const clampDuration = (d: number) => Math.min(DES_MAX_DURATION, Math.max(1, Math.round(Number.isFinite(d) ? d : 60)));


/** Growable Float64 / Int32 buffers for the request pool. */
class Pool {
  start = new Float64Array(1024); // arrival at the current node
  serve = new Float64Array(1024); // service start at the current node
  lat = new Float64Array(1024); // reported end-to-end latency so far, s
  node = new Int32Array(1024);
  free: number[] = [];
  size = 0;
  alloc(): number {
    const r = this.free.pop();
    if (r !== undefined) return r;
    if (this.size === this.start.length) {
      const grow = <T extends Float64Array | Int32Array>(a: T): T => {
        const b = new (a.constructor as new (n: number) => T)(a.length * 2);
        b.set(a);
        return b;
      };
      this.start = grow(this.start);
      this.serve = grow(this.serve);
      this.lat = grow(this.lat);
      this.node = grow(this.node);
    }
    return this.size++;
  }
}

/** Binary min-heap of request ids keyed by completion time (and two negative ids for the failure). */
class Heap {
  t = new Float64Array(1024);
  id = new Int32Array(1024);
  n = 0;
  push(t: number, id: number) {
    if (this.n === this.t.length) {
      const t2 = new Float64Array(this.n * 2);
      t2.set(this.t);
      const i2 = new Int32Array(this.n * 2);
      i2.set(this.id);
      this.t = t2;
      this.id = i2;
    }
    let i = this.n++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.t[p]! <= t) break;
      this.t[i] = this.t[p]!;
      this.id[i] = this.id[p]!;
      i = p;
    }
    this.t[i] = t;
    this.id[i] = id;
  }
  pop(): number {
    const top = this.id[0]!;
    const last = --this.n;
    const lt = this.t[last]!;
    const li = this.id[last]!;
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= last) break;
      if (c + 1 < last && this.t[c + 1]! < this.t[c]!) c++;
      if (this.t[c]! >= lt) break;
      this.t[i] = this.t[c]!;
      this.id[i] = this.id[c]!;
      i = c;
    }
    this.t[i] = lt;
    this.id[i] = li;
    return top;
  }
}

const FAIL_START = -1;
const FAIL_END = -2;

function percentile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]!;
}
const ms2 = (s: number) => Math.round(s * 100000) / 100;

/** Simulated requests per input request: the expected number of server visits, from the steady model. */
function visitsPerRequest(doc: LabDoc, rps: number, opts: SimOptions): number {
  const input = Math.max(1, rps);
  const s = simulate(doc, input, opts);
  let v = 0;
  for (const n of Object.values(doc.nodes)) if (Number.isFinite(KIND_MODEL[n.kind].cap)) v += s.nodes[n.id]?.rps ?? 0;
  return v / input;
}

export function simulateDes(doc: LabDoc, input: DesInput): DesResult {
  const opts = input.opts ?? {};
  const duration = clampDuration(input.duration);
  const maxEvents = Math.max(1000, Math.min(input.maxEvents ?? DES_MAX_EVENTS, 2_000_000));
  const baseRps = Math.max(0, Number.isFinite(input.rps) ? input.rps : 0);
  const factor = Math.max(0, Number.isFinite(input.factor) ? input.factor : 1);
  const prof = { profile: input.profile, factor, duration, spikeStart: input.spikeStart, spikeLength: input.spikeLength };
  const rand = mulberry32(input.seed);

  // expected requests over the run, to choose a scale that keeps the event count inside the budget
  let meanMult = 1;
  if (input.profile === "spike") meanMult = 1 + ((factor - 1) * spikeWindow(prof).length) / duration;
  else if (input.profile === "ramp") meanMult = (1 + factor) / 2;
  const expectedReq = baseRps * meanMult * duration;
  const expectedEvents = expectedReq * (1 + visitsPerRequest(doc, baseRps * meanMult, opts));
  const scale =
    input.scale !== undefined && input.scale >= 1 ? Math.round(input.scale) : Math.max(1, Math.ceil(expectedEvents / (maxEvents * 0.8)));

  const ids = Object.keys(doc.nodes);
  const N = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const drop = backEdges(doc);
  const kinds = ids.map((id) => doc.nodes[id]!.kind);
  const staticDown = ids.map((id) => doc.nodes[id]!.state === "down");
  const servers = new Int32Array(N);
  const occMean = new Float64Array(N); // mean time a simulated request holds a server, s
  const ratio = new Float64Array(N); // reported service / held time, so reported service keeps the model's mean
  const forward = new Float64Array(N);
  const qLimit = new Int32Array(N); // in simulated requests
  const capacity: number[] = [];
  const maxQueue = Math.max(0, Math.round(input.maxQueue ?? DES_QUEUE));
  for (let i = 0; i < N; i++) {
    const m = modelOf(kinds[i]!, ids[i]!, opts);
    forward[i] = m.forward;
    capacity.push(m.cap);
    if (!Number.isFinite(m.cap) || m.cap <= 0) continue;
    const cap = m.cap / scale;
    const base = m.base / 1000;
    const c = Math.max(1, Math.round(cap * base));
    servers[i] = c;
    occMean[i] = c / cap; // c servers each at 1/occMean per second = exactly cap
    ratio[i] = base > 0 ? base / occMean[i]! : 0;
    const limit = kinds[i] === "queue" ? maxQueue * QUEUE_KIND_FACTOR : maxQueue;
    qLimit[i] = Math.round(limit / scale);
  }
  const outs: { to: number; rate: number; cut: boolean }[][] = ids.map((id) =>
    Object.values(doc.edges)
      .filter((e) => e.from === id && PASSING.has(e.flow) && e.rate > 0 && !drop.has(e.id) && linked(doc, e))
      .map((e) => ({ to: index.get(e.to)!, rate: e.rate, cut: !!e.cut })),
  );
  const src = sources(doc).map((id) => index.get(id)!);

  const fail = input.failure && has(doc.nodes, input.failure.node) ? input.failure : null;
  const failNode = fail ? index.get(fail.node)! : -1;
  const failFrom = fail ? Math.max(0, fail.from) : Infinity;
  const failTo = fail ? Math.max(failFrom, fail.to) : Infinity;
  let failing = false;
  const isDown = (n: number) => staticDown[n]! || (failing && n === failNode);

  const S = duration;
  const zeros = () => new Array<number>(S).fill(0);
  const arrivals = ids.map(zeros);
  const completed = ids.map(zeros);
  const dropped = ids.map(zeros);
  const queueAt = ids.map(zeros);
  const nodeLat: number[][][] = ids.map(() => Array.from({ length: S }, () => []));
  const inSec = zeros();
  const okSec = zeros();
  const lostSec = zeros();
  const e2e: number[][] = Array.from({ length: S }, () => []);

  // FIFO ring per node
  const ring = ids.map((_, i) => new Int32Array(Math.max(1, qLimit[i]!)));
  const qHead = new Int32Array(N);
  const qLen = new Int32Array(N);
  const busy = new Int32Array(N);
  const area = new Float64Array(N);
  const lastT = new Float64Array(N);
  const sojournSum = new Float64Array(N);
  const done = new Float64Array(N);
  const peak = new Int32Array(N);
  const peakAt = new Int32Array(N);

  const pool = new Pool();
  const heap = new Heap();
  const touch = (n: number, t: number) => {
    area[n] = area[n]! + (t - lastT[n]!) * (qLen[n]! + busy[n]!);
    lastT[n] = t;
  };
  const sec = (t: number) => Math.min(S - 1, Math.floor(t));
  const expo = (mean: number) => -Math.log(1 - rand()) * mean;

  const lose = (r: number, n: number, t: number) => {
    const s = sec(t);
    if (n >= 0) dropped[n]![s]!++;
    lostSec[s]!++;
    pool.free.push(r);
  };
  const finish = (r: number, t: number) => {
    const s = sec(t);
    okSec[s]!++;
    e2e[s]!.push(pool.lat[r]!);
    pool.free.push(r);
  };
  const startService = (r: number, n: number, t: number) => {
    busy[n]!++;
    pool.serve[r] = t;
    heap.push(t + expo(occMean[n]!), r);
  };

  const arrive = (r: number, n: number, t: number): void => {
    arrivals[n]![sec(t)]!++;
    pool.node[r] = n;
    pool.start[r] = t;
    if (staticDown[n]!) return lose(r, n, t);
    if (servers[n] === 0) {
      // actors and clients pass on at once; one in a failure window refuses
      if (failing && n === failNode) return lose(r, n, t);
      return onward(r, n, t);
    }
    touch(n, t);
    if (!failing || n !== failNode) {
      if (busy[n]! < servers[n]!) return startService(r, n, t);
    }
    // a stalled node keeps accepting into its queue until the queue is full
    if (qLen[n]! < qLimit[n]!) {
      ring[n]![(qHead[n]! + qLen[n]!) % ring[n]!.length] = r;
      qLen[n]!++;
      return;
    }
    lose(r, n, t);
  };

  const onward = (r: number, n: number, t: number): void => {
    const f = forward[n]!;
    if (f < 1 && (f <= 0 || rand() >= f)) return finish(r, t);
    const all = outs[n]!;
    let live = all;
    if (kinds[n] === "lb") live = all.filter((e) => !isDown(e.to));
    if (live.length === 0) return ANSWERS.has(kinds[n]!) ? finish(r, t) : lose(r, n, t);
    let e = live[0]!;
    if (live.length > 1) {
      let w = 0;
      for (const x of live) w += x.rate;
      let u = rand() * w;
      for (const x of live) {
        e = x;
        u -= x.rate;
        if (u < 0) break;
      }
    }
    if (e.cut) return lose(r, n, t);
    arrive(r, e.to, t);
  };

  const pullQueue = (n: number, t: number) => {
    while (qLen[n]! > 0 && busy[n]! < servers[n]!) {
      const r = ring[n]![qHead[n]!]!;
      qHead[n] = (qHead[n]! + 1) % ring[n]!.length;
      qLen[n]!--;
      startService(r, n, t);
    }
  };

  const complete = (r: number, t: number) => {
    const n = pool.node[r]!;
    touch(n, t);
    busy[n]!--;
    if (failing && n === failNode) {
      // the node crashed while serving: that request is lost
      lose(r, n, t);
      return;
    }
    const s = sec(t);
    const wait = pool.serve[r]! - pool.start[r]!;
    const held = t - pool.serve[r]!;
    const reported = wait + held * ratio[n]!;
    sojournSum[n] = sojournSum[n]! + wait + held;
    done[n]!++;
    completed[n]![s]!++;
    nodeLat[n]![s]!.push(reported);
    pool.lat[r] = pool.lat[r]! + reported;
    pullQueue(n, t);
    onward(r, n, t);
  };

  // arrivals by thinning a Poisson process at the peak rate
  const peakMult = input.profile === "constant" ? 1 : Math.max(1, factor);
  const lMax = (baseRps * peakMult) / scale;
  const nextArrival = (t: number): number => {
    if (lMax <= 0) return Infinity;
    for (;;) {
      t += -Math.log(1 - rand()) / lMax;
      if (t >= duration) return Infinity;
      if (rand() * peakMult <= trafficAt(prof, t)) return t;
    }
  };

  if (fail && failFrom < duration) {
    heap.push(failFrom, FAIL_START);
    if (failTo < duration) heap.push(failTo, FAIL_END);
  }

  let nextSample = 1;
  const sampleUpTo = (t: number) => {
    while (nextSample <= t && nextSample <= S) {
      const s = nextSample - 1;
      for (let n = 0; n < N; n++) {
        queueAt[n]![s] = qLen[n]!;
        if (qLen[n]! > peak[n]!) {
          peak[n] = qLen[n]!;
          peakAt[n] = s;
        }
      }
      nextSample++;
    }
  };

  let events = 0;
  let truncated = false;
  let endT: number = duration;
  let tArr = nextArrival(0);
  for (;;) {
    const tHeap = heap.n > 0 ? heap.t[0]! : Infinity;
    const t = Math.min(tArr, tHeap);
    if (t >= duration) break;
    sampleUpTo(t);
    if (events >= maxEvents) {
      truncated = true;
      endT = t;
      break;
    }
    events++;
    if (tArr <= tHeap) {
      inSec[sec(t)]!++;
      const r = pool.alloc();
      pool.lat[r] = 0;
      if (src.length === 0) lose(r, -1, t);
      else arrive(r, src.length === 1 ? src[0]! : src[Math.floor(rand() * src.length)]!, t);
      tArr = nextArrival(t);
    } else {
      const id = heap.pop();
      if (id === FAIL_START) {
        touch(failNode, t);
        failing = true;
      } else if (id === FAIL_END) {
        touch(failNode, t);
        failing = false;
        if (servers[failNode]! > 0) pullQueue(failNode, t);
      } else complete(id, t);
    }
  }
  if (!truncated) sampleUpTo(duration);
  const seconds = truncated ? Math.floor(endT) : S;

  const k = scale;
  const cut = <T>(a: T[]) => a.slice(0, seconds);
  const scaleArr = (a: number[]) => cut(a).map((v) => v * k);
  const pct = (lists: number[][], q: number) => cut(lists).map((l) => (l.length ? ms2(percentile(l.sort((x, y) => x - y), q)) : null));

  const nodes: Record<string, DesNodeSeries> = {};
  const node: Record<string, DesNodeTotals> = {};
  const withServers: string[] = [];
  for (let n = 0; n < N; n++) {
    const id = ids[n]!;
    if (servers[n]! > 0) withServers.push(id);
    touch(n, endT);
    nodes[id] = {
      arrivals: scaleArr(arrivals[n]!),
      completed: scaleArr(completed[n]!),
      dropped: scaleArr(dropped[n]!),
      queue: scaleArr(queueAt[n]!),
      p50: pct(nodeLat[n]!, 0.5),
      p95: pct(nodeLat[n]!, 0.95),
    };
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    node[id] = {
      arrivals: sum(nodes[id].arrivals),
      completed: sum(nodes[id].completed),
      dropped: sum(nodes[id].dropped),
      peakQueue: peak[n]! * k,
      peakAt: peakAt[n]!,
      servers: servers[n]!,
      capacity: capacity[n]!,
      queueLimit: qLimit[n]! * k,
      meanInSystem: endT > 0 ? Math.round(((area[n]! * k) / endT) * 1000) / 1000 : 0,
      meanSojournMs: done[n]! > 0 ? ms2(sojournSum[n]! / done[n]!) : 0,
    };
  }
  // percentiles sort the e2e lists in place; sorted copies are not needed afterwards
  const input2 = scaleArr(inSec);
  const ok = scaleArr(okSec);
  const lost = scaleArr(lostSec);
  const total = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return {
    seconds,
    scale,
    truncated,
    events,
    ids: withServers,
    nodes,
    node,
    input: input2,
    ok,
    dropped: lost,
    p50: pct(e2e, 0.5),
    p95: pct(e2e, 0.95),
    totals: { input: total(input2), ok: total(ok), dropped: total(lost) },
  };
}

/**
 * A base rate at `share` of the tightest node's capacity (steady model), rounded to a tidy number.
 * Under it a spike of x3 overloads the bottleneck and the queue drains afterwards, which is the
 * story worth seeing; null when nothing in the diagram has a finite capacity.
 */
export function comfortableRps(doc: LabDoc, rps: number, share = 0.6): number | null {
  const probe = Math.max(1, rps);
  const sim = simulate(doc, probe);
  let rho = 0;
  for (const n of Object.values(sim.nodes)) if (Number.isFinite(n.rho) && n.rho > rho) rho = n.rho;
  if (rho <= 0) return null;
  const raw = (probe * share) / rho;
  const step = raw >= 1000 ? 100 : raw >= 100 ? 10 : 1;
  return Math.max(1, Math.floor(raw / step) * step);
}

/** The node worth watching: the deepest queue, else the highest load against capacity. */
export function busiestNode(r: DesResult): string | undefined {
  let best: string | undefined;
  let key = -1;
  let load = -1;
  for (const id of r.ids) {
    const n = r.node[id]!;
    const l = r.seconds > 0 && Number.isFinite(n.capacity) ? n.arrivals / r.seconds / n.capacity : 0;
    if (n.peakQueue > key || (n.peakQueue === key && l > load)) {
      best = id;
      key = n.peakQueue;
      load = l;
    }
  }
  return best;
}

export interface QueueStory {
  peak: number;
  /** second of the peak */
  peakAt: number;
  /** seconds from the peak until the queue was (nearly) empty again; null if it never drained in the run */
  drain: number | null;
  dropped: number;
  /** first second the node's p95 was over twice its calm p95, null if never */
  slowAt: number | null;
  /** first second with a drop at this node, null if never */
  dropAt: number | null;
}

export function queueStory(r: DesResult, id: string): QueueStory | null {
  const s = r.nodes[id];
  const n = r.node[id];
  if (!s || !n) return null;
  const peak = Math.max(0, ...s.queue);
  const peakAt = peak > 0 ? s.queue.indexOf(peak) : 0;
  let drain: number | null = null;
  if (peak > 0) {
    const threshold = Math.max(r.scale, peak * 0.02);
    for (let i = peakAt + 1; i < s.queue.length; i++) {
      if (s.queue[i]! <= threshold) {
        drain = i - peakAt;
        break;
      }
    }
  } else drain = 0;
  // calm p95: the median of the first few seconds that have data
  const early = s.p95.slice(0, Math.max(3, Math.floor(s.p95.length / 6))).filter((v): v is number => v !== null);
  const calm = early.length ? [...early].sort((a, b) => a - b)[Math.floor(early.length / 2)]! : null;
  let slowAt: number | null = null;
  if (calm !== null) {
    const i = s.p95.findIndex((v) => v !== null && v > calm * 2);
    slowAt = i >= 0 ? i : null;
  }
  const d = s.dropped.findIndex((v) => v > 0);
  return { peak, peakAt, drain, dropped: n.dropped, slowAt, dropAt: d >= 0 ? d : null };
}
