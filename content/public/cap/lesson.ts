import { defineLesson } from "@mufassall/scene-schema";

/**
 * A seat-booking service in two data centres with asynchronous replication between them.
 * The link breaks; first one side refuses, then both accept and reconcile, then a third
 * replica gives majority quorums. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "cap",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "accepted", unit: "%", better: "up" },
    { id: "stale", unit: "%", better: "down" },
    { id: "conflicts", unit: "/h", better: "down" },
    { id: "lag", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "two-dcs",
      kind: "case",
      nodes: {
        "user-e": { kind: "actor", at: [0, 0] },
        "api-e": { kind: "service", at: [3, 0] },
        "db-e": { kind: "db", at: [7, 0] },
        "user-w": { kind: "actor", at: [0, 8] },
        "api-w": { kind: "service", at: [3, 8] },
        "db-w": { kind: "db", at: [7, 8] },
      },
      edges: {
        "e-in": { from: "user-e", to: "api-e", rate: 3 },
        "e-db": { from: "api-e", to: "db-e", rate: 3 },
        "w-in": { from: "user-w", to: "api-w", rate: 3 },
        "w-db": { from: "api-w", to: "db-w", rate: 3 },
        repl: { from: "db-e", to: "db-w", rate: 4 },
      },
      metrics: { accepted: 100, stale: 0, conflicts: 0, lag: 30 },
      focus: ["db-e", "db-w"],
      exchange: {
        edge: "repl",
        request: {
          format: "json",
          head: "REPLICATE dc-east -> dc-west",
          body: `{
  "key": "seat:14A",
  "holder": "u_42",
  "version": 17,
  "lag_ms": 30
}`,
        },
        marks: ["key", "version", "lag_ms"],
      },
    },
    {
      id: "stale-read",
      kind: "problem",
      edges: { "w-in": { rate: 5 } },
      metrics: { stale: 2 },
      focus: ["user-w", "api-w", "db-w"],
      exchange: {
        edge: "w-in",
        request: { format: "http", head: "GET /seats/14A HTTP/1.1", headers: [["Host", "west.api.example.com"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "seat": "14A",
  "holder": null,
  "version": 16
}`,
        },
        marks: ["holder", "version"],
      },
    },
    {
      id: "partition",
      kind: "problem",
      edges: { repl: { flow: "fail", cut: true } },
      metrics: { stale: 35, lag: 45000 },
      focus: ["db-e", "db-w"],
      exchange: {
        edge: "repl",
        request: {
          format: "text",
          head: "ERROR replication to dc-west: connection timed out after 5000 ms",
          body: "retrying in 10 s\nreplication lag 45 s and growing",
        },
        marks: ["timed out", "lag"],
      },
    },
    {
      id: "refuse",
      kind: "fix",
      nodes: { "api-w": { state: "slow" } },
      edges: { "w-in": { flow: "fail" }, "w-db": { rate: 0 } },
      metrics: { accepted: 50, stale: 0 },
      focus: ["user-w", "api-w"],
      exchange: {
        edge: "w-in",
        request: {
          format: "http",
          head: "POST /seats/14B/hold HTTP/1.1",
          headers: [["Host", "west.api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "30"]],
          body: `{
  "error": "read_only",
  "reason": "no link to dc-east"
}`,
        },
        marks: ["503", "Retry-After", "error"],
      },
    },
    {
      id: "accept",
      kind: "case",
      nodes: { "api-w": { state: "ok" } },
      edges: { "w-in": { flow: "request" }, "w-db": { rate: 3 } },
      metrics: { accepted: 100, stale: 35 },
      focus: ["api-w", "db-w", "api-e"],
      exchange: {
        edge: "w-db",
        request: {
          format: "sql",
          head: "UPDATE seats SET holder = 'u_77',",
          body: "  version = version + 1\nWHERE seat = '14B' AND holder IS NULL;",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["holder IS NULL", "UPDATE 1"],
      },
    },
    {
      id: "heal",
      kind: "problem",
      edges: { repl: { flow: "dup", cut: false } },
      metrics: { stale: 0, lag: 30, conflicts: 18 },
      focus: ["db-e", "db-w"],
      exchange: {
        edge: "repl",
        request: {
          format: "json",
          head: "REPLICATE dc-east -> dc-west",
          body: `{
  "key": "seat:14B",
  "version": 5,
  "east": "u_42 at 10:02:07.118",
  "west": "u_77 at 10:02:09.540",
  "status": "conflict"
}`,
        },
        marks: ["version", "east", "west", "status"],
      },
    },
    {
      id: "reconcile",
      kind: "fix",
      nodes: { fixer: { kind: "worker", at: [4, 4] } },
      edges: {
        repl: { flow: "request" },
        "fix-e": { from: "db-e", to: "fixer", rate: 1 },
        "fix-w": { from: "db-w", to: "fixer", rate: 1 },
      },
      metrics: { conflicts: 0 },
      focus: ["fixer"],
      exchange: {
        edge: "fix-w",
        request: {
          format: "json",
          head: "RESOLVE seat:14B",
          body: `{
  "rule": "first_hold_wins",
  "winner": "u_42",
  "loser": "u_77",
  "action": "offer_seat_14C"
}`,
        },
        marks: ["rule", "loser", "action"],
      },
    },
    {
      id: "quorum",
      kind: "fix",
      nodes: { fixer: null, "db-t": { kind: "db", at: [11, 4] } },
      edges: {
        "e-t": { from: "api-e", to: "db-t", rate: 3 },
        "w-t": { from: "api-w", to: "db-t", rate: 3 },
      },
      focus: ["api-e", "db-e", "db-t"],
      exchange: {
        edge: "e-t",
        request: {
          format: "text",
          head: "PUT seat:14C holder=u_42 N=3 W=2",
          body: "db-e   ack   4 ms\ndb-t   ack  38 ms\ndb-w   later (async)\ncommitted: 2 of 3",
        },
        marks: ["N", "W", "committed"],
      },
    },
    {
      id: "majority",
      kind: "case",
      nodes: { "api-e": { state: "slow" } },
      edges: {
        repl: { flow: "fail", cut: true },
        "e-t": { flow: "fail", cut: true },
        "e-in": { flow: "fail" },
      },
      metrics: { accepted: 50, stale: 0, conflicts: 0 },
      focus: ["api-e", "db-t", "api-w"],
      exchange: {
        edge: "e-in",
        request: {
          format: "http",
          head: "POST /seats/14D/hold HTTP/1.1",
          headers: [["Host", "east.api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 503 Service Unavailable",
          body: `{
  "error": "no_quorum",
  "acks": 1,
  "needed": 2
}`,
        },
        marks: ["error", "acks", "needed"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
