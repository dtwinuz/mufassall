import { describe, expect, it } from "vitest";
import { type LabDoc, decodeDoc, sanitize } from "./lab";
import { UNIT_PRICES, addReplica, checkSlo, errorBudgetMinutes, monthlyCost, replicaTradeoff, simView, simulate } from "./sim";

const shop = (over: Partial<Record<string, { state?: string }>> = {}): LabDoc =>
  sanitize({
    nodes: {
      users: { kind: "client", at: [0, 0] },
      lb: { kind: "lb", at: [2, 0] },
      a: { kind: "service", at: [4, 0], ...over.a },
      b: { kind: "service", at: [4, 2], ...over.b },
      cache: { kind: "cache", at: [6, 0] },
      db: { kind: "db", at: [8, 0], ...over.db },
    },
    edges: {
      in: { from: "users", to: "lb" },
      la: { from: "lb", to: "a" },
      lb2: { from: "lb", to: "b" },
      ac: { from: "a", to: "cache" },
      bc: { from: "b", to: "cache" },
      cd: { from: "cache", to: "db" },
      back: { from: "db", to: "users" },
    },
    labels: {},
  });

describe("lab simulation", () => {
  it("splits traffic and lets the cache absorb reads", () => {
    const r = simulate(shop(), 1000);
    expect(r.nodes.a!.rps).toBeCloseTo(500);
    expect(r.nodes.b!.rps).toBeCloseTo(500);
    expect(r.nodes.cache!.rps).toBeCloseTo(1000);
    expect(r.nodes.db!.rps).toBeCloseTo(100);
    expect(r.errorRate).toBe(0);
    expect(r.ok).toBeCloseTo(1000);
    expect(r.ms).toBeGreaterThan(0);
  });

  it("overloads and drops past capacity, with latency climbing", () => {
    const calm = simulate(shop(), 600);
    const hot = simulate(shop(), 2000);
    expect(hot.hot).toEqual(expect.arrayContaining(["a", "b"]));
    expect(hot.errorRate).toBeGreaterThan(0.3);
    expect(hot.ms).toBeGreaterThan(calm.ms * 3);
  });

  it("a balancer routes around a dead server; a direct caller fails", () => {
    const r = simulate(shop({ a: { state: "down" } }), 400);
    expect(r.nodes.b!.rps).toBeCloseTo(400);
    expect(r.errorRate).toBe(0);
    const dbDown = simulate(shop({ db: { state: "down" } }), 1000);
    expect(dbDown.nodes.db!.dropped).toBeCloseTo(100);
    expect(dbDown.errorRate).toBeCloseTo(0.1);
  });

  it("ignores the cycle edge and shows load on the scene", () => {
    const doc = shop();
    const r = simulate(doc, 540);
    expect(r.nodes.users!.rps).toBeCloseTo(540);
    const view = simView(doc, r);
    expect(view.nodes.a!.load).toBe(45);
    expect(view.nodes.users!.load).toBeUndefined();
    expect(simView(doc, simulate(doc, 1100)).nodes.a!.state).toBe("slow");
  });
});

describe("lab simulation edge cases", () => {
  it("a rate-0 link carries no traffic", () => {
    const d = sanitize({
      nodes: { u: { kind: "client", at: [0, 0] }, a: { kind: "service", at: [3, 0] }, b: { kind: "service", at: [3, 3] } },
      edges: { x: { from: "u", to: "a", rate: 0 }, y: { from: "u", to: "b", rate: 1 } },
      labels: {},
    });
    const r = simulate(d, 500);
    expect(r.nodes.a!.rps).toBe(0);
    expect(r.nodes.b!.rps).toBeCloseTo(500);
  });
  it("no source means nothing is served", () => {
    const r = simulate(sanitize({}), 1000);
    expect(r.ok).toBe(0);
    expect(r.errorRate).toBe(1);
  });
  it("a prototype key never resolves as a node", () => {
    const d = decodeDoc(btoa(JSON.stringify({ n: [["a", "client", 1, 1, "ok", -1, "A"]], e: [["x", "a", "constructor", "request", 1, 0]] })));
    expect(Object.keys(d.edges)).toEqual([]);
    expect(() => simulate(d, 100)).not.toThrow();
  });
});

const chain = (extra: Record<string, { kind: string; at: [number, number] }> = {}, links: Record<string, { from: string; to: string }> = {}) =>
  sanitize({
    nodes: { u: { kind: "client", at: [0, 0] }, s: { kind: "service", at: [2, 0] }, d: { kind: "db", at: [4, 0] }, ...extra },
    edges: { us: { from: "u", to: "s" }, sd: { from: "s", to: "d" }, ...links },
    labels: {},
  });

describe("SLO estimate", () => {
  it("sums base / (1 - rho) along the main path, p95 = mean x ln 20", () => {
    // service 300/600 = 0.5 → 20 / 0.5 = 40 ms; db 300/800 = 0.375 → 8 / 0.625 = 12.8 ms
    const r = simulate(chain(), 300);
    expect(r.path).toEqual(["u", "s", "d"]);
    expect(r.pathMs).toBeCloseTo(52.8, 6);
    expect(r.p95).toBeCloseTo(52.8 * Math.log(20), 6);
    expect(r.availability).toBe(1);
  });

  it("a warm cache ends the main path; the strict availability counts it as answered", () => {
    // lb 0.5/0.95, service a 20/(1-500/600) = 120, cache 1/0.95; 90% answered by the cache, 10% by the db
    const r = simulate(shop(), 1000);
    expect(r.path).toEqual(["users", "lb", "a", "cache"]);
    expect(r.pathMs).toBeCloseTo(0.5 / 0.95 + 120 + 1 / 0.95, 6);
    expect(r.availability).toBeCloseTo(1, 9);
  });

  it("any request through an overloaded node counts as failed", () => {
    // service at 700/600: 600/s still get through (ok), but every one of them waited in a full queue
    const r = simulate(chain(), 700);
    expect(r.ok).toBeCloseTo(600);
    expect(r.availability).toBe(0);
    const dbDown = simulate(shop({ db: { state: "down" } }), 1000);
    expect(dbDown.availability).toBeCloseTo(0.9, 9);
  });

  it("slow and cold knobs change the model, not the diagram", () => {
    // service x10: cap 60, base 200; at 50/s rho 5/6 → 200 / (1/6) = 1200; db 8 / (1 - 50/800) = 8.5333
    const slow = simulate(chain(), 50, { slow: { s: 10 } });
    expect(slow.pathMs).toBeCloseTo(1200 + 8 / (1 - 50 / 800), 6);
    // a cold cache passes all 1000/s to the db: 1000/800 → 200 dropped
    const cold = simulate(shop(), 1000, { cold: ["cache"] });
    expect(cold.nodes.db!.rps).toBeCloseTo(1000);
    expect(cold.nodes.db!.dropped).toBeCloseTo(200);
    expect(cold.hot).toContain("db");
    expect(cold.availability).toBe(0);
  });

  it("error budget for a 30-day month and the verdict", () => {
    expect(errorBudgetMinutes(0.999)).toBeCloseTo(43.2, 9);
    expect(errorBudgetMinutes(0.9999)).toBeCloseTo(4.32, 9);
    expect(errorBudgetMinutes(0.99)).toBeCloseTo(432, 9);
    const r = simulate(chain(), 300);
    expect(checkSlo(r, { availability: 0.999, p95: 200 }).ok).toBe(true);
    const tight = checkSlo(r, { availability: 0.999, p95: 100 });
    expect(tight).toMatchObject({ availabilityOk: true, latencyOk: false, ok: false });
    const dbDown = checkSlo(simulate(shop({ db: { state: "down" } }), 1000), { availability: 0.999, p95: 1000 });
    expect(dbDown.availabilityOk).toBe(false);
    expect(dbDown.burn).toBeCloseTo(0.1 * 43200, 6);
  });
});

describe("cost estimate", () => {
  it("node prices add up per kind", () => {
    // lb 20 + 2 services x 60 + cache 100 + db 250
    const c = monthlyCost(shop(), simulate(shop(), 1000));
    expect(c.total).toBeCloseTo(490, 9);
    expect(c.lines.find((l) => l.kind === "service")).toMatchObject({ count: 2, fixed: 120 });
    expect(c.lines.some((l) => l.kind === "client")).toBe(false);
  });

  it("usage prices follow the traffic", () => {
    const d = sanitize({
      nodes: { u: { kind: "client", at: [0, 0] }, q: { kind: "queue", at: [2, 0] }, w: { kind: "worker", at: [4, 0] }, c: { kind: "cdn", at: [0, 4] } },
      edges: { uq: { from: "u", to: "q" }, qw: { from: "q", to: "w" } },
      labels: {},
    });
    const c = monthlyCost(d, simulate(d, 100));
    // 100/s x 2 592 000 s = 259.2 M messages x $0.40 + $30
    expect(c.lines.find((l) => l.kind === "queue")!.total).toBeCloseTo(30 + 259.2 * 0.4, 6);
    expect(c.lines.find((l) => l.kind === "worker")!.total).toBe(60);
    // an unreached CDN costs nothing
    expect(c.lines.some((l) => l.kind === "cdn")).toBe(false);
    const cdn = sanitize({ nodes: { u: { kind: "client", at: [0, 0] }, c: { kind: "cdn", at: [2, 0] } }, edges: { uc: { from: "u", to: "c" } }, labels: {} });
    // 100/s x 2 592 000 s x 20 KB = 5 184 GB x $0.08
    expect(monthlyCost(cdn, simulate(cdn, 100)).total).toBeCloseTo(5184 * 0.08, 6);
    expect(UNIT_PRICES.db.node).toBe(250);
  });

  it("one more replica: cost up, latency down", () => {
    const t = replicaTradeoff(chain(), 500)!;
    expect(t.target).toBe("s");
    expect(t.before.cost).toBe(310);
    expect(t.after.cost).toBe(370);
    // before: 20/(1-5/6) + 8/(1-5/8); after: each service gets 250/s
    expect(t.before.p95 / Math.log(20)).toBeCloseTo(120 + 8 / 0.375, 6);
    expect(t.after.p95 / Math.log(20)).toBeCloseTo(20 / (1 - 250 / 600) + 8 / 0.375, 6);
    expect(Object.keys(t.doc.nodes)).toHaveLength(4);
    expect(Object.keys(chain().nodes)).toHaveLength(3);
  });

  it("a replica copies every link in and out", () => {
    const r = addReplica(chain(), "s", "S2")!;
    const links = Object.values(r.doc.edges).filter((e) => e.from === r.id || e.to === r.id);
    expect(links.map((e) => [e.from, e.to])).toEqual([
      ["u", r.id],
      [r.id, "d"],
    ]);
    expect(r.doc.labels[r.id]).toBe("S2");
    expect(addReplica(chain(), "nope")).toBeNull();
  });
});
