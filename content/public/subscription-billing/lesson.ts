import { defineLesson } from "@mufassall/scene-schema";

/**
 * A SaaS product bills monthly plans. A nightly job renews due subscriptions and charges cards
 * through a payment provider. The story: an overlapping run double-charges, invoices get
 * idempotency keys and leases, declines go through dunning, upgrades are prorated, month ends
 * keep the anchor day, provider webhooks finish payments asynchronously, and cancellations take
 * effect at period end. Amounts are integer minor units (cents). Numbers are a model scenario.
 */
export default defineLesson({
  slug: "subscription-billing",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "dupes", unit: "/day", better: "down" },
    { id: "unpaid", unit: "$", better: "down" },
    { id: "recovered", unit: "%", better: "up" },
    { id: "churn", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "subscribe",
      kind: "case",
      nodes: {
        customer: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [3, 3] },
        invoices: { kind: "db", at: [3, 7] },
      },
      edges: {
        sub: { from: "customer", to: "api", rate: 2 },
        save: { from: "api", to: "invoices", rate: 2 },
      },
      metrics: { dupes: 0, unpaid: 0, recovered: 0, churn: 0 },
      focus: ["customer", "api", "invoices"],
      exchange: {
        edge: "save",
        request: {
          format: "json",
          head: "invoices: new row",
          body: `{
  "invoice_id": "in_7001",
  "subscription_id": "sub_42",
  "plan": "basic_monthly",
  "amount_minor": 2000,
  "currency": "USD",
  "period_start": "2026-11-01T00:00:00Z",
  "period_end": "2026-12-01T00:00:00Z",
  "status": "open"
}`,
        },
        marks: ["subscription_id", "plan", "amount_minor", "period_start", "period_end", "status"],
      },
    },
    {
      id: "nightly",
      kind: "case",
      nodes: {
        job: { kind: "worker", at: [6, 5] },
        provider: { kind: "external", at: [9, 2] },
      },
      edges: {
        scan: { from: "job", to: "invoices", rate: 2 },
        charge: { from: "job", to: "provider", rate: 2, mode: "call" },
      },
      focus: ["job", "invoices", "provider"],
      exchange: {
        edge: "scan",
        request: {
          format: "sql",
          head: "SELECT s.id, s.plan, s.current_period_end",
          body: "  FROM subscriptions s\n WHERE s.status = 'active'\n   AND s.current_period_end <= now();\n-- 02:00 UTC every night, then for each row:\n-- create the invoice, charge the card, extend the period",
        },
        response: { format: "text", head: "18 412 rows" },
        marks: ["current_period_end", "active", "18 412 rows"],
      },
    },
    {
      id: "overlap",
      kind: "problem",
      nodes: { job2: { kind: "worker", at: [8, 8] } },
      edges: {
        scan2: { from: "job2", to: "invoices", flow: "dup", rate: 2 },
        charge2: { from: "job2", to: "provider", flow: "dup", rate: 2 },
      },
      metrics: { dupes: 41 },
      focus: ["job", "job2", "provider"],
      exchange: {
        edge: "charge2",
        request: {
          format: "text",
          head: "02:00 cron billing-run started on node-a",
          body: "02:00 cron billing-run started on node-b (new deploy)\n02:07 node-a sub_42 charge 2000 -> ch_501\n02:07 node-b sub_42 charge 2000 -> ch_502\n-- 41 customers charged twice tonight",
        },
        marks: ["node-a", "node-b", "ch_501", "ch_502"],
      },
    },
    {
      id: "lease",
      kind: "fix",
      edges: {
        scan2: { flow: "request", rate: 1 },
        charge2: null,
      },
      metrics: { dupes: 0 },
      focus: ["job", "job2", "provider"],
      exchange: {
        edge: "charge",
        request: {
          format: "json",
          head: "POST /v1/charges HTTP/1.1",
          headers: [
            ["Host", "provider.example.com"],
            ["Authorization", "***"],
            ["Idempotency-Key", "in_7001-attempt-1"],
          ],
          body: `{
  "customer": "cus_42",
  "amount_minor": 2000,
  "currency": "USD",
  "invoice_id": "in_7001"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "id": "ch_501",
  "status": "succeeded"
}`,
        },
        marks: ["Idempotency-Key", "invoice_id", "Idempotent-Replayed", "status"],
        masked: ["Authorization"],
      },
    },
    {
      id: "decline",
      kind: "problem",
      edges: { charge: { flow: "fail" } },
      metrics: { unpaid: 18400, churn: 2.9 },
      focus: ["job", "provider"],
      exchange: {
        edge: "charge",
        request: {
          format: "http",
          head: "POST /v1/charges HTTP/1.1",
          headers: [
            ["Host", "provider.example.com"],
            ["Authorization", "***"],
            ["Idempotency-Key", "in_7188-attempt-1"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 402 Payment Required",
          body: `{
  "id": "ch_733",
  "status": "failed",
  "decline_code": "insufficient_funds",
  "retryable": true
}`,
        },
        marks: ["402", "decline_code", "retryable"],
        masked: ["Authorization"],
      },
    },
    {
      id: "dunning",
      kind: "fix",
      nodes: { mailer: { kind: "external", at: [11, 4] } },
      edges: {
        charge: { flow: "retry" },
        notify: { from: "job", to: "mailer", rate: 1 },
      },
      metrics: { unpaid: 6600, recovered: 64, churn: 1.0 },
      focus: ["job", "invoices", "mailer"],
      exchange: {
        edge: "scan",
        request: {
          format: "json",
          head: "dunning: row for in_7188",
          body: `{
  "invoice_id": "in_7188",
  "attempt": 1,
  "schedule_days": [1, 3, 5, 7],
  "next_retry_at": "2026-11-19T10:00:00Z",
  "grace_until": "2026-11-25T00:00:00Z",
  "on_exhausted": "suspend"
}`,
        },
        marks: ["attempt", "schedule_days", "next_retry_at", "grace_until", "on_exhausted"],
      },
    },
    {
      id: "proration",
      kind: "case",
      edges: { charge: { flow: "request" }, sub: { rate: 3 } },
      focus: ["customer", "api", "invoices"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "upgrade sub_42 basic -> pro at 2026-11-16T00:00Z",
          body: "period 2026-11-01 .. 2026-12-01 = 30 days, 15 left\ncredit  basic 2000 x 15/30 = -1000\ncharge  pro   5000 x 15/30 = +2500\ndue now                    =  1500 USD cents\nnext invoice 2026-12-01: pro 5000",
        },
        marks: ["15 left", "credit", "charge", "due now"],
      },
    },
    {
      id: "monthend",
      kind: "case",
      edges: { charge: { rate: 4 }, scan: { rate: 3 } },
      focus: ["job", "invoices"],
      exchange: {
        edge: "scan",
        request: {
          format: "text",
          head: "sub_77 anchor 2026-01-31T00:00 +05:00, anchor_day 31",
          body: "period 1: 2026-01-31 -> 2026-02-28\nperiod 2: 2026-02-28 -> 2026-03-31\nperiod 3: 2026-03-31 -> 2026-04-30\n-- naive \"previous end + 1 month\": Mar 28, drift\n-- stored in UTC: 2026-02-27T19:00:00Z",
        },
        marks: ["anchor_day", "+05:00", "drift", "UTC"],
      },
    },
    {
      id: "webhook",
      kind: "fix",
      edges: {
        hook: { from: "provider", to: "api", flow: "ack", rate: 2, mode: "async" },
      },
      metrics: { unpaid: 5900, recovered: 71 },
      focus: ["provider", "api", "invoices"],
      exchange: {
        edge: "hook",
        request: {
          format: "json",
          head: "POST /billing/webhooks HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Signature", "***"],
          ],
          body: `{
  "event_id": "evt_9041",
  "type": "charge.succeeded",
  "charge_id": "ch_740",
  "invoice_id": "in_7190",
  "created": "2026-11-18T02:09:41Z"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Signature", "event_id", "type", "invoice_id"],
        masked: ["Signature"],
      },
    },
    {
      id: "cancel",
      kind: "fix",
      metrics: { unpaid: 4700 },
      focus: ["job", "invoices"],
      exchange: {
        edge: "scan",
        request: {
          format: "sql",
          head: "UPDATE subscriptions SET status = 'canceled'",
          body: " WHERE cancel_at_period_end = true\n   AND current_period_end <= now()\nRETURNING id;\n-- runs before the renewal query, in the same job",
        },
        response: { format: "text", head: "UPDATE 312" },
        marks: ["cancel_at_period_end", "current_period_end", "RETURNING", "UPDATE 312"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
