import { defineLesson } from "@mufassall/scene-schema";

/**
 * Two copies of a nightly payout job must agree who runs it. First they ping each other,
 * then they ask one lock server, then a five-node cluster that elects a leader and keeps a
 * replicated log (Raft-style). Lock ids are log indexes and double as fencing tokens.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "consensus",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "double", unit: "$", better: "down" },
    { id: "outage", unit: "s", better: "down" },
    { id: "commit", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "two-leaders",
      kind: "problem",
      nodes: {
        w1: { kind: "worker", at: [0, 1] },
        w2: { kind: "worker", at: [0, 7] },
        ledger: { kind: "db", at: [2, 3] },
      },
      edges: {
        hb: { from: "w1", to: "w2", flow: "fail", cut: true, rate: 1 },
        "pay-1": { from: "w1", to: "ledger", rate: 3 },
        "pay-2": { from: "w2", to: "ledger", flow: "dup", rate: 3 },
      },
      metrics: { double: 48000, outage: 0 },
      focus: ["w1", "w2"],
      exchange: {
        edge: "pay-2",
        request: {
          format: "sql",
          head: "INSERT INTO payouts (run, merchant, amount)",
          body: "SELECT '2026-11-18', merchant, balance\nFROM balances WHERE balance > 0;",
        },
        response: { format: "text", head: "INSERT 0 312" },
        marks: ["run", "INSERT 0 312"],
      },
    },
    {
      id: "lock-server",
      kind: "fix",
      nodes: { n1: { kind: "service", at: [8, 0] } },
      edges: {
        hb: null,
        "lock-1": { from: "w1", to: "n1", rate: 1 },
        "lock-2": { from: "w2", to: "n1", rate: 1 },
        "pay-2": { flow: "request", rate: 0 },
      },
      metrics: { double: 0, commit: 2 },
      focus: ["n1", "w2"],
      exchange: {
        edge: "lock-2",
        request: {
          format: "json",
          head: "POST /v1/locks/payouts HTTP/1.1",
          body: `{
  "owner": "w2",
  "ttl_s": 15
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 409 Conflict",
          body: `{
  "granted": false,
  "holder": "w1"
}`,
        },
        marks: ["ttl_s", "granted", "holder"],
      },
    },
    {
      id: "single-dies",
      kind: "problem",
      nodes: { n1: { state: "down" } },
      edges: {
        "lock-1": { flow: "fail", cut: true },
        "lock-2": { flow: "fail", cut: true },
        "pay-1": { rate: 0 },
      },
      metrics: { outage: 1800 },
      focus: ["n1"],
      exchange: {
        edge: "lock-1",
        request: { format: "http", head: "POST /v1/locks/payouts HTTP/1.1" },
        response: {
          format: "text",
          head: "connect ECONNREFUSED n1:7000",
          body: "payouts job skipped: no lock service",
        },
        marks: ["ECONNREFUSED", "skipped"],
      },
    },
    {
      id: "cluster",
      kind: "fix",
      nodes: {
        n1: { state: "ok" },
        n2: { kind: "service", at: [12, 3] },
        n3: { kind: "service", at: [11, 8] },
        n4: { kind: "service", at: [6, 9] },
        n5: { kind: "service", at: [5, 4] },
      },
      edges: {
        "lock-1": { flow: "request", cut: false },
        "lock-2": null,
        "pay-1": { rate: 3 },
        "ae-2": { from: "n1", to: "n2", rate: 2 },
        "ae-3": { from: "n1", to: "n3", rate: 2 },
        "ae-4": { from: "n1", to: "n4", rate: 2 },
        "ae-5": { from: "n1", to: "n5", rate: 2 },
      },
      metrics: { outage: 0, commit: 6 },
      focus: ["n1", "n2"],
      exchange: {
        edge: "ae-2",
        request: {
          format: "json",
          head: "AppendEntries n1 -> n2",
          body: `{
  "term": 1,
  "leader": "n1",
  "prev_index": 41,
  "entries": [
    { "index": 42, "op": "lock payouts w1" }
  ],
  "commit": 41
}`,
        },
        response: {
          format: "json",
          head: "AppendEntries reply",
          body: `{
  "term": 1,
  "success": true
}`,
        },
        marks: ["term", "leader", "prev_index", "entries", "commit", "success"],
      },
    },
    {
      id: "majority",
      kind: "case",
      edges: { "lock-1": { rate: 2 } },
      focus: ["w1", "n1"],
      exchange: {
        edge: "lock-1",
        request: {
          format: "json",
          head: "POST /v1/locks/payouts HTTP/1.1",
          body: `{
  "owner": "w1",
  "ttl_s": 15
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "granted": true,
  "index": 42,
  "acks": 3,
  "fence": 42
}`,
        },
        marks: ["index", "acks", "fence"],
      },
    },
    {
      id: "partition",
      kind: "problem",
      nodes: { n1: { state: "slow" } },
      edges: {
        "ae-2": { flow: "fail", cut: true },
        "ae-3": { flow: "fail", cut: true },
        "ae-4": { flow: "fail", cut: true },
        "lock-1": { flow: "fail" },
      },
      focus: ["n1", "n5"],
      exchange: {
        edge: "lock-1",
        request: {
          format: "json",
          head: "POST /v1/locks/payouts HTTP/1.1",
          body: `{
  "owner": "w1",
  "ttl_s": 15
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 503 Service Unavailable",
          body: `{
  "error": "not_committed",
  "index": 43,
  "acks": 2,
  "needed": 3
}`,
        },
        marks: ["error", "acks", "needed"],
      },
    },
    {
      id: "election",
      kind: "fix",
      nodes: { n2: { load: 30 } },
      edges: {
        "lock-1": null,
        "vote-3": { from: "n2", to: "n3", rate: 2 },
        "vote-4": { from: "n2", to: "n4", rate: 2 },
        "lock-n2": { from: "w1", to: "n2", rate: 2 },
      },
      metrics: { outage: 0.4, commit: 7 },
      focus: ["n2", "n3", "n4"],
      exchange: {
        edge: "vote-3",
        request: {
          format: "json",
          head: "RequestVote n2 -> n3",
          body: `{
  "term": 2,
  "candidate": "n2",
  "last_index": 42,
  "last_term": 1
}`,
        },
        response: {
          format: "json",
          head: "RequestVote reply",
          body: `{
  "term": 2,
  "vote_granted": true
}`,
        },
        marks: ["term", "candidate", "last_index", "vote_granted"],
      },
    },
    {
      id: "heal",
      kind: "case",
      nodes: { n1: { state: "ok" } },
      edges: {
        "ae-2": null,
        "ae-3": null,
        "ae-4": null,
        "ae-5": null,
        "ae2-1": { from: "n2", to: "n1", rate: 2 },
        "ae2-5": { from: "n2", to: "n5", rate: 2 },
      },
      focus: ["n1", "n2"],
      exchange: {
        edge: "ae2-1",
        request: {
          format: "text",
          head: "INFO n1: AppendEntries with term 2 > my term 1",
          body: "stepping down to follower, leader is n2\ntruncating log from index 43 (not committed)\nlog now matches n2 up to index 51",
        },
        marks: ["stepping down", "truncating", "not committed"],
      },
    },
    {
      id: "fencing",
      kind: "case",
      nodes: { w1: { state: "slow" } },
      edges: {
        "pay-1": { flow: "fail" },
        "pay-2": { flow: "request", rate: 3 },
      },
      metrics: { double: 0 },
      focus: ["w1", "ledger", "w2"],
      exchange: {
        edge: "pay-1",
        request: {
          format: "sql",
          head: "UPDATE payout_runs SET fence = 42, status = 'running'",
          body: "WHERE job = 'nightly' AND fence < 42;",
        },
        response: { format: "text", head: "UPDATE 0" },
        marks: ["fence < 42", "UPDATE 0"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
