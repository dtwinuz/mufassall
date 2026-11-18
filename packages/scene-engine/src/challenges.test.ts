import { describe, expect, it } from "vitest";
import { CHALLENGES, checkRule } from "./challenges";
import { type LabDoc, sanitize } from "./lab";

const byId = (id: string) => CHALLENGES.find((c) => c.id === id)!;
const passes = (id: string, doc: LabDoc) => byId(id).rules.every((r) => checkRule(doc, r));

/** users -> [cdn] -> lb -> n services -> [cache] -> db */
function farm(services: number, opts: { cache?: boolean; cdn?: boolean } = {}): LabDoc {
  const nodes: Record<string, unknown> = { users: { kind: "client", at: [0, 6] }, lb: { kind: "lb", at: [3, 6] }, db: { kind: "db", at: [11, 6] } };
  const edges: Record<string, unknown> = {};
  if (opts.cdn) {
    nodes.cdn = { kind: "cdn", at: [1, 6] };
    edges.e0 = { from: "users", to: "cdn" };
    edges.e1 = { from: "cdn", to: "lb" };
  } else edges.e1 = { from: "users", to: "lb" };
  if (opts.cache) {
    nodes.cache = { kind: "cache", at: [9, 6] };
    edges.cd = { from: "cache", to: "db" };
  }
  for (let i = 0; i < services; i++) {
    nodes[`s${i}`] = { kind: "service", at: [6, i] };
    edges[`l${i}`] = { from: "lb", to: `s${i}` };
    edges[`d${i}`] = { from: `s${i}`, to: opts.cache ? "cache" : "db" };
  }
  return sanitize({ nodes, edges, labels: {} });
}

describe("lab challenges", () => {
  it("every challenge starts unsolved", () => {
    for (const c of CHALLENGES) expect(c.rules.every((r) => checkRule(c.start(), r)), c.id).toBe(false);
  });
  it("scale-out: a balancer and two servers", () => {
    expect(passes("scale-out", farm(1))).toBe(false);
    expect(passes("scale-out", farm(2))).toBe(true);
  });
  it("spare-the-db: the cache must sit on every path", () => {
    expect(passes("spare-the-db", farm(3))).toBe(false);
    expect(passes("spare-the-db", farm(3, { cache: true }))).toBe(true);
    const leaky = farm(3, { cache: true });
    leaky.edges.leak = { id: "leak", from: "s0", to: "db", flow: "request", rate: 1, cut: false };
    expect(passes("spare-the-db", leaky)).toBe(false);
  });
  it("lose-one: survives any single server going down", () => {
    expect(passes("lose-one", farm(2))).toBe(false);
    expect(passes("lose-one", farm(3))).toBe(true);
  });
  it("fast-at-scale: a CDN in front does it", () => {
    expect(passes("fast-at-scale", farm(3, { cache: true }))).toBe(false);
    expect(passes("fast-at-scale", farm(3, { cache: true, cdn: true }))).toBe(true);
  });
});

describe("challenges cannot be gamed", () => {
  const cheats: Record<string, LabDoc> = {
    empty: sanitize({}),
    "lone balancer": sanitize({ nodes: { lb: { kind: "lb", at: [2, 2] } }, edges: {}, labels: {} }),
    "lone queue behind users": sanitize({
      nodes: { u: { kind: "client", at: [0, 2] }, lb: { kind: "lb", at: [3, 2] }, q: { kind: "queue", at: [6, 2] } },
      edges: { a: { from: "u", to: "lb" }, b: { from: "lb", to: "q" } },
      labels: {},
    }),
  };
  it.each(Object.keys(cheats))("%s solves nothing", (name) => {
    for (const c of CHALLENGES) expect(c.rules.every((r) => checkRule(cheats[name]!, r)), `${name} / ${c.id}`).toBe(false);
  });
  it("unconnected extra clients do not dilute the load", () => {
    const d = byId("fast-at-scale").start();
    for (let i = 0; i < 10; i++) d.nodes[`c${i}`] = { id: `c${i}`, kind: "client", at: [12, i], state: "ok" };
    expect(passes("fast-at-scale", d)).toBe(false);
  });
});

describe("interview scenarios", () => {
  it("url shortener: a CDN, two servers and a cache", () => {
    expect(passes("design-url-shortener", farm(2, { cache: true }))).toBe(false);
    expect(passes("design-url-shortener", farm(2, { cache: true, cdn: true }))).toBe(true);
  });
  it("chat: messages go through a queue to workers", () => {
    const chat = (workers: number) => {
      const nodes: Record<string, unknown> = {
        users: { kind: "client", at: [0, 6] },
        lb: { kind: "lb", at: [2, 6] },
        s0: { kind: "service", at: [4, 4] },
        s1: { kind: "service", at: [4, 8] },
        q: { kind: "queue", at: [6, 6] },
        db: { kind: "db", at: [11, 6] },
      };
      const edges: Record<string, unknown> = { a: { from: "users", to: "lb" }, b: { from: "lb", to: "s0" }, c: { from: "lb", to: "s1" }, d: { from: "s0", to: "q" }, e: { from: "s1", to: "q" } };
      for (let i = 0; i < workers; i++) {
        nodes[`w${i}`] = { kind: "worker", at: [8, 3 + i * 2] };
        edges[`qw${i}`] = { from: "q", to: `w${i}` };
        edges[`wd${i}`] = { from: `w${i}`, to: "db" };
      }
      return sanitize({ nodes, edges, labels: {} });
    };
    expect(passes("design-chat", chat(2))).toBe(false);
    expect(passes("design-chat", chat(3))).toBe(true);
  });
  it("feed: no CDN, the cache and enough servers carry it", () => {
    expect(passes("design-feed", farm(4, { cache: true, cdn: true }))).toBe(false);
    expect(passes("design-feed", farm(3, { cache: true }))).toBe(false);
    expect(passes("design-feed", farm(4, { cache: true }))).toBe(true);
  });
});

describe("link rule", () => {
  const doc = (flow: "ack" | "request"): LabDoc =>
    sanitize({
      nodes: {
        a: { id: "a", kind: "service", at: [2, 2], state: "ok" },
        r: { id: "r", kind: "lb", at: [5, 2], state: "ok" },
      },
      edges: { e: { id: "e", from: "r", to: "a", flow, rate: 2, cut: false } },
      labels: {},
    } as unknown as LabDoc);
  it("needs an ack line between the two kinds", () => {
    const rule = { kind: "link", from: "lb", to: "service", flow: "ack" } as const;
    expect(checkRule(doc("ack"), rule)).toBe(true);
    expect(checkRule(doc("request"), rule)).toBe(false);
  });
});
