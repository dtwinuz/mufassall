import { defineLesson } from "@mufassall/scene-schema";

/**
 * An orders API on 20 instances serves 2 000 requests/s, one 5 ms query each, against one
 * PostgreSQL with max_connections = 200. It starts by opening a new connection per request,
 * then gets a pool per instance, which multiplies past the database limit; Little's law sizes it,
 * the acquire timeout bounds the wait, leaks and long transactions are caught, a transaction-mode
 * pooler goes in front of the database, and idle timeouts are set below the network's. Numbers are
 * a model scenario in one region (0.5 ms round trip), not measurements.
 */
export default defineLesson({
  slug: "connection-pooling",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p99", unit: "ms", better: "down" },
    { id: "newconn", unit: "/s", better: "down" },
    { id: "conns", unit: "", better: "down" },
    { id: "dbmem", unit: "GB", better: "down" },
    { id: "wait", unit: "ms", better: "down" },
    { id: "err", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        web: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [4, 5], load: 45 },
        db: { kind: "db", at: [12, 5], load: 60 },
      },
      edges: {
        req: { from: "web", to: "api", rate: 6, mode: "call" },
        q: { from: "api", to: "db", rate: 6, mode: "call" },
      },
      metrics: { p99: 41, newconn: 2000, conns: 28, dbmem: 0.3, wait: 0, err: 0.1 },
      focus: ["web", "api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "one request, one new connection   (round trip 0.5 ms)",
          body: "0.0 ms   TCP SYN, SYN-ACK, ACK                      0.5 ms\n0.5 ms   server forks a backend process          1.2 ms\n1.7 ms   SSLRequest + TLS 1.3 handshake          2.4 ms\n4.1 ms   startup + SCRAM-SHA-256 auth            3.8 ms\n7.9 ms   SET application_name, search_path       0.6 ms\n8.5 ms   SELECT ... FROM orders WHERE id = $1    5.0 ms\n13.5 ms  Terminate, the process exits\n-- 8.5 ms of 13.5 ms is getting a connection, 2 000 times a second",
        },
        marks: ["TCP", "forks a backend process", "TLS 1.3", "SCRAM-SHA-256", "SELECT", "2 000 times a second"],
      },
    },
    {
      id: "pool",
      kind: "fix",
      nodes: { api: { load: 30 }, db: { load: 35 } },
      metrics: { p99: 16, newconn: 0.1, conns: 40, dbmem: 0.4, wait: 0.05 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "orders-api-3  pool  (copied from the library's example)",
          body: "maximum_pool_size     50\nminimum_idle          2\nconnection_timeout    30 000 ms   (the library default)\nborrow   -> run the query -> return, the connection stays open\nopened at start       2, reused about 100 times a second\n-- 20 instances x 2 = 40 connections open, almost no new ones",
        },
        marks: ["maximum_pool_size", "minimum_idle", "connection_timeout", "borrow", "reused"],
      },
    },
    {
      id: "too-many",
      kind: "problem",
      nodes: { db: { state: "slow", load: 100 }, api: { state: "slow", load: 90 } },
      edges: { q: { flow: "fail" }, req: { flow: "fail" } },
      metrics: { p99: 30000, conns: 197, dbmem: 2, wait: 30000, err: 14 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "Monday 09:00  a slow report query, every pool grows",
          body: "20 instances x maximum_pool_size 50   = 1 000 connections wanted\nmax_connections                        200   (3 kept for superusers)\nFATAL:  sorry, too many clients already\none connection = one OS process, about 10 MB\n1 000 x 10 MB = 10 GB of memory, on a 16-core machine\n-- requests wait 30 s in the pool, then fail",
        },
        marks: ["1 000 connections wanted", "max_connections", "FATAL", "one OS process", "16-core"],
      },
    },
    {
      id: "size",
      kind: "fix",
      nodes: { db: { state: "ok", load: 40 }, api: { state: "ok", load: 30 } },
      edges: { q: { flow: "request" }, req: { flow: "request" } },
      metrics: { p99: 16, conns: 60, dbmem: 0.6, wait: 0.05, err: 0.1 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "pool size from Little's law",
          body: "busy connections = rate x time per query\n                 = 2 000 /s x 0.005 s = 10   (all instances together)\nheadroom         x3 for bursts and slow queries = 30\nbudget           200 - 3 superuser - 17 cron, admin, replica = 180\nper instance     maximum_pool_size 5, minimum_idle 3\n-- 20 x 5 = 100 at most, 80 left for growth",
        },
        marks: ["rate x time", "= 10", "headroom", "budget", "per instance"],
      },
    },
    {
      id: "queue",
      kind: "case",
      metrics: { wait: 3 },
      focus: ["api"],
      exchange: {
        edge: "req",
        request: {
          format: "http",
          head: "GET /v1/orders/7781 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["Retry-After", "1"]],
          body: `{
  "error": "db_busy",
  "pool": { "active": 5, "idle": 0, "pending": 31 },
  "waited_ms": 250
}`,
        },
        marks: ["Retry-After", "active", "pending", "waited_ms"],
        masked: ["Authorization"],
      },
    },
    {
      id: "held",
      kind: "problem",
      nodes: { pay: { kind: "external", at: [8, 1] }, api: { state: "slow", load: 85 } },
      edges: { pc: { from: "api", to: "pay", rate: 2, mode: "call" }, req: { flow: "fail" } },
      metrics: { p99: 250, wait: 250, err: 3.2 },
      focus: ["api", "db", "pay"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "SELECT pid, state, now() - xact_start AS in_tx, query FROM pg_stat_activity WHERE usename = 'orders';",
          body: " pid  | state               | in_tx    | query\n 4411 | idle in transaction | 00:00:00.8 | UPDATE orders SET status = 'paid' ...\n 4415 | idle in transaction | 00:00:00.9 | UPDATE orders SET status = 'paid' ...\n 4502 | idle                | 00:41:12 | SELECT ... FROM orders WHERE id = $1\n-- 4411, 4415: a transaction is open while the API calls the payment provider\n-- 4502: borrowed 41 minutes ago on an error path and never returned",
        },
        marks: ["idle in transaction", "in_tx", "payment provider", "never returned"],
      },
    },
    {
      id: "held-fix",
      kind: "fix",
      nodes: { api: { state: "ok", load: 30 } },
      edges: { req: { flow: "request" } },
      metrics: { p99: 16, wait: 0.05, err: 0.1 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "text",
          head: "connections are borrowed briefly and always returned",
          body: "using conn = pool.acquire()        returned on every path, errors too\nleak_detection_threshold   2 000 ms   logs who held a connection longer\nALTER ROLE orders SET idle_in_transaction_session_timeout = '10s';\ncall the payment provider -> then BEGIN; UPDATE ...; COMMIT;   (4 ms)\n-- 50 refunds/s x 0.9 s = 45 connections held, now 50 x 0.004 s = 0.2",
        },
        marks: ["using", "leak_detection_threshold", "idle_in_transaction_session_timeout", "then BEGIN"],
      },
    },
    {
      id: "pooler",
      kind: "fix",
      nodes: { pooler: { kind: "service", at: [8, 5], load: 20 } },
      edges: {
        q: null,
        ap: { from: "api", to: "pooler", rate: 6, mode: "call" },
        pd: { from: "pooler", to: "db", rate: 6, mode: "call" },
      },
      metrics: { conns: 25, dbmem: 0.25 },
      focus: ["api", "pooler", "db"],
      exchange: {
        edge: "pd",
        request: {
          format: "text",
          head: "pooler in front of the database",
          body: "pool_mode            transaction\nmax_client_conn      2 000      cheap: no process per client\ndefault_pool_size    25         real connections to the database\nclients now          100 (20 instances x 5), 400 when doubled\nserver connections   25, at the same 2 000 requests/s\n-- a server connection belongs to a client only until COMMIT",
        },
        marks: ["pool_mode", "max_client_conn", "default_pool_size", "server connections", "until COMMIT"],
      },
    },
    {
      id: "txn-mode",
      kind: "problem",
      edges: { ap: { flow: "fail" } },
      metrics: { err: 0.7 },
      focus: ["api", "pooler"],
      exchange: {
        edge: "ap",
        request: {
          format: "text",
          head: "what breaks in transaction mode",
          body: "ERROR:  prepared statement \"S_3\" does not exist\nSET search_path = tenant_42;      the next client on that connection gets tenant_42\nSELECT pg_advisory_lock(7);       the unlock arrives on another connection\nLISTEN order_events;              nobody keeps listening after the query\n-- every case keeps state in the session, and the session is shared",
        },
        marks: ["prepared statement", "SET search_path", "pg_advisory_lock", "LISTEN", "session"],
      },
    },
    {
      id: "idle",
      kind: "problem",
      nodes: { nlb: { kind: "lb", at: [6, 8] }, api: { state: "slow", load: 40 } },
      edges: {
        ap: null,
        an: { from: "api", to: "nlb", rate: 6, mode: "call", flow: "fail" },
        np: { from: "nlb", to: "pooler", rate: 6, mode: "call" },
      },
      metrics: { p99: 15600, err: 0.4 },
      focus: ["api", "nlb", "pooler"],
      exchange: {
        edge: "an",
        request: {
          format: "text",
          head: "06:58  first requests after a quiet night",
          body: "internal TCP balancer   idle_timeout 350 s, then forgets the flow, sends nothing\npool                    idle connections kept for 600 s\n06:58:02  query sent on a connection idle since 03:10\n06:58:02  no answer, TCP retransmits ...\n06:58:17  socket timeout 15 s -> error, pool opens a new connection\n-- without a socket timeout the kernel retries for about 15 minutes",
        },
        marks: ["idle_timeout 350 s", "600 s", "retransmits", "socket timeout", "15 minutes"],
      },
    },
    {
      id: "keepalive",
      kind: "fix",
      nodes: { api: { state: "ok", load: 30 } },
      edges: { an: { flow: "request" }, pc: { rate: 2 } },
      metrics: { p99: 16, err: 0.1 },
      focus: ["api", "nlb", "pay"],
      exchange: {
        edge: "pc",
        request: {
          format: "text",
          head: "orders-api-3  every pool closes its own idle connections first",
          body: "db pool     idle_timeout 300 s  < balancer 350 s,  max_lifetime 1 800 s +- 10%\n            tcp_keepalive 60 s: a silent connection is found in about 1 minute\nhttp pool   to the payment provider, keep-alive\n            new connection   TCP + TLS, 9 ms round trip = 31 ms\n            reused           0 ms extra, 96% of requests\n            server Keep-Alive: timeout=60   client idle_timeout 50 s\n            max_per_host 20\n-- reset on a reused socket: retry only an idempotent request",
        },
        marks: ["max_lifetime", "tcp_keepalive", "keep-alive", "new connection", "reused", "Keep-Alive", "max_per_host", "idempotent"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "autoscale",
      from: "size",
      steps: [
        {
          id: "scale-out",
          kind: "problem",
          nodes: { api: { state: "slow", load: 70 }, db: { state: "slow", load: 100 } },
          edges: { q: { flow: "fail" }, req: { flow: "fail" } },
          metrics: { conns: 197, dbmem: 2, wait: 30000, err: 9 },
          focus: ["api", "db"],
          exchange: {
            edge: "q",
            request: {
              format: "text",
              head: "11:40  a sale starts, CPU 80%, the autoscaler doubles the API",
              body: "instances               20 -> 40\nper instance            maximum_pool_size 5\nwanted                  40 x 5 + 17 others = 217 > 200\nFATAL:  remaining connection slots are reserved for superuser\nnew instances fail their readiness check and restart\n-- the database was the bottleneck: more callers only add waiting",
            },
            marks: ["20 -> 40", "217 > 200", "remaining connection slots", "readiness", "bottleneck"],
          },
        },
        {
          id: "scale-fix",
          kind: "fix",
          nodes: { api: { state: "ok", load: 35 }, db: { state: "ok", load: 55 } },
          edges: { q: { flow: "request" }, req: { flow: "request" } },
          metrics: { conns: 160, dbmem: 1.6, wait: 4, err: 0.1 },
          focus: ["api", "db"],
          exchange: {
            edge: "q",
            request: {
              format: "text",
              head: "the pool size and the autoscaler share one budget",
              body: "budget                  180 connections\nmax_replicas            40   (written next to the pool size)\nmaximum_pool_size       floor(180 / 40) = 4\nalert                   connections > 80% of max_connections\n-- 40 x 4 = 160: doubling fits; tripling needs a pooler first",
            },
            marks: ["budget", "max_replicas", "floor(180 / 40)", "alert", "pooler"],
          },
        },
      ],
    },
  ],
});
