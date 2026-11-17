import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A small shop API grows from one server to two and learns where its sessions live.
 * Numbers are a model scenario for the story, not measurements.
 */
const getCart: WireMessage = {
  format: "http",
  head: "GET /cart HTTP/1.1",
  headers: [
    ["Host", "api.example.com"],
    ["Cookie", "***"],
  ],
};

export default defineLesson({
  slug: "stateless",
  level: "beginner",
  minutes: 10,
  tier: "public",
  metrics: [
    { id: "servers", unit: "", better: "up" },
    { id: "logouts", unit: "/min", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "one-server",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        app1: { kind: "service", at: [6, 1], load: 40 },
      },
      edges: {
        in: { from: "client", to: "app1", rate: 2 },
        out: { from: "app1", to: "client", flow: "ack", rate: 2 },
      },
      metrics: { servers: 1, logouts: 0, p95: 80 },
      focus: ["client", "app1"],
      exchange: {
        edge: "in",
        request: {
          format: "json",
          head: "POST /login HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Content-Type", "application/json"],
          ],
          body: `{
  "email": "u42@example.com",
  "password": "***"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Set-Cookie", "***"]],
          body: `{ "user_id": "u_42" }`,
        },
        marks: ["password", "Set-Cookie", "user_id"],
        masked: ["password", "Set-Cookie"],
      },
    },
    {
      id: "overloaded",
      kind: "problem",
      nodes: { app1: { load: 97, state: "slow" } },
      edges: { in: { rate: 6 }, out: { rate: 6 } },
      metrics: { p95: 1400 },
      focus: ["app1"],
      exchange: {
        edge: "in",
        request: getCart,
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "5"]],
        },
        marks: ["Cookie", "Retry-After"],
        masked: ["Cookie"],
      },
    },
    {
      id: "add-lb",
      kind: "fix",
      nodes: {
        lb: { kind: "lb", at: [3, 4], load: 30 },
        app2: { kind: "service", at: [6, 7], load: 48 },
        app1: { load: 48, state: "ok" },
      },
      edges: {
        in: null,
        out: null,
        enter: { from: "client", to: "lb", rate: 6 },
        to1: { from: "lb", to: "app1", rate: 3 },
        to2: { from: "lb", to: "app2", rate: 3 },
      },
      metrics: { servers: 2, p95: 90 },
      focus: ["lb", "app1", "app2"],
      exchange: {
        edge: "to2",
        request: {
          format: "text",
          head: "upstream app {",
          body: "  server app1:8080;\n  server app2:8080;\n}  # round-robin",
        },
        marks: ["upstream", "round-robin"],
      },
    },
    {
      id: "lost-session",
      kind: "problem",
      edges: { to2: { flow: "fail" } },
      metrics: { logouts: 40 },
      focus: ["lb", "app2"],
      exchange: {
        edge: "to2",
        request: getCart,
        response: {
          format: "json",
          head: "HTTP/1.1 401 Unauthorized",
          body: `{ "error": "session_not_found" }`,
        },
        marks: ["Cookie", "error"],
        masked: ["Cookie"],
      },
    },
    {
      id: "sticky",
      kind: "fix",
      nodes: { app1: { load: 74 }, app2: { load: 26 } },
      edges: { to1: { rate: 5 }, to2: { flow: "request", rate: 1 } },
      metrics: { logouts: 0, p95: 160 },
      focus: ["lb"],
      exchange: {
        edge: "to1",
        request: {
          format: "text",
          head: "upstream app {",
          body: "  hash $cookie_sid consistent;\n  server app1:8080;\n  server app2:8080;\n}",
        },
        marks: ["hash", "consistent"],
      },
    },
    {
      id: "restart",
      kind: "problem",
      nodes: { app1: { state: "down", load: 0 }, app2: { load: 70 } },
      edges: { to1: { cut: true }, to2: { rate: 6 } },
      metrics: { logouts: 380 },
      focus: ["app1"],
      exchange: {
        edge: "to1",
        request: {
          format: "text",
          head: "app1 | SIGTERM: deploy v2.4",
          body: "app1 | 3870 sessions held in memory\napp1 | process exited",
        },
        marks: ["SIGTERM", "sessions"],
      },
    },
    {
      id: "shared-store",
      kind: "fix",
      nodes: {
        app1: { state: "ok", load: 45 },
        app2: { load: 45 },
        redis: { kind: "cache", at: [10, 4], load: 20 },
      },
      edges: {
        to1: { cut: false, rate: 3 },
        to2: { rate: 3 },
        r1: { from: "app1", to: "redis", rate: 3 },
        r2: { from: "app2", to: "redis", rate: 3 },
      },
      metrics: { logouts: 0, p95: 95 },
      focus: ["app1", "app2", "redis"],
      exchange: {
        edge: "r2",
        request: { format: "text", head: "GET sess:h_51e0" },
        response: {
          format: "json",
          head: "(bulk string, 38 bytes)",
          body: `{
  "user_id": "u_42",
  "cart_items": 3
}`,
        },
        marks: ["sess", "user_id", "cart_items"],
      },
    },
    {
      id: "deploy-ok",
      kind: "case",
      nodes: { app1: { state: "down", load: 0 }, app2: { load: 88 } },
      edges: { to1: { rate: 0 }, r1: { rate: 0 }, to2: { rate: 6 }, r2: { rate: 6 } },
      metrics: { servers: 1, p95: 140 },
      focus: ["app2", "redis"],
      exchange: {
        edge: "to2",
        request: getCart,
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Served-By", "app2"]],
        },
        marks: ["Cookie", "X-Served-By"],
        masked: ["Cookie"],
      },
    },
    {
      id: "signed-token",
      kind: "fix",
      nodes: { app1: { state: "ok", load: 42 }, app2: { load: 42 }, redis: { load: 2 } },
      edges: { to1: { rate: 3 }, to2: { rate: 3 }, r1: { rate: 0 }, r2: { rate: 0 } },
      metrics: { servers: 2, p95: 70 },
      focus: ["client", "app1", "app2"],
      exchange: {
        edge: "enter",
        request: {
          format: "json",
          head: "POST /login HTTP/1.1",
          headers: [["Host", "api.example.com"]],
          body: `{
  "email": "u42@example.com",
  "password": "***"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "access_token": "***",
  "token_type": "Bearer",
  "expires_in": 900
}`,
        },
        marks: ["access_token", "expires_in"],
        masked: ["password", "access_token"],
      },
    },
    {
      id: "revoke",
      kind: "case",
      nodes: { redis: { load: 8 } },
      edges: { r1: { rate: 1 }, r2: { rate: 1 } },
      metrics: { p95: 72 },
      focus: ["app1", "redis"],
      exchange: {
        edge: "r1",
        request: { format: "text", head: "SET deny:jti_7f2 1 EX 900" },
        response: { format: "text", head: "OK" },
        marks: ["deny", "jti_7f2", "EX"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
