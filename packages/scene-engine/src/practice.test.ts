import type { EdgeState, Flow, NodeKind, NodeState, SceneState } from "@mufassall/scene-schema";
import { describe, expect, it } from "vitest";
// the engine does not depend on the content package; the test reaches it by path
import { lessons, order } from "../../../content/index";
import { checkRule } from "./challenges";
import { GRID_MAX, GRID_MIN, emptyDoc, sanitize } from "./lab";
import {
  collapse,
  explainState,
  finalState,
  fitAxis,
  kindPaths,
  parsePractice,
  practiceFor,
  practiceSlug,
  recordSolved,
  toSolution,
  today,
} from "./practice";
import { PRACTICE_UI } from "./practice-ui";

const eligible = order
  .map((slug) => ({ slug, entry: lessons[slug]! }))
  .map(({ slug, entry }) => ({ slug, p: practiceFor(entry.lesson, entry.text.en.nodes as Record<string, string>) }))
  .filter((x): x is { slug: string; p: NonNullable<typeof x.p> } => x.p !== null);

describe("practice from lessons", () => {
  it("finds eligible lessons", () => {
    console.log(`practice: ${eligible.length} of ${order.length} lessons eligible`);
    for (const { slug, p } of eligible.slice(0, 3)) console.log(slug, JSON.stringify(p.rules));
    expect(eligible.length).toBeGreaterThan(order.length / 3);
  });

  it.each(eligible.map((x) => [x.slug, x.p] as const))("%s: its own final scene passes, an empty canvas fails", (_slug, p) => {
    // through sanitize, exactly as the Lab loads it from the JSON endpoint
    const solution = sanitize(JSON.parse(JSON.stringify(p.solution)));
    expect(Object.keys(solution.nodes).length).toBe(Object.keys(p.solution.nodes).length);
    for (const r of p.rules) expect(checkRule(solution, r), JSON.stringify(r)).toBe(true);
    expect(p.rules.every((r) => checkRule(emptyDoc(), r))).toBe(false);
    expect(p.rules.some((r) => r.kind === "path")).toBe(true);
    expect(p.hints.kinds.length).toBeGreaterThan(0);
    expect(p.hints.paths.length).toBeGreaterThan(0);
  });

  // every lesson, with the reason if one is not: practice-all.test.ts holds the hard guarantee
  it("ineligible lessons are reported with the guard that stopped them", () => {
    const out: string[] = [];
    for (const slug of order) {
      if (eligible.some((x) => x.slug === slug)) continue;
      const why = explainState(finalState(lessons[slug]!.lesson)!).blocker;
      expect(why, slug).toBeTruthy();
      out.push(`${slug} (${why})`);
    }
    console.log(`practice: not eligible: ${out.join(", ") || "none"}`);
  });
});

const scene = (nodes: [string, NodeKind, number, number][], edges: [string, string, Flow?][]): SceneState => ({
  nodes: Object.fromEntries(nodes.map(([id, kind, x, y]) => [id, { id, kind, at: [x, y], state: "ok" } as NodeState])),
  edges: Object.fromEntries(edges.map(([from, to, flow = "request"], i) => [`e${i}`, { id: `e${i}`, from, to, flow, rate: 1, cut: false } as EdgeState])),
  metrics: {},
  focus: [],
});

describe("where request walks start", () => {
  it("a client that sends wins; one that only receives does not count", () => {
    const s = scene(
      [["u", "client", 0, 0], ["a", "service", 2, 0], ["d", "db", 4, 0], ["p", "actor", 6, 0]],
      [["u", "a"], ["a", "d"], ["a", "p"]],
    );
    expect(kindPaths(s)).toContainEqual(["client", "service", "db"]);
    const noClient = scene([["a", "service", 2, 0], ["d", "db", 4, 0], ["p", "actor", 6, 0]], [["a", "d"], ["a", "p"]]);
    expect(kindPaths(noClient)).toEqual([["service", "db"], ["service", "actor"]]);
  });

  it("a provider calling back starts the walk, and an ack does not make it a receiver", () => {
    const s = scene(
      [["provider", "external", 0, 6], ["api", "service", 2, 4], ["store", "db", 7, 5], ["q", "queue", 4, 2], ["w", "worker", 6, 0]],
      [["provider", "api"], ["api", "store"], ["api", "q"], ["q", "w"], ["w", "store"], ["store", "provider", "ack"]],
    );
    const paths = kindPaths(s);
    expect(paths).toContainEqual(["external", "service", "db"]);
    expect(paths).toContainEqual(["external", "service", "queue", "worker", "db"]);
    const p = explainState(s);
    expect(p.blocker).toBeUndefined();
    for (const r of p.practice!.rules) expect(checkRule(p.practice!.solution, r), JSON.stringify(r)).toBe(true);
  });

  it("a request cycle with no source starts everywhere", () => {
    const s = scene([["a", "service", 0, 0], ["b", "worker", 2, 0], ["c", "db", 4, 0]], [["a", "b"], ["b", "a"], ["b", "c"]]);
    expect(kindPaths(s).length).toBeGreaterThan(0);
  });
});

describe("grid fit", () => {
  it("only shifts a range that fits", () => {
    expect([...fitAxis([-2, 0, 5])!.values()]).toEqual([0, 2, 7]);
    expect([...fitAxis([3, 15])!.values()]).toEqual([0, 12]);
  });
  it("squeezes a wider or fractional range, keeping order and never merging", () => {
    const m = fitAxis([0, 1, 2, 3, 40])!;
    const cells = [0, 1, 2, 3, 40].map((v) => m.get(v)!);
    expect(cells.every((c, i) => i === 0 || c > cells[i - 1]!)).toBe(true);
    expect(Math.min(...cells)).toBeGreaterThanOrEqual(GRID_MIN);
    expect(Math.max(...cells)).toBeLessThanOrEqual(GRID_MAX);
    expect(fitAxis([0, 0.5, 1])!.get(0.5)).toBe(6);
    expect(fitAxis(Array.from({ length: 14 }, (_, i) => i * 3))).toBeNull();
  });
  it("a scene wider than the grid becomes a solution with every block", () => {
    const s = scene([["u", "client", -10, 0], ["a", "service", 0, 4], ["d", "db", 30, 9]], [["u", "a"], ["a", "d"]]);
    const doc = toSolution(s, {})!;
    expect(Object.keys(doc.nodes)).toHaveLength(3);
    expect(explainState(s).blocker).toBeUndefined();
  });
});

describe("caching rubric", () => {
  const entry = lessons.caching!;
  const p = practiceFor(entry.lesson, entry.text.en.nodes as Record<string, string>)!;
  const pass = (d: ReturnType<typeof sanitize>) => p.rules.every((r) => checkRule(d, r));

  it("asks for a cache between the app and the database", () => {
    expect(p.rules).toContainEqual({ kind: "count", node: "cache", min: 1 });
    expect(p.rules).toContainEqual({ kind: "path", kinds: ["client", "service", "cache"] });
    expect(p.rules).toContainEqual({ kind: "noEdge", from: "client", to: "db" });
    expect(p.solution.labels.cache).toBe("Cache (Redis)");
  });

  it("a client wired straight to the database fails", () => {
    const d = sanitize(JSON.parse(JSON.stringify(p.solution)));
    const client = Object.values(d.nodes).find((n) => n.kind === "client")!;
    const db = Object.values(d.nodes).find((n) => n.kind === "db")!;
    d.edges.short = { id: "short", from: client.id, to: db.id, flow: "request", rate: 1, cut: false };
    expect(pass(d)).toBe(false);
  });

  it("extra blocks and a balancer in the path are fine", () => {
    const d = sanitize(JSON.parse(JSON.stringify(p.solution)));
    const client = Object.values(d.nodes).find((n) => n.kind === "client")!;
    const free = [0, 1, 2, 3, 4, 5, 6].map((y): [number, number] => [12, y]).filter(([x, y]) => !Object.values(d.nodes).some((n) => n.at[0] === x && n.at[1] === y));
    d.nodes.lb = { id: "lb", kind: "lb", at: free[0]!, state: "ok" };
    d.nodes.extra = { id: "extra", kind: "cdn", at: free[1]!, state: "ok" };
    for (const e of Object.values(d.edges)) {
      if (e.from !== client.id) continue;
      d.edges[`via-${e.id}`] = { ...e, id: `via-${e.id}`, from: "lb" };
      d.edges[e.id] = { ...e, to: "lb" };
    }
    expect(pass(d)).toBe(true);
  });
});

describe("path matching", () => {
  const doc = sanitize({
    nodes: {
      u: { kind: "client", at: [0, 0] },
      a: { kind: "service", at: [2, 0] },
      b: { kind: "service", at: [4, 0] },
      d: { kind: "db", at: [6, 0] },
    },
    edges: { e1: { from: "u", to: "a" }, e2: { from: "a", to: "b" }, e3: { from: "b", to: "d" }, back: { from: "d", to: "u", flow: "ack" } },
    labels: {},
  });
  it("a kind may repeat, the order may not change", () => {
    expect(checkRule(doc, { kind: "path", kinds: ["client", "service", "db"] })).toBe(true);
    expect(checkRule(doc, { kind: "path", kinds: ["client", "db"] })).toBe(false);
    expect(checkRule(doc, { kind: "path", kinds: ["db", "client"] })).toBe(false);
  });
  it("noEdge needs both kinds on the diagram", () => {
    expect(checkRule(doc, { kind: "noEdge", from: "client", to: "db" })).toBe(true);
    expect(checkRule(doc, { kind: "noEdge", from: "client", to: "cache" })).toBe(false);
  });
  it("collapses repeats", () => {
    expect(collapse(["client", "service", "service", "db"])).toEqual(["client", "service", "db"]);
  });
});

describe("practice strings", () => {
  const walk = (v: unknown, path: string, out: Map<string, string>) => {
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, out);
    else out.set(path, String(v));
    return out;
  };
  it("every key in every language, no Cyrillic in uz/en", () => {
    const maps = Object.fromEntries((["uz", "ru", "en"] as const).map((l) => [l, walk(PRACTICE_UI[l], "", new Map())]));
    const keys = new Set(Object.values(maps).flatMap((m) => [...m.keys()]));
    for (const l of ["uz", "ru", "en"] as const)
      for (const k of keys) {
        const v = maps[l]!.get(k);
        expect(v?.trim(), `${l}.${k}`).toBeTruthy();
        if (l !== "ru") expect(/[Ѐ-ӿ]/.test(v!), `${l}.${k}`).toBe(false);
      }
  });
});

describe("practice file", () => {
  const entry = lessons.caching!;
  const p = practiceFor(entry.lesson, entry.text.en.nodes as Record<string, string>)!;
  const file = JSON.parse(JSON.stringify({ slug: "caching", title: "Caching", ...p }));
  it("round-trips through JSON", () => {
    expect(parsePractice(file, "caching")).toEqual({ slug: "caching", title: "Caching", ...p });
  });
  it("rejects a wrong slug and drops unknown rules", () => {
    expect(parsePractice(file, "cdn")).toBeNull();
    expect(parsePractice(null, "caching")).toBeNull();
    const odd = { ...file, rules: [...file.rules, { kind: "load", rps: 1e9 }, { kind: "path", kinds: ["client", "<x>"] }] };
    expect(parsePractice(odd, "caching")!.rules).toEqual(p.rules);
  });
  it("reads the slug from the query and records the day", () => {
    expect(practiceSlug("?practice=caching")).toBe("caching");
    expect(practiceSlug("?practice=../x")).toBeNull();
    expect(practiceSlug("")).toBeNull();
    expect(recordSolved('{"cdn":"2026-01-02"}', "caching", "2026-11-18")).toEqual({ cdn: "2026-01-02", caching: "2026-11-18" });
    expect(recordSolved("not json", "caching", "2026-11-18")).toEqual({ caching: "2026-11-18" });
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
