import { describe, expect, it } from "vitest";
import { defineLesson, diff, emptyState, resolve } from "./index";

const base = defineLesson({
  slug: "demo",
  level: "beginner",
  minutes: 3,
  tier: "public",
  metrics: [{ id: "errors", unit: "%", better: "down" }],
  steps: [
    {
      id: "one",
      kind: "problem",
      nodes: { a: { kind: "actor", at: [0, 0] }, b: { kind: "service", at: [3, 0] } },
      edges: { ab: { from: "a", to: "b" } },
      metrics: { errors: 0 },
    },
    { id: "two", kind: "problem", nodes: { b: { state: "down" } }, edges: { ab: { cut: true } }, metrics: { errors: 100 } },
    { id: "three", kind: "fix", nodes: { b: null } },
  ],
});

describe("resolve", () => {
  it("folds patches into full states", () => {
    const states = resolve(base);
    expect(states).toHaveLength(3);
    expect(states[0]!.nodes.b).toEqual({ id: "b", kind: "service", at: [3, 0], state: "ok" });
    expect(states[0]!.edges.ab).toMatchObject({ flow: "request", rate: 1, cut: false });
    expect(states[1]!.nodes.b!.state).toBe("down");
    expect(states[1]!.edges.ab!.cut).toBe(true);
  });

  it("does not mutate earlier states", () => {
    const states = resolve(base);
    expect(states[0]!.nodes.b!.state).toBe("ok");
    expect(states[0]!.metrics.errors).toBe(0);
  });

  it("removing a node drops its edges", () => {
    const states = resolve(base);
    expect(states[2]!.nodes.b).toBeUndefined();
    expect(states[2]!.edges.ab).toBeUndefined();
  });

  it("rejects a new node without position", () => {
    expect(() =>
      resolve({ ...base, steps: [{ id: "x", kind: "fix", nodes: { q: { kind: "queue" } } }, base.steps[0]] }),
    ).toThrow(/needs kind and at/);
  });

  it("rejects an edge to a missing node", () => {
    expect(() =>
      resolve({ ...base, steps: [{ id: "x", kind: "fix", edges: { e: { from: "a", to: "z" } } }, base.steps[0]] }),
    ).toThrow();
  });

  it("rejects unknown metrics and duplicate step ids", () => {
    expect(() => resolve({ ...base, steps: [base.steps[0], { id: "y", kind: "fix", metrics: { nope: 1 } }] })).toThrow(/unknown metric/);
    expect(() => resolve({ ...base, steps: [base.steps[0], base.steps[0]] })).toThrow(/duplicate/);
  });
});

describe("validateLesson", () => {
  it("accepts a correct lesson and rejects unknown keys", async () => {
    const { validateLesson } = await import("./validate");
    expect(() => validateLesson(base)).not.toThrow();
    const bad = { ...base, steps: [{ ...base.steps[0], colour: "red" }, base.steps[1]] } as unknown as typeof base;
    expect(() => validateLesson(bad)).toThrow(/steps\.0/);
  });
});

describe("diff", () => {
  it("reports node, edge and metric changes", () => {
    const [s1, s2, s3] = resolve(base);
    expect(diff(emptyState(), s1!).map((c) => `${c.op}${c.type}`)).toEqual(["+node", "+node", "+edge", "~metric"]);
    expect(diff(s1!, s2!)).toEqual([
      { op: "~", type: "node-state", id: "b", from: "ok", to: "down" },
      { op: "-", type: "edge-cut", id: "ab", from: "a", to: "b" },
      { op: "~", type: "metric", id: "errors", was: 0, now: 100 },
    ]);
    // the edge disappears with its node, so it is not reported twice
    expect(diff(s2!, s3!)).toEqual([{ op: "-", type: "node", id: "b" }]);
  });
});
