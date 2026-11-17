import { defineLesson } from "@mufassall/scene-schema";

/**
 * One API behind a load balancer. Deploys start as a weekly manual copy to six servers and end as
 * many small automatic deploys a day: CI artifact, rolling, blue-green, canary with automatic
 * rollback, then feature flags. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "cicd",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "deploys", unit: "/day", better: "up" },
    { id: "failed", unit: "%", better: "down" },
    { id: "mttr", unit: "s", better: "down" },
    { id: "errors", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "manual",
      kind: "problem",
      nodes: {
        dev: { kind: "actor", at: [0, 0] },
        users: { kind: "client", at: [0, 6] },
        lb: { kind: "lb", at: [4, 6], load: 45 },
        blue: { kind: "service", at: [8, 4], state: "slow" },
      },
      edges: {
        ssh: { from: "dev", to: "blue", rate: 1 },
        traffic: { from: "users", to: "lb", rate: 6 },
        "to-blue": { from: "lb", to: "blue", rate: 6 },
      },
      metrics: { deploys: 0.14, failed: 30, mttr: 5400, errors: 40 },
      focus: ["dev", "blue"],
      exchange: {
        edge: "ssh",
        request: {
          format: "text",
          head: "$ ssh deploy@192.0.2.12",
          body: "$ scp api-build.zip /srv/api/\n$ unzip -o /srv/api/api-build.zip\n$ systemctl restart api\napi: missing env PAYMENTS_URL, exiting\n(same by hand on 5 more servers)",
        },
        marks: ["scp", "restart", "missing env"],
      },
    },
    {
      id: "ci",
      kind: "fix",
      nodes: {
        blue: { state: "ok" },
        ci: { kind: "worker", at: [4, 0] },
        registry: { kind: "storage", at: [8, 0] },
      },
      edges: {
        ssh: null,
        push: { from: "dev", to: "ci", rate: 2 },
        publish: { from: "ci", to: "registry", rate: 1 },
      },
      metrics: { deploys: 1, failed: 20, errors: 0.3 },
      focus: ["ci", "registry"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "commit 3f9a1c2 by u_42: checkout, new card form",
          body: "build   ok   48 s\ntest    ok  130 s\nimage   registry.example.com/api:3f9a1c2\ndigest  sha256:7be1c0...\nthe same image goes to staging and production",
        },
        marks: ["commit", "build", "test", "image", "digest"],
      },
    },
    {
      id: "rolling",
      kind: "fix",
      nodes: { green: { kind: "service", at: [8, 8] } },
      edges: {
        roll: { from: "ci", to: "green", rate: 1 },
        "to-blue": { rate: 4 },
        "to-green": { from: "lb", to: "green", rate: 2 },
      },
      metrics: { deploys: 3, failed: 15, mttr: 1800 },
      focus: ["lb", "blue", "green"],
      exchange: {
        edge: "to-green",
        request: { format: "http", head: "GET /healthz HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "status": "ok",
  "version": "3f9a1c2"
}`,
        },
        marks: ["healthz", "status", "version"],
      },
    },
    {
      id: "bad-roll",
      kind: "problem",
      nodes: { blue: null, green: { state: "slow" } },
      edges: { "to-green": { rate: 6, flow: "fail" }, roll: { rate: 0 } },
      metrics: { mttr: 1500, errors: 12 },
      focus: ["lb", "green"],
      exchange: {
        edge: "to-green",
        request: {
          format: "http",
          head: "POST /checkout HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 500 Internal Server Error",
          headers: [["X-Version", "3f9a1c2"]],
        },
        marks: ["checkout", "500", "X-Version"],
      },
    },
    {
      id: "blue-green",
      kind: "fix",
      nodes: { blue: { kind: "service", at: [8, 4] } },
      edges: {
        "to-blue": { from: "lb", to: "blue", rate: 6 },
        "to-green": { rate: 0, flow: "request" },
        switch: { from: "ci", to: "lb", rate: 1 },
      },
      metrics: { mttr: 300, errors: 0.3 },
      focus: ["lb", "blue", "green"],
      exchange: {
        edge: "switch",
        request: {
          format: "json",
          head: "PUT /admin/routes/api HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "live": "blue",
  "standby": "green"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "switched_in_ms": 400,
  "previous": "green"
}`,
        },
        marks: ["live", "standby", "switched_in_ms"],
        masked: ["Authorization"],
      },
    },
    {
      id: "canary",
      kind: "fix",
      nodes: { green: { state: "slow" } },
      edges: {
        roll: { rate: 1 },
        "to-blue": { rate: 5 },
        "to-green": { rate: 1 },
      },
      metrics: { errors: 0.5 },
      focus: ["lb", "green"],
      exchange: {
        edge: "switch",
        request: {
          format: "http",
          head: "GET /admin/stats?window=3m HTTP/1.1",
          headers: [["Authorization", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "blue": {
    "weight": 95,
    "error_rate": 0.3
  },
  "green": {
    "release": "4c0d7e1",
    "weight": 5,
    "error_rate": 4.1
  }
}`,
        },
        marks: ["weight", "error_rate", "release"],
        masked: ["Authorization"],
      },
    },
    {
      id: "auto-rollback",
      kind: "fix",
      nodes: { green: { state: "down" } },
      edges: { "to-green": { rate: 0 }, "to-blue": { rate: 6 }, roll: { rate: 0 } },
      metrics: { mttr: 180, errors: 0.3 },
      focus: ["ci", "lb", "green"],
      exchange: {
        edge: "switch",
        request: {
          format: "json",
          head: "PUT /admin/routes/api/green HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "weight": 0,
  "reason": "error_rate 4.1 > 2 x 0.3 for 3m"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "release": "4c0d7e1",
  "marked": "bad"
}`,
        },
        marks: ["weight", "reason", "marked"],
        masked: ["Authorization"],
      },
    },
    {
      id: "flags",
      kind: "fix",
      nodes: {
        green: { state: "ok" },
        flags: { kind: "service", at: [12, 8] },
      },
      edges: {
        roll: { rate: 1 },
        "to-green": { rate: 6 },
        "to-blue": { rate: 0 },
        ask: { from: "green", to: "flags", rate: 3 },
      },
      metrics: { deploys: 8, failed: 6, mttr: 120 },
      focus: ["green", "flags"],
      exchange: {
        edge: "ask",
        request: { format: "http", head: "GET /flags/new-checkout?user=u_42 HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "flag": "new-checkout",
  "enabled": false,
  "rollout": 10,
  "rule": "staff first, then 10% of users"
}`,
        },
        marks: ["enabled", "rollout", "rule"],
      },
    },
    {
      id: "numbers",
      kind: "case",
      edges: { push: { rate: 4 }, publish: { rate: 3 } },
      metrics: { deploys: 12, failed: 4, mttr: 90 },
      focus: ["dev", "ci"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "delivery report, week 46",
          body: "deploys per day   12\nlead time         47 min, commit to production\nchange failure    4 %\ntime to restore   90 s, median",
        },
        marks: ["deploys per day", "lead time", "change failure", "time to restore"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
