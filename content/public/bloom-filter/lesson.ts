import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online shop's sign-up form checks "is this username taken?" on every keystroke:
 * about 3000 checks a second against 50 million accounts. A Bloom filter in the API's memory
 * answers "definitely free" without the database; the same trick inside an LSM storage engine
 * skips SSTables. False-positive numbers come from p = (1 - e^(-kn/m))^k.
 * Traffic numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "bloom-filter",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "reads", unit: "/s", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "fp", unit: "%", better: "down" },
    { id: "memory", unit: "MB", better: "down" },
  ],
  steps: [
    {
      id: "every-key",
      kind: "case",
      nodes: {
        form: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [4, 3], load: 30 },
        db: { kind: "db", at: [9, 3], load: 40 },
      },
      edges: {
        ask: { from: "form", to: "api", rate: 6 },
        lookup: { from: "api", to: "db", rate: 6 },
      },
      metrics: { reads: 1000, p95: 18 },
      focus: ["form", "api", "db"],
      exchange: {
        edge: "ask",
        request: { format: "http", head: "GET /usernames/ali_k1993x/available HTTP/1.1", headers: [["Host", "shop.example.com"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["X-DB-Time", "4 ms"]],
          body: `{
  "username": "ali_k1993x",
  "available": true
}`,
        },
        marks: ["available", "X-DB-Time"],
      },
    },
    {
      id: "load",
      kind: "problem",
      nodes: { db: { state: "slow", load: 95 }, api: { load: 60 } },
      edges: { ask: { rate: 12 }, lookup: { rate: 12 } },
      metrics: { reads: 3000, p95: 240 },
      focus: ["api", "db"],
      exchange: {
        edge: "lookup",
        request: { format: "sql", head: "SELECT 1 FROM users WHERE username = 'ali_k1993x' LIMIT 1;" },
        response: { format: "text", head: "0 rows, 4 ms", body: "-- 80% of checks during sign-up are names nobody has" },
        marks: ["username", "0 rows", "80%"],
      },
    },
    {
      id: "bloom",
      kind: "fix",
      nodes: {
        filter: { kind: "cache", at: [4, 7], load: 20 },
        db: { state: "ok", load: 35 },
        api: { load: 35 },
      },
      edges: {
        check: { from: "api", to: "filter", rate: 12 },
        lookup: { rate: 3 },
      },
      metrics: { reads: 620, p95: 6, fp: 0.8, memory: 62.5 },
      focus: ["api", "filter"],
      exchange: {
        edge: "check",
        request: { format: "text", head: "bloom.contains(\"ali_k1993x\")", body: "h1 -> bit 18 402 133 = 1\nh2 -> bit 301 977 040 = 0\n(h3..h7 not needed)" },
        response: { format: "text", head: "definitely not present -> available, no DB call" },
        marks: ["h1", "h2", "definitely not"],
      },
    },
    {
      id: "maybe",
      kind: "case",
      focus: ["api", "filter", "db"],
      exchange: {
        edge: "check",
        request: { format: "text", head: "bloom.contains(\"zarina_t\")", body: "h1..h7 -> bits all = 1" },
        response: {
          format: "text",
          head: "maybe present -> ask the DB",
          body: "SELECT 1 FROM users WHERE username = 'zarina_t'\n1 row -> taken",
        },
        marks: ["all = 1", "maybe", "1 row"],
      },
    },
    {
      id: "math",
      kind: "case",
      focus: ["filter"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "bloom sizing, n = 50 000 000 usernames",
          body: "m = 10 bits x n = 500 000 000 bits = 62.5 MB\nk = 7 hashes (best k = m/n x ln 2 = 6.9)\np = (1 - e^(-k n / m))^k = (1 - e^-0.7)^7 = 0.0082\n-- 0.8% of free names still go to the DB",
        },
        marks: ["n", "m", "k", "p"],
      },
    },
    {
      id: "sizing",
      kind: "fix",
      focus: ["filter"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "bits per key vs false positives, n = 50 000 000",
          body: "bits/key  k   false positives  memory\n5         3   9.2%             31 MB\n10        7   0.82%            62.5 MB\n15        10  0.07%            94 MB",
        },
        marks: ["bits/key", "false positives", "memory"],
      },
    },
    {
      id: "growth",
      kind: "problem",
      nodes: { filter: { load: 90 }, db: { load: 70 } },
      edges: { lookup: { rate: 8 }, rebuild: { from: "db", to: "filter", rate: 1 } },
      metrics: { reads: 1180, fp: 24 },
      focus: ["filter", "db"],
      exchange: {
        edge: "rebuild",
        request: {
          format: "text",
          head: "filter built for n = 50 000 000, now n = 120 000 000",
          body: "p = (1 - e^(-7 x 120 / 500))^7 = 0.24\n-- one free name in four goes to the DB again",
        },
        response: {
          format: "text",
          head: "rebuild: scan 120 000 000 names into a 150 MB filter, then swap",
          body: "new p = 0.8%",
        },
        marks: ["n", "0.24", "rebuild", "swap"],
      },
    },
    {
      id: "delete",
      kind: "problem",
      nodes: { filter: { load: 25 }, db: { load: 35 } },
      edges: { rebuild: null, lookup: { rate: 3 } },
      metrics: { reads: 620, fp: 0.8, memory: 150 },
      focus: ["api", "filter"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "account ali_k closed, its name must become free",
          body: "bloom.remove(\"ali_k\"): clear bits 18 402 133, 77 140 920, ...\nbit 18 402 133 is also set by \"zarina_t\"",
        },
        response: { format: "text", head: "bloom.contains(\"zarina_t\") = false", body: "-- a taken name now looks free: a false negative" },
        marks: ["remove", "also set", "false negative"],
      },
    },
    {
      id: "counting",
      kind: "fix",
      nodes: { filter: { load: 30 } },
      metrics: { memory: 600 },
      focus: ["filter"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "counting bloom: 4-bit counters instead of bits",
          body: "add(\"zarina_t\"): counter[18 402 133] 1 -> 2\nremove(\"ali_k\"): counter[18 402 133] 2 -> 1\ncontains(\"zarina_t\") = maybe (still correct)",
        },
        response: { format: "text", head: "memory: 4 x 150 MB = 600 MB" },
        marks: ["4-bit counters", "counter", "maybe", "memory"],
      },
    },
    {
      id: "lsm",
      kind: "case",
      nodes: {
        sst1: { kind: "storage", at: [12, 2] },
        sst2: { kind: "storage", at: [12, 5] },
        sst3: { kind: "storage", at: [12, 8] },
      },
      edges: {
        read1: { from: "db", to: "sst1", flow: "ack", rate: 1 },
        read2: { from: "db", to: "sst2", flow: "ack", rate: 1 },
        read3: { from: "db", to: "sst3", flow: "ack", rate: 1 },
      },
      focus: ["db", "sst1", "sst2", "sst3"],
      exchange: {
        edge: "read3",
        request: {
          format: "text",
          head: "GET user:ali_k1993x (LSM tree, 3 SSTables on disk)",
          body: "sstable-1 bloom: no -> skip\nsstable-2 bloom: no -> skip\nsstable-3 bloom: no -> skip",
        },
        response: { format: "text", head: "not found, 0 disk reads", body: "-- without the filters: 3 disk reads for a key that does not exist" },
        marks: ["SSTables", "skip", "0 disk reads"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
