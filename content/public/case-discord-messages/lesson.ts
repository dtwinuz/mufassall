import { defineLesson } from "@mufassall/scene-schema";

/**
 * Case study built only on Discord's public engineering posts:
 * https://discord.com/blog/how-discord-stores-billions-of-messages (2017) and
 * https://discord.com/blog/how-discord-stores-trillions-of-messages (2023).
 * Every number is taken from those posts. Wire messages are simplified illustrations of the
 * mechanism, not Discord's real code or endpoint names.
 */
export default defineLesson({
  slug: "case-discord-messages",
  level: "advanced",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "read", unit: "ms", better: "down" },
    { id: "insert", unit: "ms", better: "down" },
    { id: "nodes", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "mongo",
      kind: "case",
      nodes: {
        users: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [3, 3], load: 30 },
        mongo: { kind: "db", at: [9, 3], state: "slow", load: 95 },
      },
      edges: {
        send: { from: "users", to: "api", rate: 4 },
        query: { from: "api", to: "mongo", rate: 4 },
      },
      focus: ["api", "mongo"],
      exchange: {
        edge: "query",
        request: {
          format: "text",
          head: "db.messages.find({ channel_id: 1234 }).sort({ created_at: -1 }).limit(50)",
          body: "index: { channel_id: 1, created_at: -1 }\nstored: about 100 000 000 messages (November 2015)\n-- the data and the index no longer fit in RAM",
        },
        marks: ["channel_id", "created_at", "RAM"],
      },
    },
    {
      id: "partition-key",
      kind: "fix",
      nodes: {
        mongo: null,
        n1: { kind: "db", at: [9, 0], load: 30 },
        n2: { kind: "db", at: [10, 3], load: 30 },
        n3: { kind: "db", at: [9, 6], load: 30 },
      },
      edges: {
        q1: { from: "api", to: "n1", rate: 2 },
        q2: { from: "api", to: "n2", rate: 2 },
        q3: { from: "api", to: "n3", rate: 2 },
      },
      metrics: { read: 5, nodes: 12 },
      focus: ["api", "n1", "n2", "n3"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "CREATE TABLE messages (",
          body: "  channel_id bigint,\n  bucket int,\n  message_id bigint,\n  author_id bigint,\n  content text,\n  PRIMARY KEY ((channel_id, bucket), message_id)\n);",
        },
        marks: ["channel_id", "bucket", "message_id", "PRIMARY KEY"],
      },
    },
    {
      id: "tombstones",
      kind: "problem",
      nodes: { n2: { state: "slow", load: 100 } },
      edges: { q2: { flow: "fail" } },
      focus: ["n2"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "SELECT * FROM messages WHERE channel_id = 1234 AND bucket = 41 LIMIT 50;",
        },
        response: {
          format: "text",
          head: "1 row (about 20 s)",
          body: "scanned: millions of tombstones to return one message\nnode: 10 s stop-the-world GC pause",
        },
        marks: ["bucket", "tombstones", "GC"],
      },
    },
    {
      id: "growth",
      kind: "case",
      nodes: { n2: { state: "ok", load: 60 }, n1: { load: 60 }, n3: { load: 60 } },
      edges: { q2: { flow: "request" }, send: { rate: 8 }, q1: { rate: 4 }, q3: { rate: 4 } },
      metrics: { nodes: 177 },
      focus: ["n1", "n2", "n3"],
      exchange: {
        edge: "q1",
        request: {
          format: "text",
          head: "cluster cassandra-messages, early 2022",
          body: "nodes: 177\nreplication factor: 3\nstored: trillions of messages",
        },
        marks: ["177", "replication factor", "trillions"],
      },
    },
    {
      id: "hot-partition",
      kind: "problem",
      nodes: { n2: { state: "slow", load: 100 } },
      edges: { q2: { rate: 12, flow: "fail" } },
      metrics: { read: 125, insert: 70 },
      focus: ["api", "n2"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "CONSISTENCY QUORUM;",
          body: "SELECT * FROM messages WHERE channel_id = 1234 AND bucket = 52 LIMIT 50;\n-- a huge server: everyone opens the same channel at once",
        },
        response: {
          format: "text",
          head: "slow: one (channel_id, bucket) partition, one set of replicas",
          body: "every other query on these nodes waits behind it",
        },
        marks: ["QUORUM", "channel_id", "every other query"],
      },
    },
    {
      id: "compaction",
      kind: "problem",
      nodes: { n1: { state: "slow", load: 90 } },
      focus: ["n1", "n2"],
      exchange: {
        edge: "q1",
        request: {
          format: "text",
          head: "n1: pending compactions keep growing",
          body: "n1: each read touches more files, latency climbs\nn1: long GC pause, the node is manually rebooted\nops: take the node out of rotation, compact, bring it back, replay hints",
        },
        marks: ["compactions", "GC", "hints"],
      },
    },
    {
      id: "data-service",
      kind: "fix",
      nodes: {
        ds: { kind: "service", at: [6, 3], load: 40 },
        n1: { state: "ok", load: 60 },
        n2: { state: "slow", load: 80 },
      },
      edges: {
        q1: null,
        q2: null,
        q3: null,
        call: { from: "api", to: "ds", rate: 8 },
        d1: { from: "ds", to: "n1", rate: 3 },
        d2: { from: "ds", to: "n2", rate: 3 },
        d3: { from: "ds", to: "n3", rate: 3 },
      },
      focus: ["api", "ds"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "gRPC: get messages (simplified)",
          body: "channel_id: 1234\nlimit: 50\n-- one endpoint per database query, no business logic",
        },
        marks: ["gRPC", "channel_id", "business logic"],
      },
    },
    {
      id: "coalescing",
      kind: "fix",
      nodes: { n2: { state: "ok", load: 40 }, ds: { load: 50 } },
      edges: { call: { rate: 12 }, d2: { rate: 1 } },
      focus: ["ds", "n2"],
      exchange: {
        edge: "d2",
        request: {
          format: "text",
          head: "many users ask for the same row at the same time",
          body: "request 1: starts a worker task, one database query\nrequests 2..N: subscribe to that task\nall of them get the same rows",
        },
        marks: ["worker task", "subscribe", "same rows"],
      },
    },
    {
      id: "routing",
      kind: "fix",
      nodes: { ds2: { kind: "service", at: [6, 7], load: 40 } },
      edges: {
        call2: { from: "api", to: "ds2", rate: 6 },
        d3: null,
        e3: { from: "ds2", to: "n3", rate: 2 },
        call: { rate: 6 },
      },
      focus: ["api", "ds", "ds2"],
      exchange: {
        edge: "call2",
        request: {
          format: "text",
          head: "routing key: channel_id",
          body: "hash(channel 1234) on the consistent hash ring -> data service A\nhash(channel 9876) on the consistent hash ring -> data service B\n-- every request for one channel reaches the same instance",
        },
        marks: ["channel_id", "consistent hash", "same instance"],
      },
    },
    {
      id: "migrate",
      kind: "fix",
      nodes: {
        mig: { kind: "worker", at: [10, 9], load: 90 },
        scylla: { kind: "db", at: [12, 7], load: 50 },
      },
      edges: {
        scan: { from: "n3", to: "mig", rate: 8 },
        copy: { from: "mig", to: "scylla", rate: 8 },
      },
      focus: ["n3", "mig", "scylla"],
      exchange: {
        edge: "copy",
        request: {
          format: "text",
          head: "migrator (Rust): token range done, checkpoint saved to SQLite",
          body: "peak: 3.2 million messages per second\nestimate: 9 days (first plan with the Spark migrator: three months)\nprogress: 99.9999% -- the last ranges time out on tombstones",
        },
        marks: ["token range", "SQLite", "estimate", "99.9999%"],
      },
    },
    {
      id: "results",
      kind: "case",
      nodes: {
        mig: null,
        n1: null,
        n2: null,
        n3: null,
        scylla: { at: [10, 3], load: 40 },
        ds: { load: 40 },
        ds2: { load: 40 },
      },
      edges: {
        f1: { from: "ds", to: "scylla", rate: 4 },
        f2: { from: "ds2", to: "scylla", rate: 4 },
      },
      metrics: { read: 15, insert: 5, nodes: 72 },
      focus: ["ds", "ds2", "scylla"],
      exchange: {
        edge: "f1",
        request: {
          format: "text",
          head: "after the switch to ScyllaDB (May 2022)",
          body: "p99 history fetch: 40-125 ms -> 15 ms\np99 insert: 5-70 ms -> 5 ms\nnodes: 177 -> 72, disk per node: about 4 TB -> 9 TB",
        },
        marks: ["p99", "72", "9 TB"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
