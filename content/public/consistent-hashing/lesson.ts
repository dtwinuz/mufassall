import { defineLesson } from "@mufassall/scene-schema";

/**
 * A profile API in front of a small cache cluster. First keys are placed with `hash % N`,
 * then on a hash ring, then on a ring with virtual nodes.
 * Ring positions are 32-bit; numbers are a model scenario of ~5 000 reads/s, not measurements.
 */
export default defineLesson({
  slug: "consistent-hashing",
  level: "intermediate",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "hit", unit: "%", better: "up" },
    { id: "db-reads", unit: "/s", better: "down" },
    { id: "moved", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "modulo",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 2] },
        api: { kind: "service", at: [3, 2] },
        "cache-a": { kind: "cache", at: [8, 0] },
        "cache-b": { kind: "cache", at: [8, 3] },
        "cache-c": { kind: "cache", at: [8, 6] },
        db: { kind: "db", at: [3, 8], load: 20 },
      },
      edges: {
        read: { from: "client", to: "api", rate: 8 },
        "to-a": { from: "api", to: "cache-a", rate: 3 },
        "to-b": { from: "api", to: "cache-b", rate: 3 },
        "to-c": { from: "api", to: "cache-c", rate: 3 },
        "to-db": { from: "api", to: "db", rate: 1 },
      },
      metrics: { hit: 95, "db-reads": 250, moved: 0 },
      focus: ["api", "cache-b"],
      exchange: {
        edge: "to-b",
        request: {
          format: "text",
          head: "GET user:u_42",
        },
        response: { format: "text", head: '"plan=pro;lang=uz"' },
        marks: ["GET", "u_42"],
      },
    },
    {
      id: "add-node",
      kind: "problem",
      nodes: { "cache-d": { kind: "cache", at: [8, 9] } },
      edges: {
        "to-d": { from: "api", to: "cache-d", rate: 3 },
        "to-db": { rate: 10 },
      },
      metrics: { hit: 24, "db-reads": 3800, moved: 75 },
      focus: ["api", "cache-d"],
      exchange: {
        edge: "to-d",
        request: { format: "text", head: "GET user:u_42" },
        response: { format: "text", head: "(nil)" },
        marks: ["GET", "nil"],
      },
    },
    {
      id: "db-flood",
      kind: "problem",
      nodes: { db: { state: "slow", load: 98 } },
      edges: { "to-db": { rate: 12, flow: "fail" } },
      focus: ["db"],
      exchange: {
        edge: "to-db",
        request: {
          format: "sql",
          head: "SELECT plan, lang FROM users",
          body: "WHERE id = 'u_42';",
        },
        response: { format: "text", head: "pro | uz   (1 row, 410 ms)" },
        marks: ["users", "410 ms"],
      },
    },
    {
      id: "ring",
      kind: "fix",
      nodes: { "cache-d": null, db: { state: "ok", load: 20 } },
      edges: { "to-db": { rate: 1, flow: "request" } },
      metrics: { hit: 95, "db-reads": 250, moved: 0 },
      focus: ["api", "cache-b"],
      exchange: {
        edge: "to-b",
        request: {
          format: "text",
          head: "DEBUG ring lookup user:u_42",
          body: "key point   0x5A3C11F0\nclockwise   0x66600000 cache-b\nGET user:u_42",
        },
        response: { format: "text", head: '"plan=pro;lang=uz"' },
        marks: ["0x5A3C11F0", "clockwise"],
      },
    },
    {
      id: "add-on-ring",
      kind: "fix",
      nodes: { "cache-d": { kind: "cache", at: [8, 9] }, db: { load: 45 } },
      edges: {
        "to-d": { from: "api", to: "cache-d", rate: 3 },
        "to-db": { rate: 4 },
      },
      metrics: { hit: 71, "db-reads": 1450, moved: 25 },
      focus: ["cache-d", "cache-b"],
      exchange: {
        edge: "to-d",
        request: {
          format: "text",
          head: "INFO ring add cache-d at 0x4CC00000",
          body: "takes (0x0CC00000, 0x4CC00000] from cache-b\nmoved keys: 25.0%\nuser:u_42 0x5A3C11F0 -> cache-b (stays)",
        },
        marks: ["takes", "moved keys", "stays"],
      },
    },
    {
      id: "uneven",
      kind: "problem",
      nodes: {
        "cache-a": { load: 40 },
        "cache-b": { load: 20 },
        "cache-c": { load: 92, state: "slow" },
        "cache-d": { load: 50 },
        db: { load: 22 },
      },
      edges: { "to-c": { rate: 9 }, "to-b": { rate: 2 }, "to-db": { rate: 1 } },
      metrics: { hit: 93, "db-reads": 350 },
      focus: ["cache-c", "cache-b"],
      exchange: {
        edge: "to-c",
        request: { format: "text", head: "INFO keyspace" },
        response: {
          format: "text",
          head: "# Keyspace",
          body: "db0:keys=1803114,expires=1803114",
        },
        marks: ["keys"],
      },
    },
    {
      id: "vnodes",
      kind: "fix",
      nodes: {
        "cache-a": { load: 50 },
        "cache-b": { load: 49 },
        "cache-c": { load: 51, state: "ok" },
        "cache-d": { load: 50 },
        db: { load: 20 },
      },
      edges: { "to-c": { rate: 3 }, "to-b": { rate: 3 } },
      metrics: { hit: 95, "db-reads": 250 },
      focus: ["cache-a", "cache-b", "cache-c"],
      exchange: {
        edge: "to-c",
        request: {
          format: "text",
          head: "INFO ring rebuilt: 4 nodes x 128 vnodes",
          body: "cache-a#0    0x0031A2C4\ncache-c#17   0x0040F7A1\ncache-b#93   0x004E1B02\n...\nshare  a 25.4%  b 24.7%  c 25.1%  d 24.8%",
        },
        marks: ["vnodes", "cache-c#17", "share"],
      },
    },
    {
      id: "node-dies",
      kind: "case",
      nodes: {
        "cache-b": { state: "down", load: 0 },
        "cache-a": { load: 66 },
        "cache-c": { load: 67 },
        "cache-d": { load: 66 },
        db: { load: 44 },
      },
      edges: { "to-b": { flow: "fail", cut: true }, "to-db": { rate: 4 } },
      metrics: { hit: 72, "db-reads": 1400, moved: 25 },
      focus: ["cache-b", "api"],
      exchange: {
        edge: "to-b",
        request: { format: "text", head: "PING" },
        response: {
          format: "text",
          head: "WARN cache-b unreachable, removed from ring",
          body: "its 128 arcs now go to: a 33%  c 34%  d 33%",
        },
        marks: ["unreachable", "arcs"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
