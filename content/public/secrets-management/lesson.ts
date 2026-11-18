import { defineLesson } from "@mufassall/scene-schema";

/**
 * A small shop backend: an orders service and a reports job share one database user whose
 * password sits in a committed `.env` file. The password leaks, an emergency rotation takes
 * checkout down, and the team moves to a secrets manager: workload identity instead of a
 * static token, dynamic per-service database users with a lease, envelope encryption at rest,
 * overlapping key versions for rotation, an audit log of reads and a break-glass path.
 * Numbers are a model scenario.
 */
export default defineLesson({
  slug: "secrets-management",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "copies", unit: "", better: "down" },
    { id: "blast", unit: "", better: "down" },
    { id: "rotation-down", unit: "s", better: "down" },
    { id: "audited", unit: "%", better: "up" },
  ],
  steps: [
    {
      id: "envfile",
      kind: "case",
      nodes: {
        dev: { kind: "actor", at: [0, 1] },
        repo: { kind: "storage", at: [0, 5] },
        orders: { kind: "service", at: [4, 3] },
        reports: { kind: "worker", at: [4, 7] },
        db: { kind: "db", at: [8, 6] },
      },
      edges: {
        push: { from: "dev", to: "repo", rate: 1 },
        deploy: { from: "repo", to: "orders", rate: 1 },
        deploy2: { from: "repo", to: "reports", rate: 1 },
        q: { from: "orders", to: "db", rate: 3 },
        q2: { from: "reports", to: "db", rate: 1 },
      },
      metrics: { copies: 9, blast: 5, "rotation-down": 0, audited: 0 },
      focus: ["repo", "orders", "db"],
      exchange: {
        edge: "deploy",
        request: {
          format: "text",
          head: "$ cat services/orders/.env",
          body: "DB_HOST=db.internal.example.com\nDB_USER=app\nDB_PASSWORD=***\n# same file in reports, billing, search, admin\n# committed 2024-03-02, never rotated",
        },
        marks: ["DB_USER", "DB_PASSWORD", "same file", "never rotated"],
      },
    },
    {
      id: "leak",
      kind: "problem",
      nodes: {
        intruder: { kind: "external", at: [12, 9] },
        repo: { state: "slow" },
      },
      edges: {
        steal: { from: "intruder", to: "db", flow: "fail", rate: 2 },
      },
      focus: ["repo", "intruder", "db"],
      exchange: {
        edge: "steal",
        request: {
          format: "text",
          head: "02:14:07 LOG  connection authorized: user=app database=shop",
          body: "02:14:07 LOG  client 203.0.113.50, not our network\n02:14:09 LOG  statement: COPY customers TO STDOUT\n02:16:51 LOG  disconnection: session time 0:02:44\n-- a laptop backup with the repo was public 3 days",
        },
        marks: ["connection authorized", "user=app", "203.0.113.50", "COPY"],
      },
    },
    {
      id: "rotate",
      kind: "problem",
      nodes: {
        intruder: null,
        orders: { state: "down" },
        reports: { state: "down" },
        repo: { state: "ok" },
      },
      edges: {
        q: { flow: "fail" },
        q2: { flow: "fail" },
      },
      metrics: { "rotation-down": 240, copies: 10 },
      focus: ["orders", "reports", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "02:31:00 admin   ALTER ROLE app PASSWORD '***'",
          body: "02:31:04 orders  FATAL: password authentication failed\n02:31:04 reports FATAL: password authentication failed\n02:31:05 orders  503 on /checkout, pool empty\n02:35:00 last of 5 services redeployed\n-- and the new password is in git again",
        },
        marks: ["ALTER ROLE", "password authentication failed", "503", "in git again"],
      },
    },
    {
      id: "manager",
      kind: "fix",
      nodes: {
        dev: null,
        repo: null,
        orders: { state: "ok" },
        reports: { state: "ok" },
        secrets: { kind: "service", at: [8, 1] },
      },
      edges: {
        q: { flow: "request" },
        q2: { flow: "request" },
        fetch: { from: "orders", to: "secrets", rate: 1 },
        fetch2: { from: "reports", to: "secrets", rate: 1 },
      },
      metrics: { copies: 2 },
      focus: ["orders", "secrets"],
      exchange: {
        edge: "fetch",
        request: {
          format: "http",
          head: "GET /v1/secret/shop/db HTTP/1.1",
          headers: [
            ["Host", "secrets.internal.example.com"],
            ["X-Secret-Token", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "version": 4,
  "data": {
    "username": "app",
    "password": "***"
  }
}`,
        },
        marks: ["X-Secret-Token", "version", "username"],
        masked: ["X-Secret-Token", "password"],
      },
    },
    {
      id: "identity",
      kind: "fix",
      nodes: { issuer: { kind: "external", at: [4, 0] } },
      edges: { verify: { from: "secrets", to: "issuer", rate: 1 } },
      metrics: { copies: 1 },
      focus: ["orders", "secrets", "issuer"],
      exchange: {
        edge: "fetch",
        request: {
          format: "json",
          head: "POST /v1/auth/workload/login HTTP/1.1",
          headers: [["Host", "secrets.internal.example.com"]],
          body: `{
  "role": "orders",
  "jwt": "***"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "client_token": "***",
  "policies": ["orders-db"],
  "ttl": 1800
}`,
        },
        marks: ["role", "jwt", "client_token", "policies", "ttl"],
        masked: ["jwt", "client_token"],
      },
    },
    {
      id: "dynamic",
      kind: "fix",
      edges: { make: { from: "secrets", to: "db", rate: 1 } },
      metrics: { blast: 1 },
      focus: ["orders", "secrets", "db"],
      exchange: {
        edge: "fetch",
        request: {
          format: "http",
          head: "GET /v1/database/creds/orders-rw HTTP/1.1",
          headers: [
            ["Host", "secrets.internal.example.com"],
            ["X-Secret-Token", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "lease_id": "database/creds/orders-rw/h7Kq",
  "lease_duration": 3600,
  "renewable": true,
  "data": {
    "username": "v-orders-h7Kq",
    "password": "***"
  }
}`,
        },
        marks: ["lease_id", "lease_duration", "renewable", "username"],
        masked: ["X-Secret-Token", "password"],
      },
    },
    {
      id: "role",
      kind: "case",
      edges: { make: { rate: 2 }, q2: { rate: 2 } },
      focus: ["secrets", "db"],
      exchange: {
        edge: "make",
        request: {
          format: "sql",
          head: "CREATE ROLE \"v-orders-h7Kq\" LOGIN PASSWORD '***'",
          body: "  VALID UNTIL '2026-11-18 15:00:00+00';\nGRANT SELECT, INSERT, UPDATE\n  ON orders, order_items TO \"v-orders-h7Kq\";\n-- lease expired or revoked:\nDROP ROLE \"v-orders-h7Kq\";",
        },
        response: { format: "text", head: "CREATE ROLE" },
        marks: ["CREATE ROLE", "VALID UNTIL", "GRANT", "DROP ROLE"],
      },
    },
    {
      id: "kms",
      kind: "fix",
      nodes: { kms: { kind: "external", at: [12, 0] } },
      edges: { unwrap: { from: "secrets", to: "kms", rate: 1 } },
      focus: ["secrets", "kms"],
      exchange: {
        edge: "unwrap",
        request: {
          format: "json",
          head: "POST /v1/keys/secrets-root/decrypt HTTP/1.1",
          headers: [
            ["Host", "kms.internal.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "key_id": "secrets-root",
  "wrapped_key": "AQICAHi3k0...Qw=="
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "plaintext": "***",
  "key_version": 3
}`,
        },
        marks: ["key_id", "wrapped_key", "plaintext", "key_version"],
        masked: ["Authorization", "plaintext"],
      },
    },
    {
      id: "rotation",
      kind: "fix",
      nodes: { partner: { kind: "external", at: [12, 4] } },
      edges: {
        call: { from: "orders", to: "partner", rate: 2 },
        rot: { from: "secrets", to: "partner", rate: 1 },
      },
      metrics: { "rotation-down": 0 },
      focus: ["secrets", "partner", "orders"],
      exchange: {
        edge: "rot",
        request: {
          format: "text",
          head: "03:00:00 rotate partner/api-key: created version 8",
          body: "03:00:00 version 7 still valid, overlap 24 h\n03:00:30 orders reloaded: 12/12 pods on version 8\n03:05:00 version 7 last used 03:00:29\n11-19 03:00 version 7 revoked at the partner",
        },
        marks: ["version 8", "still valid", "last used", "revoked"],
      },
    },
    {
      id: "audit",
      kind: "fix",
      nodes: { audit: { kind: "storage", at: [12, 7] } },
      edges: { log: { from: "secrets", to: "audit", rate: 2 } },
      metrics: { audited: 100 },
      focus: ["secrets", "audit", "reports"],
      exchange: {
        edge: "log",
        request: {
          format: "json",
          head: "audit.log",
          body: `{
  "time": "2026-11-18T14:02:11Z",
  "entity": "wl:reports/pod-2b1d",
  "path": "database/creds/orders-rw",
  "operation": "read",
  "result": "denied",
  "remote_addr": "198.51.100.17"
}`,
        },
        marks: ["entity", "path", "result", "remote_addr"],
      },
    },
    {
      id: "breakglass",
      kind: "case",
      nodes: {
        secrets: { state: "down" },
        oncall: { kind: "actor", at: [0, 9] },
        safe: { kind: "storage", at: [0, 12] },
      },
      edges: {
        fetch: { flow: "fail", rate: 1 },
        fetch2: { flow: "fail", rate: 1 },
        open: { from: "oncall", to: "safe", rate: 1 },
        bg: { from: "oncall", to: "db", flow: "retry", rate: 1 },
      },
      focus: ["oncall", "safe", "db"],
      exchange: {
        edge: "open",
        request: {
          format: "text",
          head: "04:12 BREAK-GLASS shop-db opened by oncall_1",
          body: "04:12 approved by oncall_2, two people required\n04:12 reason: INC-2291, secrets manager down\n04:12 credential bg-admin valid 60 min\n04:12 alert sent to security and service owners\n05:12 expired, password rotated after use",
        },
        marks: ["BREAK-GLASS", "approved by", "valid 60 min", "rotated after use"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
