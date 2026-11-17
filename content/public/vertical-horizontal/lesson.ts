import { defineLesson } from "@mufassall/scene-schema";

/**
 * A growing feed API: first a bigger box, then more boxes.
 * Numbers (traffic, prices) are a model scenario, not measurements or real price lists.
 */
export default defineLesson({
  slug: "vertical-horizontal",
  level: "beginner",
  minutes: 11,
  tier: "public",
  metrics: [
    { id: "rps", unit: "/s", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "errors", unit: "%", better: "down" },
    { id: "cost", unit: "$", better: "down" },
  ],
  steps: [
    {
      id: "one-box",
      kind: "case",
      nodes: {
        users: { kind: "client", at: [0, 4] },
        app: { kind: "service", at: [6, 4], load: 45 },
        db: { kind: "db", at: [10, 4], load: 15 },
      },
      edges: {
        direct: { from: "users", to: "app", rate: 3 },
        reply: { from: "app", to: "users", flow: "ack", rate: 3 },
        sql: { from: "app", to: "db", rate: 3 },
      },
      metrics: { rps: 300, p95: 80, errors: 0, cost: 160 },
      focus: ["app"],
      exchange: {
        edge: "direct",
        request: { format: "http", head: "GET /feed HTTP/1.1", headers: [["Host", "api.example.com"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["X-Served-By", "app-1"],
            ["Server-Timing", "app;dur=38"],
          ],
        },
        marks: ["X-Served-By", "Server-Timing"],
      },
    },
    {
      id: "growth",
      kind: "problem",
      nodes: { app: { load: 97, state: "slow" }, db: { load: 30 } },
      edges: { direct: { rate: 8 }, reply: { rate: 6 }, sql: { rate: 6 } },
      metrics: { rps: 600, p95: 1400, errors: 4 },
      focus: ["app"],
      exchange: {
        edge: "direct",
        request: { format: "http", head: "GET /feed HTTP/1.1", headers: [["Host", "api.example.com"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [
            ["X-Served-By", "app-1"],
            ["Server-Timing", "queue;dur=1210, app;dur=41"],
          ],
        },
        marks: ["503", "Server-Timing"],
      },
    },
    {
      id: "scale-up",
      kind: "fix",
      nodes: { app: { load: 42, state: "ok" }, db: { load: 35 } },
      edges: { reply: { rate: 8 }, sql: { rate: 8 } },
      metrics: { rps: 700, p95: 85, errors: 0, cost: 640 },
      focus: ["app"],
    },
    {
      id: "ceiling",
      kind: "problem",
      nodes: { app: { load: 88 }, db: { load: 60 } },
      edges: { direct: { rate: 12 }, reply: { rate: 12 }, sql: { rate: 12 } },
      metrics: { rps: 2400, p95: 210, cost: 2900 },
      focus: ["app"],
    },
    {
      id: "crash",
      kind: "problem",
      nodes: { app: { state: "down", load: 0 } },
      edges: { direct: { flow: "fail", cut: true }, reply: { rate: 0 }, sql: { rate: 0 } },
      metrics: { rps: 0, errors: 100 },
      focus: ["app"],
      exchange: {
        edge: "direct",
        request: { format: "text", head: "curl https://api.example.com/feed" },
        response: {
          format: "text",
          head: "curl: (7) Failed to connect to api.example.com port 443",
          body: "Connection refused",
        },
        marks: ["Failed to connect", "Connection refused"],
      },
    },
    {
      id: "scale-out",
      kind: "fix",
      nodes: {
        lb: { kind: "lb", at: [3, 4] },
        app: { state: "ok", load: 62 },
        app2: { kind: "service", at: [6, 1], load: 62 },
        app3: { kind: "service", at: [6, 7], load: 62 },
        db: { load: 70 },
      },
      edges: {
        direct: null,
        reply: null,
        in: { from: "users", to: "lb", rate: 9 },
        out: { from: "lb", to: "users", flow: "ack", rate: 9 },
        to1: { from: "lb", to: "app", rate: 3 },
        to2: { from: "lb", to: "app2", rate: 3 },
        to3: { from: "lb", to: "app3", rate: 3 },
        sql: { rate: 3 },
        sql2: { from: "app2", to: "db", rate: 3 },
        sql3: { from: "app3", to: "db", rate: 3 },
      },
      metrics: { rps: 2400, p95: 95, errors: 0, cost: 1000 },
      focus: ["lb", "app", "app2", "app3"],
      exchange: {
        edge: "to2",
        request: {
          format: "http",
          head: "GET /feed HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["X-Forwarded-For", "198.51.100.7"],
            ["X-Request-Id", "req_c41a"],
          ],
        },
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Served-By", "app-2"]] },
        marks: ["X-Forwarded-For", "X-Request-Id", "X-Served-By"],
      },
    },
    {
      id: "logged-out",
      kind: "problem",
      edges: { to2: { flow: "fail" }, to3: { flow: "fail" } },
      metrics: { errors: 30 },
      focus: ["app", "app2", "app3"],
      exchange: {
        edge: "to2",
        request: {
          format: "http",
          head: "GET /cart HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Cookie", "***"],
          ],
        },
        response: { format: "http", head: "HTTP/1.1 302 Found", headers: [["Location", "/login"]] },
        marks: ["Cookie", "Location"],
        masked: ["Cookie"],
      },
    },
    {
      id: "stateless",
      kind: "fix",
      nodes: { sessions: { kind: "cache", at: [11, 7] } },
      edges: {
        to2: { flow: "request" },
        to3: { flow: "request" },
        s1: { from: "app", to: "sessions", rate: 2 },
        s2: { from: "app2", to: "sessions", rate: 2 },
        s3: { from: "app3", to: "sessions", rate: 2 },
      },
      metrics: { errors: 0, cost: 1040 },
      focus: ["sessions"],
      exchange: {
        edge: "s2",
        request: { format: "text", head: "GET session:9c1e7a" },
        response: {
          format: "json",
          head: "(bulk string)",
          body: `{
  "user_id": "u_42",
  "cart_items": 3
}`,
        },
        marks: ["session", "user_id", "cart_items"],
      },
    },
    {
      id: "lose-one",
      kind: "case",
      nodes: { app2: { state: "down", load: 0 }, app: { load: 92 }, app3: { load: 92 } },
      edges: { to2: { flow: "fail", cut: true, rate: 1 }, sql2: { rate: 0 }, s2: { rate: 0 } },
      metrics: { p95: 240, errors: 0.5 },
      focus: ["app", "app2", "app3"],
      exchange: {
        edge: "to2",
        request: { format: "http", head: "GET /healthz HTTP/1.1", headers: [["Host", "app-2.internal"]] },
        response: { format: "text", head: "no response in 2000 ms", body: "app-2 removed from the pool" },
        marks: ["healthz", "no response", "removed"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
