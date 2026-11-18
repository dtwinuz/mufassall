import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online shop's order service keeps one row per order and updates it in place, so disputes
 * cannot be answered and concurrent edits overwrite each other. It moves to an append-only
 * event store with a version per stream and optimistic concurrency, builds read models with a
 * checkpointed projector, snapshots long streams, upcasts old event versions, handles the read
 * lag of CQRS in the UI and erases personal data by destroying per-customer keys.
 * Numbers are a model scenario.
 */
export default defineLesson({
  slug: "event-sourcing",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "unknown", unit: "/day", better: "down" },
    { id: "overwritten", unit: "/day", better: "down" },
    { id: "lag", unit: "ms", better: "down" },
    { id: "load-ms", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "table",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 2] },
        support: { kind: "actor", at: [0, 7] },
        api: { kind: "service", at: [3, 4] },
        orders: { kind: "db", at: [7, 2] },
      },
      edges: {
        place: { from: "app", to: "api", rate: 2 },
        edit: { from: "support", to: "api", rate: 1 },
        write: { from: "api", to: "orders", rate: 3 },
      },
      metrics: { unknown: 0, overwritten: 0, lag: 0, "load-ms": 3 },
      focus: ["api", "orders"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE orders",
          body: "   SET address = '12 Elm St',\n       status  = 'paid',\n       updated_at = now()\n WHERE id = 'ord_77';",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["SET", "status", "updated_at", "UPDATE 1"],
      },
    },
    {
      id: "lost",
      kind: "problem",
      nodes: { orders: { state: "slow" } },
      edges: { write: { flow: "dup" } },
      metrics: { unknown: 23, overwritten: 9 },
      focus: ["app", "support", "orders"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "10:02:11 app      SET address = '12 Elm St'",
          body: "10:02:12 support  SET address = '9 Oak Ave'\n                  (form opened at 09:58)\n10:40:00 courier  shipped to 9 Oak Ave\n-- customer: \"I changed it at 10:02\"\n-- the row: address = '9 Oak Ave', nothing else",
        },
        marks: ["app", "support", "09:58", "nothing else"],
      },
    },
    {
      id: "store",
      kind: "fix",
      nodes: {
        orders: null,
        store: { kind: "db", at: [7, 2] },
      },
      edges: { append: { from: "api", to: "store", rate: 3 } },
      metrics: { unknown: 0 },
      focus: ["api", "store"],
      exchange: {
        edge: "append",
        request: {
          format: "sql",
          head: "INSERT INTO events (stream_id, version, type, data)",
          body: "VALUES ('order-ord_77', 5, 'AddressChanged',\n        '{\"to\": \"12 Elm St\", \"by\": \"u_42\"}');\n-- UNIQUE (stream_id, version)\n-- no UPDATE, no DELETE on this table\n-- state = fold(OrderPlaced .. AddressChanged)",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["stream_id", "version", "type", "UNIQUE", "fold", "INSERT 0 1"],
      },
    },
    {
      id: "conflict",
      kind: "fix",
      edges: { edit: { flow: "fail" } },
      metrics: { overwritten: 0 },
      focus: ["support", "api", "store"],
      exchange: {
        edge: "edit",
        request: {
          format: "json",
          head: "POST /v1/streams/order-ord_77/events HTTP/1.1",
          headers: [
            ["Host", "orders.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "expected_version": 5,
  "events": [{
    "type": "AddressChanged",
    "data": { "to": "9 Oak Ave" }
  }]
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 409 Conflict",
          body: `{
  "error": "wrong_expected_version",
  "current_version": 6,
  "since": ["AddressChanged by u_42"]
}`,
        },
        marks: ["expected_version", "events", "409 Conflict", "current_version", "since"],
        masked: ["Authorization"],
      },
    },
    {
      id: "projection",
      kind: "fix",
      nodes: {
        projector: { kind: "worker", at: [10, 5], load: 30 },
        views: { kind: "db", at: [7, 8] },
      },
      edges: {
        edit: { flow: "request" },
        tail: { from: "projector", to: "store", rate: 3 },
        project: { from: "projector", to: "views", rate: 3 },
        query: { from: "api", to: "views", rate: 4 },
      },
      metrics: { lag: 340 },
      focus: ["store", "projector", "views"],
      exchange: {
        edge: "project",
        request: {
          format: "text",
          head: "projector order_list  checkpoint 1204880",
          body: "read  1204881..1205380  (500 events)\napply OrderPlaced    ord_91 -> INSERT\napply AddressChanged ord_77 -> UPDATE\nsave  checkpoint 1205380  same transaction\nlag   340 ms behind the store",
        },
        marks: ["checkpoint", "apply", "same transaction", "lag"],
      },
    },
    {
      id: "long",
      kind: "problem",
      nodes: { api: { state: "slow", load: 88 } },
      edges: { append: { rate: 6 } },
      metrics: { "load-ms": 2600 },
      focus: ["api", "store"],
      exchange: {
        edge: "append",
        request: {
          format: "sql",
          head: "SELECT type, data FROM events",
          body: " WHERE stream_id = 'account-b_12'\n ORDER BY version;\n-- a wholesale buyer since 2021",
        },
        response: {
          format: "text",
          head: "120037 rows  2.6 s",
          body: "fold in memory: 410 ms\nper new order: load, fold, append, repeat",
        },
        marks: ["account-b_12", "ORDER BY", "120037 rows", "fold"],
      },
    },
    {
      id: "snapshot",
      kind: "fix",
      nodes: { api: { state: "ok", load: 30 } },
      edges: { append: { rate: 3 } },
      metrics: { "load-ms": 30 },
      focus: ["api", "store"],
      exchange: {
        edge: "append",
        request: {
          format: "json",
          head: "snapshot account-b_12",
          body: `{
  "stream_id": "account-b_12",
  "version": 120000,
  "schema": 3,
  "state": {
    "open_orders": 14,
    "credit_used_minor": 482000
  }
}`,
        },
        response: {
          format: "text",
          head: "then: events WHERE version > 120000",
          body: "37 rows  4 ms, fold 1 ms",
        },
        marks: ["version", "schema", "state", "37 rows"],
      },
    },
    {
      id: "schema",
      kind: "problem",
      nodes: { projector: { state: "down" } },
      edges: { tail: { flow: "fail", rate: 1 }, project: { rate: 0 } },
      metrics: { lag: 95000 },
      focus: ["projector", "views"],
      exchange: {
        edge: "tail",
        request: {
          format: "text",
          head: "projector order_list v2 started",
          body: "event 88114 AddressChanged (2024-03-02)\nTypeError: data.street is undefined\nretry 1..5 failed, projector stopped\ncheckpoint stuck at 88113",
        },
        marks: ["AddressChanged", "data.street", "stopped", "checkpoint"],
      },
    },
    {
      id: "upcast",
      kind: "fix",
      nodes: { projector: { state: "ok", load: 95 } },
      edges: { tail: { flow: "request", rate: 6 }, project: { rate: 6 } },
      metrics: { lag: 400 },
      focus: ["store", "projector"],
      exchange: {
        edge: "tail",
        request: {
          format: "json",
          head: "stored in 2024 (never rewritten)",
          body: `{
  "type": "AddressChanged",
  "version": 1,
  "data": { "to": "12 Elm St, Springfield" }
}`,
        },
        response: {
          format: "json",
          head: "after upcast v1 -> v2 (in memory)",
          body: `{
  "type": "AddressChanged",
  "version": 2,
  "data": {
    "street": "12 Elm St",
    "city": "Springfield",
    "zip": null
  }
}`,
        },
        marks: ["type", "version", "data", "zip"],
      },
    },
    {
      id: "readlag",
      kind: "fix",
      nodes: { projector: { load: 30 } },
      edges: { tail: { rate: 3 }, project: { rate: 3 } },
      metrics: { lag: 340 },
      focus: ["app", "api", "views"],
      exchange: {
        edge: "place",
        request: {
          format: "http",
          head: "GET /v1/orders/ord_77?min_version=7 HTTP/1.1",
          headers: [
            ["Host", "orders.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Read-Model-Version", "7"]],
          body: `{
  "id": "ord_77",
  "version": 7,
  "address": "12 Elm St"
}`,
        },
        marks: ["min_version", "X-Read-Model-Version", "version", "address"],
        masked: ["Authorization"],
      },
    },
    {
      id: "shred",
      kind: "fix",
      nodes: { vault: { kind: "external", at: [3, 0] } },
      edges: { keys: { from: "api", to: "vault", rate: 1 } },
      focus: ["api", "vault", "store"],
      exchange: {
        edge: "keys",
        request: {
          format: "http",
          head: "DELETE /v1/keys/subject/c_501 HTTP/1.1",
          headers: [
            ["Host", "vault.internal.test"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "subject": "c_501",
  "keys_destroyed": 2,
  "events_affected": 318
}`,
        },
        marks: ["subject", "keys_destroyed", "events_affected"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
