import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online shop keeps orders in a SQL database and must mirror every change to a search index
 * and later to a data warehouse. Writing to the database and to the event log from the same code
 * (dual write) loses events; reading the database's own change log (CDC) does not.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "cdc",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "missing", unit: "", better: "down" },
    { id: "stale", unit: "s", better: "down" },
    { id: "wal", unit: "GB", better: "down" },
    { id: "dups", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "dual-write",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [3, 3] },
        db: { kind: "db", at: [6, 2], load: 30 },
        topic: { kind: "queue", at: [9, 7] },
        search: { kind: "service", at: [12, 5] },
      },
      edges: {
        order: { from: "client", to: "api", rate: 3 },
        write: { from: "api", to: "db", rate: 3 },
        publish: { from: "api", to: "topic", rate: 3 },
        index: { from: "topic", to: "search", rate: 3 },
      },
      metrics: { missing: 0, stale: 1, wal: 2, dups: 0 },
      focus: ["api", "db", "topic"],
      exchange: {
        edge: "publish",
        request: {
          format: "json",
          head: "PRODUCE orders-events",
          headers: [["key", "5521"]],
          body: `{
  "order_id": 5521,
  "status": "paid",
  "total": 129000
}`,
        },
        response: { format: "text", head: "OK partition 3, offset 88123" },
        marks: ["key", "status", "offset"],
      },
    },
    {
      id: "lost-event",
      kind: "problem",
      nodes: { api: { state: "down" }, search: { state: "slow" } },
      edges: { publish: { flow: "fail", cut: true } },
      metrics: { missing: 340, stale: 86400 },
      focus: ["api", "db", "search"],
      exchange: {
        edge: "publish",
        request: {
          format: "text",
          head: "10:00:01.120 COMMIT order 5521 status=paid",
          body: "10:00:01.125 PRODUCE orders-events key=5521\n10:00:06.125 timeout after 5000 ms\n10:00:06.300 api pod restarted by a deploy\n-- the row says paid, the event never left",
        },
        marks: ["COMMIT", "timeout", "restarted"],
      },
    },
    {
      id: "log",
      kind: "fix",
      nodes: {
        api: { state: "ok" },
        search: { state: "ok" },
        connector: { kind: "worker", at: [6, 7], load: 25 },
      },
      edges: {
        publish: null,
        tail: { from: "db", to: "connector", rate: 3 },
        emit: { from: "connector", to: "topic", rate: 3 },
      },
      metrics: { missing: 0, stale: 2 },
      focus: ["db", "connector", "topic"],
      exchange: {
        edge: "tail",
        request: {
          format: "text",
          head: "START_REPLICATION SLOT shop_cdc LOGICAL 0/1A2B3C0",
          body: "-- the database streams every committed change, in commit order\nlsn=0/1A2B3C8 table=orders op=UPDATE id=5521",
        },
        marks: ["SLOT", "LOGICAL", "lsn"],
      },
    },
    {
      id: "event",
      kind: "case",
      focus: ["connector", "topic"],
      exchange: {
        edge: "emit",
        request: {
          format: "json",
          head: "PRODUCE shop.public.orders",
          headers: [["key", '{"id": 5521}']],
          body: `{
  "op": "u",
  "before": { "status": "pending" },
  "after": { "status": "paid", "total": 129000 },
  "source": { "table": "orders", "lsn": 439554024 },
  "ts_ms": 1763452801125
}`,
        },
        marks: ["key", "op", "before", "after", "lsn"],
      },
    },
    {
      id: "ordering",
      kind: "problem",
      nodes: { search: { state: "slow" } },
      edges: { index: { flow: "dup" } },
      metrics: { stale: 2, missing: 12 },
      focus: ["topic", "search"],
      exchange: {
        edge: "index",
        request: {
          format: "text",
          head: "search consumer, 2 threads, round-robin partitions",
          body: "p3 order 5521 status=paid    applied 10:00:02.010\np7 order 5521 status=pending applied 10:00:02.040\n-- the older change landed last: search says pending",
        },
        marks: ["round-robin", "p3", "p7"],
      },
    },
    {
      id: "keyed",
      kind: "fix",
      nodes: { search: { state: "ok" } },
      edges: { index: { flow: "request" } },
      metrics: { missing: 0 },
      focus: ["connector", "topic", "search"],
      exchange: {
        edge: "emit",
        request: {
          format: "text",
          head: "connector config: orders",
          body: "key = primary key (orders.id)\npartition = hash(key) % 12\n-- every change of order 5521 lands in one partition, in lsn order\nconsumer: skip if event.lsn <= doc.lsn",
        },
        marks: ["primary key", "partition", "skip"],
      },
    },
    {
      id: "crash",
      kind: "case",
      nodes: { connector: { load: 80 } },
      edges: { emit: { flow: "dup", rate: 6 } },
      metrics: { dups: 412 },
      focus: ["connector", "topic"],
      exchange: {
        edge: "emit",
        request: {
          format: "text",
          head: "connector restarted, stored offset lsn=0/1A2B000",
          body: "re-sending 412 changes already in the topic\nsearch: doc 5521 has lsn 0/1A2B3C8 >= event lsn, skip",
        },
        marks: ["stored offset", "412", "skip"],
      },
    },
    {
      id: "slot",
      kind: "problem",
      nodes: { connector: { state: "down", load: 0 }, db: { state: "slow", load: 92 } },
      edges: { tail: { cut: true, flow: "fail" }, emit: { rate: 0, flow: "request" } },
      metrics: { wal: 180, stale: 172800, dups: 0 },
      focus: ["db", "connector"],
      exchange: {
        edge: "tail",
        request: {
          format: "text",
          head: "pg_replication_slots: shop_cdc active=false since Saturday",
          body: "retained WAL: 180 GB, disk 92% full\n-- the slot keeps every change the connector has not confirmed",
        },
        response: { format: "text", head: "alert: slot lag > 10 GB for 15 min" },
        marks: ["active", "retained WAL", "alert"],
      },
    },
    {
      id: "snapshot",
      kind: "fix",
      nodes: {
        connector: { state: "ok", load: 60 },
        db: { state: "ok", load: 40 },
        warehouse: { kind: "db", at: [12, 10] },
      },
      edges: {
        tail: { cut: false, flow: "request", rate: 4 },
        emit: { rate: 4 },
        load: { from: "topic", to: "warehouse", rate: 4 },
      },
      metrics: { wal: 3, stale: 2 },
      focus: ["db", "connector", "warehouse"],
      exchange: {
        edge: "tail",
        request: {
          format: "sql",
          head: "BEGIN ISOLATION LEVEL REPEATABLE READ;",
          body: "SELECT pg_current_wal_lsn();  -- 0/2C000000\nSELECT * FROM orders;         -- 2140000 rows, sent as op=r\nCOMMIT;\n-- then stream changes from 0/2C000000",
        },
        marks: ["REPEATABLE READ", "op=r", "stream"],
      },
    },
    {
      id: "schema",
      kind: "problem",
      nodes: { warehouse: { state: "slow" } },
      edges: { load: { flow: "fail" } },
      focus: ["db", "warehouse"],
      exchange: {
        edge: "load",
        request: {
          format: "sql",
          head: "ALTER TABLE orders RENAME COLUMN total TO total_amount;",
        },
        response: {
          format: "text",
          head: "warehouse: field total missing in 18400 events",
          body: "daily revenue report: 0",
        },
        marks: ["RENAME COLUMN", "missing", "revenue"],
      },
    },
    {
      id: "outbox",
      kind: "fix",
      nodes: { warehouse: { state: "ok" } },
      edges: { load: { flow: "request" } },
      focus: ["api", "db", "connector"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "UPDATE orders SET status = 'paid' WHERE id = 5521;\nINSERT INTO outbox (aggregate_id, type, payload)\n  VALUES (5521, 'OrderPaid', '{\"total\": 129000}');\nCOMMIT;\n-- the connector reads only the outbox table",
        },
        marks: ["outbox", "OrderPaid", "COMMIT"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
