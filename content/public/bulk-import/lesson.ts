import { defineLesson } from "@mufassall/scene-schema";

/**
 * A wholesale company imports its product catalog from a CSV export: 200 000 rows.
 * Parsing in the request, then a pre-signed upload to object storage, an import job and a
 * streaming worker, per-row validation with an error report, file-hash dedup and checkpoints,
 * batched upserts that keep locks short, progress for the UI and per-tenant limits.
 * Numbers are a model scenario.
 */
export default defineLesson({
  slug: "bulk-import",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "duration", unit: "s", better: "down" },
    { id: "imported", unit: "%", better: "up" },
    { id: "memory", unit: "MB", better: "down" },
    { id: "lockwait", unit: "s", better: "down" },
  ],
  steps: [
    {
      id: "inline",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [3, 3], load: 20 },
        db: { kind: "db", at: [11, 7] },
      },
      edges: {
        upload: { from: "client", to: "api", rate: 2 },
        insert: { from: "api", to: "db", rate: 3 },
      },
      metrics: { duration: 3, imported: 100, memory: 180, lockwait: 0 },
      focus: ["client", "api"],
      exchange: {
        edge: "upload",
        request: {
          format: "http",
          head: "POST /products/import HTTP/1.1",
          headers: [
            ["Host", "app.example.com"],
            ["Cookie", "***"],
            ["Content-Type", "multipart/form-data; boundary=x9"],
            ["Content-Length", "412380"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "imported": 2000,
  "took_ms": 3120
}`,
        },
        marks: ["Cookie", "Content-Type", "Content-Length", "imported"],
        masked: ["Cookie"],
      },
    },
    {
      id: "bigfile",
      kind: "problem",
      nodes: { api: { state: "slow", load: 99 }, db: { state: "slow" } },
      edges: { upload: { flow: "fail" }, insert: { flow: "fail" } },
      metrics: { duration: 60, imported: 0, memory: 1900 },
      focus: ["client", "api"],
      exchange: {
        edge: "upload",
        request: {
          format: "text",
          head: "14:02:10 POST /products/import 41.9 MB, 200 000 rows",
          body: "14:02:11 parsing the whole file in memory: 1.9 GB\n14:03:10 proxy: 504 Gateway Timeout after 60 s\n14:03:40 row 117 403: price \"12,5O\" is not a number\n14:03:40 ROLLBACK: 117 402 good rows thrown away\n14:03:52 the same user clicks Upload again",
        },
        marks: ["in memory", "504", "not a number", "ROLLBACK", "again"],
      },
    },
    {
      id: "presign",
      kind: "fix",
      nodes: {
        api: { state: "ok", load: 15 },
        db: { state: "ok" },
        storage: { kind: "storage", at: [3, 7] },
      },
      edges: {
        upload: { flow: "request", rate: 1 },
        insert: { flow: "request", rate: 0 },
        put: { from: "client", to: "storage", rate: 4 },
      },
      metrics: { memory: 180 },
      focus: ["client", "storage"],
      exchange: {
        edge: "put",
        request: {
          format: "http",
          head: "PUT /t_19/imp_77.csv?expires=900&sig=*** HTTP/1.1",
          headers: [
            ["Host", "files.example.com"],
            ["Content-Type", "text/csv"],
            ["Content-Length", "41873112"],
            ["x-content-sha256", "9f2c...e41a"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["ETag", "\"9f2c...e41a\""]],
        },
        marks: ["expires", "sig", "Content-Length", "x-content-sha256", "ETag"],
      },
    },
    {
      id: "job",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [7, 3] },
        worker: { kind: "worker", at: [7, 7], load: 40 },
      },
      edges: {
        insert: null,
        job: { from: "api", to: "queue", rate: 1 },
        take: { from: "queue", to: "worker", rate: 1 },
        read: { from: "worker", to: "storage", rate: 4 },
        write: { from: "worker", to: "db", rate: 4 },
      },
      metrics: { duration: 410, memory: 60 },
      focus: ["api", "queue", "worker"],
      exchange: {
        edge: "upload",
        request: {
          format: "json",
          head: "POST /imports HTTP/1.1",
          body: `{
  "kind": "products",
  "file_key": "t_19/imp_77.csv",
  "sha256": "9f2c...e41a"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 202 Accepted",
          headers: [["Location", "/imports/imp_77"]],
          body: `{
  "job_id": "imp_77",
  "status": "queued"
}`,
        },
        marks: ["file_key", "sha256", "202 Accepted", "Location", "status"],
      },
    },
    {
      id: "validate",
      kind: "fix",
      edges: { read: { rate: 4 }, write: { rate: 4 } },
      metrics: { imported: 99.8 },
      focus: ["worker", "storage"],
      exchange: {
        edge: "read",
        request: {
          format: "text",
          head: "t_19/imp_77.errors.csv",
          body: "row,sku,column,value,error\n117403,SKU-88120,price,\"12,5O\",not_a_number\n140210,SKU-90017,unit,kgg,unknown_unit\n151002,,sku,,required\n188777,SKU-10233,sku,SKU-10233,duplicate_in_file\n-- 199 600 rows imported, 400 rejected\n-- job status: completed_with_errors",
        },
        marks: ["row", "column", "required", "duplicate_in_file", "completed_with_errors"],
      },
    },
    {
      id: "restart",
      kind: "problem",
      nodes: { worker: { state: "slow", load: 95 }, db: { load: 85 } },
      edges: { take: { flow: "dup", rate: 2 }, write: { flow: "fail" } },
      metrics: { duration: 760, imported: 61 },
      focus: ["queue", "worker", "db"],
      exchange: {
        edge: "take",
        request: {
          format: "text",
          head: "15:10:04 deploy: worker restarted, imp_77 was at row 122 000",
          body: "15:10:09 imp_77 redelivered -> start again at row 1\n15:10:11 row 2: SKU-00002 already exists (unique key)\n15:10:30 POST /imports with the same file -> new job imp_78\n15:10:31 imp_77 and imp_78 import one file in parallel",
        },
        marks: ["restarted", "row 1", "already exists", "imp_78", "parallel"],
      },
    },
    {
      id: "checkpoint",
      kind: "fix",
      nodes: { worker: { state: "ok", load: 45 }, db: { load: 50 } },
      edges: { take: { flow: "request", rate: 1 }, write: { flow: "request" } },
      metrics: { duration: 420, imported: 99.8 },
      focus: ["worker", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE import_jobs",
          body: "   SET last_row = 123000, imported = 122540,\n       failed = 460, updated_at = now()\n WHERE job_id = 'imp_77'\n   AND lease_owner = 'worker-3';\n-- every 1 000 rows; a restart resumes at 123 001\n\n-- POST /imports first looks up the file:\nSELECT job_id FROM import_jobs\n WHERE tenant_id = 't_19' AND sha256 = '9f2c...e41a';",
        },
        response: { format: "text", head: "imp_77", body: "-- same file: return the existing job, no imp_78" },
        marks: ["last_row", "lease_owner", "resumes", "sha256"],
      },
    },
    {
      id: "lock",
      kind: "problem",
      nodes: { db: { state: "slow", load: 97 } },
      edges: { write: { flow: "fail", rate: 6 } },
      metrics: { lockwait: 177 },
      focus: ["worker", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "16:00:02 imp_81: UPDATE products FROM staging",
          body: "-- 200 000 rows in one transaction\n16:00:05 checkout: UPDATE products SET stock = stock - 1\n          WHERE sku = 'SKU-10233' -> waiting for lock\n16:02:59 checkout: lock wait 177 s, order request timed out\n16:03:04 imp_81 COMMIT, locks released",
        },
        marks: ["staging", "one transaction", "waiting for lock", "lock wait", "COMMIT"],
      },
    },
    {
      id: "batch",
      kind: "fix",
      nodes: { db: { state: "ok", load: 45 } },
      edges: { write: { flow: "request", rate: 4 } },
      metrics: { lockwait: 0, duration: 95 },
      focus: ["worker", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO products (tenant_id, sku, name, price_minor)",
          body: "VALUES ('t_19', 'SKU-00001', 'Cement 50 kg', 6250000),\n       ('t_19', 'SKU-00002', 'Gypsum 25 kg', 4100000)\n       -- ... 1 000 rows per statement\nON CONFLICT (tenant_id, sku) DO UPDATE\n   SET name = EXCLUDED.name,\n       price_minor = EXCLUDED.price_minor\n WHERE (products.name, products.price_minor)\n       IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.price_minor);",
        },
        response: { format: "text", head: "INSERT 0 1000", body: "-- 38 ms, then COMMIT with the checkpoint" },
        marks: ["tenant_id", "ON CONFLICT", "EXCLUDED", "IS DISTINCT FROM", "38 ms"],
      },
    },
    {
      id: "progress",
      kind: "fix",
      edges: {
        upload: { rate: 1 },
        jobs: { from: "api", to: "db", flow: "request", rate: 1 },
      },
      focus: ["client", "api"],
      exchange: {
        edge: "upload",
        request: {
          format: "http",
          head: "GET /imports/imp_77 HTTP/1.1",
          headers: [["Host", "app.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "status": "running",
  "total_rows": 200000,
  "processed": 123000,
  "failed": 460,
  "eta_seconds": 41,
  "errors_url": "/imports/imp_77/errors"
}`,
        },
        marks: ["status", "total_rows", "processed", "failed", "eta_seconds", "errors_url"],
      },
    },
    {
      id: "limits",
      kind: "fix",
      nodes: { api: { load: 30 }, worker: { load: 60 } },
      edges: { upload: { flow: "fail" } },
      focus: ["api", "queue", "worker"],
      exchange: {
        edge: "upload",
        request: {
          format: "http",
          head: "POST /imports HTTP/1.1",
          headers: [["Host", "app.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [["Retry-After", "120"]],
          body: `{
  "error": "too_many_running_imports",
  "running": 2,
  "limit_running": 2,
  "max_file_mb": 100,
  "max_rows": 500000
}`,
        },
        marks: ["Retry-After", "error", "limit_running", "max_file_mb", "max_rows"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
