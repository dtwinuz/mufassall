import { defineLesson } from "@mufassall/scene-schema";

/**
 * A small wallet app moves money between accounts. First without a transaction, then with one,
 * then with two app servers racing on the same rows. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "transactions",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "broken", unit: "/day", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "retries", unit: "/min", better: "down" },
  ],
  steps: [
    {
      id: "transfer",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 2] },
        db: { kind: "db", at: [9, 4] },
      },
      edges: {
        in: { from: "app", to: "api", rate: 2 },
        sql: { from: "api", to: "db", rate: 2 },
      },
      metrics: { broken: 0, p95: 20, retries: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "UPDATE accounts SET balance = balance - 50000",
          body: "WHERE id = 'acc_42';\nUPDATE accounts SET balance = balance + 50000\nWHERE id = 'acc_77';",
        },
        response: { format: "text", head: "UPDATE 1", body: "UPDATE 1" },
        marks: ["acc_42", "acc_77", "UPDATE 1"],
      },
    },
    {
      id: "half-done",
      kind: "problem",
      nodes: { api: { state: "down" } },
      edges: { sql: { cut: true } },
      metrics: { broken: 6 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "text",
          head: "10:41:07.112 UPDATE acc_42 -50000 ok",
          body: "10:41:07.115 api-1 killed (out of memory)\n10:41:07.115 UPDATE acc_77 +50000 never sent",
        },
        marks: ["killed", "never sent"],
      },
    },
    {
      id: "atomic",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { sql: { cut: false } },
      metrics: { broken: 0, p95: 22 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "UPDATE accounts SET balance = balance - 50000\nWHERE id = 'acc_42';\nUPDATE accounts SET balance = balance + 50000\nWHERE id = 'acc_77';\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT" },
        marks: ["BEGIN", "COMMIT"],
      },
    },
    {
      id: "rules",
      kind: "case",
      edges: { sql: { flow: "fail" } },
      focus: ["db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "UPDATE accounts SET balance = balance - 900000\nWHERE id = 'acc_42';",
        },
        response: {
          format: "text",
          head: 'ERROR: new row violates check constraint "balance_nonneg"',
          body: "ROLLBACK",
        },
        marks: ["balance_nonneg", "ROLLBACK"],
      },
    },
    {
      id: "dirty-read",
      kind: "case",
      nodes: { report: { kind: "worker", at: [9, 0] } },
      edges: {
        sql: { flow: "request" },
        scan: { from: "report", to: "db", rate: 1 },
      },
      focus: ["report", "db"],
      exchange: {
        edge: "scan",
        request: {
          format: "sql",
          head: "SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;",
          body: "SELECT SUM(balance) FROM accounts;",
        },
        response: {
          format: "text",
          head: "9950000",
          body: "-- expected 10000000: acc_42 is debited,\n-- acc_77 is not credited yet",
        },
        marks: ["READ UNCOMMITTED", "SUM", "expected"],
      },
    },
    {
      id: "lost-update",
      kind: "problem",
      nodes: { api2: { kind: "service", at: [4, 7] } },
      edges: {
        in2: { from: "app", to: "api2", rate: 2 },
        sql2: { from: "api2", to: "db", rate: 2 },
      },
      metrics: { broken: 9 },
      focus: ["api", "api2", "db"],
      exchange: {
        edge: "sql2",
        request: {
          format: "text",
          head: "READ COMMITTED: two payments from acc_42",
          body: "T1  SELECT balance -> 200000\nT2  SELECT balance -> 200000\nT1  UPDATE balance = 150000  (-50000)\nT2  UPDATE balance = 170000  (-30000)\nT1  COMMIT\nT2  COMMIT\nbalance 170000, expected 120000",
        },
        marks: ["READ COMMITTED", "T1", "T2", "expected"],
      },
    },
    {
      id: "for-update",
      kind: "fix",
      metrics: { broken: 0, p95: 30 },
      focus: ["api", "api2", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "SELECT balance FROM accounts\nWHERE id = 'acc_42' FOR UPDATE;\n-- 200000; T2 waits here until T1 ends\nUPDATE accounts SET balance = 150000\nWHERE id = 'acc_42';\nCOMMIT;",
        },
        response: { format: "text", head: "T2 then reads 150000 and writes 120000" },
        marks: ["FOR UPDATE", "waits", "120000"],
      },
    },
    {
      id: "lock-wait",
      kind: "problem",
      nodes: {
        fraud: { kind: "external", at: [0, 0], state: "slow" },
        api: { state: "slow" },
        api2: { state: "slow" },
        db: { load: 70 },
      },
      edges: { check: { from: "api", to: "fraud", rate: 2 } },
      metrics: { p95: 1400 },
      focus: ["api", "fraud", "db"],
      exchange: {
        edge: "sql2",
        request: {
          format: "text",
          head: "LOG: process 4121 still waiting for ShareLock",
          body: "on transaction 88123 after 1000.000 ms\nDETAIL: Process holding the lock: 4118.\nSTATEMENT: SELECT balance FROM accounts\n  WHERE id = 'acc_42' FOR UPDATE",
        },
        marks: ["still waiting", "4118"],
      },
    },
    {
      id: "version",
      kind: "fix",
      nodes: {
        fraud: { state: "ok" },
        api: { state: "ok" },
        api2: { state: "ok" },
        db: { load: 25 },
      },
      edges: { sql: { flow: "retry" } },
      metrics: { p95: 320, retries: 6 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT balance, version FROM accounts",
          body: "WHERE id = 'acc_42';  -- 200000, 7\n-- no lock held: call the fraud check\nUPDATE accounts\nSET balance = 150000, version = 8\nWHERE id = 'acc_42' AND version = 7;",
        },
        response: { format: "text", head: "UPDATE 0", body: "-- the row changed meanwhile: re-read, retry" },
        marks: ["version", "UPDATE 0", "re-read"],
      },
    },
    {
      id: "write-skew",
      kind: "problem",
      edges: { sql: { flow: "request" } },
      metrics: { broken: 2 },
      focus: ["api", "api2", "db"],
      exchange: {
        edge: "sql2",
        request: {
          format: "text",
          head: "REPEATABLE READ: u_42 may spend 100000 a day",
          body: "T1  SELECT SUM(amount) -> 40000\nT2  SELECT SUM(amount) -> 40000\nT1  INSERT 50000   (90000, ok)\nT2  INSERT 50000   (90000, ok)\nT1  COMMIT\nT2  COMMIT\nresult: 140000 spent today",
        },
        marks: ["REPEATABLE READ", "SUM", "INSERT", "result"],
      },
    },
    {
      id: "serializable",
      kind: "fix",
      edges: { sql2: { flow: "retry" } },
      metrics: { broken: 0, retries: 9 },
      focus: ["api2", "db"],
      exchange: {
        edge: "sql2",
        request: {
          format: "sql",
          head: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;",
          body: "SELECT SUM(amount) FROM withdrawals\nWHERE user_id = 'u_42' AND day = '2026-11-18';\nINSERT INTO withdrawals (user_id, amount)\nVALUES ('u_42', 50000);\nCOMMIT;",
        },
        response: {
          format: "text",
          head: "ERROR: could not serialize access",
          body: "due to read/write dependencies among transactions\nSQLSTATE 40001: retry the whole transaction",
        },
        marks: ["SERIALIZABLE", "40001", "retry"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
