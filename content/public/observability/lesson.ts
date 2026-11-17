import { defineLesson } from "@mufassall/scene-schema";

/**
 * A food-ordering backend: API → orders → inventory + database. Checkout is slow and nobody
 * knows why. Logs, then a request id, then metrics, an alert and traces find the cause.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "observability",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "detect", unit: "s", better: "down" },
    { id: "telemetry", unit: "GB", better: "down" },
  ],
  steps: [
    {
      id: "blind",
      kind: "problem",
      nodes: {
        client: { kind: "client", at: [0, 2] },
        api: { kind: "service", at: [3, 2] },
        orders: { kind: "service", at: [6, 2], state: "slow", load: 70 },
        stock: { kind: "service", at: [9, 0], load: 55 },
        db: { kind: "db", at: [10, 4] },
      },
      edges: {
        call: { from: "client", to: "api", rate: 4 },
        fwd: { from: "api", to: "orders", rate: 4 },
        check: { from: "orders", to: "stock", rate: 10 },
        read: { from: "orders", to: "db", rate: 3 },
      },
      metrics: { p95: 2400, detect: 5400, telemetry: 0.4 },
      focus: ["client", "api"],
      exchange: {
        edge: "call",
        request: {
          format: "http",
          head: "POST /v1/orders HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 201 Created",
          headers: [["X-Response-Time", "2380ms"]],
        },
        marks: ["201 Created", "X-Response-Time"],
      },
    },
    {
      id: "logs",
      kind: "fix",
      nodes: { logs: { kind: "storage", at: [2, 7] } },
      edges: {
        "log-api": { from: "api", to: "logs", rate: 3 },
        "log-orders": { from: "orders", to: "logs", rate: 3 },
      },
      metrics: { detect: 3600, telemetry: 6 },
      focus: ["orders", "logs"],
      exchange: {
        edge: "log-orders",
        request: {
          format: "json",
          head: "orders stdout → log shipper",
          body: `{
  "ts": "2026-11-18T10:42:07.913Z",
  "level": "info",
  "service": "orders",
  "msg": "order created",
  "duration_ms": 2291
}`,
        },
        marks: ["level", "service", "duration_ms"],
      },
    },
    {
      id: "request-id",
      kind: "fix",
      metrics: { detect: 1500 },
      focus: ["api", "orders", "logs"],
      exchange: {
        edge: "fwd",
        request: {
          format: "json",
          head: "POST /internal/orders HTTP/1.1",
          headers: [
            ["Host", "orders.internal"],
            ["X-Request-Id", "req_7f3a91"],
          ],
          body: `{
  "user_id": "u_42",
  "items": ["sku_19", "sku_20"]
}`,
        },
        response: {
          format: "json",
          head: "log line in orders",
          body: `{
  "level": "info",
  "request_id": "req_7f3a91",
  "msg": "order created"
}`,
        },
        marks: ["X-Request-Id", "request_id"],
      },
    },
    {
      id: "red",
      kind: "fix",
      nodes: { tsdb: { kind: "db", at: [6, 8] } },
      edges: {
        "m-api": { from: "api", to: "tsdb", rate: 1 },
        "m-orders": { from: "orders", to: "tsdb", rate: 1 },
      },
      metrics: { detect: 1200, telemetry: 7 },
      focus: ["orders", "tsdb"],
      exchange: {
        edge: "m-orders",
        request: { format: "http", head: "GET /metrics HTTP/1.1", headers: [["Host", "orders.internal:9100"]] },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: `http_requests_total{code="201"} 91240
http_requests_total{code="500"} 412
http_request_duration_seconds_bucket{le="0.5"} 61200
http_request_duration_seconds_bucket{le="2.5"} 90880`,
        },
        marks: ["http_requests_total", "code", "le"],
      },
    },
    {
      id: "use",
      kind: "case",
      nodes: { db: { load: 41 } },
      edges: { "m-db": { from: "db", to: "tsdb", rate: 1 } },
      metrics: { detect: 1000 },
      focus: ["db", "tsdb"],
      exchange: {
        edge: "m-db",
        request: { format: "http", head: "GET /metrics HTTP/1.1", headers: [["Host", "db.internal:9187"]] },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: `db_cpu_utilization 0.41
db_connections_waiting 0
db_errors_total 0`,
        },
        marks: ["db_cpu_utilization", "db_connections_waiting", "db_errors_total"],
      },
    },
    {
      id: "alert",
      kind: "fix",
      nodes: { oncall: { kind: "actor", at: [1, 11] } },
      edges: { page: { from: "tsdb", to: "oncall", flow: "fail", rate: 1 } },
      metrics: { detect: 900 },
      focus: ["tsdb", "oncall"],
      exchange: {
        edge: "page",
        request: {
          format: "text",
          head: "ALERT OrdersSlowP95 firing",
          body: `expr: histogram_quantile(0.95, orders) > 0.8
for: 5m
value: 2.31`,
        },
        marks: ["histogram_quantile", "for", "value"],
      },
    },
    {
      id: "traces",
      kind: "fix",
      nodes: { tracer: { kind: "storage", at: [10, 8] } },
      edges: {
        page: { flow: "ack", rate: 0 },
        "span-api": { from: "api", to: "tracer", rate: 2 },
        "span-orders": { from: "orders", to: "tracer", rate: 2 },
      },
      metrics: { detect: 600, telemetry: 12 },
      focus: ["api", "orders", "tracer"],
      exchange: {
        edge: "fwd",
        request: {
          format: "http",
          head: "POST /internal/orders HTTP/1.1",
          headers: [
            ["Host", "orders.internal"],
            ["traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"],
          ],
        },
        marks: ["traceparent"],
      },
    },
    {
      id: "slow-span",
      kind: "case",
      nodes: { stock: { load: 80 } },
      edges: { check: { rate: 12 } },
      metrics: { detect: 120 },
      focus: ["orders", "stock", "tracer"],
      exchange: {
        edge: "span-orders",
        request: {
          format: "text",
          head: "trace 4bf92f35  POST /v1/orders  2310ms",
          body: `api     POST /v1/orders          2310ms
 orders create_order             2291ms
  db    INSERT orders              38ms
  stock GET /stock/sku_19         184ms
  stock GET /stock/sku_20         181ms
  stock 10 more, one by one      1810ms`,
        },
        marks: ["create_order", "sku_19", "10 more"],
      },
    },
    {
      id: "batch",
      kind: "fix",
      nodes: {
        orders: { state: "ok", load: 35 },
        stock: { load: 30 },
      },
      edges: { check: { rate: 4 } },
      metrics: { p95: 420 },
      focus: ["orders", "stock"],
      exchange: {
        edge: "check",
        request: {
          format: "http",
          head: "GET /v1/stock?skus=sku_19,sku_20,...,sku_30 HTTP/1.1",
          headers: [
            ["Host", "stock.internal"],
            ["traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-a1c3e05b7d2f9e44-01"],
          ],
        },
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "46ms"]] },
        marks: ["skus", "traceparent", "X-Response-Time"],
      },
    },
    {
      id: "sampling",
      kind: "case",
      edges: {
        "span-api": { rate: 1 },
        "span-orders": { rate: 1 },
      },
      metrics: { telemetry: 2.5 },
      focus: ["api", "orders", "tracer"],
      exchange: {
        edge: "span-api",
        request: {
          format: "text",
          head: "sampler: keep 10% of traces, all errors, all over 1s",
          body: `4bf92f35 POST /v1/orders  380ms  dropped
9c11ab02 POST /v1/orders 1240ms  kept: slow
51d0e7aa POST /v1/orders  500    kept: error`,
        },
        marks: ["10%", "dropped", "kept"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
