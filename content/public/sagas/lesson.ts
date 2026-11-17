import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * One order touches three services, each with its own database.
 * Numbers are a model scenario for the story, not measurements.
 */
const orderCreated = `{
  "event_id": "ev_5c1",
  "type": "OrderCreated",
  "order_id": "1042",
  "amount": 500000
}`;

const produce: WireMessage = {
  format: "json",
  head: "produce topic=orders key=1042",
  body: orderCreated,
};

export default defineLesson({
  slug: "sagas",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "orphans", unit: "/day", better: "down" },
    { id: "lost", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "three-services",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 3] },
        orders: { kind: "service", at: [3, 4] },
        odb: { kind: "db", at: [3, 8] },
        payments: { kind: "service", at: [9, 1] },
        inventory: { kind: "service", at: [9, 7] },
      },
      edges: {
        place: { from: "client", to: "orders", rate: 3 },
        save: { from: "orders", to: "odb", rate: 3 },
        charge: { from: "orders", to: "payments", rate: 3 },
        reserve: { from: "orders", to: "inventory", rate: 3 },
      },
      metrics: { p95: 320, orphans: 0, lost: 0 },
      focus: ["orders", "payments", "inventory"],
      exchange: {
        edge: "place",
        request: {
          format: "json",
          head: "POST /orders HTTP/1.1",
          headers: [["Host", "api.example.com"]],
          body: `{
  "customer_id": "u_42",
  "items": [{ "sku": "lamp-07", "qty": 2 }],
  "amount": 500000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 202 Accepted",
          body: `{
  "order_id": "1042",
  "status": "pending"
}`,
        },
        marks: ["items", "amount", "status"],
      },
    },
    {
      id: "half-done",
      kind: "problem",
      nodes: { inventory: { state: "down" } },
      edges: { reserve: { flow: "fail" } },
      metrics: { orphans: 14 },
      focus: ["payments", "inventory"],
      exchange: {
        edge: "reserve",
        request: {
          format: "json",
          head: "POST /reservations HTTP/1.1",
          body: `{
  "order_id": "1042",
  "sku": "lamp-07",
  "qty": 2
}`,
        },
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "30"]],
        },
        marks: ["order_id", "503", "Retry-After"],
      },
    },
    {
      id: "two-phase",
      kind: "case",
      nodes: {
        inventory: { state: "ok", load: 70 },
        payments: { load: 70 },
      },
      edges: { reserve: { flow: "request" } },
      metrics: { p95: 900, orphans: 0 },
      focus: ["orders", "payments", "inventory"],
      exchange: {
        edge: "charge",
        request: {
          format: "text",
          head: "PREPARE tx=ord_1042",
          body: "op: hold 500000 for u_42",
        },
        response: {
          format: "text",
          head: "VOTE yes",
          body: "row lock held until COMMIT or ABORT",
        },
        marks: ["PREPARE", "VOTE", "COMMIT"],
      },
    },
    {
      id: "in-doubt",
      kind: "problem",
      nodes: {
        orders: { state: "down" },
        payments: { state: "slow", load: 95 },
        inventory: { state: "slow", load: 95 },
      },
      edges: {
        place: { flow: "fail" },
        charge: { cut: true },
        reserve: { cut: true },
      },
      metrics: { p95: 9000 },
      focus: ["orders", "payments", "inventory"],
      exchange: {
        edge: "charge",
        request: { format: "text", head: "PREPARE tx=ord_1042 -> VOTE yes" },
        response: {
          format: "text",
          head: "waiting for decision... 9.2 s",
          body: "lock on wallet u_42 still held\ncoordinator unreachable",
        },
        marks: ["waiting for decision", "lock", "coordinator unreachable"],
      },
    },
    {
      id: "saga-log",
      kind: "fix",
      nodes: {
        orders: { state: "ok" },
        payments: { state: "ok", load: 30 },
        inventory: { state: "ok", load: 30 },
      },
      edges: {
        place: { flow: "request" },
        charge: { cut: false },
        reserve: { cut: false },
      },
      metrics: { p95: 340 },
      focus: ["orders", "odb"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "INSERT INTO sagas (id, order_id, step, status)",
          body: "VALUES ('sg_1042', '1042', 'charge', 'running');\n-- after each local step succeeds:\nUPDATE sagas SET step = 'reserve'\n WHERE id = 'sg_1042';",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["sagas", "step", "status"],
      },
    },
    {
      id: "compensate",
      kind: "fix",
      edges: {
        charge: null,
        reserve: { flow: "fail" },
        refund: { from: "orders", to: "payments", rate: 2 },
      },
      focus: ["orders", "payments", "inventory"],
      exchange: {
        edge: "refund",
        request: {
          format: "json",
          head: "POST /charges/ch_88/refunds HTTP/1.1",
          headers: [["Idempotency-Key", "sg_1042-refund"]],
          body: `{
  "amount": 500000,
  "reason": "out_of_stock"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "refund_id": "rf_3",
  "status": "refunded"
}`,
        },
        marks: ["Idempotency-Key", "reason", "status"],
      },
    },
    {
      id: "choreography",
      kind: "case",
      nodes: { bus: { kind: "queue", at: [6, 4] } },
      edges: {
        refund: null,
        reserve: null,
        publish: { from: "orders", to: "bus", rate: 3 },
        pay: { from: "bus", to: "payments", rate: 3 },
        paid: { from: "payments", to: "bus", flow: "ack", rate: 2 },
        stock: { from: "bus", to: "inventory", rate: 2 },
      },
      metrics: { p95: 180 },
      focus: ["orders", "bus"],
      exchange: {
        edge: "publish",
        request: produce,
        response: { format: "text", head: "ack partition=3 offset=7713" },
        marks: ["key", "type", "event_id", "offset"],
      },
    },
    {
      id: "dual-write",
      kind: "problem",
      nodes: { bus: { state: "slow" } },
      edges: { publish: { flow: "fail", cut: true } },
      metrics: { lost: 9 },
      focus: ["orders", "odb", "bus"],
      exchange: {
        edge: "publish",
        request: produce,
        response: {
          format: "text",
          head: "ERROR: broker timeout after 5000 ms",
          body: "order 1042 already committed in DB\nevent not sent, no retry",
        },
        marks: ["ERROR", "committed", "no retry"],
      },
    },
    {
      id: "outbox",
      kind: "fix",
      nodes: {
        bus: { state: "ok" },
        relay: { kind: "worker", at: [6, 9] },
      },
      edges: {
        publish: null,
        poll: { from: "relay", to: "odb", rate: 2 },
        forward: { from: "relay", to: "bus", rate: 3 },
      },
      metrics: { lost: 0, p95: 190 },
      focus: ["orders", "odb", "relay"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO orders (id, status)\n  VALUES ('1042', 'pending');\nINSERT INTO outbox (event_id, topic, payload)\n  VALUES ('ev_5c1', 'orders', '{...}');\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT" },
        marks: ["BEGIN", "outbox", "event_id", "COMMIT"],
      },
    },
    {
      id: "dedupe",
      kind: "fix",
      edges: {
        forward: { flow: "dup" },
        pay: { flow: "dup" },
      },
      focus: ["relay", "bus", "payments"],
      exchange: {
        edge: "pay",
        request: {
          format: "json",
          head: "deliver topic=orders key=1042 offset=7714",
          body: orderCreated,
        },
        response: {
          format: "text",
          head: "INSERT INTO processed (event_id) VALUES ('ev_5c1') ON CONFLICT DO NOTHING",
          body: "0 rows inserted: ev_5c1 seen before, skip",
        },
        marks: ["offset", "event_id", "ON CONFLICT", "skip"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
