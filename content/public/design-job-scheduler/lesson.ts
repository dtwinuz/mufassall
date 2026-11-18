import { defineLesson } from "@mufassall/scene-schema";

/**
 * A scheduler for millions of delayed and recurring jobs ("send at 09:00", cron), built step
 * by step: one cron box and its failover, a jobs table claimed with `FOR UPDATE SKIP LOCKED`,
 * leases with heartbeats, idempotency for at-least-once runs, retries with backoff and a
 * dead-letter table, and the 09:00 spike with time partitions and per-tenant fairness.
 * Numbers are a model scenario.
 */
export default defineLesson({
  slug: "design-job-scheduler",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "lag", unit: "s", better: "down" },
    { id: "missed", unit: "/day", better: "down" },
    { id: "dupes", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "cron",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        cron: { kind: "service", at: [4, 4], load: 40 },
        mail: { kind: "external", at: [12, 4] },
      },
      edges: {
        create: { from: "app", to: "cron", rate: 2 },
        send: { from: "cron", to: "mail", rate: 3 },
      },
      metrics: { lag: 1, missed: 0, dupes: 0 },
      focus: ["app", "cron"],
      exchange: {
        edge: "create",
        request: {
          format: "text",
          head: "$ crontab -l        # on cron-a",
          body: "0 9 * * *     /opt/jobs/send-digest --tenant t_17\n*/5 * * * *   /opt/jobs/sync-rates\n# one-off lines appended by the API:\n0 9 19 11 *   /opt/jobs/remind --user u_42 --once",
        },
        marks: ["0 9 * * *", "*/5", "--once"],
      },
    },
    {
      id: "failover",
      kind: "problem",
      nodes: {
        cron: { state: "slow" },
        cron2: { kind: "service", at: [4, 8], load: 40 },
      },
      edges: {
        create2: { from: "app", to: "cron2", rate: 2 },
        send: { flow: "dup" },
        send2: { from: "cron2", to: "mail", flow: "dup", rate: 3 },
      },
      metrics: { missed: 4200, dupes: 3100 },
      focus: ["cron", "cron2", "mail"],
      exchange: {
        edge: "send2",
        request: {
          format: "text",
          head: "08:12 cron-a  unreachable, jobs 08:15..08:50 never ran",
          body: "08:52 cron-b  promoted by hand, crontab copied\n08:55 cron-a  came back after the network blip\n09:00 cron-a  send-digest --tenant t_17  (1 204 sent)\n09:00 cron-b  send-digest --tenant t_17  (1 204 sent)",
        },
        marks: ["never ran", "promoted", "came back", "cron-b"],
      },
    },
    {
      id: "table",
      kind: "fix",
      nodes: {
        cron: null,
        cron2: null,
        api: { kind: "service", at: [3, 4], load: 20 },
        db: { kind: "db", at: [7, 4], load: 35 },
        w1: { kind: "worker", at: [10, 1], load: 40 },
        w2: { kind: "worker", at: [10, 7], load: 40 },
      },
      edges: {
        create: { from: "app", to: "api", rate: 2 },
        insert: { from: "api", to: "db", rate: 2 },
        poll1: { from: "w1", to: "db", rate: 3 },
        poll2: { from: "w2", to: "db", rate: 3 },
        send1: { from: "w1", to: "mail", flow: "dup", rate: 3 },
        send2: { from: "w2", to: "mail", flow: "dup", rate: 3 },
      },
      metrics: { missed: 0, dupes: 900, lag: 2 },
      focus: ["api", "db", "w1", "w2"],
      exchange: {
        edge: "insert",
        request: {
          format: "json",
          head: "INSERT INTO jobs   -- the row, as JSON",
          body: `{
  "id": "j_8812",
  "tenant": "t_17",
  "type": "send_digest",
  "run_at": "2026-11-19T04:00:00Z",
  "status": "queued",
  "attempt": 0,
  "max_attempts": 8
}`,
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["run_at", "status", "attempt", "max_attempts"],
      },
    },
    {
      id: "claim",
      kind: "fix",
      nodes: { db: { load: 40 } },
      edges: { send1: { flow: "request" }, send2: { flow: "request" } },
      metrics: { dupes: 0, lag: 1 },
      focus: ["db", "w1", "w2"],
      exchange: {
        edge: "poll1",
        request: {
          format: "sql",
          head: "WITH picked AS (",
          body: "  SELECT id FROM jobs\n   WHERE status = 'queued' AND run_at <= now()\n   ORDER BY run_at\n   LIMIT 50\n   FOR UPDATE SKIP LOCKED)\nUPDATE jobs SET status = 'running', locked_by = 'w-1'\n  FROM picked WHERE jobs.id = picked.id\nRETURNING jobs.id, jobs.type;",
        },
        response: {
          format: "text",
          head: "50 rows, 3.1 ms",
          body: "w-2 ran the same query in the same millisecond\nand got the next 50: no row is handed out twice",
        },
        marks: ["run_at", "LIMIT", "FOR UPDATE", "SKIP LOCKED", "RETURNING"],
      },
    },
    {
      id: "dies",
      kind: "problem",
      nodes: { w2: { state: "down" } },
      edges: { send2: { cut: true }, poll2: { cut: true } },
      metrics: { missed: 300 },
      focus: ["w2", "db"],
      exchange: {
        edge: "poll1",
        request: {
          format: "sql",
          head: "SELECT id, locked_by, now() - updated_at AS stuck",
          body: "  FROM jobs WHERE status = 'running'\n ORDER BY stuck DESC LIMIT 3;",
        },
        response: {
          format: "text",
          head: "j_8840 | w-2 | 00:47:12",
          body: "j_8841 | w-2 | 00:47:12\nj_8842 | w-2 | 00:47:11\n-- w-2 was killed at 09:00:05; 50 jobs wait forever",
        },
        marks: ["locked_by", "running", "w-2", "wait forever"],
      },
    },
    {
      id: "lease",
      kind: "fix",
      nodes: { w2: { state: "ok" } },
      edges: { send2: { cut: false }, poll2: { cut: false }, send1: { flow: "dup" } },
      metrics: { missed: 0, dupes: 40 },
      focus: ["w1", "w2", "db"],
      exchange: {
        edge: "poll1",
        request: {
          format: "sql",
          head: "UPDATE jobs",
          body: "   SET lease_until = now() + interval '30 seconds'\n WHERE id = 'j_8812' AND locked_by = 'w-1'\nRETURNING lease_until;\n-- every 10 s while the job runs\n-- claim also takes rows WHERE lease_until < now()",
        },
        response: { format: "text", head: "lease_until = 09:00:41+05", body: "UPDATE 0 would mean: the lease is gone, stop now" },
        marks: ["lease_until", "now()", "locked_by", "UPDATE 0"],
      },
    },
    {
      id: "idempotent",
      kind: "fix",
      edges: { send1: { flow: "request" } },
      metrics: { dupes: 0 },
      focus: ["w1", "mail"],
      exchange: {
        edge: "send1",
        request: {
          format: "http",
          head: "POST /v1/messages HTTP/1.1",
          headers: [
            ["Host", "mail.example.net"],
            ["Authorization", "***"],
            ["Idempotency-Key", "j_8812:2026-11-19T04:00Z"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "message_id": "m_55120",
  "replayed": true
}`,
        },
        marks: ["Idempotency-Key", "message_id", "replayed"],
        masked: ["Authorization"],
      },
    },
    {
      id: "storm",
      kind: "problem",
      nodes: { mail: { state: "slow" }, w1: { load: 95 }, w2: { load: 95 } },
      edges: { send1: { flow: "retry", rate: 12 }, send2: { flow: "retry", rate: 12 } },
      metrics: { missed: 6000, lag: 45 },
      focus: ["w1", "w2", "mail"],
      exchange: {
        edge: "send2",
        request: {
          format: "http",
          head: "POST /v1/messages HTTP/1.1",
          headers: [
            ["Host", "mail.example.net"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "text",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "120"]],
          body: "-- workers retry at once, 3 times in 200 ms,\n-- then mark the job failed: 6 000 digests lost",
        },
        marks: ["503", "Retry-After", "at once", "failed"],
        masked: ["Authorization"],
      },
    },
    {
      id: "backoff",
      kind: "fix",
      nodes: {
        mail: { state: "ok" },
        w1: { load: 45 },
        w2: { load: 45 },
        dlq: { kind: "db", at: [12, 10] },
      },
      edges: {
        send1: { flow: "request", rate: 3 },
        send2: { flow: "request", rate: 3 },
        dead: { from: "w2", to: "dlq", flow: "fail", rate: 1 },
      },
      metrics: { missed: 0, lag: 2 },
      focus: ["w2", "dlq"],
      exchange: {
        edge: "dead",
        request: {
          format: "text",
          head: "09:41:07 WARN job j_9310 attempt 8/8: 550 mailbox does not exist",
          body: "-> moved to dead_jobs  reason=permanent  first_error=09:00:02\n   delays were 30s 1m 2m 4m 8m 16m 32m, each +-20% jitter\n   replay: POST /v1/dead-jobs/j_9310/replay",
        },
        marks: ["8/8", "550", "dead_jobs", "jitter", "replay"],
      },
    },
    {
      id: "peak",
      kind: "problem",
      nodes: {
        app2: { kind: "client", at: [0, 8] },
        api: { load: 85 },
        db: { state: "slow", load: 96 },
      },
      edges: { bulk: { from: "app2", to: "api", rate: 10 } },
      metrics: { lag: 900 },
      focus: ["app2", "db"],
      exchange: {
        edge: "poll2",
        request: {
          format: "sql",
          head: "SELECT tenant, count(*) AS due, max(now() - run_at) AS late",
          body: "  FROM jobs WHERE status = 'queued' AND run_at <= now()\n GROUP BY tenant ORDER BY due DESC;",
        },
        response: {
          format: "text",
          head: "t_9    1 480 220   00:14:51",
          body: "t_17       1 204   00:15:02\nt_3           88   00:14:58\n-- jobs: 41M dead tuples, the run_at index is bloated",
        },
        marks: ["due", "late", "t_9", "dead tuples"],
      },
    },
    {
      id: "fair",
      kind: "fix",
      nodes: { db: { state: "ok", load: 50 }, api: { load: 45 } },
      edges: { bulk: { rate: 4 } },
      metrics: { lag: 3 },
      focus: ["db", "w1", "w2"],
      exchange: {
        edge: "poll1",
        request: {
          format: "sql",
          head: "SELECT j.id FROM active_tenants t",
          body: "CROSS JOIN LATERAL (\n  SELECT id FROM jobs_2026_11_19_09\n   WHERE tenant = t.id AND status = 'queued'\n     AND run_at <= now()\n   ORDER BY run_at LIMIT 5\n   FOR UPDATE SKIP LOCKED) j;\n-- 10:00 next hour; 3 days later DROP TABLE, no DELETE",
        },
        response: { format: "text", head: "50 rows from 10 tenants, 2.4 ms" },
        marks: ["LATERAL", "jobs_2026_11_19_09", "LIMIT 5", "DROP TABLE"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
