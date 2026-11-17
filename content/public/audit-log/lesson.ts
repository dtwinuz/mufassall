import { defineLesson } from "@mufassall/scene-schema";

/**
 * A back office where staff can change customer data, including bank details for payouts.
 * The lesson builds an audit trail: one event per business action, written atomically with the
 * change (outbox), shipped to a separate append-only store partitioned by month, chained by
 * hashes and anchored by signed checkpoints, minimised for personal data, archived to
 * write-once storage and queried by request id. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "audit-log",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "untraced", unit: "/day", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "hot", unit: "GB", better: "down" },
    { id: "undetected", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "who",
      kind: "problem",
      nodes: {
        admin: { kind: "actor", at: [0, 4] },
        api: { kind: "service", at: [3, 4] },
        db: { kind: "db", at: [6, 7] },
      },
      edges: {
        op: { from: "admin", to: "api", rate: 2 },
        write: { from: "api", to: "db", rate: 2 },
      },
      metrics: { untraced: 14, p95: 45, hot: 0, undetected: 0 },
      focus: ["admin", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE customers",
          body: "   SET bank_account = '***',\n       updated_at = now(),\n       updated_by = 'backoffice'\n WHERE id = 'c_1187';",
        },
        response: {
          format: "text",
          head: "UPDATE 1",
          body: "-- old account: overwritten, gone\n-- updated_by: one shared service login for 40 staff",
        },
        marks: ["bank_account", "updated_at", "updated_by", "gone"],
      },
    },
    {
      id: "event",
      kind: "fix",
      metrics: { untraced: 0, p95: 52 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "json",
          head: "audit_event",
          body: `{
  "event_id": "ae_01J9Z4",
  "at": "2026-11-18T09:41:07.312Z",
  "actor_id": "u_17",
  "action": "customer.bank_account.update",
  "target": "customer:c_1187",
  "before": { "bank_account": "***" },
  "after": { "bank_account": "***" },
  "request_id": "req_7c2e91",
  "ip": "203.0.113.0/24"
}`,
        },
        marks: ["actor_id", "action", "target", "before", "after", "request_id", "ip"],
        masked: ["bank_account"],
      },
    },
    {
      id: "hot",
      kind: "problem",
      nodes: { db: { state: "slow" } },
      metrics: { p95: 310, hot: 2100 },
      focus: ["db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "db stats, two years later",
          body: "audit_events     2.1 TB   61% of the database\n                 38 000 inserts/min at peak\nbackup           9 h, was 2 h\nvacuum           audit_events: 14 h, still running\napi p95          310 ms, was 52 ms",
        },
        marks: ["audit_events", "backup", "vacuum", "p95"],
      },
    },
    {
      id: "outbox",
      kind: "fix",
      nodes: {
        db: { state: "ok" },
        relay: { kind: "worker", at: [7, 3] },
        auditdb: { kind: "db", at: [10, 4] },
      },
      edges: {
        pull: { from: "db", to: "relay", rate: 2 },
        ship: { from: "relay", to: "auditdb", rate: 2 },
      },
      metrics: { p95: 58 },
      focus: ["api", "db", "relay", "auditdb"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "UPDATE customers SET bank_account = '***'\n WHERE id = 'c_1187';\nINSERT INTO audit_outbox (event_id, payload)\nVALUES ('ae_01J9Z4', '{\"action\": ...}');\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT", body: "-- both rows or neither; the relay ships the event\n-- and deletes the outbox row after the store says ok" },
        marks: ["BEGIN", "audit_outbox", "COMMIT", "relay"],
      },
    },
    {
      id: "partitions",
      kind: "fix",
      focus: ["relay", "auditdb"],
      exchange: {
        edge: "ship",
        request: {
          format: "sql",
          head: "CREATE TABLE audit_events (... , at timestamptz)",
          body: "  PARTITION BY RANGE (at);\nCREATE TABLE audit_events_2026_11\n  PARTITION OF audit_events\n  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');\nREVOKE UPDATE, DELETE ON audit_events FROM relay;\nINSERT INTO audit_events VALUES (...)\n  ON CONFLICT (event_id) DO NOTHING;",
        },
        marks: ["PARTITION BY RANGE", "audit_events_2026_11", "REVOKE", "ON CONFLICT"],
      },
    },
    {
      id: "tamper",
      kind: "problem",
      nodes: { insider: { kind: "actor", at: [12, 1] } },
      edges: { tamper: { from: "insider", to: "auditdb", flow: "fail", rate: 1 } },
      metrics: { undetected: 1 },
      focus: ["insider", "auditdb"],
      exchange: {
        edge: "tamper",
        request: {
          format: "sql",
          head: "-- superuser session, 23:52",
          body: "DELETE FROM audit_events_2026_11\n WHERE event_id = 'ae_01J9Z4';",
        },
        response: { format: "text", head: "DELETE 1", body: "-- no error, no alert, the row is simply gone" },
        marks: ["superuser", "DELETE", "DELETE 1"],
      },
    },
    {
      id: "chain",
      kind: "fix",
      edges: { tamper: { cut: true } },
      metrics: { undetected: 0 },
      focus: ["relay", "auditdb"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "audit-verify partition=2026_11 (hourly)",
          body: "hash = SHA-256(prev_hash + canonical event)\nae_01J9Z3  prev_hash=9f1c0a  hash=4be07d  ok\nae_01J9Z5  prev_hash=7d2a5e  expected 4be07d  BROKEN\n-- a record between ae_01J9Z3 and ae_01J9Z5 is missing",
        },
        marks: ["SHA-256", "prev_hash", "canonical", "BROKEN"],
      },
    },
    {
      id: "anchor",
      kind: "fix",
      nodes: {
        insider: null,
        signer: { kind: "external", at: [10, 0] },
        archive: { kind: "storage", at: [12, 8] },
      },
      edges: {
        sign: { from: "auditdb", to: "signer", rate: 1 },
        store: { from: "auditdb", to: "archive", rate: 1 },
      },
      focus: ["auditdb", "signer", "archive"],
      exchange: {
        edge: "sign",
        request: {
          format: "json",
          head: "POST /v1/sign HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "checkpoint": "cp_2026-11-18T10",
  "partition": "2026_11",
  "last_event_id": "ae_01JA02",
  "count": 418226,
  "head_hash": "c41f9e"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "key_id": "audit-anchor-2026",
  "signature": "***"
}`,
        },
        marks: ["Authorization", "count", "head_hash", "key_id", "signature"],
        masked: ["Authorization", "signature"],
      },
    },
    {
      id: "pii",
      kind: "fix",
      nodes: { investigator: { kind: "actor", at: [8, 11] } },
      edges: { query: { from: "investigator", to: "auditdb", rate: 1 } },
      focus: ["investigator", "auditdb"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "CREATE ROLE audit_reader;",
          body: "GRANT SELECT ON audit_events TO audit_reader;\nREVOKE ALL ON audit_events FROM support, analytics;\n-- every SELECT by audit_reader is itself audited\nGRANT audit_reader TO u_3;  -- ticket SEC-118",
        },
        marks: ["audit_reader", "GRANT", "REVOKE", "itself audited"],
      },
    },
    {
      id: "retention",
      kind: "fix",
      metrics: { hot: 380 },
      focus: ["auditdb", "archive"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "export audit_events_2025_10 -> archive/2025/10/events.jsonl.zst",
          body: "rows 12 480 113, last hash 77ab30 = checkpoint cp_2025-10-31T23  ok\nobject lock: compliance mode until 2032-11-01\nDROP TABLE audit_events_2025_10;  -- older than 13 months",
        },
        marks: ["checkpoint", "object lock", "DROP TABLE"],
      },
    },
    {
      id: "investigate",
      kind: "case",
      focus: ["investigator", "auditdb"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT at, actor_id, action, target, ip",
          body: "  FROM audit_events\n WHERE request_id = 'req_7c2e91'\n ORDER BY at;",
        },
        response: {
          format: "text",
          head: "09:41:07.312 | u_17 | customer.bank_account.update | customer:c_1187",
          body: "09:41:07.355 | u_17 | payout.destination.change | payout:po_552\n(2 rows)  chain ok up to checkpoint cp_2026-11-18T10",
        },
        marks: ["request_id", "u_17", "payout.destination.change", "chain ok"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
