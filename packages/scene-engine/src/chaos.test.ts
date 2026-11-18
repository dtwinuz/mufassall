import { describe, expect, it } from "vitest";
import { CHAOS_UI } from "./chaos-ui";
import { EXPERIMENT_KINDS, type Experiment, applyExperiment, chaosView, defaultExperiment, explain, isValid } from "./chaos";
import { encodeDoc, sanitize } from "./lab";
import { simulate } from "./sim";

const shop = () =>
  sanitize({
    nodes: {
      users: { kind: "client", at: [0, 0] },
      lb: { kind: "lb", at: [2, 0] },
      a: { kind: "service", at: [4, 0] },
      b: { kind: "service", at: [4, 2] },
      cache: { kind: "cache", at: [6, 0] },
      db: { kind: "db", at: [8, 0] },
    },
    edges: {
      in: { from: "users", to: "lb" },
      la: { from: "lb", to: "a" },
      lb2: { from: "lb", to: "b" },
      ac: { from: "a", to: "cache" },
      bc: { from: "b", to: "cache" },
      cd: { from: "cache", to: "db" },
    },
    labels: {},
  });

const run = (exp: Experiment, rps: number, doc = shop()) => {
  const applied = applyExperiment(doc, exp, rps);
  const before = simulate(doc, rps);
  const after = simulate(applied.doc, applied.rps, applied.opts);
  return { applied, after, report: explain(applied, before, after) };
};

describe("chaos experiments", () => {
  it("never touch the reader's diagram", () => {
    const doc = shop();
    const code = encodeDoc(doc);
    for (const k of EXPERIMENT_KINDS) {
      const exp = defaultExperiment(doc, k, simulate(doc, 1000))!;
      applyExperiment(doc, exp, 1000);
    }
    expect(encodeDoc(doc)).toBe(code);
  });

  it("are deterministic", () => {
    const exp: Experiment = { kind: "killKind", node: "cache" };
    expect(run(exp, 1000).report).toEqual(run(exp, 1000).report);
  });

  it("one service down behind a balancer: survives", () => {
    const { report } = run({ kind: "killNode", target: "a" }, 400);
    expect(report.survived).toBe(true);
    expect(report.findings[0]).toEqual({ type: "down", id: "a", lost: 0 });
    // b now carries 400/s alone: 20/(1-2/3) = 60 ms instead of 20/(1-1/3) = 30 ms
    expect(report.findings[1]).toMatchObject({ type: "latency" });
  });

  it("all caches killed → cold: the db takes everything and times out", () => {
    const { applied, after, report } = run({ kind: "killKind", node: "cache" }, 1000);
    expect(applied.how).toBe("cold");
    expect(after.nodes.db!.rps).toBeCloseTo(1000);
    expect(report.survived).toBe(false);
    expect(report.findings[0]).toEqual({ type: "cold", id: "cache", through: 1000 });
    const hot = report.findings.find((f) => f.type === "overload");
    expect(hot).toMatchObject({ id: "db" });
    expect(hot && "rho" in hot && hot.rho).toBeCloseTo(1.25);
    expect(report.errorRate).toBeCloseTo(0.2);
  });

  it("the db killed: its share is lost", () => {
    const { report } = run({ kind: "killKind", node: "db" }, 1000);
    expect(report.findings[0]).toMatchObject({ type: "down", id: "db" });
    expect(report.findings[0]!.type === "down" && report.findings[0]!.lost).toBeCloseTo(100);
  });

  it("a slow db: ten times the time, a tenth of the capacity", () => {
    const { report } = run({ kind: "slowNode", target: "db" }, 1000);
    // db gets 100/s, capacity 800/10 = 80
    expect(report.findings.map((f) => f.type)).toEqual(expect.arrayContaining(["slow", "overload"]));
    const o = report.findings.find((f) => f.type === "overload");
    expect(o && "rho" in o && o.rho).toBeCloseTo(1.25);
  });

  it("a traffic spike overloads the services", () => {
    const { applied, report } = run({ kind: "spike" }, 200);
    expect(applied.rps).toBe(2000);
    expect(report.findings[0]).toEqual({ type: "spike", rps: 2000 });
    expect(report.findings.filter((f) => f.type === "overload").map((f) => (f as { id: string }).id)).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("a cut link loses what went over it", () => {
    const { report, applied } = run({ kind: "cutLink", target: "cd" }, 1000);
    expect(applied.doc.edges.cd!.cut).toBe(true);
    expect(report.findings[0]!.type).toBe("cut");
    expect(report.findings[0]!.type === "cut" && report.findings[0]!.lost).toBeCloseTo(100);
    expect(report.findings.some((f) => f.type === "stranded")).toBe(false);
  });

  it("a balancer with every target down is stranded", () => {
    const { report } = run({ kind: "killKind", node: "service" }, 400);
    expect(report.findings).toContainEqual({ type: "stranded", id: "lb", lost: 400 });
  });

  it("a cold cache with nothing behind it loses everything it used to answer", () => {
    const doc = shop();
    delete doc.edges.cd;
    const { report } = run({ kind: "killKind", node: "cache" }, 1000, doc);
    // warm: 900 answered, 100 lost for want of a db link; cold: all 1000 lost
    expect(report.findings).toContainEqual({ type: "stranded", id: "cache", lost: 1000 });
  });

  it("a slow external API ripples back as latency", () => {
    const doc = sanitize({
      nodes: { u: { kind: "client", at: [0, 0] }, s: { kind: "service", at: [2, 0] }, x: { kind: "external", at: [4, 0] } },
      edges: { us: { from: "u", to: "s" }, sx: { from: "s", to: "x" } },
      labels: {},
    });
    const { report } = run({ kind: "slowExternal" }, 20, doc);
    // external x10: base 1200 ms, cap 40; at 20/s rho 0.5 → 2400 ms
    expect(report.findings[0]).toMatchObject({ type: "slow", id: "x" });
    expect(report.findings.find((f) => f.type === "latency")).toBeTruthy();
    expect(run({ kind: "slowExternal" }, 20).report.findings).toEqual([{ type: "nothing" }]);
  });

  it("aims at the busiest node and drops a stale target", () => {
    const doc = shop();
    expect(defaultExperiment(doc, "killKind")).toEqual({ kind: "killKind", node: "cache" });
    expect(defaultExperiment(doc, "killNode", simulate(doc, 1000))).toEqual({ kind: "killNode", target: "lb" });
    expect(defaultExperiment(sanitize({}), "killNode")).toBeNull();
    const gone = { ...doc, nodes: { ...doc.nodes } };
    delete gone.nodes.a;
    expect(isValid(gone, { kind: "killNode", target: "a" })).toBe(false);
    expect(isValid(doc, { kind: "cutLink", target: "cd" })).toBe(true);
  });

  it("draws a slowed node slow", () => {
    const doc = shop();
    const applied = applyExperiment(doc, { kind: "slowNode", target: "cache" }, 10);
    expect(chaosView(doc, applied).nodes.cache!.state).toBe("slow");
    expect(chaosView(doc, applyExperiment(doc, { kind: "spike" }, 10))).toBe(doc);
  });
});

describe("chaos strings", () => {
  const walk = (v: unknown, path: string, out: Map<string, string>) => {
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, out);
    else out.set(path, String(v));
    return out;
  };
  it("every key in every language, no empty, no Cyrillic in uz/en", () => {
    const maps = Object.fromEntries((["uz", "ru", "en"] as const).map((l) => [l, walk(CHAOS_UI[l], "", new Map())]));
    const keys = [...maps.en!.keys()];
    for (const l of ["uz", "ru"]) expect([...maps[l]!.keys()].sort()).toEqual([...keys].sort());
    for (const [l, m] of Object.entries(maps))
      for (const [k, v] of m) {
        expect(v.trim(), `${l}.${k}`).not.toBe("");
        if (l !== "ru") expect(/[Ѐ-ӿ]/.test(v), `${l}.${k}`).toBe(false);
      }
    for (const k of EXPERIMENT_KINDS) expect(CHAOS_UI.en.names[k]).toBeTruthy();
  });
});
