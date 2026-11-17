import { defineLesson } from "@mufassall/scene-schema";

/**
 * A payment service tells online shops that a payment went through by sending them webhooks.
 * The lesson is about the sender's side and the receiver's side together: decoupling, HMAC
 * signatures, replay protection, retries, idempotent receivers, ordering and dead endpoints.
 * Header names follow the open Standard Webhooks spec. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "webhooks",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "forged", unit: "", better: "down" },
    { id: "dups", unit: "/day", better: "down" },
    { id: "backlog", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "inline",
      kind: "case",
      nodes: {
        payments: { kind: "service", at: [0, 4], load: 40 },
        shop: { kind: "external", at: [10, 4] },
        shopdb: { kind: "db", at: [12, 7] },
      },
      edges: {
        direct: { from: "payments", to: "shop", rate: 3 },
        save: { from: "shop", to: "shopdb", rate: 3 },
      },
      metrics: { p95: 8200, forged: 0, dups: 0, backlog: 0 },
      focus: ["payments", "shop"],
      exchange: {
        edge: "direct",
        request: {
          format: "json",
          head: "POST /hooks/payments HTTP/1.1",
          headers: [
            ["Host", "shop.example.com"],
            ["Content-Type", "application/json"],
          ],
          body: `{
  "type": "payment.succeeded",
  "data": { "payment_id": "pay_771", "order_id": "ord_5521", "amount": 129000 }
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "8100 ms"]] },
        marks: ["type", "order_id", "X-Response-Time"],
      },
    },
    {
      id: "queue",
      kind: "fix",
      nodes: {
        payments: { load: 15 },
        queue: { kind: "queue", at: [3, 4], load: 20 },
        sender: { kind: "worker", at: [6, 4], load: 40 },
      },
      edges: {
        direct: null,
        enqueue: { from: "payments", to: "queue", rate: 3 },
        take: { from: "queue", to: "sender", rate: 3 },
        deliver: { from: "sender", to: "shop", rate: 3 },
      },
      metrics: { p95: 60 },
      focus: ["payments", "queue", "sender"],
      exchange: {
        edge: "deliver",
        request: {
          format: "text",
          head: "sender: deliver evt_9f2 to https://shop.example.com/hooks/payments",
          body: "timeout 10 s\n2xx = delivered, anything else = retry later",
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["evt_9f2", "timeout", "2xx"],
      },
    },
    {
      id: "forged",
      kind: "problem",
      nodes: { attacker: { kind: "actor", at: [10, 0] }, shop: { state: "slow" } },
      edges: { forge: { from: "attacker", to: "shop", flow: "fail", rate: 2 } },
      metrics: { forged: 14 },
      focus: ["attacker", "shop"],
      exchange: {
        edge: "forge",
        request: {
          format: "json",
          head: "POST /hooks/payments HTTP/1.1",
          headers: [["Host", "shop.example.com"]],
          body: `{
  "type": "payment.succeeded",
  "data": { "order_id": "ord_6010", "amount": 4990000 }
}`,
        },
        response: { format: "text", head: "HTTP/1.1 200 OK", body: "shop: order ord_6010 marked paid, sent to the warehouse" },
        marks: ["order_id", "amount", "marked paid"],
      },
    },
    {
      id: "signing",
      kind: "fix",
      nodes: { shop: { state: "ok" } },
      edges: { forge: { cut: true } },
      metrics: { forged: 0 },
      focus: ["sender", "shop"],
      exchange: {
        edge: "deliver",
        request: {
          format: "json",
          head: "POST /hooks/payments HTTP/1.1",
          headers: [
            ["Webhook-Id", "evt_9f2"],
            ["Webhook-Timestamp", "1763452800"],
            ["Webhook-Signature", "v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4="],
          ],
          body: `{ "type": "payment.succeeded", "data": { "order_id": "ord_5521" } }`,
        },
        marks: ["Webhook-Id", "Webhook-Timestamp", "Webhook-Signature"],
      },
    },
    {
      id: "replay",
      kind: "problem",
      nodes: { shop: { state: "slow" } },
      edges: { forge: { cut: false, flow: "dup", rate: 2 } },
      metrics: { forged: 3 },
      focus: ["attacker", "shop"],
      exchange: {
        edge: "forge",
        request: {
          format: "text",
          head: "POST /hooks/payments (copied from a leaked proxy log)",
          body: "Webhook-Id: evt_9f2\nWebhook-Timestamp: 1763452800  -- yesterday\nsignature: valid\nshop: order ord_5521 marked paid again, second parcel sent",
        },
        marks: ["leaked", "yesterday", "valid"],
      },
    },
    {
      id: "timestamp",
      kind: "fix",
      nodes: { shop: { state: "ok" } },
      edges: { forge: { cut: true, flow: "fail" } },
      metrics: { forged: 0 },
      focus: ["shop"],
      exchange: {
        edge: "forge",
        request: {
          format: "text",
          head: "shop: verify evt_9f2",
          body: "signed = id + \".\" + timestamp + \".\" + body\nexpected = HMAC-SHA256(secret, signed)\nconstant-time compare -> ok\n|now - timestamp| = 86400 s > 300 s -> reject",
        },
        response: { format: "http", head: "HTTP/1.1 400 Bad Request" },
        marks: ["signed", "HMAC-SHA256", "constant-time", "reject"],
      },
    },
    {
      id: "retries",
      kind: "fix",
      nodes: { shop: { state: "down" }, queue: { load: 55 }, attacker: null },
      edges: { deliver: { flow: "retry", rate: 2 } },
      metrics: { backlog: 1800 },
      focus: ["sender", "shop"],
      exchange: {
        edge: "deliver",
        request: { format: "http", head: "POST /hooks/payments HTTP/1.1", headers: [["Webhook-Id", "evt_9f2"]] },
        response: {
          format: "text",
          head: "HTTP/1.1 503 Service Unavailable",
          body: "attempt 3 failed, next in 30 min\nschedule: now, 5 s, 5 min, 30 min, 2 h, 5 h, 10 h, 10 h\n-- with jitter, about 1.5 days in total",
        },
        marks: ["503", "attempt", "schedule", "jitter"],
      },
    },
    {
      id: "duplicate",
      kind: "problem",
      nodes: { shop: { state: "slow" }, queue: { load: 25 } },
      edges: { deliver: { flow: "dup", rate: 3 }, save: { flow: "dup" } },
      metrics: { backlog: 40, dups: 25 },
      focus: ["sender", "shop", "shopdb"],
      exchange: {
        edge: "deliver",
        request: {
          format: "text",
          head: "10:00:00 deliver evt_9f2 attempt 1",
          body: "10:00:10 timeout: no answer in 10 s, schedule retry\n10:00:12 shop finished attempt 1: order ord_5521 paid, bonus +500\n10:00:15 deliver evt_9f2 attempt 2\n10:00:16 shop: order ord_5521 paid, bonus +500",
        },
        marks: ["timeout", "attempt 2", "bonus"],
      },
    },
    {
      id: "inbox",
      kind: "fix",
      nodes: { shop: { state: "ok" } },
      edges: { deliver: { flow: "request" }, save: { flow: "request" } },
      metrics: { dups: 0 },
      focus: ["shop", "shopdb"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "INSERT INTO webhook_inbox (webhook_id, received_at)",
          body: "VALUES ('evt_9f2', now())\nON CONFLICT (webhook_id) DO NOTHING;\n-- 0 rows: already seen, answer 200 and stop\n-- 1 row: answer 200 now, process in the background",
        },
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "12 ms"]] },
        marks: ["webhook_id", "ON CONFLICT", "background", "X-Response-Time"],
      },
    },
    {
      id: "ordering",
      kind: "case",
      focus: ["sender", "shop"],
      exchange: {
        edge: "deliver",
        request: {
          format: "json",
          head: "POST /hooks/payments HTTP/1.1",
          headers: [["Webhook-Id", "evt_a40"]],
          body: `{
  "type": "payment.refunded",
  "created_at": "2026-11-18T10:05:00Z",
  "data": { "payment_id": "pay_771", "version": 3 }
}`,
        },
        response: { format: "text", head: "shop: payment pay_771 has version 2, applying 3", body: "-- payment.succeeded (version 2) arrived after it: skipped" },
        marks: ["type", "created_at", "version", "skipped"],
      },
    },
    {
      id: "dead-endpoint",
      kind: "fix",
      nodes: { oldshop: { kind: "external", at: [8, 9], state: "down" }, sender: { load: 70 } },
      edges: { dead: { from: "sender", to: "oldshop", flow: "fail", rate: 4 } },
      metrics: { backlog: 9000 },
      focus: ["sender", "oldshop"],
      exchange: {
        edge: "dead",
        request: {
          format: "text",
          head: "endpoint ep_311: failing for 5 days",
          body: "DNS: NXDOMAIN on every attempt, 9000 events waiting\nper-endpoint limit: 2 in flight, other shops unaffected\nendpoint disabled, owner emailed, events kept 30 days for replay",
        },
        marks: ["NXDOMAIN", "per-endpoint", "disabled", "replay"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
