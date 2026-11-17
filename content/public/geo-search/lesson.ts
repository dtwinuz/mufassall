import { defineLesson } from "@mufassall/scene-schema";

/**
 * A taxi app looks for the nearest free drivers around a rider. 50 000 drivers in one city send
 * their position every 4 seconds. From a full table scan to geohash cells, neighbour cells at the
 * edges, an in-memory index with expiry, a quadtree for the dense centre and S2/H3 cells.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "geo-search",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "scanned", unit: "", better: "down" },
    { id: "missed", unit: "%", better: "down" },
    { id: "ghosts", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "scan",
      kind: "problem",
      nodes: {
        rider: { kind: "client", at: [0, 3] },
        drivers: { kind: "client", at: [0, 9] },
        api: { kind: "service", at: [4, 6], load: 70 },
        db: { kind: "db", at: [9, 9], state: "slow", load: 95 },
      },
      edges: {
        find: { from: "rider", to: "api", rate: 3 },
        ping: { from: "drivers", to: "api", rate: 10 },
        sql: { from: "api", to: "db", rate: 10 },
      },
      metrics: { p95: 900, scanned: 50000, missed: 0, ghosts: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT id, lat, lng FROM drivers",
          body: "WHERE status = 'free'\n  AND distance_km(lat, lng, 41.3110, 69.2797) < 2\nORDER BY distance_km(lat, lng, 41.3110, 69.2797)\nLIMIT 10;",
        },
        response: { format: "text", head: "10 rows, Seq Scan on drivers", body: "rows examined: 50000, time: 780 ms" },
        marks: ["distance_km", "Seq Scan", "examined"],
      },
    },
    {
      id: "box",
      kind: "problem",
      nodes: { db: { state: "slow", load: 80 } },
      metrics: { p95: 400, scanned: 9000 },
      focus: ["db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "CREATE INDEX drivers_lat ON drivers (lat);",
          body: "SELECT id FROM drivers\nWHERE lat BETWEEN 41.293 AND 41.329\n  AND lng BETWEEN 69.256 AND 69.303;",
        },
        response: { format: "text", head: "Index Scan using drivers_lat", body: "rows examined: 9000 (a 4 km stripe across the whole city)" },
        marks: ["drivers_lat", "BETWEEN", "stripe"],
      },
    },
    {
      id: "geohash",
      kind: "fix",
      nodes: {
        geo: { kind: "cache", at: [9, 3], load: 30 },
        db: { state: "ok", load: 20 },
      },
      edges: {
        sql: null,
        near: { from: "api", to: "geo", rate: 6 },
      },
      metrics: { p95: 25, scanned: 300 },
      focus: ["api", "geo"],
      exchange: {
        edge: "near",
        request: {
          format: "text",
          head: "geohash(41.3110, 69.2797) = tz6x9q",
          body: "tz6x9q  ~1.2 x 0.6 km cell\ntz6x9   ~4.9 x 4.9 km cell\ntz6x    ~39 x 20 km cell\nSCAN cell:tz6x9q  -> 300 drivers",
        },
        marks: ["tz6x9q", "tz6x9", "SCAN"],
      },
    },
    {
      id: "edge-cells",
      kind: "problem",
      metrics: { missed: 18 },
      focus: ["rider", "geo"],
      exchange: {
        edge: "near",
        request: {
          format: "text",
          head: "rider at tz6x9q, 40 m from its east border",
          body: "searched: tz6x9q -> nearest d_1842 at 900 m\nnot searched: tz6x9w -> d_7730 at 120 m\ncell tz6x9w shares only the prefix tz6x9",
        },
        marks: ["border", "not searched", "prefix"],
      },
    },
    {
      id: "neighbours",
      kind: "fix",
      nodes: { geo: { load: 40 } },
      metrics: { p95: 30, scanned: 2700, missed: 0 },
      focus: ["api", "geo"],
      exchange: {
        edge: "near",
        request: {
          format: "text",
          head: "GEOSEARCH drivers FROMLONLAT 69.2797 41.3110 BYRADIUS 2 km ASC COUNT 10",
        },
        response: {
          format: "text",
          head: "1) d_7730 0.12 km",
          body: "2) d_1842 0.90 km\n3) d_5519 1.30 km\n-- 9 cells read: the rider's cell and its 8 neighbours, then exact distance",
        },
        marks: ["BYRADIUS", "ASC", "9 cells", "exact distance"],
      },
    },
    {
      id: "updates",
      kind: "case",
      nodes: { geo: { load: 60 }, db: { load: 10 } },
      edges: { store: { from: "api", to: "geo", rate: 12 } },
      metrics: { ghosts: 1400 },
      focus: ["drivers", "api", "geo"],
      exchange: {
        edge: "ping",
        request: {
          format: "json",
          head: "POST /v1/drivers/d_1842/location HTTP/1.1",
          body: `{
  "lat": 41.3121,
  "lng": 69.2810,
  "status": "free",
  "sent_at": "2026-11-18T18:02:04Z"
}`,
        },
        response: { format: "text", head: "GEOADD drivers 69.2810 41.3121 d_1842" },
        marks: ["lat", "status", "sent_at", "GEOADD"],
      },
    },
    {
      id: "expiry",
      kind: "fix",
      metrics: { ghosts: 0 },
      focus: ["api", "geo"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "ZADD drivers:seen 1795543324 d_1842",
          body: "every 10 s: ZRANGEBYSCORE drivers:seen 0 now-30\n  -> ZREM drivers d_0091 d_4410 ...",
        },
        marks: ["drivers:seen", "now-30", "ZREM"],
      },
    },
    {
      id: "hot-cell",
      kind: "problem",
      nodes: { geo: { state: "slow", load: 100 } },
      metrics: { p95: 240, scanned: 27000 },
      focus: ["geo"],
      exchange: {
        edge: "near",
        request: {
          format: "text",
          head: "18:30 Friday, city centre",
          body: "cell tz6x9q: 3100 drivers, 900 searches/s\ncell tz6xb7 (suburb): 4 drivers, 2 searches/s",
        },
        marks: ["tz6x9q", "900 searches", "suburb"],
      },
    },
    {
      id: "quadtree",
      kind: "fix",
      nodes: { geo: { state: "ok", load: 45 } },
      metrics: { p95: 35, scanned: 1200 },
      focus: ["geo"],
      exchange: {
        edge: "near",
        request: {
          format: "text",
          head: "quadtree: split a square into 4 when it holds > 200 drivers",
          body: "centre: depth 9, squares ~300 m\nsuburbs: depth 4, squares ~10 km\nsearch walks only squares that touch the 2 km circle",
        },
        marks: ["split", "depth 9", "touch"],
      },
    },
    {
      id: "s2-h3",
      kind: "case",
      nodes: { geo2: { kind: "cache", at: [12, 6], load: 40 }, geo: { load: 40 } },
      edges: { "near-2": { from: "api", to: "geo2", rate: 3 } },
      focus: ["geo", "geo2"],
      exchange: {
        edge: "near-2",
        request: {
          format: "text",
          head: "cover circle(41.3110, 69.2797, 2 km) with H3 res 8",
          body: "cells: 882a100d2bfffff + ring of 6 + ring of 12\nshard of each cell: hash(cell at res 5) -> geo-1 or geo-2",
        },
        marks: ["H3", "ring of 6", "res 5"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
