import { defineLesson } from "@mufassall/scene-schema";

/**
 * Designing a small system end to end: a city bus arrival board. Buses send their position,
 * riders ask when the next bus comes. Requirements → estimates → high-level boxes → low-level
 * design of one component → trade-offs. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "hld-lld",
  level: "beginner",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "writes", unit: "/s", better: "up" },
    { id: "reads", unit: "/s", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "freshness", unit: "s", better: "down" },
  ],
  steps: [
    {
      id: "start",
      kind: "problem",
      nodes: {
        rider: { kind: "client", at: [0, 0] },
        bus: { kind: "client", at: [0, 8] },
        api: { kind: "service", at: [4, 0] },
        db: { kind: "db", at: [12, 4] },
      },
      edges: {
        ping: { from: "bus", to: "api", rate: 3 },
        query: { from: "api", to: "db", rate: 3 },
      },
      focus: ["bus", "api", "db"],
      exchange: {
        edge: "ping",
        request: {
          format: "json",
          head: "POST /positions HTTP/1.1",
          body: `{
  "bus_id": "b_17",
  "route": "R11",
  "lat": 41.3111,
  "lon": 69.2797,
  "ts": 1795421720
}`,
        },
        response: { format: "http", head: "HTTP/1.1 204 No Content" },
        marks: ["bus_id", "route", "ts"],
      },
    },
    {
      id: "requirements",
      kind: "fix",
      edges: { ask: { from: "rider", to: "api", rate: 2 } },
      focus: ["rider", "api"],
      exchange: {
        edge: "ask",
        request: { format: "http", head: "GET /stops/s_204/arrivals HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "stop": "s_204",
  "arrivals": [
    { "route": "R11", "eta_min": 4 }
  ]
}`,
        },
        marks: ["stop", "arrivals", "eta_min"],
      },
    },
    {
      id: "estimates",
      kind: "case",
      nodes: {
        api: { state: "slow", load: 95 },
        db: { load: 70 },
      },
      edges: { ask: { rate: 8 } },
      metrics: { writes: 80, reads: 3000, p95: 900 },
      focus: ["api", "db"],
    },
    {
      id: "hld",
      kind: "fix",
      nodes: {
        api: { state: "ok", load: 30 },
        db: { load: 20 },
        ingest: { kind: "service", at: [4, 8] },
        queue: { kind: "queue", at: [8, 8] },
        worker: { kind: "worker", at: [8, 4], load: 60 },
        cache: { kind: "cache", at: [8, 0] },
      },
      edges: {
        query: null,
        ping: { to: "ingest" },
        enqueue: { from: "ingest", to: "queue", rate: 3 },
        consume: { from: "queue", to: "worker", rate: 3 },
        eta: { from: "worker", to: "cache", rate: 2 },
        save: { from: "worker", to: "db", rate: 2 },
        read: { from: "api", to: "cache", rate: 8 },
      },
      metrics: { p95: 45, freshness: 12 },
      focus: ["ingest", "queue", "worker", "cache"],
      exchange: {
        edge: "enqueue",
        request: {
          format: "json",
          head: "topic bus-positions, key b_17, partition 3",
          body: `{
  "bus_id": "b_17",
  "route": "R11",
  "lat": 41.3111,
  "lon": 69.2797,
  "ts": 1795421720
}`,
        },
        marks: ["topic", "key", "partition"],
      },
    },
    {
      id: "lag",
      kind: "problem",
      nodes: { worker: { state: "slow", load: 98 } },
      edges: { consume: { flow: "retry", rate: 6 } },
      metrics: { freshness: 40 },
      focus: ["queue", "worker"],
      exchange: {
        edge: "consume",
        request: {
          format: "text",
          head: "consumer group eta-workers",
          body: "partitions   12\nconsumers     1\nlag          3200 messages, about 40 s\neta calc     p95 290 ms per message",
        },
        marks: ["consumers", "lag", "eta calc"],
      },
    },
    {
      id: "scale",
      kind: "fix",
      nodes: { worker: { state: "ok", load: 40 } },
      edges: {
        consume: { flow: "request", rate: 8 },
        eta: { rate: 4 },
      },
      metrics: { freshness: 11 },
      focus: ["queue", "worker"],
    },
    {
      id: "lld-api",
      kind: "fix",
      nodes: { api: { load: 35 } },
      edges: { ask: { rate: 10 }, read: { rate: 10 } },
      metrics: { p95: 35 },
      focus: ["rider", "api"],
      exchange: {
        edge: "ask",
        request: {
          format: "http",
          head: "GET /v1/stops/s_204/arrivals HTTP/1.1",
          headers: [["If-None-Match", '"a91f"']],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "max-age=10"],
            ["ETag", '"b03c"'],
          ],
          body: `{
  "stop": "s_204",
  "updated_at": "2026-11-18T08:15:20Z",
  "stale": false,
  "arrivals": [
    { "route": "R11", "eta_s": 240 },
    { "route": "R3", "eta_s": 610 }
  ]
}`,
        },
        marks: ["v1", "If-None-Match", "Cache-Control", "updated_at", "eta_s"],
      },
    },
    {
      id: "lld-cache",
      kind: "fix",
      nodes: { cache: { load: 25 } },
      edges: { eta: { rate: 4 } },
      focus: ["worker", "cache"],
      exchange: {
        edge: "eta",
        request: {
          format: "text",
          head: "HSET arrivals:s_204 R11 240 R3 610 updated_at 1795421720",
          body: "EXPIRE arrivals:s_204 90",
        },
        response: { format: "text", head: "(integer) 3", body: "(integer) 1" },
        marks: ["HSET", "arrivals:s_204", "EXPIRE"],
      },
    },
    {
      id: "lld-history",
      kind: "fix",
      nodes: { db: { load: 35 } },
      edges: { save: { rate: 4 } },
      focus: ["worker", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "INSERT INTO positions (bus_id, route, ts, lat, lon)",
          body: "VALUES ('b_17', 'R11', '2026-11-18 08:15:20',\n        41.3111, 69.2797);\n-- PRIMARY KEY (bus_id, ts)\n-- PARTITION BY RANGE (ts), one partition per day\n-- partitions older than 90 days are dropped",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["PRIMARY KEY", "PARTITION BY", "90 days"],
      },
    },
    {
      id: "tradeoff",
      kind: "case",
      nodes: { cache: { state: "down" }, db: { load: 60 } },
      edges: {
        read: { flow: "fail", rate: 2 },
        fallback: { from: "api", to: "db", rate: 4 },
      },
      metrics: { p95: 180, freshness: 60 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "ask",
        request: { format: "http", head: "GET /v1/stops/s_204/arrivals HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "stop": "s_204",
  "updated_at": "2026-11-18T08:14:20Z",
  "stale": true,
  "arrivals": [
    { "route": "R11", "eta_s": 300 }
  ]
}`,
        },
        marks: ["updated_at", "stale"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
