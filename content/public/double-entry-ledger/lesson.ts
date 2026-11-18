import { defineLesson } from "@mufassall/scene-schema";

/**
 * A marketplace wallet: buyers top up, pay for orders, sellers get paid out, the platform
 * keeps a fee. It starts with a `balance` column updated in place and moves to a double-entry
 * ledger: journal entries whose postings sum to zero, derived balances, idempotency keys,
 * holds, reversals, one currency per leg and a daily trial balance. Amounts are integer
 * minor units (cents). Numbers are a model scenario.
 */
export default defineLesson({
  slug: "double-entry-ledger",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "unexplained", unit: "$", better: "down" },
    { id: "lost", unit: "/day", better: "down" },
    { id: "dupes", unit: "/day", better: "down" },
    { id: "balance-ms", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "column",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 2] },
        api: { kind: "service", at: [3, 4] },
        wallets: { kind: "db", at: [6, 7] },
      },
      edges: {
        pay: { from: "app", to: "api", rate: 2 },
        write: { from: "api", to: "wallets", rate: 2 },
      },
      metrics: { unexplained: 0, lost: 0, dupes: 0, "balance-ms": 2 },
      focus: ["api", "wallets"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT balance_minor FROM wallets WHERE user_id = 'u_42';",
          body: "-- 12000: the API subtracts the 4500 order in code\nUPDATE wallets\n   SET balance_minor = 7500\n WHERE user_id = 'u_42';",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["balance_minor", "SET", "UPDATE 1"],
      },
    },
    {
      id: "lost",
      kind: "problem",
      nodes: { web: { kind: "client", at: [0, 6] }, wallets: { state: "slow" } },
      edges: {
        pay2: { from: "web", to: "api", rate: 2 },
        write: { flow: "dup", rate: 4 },
      },
      metrics: { unexplained: 2480, lost: 37 },
      focus: ["app", "web", "wallets"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "12:00:01.204 tx A  read balance_minor=12000 (order 4500)",
          body: "12:00:01.209 tx B  read balance_minor=12000 (order 3000)\n12:00:01.231 tx A  write 7500\n12:00:01.236 tx B  write 9000\n-- two orders paid, 7500 taken, wallet shows 9000\n-- support: \"where did the 45.00 go?\" no history",
        },
        marks: ["tx A", "tx B", "write 9000", "no history"],
      },
    },
    {
      id: "journal",
      kind: "fix",
      nodes: {
        web: null,
        wallets: null,
        ledger: { kind: "db", at: [6, 7] },
      },
      edges: {
        post: { from: "api", to: "ledger", rate: 2 },
      },
      metrics: { lost: 0, unexplained: 0, "balance-ms": 180 },
      focus: ["api", "ledger"],
      exchange: {
        edge: "post",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO journal_entries (id, kind, ref)\nVALUES ('je_9001', 'order_paid', 'ord_5120');\nINSERT INTO postings (entry_id, account, amount_minor, currency)\nVALUES ('je_9001', 'wallet:u_42',    -4500, 'USD'),\n       ('je_9001', 'seller:s_7',      4050, 'USD'),\n       ('je_9001', 'platform:fees',    450, 'USD');\n-- deferred check: SUM(amount_minor) per entry = 0\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT" },
        marks: ["BEGIN", "journal_entries", "postings", "account", "amount_minor", "COMMIT"],
      },
    },
    {
      id: "derived",
      kind: "fix",
      nodes: { balances: { kind: "db", at: [7, 2] } },
      edges: { cache: { from: "api", to: "balances", rate: 2 } },
      metrics: { "balance-ms": 3 },
      focus: ["ledger", "balances"],
      exchange: {
        edge: "cache",
        request: {
          format: "sql",
          head: "UPDATE account_balances",
          body: "   SET balance_minor = balance_minor - 4500,\n       version = version + 1\n WHERE account = 'wallet:u_42' AND version = 41;\n-- same transaction as the postings\n-- audit: SELECT SUM(amount_minor) FROM postings\n--        WHERE account = 'wallet:u_42'  -> 7500",
        },
        response: { format: "text", head: "UPDATE 1", body: "balance_minor = 7500, version = 42" },
        marks: ["account_balances", "version", "SUM", "UPDATE 1"],
      },
    },
    {
      id: "retry",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { pay: { flow: "dup", rate: 4 }, post: { flow: "dup" } },
      metrics: { dupes: 14, unexplained: 610 },
      focus: ["app", "api", "ledger"],
      exchange: {
        edge: "pay",
        request: {
          format: "text",
          head: "14:02:10 POST /v1/orders/ord_5133/pay  -> no answer in 5 s",
          body: "14:02:15 app retries the same tap\n14:02:15 je_9107 order_paid ord_5133 -1990 wallet:u_42\n14:02:16 je_9108 order_paid ord_5133 -1990 wallet:u_42\n-- both entries balance, the buyer paid twice",
        },
        marks: ["retries", "je_9107", "je_9108", "paid twice"],
      },
    },
    {
      id: "idempotent",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { pay: { flow: "request", rate: 2 }, post: { flow: "request" } },
      metrics: { dupes: 0, unexplained: 0 },
      focus: ["app", "api"],
      exchange: {
        edge: "pay",
        request: {
          format: "http",
          head: "POST /v1/orders/ord_5133/pay HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
            ["Idempotency-Key", "pay-ord_5133"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "entry_id": "je_9107",
  "status": "posted",
  "amount_minor": -1990
}`,
        },
        marks: ["Idempotency-Key", "Idempotent-Replayed", "entry_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "hold",
      kind: "fix",
      nodes: { payout: { kind: "worker", at: [10, 5] } },
      edges: { capture: { from: "payout", to: "ledger", rate: 1 } },
      focus: ["app", "api", "payout"],
      exchange: {
        edge: "pay",
        request: {
          format: "http",
          head: "GET /v1/wallets/u_58/balance HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "ledger_minor": 31000,
  "held_minor": 12900,
  "available_minor": 18100,
  "holds": [{
    "hold_id": "h_77",
    "order_id": "ord_5140",
    "expires_at": "2026-11-25T00:00:00Z"
  }]
}`,
        },
        marks: ["ledger_minor", "held_minor", "available_minor", "expires_at"],
        masked: ["Authorization"],
      },
    },
    {
      id: "reversal",
      kind: "fix",
      nodes: { support: { kind: "actor", at: [0, 8] } },
      edges: { refund: { from: "support", to: "api", rate: 1 } },
      focus: ["support", "api", "ledger"],
      exchange: {
        edge: "post",
        request: {
          format: "sql",
          head: "INSERT INTO journal_entries (id, kind, ref, reverses)",
          body: "VALUES ('je_9230', 'refund', 'ord_5120', 'je_9001');\nINSERT INTO postings (entry_id, account, amount_minor, currency)\nVALUES ('je_9230', 'wallet:u_42',      4500, 'USD'),\n       ('je_9230', 'seller:s_7',      -4050, 'USD'),\n       ('je_9230', 'platform:fees',    -450, 'USD');\n-- je_9001 is never updated or deleted",
        },
        response: { format: "text", head: "INSERT 0 3" },
        marks: ["reverses", "refund", "never updated", "INSERT 0 3"],
      },
    },
    {
      id: "currency",
      kind: "fix",
      nodes: { rates: { kind: "external", at: [4, 0] } },
      edges: { fx: { from: "api", to: "rates", rate: 1 } },
      metrics: { unexplained: 0 },
      focus: ["api", "rates", "ledger"],
      exchange: {
        edge: "post",
        request: {
          format: "sql",
          head: "INSERT INTO postings (entry_id, account, amount_minor, currency)",
          body: "VALUES ('je_9301', 'card:in',     -10000, 'EUR'),\n       ('je_9301', 'fx:EUR',       10000, 'EUR'),\n       ('je_9301', 'fx:USD',      -10850, 'USD'),\n       ('je_9301', 'wallet:u_42',  10850, 'USD');\n-- 100.00 EUR in, rate 1.0850 stored on the entry\n-- sums: EUR 0, USD 0 (never EUR + USD)",
        },
        response: { format: "text", head: "COMMIT" },
        marks: ["EUR", "fx:EUR", "fx:USD", "rate", "sums"],
      },
    },
    {
      id: "trial",
      kind: "fix",
      nodes: {
        checker: { kind: "worker", at: [10, 8] },
        pager: { kind: "external", at: [12, 8] },
      },
      edges: {
        sum: { from: "checker", to: "ledger", rate: 1 },
        alert: { from: "checker", to: "pager", flow: "fail", rate: 1 },
      },
      metrics: { unexplained: 0 },
      focus: ["checker", "ledger", "pager"],
      exchange: {
        edge: "sum",
        request: {
          format: "sql",
          head: "SELECT currency, SUM(amount_minor) AS total",
          body: "  FROM postings\n WHERE created_at < '2026-11-18'\n GROUP BY currency;\n-- then: cached balance = SUM(postings) per account",
        },
        response: {
          format: "text",
          head: "trial balance 2026-11-17",
          body: "USD  total 0   (2 418 552 postings)\nEUR  total 0   (  311 904 postings)\ncache drift: 1 account  wallet:u_918  cache 5200, sum 5000\n-> page on-call, rebuild the cache from postings",
        },
        marks: ["GROUP BY", "total 0", "cache drift", "on-call"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
