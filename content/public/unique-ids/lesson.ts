import { defineLesson } from "@mufassall/scene-schema";

/**
 * An orders service that outgrows one database. Ids go from a database sequence to
 * per-shard sequences, UUIDv4, UUIDv7 and finally a 64-bit time + machine + sequence id.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "unique-ids",
  level: "intermediate",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "dup", unit: "/day", better: "down" },
    { id: "splits", unit: "/s", better: "down" },
  ],
  steps: [
    {
      id: "sequence",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        "db-1": { kind: "db", at: [9, 1], load: 35 },
      },
      edges: {
        order: { from: "client", to: "api", rate: 4 },
        "to-1": { from: "api", to: "db-1", rate: 4 },
      },
      metrics: { p95: 4, dup: 0, splits: 2 },
      focus: ["api", "db-1"],
      exchange: {
        edge: "to-1",
        request: {
          format: "sql",
          head: "INSERT INTO orders (user_id, total)",
          body: "VALUES ('u_42', 125000)\nRETURNING id;",
        },
        response: { format: "text", head: "id = 48213" },
        marks: ["RETURNING", "48213"],
      },
    },
    {
      id: "shards",
      kind: "problem",
      nodes: {
        "db-1": { load: 30 },
        "db-2": { kind: "db", at: [9, 7], load: 30 },
      },
      edges: { "to-2": { from: "api", to: "db-2", rate: 4, flow: "dup" } },
      metrics: { dup: 340 },
      focus: ["db-1", "db-2"],
      exchange: {
        edge: "to-2",
        request: {
          format: "sql",
          head: "INSERT INTO orders (user_id, total)",
          body: "VALUES ('u_77', 89000)\nRETURNING id;",
        },
        response: { format: "text", head: "id = 48214" },
        marks: ["u_77", "48214"],
      },
    },
    {
      id: "offsets",
      kind: "fix",
      edges: { "to-2": { flow: "request" } },
      metrics: { dup: 0 },
      focus: ["db-1", "db-2"],
      exchange: {
        edge: "to-2",
        request: {
          format: "sql",
          head: "ALTER SEQUENCE orders_id_seq",
          body: "INCREMENT BY 2 RESTART WITH 48300;",
        },
        response: { format: "text", head: "ALTER SEQUENCE" },
        marks: ["INCREMENT BY", "RESTART WITH"],
      },
    },
    {
      id: "uuid4",
      kind: "fix",
      nodes: { api: { load: 20 } },
      focus: ["api"],
      exchange: {
        edge: "order",
        request: {
          format: "json",
          head: "POST /orders HTTP/1.1",
          body: `{
  "user_id": "u_42",
  "total": 125000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "id": "9f1c2e4a-37b0-4d6e-a1f3-5c08e2b7d941",
  "status": "new"
}`,
        },
        marks: ["id"],
      },
    },
    {
      id: "random-index",
      kind: "problem",
      nodes: { "db-1": { load: 88, state: "slow" }, "db-2": { load: 86, state: "slow" } },
      metrics: { p95: 38, splits: 900 },
      focus: ["db-1", "db-2"],
      exchange: {
        edge: "to-1",
        request: {
          format: "sql",
          head: "SELECT avg_leaf_density, leaf_fragmentation",
          body: "FROM pgstatindex('orders_pkey');",
        },
        response: { format: "text", head: "61.2 | 48.7" },
        marks: ["avg_leaf_density", "leaf_fragmentation"],
      },
    },
    {
      id: "uuid7",
      kind: "fix",
      nodes: { "db-1": { load: 32, state: "ok" }, "db-2": { load: 31, state: "ok" } },
      metrics: { p95: 5, splits: 3 },
      focus: ["api", "db-1"],
      exchange: {
        edge: "order",
        request: {
          format: "json",
          head: "POST /orders HTTP/1.1",
          body: `{
  "user_id": "u_42",
  "total": 125000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "id": "01a205c0-aef8-7d4e-9b3a-5f0e2c81a7d4",
  "status": "new"
}`,
        },
        marks: ["id"],
      },
    },
    {
      id: "snowflake",
      kind: "case",
      nodes: { "api-2": { kind: "service", at: [4, 9], load: 20 } },
      edges: {
        "order-2": { from: "client", to: "api-2", rate: 4 },
        "to-2b": { from: "api-2", to: "db-2", rate: 4 },
      },
      focus: ["api", "api-2"],
      exchange: {
        edge: "to-2b",
        request: {
          format: "text",
          head: "DEBUG new id 250413553075367937",
          body: "time      1795392843512 ms\nmachine   3\nsequence  1",
        },
        marks: ["time", "machine", "sequence"],
      },
    },
    {
      id: "clock-back",
      kind: "problem",
      nodes: {
        ntp: { kind: "external", at: [0, 11] },
        "api-2": { state: "slow" },
      },
      edges: {
        sync: { from: "ntp", to: "api-2", rate: 1 },
        "to-2b": { flow: "dup" },
      },
      metrics: { dup: 12 },
      focus: ["ntp", "api-2"],
      exchange: {
        edge: "sync",
        request: {
          format: "text",
          head: "INFO clock step: -40 ms (offset from server 0.040 s)",
          body: "id 250413553075367937  time 1795392843512  seq 1\nid 250413553075367937  time 1795392843512  seq 1",
        },
        marks: ["clock step", "seq"],
      },
    },
    {
      id: "wait-out",
      kind: "fix",
      nodes: { "api-2": { state: "ok" } },
      edges: { "to-2b": { flow: "request" } },
      metrics: { dup: 0, p95: 6 },
      focus: ["api-2"],
      exchange: {
        edge: "to-2b",
        request: {
          format: "text",
          head: "WARN clock behind last id by 40 ms, waiting",
          body: "resumed after 40 ms, next id time 1795392843513\nrefuse if behind > 1000 ms",
        },
        marks: ["waiting", "refuse"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
