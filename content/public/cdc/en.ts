import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Change data capture (CDC)",
  summary:
    "An online shop keeps orders in SQL and has to mirror every change into a search index and a data warehouse. Writing to the database and to the event log from the same code loses events. Reading the database's own change log does not, as long as you handle ordering, restarts, the first snapshot and schema changes.",
  learn: [
    "Why a dual write to the database and the event log drifts apart",
    "How a CDC connector tails the WAL or binlog and what a change event looks like",
    "Ordering by primary key, stored offsets and duplicates after a restart",
    "Initial snapshot plus stream, replication-slot disk usage, schema changes and the outbox",
  ],
  nodes: {
    client: "Shop app",
    api: "Orders API",
    db: "Orders DB",
    topic: "Event log",
    search: "Search index",
    connector: "CDC connector",
    warehouse: "Data warehouse",
  },
  metrics: {
    missing: "Orders missing in search",
    stale: "Search staleness",
    wal: "Retained WAL",
    dups: "Duplicate events",
  },
  steps: {
    "dual-write": {
      short: "Dual write",
      title: "The API writes twice: to the DB and to the event log",
      body: "When an order is paid, the Orders API updates the row in the database and then publishes an event, so the search index can show the new status.\n\nTwo writes to two different systems, one after the other, with no transaction around both. On a normal day it looks fine.",
      fields: {
        key: "The order id. All events of one order go to the same partition.",
        status: "The new state the search index must show.",
        offset: "The event's position in the log. The broker has it now.",
      },
    },
    "lost-event": {
      short: "Lost event",
      title: "The commit succeeds, the publish does not",
      body: "The database commits `paid`. Then the publish to the event log times out, and a moment later a deploy restarts the API pod. The event is gone for good.\n\nThe database and the search index now disagree, and nothing will ever fix it: the buyer sees `pending` in search for a paid order. Over a day this happens 340 times.",
      watch: "Two writes without a shared transaction always have a gap between them. A crash in the gap splits your systems.",
      check: {
        q: "What if the API publishes the event first and commits the row second?",
        options: [
          "Fixed: the event is now safe before the commit",
          "Still broken: if the commit fails, an event exists for an order that was never paid",
          "Fixed, as long as the broker has three replicas",
        ],
        answer: 1,
        why: "Swapping the order only swaps the failure. Now a rolled-back or crashed transaction leaves an event for a change that did not happen. Without one transaction, no order of the two writes is safe.",
      },
      fields: {
        COMMIT: "The row is durable. From here the database says `paid`.",
        timeout: "The broker did not answer in time. The API does not know if the event arrived.",
        restarted: "The process with the only copy of the event is gone.",
      },
    },
    log: {
      short: "Read the log",
      title: "Read the database's own change log",
      body: "The database already writes every committed change to its log, the WAL in PostgreSQL or the binlog in MySQL, before anything else. A CDC connector subscribes to that log and turns each change into an event.\n\nThe API writes only to the database. If a change committed, it is in the log; if it is in the log, the connector will publish it. There is no second write to lose.",
      watch: "One source of truth: the database. Everything else is derived from its log, in commit order.",
      fields: {
        SLOT: "A replication slot: the database remembers how far this connector has read.",
        LOGICAL: "Logical decoding: rows and columns, not raw disk pages.",
        lsn: "Log sequence number: the change's position in the log. It only grows.",
      },
    },
    event: {
      short: "Change event",
      title: "What a change event carries",
      body: "Each event says which row changed, how (`c` create, `u` update, `d` delete), the row before and after, and where in the log the change sits.\n\nConsumers do not query the database back. The event has what they need, and the log position lets them tell new from old.",
      fields: {
        key: "The primary key of the row. The broker partitions by it.",
        op: "`u`: an update. `c`, `d` and `r` (snapshot read) are the others.",
        before: "The row before the change. Useful to see what moved.",
        after: "The row after the change: what consumers apply.",
        lsn: "The position in the database log. Consumers keep the last one they applied.",
      },
    },
    ordering: {
      short: "Ordering",
      title: "Two changes of one order arrive in the wrong order",
      body: "The connector spreads events over partitions round-robin, and the search consumer reads partitions in parallel. Order 5521 changed twice: `pending`, then `paid`.\n\nThe two events landed in different partitions, and the older one was applied last. Search shows `pending` again, although the database says `paid`.",
      check: {
        q: "What keeps the changes of one order in order?",
        options: [
          "Partition by the primary key, so one order always goes to one partition",
          "Add more partitions so each is less busy",
          "Make the consumer sleep a second before applying",
        ],
        answer: 0,
        why: "A log keeps order only inside one partition. With the order id as the key, all changes of an order go to one partition in commit order. The consumer also skips any event older than the version it already has.",
      },
      fields: {
        "round-robin": "Events are spread evenly, but changes of one row are scattered.",
        p3: "The newer change, applied first.",
        p7: "The older change, applied later, overwriting the newer one.",
      },
    },
    keyed: {
      short: "Key by id",
      title: "Partition by primary key, skip older versions",
      body: "The connector now uses the primary key as the message key. All changes of order 5521 go to the same partition and are read in log order.\n\nThe consumer keeps the last `lsn` per document and skips anything older. Even if a stale event arrives by another path, it cannot overwrite a newer state.",
      watch: "Order is guaranteed per key, never across the whole topic. Design consumers around that.",
      fields: {
        "primary key": "The message key. Same row, same key, same partition.",
        partition: "Chosen by the key's hash. Order holds inside one partition.",
        skip: "The consumer's guard: an event older than the document is ignored.",
      },
    },
    crash: {
      short: "Restart",
      title: "The connector restarts and sends changes again",
      body: "The connector saves its position, the offset, every 10 seconds. It crashes 8 seconds after a save and restarts from the stored offset.\n\nThe 412 changes from those 8 seconds are published a second time. Nothing is lost, but consumers get duplicates. Thanks to the `lsn` check they are skipped.",
      watch: "CDC delivers at least once. Every consumer must be idempotent: by key and log position.",
      check: {
        q: "If the connector saved its offset before publishing instead of after, what would a crash cause?",
        options: [
          "Nothing changes",
          "Exactly-once delivery",
          "Lost changes: the offset says they were sent, but they were not",
        ],
        answer: 2,
        why: "Saving first moves the bookmark past events that never reached the log. After a restart they are skipped forever. Publishing first and saving after turns a crash into duplicates, which consumers can handle.",
      },
      fields: {
        "stored offset": "Where the connector resumes. It is a little behind what it really sent.",
        "412": "Changes sent again. Duplicates, not losses.",
        skip: "The consumer already has a newer version, so the repeat does nothing.",
      },
    },
    slot: {
      short: "WAL fills disk",
      title: "The connector is down, and the database disk fills up",
      body: "The connector stopped on Saturday and nobody noticed. The database keeps every change the connector has not confirmed, so it can resume later.\n\nBy Monday the slot holds 180 GB of log and the disk is 92% full. The search index is two days stale, and the main database is about to stop accepting writes.",
      watch: "A replication slot is a promise to keep the log. Alert on slot lag and set a limit on how much log a slot may hold.",
      fields: {
        active: "`false`: no connector is reading this slot.",
        "retained WAL": "Log the database cannot delete because the slot still needs it.",
        alert: "The alert that should have fired on Saturday, not on Monday.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "A new consumer: snapshot first, then stream",
      body: "The connector is back and a data warehouse joins. It needs all 2.1 million orders, but the event log keeps only 7 days.\n\nThe connector takes a consistent snapshot: it notes the log position, reads every row in one repeatable-read transaction and sends them as `op=r`. Then it streams changes from the noted position. No change falls between the two.",
      watch: "Snapshot and stream must meet at one log position, or changes slip through the seam.",
      fields: {
        "REPEATABLE READ": "One frozen view of the table for the whole read.",
        "op=r": "A snapshot read, not a real change. Consumers treat it as an upsert.",
        stream: "Live changes start exactly where the snapshot was taken.",
      },
    },
    schema: {
      short: "Schema change",
      title: "A column rename breaks a consumer",
      body: "A developer renames `total` to `total_amount`. For the Orders API it is a clean refactoring. For the warehouse, every new event lacks the field it expects.\n\nThe revenue report shows zero, and nobody connects it to a rename made in another team.",
      watch: "With table CDC, the table schema becomes a public contract. Change it by expand and contract: add the new column, migrate readers, drop the old one later.",
      fields: {
        "RENAME COLUMN": "Harmless inside one service, breaking for every CDC consumer.",
        missing: "The field consumers read no longer exists in the events.",
        revenue: "The damage shows up far away, in another team's report.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Outbox plus CDC: publish events, not tables",
      body: "Instead of streaming raw tables, the API writes a business event to an `outbox` table in the same transaction as the change. The connector reads only the outbox.\n\nThe event is atomic with the data, as with table CDC, but its shape is a contract the team owns. Tables can be refactored freely; `OrderPaid` keeps its meaning.",
      watch: "Table CDC: zero code, but leaks internal schema. Outbox: a little code, a stable contract. Many teams use both: table CDC for analytics, outbox for other services.",
      fields: {
        outbox: "A plain table. Its rows are the events to publish.",
        OrderPaid: "A domain event with a stable name and shape, not a column dump.",
        COMMIT: "The change and its event become durable together, or neither does.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for change data capture.\n\n1) Never write to the database and the event log as two separate steps. 2) Let a connector read the database's own log, so a committed change is always published. 3) Key events by primary key: order holds per row, not across the topic. 4) Delivery is at least once; consumers skip by log position. 5) Watch the replication slot, or the database disk fills. 6) Start with a consistent snapshot, then stream; treat schema as a contract, or publish through an outbox.",
    },
  },
};

export default text;
