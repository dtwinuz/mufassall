import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop ships a new checkout flow. First deploy and release are the same act, so a bug hits
 * everyone and the way back is a 15-minute redeploy. Then the code ships dark behind a flag:
 * a flag service, an SDK that evaluates locally from a cached snapshot and gets updates over
 * SSE, a percentage rollout by a stable hash of the user id, a kill switch, a guardrail that
 * turns the flag off by itself, and owners plus expiry dates against stale flags.
 * Numbers are a model scenario.
 */
export default defineLesson({
  slug: "feature-flags",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "errors", unit: "%", better: "down" },
    { id: "off-s", unit: "s", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "stale", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "deploy",
      kind: "case",
      nodes: {
        users: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [4, 5] },
        db: { kind: "db", at: [8, 8] },
        ci: { kind: "worker", at: [0, 9] },
      },
      edges: {
        req: { from: "users", to: "api", rate: 4 },
        q: { from: "api", to: "db", rate: 3 },
        ship: { from: "ci", to: "api", rate: 1 },
      },
      metrics: { errors: 0.4, "off-s": 900, p99: 180, stale: 0 },
      focus: ["ci", "api"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "14:00:00 deploy checkout v412 -> 24/24 pods",
          body: "14:00:00 includes: new checkout flow (PR 1183)\n14:03:40 rollout complete: 100% of traffic on v412\n-- merging the PR was the release decision",
        },
        marks: ["v412", "new checkout flow", "100% of traffic", "release decision"],
      },
    },
    {
      id: "bug",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { req: { flow: "fail" } },
      metrics: { errors: 7.2 },
      focus: ["users", "api"],
      exchange: {
        edge: "req",
        request: {
          format: "http",
          head: "POST /v1/checkout HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 500 Internal Server Error",
          body: `{
  "error": "tax_rounding",
  "request_id": "req_8f21",
  "version": "v412"
}`,
        },
        marks: ["error", "request_id", "version"],
        masked: ["Authorization"],
      },
    },
    {
      id: "flag",
      kind: "fix",
      nodes: {
        api: { state: "ok" },
        flags: { kind: "service", at: [4, 1] },
        team: { kind: "actor", at: [0, 0] },
      },
      edges: {
        req: { flow: "request" },
        edit: { from: "team", to: "flags", rate: 1 },
        ask: { from: "api", to: "flags", rate: 3 },
      },
      metrics: { errors: 0.4, "off-s": 1 },
      focus: ["team", "flags", "api"],
      exchange: {
        edge: "edit",
        request: {
          format: "json",
          head: "PUT /v1/flags/new-checkout HTTP/1.1",
          body: `{
  "key": "new-checkout",
  "enabled": true,
  "rules": [
    { "segment": "staff", "serve": "on" },
    {
      "rollout": { "on": 5, "off": 95 },
      "by": "user_id"
    }
  ],
  "default": "off"
}`,
        },
        response: { format: "json", head: "HTTP/1.1 200 OK", body: `{ "version": 12 }` },
        marks: ["enabled", "rules", "segment", "rollout", "default", "version"],
      },
    },
    {
      id: "remote",
      kind: "problem",
      nodes: { flags: { state: "slow", load: 92 } },
      edges: { ask: { rate: 6 } },
      metrics: { p99: 226 },
      focus: ["api", "flags"],
      exchange: {
        edge: "ask",
        request: {
          format: "text",
          head: "14:20:01 eval new-checkout user=u_42 remote 46 ms",
          body: "14:20:01 eval new-checkout user=u_77 remote 51 ms\n14:20:02 eval new-checkout user=u_90 timeout 200 ms\n         -> default off\n-- 3 400 checkouts/min = 3 400 calls/min to flags",
        },
        marks: ["remote", "timeout", "default off", "calls/min"],
      },
    },
    {
      id: "sdk",
      kind: "fix",
      nodes: { flags: { state: "ok", load: 8 } },
      edges: { ask: { rate: 1 } },
      metrics: { p99: 181, "off-s": 60 },
      focus: ["api", "flags"],
      exchange: {
        edge: "ask",
        request: {
          format: "http",
          head: "GET /v1/sdk/snapshot HTTP/1.1",
          headers: [
            ["Host", "flags.internal.example.com"],
            ["Authorization", "***"],
            ["If-None-Match", "\"v12\""],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "version": 13,
  "flags": {
    "new-checkout": { "default": "off" },
    "dark-mode": { "default": "on" }
  },
  "poll_seconds": 60
}`,
        },
        marks: ["If-None-Match", "version", "flags", "poll_seconds"],
        masked: ["Authorization"],
      },
    },
    {
      id: "stream",
      kind: "fix",
      edges: { push: { from: "flags", to: "api", rate: 1, mode: "async" } },
      metrics: { "off-s": 2 },
      focus: ["flags", "api"],
      exchange: {
        edge: "push",
        request: {
          format: "http",
          head: "GET /v1/sdk/stream HTTP/1.1",
          headers: [
            ["Host", "flags.internal.example.com"],
            ["Accept", "text/event-stream"],
            ["Last-Event-ID", "1841"],
          ],
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Type", "text/event-stream"]],
          body: "event: flag.updated\nid: 1842\ndata: {\"key\":\"new-checkout\",\"version\":14}\n\n: keep-alive",
        },
        marks: ["Accept", "Last-Event-ID", "event", "data", "keep-alive"],
      },
    },
    {
      id: "rollout",
      kind: "fix",
      nodes: { api: { load: 45 } },
      edges: { req: { rate: 5 } },
      metrics: { errors: 0.5 },
      focus: ["users", "api"],
      exchange: {
        edge: "req",
        request: {
          format: "text",
          head: "eval flag=new-checkout user=u_42 bucket=1873",
          body: "  hash(\"nc-7a:u_42\") % 10000 = 1873\n  rule rollout on < 2500 (25%) -> on, version 15\n  0.004 ms, no network call\n-- any pod, any day: u_42 -> bucket=1873",
        },
        marks: ["bucket", "hash", "rollout", "no network call"],
      },
    },
    {
      id: "kill",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { edit: { flow: "retry", rate: 2 } },
      metrics: { errors: 0.4 },
      focus: ["team", "flags", "api"],
      exchange: {
        edge: "edit",
        request: {
          format: "json",
          head: "PATCH /v1/flags/new-checkout HTTP/1.1",
          headers: [
            ["Host", "flags.internal.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "enabled": false,
  "reason": "INC-3107 card declines"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "version": 16,
  "streamed_to": 24,
  "took_ms": 1800
}`,
        },
        marks: ["enabled", "reason", "streamed_to", "took_ms"],
        masked: ["Authorization"],
      },
    },
    {
      id: "guardrail",
      kind: "fix",
      nodes: {
        events: { kind: "queue", at: [9, 4] },
        guard: { kind: "worker", at: [12, 1] },
      },
      edges: {
        edit: { flow: "request", rate: 1 },
        emit: { from: "api", to: "events", rate: 3 },
        read: { from: "guard", to: "events", rate: 2 },
        off: { from: "guard", to: "flags", flow: "fail", rate: 1 },
      },
      focus: ["events", "guard", "flags"],
      exchange: {
        edge: "off",
        request: {
          format: "text",
          head: "GUARDRAIL new-checkout  rollout 50%  window 10 min",
          body: "  checkout_error_rate  on 3.9%  off 0.4%  limit +1.0 pt\n  p99_ms               on 240   off 182   limit +30\n  action: flag disabled automatically, version 19\n  paged: team-checkout at 15:42:10",
        },
        marks: ["GUARDRAIL", "checkout_error_rate", "limit", "disabled automatically"],
      },
    },
    {
      id: "stale",
      kind: "problem",
      nodes: { events: null, guard: null },
      edges: { lint: { from: "ci", to: "flags", rate: 1 } },
      metrics: { stale: 61 },
      focus: ["ci", "flags"],
      exchange: {
        edge: "lint",
        request: {
          format: "text",
          head: "flag-audit 2026-11-18: 142 flags, 61 stale",
          body: "new-checkout   100% on for 41 days   team-checkout\nold-search       0% on for 230 days  owner left\nbeta-invoices  removed in code, still in config\n-- every flag doubles the paths tests must cover",
        },
        marks: ["stale", "100% on", "owner left", "removed in code"],
      },
    },
    {
      id: "expiry",
      kind: "fix",
      edges: { lint: { flow: "fail" } },
      metrics: { stale: 4 },
      focus: ["ci", "flags"],
      exchange: {
        edge: "lint",
        request: {
          format: "text",
          head: "ci flag-lint  checkout@v431",
          body: "FAIL new-checkout: expired 2026-12-01\n     owner team-checkout\n     src/checkout/flow.ts:88  flags.on(\"new-checkout\")\n     remove the branch or extend with a reason\nPASS 37 flags within expiry, 4 marked permanent",
        },
        marks: ["FAIL", "expired", "owner", "extend with a reason", "permanent"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
