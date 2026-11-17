import { describe, expect, it } from "vitest";
import { type LabDoc, sanitize } from "./lab";
import { simulate, simView } from "./sim";

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
