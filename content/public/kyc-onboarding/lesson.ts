import { defineLesson } from "@mufassall/scene-schema";

/**
 * A wallet app verifies new customers through an external KYC provider. The story: an explicit
 * status machine, passport photos behind public permanent links fixed with a private encrypted
 * store and short-lived signed URLs, a provider timeout that bills two checks fixed with an
 * idempotency key plus callback and polling, a manual review queue with an SLA, sanctions/PEP
 * screening and duplicates by keyed hash, tiered limits enforced on the server, re-verification
 * when a passport expires, and an append-only decision trail with retention. Scenario: the
 * provider's callback arrives before the submit transaction commits. All personal data is
 * obviously fake (AA1234567, PINFL 12345678901234); numbers are a model scenario.
 */
export default defineLesson({
  slug: "kyc-onboarding",
  level: "intermediate",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "exposed", unit: "", better: "down" },
    { id: "doubles", unit: "/day", better: "down" },
    { id: "late", unit: "%", better: "down" },
    { id: "dups", unit: "/mo", better: "down" },
    { id: "cashout", unit: "/day", better: "down" },
    { id: "orphan", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [4, 6] },
        db: { kind: "db", at: [4, 11] },
      },
      edges: {
        submit: { from: "app", to: "api", rate: 2, mode: "call" },
        write: { from: "api", to: "db", rate: 2 },
      },
      metrics: { exposed: 0, doubles: 0, late: 31, dups: 40, cashout: 120, orphan: 0 },
      focus: ["app", "api", "db"],
      exchange: {
        edge: "submit",
        request: {
          format: "json",
          head: "POST /v1/kyc/applications HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "type": "individual",
  "full_name": "Ali Valiyev",
  "passport": "AA1234567",
  "pinfl": "12345678901234",
  "birth_date": "1990-01-01",
  "phone": "+998 90 000 00 00"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "application_id": "kyc_3391",
  "status": "draft"
}`,
        },
        marks: ["type", "passport", "pinfl", "birth_date", "application_id", "status"],
        masked: ["Authorization"],
      },
    },
    {
      id: "states",
      kind: "case",
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "CREATE TABLE kyc_applications (",
          body: "  id text PRIMARY KEY, customer_id text NOT NULL,\n  status text NOT NULL, version int NOT NULL, decided_by text\n);\n-- allowed moves, one table, checked in one function:\n-- draft -> submitted                         the customer presses Send\n-- submitted -> approved | rejected           the provider decides alone\n-- submitted -> in_review                     the provider asks for a person\n-- in_review -> approved | rejected | needs_more_info   a reviewer\n-- needs_more_info -> submitted               the customer uploads again",
        },
        marks: ["status", "version", "draft", "in_review", "needs_more_info"],
      },
    },
    {
      id: "docs-leak",
      kind: "problem",
      nodes: { docs: { kind: "storage", at: [7, 1] } },
      edges: { up: { from: "app", to: "docs", flow: "fail", rate: 1 } },
      metrics: { exposed: 18000 },
      focus: ["app", "docs"],
      exchange: {
        edge: "up",
        request: {
          format: "text",
          head: "https://files.wallet.example/kyc/kyc_3391/passport.jpg",
          body: "bucket kyc-docs: public read, so the app could show the photo back to the customer\nobject name = application id, and ids are sequential: kyc_3390, kyc_3392 ...\nno expiry, no login: a link pasted into a support chat opens a passport for anyone\n-- 18 000 passport photos and selfies, readable by whoever counts up the ids",
        },
        marks: ["public read", "sequential", "no expiry", "18 000"],
      },
    },
    {
      id: "docs-secure",
      kind: "fix",
      edges: {
        up: { flow: "request" },
        sign: { from: "api", to: "docs", rate: 1 },
      },
      metrics: { exposed: 0 },
      focus: ["app", "api", "docs"],
      exchange: {
        edge: "submit",
        request: {
          format: "json",
          head: "POST /v1/kyc/applications/kyc_3391/documents HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "kind": "passport_main",
  "content_type": "image/jpeg",
  "size_bytes": 2400000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "document_id": "doc_88",
  "upload_url": "https://files.wallet.example/u/7f3c9e1a",
  "signature": "***",
  "expires_in_s": 300,
  "max_bytes": 10000000
}`,
        },
        marks: ["kind", "size_bytes", "upload_url", "signature", "expires_in_s", "max_bytes"],
        masked: ["Authorization", "signature"],
      },
    },
    {
      id: "double",
      kind: "problem",
      nodes: { idp: { kind: "external", at: [12, 5] } },
      edges: { check: { from: "api", to: "idp", flow: "dup", rate: 2, mode: "call" } },
      metrics: { doubles: 11 },
      focus: ["api", "idp"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "POST /v1/checks  for kyc_3391, provider timeout 10 s",
          body: "10:00:00.000  sent: passport photo, selfie video, 6 MB\n10:00:10.000  no answer: the worker times out and the job is retried\n10:00:10.300  second POST /v1/checks: the provider starts a new check\n10:00:12.900  check chk_A: approved\n10:00:21.400  check chk_B: in_review (selfie blurred)\n-- two paid checks; the final status depends on which callback lands last",
        },
        marks: ["timeout 10 s", "no answer", "new check", "chk_B", "which callback lands last"],
      },
    },
    {
      id: "idem",
      kind: "fix",
      nodes: { jobs: { kind: "worker", at: [9, 8] } },
      edges: {
        check: { flow: "request", rate: 1 },
        cb: { from: "idp", to: "api", flow: "ack", rate: 1, mode: "async" },
        poll: { from: "jobs", to: "idp", rate: 1, mode: "call" },
      },
      metrics: { doubles: 0 },
      focus: ["api", "idp", "jobs"],
      exchange: {
        edge: "check",
        request: {
          format: "json",
          head: "POST /v1/checks HTTP/1.1",
          headers: [
            ["Authorization", "***"],
            ["Idempotency-Key", "kyc_3391-attempt-1"],
          ],
          body: `{
  "reference": "kyc_3391",
  "callback_url": "https://api.wallet.example/kyc/callbacks",
  "documents": ["doc_88", "doc_89"]
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 202 Accepted",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "check_id": "chk_A",
  "status": "processing"
}`,
        },
        marks: ["Idempotency-Key", "reference", "callback_url", "Idempotent-Replayed", "check_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "review",
      kind: "fix",
      nodes: { reviewer: { kind: "actor", at: [0, 9] } },
      edges: { queue: { from: "reviewer", to: "api", rate: 1, mode: "call" } },
      metrics: { late: 4 },
      focus: ["reviewer", "api"],
      exchange: {
        edge: "queue",
        request: {
          format: "json",
          head: "GET /v1/review/queue?limit=20 HTTP/1.1",
          headers: [["Authorization", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "items": [
    {
      "application_id": "kyc_3391",
      "reason": "liveness_score 0.71 < 0.80",
      "due_at": "2026-11-19T14:00:00+05:00",
      "assigned_to": "rev_14",
      "lease_until": "2026-11-19T11:57:00+05:00"
    }
  ],
  "over_sla": 2
}`,
        },
        marks: ["reason", "due_at", "assigned_to", "lease_until", "over_sla"],
        masked: ["Authorization"],
      },
    },
    {
      id: "risk",
      kind: "fix",
      nodes: { lists: { kind: "external", at: [11, 1] } },
      edges: { screen: { from: "api", to: "lists", rate: 1, mode: "call" } },
      metrics: { dups: 0 },
      focus: ["api", "lists", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "-- before any approval of kyc_3391",
          body: "SELECT customer_id, status FROM kyc_applications\n WHERE pinfl_ref = 'k2:51e0...9a' OR doc_ref = 'k2:9d41...c7';\n-- both are HMAC-SHA256 with a secret key: of the PINFL and of AA1234567\n-- found: c_2210, approved 2026-08-02 -> duplicate, to a reviewer, no second bonus\n-- sanctions and PEP lists: name + birth date, fuzzy score 0.93 -> hold for a person\n-- the lists change daily: approved customers are re-screened every night",
        },
        marks: ["pinfl_ref", "doc_ref", "HMAC-SHA256", "duplicate", "PEP", "re-screened"],
      },
    },
    {
      id: "limits",
      kind: "fix",
      nodes: { pay: { kind: "service", at: [9, 12] } },
      edges: { tier: { from: "pay", to: "api", rate: 1, mode: "call" } },
      metrics: { cashout: 0 },
      focus: ["pay", "api"],
      exchange: {
        edge: "tier",
        request: {
          format: "http",
          head: "GET /internal/customers/c_5120/limits HTTP/1.1",
          headers: [["X-Request-Id", "req_20f1"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "tier": "unverified",
  "balance_max_uzs": 1000000,
  "withdraw_month_uzs": 0,
  "p2p": false
}`,
        },
        marks: ["tier", "balance_max_uzs", "withdraw_month_uzs", "p2p"],
      },
    },
    {
      id: "reverify",
      kind: "fix",
      edges: { expire: { from: "jobs", to: "db", rate: 1 } },
      focus: ["jobs", "db", "app"],
      exchange: {
        edge: "expire",
        request: {
          format: "sql",
          head: "-- 03:00 nightly: passports that expire soon",
          body: "SELECT customer_id, passport_expires FROM kyc_profiles\n WHERE status = 'approved' AND passport_expires < current_date + 30;\n-- 1 140 customers: push and SMS 30, 14 and 3 days before\n-- expiry day with no new document: tier -> unverified, the balance stays, withdrawals stop\n-- a new passport opens a short application: only the document step, not the whole flow",
        },
        marks: ["passport_expires", "1 140", "tier -> unverified", "balance stays", "only the document step"],
      },
    },
    {
      id: "audit",
      kind: "fix",
      focus: ["reviewer", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "json",
          head: "INSERT INTO kyc_decisions  (append-only)",
          body: `{
  "application_id": "kyc_3391",
  "from": "in_review",
  "to": "approved",
  "actor": "rev_14",
  "reason": "liveness re-checked on a video call",
  "evidence": ["chk_A", "doc_88", "doc_89"],
  "at": "2026-11-19T11:42:07+05:00"
}`,
        },
        response: {
          format: "text",
          head: "retention",
          body: "approved: documents and decisions kept 5 years after the account is closed\nrejected or abandoned: images deleted after 90 days, the decision row stays\nprovider's copy: deleted through its API 30 days after the check, confirmation stored",
        },
        marks: ["actor", "reason", "evidence", "5 years", "90 days"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "early-callback",
      from: "idem",
      steps: [
        {
          id: "cb-race",
          kind: "problem",
          edges: { cb: { flow: "fail" } },
          metrics: { orphan: 140 },
          focus: ["api", "idp", "db"],
          exchange: {
            edge: "cb",
            request: {
              format: "text",
              head: "submit kyc_3391: one transaction, with the provider call inside it",
              body: "10:00:00.000  BEGIN; UPDATE status = 'submitted', INSERT check row\n10:00:00.020  POST /v1/checks -> 202 chk_A   (still inside the transaction)\n10:00:00.210  callback chk_A: approved -> SELECT ... WHERE check_id = 'chk_A' -> 0 rows\n10:00:00.215  the handler answers 200 OK and drops it: \"unknown check\"\n10:00:00.400  COMMIT\n-- the customer waits in submitted forever: 140 a day, almost all fast auto-approvals",
            },
            marks: ["BEGIN", "inside the transaction", "0 rows", "drops it", "COMMIT"],
          },
        },
        {
          id: "cb-fix",
          kind: "fix",
          edges: { cb: { flow: "ack" } },
          metrics: { orphan: 0 },
          focus: ["api", "idp", "jobs", "db"],
          exchange: {
            edge: "write",
            request: {
              format: "sql",
              head: "-- 1) commit first, call the provider after",
              body: "BEGIN;\nUPDATE kyc_applications SET status = 'submitted', version = version + 1\n WHERE id = 'kyc_3391' AND status = 'draft';\nINSERT INTO outbox (topic, key) VALUES ('kyc.check.requested', 'kyc_3391');\nCOMMIT;   -- a worker then calls the provider with reference = kyc_3391\n-- 2) callbacks are matched by our reference, which is already committed\n-- 3) an unknown reference: 503, the provider retries; never 200-and-drop\n-- 4) the sweeper polls anything still submitted after 15 min",
            },
            marks: ["COMMIT", "outbox", "reference", "503", "never 200-and-drop", "sweeper"],
          },
        },
      ],
    },
  ],
});
