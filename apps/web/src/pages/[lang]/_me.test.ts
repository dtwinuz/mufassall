import { describe, expect, it } from "vitest";
import { me as strings } from "../../i18n/learner";
import code from "../../../public/me-core.js?raw";

type Data = Record<string, string>;
interface Merged {
  data: Data;
  changed: string[];
  counts: Record<"lessons" | "checks" | "cards" | "tests" | "days" | "other", number>;
  total: number;
}
interface Overview {
  sections: { id: string; done: number; started: number; total: number; lessons: { slug: string; state: string }[] }[];
  lessonsDone: number;
  lessonsTotal: number;
  next: { slug: string; step: number } | null;
  certificate: boolean;
  streak: { current: number; best: number };
  goal: { id: string; done: number; target: number };
  review: { total: number; due: number; recall: number | null };
  tests: Record<string, { best: number; last: number; at: string; pass: boolean }>;
  empty: boolean;
}
interface Core {
  MAX_BYTES: number;
  ymd(d: Date): string;
  isPreference(k: string): boolean;
  envelope(data: Data, now: Date): { app: string; version: number; exported: string; data: Data };
  fileName(now: Date): string;
  toCode(text: string): string;
  fromCode(code: string): string | null;
  parse(text: string): { ok: true; data: Data; exported: string | null } | { ok: false; error: string };
  merge(local: Data, incoming: Data): Merged;
  streak(days: string[], today: Date): { current: number; best: number };
  overview(data: Data, course: { id: string; lessons: { slug: string; steps: number }[] }[], now: number, retr?: (t: number, s: number) => number): Overview;
}

// me-core.js is a plain browser script: run it with a stand-in `window`
const win: { mufassallMeCore?: Core } = {};
new Function("window", code)(win);
const core = win.mufassallMeCore!;
const J = JSON.stringify;
const wrap = (data: unknown, extra: Record<string, unknown> = {}) => J({ app: "mufassall", version: 1, exported: "2026-11-18T10:00:00.000Z", data, ...extra });

describe("export", () => {
  it("keeps only mufassall:* string values and names the file by local date", () => {
    const now = new Date(2026, 10, 8, 23, 30);
    const env = core.envelope({ "mufassall:v1:goal": '"c5"', other: "x", "mufassall:theme": "dark" }, now);
    expect(env).toMatchObject({ app: "mufassall", version: 1, data: { "mufassall:v1:goal": '"c5"', "mufassall:theme": "dark" } });
    expect(Object.keys(env.data)).toHaveLength(2);
    expect(env.exported).toBe(now.toISOString());
    expect(core.fileName(now)).toBe("mufassall-progress-2026-11-08.json");
  });

  it("transfer code is base64url of UTF-8 and round-trips", () => {
    const text = wrap({ "mufassall:v1:lab": J({ name: "Ўзбек ‘sxema’ 🚀" }) });
    const c = core.toCode(text);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(core.fromCode(c)).toBe(text);
    expect(core.fromCode(`  ${c.slice(0, 20)}\n${c.slice(20)} `)).toBe(text);
    expect(core.fromCode("not a code!")).toBeNull();
  });
});

describe("import checks", () => {
  const good = { "mufassall:v1:progress": J({ a: 2 }) };
  it("accepts JSON and the code", () => {
    const r = core.parse(wrap(good));
    expect(r.ok && r.data).toEqual(good);
    expect(r.ok && r.exported).toBe("2026-11-18T10:00:00.000Z");
    expect(core.parse(core.toCode(wrap(good))).ok).toBe(true);
  });
  it.each([
    ["", "empty"],
    ["{nope", "json"],
    ["%%%", "json"],
    [J([1, 2]), "json"],
    [wrap(good, { app: "other" }), "app"],
    [wrap(good, { version: 2 }), "version"],
    [wrap(null), "json"],
    [wrap({ "evil:key": "x" }), "keys"],
    [wrap({ "mufassall:v1:progress": { a: 1 } }), "values"],
    [wrap({}), "empty"],
  ])("rejects %s as %s", (text, error) => {
    expect(core.parse(text)).toEqual({ ok: false, error });
  });
  it("rejects 1 MB and more", () => {
    const big = wrap({ "mufassall:v1:lab": "x".repeat(core.MAX_BYTES) });
    expect(core.parse(big)).toEqual({ ok: false, error: "size" });
    expect(core.parse(core.toCode(big))).toEqual({ ok: false, error: "size" });
  });
});

describe("merge", () => {
  it("review cards: the later `last` wins, new cards are added", () => {
    const local = { "mufassall:v2:review": J({ a: { s: 3, last: 100, due: 5 }, b: { s: 9, last: 500, due: 9 } }) };
    const inc = { "mufassall:v2:review": J({ a: { s: 7, last: 200, due: 6 }, b: { s: 1, last: 400, due: 1 }, c: { s: 1, last: 1, due: 1 } }) };
    const m = core.merge(local, inc);
    expect(JSON.parse(m.data["mufassall:v2:review"]!)).toEqual({
      a: { s: 7, last: 200, due: 6 },
      b: { s: 9, last: 500, due: 9 },
      c: { s: 1, last: 1, due: 1 },
    });
    expect(m.counts.cards).toBe(2);
  });

  it("tests: higher best, last score and date from the later attempt", () => {
    const local = { "mufassall:v1:tests": J({ x: { best: 90, last: 60, at: "2026-11-01" }, y: { best: 50, last: 50, at: "2026-11-10" } }) };
    const inc = { "mufassall:v1:tests": J({ x: { best: 80, last: 80, at: "2026-11-05" }, y: { best: 40, last: 40, at: "2026-11-02" }, z: { best: 70, last: 70, at: "2026-11-03" } }) };
    const m = core.merge(local, inc);
    expect(JSON.parse(m.data["mufassall:v1:tests"]!)).toEqual({
      x: { best: 90, last: 80, at: "2026-11-05" },
      y: { best: 50, last: 50, at: "2026-11-10" },
      z: { best: 70, last: 70, at: "2026-11-03" },
    });
    expect(m.counts.tests).toBe(2);
  });

  it("days: union, sorted; today's counters take the larger value", () => {
    const local = { "mufassall:v1:days": J(["2026-11-02", "2026-11-04"]), "mufassall:v1:day": J({ d: "2026-11-04", s: 3, c: 1 }) };
    const inc = { "mufassall:v1:days": J(["2026-11-01", "2026-11-04", "bad"]), "mufassall:v1:day": J({ d: "2026-11-04", s: 1, c: 6 }) };
    const m = core.merge(local, inc);
    expect(JSON.parse(m.data["mufassall:v1:days"]!)).toEqual(["2026-11-01", "2026-11-02", "2026-11-04"]);
    expect(JSON.parse(m.data["mufassall:v1:day"]!)).toEqual({ d: "2026-11-04", s: 3, c: 6 });
    expect(m.counts.days).toBe(1);
    // an older day record changes nothing
    expect(core.merge(local, { "mufassall:v1:day": J({ d: "2026-11-01", s: 9, c: 9 }) }).changed).toEqual([]);
  });

  it("progress: max per lesson; checks: the first answer stays; seen follows the merged data", () => {
    const local = { "mufassall:v1:progress": J({ a: 4, b: 1 }), "mufassall:v1:checks": J({ "a/1": false }), "mufassall:v1:seen": J({ p: 5, c: 1 }) };
    const inc = { "mufassall:v1:progress": J({ a: 2, b: 6, c: 0 }), "mufassall:v1:checks": J({ "a/1": true, "b/2": true }), "mufassall:v1:seen": J({ p: 99, c: 99 }) };
    const m = core.merge(local, inc);
    expect(JSON.parse(m.data["mufassall:v1:progress"]!)).toEqual({ a: 4, b: 6, c: 0 });
    expect(JSON.parse(m.data["mufassall:v1:checks"]!)).toEqual({ "a/1": false, "b/2": true });
    expect(JSON.parse(m.data["mufassall:v1:seen"]!)).toEqual({ p: 10, c: 2 });
    expect(m.counts).toMatchObject({ lessons: 2, checks: 1 });
  });

  it("lists union; unknown keys keep this device's value and add missing ones", () => {
    const local = { "mufassall:v1:lab:solved": J(["a"]), "mufassall:v1:goal": J("c5"), "mufassall:v1:lab": "mine" };
    const inc = { "mufassall:v1:lab:solved": J(["b", "a"]), "mufassall:v1:goal": J("c10"), "mufassall:v1:lab": "theirs", "mufassall:v9:new": "x" };
    const m = core.merge(local, inc);
    expect(JSON.parse(m.data["mufassall:v1:lab:solved"]!)).toEqual(["a", "b"]);
    expect(m.data["mufassall:v1:goal"]).toBe(J("c5"));
    expect(m.data["mufassall:v1:lab"]).toBe("mine");
    expect(m.data["mufassall:v9:new"]).toBe("x");
    expect(m.changed.sort()).toEqual(["mufassall:v1:lab:solved", "mufassall:v9:new"]);
  });

  it("is idempotent and a broken incoming value never replaces a good one", () => {
    const local = { "mufassall:v1:progress": J({ a: 1 }), "mufassall:v2:review": J({ a: { last: 1 } }) };
    const once = core.merge(local, { "mufassall:v1:progress": J({ a: 3 }) }).data;
    expect(core.merge(once, { "mufassall:v1:progress": J({ a: 3 }) }).total).toBe(0);
    const m = core.merge(local, { "mufassall:v1:progress": "{broken", "mufassall:v2:review": "[]" });
    expect(m.changed).toEqual([]);
    expect(m.data).toEqual(local);
  });

  it("whole new keys count their entries", () => {
    const m = core.merge({}, { "mufassall:v1:progress": J({ a: 1, b: 2 }), "mufassall:v1:days": J(["2026-11-01"]) });
    expect(m.counts).toMatchObject({ lessons: 2, days: 1 });
    expect(m.changed).toContain("mufassall:v1:seen");
  });
});

describe("overview", () => {
  const course = [
    { id: "s1", lessons: [{ slug: "a", steps: 5 }, { slug: "b", steps: 3 }] },
    { id: "s2", lessons: [{ slug: "c", steps: 2 }] },
  ];
  const now = new Date(2026, 10, 18, 12).getTime();

  it("is empty for a new visitor and points at the first lesson", () => {
    const o = core.overview({}, course, now);
    expect(o).toMatchObject({ empty: true, lessonsDone: 0, lessonsTotal: 3, next: { slug: "a", step: 0 }, certificate: false });
    expect(o.review).toEqual({ total: 0, due: 0, recall: null });
  });

  it("counts lessons, streak, goal, review and tests from stored data", () => {
    const data = {
      "mufassall:v1:progress": J({ a: 4, b: 1, c: 1 }),
      "mufassall:v1:days": J(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-17", "2026-11-18"]),
      "mufassall:v1:day": J({ d: "2026-11-18", s: 2, c: 7 }),
      "mufassall:v1:goal": J("c5"),
      "mufassall:v2:review": J({
        x: { s: 10, st: 2, last: now - 864e5, due: now - 1 },
        y: { s: 10, st: 2, last: now - 864e5, due: now + 864e5 },
        gone: { s: 1, st: 2, last: 1, due: 1 },
      }),
      "mufassall:v1:review:known": J(["x", "y"]),
      "mufassall:v1:tests": J({ s1: { best: 70, last: 40, at: "2026-11-12" }, s2: { best: 60, last: 60, at: "2026-11-13" } }),
    };
    const o = core.overview(data, course, now, () => 0.9);
    expect(o.empty).toBe(false);
    expect(o.sections.map((s) => [s.done, s.started, s.total])).toEqual([[1, 1, 2], [1, 0, 1]]);
    expect(o.next).toEqual({ slug: "b", step: 2 });
    expect(o.streak).toEqual({ current: 2, best: 3 });
    expect(o.goal).toEqual({ id: "c5", done: 5, target: 5 });
    expect(o.review).toEqual({ total: 2, due: 1, recall: 90 });
    expect(o.tests.s1!.pass).toBe(true);
    expect(o.tests.s2!.pass).toBe(false);
  });

  it("gives the certificate when every lesson is done; streak survives until today ends", () => {
    const o = core.overview({ "mufassall:v1:progress": J({ a: 4, b: 2, c: 1 }) }, course, now);
    expect(o.certificate).toBe(true);
    expect(o.next).toBeNull();
    expect(core.streak(["2026-11-16", "2026-11-17"], new Date(now))).toEqual({ current: 2, best: 2 });
    expect(core.streak(["2026-11-15"], new Date(now))).toEqual({ current: 0, best: 1 });
  });

  it("keeps settings on reset", () => {
    expect(core.isPreference("mufassall:theme")).toBe(true);
    expect(core.isPreference("mufassall:v1:progress")).toBe(false);
  });
});

function flat(value: unknown, path = "", out = new Map<string, string>()) {
  if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flat(v, path ? `${path}.${k}` : k, out);
  else out.set(path, String(value));
  return out;
}

describe("me strings", () => {
  const maps = { uz: flat(strings.uz), ru: flat(strings.ru), en: flat(strings.en) };
  const keys = new Set(Object.values(maps).flatMap((m) => [...m.keys()]));
  it("exist and are not empty in every language", () => {
    for (const key of keys) for (const m of Object.values(maps)) expect(m.get(key)?.trim(), key).toBeTruthy();
  });
  it("carry no Cyrillic in uz and en, Uzbek uses the ASCII apostrophe, placeholders match", () => {
    for (const lang of ["uz", "en"] as const) for (const [k, v] of maps[lang]) expect(v, `${lang}.${k}`).not.toMatch(/[Ѐ-ӿ]/);
    for (const [k, v] of maps.uz) expect(v, k).not.toMatch(/[ʻʼ‘’]/);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const key of keys) for (const l of ["uz", "ru"] as const) expect(ph(maps[l].get(key)!), `${l}.${key}`).toBe(ph(maps.en.get(key)!));
  });
});
