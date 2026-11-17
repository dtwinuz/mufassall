import { defineLesson } from "@mufassall/scene-schema";

/**
 * Sizing a courier-tracking service on a napkin before building it.
 * Numbers are a model scenario, not measurements; the player says so under the scene.
 */
export default defineLesson({
  slug: "napkin-math",
  level: "beginner",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "rps", unit: "/s", better: "up" },
    { id: "disk", unit: "GB", better: "down" },
    { id: "egress", unit: "MB", better: "down" },
    { id: "servers", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "pings",
      kind: "case",
      nodes: {
        couriers: { kind: "client", at: [0, 1] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [8, 4] },
      },
      edges: {
        ping: { from: "couriers", to: "api", rate: 6 },
        write: { from: "api", to: "db", rate: 6 },
      },
      metrics: { rps: 2000 },
      focus: ["couriers", "api"],
      exchange: {
        edge: "ping",
        request: {
          format: "json",
          head: "POST /v1/pings HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "courier_id": "c_1207",
  "lat": 41.3111,
  "lon": 69.2797,
  "ts": 1795392843
}`,
        },
        response: { format: "http", head: "HTTP/1.1 204 No Content" },
        marks: ["Authorization", "courier_id", "lat", "ts"],
        masked: ["Authorization"],
      },
    },
    {
      id: "reads",
      kind: "case",
      nodes: { customers: { kind: "client", at: [0, 7] } },
      edges: {
        track: { from: "customers", to: "api", rate: 2 },
        view: { from: "api", to: "customers", flow: "ack", rate: 2 },
      },
      metrics: { rps: 2300, egress: 0.3 },
      focus: ["customers", "api"],
      exchange: {
        edge: "track",
        request: { format: "http", head: "GET /v1/orders/o_42/track HTTP/1.1", headers: [["Host", "api.example.com"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "status": "on_the_way",
  "eta_min": 12,
  "lat": 41.3087,
  "lon": 69.2741
}`,
        },
        marks: ["status", "eta_min"],
      },
    },
    {
      id: "row-size",
      kind: "case",
      metrics: { disk: 17 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT avg(pg_column_size(p.*)) AS row_bytes",
          body: "FROM pings p TABLESAMPLE SYSTEM (1);",
        },
        response: { format: "text", head: "row_bytes = 61", body: "index_bytes = 38\nper ping: about 100 bytes" },
        marks: ["row_bytes", "TABLESAMPLE", "index_bytes"],
      },
    },
    {
      id: "year",
      kind: "problem",
      nodes: { db: { state: "slow", load: 85 } },
      metrics: { disk: 6300 },
      focus: ["db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT pg_size_pretty(",
          body: "  pg_total_relation_size('pings'));",
        },
        response: { format: "text", head: "6.3 TB", body: "rows: 63 billion" },
        marks: ["pg_total_relation_size", "rows"],
      },
    },
    {
      id: "retention",
      kind: "fix",
      nodes: {
        db: { state: "ok", load: 35 },
        archive: { kind: "storage", at: [8, 8] },
      },
      edges: { export: { from: "db", to: "archive", rate: 1 } },
      metrics: { disk: 120 },
      focus: ["db", "archive"],
      exchange: {
        edge: "export",
        request: {
          format: "http",
          head: "PUT /pings/2026-11-10.parquet HTTP/1.1",
          headers: [
            ["Host", "archive.example.com"],
            ["Content-Type", "application/vnd.apache.parquet"],
            ["Content-Length", "1700000000"],
          ],
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["parquet", "Content-Length"],
      },
    },
    {
      id: "bandwidth",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { track: { rate: 10 }, view: { rate: 10 } },
      metrics: { egress: 60 },
      focus: ["customers", "api"],
      exchange: {
        edge: "track",
        request: { format: "http", head: "GET /tiles/14/10712/6131.png HTTP/1.1", headers: [["Host", "api.example.com"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Type", "image/png"],
            ["Content-Length", "204800"],
          ],
        },
        marks: ["tiles", "Content-Length"],
      },
    },
    {
      id: "cdn",
      kind: "fix",
      nodes: {
        api: { state: "ok" },
        cdn: { kind: "cdn", at: [3, 10] },
      },
      edges: {
        track: { rate: 2 },
        view: { rate: 2 },
        tiles: { from: "customers", to: "cdn", rate: 10 },
      },
      metrics: { egress: 0.3 },
      focus: ["customers", "cdn"],
      exchange: {
        edge: "tiles",
        request: { format: "http", head: "GET /tiles/14/10712/6131.png HTTP/1.1", headers: [["Host", "tiles.example.com"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=604800"],
            ["Age", "5120"],
            ["X-Cache", "HIT"],
          ],
        },
        marks: ["Cache-Control", "Age", "X-Cache"],
      },
    },
    {
      id: "numbers",
      kind: "case",
      focus: ["api", "db"],
    },
    {
      id: "servers",
      kind: "case",
      nodes: { api: { load: 44 } },
      metrics: { servers: 4 },
      focus: ["api"],
      exchange: {
        edge: "ping",
        request: {
          format: "text",
          head: "load test: 1 instance, 4 vCPU",
          body: "throughput: 800/s\ncpu: 61%\np99: 38 ms",
        },
        marks: ["throughput", "cpu", "p99"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
