import { describe, expect, it } from "vitest";
import { type LabDoc, sanitize } from "./lab";
import { type DesInput, busiestNode, mulberry32, queueStory, simulateDes, spikeWindow, trafficAt } from "./des";

const chain = (): LabDoc =>
  sanitize({
    nodes: { u: { kind: "client", at: [0, 0] }, s: { kind: "service", at: [2, 0] }, d: { kind: "db", at: [4, 0] } },
    edges: { us: { from: "u", to: "s" }, sd: { from: "s", to: "d" } },
    labels: {},
  });

const balanced = (): LabDoc =>
  sanitize({
    nodes: {
      u: { kind: "client", at: [0, 0] },
      lb: { kind: "lb", at: [2, 0] },
      a: { kind: "service", at: [4, 0] },
      b: { kind: "service", at: [4, 2] },
      c: { kind: "cache", at: [6, 0] },
      d: { kind: "db", at: [8, 0] },
    },
    edges: {
      ul: { from: "u", to: "lb" },
      la: { from: "lb", to: "a" },
      lb2: { from: "lb", to: "b" },
      ac: { from: "a", to: "c" },
      bc: { from: "b", to: "c" },
      cd: { from: "c", to: "d" },
      back: { from: "d", to: "u" },
    },
    labels: {},
  });

const base = (over: Partial<DesInput> = {}): DesInput => ({ profile: "constant", rps: 200, factor: 1, duration: 60, seed: 42, ...over });
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe("des primitives", () => {
  it("mulberry32 is seeded and stays in [0, 1)", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(sum(xs) / xs.length).toBeCloseTo(0.5, 1);
  });
  it("traffic profiles", () => {
    const spike = { profile: "spike" as const, factor: 4, duration: 60 };
    expect(spikeWindow(spike)).toEqual({ start: 15, length: 15 });
    expect(trafficAt(spike, 10)).toBe(1);
    expect(trafficAt(spike, 20)).toBe(4);
    expect(trafficAt(spike, 30)).toBe(1);
    const ramp = { profile: "ramp" as const, factor: 3, duration: 60 };
    expect(trafficAt(ramp, 0)).toBe(1);
    expect(trafficAt(ramp, 30)).toBeCloseTo(2);
    expect(trafficAt({ profile: "constant", factor: 9, duration: 60 }, 30)).toBe(1);
  });
});

describe("discrete-event simulation", () => {
  it("same seed and inputs give byte-identical output; another seed differs", () => {
    const a = JSON.stringify(simulateDes(balanced(), base({ profile: "spike", rps: 800, factor: 3 })));
    const b = JSON.stringify(simulateDes(balanced(), base({ profile: "spike", rps: 800, factor: 3 })));
    expect(a).toBe(b);
    expect(JSON.stringify(simulateDes(balanced(), base({ profile: "spike", rps: 800, factor: 3, seed: 43 })))).not.toBe(a);
  });

  it("low steady load: no drops, queue about zero, routing like the steady model", () => {
    const r = simulateDes(balanced(), base({ rps: 300 }));
    expect(r.scale).toBe(1);
    expect(r.truncated).toBe(false);
    expect(r.totals.dropped).toBe(0);
    expect(Math.max(...r.nodes.a!.queue, ...r.nodes.b!.queue)).toBeLessThanOrEqual(3);
    const perS = (id: string) => r.node[id]!.arrivals / r.seconds;
    expect(perS("a")).toBeGreaterThan(130);
    expect(perS("a")).toBeLessThan(170);
    expect(perS("c")).toBeGreaterThan(270);
    // the cache answers 90%
    expect(perS("d")).toBeGreaterThan(20);
    expect(perS("d")).toBeLessThan(40);
    expect(r.totals.ok / r.totals.input).toBeGreaterThan(0.99);
    // latency is near the sum of base times (lb 0.5 + service 20 + cache 1 [+ db 8]) with some queueing
    const p50 = r.p50.filter((v): v is number => v !== null);
    expect(p50.length).toBe(60);
    expect(sum(p50) / p50.length).toBeGreaterThan(10);
    expect(sum(p50) / p50.length).toBeLessThan(40);
  });

  it("a spike over capacity fills the queue, which drains about backlog / (capacity - load) after", () => {
    // one service: 600/s; 400/s calm, 800/s for 20 s → backlog ≈ 200 × 20 = 4000, drains at 200/s ≈ 20 s
    const r = simulateDes(chain(), base({ profile: "spike", rps: 400, factor: 2, duration: 90, spikeStart: 20, spikeLength: 20, maxQueue: 100000 }));
    const q = r.nodes.s!.queue;
    expect(q[10]).toBeLessThan(50);
    const story = queueStory(r, "s")!;
    expect(story.peakAt).toBeGreaterThanOrEqual(36);
    expect(story.peakAt).toBeLessThanOrEqual(41);
    expect(story.peak).toBeGreaterThan(4000 * 0.7);
    expect(story.peak).toBeLessThan(4000 * 1.3);
    const expected = story.peak / (600 - 400);
    expect(story.drain).not.toBeNull();
    expect(story.drain!).toBeGreaterThan(expected * 0.7);
    expect(story.drain!).toBeLessThan(expected * 1.3);
    expect(q[85]).toBeLessThan(50);
    expect(r.node.s!.dropped).toBe(0);
    // latency climbs before anything is lost; the db behind sees a flat 600/s cap during the spike
    expect(story.slowAt).not.toBeNull();
    expect(story.slowAt!).toBeGreaterThanOrEqual(20);
    expect(story.slowAt!).toBeLessThan(25);
    expect(busiestNode(r)).toBe("s");
  });

  it("a bounded queue overflows: drops start only after latency has climbed", () => {
    const r = simulateDes(chain(), base({ profile: "spike", rps: 400, factor: 3, duration: 60, spikeStart: 10, spikeLength: 20, maxQueue: 2000 }));
    const story = queueStory(r, "s")!;
    expect(story.peak).toBeLessThanOrEqual(2000);
    expect(story.peak).toBeGreaterThan(1900);
    expect(story.dropped).toBeGreaterThan(0);
    expect(story.slowAt!).toBeLessThan(story.dropAt!);
    expect(r.totals.dropped).toBe(r.node.s!.dropped);
  });

  it("a node down for 10 s: its queue backs up, the db behind dips, then it catches up", () => {
    const r = simulateDes(chain(), base({ rps: 150, duration: 60, failure: { node: "s", from: 20, to: 30 }, maxQueue: 100000 }));
    const s = r.nodes.s!;
    const d = r.nodes.d!;
    // backlog ≈ 150 × 10
    expect(s.queue[28]).toBeGreaterThan(1200);
    expect(sum(d.arrivals.slice(21, 29))).toBe(0);
    expect(sum(d.arrivals.slice(5, 15)) / 10).toBeGreaterThan(130);
    // after it comes back, it works at full capacity (600/s) on the backlog
    expect(d.arrivals[31]).toBeGreaterThan(450);
    expect(s.queue[40]).toBeLessThan(20);
    // only requests caught in service at the crash are lost
    expect(r.node.s!.dropped).toBeLessThanOrEqual(12);
  });

  it("a stalled node with a small queue drops the overflow", () => {
    const r = simulateDes(chain(), base({ rps: 300, duration: 40, failure: { node: "s", from: 10, to: 20 }, maxQueue: 500 }));
    expect(Math.max(...r.nodes.s!.queue)).toBeLessThanOrEqual(500);
    expect(r.node.s!.dropped).toBeGreaterThan(2000);
    expect(sum(r.dropped)).toBe(r.totals.dropped);
  });

  it("a balancer routes around the failed node", () => {
    const r = simulateDes(balanced(), base({ rps: 400, duration: 40, failure: { node: "a", from: 10, to: 20 } }));
    const b = r.nodes.b!.arrivals;
    expect(sum(b.slice(11, 19)) / 8).toBeGreaterThan(350);
    expect(sum(r.nodes.a!.arrivals.slice(11, 19))).toBe(0);
    expect(r.totals.dropped).toBeLessThanOrEqual(15);
  });

  it("Little's law: time-average in the node ≈ throughput × mean time in it", () => {
    const r = simulateDes(chain(), base({ rps: 500, duration: 120, seed: 9 }));
    const n = r.node.s!;
    const lambda = n.completed / r.seconds;
    const L = n.meanInSystem;
    const W = n.meanSojournMs / 1000;
    expect(L).toBeGreaterThan(5);
    expect(Math.abs(L - lambda * W) / L).toBeLessThan(0.05);
  });

  it("stays inside the budget: scales high traffic, truncates when forced", () => {
    const r = simulateDes(balanced(), base({ rps: 20000, duration: 120 }));
    expect(r.scale).toBeGreaterThan(1);
    expect(r.events).toBeLessThanOrEqual(300_000);
    expect(r.truncated).toBe(false);
    const t = simulateDes(balanced(), base({ rps: 300, duration: 60, maxEvents: 5000, scale: 1 }));
    expect(t.truncated).toBe(true);
    expect(t.seconds).toBeLessThan(60);
    expect(t.input.length).toBe(t.seconds);
  });

  it("no source loses everything; a down node loses its arrivals", () => {
    const none = simulateDes(sanitize({ nodes: { a: { kind: "service", at: [0, 0] } }, edges: {}, labels: {} }), base({ rps: 100, duration: 5 }));
    // a lone service is its own source
    expect(none.totals.ok).toBeGreaterThan(0);
    const doc = chain();
    doc.nodes.d = { ...doc.nodes.d!, state: "down" };
    const r = simulateDes(doc, base({ rps: 100, duration: 10 }));
    expect(r.totals.ok).toBe(0);
    expect(r.node.d!.dropped).toBe(r.totals.dropped);
  });

  it("worst case (40 nodes, 120 s, spike) runs fast", () => {
    const nodes: Record<string, { kind: string; at: [number, number] }> = { u: { kind: "client", at: [0, 0] }, lb: { kind: "lb", at: [1, 0] } };
    const edges: Record<string, { from: string; to: string }> = { ul: { from: "u", to: "lb" } };
    // 12 services behind the balancer, each to one of 12 caches → 12 dbs, plus a queue and a worker
    for (let i = 0; i < 12; i++) {
      nodes[`s${i}`] = { kind: "service", at: [3, i] };
      nodes[`c${i}`] = { kind: "cache", at: [5, i] };
      nodes[`d${i}`] = { kind: "db", at: [7, i] };
      edges[`ls${i}`] = { from: "lb", to: `s${i}` };
      edges[`sc${i}`] = { from: `s${i}`, to: `c${i}` };
      edges[`cd${i}`] = { from: `c${i}`, to: `d${i}` };
    }
    nodes.q = { kind: "queue", at: [9, 0] };
    nodes.w = { kind: "worker", at: [11, 0] };
    edges.sq = { from: "s0", to: "q" };
    edges.qw = { from: "q", to: "w" };
    const doc = sanitize({ nodes, edges, labels: {} });
    expect(Object.keys(doc.nodes).length).toBe(40);
    const input = base({ profile: "spike", rps: 20000, factor: 5, duration: 120 });
    simulateDes(doc, input); // warm up the JIT
    const t0 = performance.now();
    const r = simulateDes(doc, input);
    const ms = performance.now() - t0;
    console.log(`des worst case: ${ms.toFixed(1)} ms, ${r.events} events, scale ${r.scale}, truncated ${r.truncated}`);
    expect(r.events).toBeLessThanOrEqual(300_000);
    expect(ms).toBeLessThan(1000);
  });
});
