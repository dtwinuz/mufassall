import { defineLesson } from "@mufassall/scene-schema";

/**
 * A chat service whose `messages` table outgrows one server. Routing lives in the API.
 * Shards are numbered from 0 so `hash % n` maps directly to a shard.
 * Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "sharding",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "hottest", unit: "%", better: "down" },
    { id: "fanout", unit: "", better: "down" },
    { id: "disk", unit: "TB", better: "down" },
  ],
  steps: [
    {
      id: "one-db",
      kind: "problem",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [3, 4], load: 45 },
        db: { kind: "db", at: [8, 4], state: "slow", load: 98 },
      },
      edges: {
        req: { from: "app", to: "api", rate: 8 },
        sql: { from: "api", to: "db", rate: 8 },
      },
      metrics: { p95: 1400, hottest: 98, fanout: 1, disk: 6 },
      focus: ["db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "INSERT INTO messages (chat_id, sender_id, body)",
          body: "VALUES ('c_8812', 'u_42', 'see you at 7');",
        },
        response: { format: "text", head: "INSERT 0 1", body: "Time: 1380.5 ms" },
        marks: ["chat_id", "Time"],
      },
    },
    {
      id: "range",
      kind: "fix",
      nodes: {
        db: null,
        "shard-0": { kind: "db", at: [8, 0], load: 20 },
        "shard-1": { kind: "db", at: [8, 3], load: 25 },
        "shard-2": { kind: "db", at: [8, 6], load: 65 },
      },
      edges: {
        q0: { from: "api", to: "shard-0", rate: 1 },
        q1: { from: "api", to: "shard-1", rate: 1 },
        q2: { from: "api", to: "shard-2", rate: 6 },
      },
      metrics: { p95: 300, hottest: 65, disk: 2.2 },
      focus: ["shard-0", "shard-1", "shard-2"],
      exchange: {
        edge: "q2",
        request: { format: "text", head: "route INSERT messages" },
        response: {
          format: "text",
          head: "key: created_at = 2026-11-18",
          body: "ranges: 2024 -> shard-0, 2025 -> shard-1,\n        2026 -> shard-2\n=> shard-2",
        },
        marks: ["created_at", "ranges"],
      },
    },
    {
      id: "hot",
      kind: "problem",
      nodes: {
        "shard-0": { load: 4 },
        "shard-1": { load: 6 },
        "shard-2": { state: "slow", load: 100 },
      },
      edges: { q2: { rate: 10, flow: "fail" }, q0: { rate: 0 }, q1: { rate: 0 } },
      metrics: { p95: 1900, hottest: 100 },
      focus: ["shard-2"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "INSERT INTO messages (chat_id, sender_id, body)",
          body: "VALUES ('c_8812', 'u_42', 'on my way');",
        },
        response: {
          format: "text",
          head: "ERROR: canceling statement due to statement timeout",
          body: "shard-2 cpu 100%, shard-0 cpu 4%, shard-1 cpu 6%",
        },
        marks: ["statement timeout", "cpu"],
      },
    },
    {
      id: "hash",
      kind: "fix",
      nodes: {
        "shard-0": { load: 34 },
        "shard-1": { load: 33 },
        "shard-2": { state: "ok", load: 35 },
      },
      edges: { q0: { rate: 4 }, q1: { rate: 4 }, q2: { rate: 4, flow: "request" } },
      metrics: { p95: 22, hottest: 35, disk: 2 },
      focus: ["api"],
      exchange: {
        edge: "q2",
        request: { format: "text", head: "route INSERT messages" },
        response: {
          format: "text",
          head: "key: chat_id = c_8812",
          body: "hash(c_8812) = 2903417\n2903417 % 3 = 2\n=> shard-2",
        },
        marks: ["chat_id", "hash", "shard-2"],
      },
    },
    {
      id: "cross",
      kind: "case",
      nodes: { "shard-2": { load: 70 } },
      edges: { q0: { flow: "dup" }, q1: { flow: "dup" }, q2: { flow: "dup" } },
      metrics: { p95: 615, fanout: 3 },
      focus: ["api", "shard-2"],
      exchange: {
        edge: "q2",
        request: { format: "text", head: "query messages WHERE sender_id = 'u_42'" },
        response: {
          format: "text",
          head: "-> shard-0: 20 rows, 41 ms",
          body: "-> shard-1: 20 rows, 38 ms\n-> shard-2: 20 rows, 612 ms\nmerge: 60 -> 20 newest\ntotal: 615 ms",
        },
        marks: ["sender_id", "merge", "total"],
      },
    },
    {
      id: "celebrity",
      kind: "problem",
      nodes: {
        "shard-0": { load: 30 },
        "shard-1": { state: "slow", load: 95 },
        "shard-2": { load: 32 },
      },
      edges: {
        q0: { flow: "request", rate: 2 },
        q1: { flow: "request", rate: 10 },
        q2: { flow: "request", rate: 2 },
      },
      metrics: { p95: 450, hottest: 95, fanout: 1 },
      focus: ["shard-1"],
      exchange: {
        edge: "q1",
        request: { format: "text", head: "top keys, last 5 min (shard-1)" },
        response: {
          format: "text",
          head: "chat_id=c_1       41% of writes",
          body: "chat_id=c_8812    0.2%\nchat_id=c_310     0.1%",
        },
        marks: ["top keys", "c_1"],
      },
    },
    {
      id: "split-key",
      kind: "fix",
      nodes: {
        "shard-0": { load: 44 },
        "shard-1": { state: "ok", load: 45 },
        "shard-2": { load: 43 },
      },
      edges: { q0: { rate: 4 }, q1: { rate: 4 }, q2: { rate: 4 } },
      metrics: { p95: 30, hottest: 45 },
      focus: ["api", "shard-1"],
      exchange: {
        edge: "q0",
        request: { format: "text", head: "route INSERT messages chat_id=c_1" },
        response: {
          format: "text",
          head: "hot chat: 8 buckets",
          body: "bucket = msg_id % 8 = 5\nhash(c_1#5) % 3 = 0\n=> shard-0",
        },
        marks: ["hot chat", "bucket"],
      },
    },
    {
      id: "add-shard",
      kind: "problem",
      nodes: {
        "shard-3": { kind: "db", at: [8, 9], load: 10 },
        mover: { kind: "worker", at: [11, 6], load: 100 },
        "shard-2": { state: "slow", load: 90 },
      },
      edges: {
        q3: { from: "api", to: "shard-3", rate: 1 },
        "copy-in": { from: "shard-2", to: "mover", rate: 8 },
        "copy-out": { from: "mover", to: "shard-3", rate: 8 },
      },
      metrics: { p95: 380, hottest: 90, disk: 2.6 },
      focus: ["mover", "shard-3"],
      exchange: {
        edge: "copy-out",
        request: { format: "text", head: "reshard: hash % 3 -> hash % 4" },
        response: {
          format: "text",
          head: "rows to check: 6.9B",
          body: "rows that move: 5.2B (75%)\ncopied: 11%, eta 9 days",
        },
        marks: ["rows that move", "eta"],
      },
    },
    {
      id: "slots",
      kind: "fix",
      nodes: {
        "shard-0": { load: 40 },
        "shard-1": { load: 41 },
        "shard-2": { state: "ok", load: 42 },
        "shard-3": { load: 38 },
        mover: { load: 30 },
      },
      edges: { q3: { rate: 4 }, "copy-in": { rate: 2 }, "copy-out": { rate: 2 } },
      metrics: { p95: 28, hottest: 42, disk: 1.95 },
      focus: ["mover", "shard-3"],
      exchange: {
        edge: "copy-out",
        request: { format: "text", head: "move slot 517: shard-2 -> shard-3" },
        response: {
          format: "text",
          head: "copy: 6.8M rows",
          body: "catch up: 2140 new rows\nswitch: map v42 -> v43\nslots on shard-3: 256 of 1024",
        },
        marks: ["slot", "catch up", "switch", "slots"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
