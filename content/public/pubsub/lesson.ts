import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * One "order placed" event, many teams that care about it. A shop moves from direct calls to a
 * Kafka-style topic: fan-out, offsets and replay, consumer groups, per-key ordering, event schema.
 * Numbers are a model scenario, not measurements.
 */
const produced = (key: string | undefined, body: string): WireMessage => ({
  format: "json",
  head: "PRODUCE topic=order-events",
  headers: [...(key ? ([["key", key]] as const) : []), ["acks", "all"]],
  body,
});

export default defineLesson({
  slug: "pubsub",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "failed", unit: "%", better: "down" },
    { id: "lag", unit: "", better: "down" },
    { id: "misordered", unit: "/min", better: "down" },
  ],
  steps: [
    {
      id: "direct",
      kind: "problem",
      nodes: {
        shop: { kind: "client", at: [0, 5] },
        orders: { kind: "service", at: [2, 5], state: "slow" },
        email: { kind: "service", at: [8, 1] },
        stock: { kind: "service", at: [8, 4] },
        analytics: { kind: "service", at: [8, 10] },
      },
      edges: {
        checkout: { from: "shop", to: "orders", rate: 3 },
        "call-email": { from: "orders", to: "email", rate: 3 },
        "call-stock": { from: "orders", to: "stock", rate: 3 },
        "call-analytics": { from: "orders", to: "analytics", rate: 3 },
      },
      metrics: { p95: 900, failed: 0, lag: 0, misordered: 0 },
      focus: ["orders"],
      exchange: {
        edge: "call-email",
        request: {
          format: "json",
          head: "POST /send-receipt HTTP/1.1",
          headers: [["Host", "email.internal"]],
          body: `{
  "order_id": "ord_9051",
  "user_id": "u_42"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "410 ms"]] },
        marks: ["order_id", "X-Response-Time"],
      },
    },
    {
      id: "one-down",
      kind: "problem",
      nodes: { analytics: { state: "down" } },
      edges: { "call-analytics": { flow: "fail", cut: true } },
      metrics: { p95: 5000, failed: 100 },
      focus: ["orders", "analytics"],
      exchange: {
        edge: "call-analytics",
        request: {
          format: "json",
          head: "POST /track HTTP/1.1",
          headers: [["Host", "analytics.internal"]],
          body: `{
  "order_id": "ord_9051",
  "total": "184000.00"
}`,
        },
        response: { format: "text", head: "timeout after 5000 ms", body: "checkout aborted: 500 to the shop" },
        marks: ["timeout", "checkout aborted"],
      },
    },
    {
      id: "topic",
      kind: "fix",
      nodes: {
        orders: { state: "ok" },
        analytics: { state: "ok", kind: "worker" },
        email: { kind: "worker" },
        stock: { kind: "worker" },
        topic: { kind: "queue", at: [5, 5] },
      },
      edges: {
        "call-email": null,
        "call-stock": null,
        "call-analytics": null,
        publish: { from: "orders", to: "topic", rate: 3 },
        "to-email": { from: "topic", to: "email", rate: 3 },
        "to-stock": { from: "topic", to: "stock", rate: 3 },
        "to-analytics": { from: "topic", to: "analytics", rate: 3 },
      },
      metrics: { p95: 40, failed: 0 },
      focus: ["orders", "topic"],
      exchange: {
        edge: "publish",
        request: produced(
          undefined,
          `{
  "event_type": "order.placed",
  "order_id": "ord_9051",
  "user_id": "u_42",
  "total": "184000.00",
  "occurred_at": "2026-11-18T10:02:11Z"
}`,
        ),
        response: { format: "text", head: "OK partition=2 offset=88412" },
        marks: ["acks", "event_type", "offset"],
      },
    },
    {
      id: "lagging",
      kind: "case",
      nodes: { analytics: { state: "down" } },
      edges: { "to-analytics": { rate: 0 } },
      metrics: { lag: 12300 },
      focus: ["topic", "analytics"],
      exchange: {
        edge: "to-analytics",
        request: { format: "text", head: "describe consumer group: analytics" },
        response: {
          format: "text",
          head: "PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG",
          body: "2          76112           88412           12300",
        },
        marks: ["CURRENT-OFFSET", "LOG-END-OFFSET", "LAG"],
      },
    },
    {
      id: "replay",
      kind: "fix",
      nodes: { analytics: { state: "ok", load: 90 } },
      edges: { "to-analytics": { rate: 8 } },
      metrics: { lag: 0 },
      focus: ["topic", "analytics"],
      exchange: {
        edge: "to-analytics",
        request: {
          format: "text",
          head: "FETCH topic=order-events partition=2 offset=76112",
          body: "group: analytics\nmax_records: 500",
        },
        response: {
          format: "text",
          head: "RECORDS 500 (offsets 76112..76611)",
          body: "COMMIT group=analytics offset=76612",
        },
        marks: ["offset", "group", "COMMIT"],
      },
    },
    {
      id: "hot-consumer",
      kind: "problem",
      nodes: { analytics: { load: 25 }, stock: { state: "slow", load: 100 } },
      edges: { publish: { rate: 10 }, "to-stock": { rate: 4 }, "to-analytics": { rate: 10 } },
      metrics: { lag: 48000 },
      focus: ["topic", "stock"],
    },
    {
      id: "group",
      kind: "fix",
      nodes: {
        stock: { state: "ok", load: 55 },
        "stock-2": { kind: "worker", at: [8, 7], load: 50 },
      },
      edges: {
        "to-stock": { rate: 5 },
        "to-stock-2": { from: "topic", to: "stock-2", rate: 5 },
      },
      metrics: { lag: 0 },
      focus: ["stock", "stock-2"],
      exchange: {
        edge: "to-stock-2",
        request: { format: "text", head: "JOIN group=stock member=stock-2" },
        response: {
          format: "text",
          head: "REBALANCE group=stock generation=7",
          body: "stock:   partitions 0, 1, 2\nstock-2: partitions 3, 4, 5",
        },
        marks: ["REBALANCE", "generation", "partitions"],
      },
    },
    {
      id: "misorder",
      kind: "problem",
      edges: { publish: { rate: 4 }, "to-stock": { flow: "dup" }, "to-stock-2": { flow: "dup" } },
      metrics: { misordered: 30 },
      focus: ["topic", "stock", "stock-2"],
      exchange: {
        edge: "publish",
        request: produced(
          undefined,
          `{
  "event_type": "order.cancelled",
  "order_id": "ord_9051"
}`,
        ),
        response: { format: "text", head: "OK partition=5 offset=31907" },
        marks: ["event_type", "partition"],
      },
    },
    {
      id: "key",
      kind: "fix",
      edges: { "to-stock": { flow: "request" }, "to-stock-2": { flow: "request" } },
      metrics: { misordered: 0 },
      focus: ["orders", "topic"],
      exchange: {
        edge: "publish",
        request: produced(
          "ord_9051",
          `{
  "event_type": "order.cancelled",
  "order_id": "ord_9051"
}`,
        ),
        response: { format: "text", head: "OK partition=2 offset=88950" },
        marks: ["key", "partition"],
      },
    },
    {
      id: "schema-break",
      kind: "problem",
      nodes: { analytics: { state: "down" } },
      edges: { "to-analytics": { flow: "fail", rate: 0 } },
      metrics: { lag: 3100 },
      focus: ["topic", "analytics"],
      exchange: {
        edge: "to-analytics",
        request: {
          format: "json",
          head: "RECORD partition=2 offset=90233",
          body: `{
  "event_type": "order.placed",
  "order_id": "ord_9377",
  "amount": "52000.00"
}`,
        },
        response: { format: "text", head: "consumer stopped: field total is missing" },
        marks: ["amount", "total"],
      },
    },
    {
      id: "schema",
      kind: "fix",
      nodes: { analytics: { state: "ok" } },
      edges: { "to-analytics": { flow: "request", rate: 6 } },
      metrics: { lag: 0 },
      focus: ["orders", "topic", "analytics"],
      exchange: {
        edge: "publish",
        request: produced(
          "ord_9377",
          `{
  "schema_version": 2,
  "event_type": "order.placed",
  "order_id": "ord_9377",
  "total": "52000.00",
  "amount": "52000.00"
}`,
        ),
        response: { format: "text", head: "OK partition=0 offset=41022" },
        marks: ["schema_version", "total", "amount"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
