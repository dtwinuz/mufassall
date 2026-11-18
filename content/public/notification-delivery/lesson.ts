import { defineLesson } from "@mufassall/scene-schema";

/**
 * A business app texts login codes (OTP), "invoice received" notices and payment receipts.
 * Inline sending, then an outbox with a queue and a sender worker, provider rate limits,
 * delivery receipts, a channel fallback chain with deadlines, dedup, user preferences,
 * cost and provider failover. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "notification-delivery",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "delivered", unit: "%", better: "up" },
    { id: "dupes", unit: "/day", better: "down" },
    { id: "spend", unit: "$", better: "down" },
  ],
  steps: [
    {
      id: "inline",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [3, 3] },
        sms: { kind: "external", at: [12, 4] },
      },
      edges: {
        login: { from: "client", to: "api", rate: 3 },
        send: { from: "api", to: "sms", rate: 3 },
      },
      metrics: { p95: 320, delivered: 97, dupes: 0, spend: 410 },
      focus: ["api", "sms"],
      exchange: {
        edge: "send",
        request: {
          format: "json",
          head: "POST /v1/messages HTTP/1.1",
          headers: [
            ["Host", "sms-provider.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "to": "***",
  "sender": "BIZAPP",
  "text": "Your login code: ***. Valid 2 min.",
  "client_ref": "otp_u42_7f3a"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "message_id": "msg_90211",
  "status": "accepted",
  "parts": 1
}`,
        },
        marks: ["Authorization", "to", "sender", "client_ref", "status", "parts"],
        masked: ["Authorization", "to"],
      },
    },
    {
      id: "slow",
      kind: "problem",
      nodes: { api: { state: "slow", load: 96 }, sms: { state: "slow" } },
      edges: { send: { flow: "fail" }, login: { flow: "fail" } },
      metrics: { p95: 9400, delivered: 81 },
      focus: ["client", "api", "sms"],
      exchange: {
        edge: "send",
        request: {
          format: "text",
          head: "09:00:02 POST /auth/otp u_42: calling SMS provider",
          body: "09:00:12 provider: no answer in 10 s, timeout\n09:00:12 POST /auth/otp 504 after 10.3 s\n09:00:12 request threads busy 200/200\n09:00:13 GET /invoices 503: no free thread\n09:14:40 provider: connection refused (maintenance)",
        },
        marks: ["timeout", "504", "busy", "503", "refused"],
      },
    },
    {
      id: "outbox",
      kind: "fix",
      nodes: {
        api: { state: "ok", load: 35 },
        db: { kind: "db", at: [3, 7] },
      },
      edges: {
        send: null,
        login: { flow: "request" },
        write: { from: "api", to: "db", rate: 3 },
      },
      metrics: { p95: 140 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO otp_codes (user_id, code_hash, expires_at)\nVALUES ('u_42', '***', now() + interval '2 min');\nINSERT INTO outbox (id, event_id, channel, template,\n                    user_id, deadline_at, status)\nVALUES ('ob_5512', 'otp_u42_7f3a', 'sms', 'otp_login',\n        'u_42', now() + interval '2 min', 'new');\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT 12 ms", body: "-- the phone app gets 202 Accepted at once" },
        marks: ["code_hash", "outbox", "event_id", "deadline_at", "COMMIT"],
      },
    },
    {
      id: "worker",
      kind: "fix",
      nodes: {
        client: null,
        queue: { kind: "queue", at: [7, 5] },
        worker: { kind: "worker", at: [9, 7], load: 30 },
      },
      edges: {
        relay: { from: "db", to: "queue", rate: 3 },
        take: { from: "queue", to: "worker", rate: 3 },
        send: { from: "worker", to: "sms", rate: 3 },
      },
      metrics: { delivered: 95 },
      focus: ["queue", "worker", "sms"],
      exchange: {
        edge: "take",
        request: {
          format: "json",
          head: "notifications.sms  partition 3  offset 88120",
          body: `{
  "notification_id": "ob_5512",
  "event_id": "otp_u42_7f3a",
  "channel": "sms",
  "template": "otp_login",
  "deadline_at": "2026-11-18T09:02:02Z",
  "attempt": 1
}`,
        },
        marks: ["notification_id", "channel", "deadline_at", "attempt"],
      },
    },
    {
      id: "throttle",
      kind: "problem",
      nodes: { worker: { load: 100 }, sms: { state: "slow" } },
      edges: { send: { flow: "fail", rate: 10 }, take: { rate: 10 } },
      metrics: { delivered: 62, dupes: 120 },
      focus: ["worker", "sms"],
      exchange: {
        edge: "send",
        request: {
          format: "http",
          head: "POST /v1/messages HTTP/1.1",
          headers: [
            ["Host", "sms-provider.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [
            ["Retry-After", "2"],
            ["X-RateLimit-Limit", "50"],
            ["X-RateLimit-Remaining", "0"],
          ],
          body: `{ "error": "rate_limited" }`,
        },
        marks: ["429", "Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
        masked: ["Authorization"],
      },
    },
    {
      id: "bucket",
      kind: "fix",
      nodes: {
        worker: { load: 60 },
        sms: { state: "ok" },
        limiter: { kind: "cache", at: [6, 10] },
      },
      edges: {
        send: { flow: "request", rate: 5 },
        take: { rate: 5 },
        token: { from: "worker", to: "limiter", rate: 5 },
      },
      metrics: { delivered: 96 },
      focus: ["worker", "limiter", "sms"],
      exchange: {
        edge: "token",
        request: {
          format: "text",
          head: "EVAL token_bucket 1 bucket:sms_a rate=50 burst=50 take=1",
        },
        response: {
          format: "text",
          head: "(integer) 0",
          body: "-- no token: wait 20 ms, then ask again\n-- lane otp: own bucket, 10 of the 50 per second\n-- after a 429: pause the whole bucket for Retry-After",
        },
        marks: ["bucket:sms_a", "rate", "burst", "otp", "Retry-After"],
      },
    },
    {
      id: "dlr",
      kind: "case",
      edges: { dlr: { from: "sms", to: "api", flow: "ack", rate: 2 } },
      metrics: { delivered: 88 },
      focus: ["sms", "api"],
      exchange: {
        edge: "dlr",
        request: {
          format: "json",
          head: "POST /webhooks/sms-dlr HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Signature", "***"],
          ],
          body: `{
  "message_id": "msg_90377",
  "client_ref": "inv_rcv_8812_u77",
  "status": "UNDELIVERED",
  "error": "absent_subscriber",
  "done_at": "2026-11-18T18:01:41Z"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Signature", "message_id", "status", "error", "done_at"],
        masked: ["Signature"],
      },
    },
    {
      id: "fallback",
      kind: "fix",
      nodes: {
        push: { kind: "external", at: [10, 0] },
        email: { kind: "external", at: [12, 8] },
      },
      edges: {
        push: { from: "worker", to: "push", rate: 3 },
        mail: { from: "worker", to: "email", rate: 1 },
      },
      metrics: { delivered: 99 },
      focus: ["worker", "push", "sms", "email"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "ob_7730 invoice.received  chain: push -> sms -> email",
          body: "18:00:00 push   sent, wait 10 min for the app's ack\n18:10:00 push   no ack -> sms\n18:10:01 sms    accepted msg_91877\n18:12:30 sms    DELIVERED -> chain done, no email\n\nob_5513 otp_login  chain: push -> sms\n09:00:02 deadline 09:02:02 (the code's own expiry)\n09:01:30 sms    no DLR yet, 32 s left: no email\n09:02:02 code expired -> stop, user taps resend",
        },
        marks: ["chain", "ack", "DELIVERED", "deadline", "expired"],
      },
    },
    {
      id: "dedup",
      kind: "fix",
      nodes: { worker: { load: 55 } },
      edges: { mark: { from: "worker", to: "db", rate: 3 } },
      metrics: { dupes: 0 },
      focus: ["worker", "db"],
      exchange: {
        edge: "mark",
        request: {
          format: "sql",
          head: "INSERT INTO deliveries (event_id, channel, provider_ref)",
          body: "VALUES ('inv_rcv_8812_u77', 'sms', 'inv_rcv_8812_u77:sms')\nON CONFLICT (event_id, channel) DO NOTHING;\n-- 1 row: call the provider with this provider_ref\n-- 0 rows: another attempt already owns it, skip",
        },
        response: { format: "text", head: "INSERT 0 0", body: "-- redelivered message after a worker crash: skipped" },
        marks: ["deliveries", "event_id", "ON CONFLICT", "provider_ref", "INSERT 0 0"],
      },
    },
    {
      id: "prefs",
      kind: "fix",
      edges: { mark: { rate: 3 }, mail: { rate: 2 } },
      metrics: { spend: 330 },
      focus: ["worker", "db"],
      exchange: {
        edge: "mark",
        request: {
          format: "json",
          head: "SELECT channels, quiet_hours, tz FROM prefs WHERE user_id = 'u_77'",
          body: `{
  "user_id": "u_77",
  "channels": {
    "invoice.received": ["push", "email"],
    "payment.receipt": ["email"],
    "otp_login": ["sms"]
  },
  "quiet_hours": "22:00-08:00",
  "tz": "Asia/Tashkent"
}`,
        },
        response: {
          format: "text",
          head: "decision ob_7731 payment.receipt at 23:40 local",
          body: "email only, quiet hours: hold until 08:00\n-- otp_login ignores quiet hours: the user asked for it",
        },
        marks: ["channels", "quiet_hours", "tz", "hold"],
      },
    },
    {
      id: "failover",
      kind: "fix",
      nodes: {
        push: null,
        email: null,
        sms: { state: "down" },
        sms2: { kind: "external", at: [12, 11] },
      },
      edges: {
        send: { flow: "fail", cut: true, rate: 2 },
        backup: { from: "worker", to: "sms2", rate: 4 },
      },
      metrics: { delivered: 98, spend: 345 },
      focus: ["worker", "sms", "sms2"],
      exchange: {
        edge: "backup",
        request: {
          format: "text",
          head: "cost ob_5590 otp_login provider=sms_b",
          body: "parts=1 encoding=gsm7 price_usd=0.0310 country=UZ\nreason: sms_a error rate 41% over 2 min -> breaker open\n-- today: sms_a 0.0240/part, sms_b 0.0310/part\n-- back to sms_a after 5 healthy probes",
        },
        marks: ["provider", "parts", "encoding", "price_usd", "breaker"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
