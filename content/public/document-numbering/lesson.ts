import { defineLesson } from "@mufassall/scene-schema";

/**
 * An invoicing service must number issued invoices without gaps and without repeats, per series
 * and per year, because the rules of many countries say so and an auditor checks it. The story:
 * a database sequence leaves gaps, MAX()+1 gives duplicates, a counter row taken with
 * UPDATE ... RETURNING in the finalize transaction fixes both and serializes writers, the lock is
 * kept short, cancelled invoices keep their number, branches get their own series and the year
 * rolls over in the company's legal time zone. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "document-numbering",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "gaps", unit: "/yr", better: "down" },
    { id: "dups", unit: "/yr", better: "down" },
    { id: "tps", unit: "/s", better: "up" },
    { id: "wait", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "issue",
      kind: "case",
      nodes: {
        clerk: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [4, 9] },
      },
      edges: {
        finalize: { from: "clerk", to: "api", rate: 2, mode: "call" },
        write: { from: "api", to: "db", rate: 2 },
      },
      metrics: { gaps: 0, dups: 0, tps: 900, wait: 4 },
      focus: ["clerk", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO invoices (id, number, status, buyer_id)",
          body: "VALUES (gen_random_uuid(),\n        'INV-2026-' || lpad(nextval('invoice_no')::text, 6, '0'),\n        'draft', 'b_310');\n-- the number is taken the moment a draft is created",
        },
        response: { format: "text", head: "INSERT 0 1   number = INV-2026-000481" },
        marks: ["number", "nextval", "draft", "INV-2026-000481"],
      },
    },
    {
      id: "gaps",
      kind: "problem",
      nodes: {
        export: { kind: "worker", at: [9, 9] },
        auditor: { kind: "external", at: [9, 4] },
      },
      edges: {
        read: { from: "export", to: "db", rate: 1 },
        send: { from: "export", to: "auditor", rate: 1, mode: "async" },
      },
      metrics: { gaps: 214 },
      focus: ["export", "auditor", "db"],
      exchange: {
        edge: "send",
        request: {
          format: "text",
          head: "register 2026, series INV: 000481 000482 000484 000485 000490 ...",
          body: "000483  nextval, then a validation error -> ROLLBACK, the number is not returned\n000486..000489  4 drafts deleted by the accountants\n000501..000520  server restart: 20 cached values thrown away\n-- 214 missing numbers this year, each needs a written explanation",
        },
        marks: ["register 2026", "ROLLBACK", "drafts deleted", "cached values", "214 missing"],
      },
    },
    {
      id: "maxplus",
      kind: "problem",
      metrics: { gaps: 60, dups: 40 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "number = SELECT max(no) + 1 FROM invoices WHERE series = 'INV'",
          body: "10:15:00.123  T1  max(no) = 481  -> 482\n10:15:00.124  T2  max(no) = 481  -> 482   (T1 has not committed yet)\n10:15:00.130  T1  INSERT 482  COMMIT\n10:15:00.131  T2  INSERT 482  COMMIT   two invoices INV-2026-000482\n-- with a unique index T2 fails instead, and the user sees an error",
        },
        marks: ["max(no) + 1", "has not committed", "INV-2026-000482", "unique index"],
      },
    },
    {
      id: "counter",
      kind: "fix",
      metrics: { dups: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE number_counters",
          body: "   SET last_no = last_no + 1\n WHERE series = 'INV' AND year = 2026\nRETURNING last_no;\n-- in the same transaction as the invoice;\n-- the row stays locked until COMMIT or ROLLBACK",
        },
        response: { format: "text", head: "UPDATE 1   last_no = 482" },
        marks: ["number_counters", "last_no", "year", "same transaction", "locked"],
      },
    },
    {
      id: "finalize",
      kind: "fix",
      metrics: { gaps: 0 },
      focus: ["clerk", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;  -- POST /invoices/9f2c/finalize",
          body: "UPDATE number_counters SET last_no = last_no + 1\n WHERE series = 'INV' AND year = 2026 RETURNING last_no;   -- 482\nUPDATE invoices\n   SET number = 'INV-2026-000482', status = 'issued', issued_at = now()\n WHERE id = '9f2c' AND status = 'draft';\nCOMMIT;\n-- drafts have only an id; deleting one costs no number",
        },
        marks: ["finalize", "RETURNING", "issued", "status = 'draft'", "no number"],
      },
    },
    {
      id: "serial",
      kind: "problem",
      nodes: { db: { state: "slow" }, api: { state: "slow" } },
      edges: { finalize: { flow: "retry" } },
      metrics: { tps: 80, wait: 780 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "load test: 64 parallel finalizes, one series",
          body: "sequence (old)          900 /s   p99   4 ms   but gaps\ncounter, taken first     80 /s   p99 780 ms\n  lock held 12 ms: counter, 40 line rows, totals, PDF hash, COMMIT\n  1 000 ms / 12 ms = 83 finalizes per second, whatever the CPU count",
        },
        marks: ["one series", "taken first", "lock held 12 ms", "83 finalizes"],
      },
    },
    {
      id: "short",
      kind: "fix",
      nodes: { db: { state: "ok" }, api: { state: "ok" } },
      edges: { finalize: { flow: "request" } },
      metrics: { tps: 410, wait: 18 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "finalize, reordered",
          body: "before BEGIN   validate, compute totals, check the buyer         9 ms\nBEGIN\n  UPDATE invoices ... lines, totals                              1.2 ms\n  UPDATE number_counters ... RETURNING       <- the lock starts here\n  UPDATE invoices SET number, status = 'issued'\nCOMMIT                                       <- and ends here    2.4 ms\nafter COMMIT   render the PDF, sign, e-mail: outside the lock",
        },
        marks: ["before BEGIN", "the lock starts", "COMMIT", "after COMMIT"],
      },
    },
    {
      id: "delete",
      kind: "problem",
      edges: { send: { flow: "fail" } },
      metrics: { gaps: 1 },
      focus: ["clerk", "db", "auditor"],
      exchange: {
        edge: "send",
        request: {
          format: "text",
          head: "DELETE FROM invoices WHERE number = 'INV-2026-000517';  -- wrong buyer",
          body: "register 2026, series INV: ... 000516 000518 ...\nauditor: where is 000517? it was sent to a buyer on 14 March\n-- the buyer has a document the seller no longer has",
        },
        marks: ["DELETE", "wrong buyer", "where is 000517", "no longer has"],
      },
    },
    {
      id: "cancel",
      kind: "fix",
      edges: { send: { flow: "request" } },
      metrics: { gaps: 0 },
      focus: ["api", "db", "auditor"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE invoices",
          body: "   SET status = 'cancelled', cancelled_at = now(),\n       cancel_reason = 'wrong buyer', replaced_by = 'INV-2026-000533'\n WHERE number = 'INV-2026-000517' AND status = 'issued';\n-- the app role has no DELETE on issued invoices\n-- the register lists 000517 as cancelled, 000533 as its replacement",
        },
        marks: ["cancelled", "cancel_reason", "replaced_by", "no DELETE", "register"],
      },
    },
    {
      id: "series",
      kind: "fix",
      nodes: { branch: { kind: "client", at: [0, 8] } },
      edges: { finalize2: { from: "branch", to: "api", rate: 2, mode: "call" } },
      metrics: { tps: 780 },
      focus: ["clerk", "branch", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT series, year, last_no FROM number_counters;",
        },
        response: {
          format: "text",
          head: " HQ  | 2026 | 517",
          body: " BR2 | 2026 |  45\n-- HQ-2026-000517 and BR2-2026-000045: one counter row per branch\n-- two branches never wait for each other's lock\n-- check first that the rules allow a separate series per branch",
        },
        marks: ["series", "BR2", "one counter row", "never wait", "rules allow"],
      },
    },
    {
      id: "rollover",
      kind: "fix",
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO number_counters (series, year, last_no)",
          body: "SELECT series, 2027, 0 FROM number_counters WHERE year = 2026\nON CONFLICT (series, year) DO NOTHING;\n-- run on 1 December, so 1 January never creates rows under load\n-- year = issue date in the company's legal time zone, UTC+5:\n--   31 Dec 23:40 local = 18:40 UTC -> 2026\n--   1 Jan 00:10 local = 19:10 UTC on 31 Dec -> 2027, number 000001",
        },
        marks: ["year", "ON CONFLICT", "1 December", "legal time zone", "000001"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "same-ms",
      from: "short",
      steps: [
        {
          id: "ms-wait",
          kind: "case",
          nodes: { clerk2: { kind: "client", at: [0, 0] } },
          edges: { finalize3: { from: "clerk2", to: "api", rate: 2, mode: "call" } },
          metrics: { wait: 3 },
          focus: ["clerk", "clerk2", "api", "db"],
          exchange: {
            edge: "write",
            request: {
              format: "text",
              head: "10:15:00.123  two finalize requests, same series, same millisecond",
              body: "T1  UPDATE number_counters ... RETURNING   -> 482, row locked\nT2  UPDATE number_counters ...             -> waits for T1\nT1  COMMIT                                 10:15:00.1254\nT2  re-reads the committed row             -> 483   (waited 2.1 ms)\nT2  COMMIT\n-- READ COMMITTED: the second writer updates the newest version",
            },
            marks: ["row locked", "waits for T1", "re-reads", "483", "READ COMMITTED"],
          },
        },
        {
          id: "ms-rollback",
          kind: "case",
          metrics: { gaps: 0 },
          focus: ["api", "db"],
          exchange: {
            edge: "write",
            request: {
              format: "text",
              head: "10:15:00.123  T1 takes 482, then the buyer's tax id fails a check",
              body: "T1  ROLLBACK                 the counter goes back to 481\nT2  was waiting on the row   -> 482\n-- nothing to explain to the auditor: 482 belongs to T2's invoice",
            },
            marks: ["ROLLBACK", "goes back to 481", "482"],
          },
        },
        {
          id: "ms-retry",
          kind: "fix",
          edges: { finalize3: { flow: "retry" } },
          metrics: { dups: 0, wait: 6 },
          focus: ["clerk2", "api", "db"],
          exchange: {
            edge: "finalize3",
            request: {
              format: "text",
              head: "the same race under REPEATABLE READ",
              body: "T2  ERROR 40001: could not serialize access due to concurrent update\nT2  ROLLBACK, wait 5..20 ms, run the whole transaction again\nT2  -> 483 on the 2nd try (at most 3 tries, then 503 to the client)\n-- never retry only the UPDATE: the snapshot is already stale",
            },
            marks: ["REPEATABLE READ", "40001", "whole transaction", "at most 3 tries", "stale"],
          },
        },
      ],
    },
  ],
});
