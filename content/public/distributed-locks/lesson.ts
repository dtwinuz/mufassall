import { defineLesson } from "@mufassall/scene-schema";

/**
 * A marketplace pays its sellers with a nightly job. Scaled to two pods, the job runs twice and
 * pays twice. A Redis lock (SET NX PX with a random token) fixes that, then the lesson walks the
 * ways it breaks: releasing someone else's lock, a lease shorter than the job, and a holder that
 * pauses past its lease. Fencing tokens checked by the database and an idempotency key at the bank
 * make a stale holder harmless; Redlock is weighed honestly, and the job ends on a lock that lives
 * in the database next to the data. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "distributed-locks",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "dup", unit: "/day", better: "down" },
    { id: "stale", unit: "", better: "down" },
    { id: "rejected", unit: "", better: "up" },
  ],
  steps: [
    {
      id: "cron",
      kind: "case",
      nodes: {
        a: { kind: "worker", at: [1, 2] },
        db: { kind: "db", at: [6, 8] },
        bank: { kind: "external", at: [11, 4] },
      },
      edges: {
        "load-a": { from: "a", to: "db", rate: 2 },
        "pay-a": { from: "a", to: "bank", rate: 3, mode: "call" },
      },
      metrics: { dup: 0, stale: 0, rejected: 0 },
      focus: ["a", "db", "bank"],
      exchange: {
        edge: "pay-a",
        request: {
          format: "text",
          head: "02:00:00  pod-a  cron settle-payouts  batch b_1118",
          body: "02:00:00.2  read 2 140 pending payouts\n02:00:01    POST /v1/transfers  x 2 140\n02:00:18    mark 2 140 rows paid, done in 18 s\n-- one pod, one run, nobody else",
        },
        marks: ["cron", "pending", "transfers", "18 s"],
      },
    },
    {
      id: "scaled",
      kind: "problem",
      nodes: { b: { kind: "worker", at: [1, 7] } },
      edges: {
        "load-b": { from: "b", to: "db", rate: 2 },
        "pay-b": { from: "b", to: "bank", rate: 3, mode: "call", flow: "dup" },
      },
      metrics: { dup: 2140 },
      focus: ["a", "b", "bank"],
      exchange: {
        edge: "pay-b",
        request: {
          format: "text",
          head: "02:00:00.004  pod-b  cron settle-payouts  batch b_1118",
          body: "02:00:00.2  read 2 140 pending payouts (pod-a has marked none yet)\n02:00:01    POST /v1/transfers  x 2 140\n-- two pods for availability, two identical schedules\n-- every seller in the batch is paid twice",
        },
        marks: ["pod-b", "pending", "two identical schedules", "paid twice"],
      },
    },
    {
      id: "setnx",
      kind: "fix",
      nodes: { redis: { kind: "cache", at: [6, 1] } },
      edges: {
        "lock-a": { from: "a", to: "redis", rate: 1 },
        "lock-b": { from: "b", to: "redis", rate: 1, flow: "fail" },
        "load-b": { rate: 0 },
        "pay-b": { rate: 0, flow: "request" },
      },
      metrics: { dup: 0 },
      focus: ["a", "b", "redis"],
      exchange: {
        edge: "lock-a",
        request: {
          format: "text",
          head: "SET lock:payouts:2026-11-18 7f3c9a1e NX PX 30000",
        },
        response: {
          format: "text",
          head: "OK",
          body: "-- pod-b, 4 ms later, the same command with its own token:\n(nil)  -> another pod holds it, skip this run",
        },
        marks: ["NX", "PX", "7f3c9a1e", "OK", "(nil)"],
      },
    },
    {
      id: "release",
      kind: "fix",
      focus: ["a", "redis"],
      exchange: {
        edge: "lock-a",
        request: {
          format: "text",
          head: "EVAL release.lua 1 lock:payouts:2026-11-18 7f3c9a1e",
          body: 'if redis.call("GET", KEYS[1]) == ARGV[1] then\n  return redis.call("DEL", KEYS[1])\nend\nreturn 0',
        },
        response: { format: "text", head: "(integer) 1" },
        marks: ["GET", "ARGV", "DEL", "return 0"],
      },
    },
    {
      id: "expiry",
      kind: "problem",
      edges: { "lock-b": { flow: "request" }, "pay-b": { flow: "dup", rate: 2 } },
      metrics: { dup: 12 },
      focus: ["a", "redis", "b"],
      exchange: {
        edge: "lock-b",
        request: {
          format: "text",
          head: "02:00:00  pod-a  lock OK, lease 30 s, month end: 8 000 payouts",
          body: "02:00:30  lease expired in Redis, pod-a is at payout 5 210 of 8 000\n02:00:31  pod-b  SET NX -> OK\n02:00:31  pod-b  reads 2 790 pending, the same ones pod-a is paying\n02:00:45  pod-a  done; its release returns 0: the key holds not its token",
        },
        marks: ["lease 30 s", "expired", "OK", "2 790", "not its token"],
      },
    },
    {
      id: "renew",
      kind: "fix",
      edges: { "lock-b": { flow: "fail" }, "pay-b": { flow: "request", rate: 0 } },
      metrics: { dup: 0 },
      focus: ["a", "redis"],
      exchange: {
        edge: "lock-a",
        request: {
          format: "text",
          head: "EVAL renew.lua 1 lock:payouts:2026-11-18 7f3c9a1e 30000",
          body: 'if redis.call("GET", KEYS[1]) == ARGV[1] then\n  return redis.call("PEXPIRE", KEYS[1], ARGV[2])\nend\nreturn 0\n-- a watchdog thread, every 10 s; on 0 the job stops at once',
        },
        response: { format: "text", head: "(integer) 1" },
        marks: ["PEXPIRE", "ARGV", "every 10 s", "stops at once"],
      },
    },
    {
      id: "pause",
      kind: "problem",
      nodes: { a: { state: "slow" } },
      edges: {
        "lock-a": { flow: "fail" },
        "lock-b": { flow: "request" },
        "pay-b": { rate: 3 },
        "pay-a": { flow: "dup" },
      },
      metrics: { dup: 9, stale: 1 },
      focus: ["a", "redis", "bank"],
      exchange: {
        edge: "pay-a",
        request: {
          format: "text",
          head: "02:00:05.000  pod-a  lock OK, claims payout po_5501",
          body: "02:00:05.010  pod-a  stop-the-world GC pause, the watchdog is frozen too\n02:00:35.000  lease expired in Redis\n02:00:35.900  pod-b  lock OK, pays po_5501, marks it paid\n02:00:46.200  pod-a  pause ends after 41.2 s, the loop goes on\n02:00:46.210  pod-a  POST /v1/transfers po_5501  -> paid again",
        },
        marks: ["GC pause", "lease expired", "41.2 s", "paid again"],
      },
    },
    {
      id: "fencing",
      kind: "fix",
      nodes: { a: { state: "ok" } },
      edges: { "load-a": { flow: "fail" }, "pay-a": { flow: "request" }, "lock-a": { flow: "request" } },
      metrics: { stale: 0, rejected: 1, dup: 1 },
      focus: ["a", "b", "db"],
      exchange: {
        edge: "load-a",
        request: {
          format: "sql",
          head: "UPDATE payouts SET status = 'paying', fence = 33",
          body: " WHERE id = 'po_5502'\n   AND fence <= 33;\n-- pod-b claimed this row with fence 34",
        },
        response: { format: "text", head: "UPDATE 0", body: "pod-a: stale fence 33, abort the run" },
        marks: ["fence", "fence <= 33", "34", "UPDATE 0", "abort"],
      },
    },
    {
      id: "bank",
      kind: "fix",
      edges: { "load-a": { flow: "request" } },
      metrics: { dup: 0 },
      focus: ["a", "bank"],
      exchange: {
        edge: "pay-a",
        request: {
          format: "json",
          head: "POST /v1/transfers HTTP/1.1",
          headers: [
            ["Host", "bank.example.com"],
            ["Authorization", "***"],
            ["Idempotency-Key", "po_5501"],
          ],
          body: `{
  "amount_minor": 1250000,
  "currency": "UZS",
  "to": "acc_s501"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "tr_7781",
  "status": "completed",
  "replayed": true
}`,
        },
        marks: ["Idempotency-Key", "amount_minor", "status", "replayed"],
        masked: ["Authorization"],
      },
    },
    {
      id: "redlock",
      kind: "case",
      nodes: { redis: { state: "down" } },
      edges: { "lock-b": { flow: "request" } },
      focus: ["redis", "a", "b"],
      exchange: {
        edge: "lock-b",
        request: {
          format: "text",
          head: "02:00:00.000  pod-a  SET NX on the Redis primary -> OK",
          body: "02:00:00.002  the primary crashes; replication is async, the replica never saw the key\n02:00:04.000  replica promoted to primary\n02:00:04.300  pod-b  SET NX -> OK: two holders\n-- Redlock: 5 independent nodes, a lock needs 3 of them within the lease\n-- still no fencing token; still trusts clocks and pause lengths",
        },
        marks: ["async", "promoted", "two holders", "Redlock", "fencing token"],
      },
    },
    {
      id: "dblock",
      kind: "fix",
      nodes: { redis: null },
      edges: { "load-b": { rate: 2 } },
      focus: ["a", "b", "db"],
      exchange: {
        edge: "load-a",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "SELECT pg_try_advisory_xact_lock(hashtext('payouts:2026-11-18'));\n-- false: another pod holds it, skip this run\nSELECT id FROM payouts WHERE status = 'pending'\n FOR UPDATE SKIP LOCKED LIMIT 500;\n-- pay, mark paid, COMMIT: the lock ends with the transaction",
        },
        response: { format: "text", head: "pg_try_advisory_xact_lock = true" },
        marks: ["pg_try_advisory_xact_lock", "false", "SKIP LOCKED", "COMMIT"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "pause-past-lease",
      from: "bank",
      steps: [
        {
          id: "p-freeze",
          kind: "problem",
          nodes: { a: { state: "slow" } },
          edges: { "lock-a": { flow: "fail" }, "lock-b": { flow: "request" }, "pay-b": { rate: 3 }, "load-b": { rate: 2 } },
          focus: ["a", "redis", "b"],
          exchange: {
            edge: "lock-b",
            request: {
              format: "text",
              head: "03:10:00  pod-a  lock OK, fence 51, lease 30 s, renew every 10 s",
              body: "03:10:12  pod-a  stop-the-world pause\n03:10:20  renew missed: the whole process is frozen\n03:10:42  lease expired\n03:10:43  pod-b  lock OK, fence 52, starts the same batch",
            },
            marks: ["fence 51", "renew missed", "lease expired", "fence 52"],
          },
        },
        {
          id: "p-wake",
          kind: "fix",
          nodes: { a: { state: "ok" } },
          edges: { "load-a": { flow: "fail" } },
          metrics: { rejected: 2, dup: 0, stale: 0 },
          focus: ["a", "db", "bank"],
          exchange: {
            edge: "load-a",
            request: {
              format: "sql",
              head: "UPDATE payouts SET status = 'paying', fence = 51",
              body: " WHERE id = 'po_7702'\n   AND fence <= 51;  -- the row already has 52",
            },
            response: { format: "text", head: "UPDATE 0", body: "pod-a: stale fence, stop; the next run is in 24 h" },
            marks: ["fence", "UPDATE 0", "stop"],
          },
        },
      ],
    },
  ],
});
