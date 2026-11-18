import { describe, expect, it } from "vitest";
// the plain browser script sets a global when it runs
import "../../public/fsrs.js";

interface Card {
  s: number;
  d: number;
  due: number;
  last: number;
  reps: number;
  lapses: number;
  st: number;
}
interface Fsrs {
  W: number[];
  DECAY: number;
  FACTOR: number;
  RETENTION: number;
  LEARN_STEP: number;
  RELEARN_STEP: number;
  retrievability(t: number, s: number): number;
  interval(s: number, r: number): number;
  initStability(g: number): number;
  initDifficulty(g: number): number;
  nextDifficulty(d: number, g: number): number;
  recallStability(d: number, s: number, r: number, g: number): number;
  forgetStability(d: number, s: number, r: number): number;
  shortTermStability(s: number, g: number): number;
  seed(str: string): number;
  fuzz(ivl: number, u: number): number;
  newCard(): Card;
  next(card: Card | undefined, g: number, now: number, id?: string): Card;
  fromV1(v: { b: number; d: number }, now: number): Card;
  migrate(v1: Record<string, { b: number; d: number }>, now: number): Record<string, Card>;
}

const DAY = 864e5;
const NOW = Date.UTC(2026, 10, 18, 9);
const F = (globalThis as unknown as { MufassallFSRS: Fsrs }).MufassallFSRS;

describe("FSRS-5 formulas", () => {
  it("uses the published default parameters", () => {
    expect(F.W).toHaveLength(19);
    expect(F.W.slice(0, 4)).toEqual([0.40255, 1.18385, 3.173, 15.69105]);
    expect(F.DECAY).toBe(-0.5);
    expect(F.FACTOR).toBeCloseTo(19 / 81, 12);
    expect(F.RETENTION).toBe(0.9);
  });

  it("starts stability at w0..w3 for Again..Easy", () => {
    for (let g = 1; g <= 4; g++) expect(F.initStability(g)).toBe(F.W[g - 1]);
  });

  it("starts difficulty at w4 - e^(w5 (G-1)) + 1, clamped to 1..10", () => {
    const w = F.W as [number, number, number, number, number, number];
    for (let g = 1; g <= 4; g++)
      expect(F.initDifficulty(g)).toBeCloseTo(Math.min(10, Math.max(1, w[4] - Math.exp(w[5] * (g - 1)) + 1)), 12);
    expect(F.initDifficulty(1)).toBeCloseTo(7.1949, 4);
    expect(F.initDifficulty(3)).toBeCloseTo(7.1949 - Math.exp(0.5345 * 2) + 1, 12);
  });

  it("forgets as R(t, S) = (1 + F t / S)^C with F = 19/81, C = -0.5", () => {
    expect(F.retrievability(0, 5)).toBe(1);
    for (const s of [0.4, 1, 3.173, 30]) {
      expect(F.retrievability(s, s)).toBeCloseTo(0.9, 12);
      expect(F.retrievability(2 * s, s)).toBeCloseTo(Math.pow(1 + (19 / 81) * 2, -0.5), 12);
    }
  });

  it("gives an interval equal to S at retention 0.9, and inverts R", () => {
    for (const s of [0.5, 2, 15.69105, 100]) {
      expect(F.interval(s, 0.9)).toBeCloseTo(s, 9);
      expect(F.retrievability(F.interval(s, 0.8), s)).toBeCloseTo(0.8, 12);
    }
  });

  it("updates difficulty with linear damping and mean reversion", () => {
    const w = F.W;
    const d0easy = w[4]! - Math.exp(w[5]! * 3) + 1;
    const d = 5;
    const damped = d + (-w[6]! * (1 - 3) * (10 - d)) / 9;
    expect(F.nextDifficulty(d, 1)).toBeCloseTo(w[7]! * d0easy + (1 - w[7]!) * damped, 12);
    expect(F.nextDifficulty(d, 3)).toBeCloseTo(w[7]! * d0easy + (1 - w[7]!) * d, 12);
    expect(F.nextDifficulty(10, 1)).toBeLessThanOrEqual(10);
    expect(F.nextDifficulty(1, 4)).toBeGreaterThanOrEqual(1);
  });

  it("grows stability on recall: Easy > Good > Hard, and a lapse shrinks it", () => {
    const s = 10;
    const d = 5;
    const r = F.retrievability(10, s);
    const w = F.W;
    const good = s * (1 + Math.exp(w[8]!) * (11 - d) * Math.pow(s, -w[9]!) * (Math.exp(w[10]! * (1 - r)) - 1));
    expect(F.recallStability(d, s, r, 3)).toBeCloseTo(good, 9);
    expect(F.recallStability(d, s, r, 4)).toBeGreaterThan(F.recallStability(d, s, r, 3));
    expect(F.recallStability(d, s, r, 3)).toBeGreaterThan(F.recallStability(d, s, r, 2));
    expect(F.recallStability(d, s, r, 2)).toBeGreaterThan(s);
    const forget = w[11]! * Math.pow(d, -w[12]!) * (Math.pow(s + 1, w[13]!) - 1) * Math.exp(w[14]! * (1 - r));
    expect(F.forgetStability(d, s, r)).toBeCloseTo(Math.min(forget, s / Math.exp(w[17]! * w[18]!)), 9);
    expect(F.forgetStability(d, s, r)).toBeLessThan(s);
  });

  it("uses the short-term formula S e^(w17 (G - 3 + w18)) for same-day reviews", () => {
    expect(F.shortTermStability(2, 3)).toBeCloseTo(2 * Math.exp(F.W[17]! * F.W[18]!), 12);
  });
});

describe("scheduler", () => {
  it("graduates a new card on Good with an interval of about w2 days", () => {
    const c = F.next(F.newCard(), 3, NOW, "a/1");
    expect(c).toMatchObject({ st: 2, reps: 1, lapses: 0, last: NOW, s: F.W[2] });
    const days = (c.due - NOW) / DAY;
    expect(Number.isInteger(days)).toBe(true);
    expect(days).toBeGreaterThanOrEqual(2);
    expect(days).toBeLessThanOrEqual(4);
  });

  it("keeps a miss in this session (learning step), then graduates it", () => {
    const miss = F.next(F.newCard(), 1, NOW, "a/1");
    expect(miss).toMatchObject({ st: 1, s: F.W[0] });
    expect(miss.due).toBe(NOW + F.LEARN_STEP);
    const again = F.next(miss, 3, NOW + 30e3, "a/1");
    expect(again.st).toBe(2);
    expect(again.s).toBeCloseTo(F.W[0]! * Math.exp(F.W[17]! * F.W[18]!), 12);
    expect(again.due).toBe(NOW + 30e3 + DAY);
  });

  it("counts a lapse from review and sends it to relearning", () => {
    const c = F.next(F.next(F.newCard(), 3, NOW, "x"), 1, NOW + 5 * DAY, "x");
    expect(c).toMatchObject({ st: 3, lapses: 1, reps: 2 });
    expect(c.due).toBe(NOW + 5 * DAY + F.RELEARN_STEP);
  });

  it("is deterministic: the same history gives the same schedule", () => {
    const run = (id: string) => {
      let c = F.newCard();
      let at = NOW;
      const dues: number[] = [];
      for (const g of [3, 3, 1, 3, 4, 3, 2, 3]) {
        c = F.next(c, g, at, id);
        dues.push(c.due);
        at = Math.max(c.due, at + 60e3);
      }
      return dues;
    };
    expect(run("caching/3")).toEqual(run("caching/3"));
    expect(F.seed("caching/3:4")).toBe(F.seed("caching/3:4"));
    expect(F.seed("caching/3:4")).not.toBe(F.seed("caching/4:4"));
  });

  it("fuzzes within the reference ranges and not below 2.5 days", () => {
    expect(F.fuzz(2, 0.99)).toBe(2);
    for (const u of [0, 0.5, 0.999]) {
      const v = F.fuzz(30, u);
      expect(v).toBeGreaterThanOrEqual(Math.round(30 - (1 + 0.15 * 4.5 + 0.1 * 13 + 0.05 * 10)));
      expect(v).toBeLessThanOrEqual(Math.round(30 + (1 + 0.15 * 4.5 + 0.1 * 13 + 0.05 * 10)));
    }
    expect(F.fuzz(30, 0)).toBeLessThan(F.fuzz(30, 0.999));
  });
});

describe("v1 migration", () => {
  it("turns Leitner boxes into stabilities and keeps due dates", () => {
    const v1 = {
      "a/1": { b: 0, d: 0 },
      "a/2": { b: 1, d: NOW + DAY },
      "a/3": { b: 3, d: NOW - DAY },
      "a/4": { b: 5, d: NOW + 20 * DAY },
    };
    const v2 = F.migrate(v1, NOW);
    expect(v2["a/1"]).toEqual({ s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, st: 0 });
    expect(v2["a/2"]).toEqual({ s: 1, d: 5, due: NOW + DAY, last: NOW, reps: 1, lapses: 0, st: 2 });
    expect(v2["a/3"]).toEqual({ s: 7, d: 5, due: NOW - DAY, last: NOW - 8 * DAY, reps: 3, lapses: 0, st: 2 });
    expect(v2["a/4"]).toMatchObject({ s: 35, due: NOW + 20 * DAY, last: NOW - 15 * DAY, st: 2 });
    // a migrated card keeps scheduling from where it was
    const next = F.next(v2["a/3"], 3, NOW, "a/3");
    expect(next.s).toBeGreaterThan(7);
  });

  it("ignores broken rows", () => {
    expect(F.migrate({ x: null as unknown as { b: number; d: number } }, NOW)).toEqual({});
  });
});
