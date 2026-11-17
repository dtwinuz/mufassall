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
