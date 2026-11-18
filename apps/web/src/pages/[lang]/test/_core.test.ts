import { LANGS, sections } from "@mufassall/content";
import { describe, expect, it } from "vitest";
import { test as strings } from "../../../i18n/learner";
import code from "../../../../public/test-core.js?raw";
import { type TestQuestion, questionsOf } from "./_bank";

interface Built {
  src: TestQuestion;
  options: string[];
  answer: number;
}
interface Core {
  PASS: number;
  MAX: number;
  rng(seed: number): () => number;
  shuffle<T>(list: T[], rand: () => number): T[];
  parseSeed(search: string): number | null;
  newSeed(random?: () => number): number;
  build(bank: TestQuestion[], seed: number, max?: number): Built[];
  score(qs: Built[], picks: number[]): { right: number; total: number; pct: number; pass: boolean; rows: { ok: boolean; pick: number }[] };
  record(prev: unknown, pct: number, date: Date): { best: number; last: number; at: string };
  ymd(d: Date): string;
  stepHref(lang: string, src: Pick<TestQuestion, "lesson" | "step" | "sc">): string;
}

// test-core.js is a plain browser script: run it with a stand-in `window`
const win: { mufassallTestCore?: Core } = {};
new Function("window", code)(win);
const core = win.mufassallTestCore!;

const bank: TestQuestion[] = Array.from({ length: 14 }, (_, i) => ({
  id: `l#s${i}`,
  lesson: "l",
  step: i,
  lessonTitle: "L",
  q: `q${i}`,
  options: ["a", "b", "c", "d"].slice(0, 2 + (i % 3)),
  answer: i % 2,
  why: "w",
}));

describe("seeded pick", () => {
  it("is deterministic per seed and differs between seeds", () => {
    const ids = (seed: number) => core.build(bank, seed).map((q) => q.src.id + q.options.join(""));
    expect(ids(42)).toEqual(ids(42));
    expect(ids(42)).not.toEqual(ids(43));
  });

  it("takes min(10, bank) distinct questions", () => {
    expect(core.build(bank, 7)).toHaveLength(10);
    expect(new Set(core.build(bank, 7).map((q) => q.src.id)).size).toBe(10);
    expect(core.build(bank.slice(0, 4), 7)).toHaveLength(4);
    expect(core.build([], 7)).toEqual([]);
  });

  it("shuffles options and keeps track of the right one", () => {
    let moved = 0;
    for (let seed = 1; seed <= 30; seed++)
      for (const q of core.build(bank, seed)) {
        expect([...q.options].sort()).toEqual([...q.src.options].sort());
        expect(q.options[q.answer]).toBe(q.src.options[q.src.answer]);
        if (q.answer !== q.src.answer) moved++;
      }
    expect(moved).toBeGreaterThan(0);
  });

  it("shuffle is a permutation and leaves the input alone", () => {
    const list = [1, 2, 3, 4, 5, 6];
    const out = core.shuffle(list, core.rng(9));
    expect([...out].sort()).toEqual(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("reads ?seed= and makes seeds in range", () => {
    expect(core.parseSeed("?seed=1234")).toBe(1234);
    expect(core.parseSeed("?x=1&seed=7")).toBe(7);
    expect(core.parseSeed("?seed=0")).toBeNull();
    expect(core.parseSeed("?seed=abc")).toBeNull();
    expect(core.parseSeed("?seed=12345678")).toBeNull();
    expect(core.parseSeed("")).toBeNull();
    expect(core.newSeed(() => 0)).toBe(1);
    expect(core.newSeed(() => 0.9999999)).toBe(999999);
  });
});

describe("scoring", () => {
  const qs = core.build(bank, 5);
  const picks = (right: number) => qs.map((q, i) => (i < right ? q.answer : (q.answer + 1) % q.options.length));

  it("passes at 70% and not below", () => {
    expect(core.score(qs, picks(7))).toMatchObject({ right: 7, total: 10, pct: 70, pass: true });
    expect(core.score(qs, picks(6))).toMatchObject({ right: 6, pct: 60, pass: false });
    expect(core.score(qs, picks(10)).pct).toBe(100);
  });

  it("counts a missing answer as wrong", () => {
    const r = core.score(qs, []);
    expect(r.right).toBe(0);
    expect(r.rows.every((x) => x.pick === -1 && !x.ok)).toBe(true);
    expect(core.score([], []).pass).toBe(false);
  });

  it("rounds the percent", () => {
    const three = core.build(bank, 5, 3);
    expect(core.score(three, [three[0]!.answer, three[1]!.answer, -1]).pct).toBe(67);
  });

  it("keeps the best score and the last one", () => {
    const d = new Date(2026, 0, 5);
    expect(core.record(undefined, 60, d)).toEqual({ best: 60, last: 60, at: "2026-01-05" });
    expect(core.record({ best: 90, last: 90, at: "x" }, 40, d)).toEqual({ best: 90, last: 40, at: "2026-01-05" });
    expect(core.record({ best: 50 }, 80, d).best).toBe(80);
  });

  it("links back to the step the player numbers from 1", () => {
    expect(core.stepHref("uz", { lesson: "caching", step: 0 })).toBe("/uz/l/caching/?step=1");
    expect(core.stepHref("en", { lesson: "webhooks", step: 4, sc: "late" })).toBe("/en/l/webhooks/?sc=late&step=5");
  });
});

describe("question bank", () => {
  it("has valid checks with unique ids in every section and language", () => {
    for (const lang of LANGS)
      for (const sec of sections) {
        const qs = questionsOf(sec.id, lang);
        expect(new Set(qs.map((q) => q.id)).size, `${lang}/${sec.id}`).toBe(qs.length);
        for (const q of qs) {
          expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
          expect(q.answer, q.id).toBeLessThan(q.options.length);
          expect(sec.lessons).toContain(q.lesson);
        }
      }
  });

  it("asks the same questions in every language", () => {
    for (const sec of sections) {
      const ids = (lang: (typeof LANGS)[number]) => questionsOf(sec.id, lang).map((q) => q.id);
      expect(ids("ru"), sec.id).toEqual(ids("uz"));
      expect(ids("en"), sec.id).toEqual(ids("uz"));
    }
  });
});

describe("test strings", () => {
  const flat = (v: object) => Object.entries(v) as [string, string][];
  it("exist in every language, uz/en without Cyrillic, uz with the ASCII apostrophe", () => {
    const keys = Object.keys(strings.en);
    for (const lang of LANGS) {
      expect(Object.keys(strings[lang]).sort()).toEqual([...keys].sort());
      for (const [k, v] of flat(strings[lang])) {
        expect(v.trim(), `${lang}.${k}`).toBeTruthy();
        if (lang !== "ru") expect(v, `${lang}.${k}`).not.toMatch(/[Ѐ-ӿ]/);
      }
    }
    for (const [k, v] of flat(strings.uz)) expect(v, k).not.toMatch(/[ʻʼ‘’]/);
  });
});
