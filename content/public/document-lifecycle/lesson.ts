import { defineLesson } from "@mufassall/scene-schema";

/**
 * An electronic invoice between a seller and a buyer as a state machine that must agree with an
 * external registry (a generic tax or operator system): optimistic concurrency, a transition
 * table, pending states until the registry confirms, idempotent callbacks, a status sync job and
 * an outbox. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "document-lifecycle",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "lost", unit: "/day", better: "down" },
    { id: "mismatch", unit: "", better: "down" },
    { id: "stuck", unit: "", better: "down" },
    { id: "dups", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "lifecycle",
      kind: "case",
      nodes: {
        seller: { kind: "client", at: [0, 0] },
        buyer: { kind: "client", at: [0, 6] },
        api: { kind: "service", at: [4, 3] },
        db: { kind: "db", at: [8, 6] },
      },
      edges: {
        s1: { from: "seller", to: "api", rate: 2 },
        b1: { from: "buyer", to: "api", rate: 2 },
        write: { from: "api", to: "db", rate: 3 },
      },
      metrics: { lost: 0, mismatch: 0, stuck: 0, dups: 0 },
      focus: ["seller", "buyer", "api"],
      exchange: {
        edge: "b1",
        request: { format: "http", head: "GET /documents/inv_5120 HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "inv_5120",
  "type": "invoice",
  "state": "delivered",
  "version": 4,
  "actions": ["accept", "reject"]
}`,
        },
        marks: ["state", "version", "actions"],
      },
    },
    {
      id: "race",
      kind: "problem",
      nodes: { db: { state: "slow" } },
      edges: { write: { flow: "dup" } },
      metrics: { lost: 9 },
      focus: ["seller", "buyer", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "two clicks on inv_5120, 5 ms apart",
          body: "10:02:11.204 u_17 buyer:  read state=delivered, accept\n10:02:11.209 u_3 seller:  read state=delivered, cancel\n10:02:11.231 UPDATE ... SET state='accepted'   1 row\n10:02:11.236 UPDATE ... SET state='cancelled'  1 row\n-- buyer saw \"accepted\", the document is cancelled",
        },
        marks: ["read", "accepted", "cancelled"],
      },
    },
    {
      id: "version",
      kind: "fix",
      nodes: { db: { state: "ok" } },
      edges: { write: { flow: "request" } },
      metrics: { lost: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE documents",
          body: "SET state = 'cancelled', version = version + 1\nWHERE id = 'inv_5120' AND version = 4;",
        },
        response: {
          format: "text",
          head: "UPDATE 0",
          body: "-- 0 rows: the buyer's accept made it version 5 first",
        },
        marks: ["version", "WHERE", "UPDATE 0"],
      },
    },
    {
      id: "conflict",
      kind: "case",
      edges: { s1: { flow: "fail" } },
      focus: ["seller", "api"],
      exchange: {
        edge: "s1",
        request: {
          format: "http",
          head: "POST /documents/inv_5120/cancel HTTP/1.1",
          headers: [
            ["If-Match", '"4"'],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 409 Conflict",
          body: `{
  "error": "version_conflict",
  "state": "accepted",
  "version": 5
}`,
        },
        marks: ["If-Match", "409", "error", "state"],
        masked: ["Authorization"],
      },
    },
    {
      id: "transitions",
      kind: "fix",
      edges: { s1: { flow: "request" }, b1: { flow: "fail" } },
      focus: ["buyer", "api"],
      exchange: {
        edge: "b1",
        request: {
          format: "http",
          head: "POST /documents/inv_5120/reject HTTP/1.1",
          headers: [
            ["If-Match", '"5"'],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 422 Unprocessable Content",
          body: `{
  "error": "transition_not_allowed",
  "state": "accepted",
  "action": "reject",
  "allowed": []
}`,
        },
        marks: ["422", "action", "allowed"],
        masked: ["Authorization"],
      },
    },
    {
      id: "too-early",
      kind: "problem",
      nodes: { registry: { kind: "external", at: [9, 0] } },
      edges: { b1: { flow: "request" }, submit: { from: "api", to: "registry", rate: 2 } },
      metrics: { mismatch: 37 },
      focus: ["api", "registry"],
      exchange: {
        edge: "submit",
        request: {
          format: "json",
          head: "POST /v1/documents/inv_5120/accept HTTP/1.1",
          headers: [
            ["Host", "registry.example.org"],
            ["Authorization", "***"],
          ],
          body: `{
  "document_id": "inv_5120",
  "action": "accept",
  "signature": "<CMS, 3.1 KB>"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 202 Accepted",
          body: `{
  "request_id": "rq_88f1",
  "status": "processing"
}`,
        },
        marks: ["action", "signature", "202", "status"],
        masked: ["Authorization"],
      },
    },
    {
      id: "pending",
      kind: "fix",
      edges: { callback: { from: "registry", to: "api", flow: "ack", rate: 2 } },
      metrics: { mismatch: 0 },
      focus: ["registry", "api"],
      exchange: {
        edge: "callback",
        request: {
          format: "json",
          head: "POST /registry/callbacks HTTP/1.1",
          headers: [
            ["Content-Type", "application/json"],
            ["X-Signature", "***"],
          ],
          body: `{
  "event_id": "ev_7c21",
  "document_id": "inv_5120",
  "action": "accept",
  "status": "registered",
  "registered_at": "2026-11-18T10:03:40Z"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["X-Signature", "event_id", "status", "registered_at"],
        masked: ["X-Signature"],
      },
    },
    {
      id: "lost-dup",
      kind: "problem",
      edges: { callback: { flow: "dup", cut: true } },
      metrics: { stuck: 140, dups: 25 },
      focus: ["registry", "api"],
      exchange: {
        edge: "callback",
        request: {
          format: "text",
          head: "callback log, registry -> api",
          body: "09:00:00 ev_7c21 attempt 1: timeout after 10 s\n09:00:12 api finished attempt 1: buyer notified\n09:00:30 ev_7c21 attempt 2: 200, buyer notified\ninv_5133: accept_pending for 2 days\n  -- its callback was lost, nobody asks again",
        },
        marks: ["timeout", "attempt 2", "notified", "lost"],
      },
    },
    {
      id: "idempotent",
      kind: "fix",
      edges: { callback: { flow: "ack" } },
      metrics: { dups: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO registry_events (event_id, received_at)",
          body: "VALUES ('ev_7c21', now())\nON CONFLICT (event_id) DO NOTHING;\n-- 0 rows: seen before, answer 200, do nothing\n-- 1 row: apply the transition in this transaction",
        },
        response: { format: "text", head: "INSERT 0 0" },
        marks: ["event_id", "ON CONFLICT", "0 rows", "this transaction"],
      },
    },
    {
      id: "sync",
      kind: "fix",
      nodes: { worker: { kind: "worker", at: [12, 4] } },
      edges: {
        poll: { from: "worker", to: "db", rate: 1 },
        sync: { from: "worker", to: "registry", rate: 1 },
      },
      metrics: { stuck: 0 },
      focus: ["worker", "registry", "db"],
      exchange: {
        edge: "sync",
        request: {
          format: "http",
          head: "GET /v1/documents/inv_5133/status HTTP/1.1",
          headers: [
            ["Host", "registry.example.org"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "document_id": "inv_5133",
  "status": "registered",
  "event_id": "ev_80aa",
  "registered_at": "2026-11-16T14:21:09Z"
}`,
        },
        marks: ["status", "event_id", "registered_at"],
        masked: ["Authorization"],
      },
    },
    {
      id: "history",
      kind: "fix",
      nodes: { events: { kind: "queue", at: [4, 9] } },
      edges: {
        relay: { from: "db", to: "events", rate: 2 },
        notify: { from: "events", to: "buyer", rate: 2 },
      },
      focus: ["db", "events", "buyer"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "UPDATE documents SET state = 'accepted', version = 6\n  WHERE id = 'inv_5120' AND version = 5;\nINSERT INTO document_history VALUES ('inv_5120',\n  'accept_pending', 'accepted', 'registry',\n  'ev_7c21', '2026-11-18T10:03:41Z');\nINSERT INTO outbox (topic, document_id)\n  VALUES ('document.accepted', 'inv_5120');\nCOMMIT;",
        },
        marks: ["document_history", "accept_pending", "outbox", "COMMIT"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
