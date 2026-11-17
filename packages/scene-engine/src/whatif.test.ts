import { describe, expect, it } from "vitest";
import {
  WHATIF,
  bucketModel,
  cacheModel,
  clampParam,
  defaultsOf,
  erlangC,
  fmt,
  littleModel,
  percentDecimals,
  queueModel,
  readParams,
  retryModel,
  writeParams,
} from "./whatif";
import { WHATIF_UI } from "./whatif-ui";

describe("erlangC", () => {
  it("matches hand-computed M/M/c cases", () => {
    // c = 2, a = 1: [1/2! · 1/(1 − 0.5)] / [1 + 1 + 1] = 1/3
    expect(erlangC(2, 1)).toBeCloseTo(1 / 3, 12);
    // c = 3, a = 2: (8/6 · 3) / (1 + 2 + 2 + 4) = 4/9
    expect(erlangC(3, 2)).toBeCloseTo(4 / 9, 12);
    // M/M/1: the chance to wait equals the utilisation
    expect(erlangC(1, 0.8)).toBeCloseTo(0.8, 12);
  });
  it("guards the edges", () => {
    expect(erlangC(2, 0)).toBe(0);
    expect(erlangC(2, 2)).toBe(1);
    expect(erlangC(0, 1)).toBe(0);
    expect(erlangC(200, 150)).toBeGreaterThan(0);
    expect(erlangC(200, 150)).toBeLessThan(1);
  });
});

describe("queueModel", () => {
  it("one worker at 50/s with 40/s arriving: rho 0.8, Wq 80 ms", () => {
    const m = queueModel({ lambda: 40, c: 1, serviceMs: 20 });
    expect(m.rho).toBeCloseTo(0.8);
    expect(m.wqMs).toBeCloseTo(80);
    expect(m.wMs).toBeCloseTo(100);
    expect(m.lq).toBeCloseTo(3.2);
  });
  it("two servers, a = 1: Wq = (1/3) / (2 − 1) s", () => {
    expect(queueModel({ lambda: 1, c: 2, serviceMs: 1000 }).wqMs).toBeCloseTo(1000 / 3);
  });
  it("grows without bound at rho >= 1, and guards zero inputs", () => {
    const sale = queueModel({ lambda: 600, c: 1, serviceMs: 20 });
    expect(sale.unbounded).toBe(true);
    expect(sale.wqMs).toBe(Infinity);
    expect(queueModel({ lambda: 100, c: 2, serviceMs: 20 }).unbounded).toBe(true);
    const idle = queueModel({ lambda: 0, c: 0, serviceMs: 0 });
    expect(idle.rho).toBe(0);
    expect(idle.wqMs).toBe(0);
  });
});

describe("cacheModel", () => {
  it("lesson numbers: 2400/s at 94% leaves about 145/s for the database", () => {
    const m = cacheModel({ rps: 2400, hit: 0.94, dbCap: 2600, cacheMs: 1, dbMs: 38 });
    expect(m.dbRps).toBeCloseTo(144);
    expect(m.dbLoad).toBeCloseTo(144 / 2600);
    expect(m.dbLoaded).toBeCloseTo(38 / (1 - 144 / 2600));
    expect(m.avgMs).toBeCloseTo(0.94 * 1 + 0.06 * (1 + 38 / (1 - 144 / 2600)));
    // 6% miss > 5%: the p95 read is a miss
    expect(m.p95Ms).toBeCloseTo(m.missMs);
  });
  it("95% hit ratio at 5000/s: p95 is a hit", () => {
    const m = cacheModel({ rps: 5000, hit: 0.95, dbCap: 2600, cacheMs: 1, dbMs: 38 });
    expect(m.dbRps).toBeCloseTo(250);
    expect(m.p95Ms).toBe(1);
  });
  it("overload, a perfect cache and a zero-capacity database", () => {
    const over = cacheModel({ rps: 3000, hit: 0, dbCap: 2600, cacheMs: 1, dbMs: 38 });
    expect(over.overloaded).toBe(true);
    expect(over.avgMs).toBe(Infinity);
    const all = cacheModel({ rps: 3000, hit: 1, dbCap: 0, cacheMs: 1, dbMs: 38 });
    expect(all.dbRps).toBe(0);
    expect(all.dbLoad).toBe(0);
    expect(all.avgMs).toBe(1);
    expect(cacheModel({ rps: 10, hit: 0.5, dbCap: 0, cacheMs: 1, dbMs: 38 }).overloaded).toBe(true);
  });
});

describe("retryModel", () => {
  it("3 retries at 3% failure", () => {
    const m = retryModel({ p: 0.03, retries: 3, timeoutMs: 800, backoffMs: 100, rps: 400 });
    expect(m.attempts).toBeCloseTo(1 + 0.03 + 0.0009 + 0.000027, 12);
    expect(m.success).toBeCloseTo(1 - 0.03 ** 4, 12);
    // four timeouts plus sleeps of 100, 200 and 400 ms
    expect(m.worstMs).toBe(3900);
    expect(m.calls).toBeCloseTo(400 * m.attempts);
  });
  it("a dead service: every try is made, load ×(r+1)", () => {
    const m = retryModel({ p: 1, retries: 3, timeoutMs: 800, backoffMs: 0, rps: 400 });
    expect(m.attempts).toBe(4);
    expect(m.success).toBe(0);
    expect(m.calls).toBe(1600);
  });
  it("no failures and no retries", () => {
    expect(retryModel({ p: 0, retries: 3, timeoutMs: 800, backoffMs: 100, rps: 1 }).attempts).toBe(1);
    expect(retryModel({ p: 0.5, retries: 0, timeoutMs: 800, backoffMs: 100, rps: 1 }).worstMs).toBe(800);
  });
});

describe("bucketModel", () => {
  it("lesson numbers: 30 tokens, 10/s; partner burst of 25 fits, the script is held to 10/s", () => {
    const m = bucketModel({ rate: 10, capacity: 30, incoming: 900, burst: 25 });
    expect(m.burstOk).toBe(25);
    expect(m.burstRejected).toBe(0);
    expect(m.ok).toBe(10);
    expect(m.rejected).toBe(890);
    expect(m.pct).toBeCloseTo(890 / 900);
  });
  it("a burst bigger than the bucket, and zero traffic", () => {
    expect(bucketModel({ rate: 10, capacity: 10, incoming: 0, burst: 25 })).toMatchObject({ burstOk: 10, burstRejected: 15, pct: 0 });
  });
});

describe("littleModel", () => {
  it("200/s × 0.041 s ≈ 8 in flight, one server", () => {
    const m = littleModel({ lambda: 200, latencyMs: 41, perServer: 64, target: 0.7 });
    expect(m.inFlight).toBeCloseTo(8.2);
    expect(m.servers).toBe(1);
    expect(m.load).toBeCloseTo(8.2 / 64);
  });
  it("rounds servers up, but not on an exact fit", () => {
    expect(littleModel({ lambda: 450, latencyMs: 180, perServer: 64, target: 0.7 }).servers).toBe(2);
    expect(littleModel({ lambda: 448, latencyMs: 100, perServer: 64, target: 0.7 }).servers).toBe(1);
    expect(littleModel({ lambda: 0, latencyMs: 100, perServer: 64, target: 0.7 }).servers).toBe(0);
  });
});

describe("formatting", () => {
  it("shows unbounded values as ∞ and keeps the gap to 100% visible", () => {
    expect(fmt(Infinity, "en")).toBe("∞");
    expect(fmt(2400, "ru")).toBe("2 400");
    expect(percentDecimals(1 - 8.1e-7)).toBe(5);
    expect(percentDecimals(1)).toBe(0);
    expect(percentDecimals(0)).toBe(0);
    expect(percentDecimals(0.9)).toBe(1);
  });
});

describe("registry", () => {
  for (const [slug, model] of Object.entries(WHATIF)) {
    it(`${slug}: defaults inside ranges; extremes give numbers, not NaN`, () => {
      for (const p of model.params) {
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
      }
      const corners = [defaultsOf(model.params)];
      corners.push(Object.fromEntries(model.params.map((p) => [p.id, p.min])));
      corners.push(Object.fromEntries(model.params.map((p) => [p.id, p.max])));
      for (const values of corners) {
        for (const r of model.compute(values)) expect(Number.isNaN(r.value)).toBe(false);
        for (const lang of ["uz", "ru", "en"]) expect(model.formula(values, lang)).not.toMatch(/NaN|undefined|Infinity/);
      }
    });
  }
  it("the formula carries the reader's values", () => {
    const f = WHATIF.caching!.formula({ ...defaultsOf(WHATIF.caching!.params), rps: 5000, hit: 0.95 }, "ru");
    expect(f).toContain("5 000 × (1 − 0,95) = 250/с");
    const q = WHATIF.queues!.formula({ lambda: 600, c: 1, serviceMs: 20 }, "en");
    expect(q).toContain("ρ ≥ 1");
  });
  it("overload marks results bad", () => {
    const r = WHATIF.caching!.compute({ ...defaultsOf(WHATIF.caching!.params), hit: 0 , rps: 5000 });
    expect(r.some((x) => x.tone === "bad")).toBe(true);
    expect(WHATIF.caching!.compute(defaultsOf(WHATIF.caching!.params)).some((x) => x.tone === "bad")).toBe(false);
  });
});

describe("URL params", () => {
  const params = WHATIF.caching!.params;
  it("reads w.* keys, clamps and falls back", () => {
    const v = readParams("?step=3&sc=a&w.hit=0.95&w.rps=5000&w.dbMs=abc&w.dbCap=999999", params);
    expect(v).toMatchObject({ hit: 0.95, rps: 5000, dbMs: 38, dbCap: 10000, cacheMs: 1 });
    expect(clampParam(WHATIF.queues!.params[1]!, 2.6)).toBe(3);
  });
  it("writes only its own keys and keeps the player's step/sc", () => {
    const href = "https://example.test/en/l/caching/?step=3&sc=a";
    const out = new URL(writeParams(href, { ...defaultsOf(params), hit: 0.95 }, params));
    expect(out.searchParams.get("step")).toBe("3");
    expect(out.searchParams.get("sc")).toBe("a");
    expect(out.searchParams.get("w.hit")).toBe("0.95");
    expect(out.searchParams.get("w.rps")).toBe("2400");
    const reset = new URL(writeParams(out.toString(), defaultsOf(params), params));
    expect([...reset.searchParams.keys()]).toEqual(["step", "sc"]);
    const shared = new URL(writeParams(href, defaultsOf(params), params, true));
    expect(shared.searchParams.get("w.dbMs")).toBe("38");
  });
  it("round-trips", () => {
    const values = { ...defaultsOf(params), hit: 0.83, rps: 7300 };
    const url = new URL(writeParams("https://example.test/?step=1", values, params));
    expect(readParams(url.search, params)).toEqual(values);
  });
});

describe("panel strings", () => {
  it("every language labels every param and result; uz/en carry no Cyrillic", () => {
    for (const [lang, ui] of Object.entries(WHATIF_UI)) {
      const flat = JSON.stringify(ui);
      if (lang !== "ru") expect(flat).not.toMatch(/[Ѐ-ӿ]/);
      for (const [slug, model] of Object.entries(WHATIF)) {
        const l = ui.lessons[slug];
        expect(l, `${lang}.${slug}`).toBeDefined();
        expect(l!.warn.trim()).not.toBe("");
        for (const p of model.params) {
          expect(l!.params[p.id]?.label.trim(), `${lang}.${slug}.${p.id}`).toBeTruthy();
          expect(l!.params[p.id]?.hint.trim(), `${lang}.${slug}.${p.id}`).toBeTruthy();
        }
        for (const r of model.compute(defaultsOf(model.params))) expect(l!.results[r.id]?.trim(), `${lang}.${slug}.${r.id}`).toBeTruthy();
      }
      for (const [k, s] of Object.entries(ui)) if (typeof s === "string") expect(s.trim(), `${lang}.${k}`).not.toBe("");
    }
  });
});
