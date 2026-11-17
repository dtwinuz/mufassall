import { describe, expect, it } from "vitest";
import { type ScenarioTexts, type annotate, branchIndex, defineLesson, diff, emptyState, resolve, resolveScenario, scenarioSteps } from "./index";

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

describe("annotate", () => {
  const msg = {
    head: "POST /pay HTTP/1.1",
    headers: [
      ["Authorization", "***"],
      ["Content-Type", "application/json"],
    ] as const,
    body: '{\n  "id": "tx-1",\n  "token": "***",\n  "amount": 500\n}',
    format: "json" as const,
  };
  const text = (l: ReturnType<typeof annotate>[number]) => l.map((s) => (s.kind === "text" ? s.text : s.kind === "mark" ? `[${s.n}]` : "<masked>")).join("");

  it("numbers marks once and masks headers and JSON values", async () => {
    const { annotate: run, maskedRaw } = await import("./wire");
    const lines = run(msg, ["id", "amount", "Authorization"], ["Authorization", "token"]);
    expect(lines.map(text)).toEqual([
      "POST /pay HTTP/1.1",
      "Authorization[3]: <masked>",
      "Content-Type: application/json",
      "",
      "{",
      '  "id": [1]"tx-1",',
      '  "token": <masked>,',
      '  "amount": [2]500',
      "}",
    ]);
    expect(maskedRaw(lines)).toEqual(["***", "***"]);
  });

  it("shares numbering across request and response and masks XML", async () => {
    const { annotate: run } = await import("./wire");
    const seen = new Set<string>();
    run({ head: "req", body: '{"id": 1}', format: "json" }, ["id"], [], seen);
    const xml = run({ head: "resp", body: "<doc><id>7</id><sign>***</sign></doc>", format: "xml" }, ["id", "sign"], ["sign"], seen);
    expect(xml.map(text)).toEqual(["resp", "<doc><id>7</id><sign>[2]<masked></sign></doc>"]);
  });
});

describe("annotate on hostile input", () => {
  it("stays linear on long repetitive lines", async () => {
    const { annotate } = await import("./index");
    const t0 = performance.now();
    annotate({ format: "xml", head: "x", body: "<- ".repeat(20000) }, ["a"], ["a"]);
    annotate({ format: "json", head: "x", body: `{"a": ${" ".repeat(20000)}]` }, ["a"], ["a"]);
    annotate({ format: "json", head: "x", body: '"'.repeat(20001) }, ["a"], ["a"]);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

const branched = defineLesson({
  ...base,
  steps: [
    {
      id: "one",
      kind: "problem",
      nodes: { a: { kind: "actor", at: [0, 0] }, b: { kind: "service", at: [3, 0] } },
      edges: { ab: { from: "a", to: "b", mode: "call" } },
      metrics: { errors: 0 },
    },
    { id: "two", kind: "fix", metrics: { errors: 1 } },
    { id: "three", kind: "recap" },
  ],
  scenarios: [
    {
      id: "late",
      from: "one",
      steps: [
        { id: "late-wait", kind: "case", nodes: { b: { state: "slow" } }, edges: { ab: { mode: "async" } }, metrics: { errors: 40 } },
        { id: "late-end", kind: "case", metrics: { errors: 90 } },
      ],
    },
  ],
});

describe("edge mode", () => {
  it("is carried through steps and absent by default", () => {
    expect(resolve(base)[0]!.edges.ab!.mode).toBeUndefined();
    expect("mode" in resolve(base)[0]!.edges.ab!).toBe(false);
    const states = resolve(branched);
    expect(states[0]!.edges.ab!.mode).toBe("call");
    expect(states[2]!.edges.ab!.mode).toBe("call");
  });

  it("is reported by diff", () => {
    const states = resolveScenario(branched, "late");
    expect(diff(states[0]!, states[1]!)).toContainEqual({ op: "~", type: "edge-mode", id: "ab", from: "a", to: "b", was: "call", now: "async" });
  });
});

describe("scenarios", () => {
  it("types scenario texts by scenario and step id", () => {
    const st = { short: "s", title: "t", body: "b" };
    const ok: ScenarioTexts<typeof branched> = { late: { label: "Late", steps: { "late-wait": st, "late-end": st } } };
    // @ts-expect-error a step the scenario does not have
    const extra: ScenarioTexts<typeof branched> = { late: { label: "Late", steps: { "late-wait": st, "late-end": st, nope: st } } };
    // @ts-expect-error a missing step text
    const missing: ScenarioTexts<typeof branched> = { late: { label: "Late", steps: { "late-wait": st } } };
    expect([ok, extra, missing]).toHaveLength(3);
  });

  it("keeps resolve() on the base story", () => {
    expect(resolve(branched)).toHaveLength(3);
  });

  it("branches from the base step and applies its own steps on top", () => {
    const states = resolveScenario(branched, "late");
    expect(scenarioSteps(branched, "late").map((s) => s.id)).toEqual(["one", "late-wait", "late-end"]);
    expect(branchIndex(branched, "late")).toBe(0);
    expect(states).toHaveLength(3);
    expect(states[0]).toEqual(resolve(branched)[0]);
    expect(states[1]!.nodes.b!.state).toBe("slow");
    expect(states[2]!.metrics.errors).toBe(90);
    // the base story is untouched
    expect(resolve(branched)[1]!.nodes.b!.state).toBe("ok");
  });

  it("rejects unknown scenarios, unknown branch points and reused step ids", async () => {
    expect(() => resolveScenario(branched, "nope")).toThrow(/unknown scenario/);
    const badFrom = { ...branched, scenarios: [{ ...branched.scenarios[0], from: "zzz" }] };
    expect(() => resolveScenario(badFrom, "late")).toThrow(/unknown step/);
    const clash = { ...branched, scenarios: [{ ...branched.scenarios[0], steps: [{ id: "two", kind: "case" as const }] }] };
    expect(() => resolveScenario(clash, "late")).toThrow(/duplicate/);

    const { validateLesson } = await import("./validate");
    expect(() => validateLesson(branched)).not.toThrow();
    expect(() => validateLesson(clash)).toThrow(/already used/);
    expect(() => validateLesson(badFrom)).toThrow(/unknown step/);
    const twice = { ...branched, scenarios: [branched.scenarios[0], { ...branched.scenarios[0], steps: [{ id: "x", kind: "case" as const }] }] };
    expect(() => validateLesson(twice)).toThrow(/duplicate scenario/);
    const fromLast = { ...branched, scenarios: [{ ...branched.scenarios[0], from: "three" }] };
    expect(() => validateLesson(fromLast)).toThrow(/last step/);
    const badMode = { ...branched, steps: [{ ...branched.steps[0], edges: { ab: { from: "a", to: "b", mode: "sync" } } }, ...branched.steps.slice(1)] };
    expect(() => validateLesson(badMode as unknown as typeof branched)).toThrow(/mode/);
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
