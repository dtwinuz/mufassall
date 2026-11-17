import { formatNumber } from "./ui";
import { whatIfUi } from "./whatif-ui";

/**
 * "What happens if…" models: small deterministic textbook formulas the reader can poke with
 * their own numbers. Same spirit as sim.ts (steady state, no randomness), but each lesson gets
 * the closed-form model its story is about, so the panel can print the formula with the values.
 */

export type Tone = "ok" | "warn" | "bad";

export interface WhatIfParam {
  id: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** unit key, localised by whatif-ui ("/s", "ms", "%", "") */
  unit: string;
  /** shown value = stored value × scale (fractions are stored 0..1 and shown as %) */
  scale?: number;
  /** whole numbers only (workers, retries) */
  int?: boolean;
}

export interface WhatIfResult {
  id: string;
  /** Infinity means "grows without bound" */
  value: number;
  unit: string;
  decimals: number;
  tone?: Tone;
}

export type Values = Record<string, number>;

export interface WhatIfModel {
  params: WhatIfParam[];
  compute(values: Values): WhatIfResult[];
  formula(values: Values, lang: string): string;
}

const LOADED = 0.85;
const EPS = 1e-9;

const tone = (x: number, warn: number, bad: number): Tone => (x >= bad ? "bad" : x > warn ? "warn" : "ok");

/** Number for display: "∞" when unbounded, locale-stable otherwise. */
export function fmt(v: number, lang: string, decimals = 0): string {
  if (Number.isNaN(v)) return "–";
  if (!Number.isFinite(v)) return "∞";
  return formatNumber(v, lang, decimals);
}

/** Decimals that keep the distance from 100% visible: 99.99992% not 100%. */
export function percentDecimals(fraction: number): number {
  const rest = (1 - fraction) * 100;
  if (!(rest > 0) || fraction <= 0) return 0;
  return Math.max(1, Math.min(6, Math.ceil(-Math.log10(rest) - EPS)));
}

/* ---------- caching: cache-aside in front of a database ---------- */

export interface CacheIn {
  rps: number;
  hit: number;
  dbCap: number;
  cacheMs: number;
  dbMs: number;
}

export function cacheModel({ rps, hit, dbCap, cacheMs, dbMs }: CacheIn) {
  const miss = 1 - hit;
  const dbRps = Math.max(0, rps * miss);
  const dbLoad = dbCap > 0 ? dbRps / dbCap : dbRps > 0 ? Infinity : 0;
  // the database as one M/M/1-like server: time = base / (1 - rho), unbounded at rho >= 1
  const dbLoaded = dbLoad >= 1 ? Infinity : dbMs / (1 - dbLoad);
  const missMs = cacheMs + dbLoaded;
  const avgMs = miss > EPS ? hit * cacheMs + miss * missMs : cacheMs;
  // two-point mix: if more than 5% of reads miss, the 95th percentile is a miss
  const p95Ms = miss > 0.05 + EPS ? missMs : cacheMs;
  return { dbRps, dbLoad, dbLoaded, missMs, avgMs, p95Ms, overloaded: dbLoad >= 1 };
}

/* ---------- queues: M/M/c with Erlang C ---------- */

/** Erlang C: chance an arrival has to wait, c servers, offered load a = λ/μ. 1 when a >= c. */
export function erlangC(c: number, a: number): number {
  if (c < 1 || a <= 0) return 0;
  if (a >= c) return 1;
  // Erlang B by recursion (stable for large c), then B -> C
  let b = 1;
  for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b);
  return (c * b) / (c - a * (1 - b));
}

export interface QueueIn {
  lambda: number;
  c: number;
  serviceMs: number;
}

export function queueModel({ lambda, c, serviceMs }: QueueIn) {
  const workers = Math.max(1, Math.floor(c));
  const service = Math.max(EPS, serviceMs);
  const mu = 1000 / service;
  const arrivals = Math.max(0, lambda);
  const rho = arrivals / (workers * mu);
  if (rho >= 1) return { mu, rho, pWait: 1, wqMs: Infinity, wMs: Infinity, lq: Infinity, unbounded: true };
  const pWait = erlangC(workers, arrivals / mu);
  const wq = arrivals > 0 ? pWait / (workers * mu - arrivals) : 0;
  return { mu, rho, pWait, wqMs: wq * 1000, wMs: wq * 1000 + service, lq: arrivals * wq, unbounded: false };
}

/* ---------- timeouts and retries ---------- */

export interface RetryIn {
  p: number;
  retries: number;
  timeoutMs: number;
  backoffMs: number;
  rps: number;
}

export function retryModel({ p, retries, timeoutMs, backoffMs, rps }: RetryIn) {
  const q = Math.min(1, Math.max(0, p));
  const r = Math.max(0, Math.floor(retries));
  // try k+1 happens only if the first k failed: sum of p^k for k = 0..r
  const attempts = q >= 1 ? r + 1 : (1 - q ** (r + 1)) / (1 - q);
  const success = 1 - q ** (r + 1);
  // every try times out, and each sleep takes its whole backoff window: base, 2·base, 4·base…
  const worstMs = (r + 1) * Math.max(0, timeoutMs) + Math.max(0, backoffMs) * (2 ** r - 1);
  return { attempts, success, worstMs, calls: Math.max(0, rps) * attempts };
}

/* ---------- token bucket ---------- */

export interface BucketIn {
  rate: number;
  capacity: number;
  incoming: number;
  burst: number;
}

export function bucketModel({ rate, capacity, incoming, burst }: BucketIn) {
  const cap = Math.max(0, capacity);
  const b = Math.max(0, burst);
  const r = Math.max(0, rate);
  const inc = Math.max(0, incoming);
  // a burst lands on a full bucket at once: no time for refill
  const burstOk = Math.min(b, cap);
  // steady state: once the bucket is empty, exactly the refill rate gets through
  const ok = Math.min(inc, r);
  const rejected = inc - ok;
  return { burstOk, burstRejected: b - burstOk, ok, rejected, pct: inc > 0 ? rejected / inc : 0 };
}

/* ---------- Little's law ---------- */

export interface LittleIn {
  lambda: number;
  latencyMs: number;
  perServer: number;
  target: number;
}

export function littleModel({ lambda, latencyMs, perServer, target }: LittleIn) {
  const inFlight = Math.max(0, lambda) * (Math.max(0, latencyMs) / 1000);
  const usable = Math.max(EPS, perServer) * Math.min(1, Math.max(EPS, target));
  const servers = inFlight > 0 ? Math.max(1, Math.ceil(inFlight / usable - EPS)) : 0;
  const load = servers > 0 ? inFlight / (servers * perServer) : 0;
  return { inFlight, servers, load };
}

/* ---------- registry ---------- */

const v = (values: Values, id: string) => values[id] ?? 0;

export const WHATIF: Record<string, WhatIfModel> = {
  caching: {
    params: [
      { id: "rps", min: 0, max: 20000, step: 100, default: 2400, unit: "/s" },
      { id: "hit", min: 0, max: 1, step: 0.01, default: 0.94, unit: "%", scale: 100 },
      { id: "dbCap", min: 100, max: 10000, step: 100, default: 2600, unit: "/s" },
      { id: "cacheMs", min: 0.1, max: 20, step: 0.1, default: 1, unit: "ms" },
      { id: "dbMs", min: 1, max: 500, step: 1, default: 38, unit: "ms" },
    ],
    compute(x) {
      const m = cacheModel({ rps: v(x, "rps"), hit: v(x, "hit"), dbCap: v(x, "dbCap"), cacheMs: v(x, "cacheMs"), dbMs: v(x, "dbMs") });
      const t = tone(m.dbLoad, LOADED, 1);
      return [
        { id: "dbRps", value: m.dbRps, unit: "/s", decimals: 0, tone: t },
        { id: "dbLoad", value: m.dbLoad * 100, unit: "%", decimals: m.dbLoad < 0.1 ? 1 : 0, tone: t },
        { id: "avg", value: m.avgMs, unit: "ms", decimals: 1, tone: m.overloaded ? "bad" : undefined },
        { id: "p95", value: m.p95Ms, unit: "ms", decimals: 0, tone: m.overloaded ? "bad" : undefined },
      ];
    },
    formula(x, lang) {
      const n = (a: number, d = 0) => fmt(a, lang, d);
      const { units: u, words: wd } = whatIfUi(lang);
      const [rps, hit, cap, cms, dms] = [v(x, "rps"), v(x, "hit"), v(x, "dbCap"), v(x, "cacheMs"), v(x, "dbMs")];
      const m = cacheModel({ rps, hit, dbCap: cap, cacheMs: cms, dbMs: dms });
      return [
        `DB = λ × (1 − h) = ${n(rps)} × (1 − ${n(hit, 2)}) = ${n(m.dbRps)}${u["/s"]}`,
        `ρ = ${n(m.dbRps)} / ${n(cap)} = ${n(m.dbLoad * 100, 1)}%`,
        m.overloaded
          ? `ρ ≥ 1 → t(DB) = ∞`
          : `t(DB) = ${n(dms)} / (1 − ${n(m.dbLoad, 3)}) = ${n(m.dbLoaded, 1)} ${u.ms}`,
        `${wd.avg} = h × ${n(cms, 1)} + (1 − h) × ${n(m.missMs, 1)} = ${n(m.avgMs, 1)} ${u.ms}`,
        `p95 ≈ ${1 - hit > 0.05 + EPS ? `${wd.miss} (1 − h > 5%)` : `${wd.hit} (1 − h ≤ 5%)`} = ${n(m.p95Ms)} ${u.ms}`,
      ].join("\n");
    },
  },
  queues: {
    params: [
      { id: "lambda", min: 0, max: 1000, step: 1, default: 40, unit: "/s" },
      { id: "c", min: 1, max: 20, step: 1, default: 1, unit: "", int: true },
      { id: "serviceMs", min: 1, max: 2000, step: 1, default: 20, unit: "ms" },
    ],
    compute(x) {
      const m = queueModel({ lambda: v(x, "lambda"), c: v(x, "c"), serviceMs: v(x, "serviceMs") });
      const t = tone(m.rho, LOADED, 1);
      return [
        { id: "rho", value: m.rho, unit: "", decimals: 2, tone: t },
        { id: "pWait", value: m.pWait * 100, unit: "%", decimals: 0 },
        { id: "wq", value: m.wqMs, unit: "ms", decimals: m.wqMs < 10 ? 1 : 0, tone: m.unbounded ? "bad" : undefined },
        { id: "w", value: m.wMs, unit: "ms", decimals: m.wMs < 10 ? 1 : 0, tone: m.unbounded ? "bad" : undefined },
        { id: "lq", value: m.lq, unit: "", decimals: 1, tone: m.unbounded ? "bad" : undefined },
      ];
    },
    formula(x, lang) {
      const n = (a: number, d = 0) => fmt(a, lang, d);
      const { units: u, words: wd } = whatIfUi(lang);
      const [lambda, c, s] = [v(x, "lambda"), Math.max(1, Math.floor(v(x, "c"))), v(x, "serviceMs")];
      const m = queueModel({ lambda, c, serviceMs: s });
      const lines = [
        `μ = 1000 / ${n(s)} ${u.ms} = ${n(m.mu, 1)}${u["/s"]}`,
        `ρ = λ / (c × μ) = ${n(lambda)} / (${n(c)} × ${n(m.mu, 1)}) = ${n(m.rho, 2)}`,
      ];
      if (m.unbounded) lines.push(`ρ ≥ 1 → Wq = ∞`);
      else
        lines.push(
          `P(wait) = ErlangC(c = ${n(c)}, λ/μ = ${n(lambda / m.mu, 2)}) = ${n(m.pWait, 3)}`,
          `Wq = P(wait) / (c × μ − λ) = ${n(m.pWait, 3)} / ${n(c * m.mu - lambda, 1)} = ${n(m.wqMs, 1)} ${u.ms}`,
        );
      return lines.join("\n");
    },
  },
  "timeouts-retries": {
    params: [
      { id: "p", min: 0, max: 1, step: 0.01, default: 0.03, unit: "%", scale: 100 },
      { id: "retries", min: 0, max: 10, step: 1, default: 3, unit: "", int: true },
      { id: "timeoutMs", min: 50, max: 30000, step: 50, default: 800, unit: "ms" },
      { id: "backoffMs", min: 0, max: 5000, step: 10, default: 100, unit: "ms" },
      { id: "rps", min: 0, max: 10000, step: 10, default: 400, unit: "/s" },
    ],
    compute(x) {
      const m = retryModel({ p: v(x, "p"), retries: v(x, "retries"), timeoutMs: v(x, "timeoutMs"), backoffMs: v(x, "backoffMs"), rps: v(x, "rps") });
      const t = tone(m.attempts, 1.1, 2);
      return [
        { id: "attempts", value: m.attempts, unit: "", decimals: m.attempts < 1.1 ? 3 : 2, tone: t },
        { id: "calls", value: m.calls, unit: "/s", decimals: 0, tone: t },
        { id: "success", value: m.success * 100, unit: "%", decimals: percentDecimals(m.success) },
        { id: "worst", value: m.worstMs, unit: "ms", decimals: 0 },
      ];
    },
    formula(x, lang) {
      const n = (a: number, d = 0) => fmt(a, lang, d);
      const { units: u, words: wd } = whatIfUi(lang);
      const [p, r, to, b, rps] = [v(x, "p"), Math.max(0, Math.floor(v(x, "retries"))), v(x, "timeoutMs"), v(x, "backoffMs"), v(x, "rps")];
      const m = retryModel({ p, retries: r, timeoutMs: to, backoffMs: b, rps });
      const pp = n(p, 2);
      return [
        p >= 1
          ? `${wd.tries} = r + 1 = ${n(r + 1)}`
          : `${wd.tries} = (1 − p^(r+1)) / (1 − p) = (1 − ${pp}^${r + 1}) / (1 − ${pp}) = ${n(m.attempts, 3)}`,
        `${wd.load} = ${n(rps)} × ${n(m.attempts, 3)} = ${n(m.calls)}${u["/s"]}`,
        `${wd.success} = 1 − p^(r+1) = 1 − ${pp}^${r + 1} = ${n(m.success * 100, percentDecimals(m.success))}%`,
        `${wd.worst} = (r + 1) × T + b × (2^r − 1) = ${n(r + 1)} × ${n(to)} + ${n(b)} × ${n(2 ** r - 1)} = ${n(m.worstMs)} ${u.ms}`,
      ].join("\n");
    },
  },
  "rate-limiting": {
    params: [
      { id: "rate", min: 1, max: 1000, step: 1, default: 10, unit: "/s" },
      { id: "capacity", min: 1, max: 1000, step: 1, default: 30, unit: "" },
      { id: "incoming", min: 0, max: 5000, step: 1, default: 900, unit: "/s" },
      { id: "burst", min: 0, max: 1000, step: 1, default: 25, unit: "" },
    ],
    compute(x) {
      const m = bucketModel({ rate: v(x, "rate"), capacity: v(x, "capacity"), incoming: v(x, "incoming"), burst: v(x, "burst") });
      return [
        { id: "burstOk", value: m.burstOk, unit: "", decimals: 0, tone: "ok" },
        { id: "burstRejected", value: m.burstRejected, unit: "", decimals: 0, tone: m.burstRejected > 0 ? "bad" : "ok" },
        { id: "ok", value: m.ok, unit: "/s", decimals: 0 },
        { id: "rejected", value: m.rejected, unit: "/s", decimals: 0 },
        { id: "pct", value: m.pct * 100, unit: "%", decimals: 1 },
      ];
    },
    formula(x, lang) {
      const n = (a: number, d = 0) => fmt(a, lang, d);
      const { units: u, words: wd } = whatIfUi(lang);
      const [rate, cap, inc, b] = [v(x, "rate"), v(x, "capacity"), v(x, "incoming"), v(x, "burst")];
      const m = bucketModel({ rate, capacity: cap, incoming: inc, burst: b });
      return [
        `${wd.burst}: min(B, cap) = min(${n(b)}, ${n(cap)}) = ${n(m.burstOk)} → ${n(m.burstRejected)} × 429`,
        `${wd.steady}: min(R, rate) = min(${n(inc)}, ${n(rate)}) = ${n(m.ok)}${u["/s"]}`,
        `429: ${n(inc)} − ${n(m.ok)} = ${n(m.rejected)}${u["/s"]} = ${n(m.pct * 100, 1)}%`,
      ].join("\n");
    },
  },
  "latency-throughput": {
    params: [
      { id: "lambda", min: 1, max: 20000, step: 1, default: 200, unit: "/s" },
      { id: "latencyMs", min: 1, max: 5000, step: 1, default: 41, unit: "ms" },
      { id: "perServer", min: 1, max: 1000, step: 1, default: 64, unit: "", int: true },
      { id: "target", min: 0.1, max: 1, step: 0.05, default: 0.7, unit: "%", scale: 100 },
    ],
    compute(x) {
      const m = littleModel({ lambda: v(x, "lambda"), latencyMs: v(x, "latencyMs"), perServer: v(x, "perServer"), target: v(x, "target") });
      return [
        { id: "inFlight", value: m.inFlight, unit: "", decimals: m.inFlight < 100 ? 1 : 0 },
        { id: "servers", value: m.servers, unit: "", decimals: 0 },
        { id: "load", value: m.load * 100, unit: "%", decimals: 0, tone: tone(v(x, "target"), 0.7, LOADED + EPS) },
      ];
    },
    formula(x, lang) {
      const n = (a: number, d = 0) => fmt(a, lang, d);
      const { units: u, words: wd } = whatIfUi(lang);
      const [lambda, w, per, target] = [v(x, "lambda"), v(x, "latencyMs"), v(x, "perServer"), v(x, "target")];
      const m = littleModel({ lambda, latencyMs: w, perServer: per, target });
      return [
        `L = λ × W = ${n(lambda)}${u["/s"]} × ${n(w / 1000, 3)} ${u.s} = ${n(m.inFlight, 1)}`,
        `N = ⌈L / (c × u)⌉ = ⌈${n(m.inFlight, 1)} / (${n(per)} × ${n(target, 2)})⌉ = ${n(m.servers)}`,
        `${wd.load} = L / (N × c) = ${n(m.inFlight, 1)} / (${n(m.servers)} × ${n(per)}) = ${n(m.load * 100)}%`,
      ].join("\n");
    },
  },
};

export const hasWhatIf = (slug: string): boolean => Object.hasOwn(WHATIF, slug);

export const defaultsOf = (params: WhatIfParam[]): Values => Object.fromEntries(params.map((p) => [p.id, p.default]));

/** Clamp to the slider's range, round whole-number params; anything unparsable falls back. */
export function clampParam(p: WhatIfParam, raw: number): number {
  if (!Number.isFinite(raw)) return p.default;
  const x = Math.min(p.max, Math.max(p.min, raw));
  return p.int ? Math.round(x) : x;
}

/* ---------- URL: ?w.hit=0.95&w.rps=5000, next to the player's own step/sc ---------- */

export const URL_PREFIX = "w.";

export function readParams(search: string, params: WhatIfParam[]): Values {
  const q = new URLSearchParams(search);
  const out = defaultsOf(params);
  for (const p of params) {
    const raw = q.get(URL_PREFIX + p.id);
    if (raw !== null && raw.trim() !== "") out[p.id] = clampParam(p, Number(raw));
  }
  return out;
}

const encode = (x: number) => String(Number(x.toFixed(6)));

/**
 * The href with this panel's values. Only w.* keys of this panel are touched. With all = false,
 * values equal to the lesson's defaults are left out (a clean URL after "reset"); with all = true
 * every value is written, so a shared link reproduces the case even if defaults change later.
 */
export function writeParams(href: string, values: Values, params: WhatIfParam[], all = false): string {
  const url = new URL(href);
  const changed = params.some((p) => Math.abs((values[p.id] ?? p.default) - p.default) > EPS);
  for (const p of params) {
    const key = URL_PREFIX + p.id;
    if (all || changed) url.searchParams.set(key, encode(values[p.id] ?? p.default));
    else url.searchParams.delete(key);
  }
  return url.toString();
}
