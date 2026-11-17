import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A hotel booking site removes its single points of failure one by one: two app servers behind a
 * load balancer with health checks, a database replica, automatic failover, fencing, synchronous
 * replication and two availability zones. Numbers are a model scenario, not measurements.
 */
const healthz: WireMessage = {
  format: "http",
  head: "GET /healthz HTTP/1.1",
  headers: [["Host", "192.0.2.11:8080"]],
};

export default defineLesson({
  slug: "redundancy",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "errors", unit: "%", better: "down" },
    { id: "recovery", unit: "s", better: "down" },
    { id: "lost", unit: "", better: "down" },
    { id: "write-p95", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "spof",
      kind: "problem",
      nodes: {
        guest: { kind: "client", at: [0, 5] },
        app1: { kind: "service", at: [5, 3], state: "down" },
        db1: { kind: "db", at: [9, 3] },
      },
      edges: {
        req: { from: "guest", to: "app1", flow: "fail", cut: true, rate: 3 },
        q1: { from: "app1", to: "db1", rate: 0 },
      },
      metrics: { errors: 100, recovery: 1800, lost: 0, "write-p95": 12 },
      focus: ["app1"],
      exchange: {
        edge: "req",
        request: {
          format: "http",
          head: "GET /bookings/b_311 HTTP/1.1",
          headers: [["Host", "book.example.com"]],
        },
        response: { format: "text", head: "connect to 203.0.113.10:443: Connection refused" },
        marks: ["Connection refused"],
      },
    },
    {
      id: "two-apps",
      kind: "fix",
      nodes: {
        app1: { state: "ok" },
        lb: { kind: "lb", at: [2, 5] },
        app2: { kind: "service", at: [5, 7] },
      },
      edges: {
        req: null,
        in: { from: "guest", to: "lb", rate: 4 },
        "to-app1": { from: "lb", to: "app1", rate: 2 },
        "to-app2": { from: "lb", to: "app2", rate: 2 },
        q1: { rate: 2 },
        q2: { from: "app2", to: "db1", rate: 2 },
      },
      metrics: { errors: 0 },
      focus: ["lb", "app1", "app2"],
      exchange: {
        edge: "to-app1",
        request: healthz,
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "status": "ok",
  "db": "ok",
  "version": "4.12.0"
}`,
        },
        marks: ["/healthz", "status", "db"],
      },
    },
    {
      id: "app-dies",
      kind: "case",
      nodes: { app2: { state: "down" } },
      edges: { "to-app2": { flow: "fail", cut: true, rate: 1 }, "to-app1": { rate: 4 }, q2: { rate: 0 }, q1: { rate: 4 } },
      metrics: { recovery: 6 },
      focus: ["lb", "app2"],
      exchange: {
        edge: "to-app2",
        request: { ...healthz, headers: [["Host", "192.0.2.111:8080"]] },
        response: {
          format: "text",
          head: "health check timeout after 2000 ms",
          body: "failures: 3 of 3 (unhealthy_threshold=3)\napp2 removed from pool",
        },
        marks: ["unhealthy_threshold", "removed from pool"],
      },
    },
    {
      id: "replica",
      kind: "fix",
      nodes: { app2: { state: "ok" }, db2: { kind: "db", at: [9, 7] } },
      edges: {
        "to-app2": { flow: "request", cut: false, rate: 2 },
        "to-app1": { rate: 2 },
        q1: { rate: 2 },
        q2: { rate: 2 },
        repl: { from: "db1", to: "db2", rate: 3 },
      },
      focus: ["db1", "db2"],
      exchange: {
        edge: "repl",
        request: { format: "text", head: "START_REPLICATION SLOT db2 LSN 0/5A3F1C0" },
        response: {
          format: "text",
          head: "streaming WAL to db2",
          body: "sent_lsn   = 0/5A3F2D8\nreplay_lag = 180 ms",
        },
        marks: ["START_REPLICATION", "WAL", "replay_lag"],
      },
    },
    {
      id: "primary-dies",
      kind: "problem",
      nodes: { db1: { state: "down" } },
      edges: {
        q1: { flow: "fail", cut: true },
        q2: { flow: "fail", cut: true },
        repl: { cut: true, rate: 0 },
      },
      metrics: { errors: 100, recovery: 1200 },
      focus: ["db1"],
      exchange: {
        edge: "q1",
        request: {
          format: "sql",
          head: "INSERT INTO bookings (id, room, night)",
          body: "VALUES ('b_311', 12, '2026-12-01');",
        },
        response: { format: "text", head: "could not connect to db1:5432: timed out" },
        marks: ["bookings", "timed out"],
      },
    },
    {
      id: "failover",
      kind: "fix",
      edges: {
        q1: null,
        q2: null,
        "q1-db2": { from: "app1", to: "db2", rate: 2 },
        "q2-db2": { from: "app2", to: "db2", rate: 2 },
      },
      metrics: { errors: 0, recovery: 30 },
      focus: ["db2", "app1", "app2"],
      exchange: {
        edge: "q1-db2",
        request: { format: "text", head: "resolve db-primary.internal" },
        response: {
          format: "text",
          head: ";; ANSWER SECTION",
          body: "db-primary.internal.  5  IN  A  192.0.2.121",
        },
        marks: ["db-primary.internal", "192.0.2.121"],
      },
    },
    {
      id: "lost-writes",
      kind: "problem",
      metrics: { lost: 240 },
      focus: ["db1", "db2"],
      exchange: {
        edge: "repl",
        request: {
          format: "text",
          head: "last state before db1 crashed",
          body: "db1 last_lsn   = 0/7C11A00\ndb2 replay_lsn = 0/7C0F310\ngap: 2.1 s of commits, 240 bookings",
        },
        marks: ["last_lsn", "replay_lsn", "gap"],
      },
    },
    {
      id: "split-brain",
      kind: "problem",
      nodes: { db1: { state: "ok" } },
      edges: {
        "q1-db2": null,
        q1: { from: "app1", to: "db1", flow: "dup", rate: 2 },
      },
      metrics: { lost: 275 },
      focus: ["app1", "db1", "db2"],
      exchange: {
        edge: "q1",
        request: {
          format: "sql",
          head: "INSERT INTO bookings (id, room, night)",
          body: "VALUES ('b_388', 12, '2026-12-01');",
        },
        response: { format: "text", head: "INSERT 0 1", body: "-- accepted by db1, which still thinks it is primary" },
        marks: ["INSERT 0 1", "primary"],
      },
    },
    {
      id: "fencing",
      kind: "fix",
      edges: {
        q1: null,
        repl: null,
        "q1-db2": { from: "app1", to: "db2", rate: 2 },
        follow: { from: "db2", to: "db1", rate: 3 },
      },
      focus: ["db1", "db2"],
      exchange: {
        edge: "follow",
        request: { format: "text", head: "db1: rejoin as primary, my term=7" },
        response: {
          format: "text",
          head: "rejected: cluster term=8, primary is db2",
          body: "db1 demoted to replica\nrewind to 0/7C0F310, then follow db2",
        },
        marks: ["term", "demoted", "rewind"],
      },
    },
    {
      id: "sync",
      kind: "fix",
      metrics: { lost: 0, "write-p95": 15 },
      focus: ["db2", "db1"],
      exchange: {
        edge: "q1-db2",
        request: {
          format: "sql",
          head: "SET synchronous_commit = on;",
          body: "INSERT INTO bookings (id, room, night)\nVALUES ('b_402', 7, '2026-12-03');\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT", body: "-- waited for db1 to confirm: +2.6 ms" },
        marks: ["synchronous_commit", "COMMIT", "confirm"],
      },
    },
    {
      id: "zone-down",
      kind: "case",
      nodes: { app2: { state: "down" }, db2: { state: "down" } },
      edges: {
        "to-app2": { flow: "fail", cut: true, rate: 1 },
        "to-app1": { rate: 4 },
        "q1-db2": null,
        "q2-db2": { flow: "fail", cut: true, rate: 0 },
        follow: { cut: true, rate: 0 },
        q1: { from: "app1", to: "db1", flow: "request", rate: 4 },
      },
      metrics: { errors: 0, recovery: 30, lost: 0 },
      focus: ["app1", "db1"],
    },
    { id: "recap", kind: "recap" },
  ],
});
