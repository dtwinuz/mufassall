import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

const callbackBody = `{
  "event_id": "evt_81c2",
  "type": "document.accepted",
  "document_id": "doc_5521",
  "sent_at": "2026-11-17T09:14:03Z"
}`;

const callback = (retry?: string): WireMessage => ({
  format: "json",
  head: "POST /callbacks HTTP/1.1",
  headers: [
    ["Host", "api.example.com"],
    ["Content-Type", "application/json"],
    ["X-Signature", "***"],
    ...(retry ? ([["X-Retry-Count", retry]] as const) : []),
  ],
  body: callbackBody,
});

/**
 * Callback reliability. Numbers are a model scenario for the story, not measurements;
 * the player says so under the scene.
 */
export default defineLesson({
  slug: "callbacks",
  level: "intermediate",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "incoming", unit: "/s", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "lost", unit: "%", better: "down" },
    { id: "dupes", unit: "/min", better: "down" },
  ],
  steps: [
    {
      id: "sync",
      kind: "problem",
      nodes: {
        provider: { kind: "external", at: [0, 6] },
        api: { kind: "service", at: [2, 4], state: "slow" },
        store: { kind: "db", at: [7, 5] },
      },
      edges: {
        in: { from: "provider", to: "api", rate: 3 },
        out: { from: "api", to: "provider", flow: "ack", rate: 1 },
        write: { from: "api", to: "store", rate: 3 },
      },
      metrics: { incoming: 40, p95: 3800, lost: 0, dupes: 0 },
      focus: ["api"],
      exchange: {
        edge: "in",
        request: callback(),
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "3812 ms"]] },
        marks: ["X-Signature", "event_id", "X-Response-Time"],
        masked: ["X-Signature"],
      },
    },
    {
      id: "false-ok",
      kind: "problem",
      edges: { write: { cut: true }, out: { rate: 3 } },
      metrics: { lost: 2 },
      focus: ["api", "store"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO documents (id, status)\nVALUES ('doc_5521', 'accepted');",
        },
        response: { format: "text", head: "ERROR: deadlock detected", body: "ROLLBACK" },
        marks: ["ERROR", "ROLLBACK"],
      },
    },
    {
      id: "save-first",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { write: { cut: false } },
      metrics: { p95: 45, lost: 0 },
      focus: ["api", "store"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO inbox (event_id, payload, received_at)",
          body: "VALUES ('evt_81c2', '{\"type\": \"document.accepted\", ...}', now());",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["inbox", "payload", "INSERT 0 1"],
      },
    },
    {
      id: "queue",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [4, 2] },
        worker: { kind: "worker", at: [6, 0] },
      },
      edges: {
        publish: { from: "api", to: "queue", rate: 3 },
        take: { from: "queue", to: "worker", rate: 3 },
        save: { from: "worker", to: "store", rate: 3 },
      },
      metrics: { p95: 30 },
      focus: ["queue", "worker"],
      exchange: {
        edge: "publish",
        request: {
          format: "json",
          head: "PUBLISH callbacks.work",
          headers: [["delivery_mode", "2"]],
          body: '{ "event_id": "evt_81c2" }',
        },
        marks: ["delivery_mode", "event_id"],
      },
    },
    {
      id: "early-ack",
      kind: "problem",
      nodes: { worker: { state: "down" } },
      edges: { take: { cut: true }, save: { rate: 0 } },
      metrics: { lost: 1.5 },
      focus: ["queue", "worker"],
      exchange: {
        edge: "take",
        request: {
          format: "text",
          head: "DELIVER callbacks.work delivery_tag=7",
          body: "consumer: auto_ack=true\nqueue: message 7 removed",
        },
        marks: ["auto_ack"],
      },
    },
    {
      id: "ack-after",
      kind: "fix",
      nodes: { worker: { state: "ok" } },
      edges: { take: { cut: false, flow: "retry" }, save: { rate: 3 } },
      metrics: { lost: 0, dupes: 4 },
      focus: ["queue", "worker"],
      exchange: {
        edge: "take",
        request: { format: "text", head: "DELIVER callbacks.work delivery_tag=7 redelivered=true" },
        response: { format: "text", head: "ACK delivery_tag=7" },
        marks: ["redelivered", "ACK"],
      },
    },
    {
      id: "duplicates",
      kind: "case",
      edges: { in: { flow: "dup" } },
      focus: ["provider", "worker", "store"],
      exchange: {
        edge: "in",
        request: callback("1"),
        marks: ["X-Retry-Count", "event_id"],
        masked: ["X-Signature"],
      },
    },
    {
      id: "idempotency",
      kind: "fix",
      edges: { in: { flow: "request" }, take: { flow: "request" } },
      metrics: { dupes: 0 },
      focus: ["worker", "store"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "INSERT INTO processed (event_id, result)",
          body: "VALUES ('evt_81c2', 'ok')\nON CONFLICT (event_id) DO NOTHING;",
        },
        response: { format: "text", head: "INSERT 0 0" },
        marks: ["ON CONFLICT", "INSERT 0 0"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
