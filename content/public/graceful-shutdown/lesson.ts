import { defineLesson } from "@mufassall/scene-schema";

/**
 * A checkout API runs 6 pods behind a load balancer, 1 200 requests/s, with websockets and a
 * background job worker in the same process, and deploys three times a day with a rolling update.
 * The steps follow one old pod out: the signal that never reaches the app, readiness going false
 * first, the balancer that keeps sending for seconds, the wait and the drain with a deadline inside
 * a 40 s grace period, long-lived connections, jobs, and on the startup side readiness after
 * warm-up and a liveness probe that must not check dependencies. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "graceful-shutdown",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "err", unit: "%", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "cut", unit: "", better: "down" },
    { id: "reconn", unit: "/s", better: "down" },
    { id: "jobcut", unit: "", better: "down" },
    { id: "restarts", unit: "/h", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        web: { kind: "client", at: [0, 5] },
        lb: { kind: "lb", at: [4, 5] },
        old: { kind: "service", at: [8, 2], load: 50 },
        new: { kind: "service", at: [8, 8], load: 50 },
        db: { kind: "db", at: [12, 5], load: 40 },
        queue: { kind: "queue", at: [12, 1] },
        orch: { kind: "worker", at: [4, 1] },
      },
      edges: {
        req: { from: "web", to: "lb", rate: 6, mode: "call" },
        "to-old": { from: "lb", to: "old", rate: 4, mode: "call" },
        "to-new": { from: "lb", to: "new", rate: 4, mode: "call" },
        "old-db": { from: "old", to: "db", rate: 3, mode: "call" },
        "new-db": { from: "new", to: "db", rate: 3, mode: "call" },
        "old-q": { from: "old", to: "queue", rate: 1, mode: "call" },
        "new-q": { from: "new", to: "queue", rate: 1, mode: "call" },
        sig: { from: "orch", to: "old", rate: 1, mode: "async" },
      },
      metrics: { err: 0.02, p99: 120, cut: 0, reconn: 30, jobcut: 0, restarts: 0 },
      focus: ["lb", "old", "new", "orch"],
      exchange: {
        edge: "sig",
        request: {
          format: "text",
          head: "rolling deploy, one old pod leaves   (orchestrator events)",
          body: "10:00:00.000  checkout-v42-1  Ready, receives traffic\n10:00:00.010  checkout-v41-7  Terminating, grace period 40 s\n10:00:00.010  in parallel:  endpoint removed, balancers update in 1-10 s\n10:00:00.010                SIGTERM to PID 1 of the container\n10:00:40.010  still running?  SIGKILL",
        },
        marks: ["Ready", "Terminating", "in parallel", "1-10 s", "SIGTERM", "SIGKILL"],
      },
    },
    {
      id: "sigkill",
      kind: "problem",
      nodes: { old: { state: "down" } },
      edges: { "to-old": { flow: "fail" }, "old-q": { flow: "fail" } },
      metrics: { err: 0.4, cut: 23, reconn: 1900, jobcut: 6 },
      focus: ["orch", "old", "lb"],
      exchange: {
        edge: "sig",
        request: {
          format: "text",
          head: "inside checkout-v41-7",
          body: "PID  COMMAND\n  1  /bin/sh -c node server.js\n  7  node server.js\nSIGTERM to PID 1 (the shell): no handler, not forwarded to PID 7\n10:00:40  SIGKILL, exit code 137\nin flight at the kill    23 requests  -> 502 at the balancer\nopen websockets          1 900 dropped in the same millisecond\njob invoice-88213        half done, no ack",
        },
        marks: ["PID", "/bin/sh -c", "not forwarded", "137", "502", "1 900", "no ack"],
      },
    },
    {
      id: "handler",
      kind: "fix",
      nodes: { old: { state: "ok", load: 50 } },
      edges: { "to-old": { flow: "request" }, "old-q": { flow: "request" } },
      metrics: { err: 0.3, cut: 17, jobcut: 6 },
      focus: ["lb", "old"],
      exchange: {
        edge: "to-old",
        request: {
          format: "http",
          head: "GET /readyz HTTP/1.1",
          headers: [
            ["Host", "api-v41-7:8080"],
            ["User-Agent", "lb-health/2.1"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 503 Service Unavailable",
          body: `{
  "status": "draining",
  "since_ms": 40,
  "in_flight": 17,
  "accepting": true
}`,
        },
        marks: ["/readyz", "status", "in_flight", "accepting"],
      },
    },
    {
      id: "lb-lag",
      kind: "problem",
      edges: { "to-old": { flow: "fail" } },
      metrics: { err: 2.6, cut: 1840 },
      focus: ["lb", "old"],
      exchange: {
        edge: "to-old",
        request: {
          format: "text",
          head: "balancer log, the handler closed the listener right after ready=false",
          body: "10:00:00.010  v41-7  SIGTERM, ready=false, listener closed\n10:00:00.400  upstream api-v41-7:8080  connect() failed (111: Connection refused)  -> 502\n10:00:04.000  health check 1 of 2 failed\n10:00:06.000  health check 2 of 2 failed, upstream marked down\n10:00:09.200  endpoint update arrives, api-v41-7 removed\n-- 9.2 s x 200 requests/s = 1 840 errors from one pod",
        },
        marks: ["listener closed", "Connection refused", "health check", "endpoint update", "1 840 errors"],
      },
    },
    {
      id: "wait",
      kind: "fix",
      edges: { "to-old": { flow: "request", rate: 2 } },
      metrics: { err: 0.1, cut: 17 },
      focus: ["orch", "lb", "old"],
      exchange: {
        edge: "sig",
        request: {
          format: "text",
          head: "the shutdown budget",
          body: "terminationGracePeriodSeconds: 40     the clock starts at Terminating\nt = 0 s       SIGTERM: ready = false, keep accepting\nt = 0-10 s    balancers take the pod out (endpoint update, failed checks)\nt = 10 s      stop accepting, drain what is in flight\nt = 35 s      drain deadline: cut what is left and exit\nt = 40 s      SIGKILL if anything still runs\nor: preStop exec sleep 10, counted inside the same 40 s",
        },
        marks: ["terminationGracePeriodSeconds", "keep accepting", "0-10 s", "stop accepting", "drain deadline", "SIGKILL", "preStop"],
      },
    },
    {
      id: "drain",
      kind: "fix",
      edges: { "to-old": { rate: 0 } },
      metrics: { err: 0.03, cut: 0 },
      focus: ["old", "db"],
      exchange: {
        edge: "old-db",
        request: {
          format: "text",
          head: "checkout-v41-7 log",
          body: "10:00:00.0  SIGTERM, ready=false, still serving\n10:00:10.0  stop accepting; idle keep-alive connections closed\n10:00:10.0  in flight 17; every response now has Connection: close\n10:00:11.3  in flight 0   (slowest: a report, 1.3 s)\n10:00:11.3  db pool closed, after the last request\n10:00:11.4  logs and metrics flushed\n10:00:11.4  exit 0\n-- deadline 10:00:35: anything still running is cut, then exit",
        },
        marks: ["stop accepting", "Connection: close", "in flight 0", "db pool closed", "flushed", "exit 0", "deadline"],
      },
    },
    {
      id: "long-lived",
      kind: "fix",
      edges: { req: { flow: "retry" } },
      metrics: { reconn: 190 },
      focus: ["web", "lb", "old", "new"],
      exchange: {
        edge: "req",
        request: {
          format: "text",
          head: "1 900 websockets on the old pod, at t = 10 s",
          body: "-> {\"type\":\"reconnect\",\"reason\":\"server_restart\",\"retry_in_ms\":[0,10000]}\n-> close frame 1012 (service restart)\nclient: wait random(0..10 s), connect again, land on a ready pod\nSSE: send \"retry: 5000\", end the stream; the browser resumes with Last-Event-ID\n-- 190 reconnects/s for 10 s instead of 1 900 in one second",
        },
        marks: ["reconnect", "retry_in_ms", "1012", "random(0..10 s)", "Last-Event-ID", "190 reconnects/s"],
      },
    },
    {
      id: "jobs",
      kind: "fix",
      edges: { req: { flow: "request" }, "old-q": { flow: "ack" } },
      metrics: { jobcut: 0 },
      focus: ["old", "queue"],
      exchange: {
        edge: "old-q",
        request: {
          format: "text",
          head: "job worker inside the old pod",
          body: "10:00:00.0  SIGTERM: stop receiving new messages\n10:00:00.0  resize-4410   about 2 s left    -> finish, then ack\n10:00:00.0  export-9921   about 4 min left  -> stop at a checkpoint, nack: visible again now\n10:00:02.1  resize-4410 done, ack\nif killed anyway: no ack, visible again after the visibility timeout (120 s), runs twice\nhandlers are idempotent: export-9921 writes the same file under its job id",
        },
        marks: ["stop receiving", "ack", "nack", "visibility timeout", "runs twice", "idempotent"],
      },
    },
    {
      id: "liveness-loop",
      kind: "problem",
      nodes: {
        old: { state: "down" },
        new: { state: "down" },
        db: { state: "slow", load: 90 },
      },
      edges: { "to-old": { flow: "fail", rate: 4 }, "to-new": { flow: "fail" }, req: { flow: "fail" } },
      metrics: { err: 64, p99: 30000, restarts: 18 },
      focus: ["orch", "old", "new", "db"],
      exchange: {
        edge: "sig",
        request: {
          format: "text",
          head: "livenessProbe  GET /healthz  every 5 s, 3 failures -> restart",
          body: "/healthz runs SELECT 1 on the database, timeout 1 s\n14:20:00  database failover, about 20 s\n14:20:15  6 of 6 pods: liveness failed 3 times -> killed\n14:20:21  database back; pods start cold, 0 ready\n14:21:05  first pod ready, takes all traffic, /healthz times out -> killed again\n-- a 20 s database blip became a 6-minute outage",
        },
        marks: ["livenessProbe", "SELECT 1", "failover", "6 of 6", "0 ready", "killed again"],
      },
    },
    {
      id: "probes",
      kind: "fix",
      nodes: {
        old: { state: "ok", load: 50 },
        new: { state: "ok", load: 50 },
        db: { state: "ok", load: 40 },
      },
      edges: { "to-old": { flow: "request", rate: 4 }, "to-new": { flow: "request" }, req: { flow: "request" } },
      metrics: { err: 0.02, p99: 120, restarts: 0 },
      focus: ["orch", "old", "new"],
      exchange: {
        edge: "to-new",
        request: {
          format: "text",
          head: "three probes, three questions",
          body: "startupProbe     /startupz  every 2 s, up to 30 failures: 60 s to start\nreadinessProbe   /readyz    every 2 s: warm-up done and not draining\nlivenessProbe    /livez     every 10 s, 6 failures: the process answers, no dependencies\nwarm-up          db pool 4 connections, price cache 12 000 items, 50 warm-up requests\n-- database down: requests fail fast with 503, pods stay up, nobody restarts",
        },
        marks: ["startupProbe", "readinessProbe", "livenessProbe", "no dependencies", "warm-up", "nobody restarts"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "fast-exit",
      from: "probes",
      steps: [
        {
          id: "exit-now",
          kind: "problem",
          nodes: { old: { state: "down" } },
          edges: { "to-old": { flow: "fail" }, req: { flow: "fail" } },
          metrics: { err: 3.1, cut: 1850 },
          focus: ["lb", "old"],
          exchange: {
            edge: "req",
            request: {
              format: "http",
              head: "POST /v1/checkout HTTP/1.1",
              headers: [
                ["Host", "shop.example.com"],
                ["Authorization", "***"],
                ["Idempotency-Key", "c0b1e7d2-checkout-55120"],
              ],
            },
            response: {
              format: "json",
              head: "HTTP/1.1 502 Bad Gateway",
              body: `{
  "error": "upstream prematurely closed connection",
  "upstream": "checkout-v42-3:8080",
  "pod": "checkout-v42-3, exited 4 ms after SIGTERM"
}`,
            },
            marks: ["Idempotency-Key", "502", "error", "pod"],
            masked: ["Authorization"],
          },
        },
        {
          id: "exit-fix",
          kind: "fix",
          nodes: { old: { state: "ok" } },
          edges: { "to-old": { flow: "request" }, req: { flow: "request" } },
          metrics: { err: 0.02, cut: 0 },
          focus: ["lb", "old", "new"],
          exchange: {
            edge: "to-old",
            request: {
              format: "text",
              head: "faster deploys without skipping the drain",
              body: "revert   SIGTERM -> ready=false, wait 10 s, drain (deadline 25 s), exit\nspeed    maxSurge 2: two new pods at a time, 6 pods in 40 s instead of 75 s\ncheck    a load test runs through every staging rollout: 5xx must stay 0\nalert    5xx > 0.1% while a rollout runs -> pause the rollout",
            },
            marks: ["revert", "maxSurge", "load test", "pause the rollout"],
          },
        },
      ],
    },
  ],
});
