import { describe, expect, it } from "vitest";
// the engine does not depend on the content package; the test reaches it by path
import { lessons, order } from "../../../content/index";
import { checkRule } from "./challenges";
import { emptyDoc, sanitize } from "./lab";
import { collapse, finalState, kindPaths, parsePractice, practiceFor, practiceSlug, recordSolved, toSolution, today } from "./practice";
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

  // practiceFor also drops a lesson whose own scene fails its rubric; this proves none is dropped for that
  it("ineligible lessons are only too small, pathless or too wide for the grid", () => {
    const out: string[] = [];
    for (const slug of order) {
      if (eligible.some((x) => x.slug === slug)) continue;
      const s = finalState(lessons[slug]!.lesson)!;
      const why = Object.keys(s.nodes).length < 3 ? "small" : kindPaths(s).length === 0 ? "no path" : !toSolution(s, {}) ? "too wide" : "";
      expect(why, slug).not.toBe("");
      out.push(`${slug} (${why})`);
    }
    console.log(`practice: not eligible: ${out.join(", ") || "none"}`);
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
