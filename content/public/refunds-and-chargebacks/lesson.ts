import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online shop takes card payments through a provider and gives money back in two ways: the
 * shop refunds on its own (full or partial), or the cardholder's bank forces a chargeback. The
 * story: a refund edited into the payment row, a double click that refunds twice, two agents
 * refunding more than was captured, provider statuses that arrive later by webhook, a dispute
 * with an evidence deadline, held funds and a daily match against the provider's report.
 * Amounts are integer minor units (cents). Numbers are a model scenario.
 */
export default defineLesson({
  slug: "refunds-and-chargebacks",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "dups", unit: "/mo", better: "down" },
    { id: "over", unit: "/mo", better: "down" },
    { id: "stuck", unit: "", better: "down" },
    { id: "cblost", unit: "%", better: "down" },
    { id: "drift", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "captured",
      kind: "case",
      nodes: {
        support: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [4, 9] },
        provider: { kind: "external", at: [9, 4] },
      },
      edges: {
        ask: { from: "support", to: "api", rate: 2, mode: "call" },
        write: { from: "api", to: "db", rate: 2 },
        refund: { from: "api", to: "provider", rate: 2, mode: "call" },
      },
      metrics: { dups: 0, over: 0, stuck: 0, cblost: 0, drift: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT id, status, captured_minor FROM payments WHERE id = 'pay_7731';",
        },
        response: {
          format: "text",
          head: "pay_7731 | captured | 450000",
          body: "-- order ord_5120: 3 items, 4 500.00 paid by card **** 4417\n-- the customer returns 1 item of 1 500.00 and asks for the money back",
        },
        marks: ["captured_minor", "captured", "**** 4417", "1 500.00"],
      },
    },
    {
      id: "edit",
      kind: "problem",
      metrics: { drift: 38 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE payments",
          body: "   SET captured_minor = captured_minor - 150000,\n       status = 'partially_refunded'\n WHERE id = 'pay_7731';\n-- 4 500.00 became 3 000.00: last month's revenue report changes\n-- the provider's report still shows +4 500.00 and -1 500.00",
        },
        marks: ["captured_minor", "status", "revenue report", "-1 500.00"],
      },
    },
    {
      id: "entry",
      kind: "fix",
      metrics: { drift: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO refunds (id, payment_id, amount_minor, status, reason)\n  VALUES ('rf_2208', 'pay_7731', 150000, 'pending', 'item_returned');\nINSERT INTO journal (entry_id, account, amount_minor, ref) VALUES\n  ('je_9411', 'revenue',          -150000, 'rf_2208'),\n  ('je_9411', 'refunds_payable',  +150000, 'rf_2208');\nCOMMIT;\n-- pay_7731 is never touched: captured 450000 stays a fact",
        },
        marks: ["refunds", "amount_minor", "pending", "journal", "never touched"],
      },
    },
    {
      id: "twice",
      kind: "problem",
      edges: { refund: { flow: "dup" } },
      metrics: { dups: 14 },
      focus: ["support", "api", "provider"],
      exchange: {
        edge: "refund",
        request: {
          format: "text",
          head: "14:02:10.0  POST /v1/refunds  payment=pay_7731  amount=150000",
          body: "14:02:20.0  timeout after 10 s, the agent clicks \"Refund\" again\n14:02:20.4  POST /v1/refunds  payment=pay_7731  amount=150000\n14:02:21.1  provider: re_51A ok, re_51B ok\n-- the customer gets 3 000.00 back for one item of 1 500.00",
        },
        marks: ["timeout", "again", "re_51A", "3 000.00"],
      },
    },
    {
      id: "idem",
      kind: "fix",
      edges: { refund: { flow: "request" } },
      metrics: { dups: 0 },
      focus: ["api", "provider"],
      exchange: {
        edge: "refund",
        request: {
          format: "http",
          head: "POST /v1/refunds HTTP/1.1",
          headers: [
            ["Authorization", "***"],
            ["Idempotency-Key", "rf_2208"],
          ],
          body: "payment=pay_7731&amount=150000&currency=USD",
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "id": "re_51A",
  "status": "pending",
  "amount": 150000
}`,
        },
        marks: ["Idempotency-Key", "Idempotent-Replayed", "id", "status"],
        masked: ["Authorization"],
      },
    },
    {
      id: "race",
      kind: "problem",
      nodes: { support2: { kind: "client", at: [0, 8] } },
      edges: { ask2: { from: "support2", to: "api", rate: 2, mode: "call" } },
      metrics: { over: 6 },
      focus: ["support", "support2", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "captured 450000, already refunded 150000, left 300000",
          body: "agent A  SELECT sum(amount) ... -> 150000   ok to refund 200000\nagent B  SELECT sum(amount) ... -> 150000   ok to refund 200000\nagent A  INSERT refund 200000   COMMIT\nagent B  INSERT refund 200000   COMMIT\n-- refunded 550000 of 450000 captured: 100000 paid from the shop's pocket",
        },
        marks: ["left 300000", "SELECT sum", "COMMIT", "550000"],
      },
    },
    {
      id: "guard",
      kind: "fix",
      metrics: { over: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE payments",
          body: "   SET refunded_minor = refunded_minor + 200000\n WHERE id = 'pay_7731'\n   AND refunded_minor + 200000 <= captured_minor\nRETURNING refunded_minor;\n-- then INSERT the refund row in the same transaction",
        },
        response: {
          format: "text",
          head: "agent A: UPDATE 1  refunded_minor = 350000",
          body: "agent B: waits for A's row lock, re-checks: 550000 > 450000\nagent B: UPDATE 0  -> \"only 100000 left to refund\"",
        },
        marks: ["refunded_minor", "<= captured_minor", "UPDATE 1", "row lock", "UPDATE 0"],
      },
    },
    {
      id: "async",
      kind: "fix",
      edges: { hook: { from: "provider", to: "api", flow: "ack", rate: 1, mode: "async" } },
      metrics: { stuck: 0 },
      focus: ["provider", "api", "db"],
      exchange: {
        edge: "hook",
        request: {
          format: "json",
          head: "POST /webhooks/provider HTTP/1.1",
          headers: [["Signature", "***"]],
          body: `{
  "event_id": "evt_88Q2",
  "type": "refund.failed",
  "refund": "re_51A",
  "failure_reason": "card_closed"
}`,
        },
        response: { format: "text", head: "HTTP/1.1 200 OK  (stored, applied in 40 ms)" },
        marks: ["event_id", "type", "refund", "failure_reason"],
        masked: ["Signature"],
      },
    },
    {
      id: "dispute",
      kind: "problem",
      nodes: { issuer: { kind: "external", at: [12, 1] } },
      edges: { cb: { from: "issuer", to: "provider", flow: "fail", rate: 1, mode: "async" } },
      metrics: { cblost: 71 },
      focus: ["issuer", "provider", "api"],
      exchange: {
        edge: "cb",
        request: {
          format: "json",
          head: "dispute.created  dp_3307",
          body: `{
  "payment": "pay_9020",
  "pan": "***",
  "reason": "product_not_received",
  "amount": 450000,
  "fee": 1500,
  "evidence_due_by": "2026-11-25T23:59:59Z"
}`,
        },
        marks: ["reason", "amount", "fee", "evidence_due_by", "pan"],
        masked: ["pan"],
      },
    },
    {
      id: "evidence",
      kind: "fix",
      edges: { cb: { flow: "request" } },
      metrics: { cblost: 24 },
      focus: ["api", "db", "provider"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;  -- dispute.created dp_3307",
          body: "INSERT INTO disputes (id, payment_id, status, due_by)\n  VALUES ('dp_3307', 'pay_9020', 'needs_response', '2026-11-25');\nINSERT INTO journal (entry_id, account, amount_minor, ref) VALUES\n  ('je_9502', 'disputes_held', +451500, 'dp_3307'),\n  ('je_9502', 'merchant_cash', -451500, 'dp_3307');\nCOMMIT;\n-- day 1: task \"send tracking + delivery photo\", day 5: alert if still empty\n-- won: post the reverse entry; lost: move disputes_held to losses",
        },
        marks: ["needs_response", "due_by", "disputes_held", "day 5", "won", "lost"],
      },
    },
    {
      id: "report",
      kind: "fix",
      nodes: { recon: { kind: "worker", at: [9, 9] } },
      edges: {
        fetch: { from: "recon", to: "provider", rate: 1 },
        match: { from: "recon", to: "db", rate: 1 },
      },
      metrics: { drift: 0 },
      focus: ["recon", "provider", "db"],
      exchange: {
        edge: "match",
        request: {
          format: "text",
          head: "06:00  provider report 2026-11-18: 412 refunds, 9 disputes",
          body: "re_51A   -150000  failed      ours: failed       ok\nre_60C   -80000   succeeded   ours: pending      fix: missed webhook\nre_61F   -25000   succeeded   ours: (none)       review: refunded in the provider panel\ndp_3307  -451500  open        ours: needs_response ok\n-- 2 of 421 lines need a hand, the rest match by provider id",
        },
        marks: ["provider report", "missed webhook", "provider panel", "421"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "hook-twice",
      from: "async",
      steps: [
        {
          id: "hook-mess",
          kind: "problem",
          edges: { hook: { flow: "dup", rate: 3 } },
          metrics: { stuck: 1, dups: 1 },
          focus: ["provider", "api", "db"],
          exchange: {
            edge: "hook",
            request: {
              format: "text",
              head: "10:02:05  evt_90A  refund.succeeded  re_70D",
              body: "10:02:07  evt_89Z  refund.pending    re_70D   (a retry from 10:00)\n10:02:09  evt_90A  refund.succeeded  re_70D   (the same event again)\n-- naive handler: status = event status, then post the ledger entry\n-- re_70D shows \"pending\" forever, and its entry is posted twice",
            },
            marks: ["refund.succeeded", "a retry", "the same event", "posted twice"],
          },
        },
        {
          id: "hook-order",
          kind: "fix",
          edges: { hook: { flow: "ack", rate: 1 } },
          metrics: { stuck: 0, dups: 0 },
          focus: ["api", "db"],
          exchange: {
            edge: "write",
            request: {
              format: "sql",
              head: "BEGIN;",
              body: "INSERT INTO processed_events (event_id) VALUES ('evt_90A')\n  ON CONFLICT DO NOTHING;            -- 0 rows: ack and stop\nUPDATE refunds SET status = 'succeeded'\n WHERE provider_id = 're_70D' AND status = 'pending';\n-- 1 row: post the entry; 0 rows: already final, post nothing\nCOMMIT;",
            },
            response: {
              format: "text",
              head: "evt_89Z pending after succeeded: UPDATE 0, ignored",
            },
            marks: ["processed_events", "ON CONFLICT", "status = 'pending'", "1 row", "UPDATE 0"],
          },
        },
      ],
    },
  ],
});
