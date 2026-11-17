import { defineLesson } from "@mufassall/scene-schema";

/**
 * A profile service on one PostgreSQL-style leader, then two streaming replicas,
 * then a failover. Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "replication",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "lag", unit: "ms", better: "down" },
    { id: "stale", unit: "%", better: "down" },
    { id: "lost", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "one-db",
      kind: "problem",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [3, 4], load: 50 },
        "db-a": { kind: "db", at: [7, 2], state: "slow", load: 95 },
      },
      edges: {
        req: { from: "app", to: "api", rate: 8 },
        sql: { from: "api", to: "db-a", rate: 8 },
      },
      metrics: { p95: 850, lag: 0, stale: 0, lost: 0 },
      focus: ["db-a"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT name, bio FROM profiles",
          body: "WHERE user_id = 'u_42';",
        },
        response: { format: "text", head: "(1 row)", body: "Time: 640.2 ms" },
        marks: ["user_id", "Time"],
      },
    },
    {
      id: "replicas",
      kind: "fix",
      nodes: {
        "db-a": { state: "ok", load: 35 },
        "db-b": { kind: "db", at: [6, 7], load: 30 },
        "db-c": { kind: "db", at: [10, 5], load: 30 },
      },
      edges: {
        sql: { rate: 2 },
        "ship-b": { from: "db-a", to: "db-b", rate: 4 },
        "ship-c": { from: "db-a", to: "db-c", rate: 4 },
        rb: { from: "api", to: "db-b", rate: 4 },
        rc: { from: "api", to: "db-c", rate: 4 },
      },
      metrics: { p95: 45, lag: 40 },
      focus: ["db-a", "db-b", "db-c"],
      exchange: {
        edge: "ship-b",
        request: { format: "text", head: "START_REPLICATION SLOT db_b PHYSICAL 3/A1000000" },
        response: {
          format: "text",
          head: "XLogData lsn=3/A1C04F28 len=8192",
          body: "XLogData lsn=3/A1C06F28 len=8192\nXLogData lsn=3/A1C08F28 len=8192",
        },
        marks: ["START_REPLICATION", "SLOT", "lsn"],
      },
    },
    {
      id: "stale",
      kind: "problem",
      nodes: { "db-b": { state: "slow", load: 70 } },
      metrics: { lag: 900, stale: 3 },
      focus: ["api", "db-b"],
      exchange: {
        edge: "rb",
        request: {
          format: "sql",
          head: "SELECT bio, updated_at FROM profiles",
          body: "WHERE user_id = 'u_42';",
        },
        response: {
          format: "text",
          head: " bio          | updated_at",
          body: " Backend dev  | 2026-11-17 09:10:55\n(1 row)",
        },
        marks: ["bio", "updated_at"],
      },
    },
    {
      id: "lag",
      kind: "case",
      nodes: { "db-b": { load: 85 } },
      edges: { "ship-b": { rate: 1 } },
      metrics: { lag: 2400, stale: 5 },
      focus: ["db-a", "db-b"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT application_name, replay_lag",
          body: "FROM pg_stat_replication;",
        },
        response: {
          format: "text",
          head: " application_name | replay_lag",
          body: " db_b             | 00:00:02.41\n db_c             | 00:00:00.04",
        },
        marks: ["replay_lag", "db_b", "db_c"],
      },
    },
    {
      id: "read-your-writes",
      kind: "fix",
      edges: { sql: { rate: 3 }, rb: { rate: 3 } },
      metrics: { stale: 0 },
      focus: ["api", "db-b", "db-a"],
      exchange: {
        edge: "rb",
        request: {
          format: "sql",
          head: "SELECT pg_last_wal_replay_lsn()",
          body: "  >= '3/A1C05000' AS caught_up;",
        },
        response: {
          format: "text",
          head: " caught_up",
          body: " f\n-> read u_42 from db-a this time",
        },
        marks: ["pg_last_wal_replay_lsn", "caught_up"],
      },
    },
    {
      id: "leader-dies",
      kind: "problem",
      nodes: { "db-a": { state: "down", load: 0 }, "db-b": { state: "ok", load: 40 } },
      edges: { sql: { flow: "fail" }, "ship-b": { cut: true }, "ship-c": { cut: true } },
      metrics: { p95: 5000 },
      focus: ["db-a"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "UPDATE profiles SET bio = 'Backend + SRE'",
          body: "WHERE user_id = 'u_42';",
        },
        response: {
          format: "text",
          head: "ERROR: could not connect to db-a:5432",
          body: "Connection refused",
        },
        marks: ["UPDATE", "Connection refused"],
      },
    },
    {
      id: "failover",
      kind: "fix",
      nodes: {
        sentinel: { kind: "service", at: [11, 1] },
        "db-c": { load: 55 },
      },
      edges: {
        sql: null,
        "ship-b": null,
        "ship-c": null,
        watch: { from: "sentinel", to: "db-a", flow: "fail", rate: 1 },
        promote: { from: "sentinel", to: "db-c", rate: 1 },
        w2: { from: "api", to: "db-c", rate: 2 },
        "ship-cb": { from: "db-c", to: "db-b", rate: 4 },
      },
      metrics: { p95: 50, lag: 30, lost: 12 },
      focus: ["sentinel", "db-c"],
      exchange: {
        edge: "promote",
        request: {
          format: "text",
          head: "failover: db-a down for 30 s",
          body: "candidates: db_b lsn 3/A1C04A10\n            db_c lsn 3/A1C04F28\npromote db_c (newest)\ntimeline 7 -> 8\ndb-a had 3/A1C05000: 12 commits lost",
        },
        marks: ["candidates", "promote", "timeline", "commits lost"],
      },
    },
    {
      id: "rejoin",
      kind: "case",
      nodes: { "db-a": { state: "ok", load: 20 } },
      edges: { watch: null, "ship-ca": { from: "db-c", to: "db-a", rate: 3 } },
      focus: ["db-a", "db-c"],
      exchange: {
        edge: "ship-ca",
        request: { format: "text", head: "pg_rewind --source-server=db-c" },
        response: {
          format: "text",
          head: "source timeline 8, target timeline 7",
          body: "rewinding from 3/A1C04F28\nremoved 12 commits not on the new leader\ndb-a: started as replica of db-c",
        },
        marks: ["pg_rewind", "timeline", "rewinding", "replica"],
      },
    },
    {
      id: "sync",
      kind: "fix",
      edges: { "ship-cb": { rate: 5 }, w2: { rate: 3 } },
      metrics: { p95: 58, lag: 5, lost: 0 },
      focus: ["db-c", "db-b"],
      exchange: {
        edge: "w2",
        request: {
          format: "sql",
          head: "ALTER SYSTEM SET synchronous_standby_names",
          body: "  = 'ANY 1 (db_b, db_a)';\nSELECT pg_reload_conf();",
        },
        response: {
          format: "text",
          head: "ALTER SYSTEM",
          body: "COMMIT now waits for 1 replica: +3 ms",
        },
        marks: ["synchronous_standby_names", "ANY 1", "pg_reload_conf", "COMMIT"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
