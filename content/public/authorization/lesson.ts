import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * An invoicing app shared by many companies: who may see and do what.
 * Every secret in a wire message is the public placeholder `***`.
 * Numbers are a model scenario for the story, not measurements.
 */
const get = (path: string): WireMessage => ({
  format: "http",
  head: `GET ${path} HTTP/1.1`,
  headers: [
    ["Host", "api.example.com"],
    ["Authorization", "***"],
  ],
});

export default defineLesson({
  slug: "authorization",
  level: "intermediate",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "leaks", unit: "/day", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "perms", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "logged-in",
      kind: "case",
      nodes: {
        alice: { kind: "actor", at: [0, 1] },
        web: { kind: "client", at: [3, 1] },
        api: { kind: "service", at: [6, 3] },
        db: { kind: "db", at: [10, 3] },
      },
      edges: {
        use: { from: "alice", to: "web", rate: 2 },
        get: { from: "web", to: "api", rate: 3 },
        read: { from: "api", to: "db", rate: 3 },
      },
      metrics: { leaks: 0, p95: 45 },
      focus: ["web", "api"],
      exchange: {
        edge: "get",
        request: get("/invoices/inv_1042"),
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "inv_1042",
  "company_id": "c_7",
  "amount": 1250000,
  "status": "approved"
}`,
        },
        marks: ["Authorization", "company_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "idor",
      kind: "problem",
      nodes: { bob: { kind: "actor", at: [0, 6] } },
      edges: { peek: { from: "bob", to: "api", rate: 4 } },
      metrics: { leaks: 140 },
      focus: ["bob", "api"],
      exchange: {
        edge: "peek",
        request: get("/invoices/inv_1043"),
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "inv_1043",
  "company_id": "c_7",
  "amount": 980000
}`,
        },
        marks: ["inv_1043", "Authorization", "company_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ownership",
      kind: "fix",
      edges: { peek: { flow: "fail" } },
      metrics: { leaks: 0, p95: 47 },
      focus: ["api", "db"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "SELECT id, amount, status FROM invoices",
          body: "WHERE id = 'inv_1043'\n  AND company_id = 'c_9';",
        },
        response: { format: "text", head: "(0 rows)", body: "-> 404 Not Found" },
        marks: ["company_id", "0 rows", "404"],
      },
    },
    {
      id: "roles",
      kind: "case",
      edges: { get: { flow: "fail" } },
      focus: ["web", "api"],
      exchange: {
        edge: "get",
        request: {
          format: "http",
          head: "POST /invoices/inv_1042/approve HTTP/1.1",
          headers: [["Authorization", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 403 Forbidden",
          body: `{
  "error": "forbidden",
  "need": "invoice:approve",
  "roles": ["viewer"]
}`,
        },
        marks: ["403", "need", "roles"],
        masked: ["Authorization"],
      },
    },
    {
      id: "scattered",
      kind: "problem",
      edges: {
        get: { flow: "request" },
        peek: { flow: "request" },
      },
      metrics: { leaks: 30 },
      focus: ["bob", "api"],
      exchange: {
        edge: "peek",
        request: get("/invoices/export?company_id=c_7"),
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Type", "text/csv"]],
          body: "inv_1042,1250000,approved\ninv_1043,980000,draft",
        },
        marks: ["export", "company_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "policy",
      kind: "fix",
      nodes: { policy: { kind: "service", at: [6, 8], load: 20 } },
      edges: {
        peek: { flow: "fail" },
        ask: { from: "api", to: "policy", rate: 3 },
      },
      metrics: { leaks: 0, p95: 52 },
      focus: ["api", "policy"],
      exchange: {
        edge: "ask",
        request: {
          format: "json",
          head: "POST /v1/check HTTP/1.1",
          body: `{
  "subject": {
    "id": "u_77",
    "company_id": "c_9",
    "roles": ["admin"]
  },
  "action": "invoice:export",
  "resource": {
    "type": "invoice_list",
    "company_id": "c_7"
  }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "allow": false,
  "reason": "company mismatch"
}`,
        },
        marks: ["subject", "action", "resource", "allow", "reason"],
      },
    },
    {
      id: "abac",
      kind: "fix",
      nodes: { policy: { load: 40 } },
      edges: { get: { flow: "fail" } },
      metrics: { p95: 54 },
      focus: ["api", "policy"],
      exchange: {
        edge: "ask",
        request: {
          format: "json",
          head: "POST /v1/check HTTP/1.1",
          body: `{
  "subject": {
    "id": "u_42",
    "roles": ["accountant"]
  },
  "action": "invoice:approve",
  "resource": {
    "amount": 72000000,
    "created_by": "u_42"
  },
  "context": { "time": "22:40" }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "allow": false,
  "reason": "approver created it"
}`,
        },
        marks: ["roles", "amount", "created_by", "context", "reason"],
      },
    },
    {
      id: "service-account",
      kind: "problem",
      nodes: {
        db: { state: "down" },
        reports: { kind: "worker", at: [10, 8] },
        files: { kind: "storage", at: [12, 11] },
      },
      edges: {
        get: { flow: "request" },
        dump: { from: "reports", to: "db", rate: 2 },
        upload: { from: "reports", to: "files", rate: 1 },
      },
      metrics: { perms: 412 },
      focus: ["reports", "db"],
      exchange: {
        edge: "dump",
        request: {
          format: "sql",
          head: "SET ROLE app_owner;",
          body: "DELETE FROM invoices\nWHERE created_at < '2026-01-01';\n-- meant: invoices_export_tmp",
        },
        response: { format: "text", head: "DELETE 18240" },
        marks: ["app_owner", "invoices_export_tmp", "DELETE 18240"],
      },
    },
    {
      id: "least-privilege",
      kind: "fix",
      nodes: { db: { state: "ok" } },
      edges: { dump: { flow: "fail" } },
      metrics: { perms: 3 },
      focus: ["reports", "db", "files"],
      exchange: {
        edge: "dump",
        request: {
          format: "sql",
          head: "SET ROLE reports_ro;",
          body: "DELETE FROM invoices\nWHERE created_at < '2026-01-01';",
        },
        response: {
          format: "text",
          head: "ERROR: permission denied for table invoices",
          body: "-- reports_ro has only:\n-- GRANT SELECT ON invoices\n-- GRANT INSERT ON invoices_export_tmp",
        },
        marks: ["reports_ro", "permission denied", "GRANT SELECT"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
