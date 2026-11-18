import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop moves customer phone numbers from a free-text `phone` column to a normalised
 * `phone_e164` column on a 40-million-row table, without stopping checkout. A rename breaks the
 * old pods of a rolling deploy, an instant ALTER queues behind a long report and blocks every
 * query, and then the safe path: expand (nullable column, lock_timeout, concurrent index), dual
 * write, batched backfill, verify and switch reads, contract (NOT VALID + VALIDATE), drop last.
 * SQL is PostgreSQL. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "zero-downtime-migrations",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "errors", unit: "%", better: "down" },
    { id: "blocked", unit: "s", better: "down" },
    { id: "backfill", unit: "%", better: "up" },
    { id: "rollback", unit: "min", better: "down" },
  ],
  steps: [
    {
      id: "naive",
      kind: "case",
      nodes: {
        users: { kind: "client", at: [0, 4] },
        old: { kind: "service", at: [4, 2], load: 50 },
        db: { kind: "db", at: [9, 5] },
        ci: { kind: "worker", at: [0, 9] },
      },
      edges: {
        req: { from: "users", to: "old", rate: 4 },
        q: { from: "old", to: "db", rate: 4 },
        migrate: { from: "ci", to: "db", rate: 1 },
      },
      metrics: { errors: 0.1, blocked: 0, backfill: 0, rollback: 15 },
      focus: ["ci", "db"],
      exchange: {
        edge: "migrate",
        request: {
          format: "sql",
          head: "-- migration 0042, runs right before the rollout",
          body: "ALTER TABLE customers\n  RENAME COLUMN phone TO phone_e164;\n-- then deploy v2, which reads phone_e164\n-- customers: 40 M rows, checkout writes 900 rows/s",
        },
        response: { format: "text", head: "ALTER TABLE  12 ms" },
        marks: ["0042", "RENAME COLUMN", "phone_e164", "40 M rows"],
      },
    },
    {
      id: "rename",
      kind: "problem",
      nodes: {
        old: { state: "down" },
        new: { kind: "service", at: [4, 7], load: 30 },
      },
      edges: {
        req: { flow: "fail" },
        q: { flow: "fail" },
        req2: { from: "users", to: "new", rate: 1 },
        q2: { from: "new", to: "db", rate: 1 },
      },
      metrics: { errors: 75, rollback: 25 },
      focus: ["old", "new", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "14:00:03 migration 0042 done",
          body: "14:00:04 old  ERROR: column \"phone\" does not exist\n14:00:04 old  POST /checkout -> 500\n14:02:30 rollout 3/12 pods on v2\n-- 9 of 12 pods still run the old code",
        },
        marks: ["does not exist", "500", "3/12", "old code"],
      },
    },
    {
      id: "lock",
      kind: "problem",
      nodes: {
        old: { state: "slow" },
        new: null,
        report: { kind: "worker", at: [12, 1], load: 90 },
        db: { state: "slow" },
      },
      edges: {
        req: { flow: "request", rate: 4 },
        q: { flow: "request", rate: 1 },
        scan: { from: "report", to: "db", rate: 1 },
      },
      metrics: { errors: 31, blocked: 38, rollback: 15 },
      focus: ["report", "db", "ci"],
      exchange: {
        edge: "migrate",
        request: {
          format: "text",
          head: "activity on customers  14:20:41",
          body: "pid 811  report   SELECT ...   running since 13:42   holds AccessShareLock\npid 902  migrate  ALTER TABLE ... ADD COLUMN   waiting AccessExclusiveLock\npid 903+ app      SELECT / UPDATE   waiting behind 902   (x 1 240)\n-- the ALTER itself needs 5 ms",
        },
        marks: ["AccessShareLock", "waiting AccessExclusiveLock", "waiting behind 902", "5 ms"],
      },
    },
    {
      id: "expand",
      kind: "fix",
      nodes: { report: null, db: { state: "ok" }, old: { state: "ok" } },
      edges: { q: { rate: 4 } },
      metrics: { errors: 0.1, blocked: 2, rollback: 3 },
      focus: ["ci", "db"],
      exchange: {
        edge: "migrate",
        request: {
          format: "sql",
          head: "-- 0043 expand",
          body: "SET lock_timeout = '2s';\nALTER TABLE customers ADD COLUMN phone_e164 text;  -- nullable, no default\nCREATE INDEX CONCURRENTLY customers_phone_e164\n    ON customers (phone_e164);\n-- lock_timeout hit? wait 30 s and try again",
        },
        response: { format: "text", head: "ALTER TABLE  4 ms", body: "CREATE INDEX  11 min, writes never blocked" },
        marks: ["lock_timeout", "ADD COLUMN", "CONCURRENTLY", "try again"],
      },
    },
    {
      id: "dual",
      kind: "fix",
      nodes: { new: { kind: "service", at: [4, 7], load: 40 } },
      edges: {
        req: { rate: 2 },
        q: { rate: 2 },
        req2: { from: "users", to: "new", rate: 2 },
        q2: { from: "new", to: "db", rate: 2 },
      },
      focus: ["old", "new", "db"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "-- v2: writes both columns, still reads the old one",
          body: "UPDATE customers\n   SET phone      = $1,\n       phone_e164 = $2\n WHERE id = $3;\n-- reads still: SELECT phone FROM customers ...",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["phone", "phone_e164", "reads still"],
      },
    },
    {
      id: "backfill",
      kind: "fix",
      nodes: {
        old: null,
        new: { load: 60 },
        filler: { kind: "worker", at: [12, 9], load: 40 },
      },
      edges: {
        req2: { rate: 4 },
        q2: { rate: 4 },
        fill: { from: "filler", to: "db", rate: 2 },
      },
      metrics: { backfill: 39 },
      focus: ["filler", "db"],
      exchange: {
        edge: "fill",
        request: {
          format: "sql",
          head: "-- backfill, batch 3 112 of 8 000",
          body: "UPDATE customers\n   SET phone_e164 = normalize_phone(phone)\n WHERE id BETWEEN 15555001 AND 15560000\n   AND phone_e164 IS NULL;\n-- then sleep 50 ms; pause while replica lag > 1 s",
        },
        response: { format: "text", head: "UPDATE 4987  140 ms" },
        marks: ["BETWEEN", "IS NULL", "sleep 50 ms", "replica lag", "UPDATE 4987"],
      },
    },
    {
      id: "switch",
      kind: "fix",
      nodes: { filler: null },
      metrics: { backfill: 100 },
      focus: ["new", "db"],
      exchange: {
        edge: "q2",
        request: {
          format: "sql",
          head: "-- before switching reads",
          body: "SELECT count(*)\n  FROM customers\n WHERE phone_e164 IS DISTINCT FROM normalize_phone(phone);",
        },
        response: {
          format: "text",
          head: "count = 0",
          body: "v3 reads phone_e164, still writes both\nflag read-e164: 5% -> 50% -> 100% over 2 days",
        },
        marks: ["IS DISTINCT FROM", "count = 0", "still writes both", "read-e164"],
      },
    },
    {
      id: "contract",
      kind: "fix",
      focus: ["ci", "db"],
      exchange: {
        edge: "migrate",
        request: {
          format: "sql",
          head: "-- 0044 contract, before v4 stops writing phone",
          body: "ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;\nALTER TABLE customers ADD CONSTRAINT phone_e164_nn\n  CHECK (phone_e164 IS NOT NULL) NOT VALID;\nALTER TABLE customers VALIDATE CONSTRAINT phone_e164_nn;",
        },
        response: { format: "text", head: "VALIDATE  3 min 40 s", body: "reads and writes not blocked" },
        marks: ["DROP NOT NULL", "NOT VALID", "VALIDATE CONSTRAINT", "not blocked"],
      },
    },
    {
      id: "drop",
      kind: "fix",
      focus: ["ci", "db"],
      exchange: {
        edge: "migrate",
        request: {
          format: "sql",
          head: "-- 0045 contract, 7 days after the last reader of phone",
          body: "SET lock_timeout = '2s';\nALTER TABLE customers DROP COLUMN phone;",
        },
        response: { format: "text", head: "ALTER TABLE  3 ms", body: "-- metadata only: the space comes back as rows are rewritten" },
        marks: ["7 days", "lock_timeout", "DROP COLUMN", "metadata only"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "one-update",
      from: "dual",
      steps: [
        {
          id: "big-update",
          kind: "problem",
          nodes: {
            filler: { kind: "worker", at: [12, 9], load: 100 },
            db: { state: "slow" },
            old: { state: "slow" },
            new: { state: "slow" },
          },
          edges: {
            fill: { from: "filler", to: "db", rate: 4 },
            q: { flow: "fail" },
            q2: { flow: "fail" },
          },
          metrics: { errors: 18, blocked: 30 },
          focus: ["filler", "db"],
          exchange: {
            edge: "fill",
            request: {
              format: "text",
              head: "14:05 UPDATE customers SET phone_e164 = normalize_phone(phone);",
              body: "running 18 min, 26 M rows locked until COMMIT\n14:23 v2   UPDATE customers ...  waiting for row lock\n14:23 old  UPDATE customers ...  waiting for row lock\nreplica lag 9 min, WAL +31 GB",
            },
            marks: ["until COMMIT", "waiting for row lock", "replica lag", "WAL"],
          },
        },
        {
          id: "cancel",
          kind: "fix",
          nodes: { filler: { state: "down", load: 0 }, db: { state: "ok" }, old: { state: "ok" }, new: { state: "ok" } },
          edges: { fill: { rate: 0, cut: true }, q: { flow: "request" }, q2: { flow: "request" } },
          metrics: { errors: 0.2, blocked: 0, backfill: 0 },
          focus: ["filler", "db"],
          exchange: {
            edge: "fill",
            request: { format: "sql", head: "SELECT pg_cancel_backend(7741);" },
            response: {
              format: "text",
              head: "pg_cancel_backend = t",
              body: "ERROR: canceling statement due to user request\nrow locks released at once\nautovacuum: 26 M dead row versions on customers",
            },
            marks: ["pg_cancel_backend", "canceling statement", "released at once", "dead row versions"],
          },
        },
        {
          id: "batched",
          kind: "case",
          nodes: { filler: { state: "ok", load: 40 }, old: null },
          edges: { fill: { rate: 2, cut: false } },
          metrics: { errors: 0.1, backfill: 100 },
          focus: ["filler", "db"],
          exchange: {
            edge: "fill",
            request: {
              format: "text",
              head: "backfill v2: 8 000 batches x 5 000 rows, after 12/12 pods on v2",
              body: "longest row lock   140 ms\nreplica lag max    0.6 s\ntotal              26 min\nerrors             none",
            },
            marks: ["12/12 pods", "longest row lock", "replica lag max", "total"],
          },
        },
      ],
    },
  ],
});
