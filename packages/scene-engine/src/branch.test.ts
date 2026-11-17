import { defineLesson } from "@mufassall/scene-schema";
import { describe, expect, it } from "vitest";
import { branchChoices, branchOf, parseBranch, progressIndex, switchIndex } from "./branch";
import { returnSegment } from "./packets";

const lesson = defineLesson({
  slug: "demo",
  level: "beginner",
  minutes: 3,
  tier: "public",
  metrics: [{ id: "lost", unit: "%", better: "down" }],
  steps: [
    {
      id: "a",
      kind: "problem",
      nodes: { x: { kind: "client", at: [0, 0] }, y: { kind: "service", at: [3, 0] } },
      edges: { xy: { from: "x", to: "y", mode: "call" } },
      metrics: { lost: 0 },
    },
    { id: "b", kind: "fix" },
    { id: "c", kind: "fix" },
    { id: "d", kind: "fix" },
    { id: "e", kind: "recap" },
  ],
  scenarios: [
    { id: "late", from: "b", steps: [{ id: "l1", kind: "case" }, { id: "l2", kind: "case", metrics: { lost: 5 } }] },
    { id: "lost", from: "b", steps: [{ id: "x1", kind: "case", edges: { xy: { cut: true } } }] },
  ],
});

describe("branches", () => {
  const base = branchOf(lesson, null);
  const late = branchOf(lesson, "late");
  const lost = branchOf(lesson, "lost");

  it("builds the base story and each scenario", () => {
    expect(base.steps.map((s) => s.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(late.steps.map((s) => s.id)).toEqual(["a", "b", "l1", "l2"]);
    expect(late.from).toBe(1);
    expect(late.states).toHaveLength(4);
    expect(branchOf(lesson, "nope").sc).toBeNull();
  });

  it("offers scenarios only from the fork onward", () => {
    expect(branchChoices(lesson, base, 0)).toEqual([]);
    expect(branchChoices(lesson, base, 1)).toEqual(["late", "lost"]);
    expect(branchChoices(lesson, base, 4)).toEqual(["late", "lost"]);
    expect(branchChoices(lesson, late, 3)).toEqual(["late", "lost"]);
  });

  it("keeps the distance from the fork when switching", () => {
    expect(switchIndex(lesson, base, 2, late)).toBe(2);
    expect(switchIndex(lesson, base, 4, late)).toBe(3); // clamped to the scenario's end
    expect(switchIndex(lesson, late, 3, base)).toBe(3);
    expect(switchIndex(lesson, late, 3, lost)).toBe(2);
    expect(switchIndex(lesson, lost, 1, late)).toBe(1);
  });

  it("reads the step and scenario from the URL", () => {
    expect(parseBranch(lesson, "?step=4&sc=late")).toEqual({ sc: "late", index: 3 });
    expect(parseBranch(lesson, "?step=5&sc=late")).toEqual({ sc: "late", index: 0 });
    expect(parseBranch(lesson, "?step=5&sc=zzz")).toEqual({ sc: null, index: 4 });
    expect(parseBranch(lesson, "")).toEqual({ sc: null, index: 0 });
  });

  it("records progress for base steps only", () => {
    expect(progressIndex(base, 3)).toBe(3);
    expect(progressIndex(late, 1)).toBe(1);
    expect(progressIndex(late, 2)).toBe(-1);
  });
});

describe("call reply track", () => {
  it("runs back beside the request, towards the caller", () => {
    const r = returnSegment({ x1: 0, y1: 0, x2: 100, y2: 0 });
    expect(r.x1).toBeGreaterThan(r.x2);
    expect(r.y1).toBe(5);
    expect(r.y2).toBe(5);
    expect(r.x1).toBeLessThanOrEqual(100);
    expect(r.x2).toBeGreaterThanOrEqual(0);
  });
});
