import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop's purchase service saves a purchase and then publishes `PurchaseCompleted` so the
 * loyalty service can credit points. Two writes to two systems: the publish sometimes fails after
 * the commit and points are lost. The event moves into an outbox table in the same transaction, a
 * relay publishes it (at least once), the consumer drops duplicates by event id in its own
 * transaction, events are keyed by purchase so they stay in order, sent rows are cleaned up and
 * polling is compared with reading the database log. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "outbox-pattern",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "lost", unit: "/day", better: "down" },
    { id: "dups", unit: "/day", better: "down" },
    { id: "misorder", unit: "/day", better: "down" },
    { id: "delay", unit: "ms", better: "down" },
    { id: "unsent", unit: "", better: "down" },
    { id: "rows", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "buy",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [4, 9] },
        broker: { kind: "queue", at: [8, 1] },
        loyalty: { kind: "service", at: [12, 1] },
        ldb: { kind: "db", at: [12, 6] },
      },
      edges: {
        buy: { from: "app", to: "api", rate: 3, mode: "call" },
        save: { from: "api", to: "db", rate: 3 },
        publish: { from: "api", to: "broker", rate: 3, mode: "async" },
        deliver: { from: "broker", to: "loyalty", rate: 3, mode: "async" },
        credit: { from: "loyalty", to: "ldb", rate: 3 },
      },
      metrics: { lost: 0, dups: 0, misorder: 0, delay: 4, unsent: 0, rows: 0 },
      focus: ["api", "db", "broker"],
      exchange: {
        edge: "publish",
        request: {
          format: "text",
          head: "POST /v1/purchases  ->  purchase p_9051",
          body: "1  BEGIN\n2  INSERT INTO purchases (id, user_id, total_minor) ...\n3  COMMIT                                       ok  3 ms\n4  broker.publish(\"purchases\", PurchaseCompleted)  ok  4 ms\n-- two writes, two systems, no shared transaction",
        },
        marks: ["COMMIT", "publish", "two systems"],
      },
    },
    {
      id: "dualwrite",
      kind: "problem",
      nodes: { broker: { state: "slow" } },
      edges: { publish: { flow: "fail" } },
      metrics: { lost: 60 },
      focus: ["api", "broker"],
      exchange: {
        edge: "publish",
        request: {
          format: "text",
          head: "21:14:07.120  p_9188  COMMIT ok",
          body: "21:14:07.123  p_9188  publish PurchaseCompleted\n21:14:09.123  p_9188  publish timeout after 2000 ms\n21:14:09.124  p_9188  HTTP 201 to the app\n-- the purchase is saved, the points never arrive\n-- 300 000 purchases/day x 0.02% = 60 lost events/day",
        },
        marks: ["COMMIT", "timeout", "201", "lost events"],
      },
    },
    {
      id: "outbox",
      kind: "fix",
      nodes: { broker: { state: "ok" } },
      edges: { publish: null },
      metrics: { lost: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO purchases (id, user_id, total_minor)\n  VALUES ('p_9188', 'u_42', 2490000);\nINSERT INTO outbox (id, aggregate_id, type, payload)\n  VALUES ('evt_01HV9Q', 'p_9188', 'PurchaseCompleted',\n          '{\"user_id\":\"u_42\",\"points\":249}');\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT  3 ms  (both rows or none)" },
        marks: ["purchases", "outbox", "aggregate_id", "COMMIT"],
      },
    },
    {
      id: "relay",
      kind: "fix",
      nodes: { relay: { kind: "worker", at: [8, 7] } },
      edges: {
        poll: { from: "relay", to: "db", rate: 2 },
        emit: { from: "relay", to: "broker", rate: 3, mode: "async" },
      },
      metrics: { delay: 260 },
      focus: ["relay", "db", "broker"],
      exchange: {
        edge: "poll",
        request: {
          format: "sql",
          head: "SELECT id, aggregate_id, type, payload FROM outbox",
          body: " WHERE sent_at IS NULL\n ORDER BY id\n LIMIT 200\n   FOR UPDATE SKIP LOCKED;\n-- publish all 200, wait for the broker acks\nUPDATE outbox SET sent_at = now() WHERE id = ANY($1);\nCOMMIT;\n-- again in 500 ms",
        },
        marks: ["sent_at", "LIMIT", "SKIP LOCKED", "acks", "500 ms"],
      },
    },
    {
      id: "dups",
      kind: "problem",
      edges: { emit: { flow: "dup" }, deliver: { flow: "dup" } },
      metrics: { dups: 600 },
      focus: ["relay", "broker", "loyalty"],
      exchange: {
        edge: "deliver",
        request: {
          format: "text",
          head: "21:30:01  loyalty  evt_01HV9Q  PurchaseCompleted p_9188  +249 points",
          body: "21:30:02  relay pod killed after publish, before UPDATE sent_at\n21:30:09  relay restarted: the same 200 rows are still unsent, re-sent\n21:30:09  loyalty  evt_01HV9Q  PurchaseCompleted p_9188  +249 points\n-- balance of u_42: 498 instead of 249",
        },
        marks: ["evt_01HV9Q", "+249", "re-sent", "498"],
      },
    },
    {
      id: "inbox",
      kind: "fix",
      edges: { emit: { flow: "request" }, deliver: { flow: "request" } },
      metrics: { dups: 0 },
      focus: ["loyalty", "ldb"],
      exchange: {
        edge: "credit",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO processed_events (event_id)\n  VALUES ('evt_01HV9Q')\n  ON CONFLICT (event_id) DO NOTHING;\n-- 0 rows: seen before -> ROLLBACK, ack, skip\nUPDATE balances SET points = points + 249\n WHERE user_id = 'u_42';\nCOMMIT;",
        },
        response: { format: "text", head: "INSERT 0 0  -> duplicate, skipped" },
        marks: ["processed_events", "ON CONFLICT", "0 rows", "COMMIT", "INSERT 0 0"],
      },
    },
    {
      id: "ordering",
      kind: "problem",
      nodes: { relay: { load: 70 }, loyalty: { state: "slow" } },
      edges: { deliver: { flow: "fail" }, emit: { rate: 6 } },
      metrics: { misorder: 35 },
      focus: ["relay", "broker", "loyalty"],
      exchange: {
        edge: "deliver",
        request: {
          format: "text",
          head: "partition 3  offset 88120  PurchaseRefunded   p_9188",
          body: "partition 5  offset 90411  PurchaseCompleted  p_9188\n-- two relay pods: A took rows 1..200, B took 201..400, B was faster\n-- no key on the message -> the two events land in different partitions\nloyalty: refund of 249 points on a balance of 0 -> rejected\nloyalty: +249 points for a purchase that was refunded",
        },
        marks: ["partition", "PurchaseRefunded", "key", "rejected"],
      },
    },
    {
      id: "keyed",
      kind: "fix",
      nodes: { loyalty: { state: "ok" } },
      edges: { deliver: { flow: "request" } },
      metrics: { misorder: 0 },
      focus: ["relay", "broker", "loyalty"],
      exchange: {
        edge: "emit",
        request: {
          format: "json",
          head: "produce topic=purchase-events",
          body: `{
  "key": "p_9188",
  "headers": {
    "event_id": "evt_01HV9R",
    "aggregate_version": 2
  },
  "value": {
    "type": "PurchaseRefunded",
    "points": -249
  }
}`,
        },
        response: { format: "text", head: "ack  partition 3  offset 88121" },
        marks: ["key", "event_id", "aggregate_version", "value", "partition"],
      },
    },
    {
      id: "bloat",
      kind: "problem",
      nodes: { db: { state: "slow" } },
      edges: { poll: { flow: "fail" } },
      metrics: { rows: 27600000, delay: 1130 },
      focus: ["relay", "db"],
      exchange: {
        edge: "poll",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE SELECT ... FROM outbox WHERE sent_at IS NULL LIMIT 200;",
        },
        response: {
          format: "text",
          head: "Index Scan using outbox_unsent  (rows=200)",
          body: "  table: 27.6 M rows, 92 days of sent events\n  index: 1.9 GB of dead entries for 1 200 live rows\nExecution Time: 870 ms   (2 ms in the first week)\n-- twice a second, on the primary",
        },
        marks: ["sent_at", "27.6 M rows", "dead entries", "Execution Time"],
      },
    },
    {
      id: "cleanup",
      kind: "fix",
      nodes: { db: { state: "ok" } },
      edges: { poll: { flow: "request" } },
      metrics: { rows: 900000, delay: 260 },
      focus: ["relay", "db"],
      exchange: {
        edge: "poll",
        request: {
          format: "sql",
          head: "DELETE FROM outbox",
          body: " WHERE id IN (SELECT id FROM outbox\n              WHERE sent_at < now() - interval '3 days'\n              LIMIT 5000);\n-- every minute, until it deletes 0 rows\n-- or: one partition per day, DROP the old ones",
        },
        response: { format: "text", head: "DELETE 5000" },
        marks: ["sent_at", "3 days", "LIMIT", "DROP", "DELETE 5000"],
      },
    },
    {
      id: "logtail",
      kind: "fix",
      edges: { poll: { rate: 3 } },
      metrics: { delay: 40 },
      focus: ["db", "relay"],
      exchange: {
        edge: "poll",
        request: {
          format: "text",
          head: "relay mode=log  slot outbox_slot",
          body: "read the WAL from lsn 0/3A1F2B8\nINSERT outbox evt_01HV9S  -> publish, 38 ms after COMMIT\nno SELECT every 500 ms, no UPDATE of sent_at\nconfirm lsn 0/3A1F3C0 only after the broker ack",
        },
        marks: ["slot", "WAL", "38 ms", "sent_at", "confirm"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "broker-down",
      from: "keyed",
      steps: [
        {
          id: "down-pile",
          kind: "problem",
          nodes: { broker: { state: "down" } },
          edges: { emit: { flow: "fail", rate: 1 }, deliver: { rate: 0 } },
          metrics: { unsent: 1200, delay: 30000 },
          focus: ["relay", "broker", "db"],
          exchange: {
            edge: "emit",
            request: {
              format: "text",
              head: "21:40:00.0  relay  publish batch of 200  -> connection refused",
              body: "21:40:00.5  retry in 0.5 s\n21:40:01.5  retry in 1 s\n21:40:03.5  retry in 2 s, then every 5 s at most\n-- the app still gets 201: purchases commit with their outbox rows\n-- unsent rows: 40/s x 30 s = 1 200",
            },
            marks: ["connection refused", "retry", "201", "unsent rows"],
          },
        },
        {
          id: "down-drain",
          kind: "fix",
          nodes: { broker: { state: "ok" }, relay: { load: 90 } },
          edges: { emit: { flow: "request", rate: 8 }, deliver: { rate: 8 } },
          metrics: { unsent: 0, delay: 260, lost: 0 },
          focus: ["relay", "broker", "loyalty"],
          exchange: {
            edge: "emit",
            request: {
              format: "text",
              head: "21:40:30.0  relay  broker reachable again",
              body: "21:40:30.2  batches 1..6 of 200, in id order for each key\n21:40:31.9  unsent rows: 0\n-- the oldest event waited 31 s; none lost, none out of order\n-- the batch that was in flight at 21:40:00 comes twice: dedup drops it",
            },
            marks: ["in id order", "unsent rows", "31 s", "dedup"],
          },
        },
      ],
    },
  ],
});
