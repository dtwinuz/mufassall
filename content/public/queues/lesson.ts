import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop sends an order email with a PDF receipt through a mail provider that accepts
 * about 100 messages a second. A sale turns 40 orders a second into 600. The queue itself is
 * the subject here: leases, retries, the dead-letter queue and backpressure.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "queues",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "backlog", unit: "", better: "down" },
    { id: "delay", unit: "s", better: "down" },
    { id: "lost", unit: "/h", better: "down" },
  ],
  steps: [
    {
      id: "direct",
      kind: "case",
      nodes: {
        buyers: { kind: "client", at: [0, 1] },
        api: { kind: "service", at: [2, 4], load: 30 },
        mail: { kind: "external", at: [12, 4] },
      },
      edges: {
        order: { from: "buyers", to: "api", rate: 3 },
        direct: { from: "api", to: "mail", rate: 3 },
      },
      metrics: { p95: 950, backlog: 0, delay: 1, lost: 0 },
      focus: ["api", "mail"],
      exchange: {
        edge: "direct",
        request: {
          format: "json",
          head: "POST /v1/send HTTP/1.1",
          headers: [
            ["Host", "mail.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "to": "u_42@example.com",
  "template": "order_paid",
  "order_id": "ord_5521"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 202 Accepted", headers: [["X-Response-Time", "820 ms"]] },
        marks: ["Authorization", "template", "X-Response-Time"],
        masked: ["Authorization"],
      },
    },
    {
      id: "spike",
      kind: "problem",
      nodes: {
        api: { state: "slow", load: 100 },
        mail: { state: "slow" },
      },
      edges: {
        order: { rate: 12 },
        direct: { flow: "fail", rate: 12 },
      },
      metrics: { p95: 9000, lost: 1800 },
      focus: ["api", "mail"],
      exchange: {
        edge: "direct",
        request: { format: "http", head: "POST /v1/send HTTP/1.1", headers: [["Authorization", "***"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [["Retry-After", "1"]],
          body: `{
  "error": "rate_limited",
  "limit_per_second": 100
}`,
        },
        marks: ["429", "Retry-After", "limit_per_second"],
        masked: ["Authorization"],
      },
    },
    {
      id: "queue",
      kind: "fix",
      nodes: {
        api: { state: "ok", load: 20 },
        mail: { state: "ok" },
        queue: { kind: "queue", at: [5, 4], load: 60 },
        w1: { kind: "worker", at: [9, 2], load: 100 },
      },
      edges: {
        direct: null,
        publish: { from: "api", to: "queue", rate: 12 },
        take1: { from: "queue", to: "w1", rate: 3 },
        send1: { from: "w1", to: "mail", rate: 3 },
      },
      metrics: { p95: 35, backlog: 42000, delay: 840, lost: 0 },
      focus: ["api", "queue", "w1"],
      exchange: {
        edge: "publish",
        request: {
          format: "json",
          head: "SEND emails",
          headers: [
            ["message-id", "m_8812"],
            ["persistent", "true"],
          ],
          body: `{
  "order_id": "ord_5521",
  "template": "order_paid"
}`,
        },
        response: { format: "text", head: "OK queued, depth 42000" },
        marks: ["persistent", "order_id", "depth"],
      },
    },
    {
      id: "scale-out",
      kind: "fix",
      nodes: {
        w2: { kind: "worker", at: [9, 6], load: 95 },
        w1: { load: 95 },
        queue: { load: 30 },
      },
      edges: {
        take2: { from: "queue", to: "w2", rate: 3 },
        send2: { from: "w2", to: "mail", rate: 3 },
      },
      metrics: { backlog: 9000, delay: 95 },
      focus: ["queue", "w1", "w2"],
      exchange: {
        edge: "take2",
        request: {
          format: "text",
          head: "autoscaler: queue emails",
          body: "backlog=42000 oldest_age=840s\nworkers 1 -> 2 (each ~50/s, provider cap 100/s)",
        },
        marks: ["backlog", "oldest_age", "provider cap"],
      },
    },
    {
      id: "crash",
      kind: "case",
      nodes: { w2: { state: "down", load: 0 } },
      edges: { take2: { cut: true }, send2: { rate: 0 } },
      focus: ["queue", "w1", "w2"],
      exchange: {
        edge: "take1",
        request: {
          format: "text",
          head: "RECEIVE emails",
          body: "message_id: m_8812\nreceive_count: 2\nvisibility_timeout: 30s\n-- w2 took it and died; 30 s later it is back",
        },
        response: { format: "text", head: "DELETE m_8812", body: "-- the ack: sent only after the email went out" },
        marks: ["receive_count", "visibility_timeout", "DELETE"],
      },
    },
    {
      id: "lease-expired",
      kind: "problem",
      nodes: { w2: { state: "ok", load: 95 } },
      edges: { take2: { cut: false, flow: "dup" }, send2: { rate: 3, flow: "dup" } },
      focus: ["w1", "w2", "mail"],
      exchange: {
        edge: "take2",
        request: {
          format: "text",
          head: "10:02:00 w1 got m_9120 (receipt: 212 pages)",
          body: "10:02:30 m_9120 visible again\n10:02:31 w2 got m_9120 receive_count=2\n10:02:45 w1 sent m_9120\n10:02:58 w2 sent m_9120",
        },
        marks: ["212 pages", "visible again", "receive_count"],
      },
    },
    {
      id: "heartbeat",
      kind: "fix",
      edges: { take2: { flow: "request" }, send2: { flow: "request" } },
      focus: ["queue", "w1"],
      exchange: {
        edge: "take1",
        request: {
          format: "text",
          head: "EXTEND emails m_9120 visibility_timeout=60s",
          body: "-- sent every 20 s while the PDF renders",
        },
        response: { format: "text", head: "OK until 10:03:20" },
        marks: ["EXTEND", "visibility_timeout", "every 20 s"],
      },
    },
    {
      id: "retry-storm",
      kind: "problem",
      nodes: {
        mail: { state: "down" },
        w1: { load: 100 },
        w2: { load: 100 },
      },
      edges: {
        send1: { flow: "retry", rate: 12 },
        send2: { flow: "retry", rate: 12 },
      },
      metrics: { backlog: 120000, delay: 900 },
      focus: ["w1", "w2", "mail"],
      exchange: {
        edge: "send1",
        request: { format: "http", head: "POST /v1/send HTTP/1.1", headers: [["Authorization", "***"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "60"]],
          body: "w1: attempt 38 for m_8812 in the last minute",
        },
        marks: ["503", "Retry-After", "attempt 38"],
        masked: ["Authorization"],
      },
    },
    {
      id: "backoff",
      kind: "fix",
      nodes: {
        mail: { state: "ok" },
        w1: { load: 40 },
        w2: { load: 40 },
      },
      edges: {
        send1: { flow: "request", rate: 3 },
        send2: { flow: "request", rate: 3 },
      },
      metrics: { backlog: 30000, delay: 300 },
      focus: ["w1", "mail"],
      exchange: {
        edge: "take1",
        request: {
          format: "text",
          head: "NACK emails m_8812 delay=86s",
          body: "-- attempt 4: 10 s x 2^3 = 80 s, jitter +6 s\n-- next: 160 s, 320 s, then the cap of 15 min",
        },
        marks: ["NACK", "delay", "jitter"],
      },
    },
    {
      id: "dlq",
      kind: "fix",
      nodes: { dlq: { kind: "queue", at: [6, 8] } },
      edges: { dead: { from: "queue", to: "dlq", flow: "fail", rate: 1 } },
      focus: ["queue", "dlq"],
      exchange: {
        edge: "dead",
        request: {
          format: "json",
          head: "SET emails redrive_policy",
          body: `{
  "max_receive_count": 5,
  "dead_letter_queue": "emails-dlq"
}`,
        },
        response: {
          format: "text",
          head: "m_7731 moved to emails-dlq after 5 receives",
          body: "last error: template order_paid_v2 not found",
        },
        marks: ["max_receive_count", "dead_letter_queue", "moved", "last error"],
      },
    },
    {
      id: "backpressure",
      kind: "fix",
      nodes: { campaign: { kind: "worker", at: [2, 8], load: 50 } },
      edges: { flood: { from: "campaign", to: "queue", rate: 4 } },
      metrics: { backlog: 20000, delay: 60 },
      focus: ["campaign", "queue"],
      exchange: {
        edge: "flood",
        request: {
          format: "text",
          head: "campaign: 2000000 newsletter emails to publish",
          body: "campaign: emails depth=20400 > 20000, pause 30s\ncampaign: emails depth=14100, resume",
        },
        marks: ["depth", "pause", "resume"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
