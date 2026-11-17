import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop records card payments from the provider's synchronous answers and callbacks, then
 * checks its ledger every morning against the provider's settlement report (T+1).
 * Matching, mismatch classes, safe auto-fixes, a manual review queue, day-end totals and
 * idempotent re-runs. Amounts are integer minor units (cents). Numbers are a model scenario.
 */
export default defineLesson({
  slug: "reconciliation",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "mismatches", unit: "/day", better: "down" },
    { id: "unmatched", unit: "$", better: "down" },
    { id: "autofix", unit: "%", better: "up" },
    { id: "review", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "record",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [3, 4] },
        provider: { kind: "external", at: [6, 1] },
        ledger: { kind: "db", at: [6, 7] },
      },
      edges: {
        pay: { from: "client", to: "api", rate: 3 },
        charge: { from: "api", to: "provider", rate: 3 },
        callback: { from: "provider", to: "api", flow: "ack", rate: 3 },
        write: { from: "api", to: "ledger", rate: 3 },
      },
      metrics: { mismatches: 0, unmatched: 0, autofix: 0, review: 0 },
      focus: ["api", "provider", "ledger"],
      exchange: {
        edge: "callback",
        request: {
          format: "json",
          head: "POST /payments/callback HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Signature", "***"],
          ],
          body: `{
  "event": "charge.succeeded",
  "provider_txn_id": "ptx_8812",
  "order_id": "ord_3301",
  "amount_minor": 129000,
  "currency": "USD"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Signature", "provider_txn_id", "amount_minor", "currency"],
        masked: ["Signature"],
      },
    },
    {
      id: "drift",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { callback: { flow: "fail", cut: true }, charge: { flow: "fail" } },
      metrics: { mismatches: 34, unmatched: 1840 },
      focus: ["api", "provider"],
      exchange: {
        edge: "charge",
        request: {
          format: "text",
          head: "10:20:31 POST /v1/charges ord_3307 amount_minor=4500",
          body: "10:20:41 no answer in 10 s -> timeout\n10:20:41 ledger: ord_3307 status=failed\n10:20:42 provider: ptx_8813 charged, callback sent\n10:20:42 callback lost: api restarting, 502",
        },
        marks: ["timeout", "failed", "charged", "lost"],
      },
    },
    {
      id: "settlement",
      kind: "fix",
      nodes: {
        client: null,
        api: { state: "ok" },
        files: { kind: "storage", at: [10, 1] },
      },
      edges: {
        callback: { flow: "ack", cut: false },
        charge: { flow: "request" },
        report: { from: "provider", to: "files", rate: 1 },
      },
      focus: ["provider", "files"],
      exchange: {
        edge: "report",
        request: {
          format: "text",
          head: "settlement_2026-11-17.csv (T+1, ready at 06:00 UTC)",
          body: "provider_txn_id,type,amount_minor,fee_minor,currency,card,settled_at\nptx_8812,charge,129000,1935,USD,***,2026-11-17T09:14:03Z\nptx_8813,charge,4500,68,USD,***,2026-11-17T10:20:42Z\nptx_8790,charge,12900,194,USD,***,2026-11-17T08:02:11Z\nptx_8640,refund,-25000,0,USD,***,2026-11-17T15:02:10Z",
        },
        marks: ["T+1", "provider_txn_id", "amount_minor", "fee_minor", "card", "refund"],
      },
    },
    {
      id: "match",
      kind: "fix",
      nodes: { recon: { kind: "worker", at: [10, 5] } },
      edges: {
        load: { from: "files", to: "recon", rate: 2 },
        match: { from: "recon", to: "ledger", rate: 2 },
      },
      focus: ["files", "recon", "ledger"],
      exchange: {
        edge: "match",
        request: {
          format: "sql",
          head: "SELECT s.provider_txn_id, s.amount_minor AS theirs,",
          body: "       l.amount_minor AS ours, l.status\nFROM settlement_lines s\nFULL OUTER JOIN ledger l\n  ON l.provider_txn_id = s.provider_txn_id\n AND l.currency = s.currency\nWHERE s.report_date = '2026-11-17'\n   OR (l.created_at >= '2026-11-16 22:00'\n   AND l.created_at <  '2026-11-18 02:00');",
        },
        response: {
          format: "text",
          head: "48 202 rows",
          body: "ptx_8812 | 129000 | 129000 | paid\nptx_8813 |   4500 |   NULL | NULL\nptx_8790 |  12900 | 129000 | paid",
        },
        marks: ["FULL OUTER JOIN", "provider_txn_id", "currency", "created_at", "NULL"],
      },
    },
    {
      id: "classes",
      kind: "case",
      nodes: { ledger: { state: "slow" } },
      edges: { match: { flow: "fail" } },
      metrics: { mismatches: 34 },
      focus: ["recon", "ledger"],
      exchange: {
        edge: "match",
        request: {
          format: "text",
          head: "recon 2026-11-17: 48 198 provider lines, 48 183 ledger rows",
          body: "matched           48 170\nmissing_ours          23   charged, we say failed or pending\nmissing_theirs         6   we say paid, not in the report\namount_differs         3   same id, different amount\nduplicate              2   two ledger rows for one ptx",
        },
        marks: ["missing_ours", "missing_theirs", "amount_differs", "duplicate"],
      },
    },
    {
      id: "autofix",
      kind: "fix",
      nodes: { ledger: { state: "ok" } },
      edges: {
        match: { flow: "request" },
        status: { from: "recon", to: "provider", rate: 1 },
      },
      metrics: { autofix: 68, unmatched: 1450 },
      focus: ["recon", "provider", "ledger"],
      exchange: {
        edge: "status",
        request: {
          format: "http",
          head: "GET /v1/payments/ptx_8813 HTTP/1.1",
          headers: [
            ["Host", "provider.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "ptx_8813",
  "status": "succeeded",
  "amount_minor": 4500,
  "currency": "USD",
  "refunded_minor": 0
}`,
        },
        marks: ["Authorization", "status", "amount_minor", "refunded_minor"],
        masked: ["Authorization"],
      },
    },
    {
      id: "review",
      kind: "fix",
      nodes: {
        review: { kind: "queue", at: [12, 9] },
        analyst: { kind: "actor", at: [9, 11] },
      },
      edges: {
        enqueue: { from: "recon", to: "review", rate: 1 },
        assign: { from: "review", to: "analyst", rate: 1 },
      },
      metrics: { review: 11 },
      focus: ["recon", "review", "analyst"],
      exchange: {
        edge: "enqueue",
        request: {
          format: "json",
          head: "review_case (new)",
          body: `{
  "case_id": "rc_20261117_ptx_8790",
  "class": "amount_differs",
  "provider_txn_id": "ptx_8790",
  "ours_minor": 129000,
  "theirs_minor": 12900,
  "currency": "USD",
  "sla_due": "2026-11-19T18:00:00Z",
  "assignee": null
}`,
        },
        marks: ["case_id", "class", "ours_minor", "theirs_minor", "sla_due"],
      },
    },
    {
      id: "totals",
      kind: "fix",
      nodes: { pager: { kind: "external", at: [12, 3] } },
      edges: { alert: { from: "recon", to: "pager", flow: "fail", rate: 1 } },
      metrics: { mismatches: 35, unmatched: 1950 },
      focus: ["recon", "pager"],
      exchange: {
        edge: "alert",
        request: {
          format: "text",
          head: "ALERT recon.totals day=2026-11-17",
          body: "currency  provider_net  ledger_net  open_cases  unexplained\nUSD          620431850   620547950      116100            0\nEUR           81220400    81170400           0        50000\n-- EUR is 500.00 short with no case behind it: page on-call",
        },
        marks: ["provider_net", "open_cases", "unexplained", "on-call"],
      },
    },
    {
      id: "rerun",
      kind: "problem",
      nodes: { ledger: { state: "slow" } },
      edges: { match: { flow: "dup", rate: 3 }, enqueue: { flow: "dup" } },
      metrics: { review: 22, unmatched: 1995 },
      focus: ["files", "recon", "ledger"],
      exchange: {
        edge: "match",
        request: {
          format: "text",
          head: "06:40 provider re-sent settlement_2026-11-17.csv (v2)",
          body: "06:41 recon day=2026-11-17 run #2\n06:41 ord_3307 adjust +4500 USD  (already done in run #1)\n06:41 review: 11 new cases, 11 copies of open ones\n-- ledger now says ord_3307 was paid twice",
        },
        marks: ["v2", "run #2", "adjust", "copies"],
      },
    },
    {
      id: "idempotent",
      kind: "fix",
      nodes: { ledger: { state: "ok" } },
      edges: { match: { flow: "request", rate: 2 }, enqueue: { flow: "request" } },
      metrics: { review: 11, unmatched: 1950 },
      focus: ["recon", "ledger", "review"],
      exchange: {
        edge: "match",
        request: {
          format: "sql",
          head: "INSERT INTO recon_fixes (report_date, provider_txn_id, action)",
          body: "VALUES ('2026-11-17', 'ptx_8813', 'mark_paid')\nON CONFLICT (report_date, provider_txn_id, action)\nDO NOTHING;\n-- 1 row: apply the fix in the same transaction\nUPDATE ledger SET status = 'paid'\n WHERE provider_txn_id = 'ptx_8813'\n   AND status IN ('pending', 'failed');",
        },
        response: { format: "text", head: "INSERT 0 0", body: "-- run #2: fix already recorded, nothing changed" },
        marks: ["recon_fixes", "ON CONFLICT", "status IN", "INSERT 0 0"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
