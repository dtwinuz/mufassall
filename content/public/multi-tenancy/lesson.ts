import { defineLesson } from "@mufassall/scene-schema";

/**
 * A B2B invoicing SaaS keeps 1 200 customer companies (tenants) in one database. A report that
 * forgets `WHERE tenant_id` leaks rows, so isolation moves into the database (row-level security
 * with a tenant context set per transaction, taken from the token). One big tenant's export
 * slows everyone: per-tenant quotas and an export queue. The big tenant moves to its own
 * database (silo) behind a routing catalog, keys become per tenant, and schema migrations roll
 * out in waves. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "multi-tenancy",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "leaked", unit: "", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "blast", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "shared",
      kind: "case",
      nodes: {
        ta: { kind: "client", at: [0, 2] },
        tb: { kind: "client", at: [0, 7] },
        api: { kind: "service", at: [3, 4] },
        db: { kind: "db", at: [7, 2], load: 35 },
      },
      edges: {
        a: { from: "ta", to: "api", rate: 2 },
        b: { from: "tb", to: "api", rate: 3 },
        q: { from: "api", to: "db", rate: 4 },
      },
      metrics: { leaked: 0, p99: 120, blast: 100 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "SELECT id, total FROM invoices",
          body: " WHERE tenant_id = 't_17'\n   AND status = 'open';\n-- 1 200 tenants, one schema, one table",
        },
        response: { format: "text", head: "3 rows" },
        marks: ["tenant_id", "one table", "3 rows"],
      },
    },
    {
      id: "leak",
      kind: "problem",
      edges: { b: { flow: "fail" } },
      metrics: { leaked: 1840 },
      focus: ["tb", "api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "SELECT id, tenant_id, total FROM invoices",
          body: " WHERE due_date < now()\n   AND status = 'open';\n-- new overdue report for t_900\n-- forgot: AND tenant_id = 't_900'",
        },
        response: {
          format: "text",
          head: "1840 rows",
          body: "t_900  312 rows\nt_17    41 rows\n...    37 tenants in one CSV",
        },
        marks: ["tenant_id", "forgot", "1840 rows", "37 tenants"],
      },
    },
    {
      id: "rls",
      kind: "fix",
      edges: { b: { flow: "request" } },
      metrics: { leaked: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;",
          body: "ALTER TABLE invoices FORCE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation ON invoices\n  USING (tenant_id =\n         current_setting('app.tenant_id'));\n-- every request, inside its transaction:\nBEGIN;\nSET LOCAL app.tenant_id = 't_900';\nSELECT id, total FROM invoices\n WHERE due_date < now();",
        },
        response: { format: "text", head: "312 rows (t_900 only)" },
        marks: ["ROW LEVEL SECURITY", "FORCE", "CREATE POLICY", "USING", "SET LOCAL", "312 rows"],
      },
    },
    {
      id: "spoof",
      kind: "problem",
      edges: { b: { flow: "fail" } },
      metrics: { leaked: 214 },
      focus: ["tb", "api"],
      exchange: {
        edge: "b",
        request: {
          format: "http",
          head: "GET /v1/invoices?status=open HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
            ["X-Tenant-Id", "t_17"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "tenant": "t_17",
  "count": 214,
  "first": "inv_17_0001"
}`,
        },
        marks: ["X-Tenant-Id", "tenant", "count"],
        masked: ["Authorization"],
      },
    },
    {
      id: "token",
      kind: "fix",
      edges: { b: { flow: "request" } },
      metrics: { leaked: 0 },
      focus: ["tb", "api"],
      exchange: {
        edge: "b",
        request: {
          format: "json",
          head: "Bearer token, decoded claims",
          body: `{
  "sub": "u_42",
  "tenant": "t_900",
  "roles": ["billing_admin"],
  "exp": 1795046400,
  "sig": "***"
}`,
        },
        response: {
          format: "text",
          head: "tenant context = t_900 (from the token)",
          body: "X-Tenant-Id t_17 does not match -> 403\naudit: tenant_mismatch u_42",
        },
        marks: ["sub", "tenant", "exp", "sig", "403"],
        masked: ["sig"],
      },
    },
    {
      id: "noisy",
      kind: "problem",
      nodes: { db: { state: "slow", load: 97 }, api: { state: "slow" } },
      edges: { b: { rate: 10 }, q: { rate: 10 } },
      metrics: { p99: 2400 },
      focus: ["tb", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "top tenants by DB time, last 5 min",
          body: "t_900  export invoices 2019-2026   71%\nt_204  list invoices                3%\nt_17   dashboard                   2%\n1 197 other tenants               24%\n-- p99 for everyone: 120 ms -> 2400 ms",
        },
        marks: ["t_900", "71%", "p99"],
      },
    },
    {
      id: "quota",
      kind: "fix",
      nodes: {
        db: { state: "ok", load: 55 },
        api: { state: "ok" },
        exporter: { kind: "worker", at: [10, 5] },
      },
      edges: {
        b: { rate: 3 },
        q: { rate: 4 },
        exp: { from: "api", to: "exporter", rate: 1, mode: "async" },
        scan: { from: "exporter", to: "db", rate: 1 },
      },
      metrics: { p99: 180 },
      focus: ["tb", "api", "exporter"],
      exchange: {
        edge: "b",
        request: {
          format: "http",
          head: "POST /v1/exports HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [
            ["RateLimit-Limit", "2"],
            ["RateLimit-Remaining", "0"],
            ["Retry-After", "60"],
          ],
          body: `{
  "error": "tenant_quota_exceeded",
  "tenant": "t_900",
  "running_exports": 2
}`,
        },
        marks: ["RateLimit-Limit", "RateLimit-Remaining", "Retry-After", "running_exports"],
        masked: ["Authorization"],
      },
    },
    {
      id: "silo",
      kind: "fix",
      nodes: {
        db: { load: 40 },
        catalog: { kind: "db", at: [3, 0] },
        db900: { kind: "db", at: [7, 8], load: 60 },
      },
      edges: {
        route: { from: "api", to: "catalog", rate: 1 },
        silo: { from: "api", to: "db900", rate: 3 },
      },
      metrics: { p99: 140 },
      focus: ["api", "catalog", "db900"],
      exchange: {
        edge: "route",
        request: {
          format: "sql",
          head: "SELECT cell, db_host, state FROM tenant_routes",
          body: " WHERE tenant_id = 't_900';\n-- cached in the API for 30 s",
        },
        response: {
          format: "text",
          head: " cell      | db_host              | state",
          body: " silo-900  | db-900.internal.test | active\n-- t_17: pool-1 | db-pool-1.internal.test",
        },
        marks: ["tenant_routes", "cell", "db_host", "state", "pool-1"],
      },
    },
    {
      id: "keys",
      kind: "fix",
      nodes: { kms: { kind: "external", at: [10, 1] } },
      edges: { key: { from: "api", to: "kms", rate: 1 } },
      focus: ["api", "kms", "db900"],
      exchange: {
        edge: "key",
        request: {
          format: "json",
          head: "POST /v1/keys/decrypt HTTP/1.1",
          body: `{
  "key_id": "tenant/t_900/v3",
  "wrapped_key": "kq9Z0c1Lr2Vt8w==",
  "context": { "tenant": "t_900" }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "key_id": "tenant/t_900/v3",
  "plaintext_key": "***"
}`,
        },
        marks: ["key_id", "wrapped_key", "tenant", "plaintext_key"],
        masked: ["plaintext_key"],
      },
    },
    {
      id: "migrate",
      kind: "fix",
      nodes: { migrator: { kind: "worker", at: [4, 11] } },
      edges: {
        mig1: { from: "migrator", to: "db", rate: 1 },
        mig2: { from: "migrator", to: "db900", rate: 1 },
      },
      metrics: { blast: 1 },
      focus: ["migrator", "db", "db900"],
      exchange: {
        edge: "mig1",
        request: {
          format: "text",
          head: "migrate 0042_invoice_currency",
          body: "wave 0  canary   12 tenants   ok    4 min\nwave 1  pool-1  400 tenants   ok   11 min\nwave 2  pool-2  787 tenants   ok   19 min\nwave 3  silo-900  1 tenant    paused: lock_timeout\n-- schema_version per tenant in the catalog\n-- the app reads v41 and v42 until all are done",
        },
        marks: ["canary", "wave", "lock_timeout", "schema_version"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
