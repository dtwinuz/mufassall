import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Transactional outbox",
  summary:
    "A shop saves a purchase in its database and then publishes an event so the loyalty service can credit points. Two writes to two systems with no shared transaction: now and then the commit succeeds and the publish does not, and the points are simply gone. The outbox writes the event into the same database in the same transaction, a relay delivers it at least once, the consumer drops duplicates, and keys, cleanup and log tailing deal with the rest.",
  learn: [
    "Why \"commit, then publish\" loses events in either order, and how an outbox table in the same transaction closes the gap",
    "How a relay polls the outbox with `FOR UPDATE SKIP LOCKED`, and why it can only promise at-least-once delivery",
    "Consumer idempotency: a processed-events table committed together with the effect",
    "Order per aggregate with a message key, cleaning up sent rows, and polling versus reading the database log",
  ],
  nodes: {
    app: "Shop app",
    api: "Purchase service",
    db: "Purchases DB",
    broker: "Broker",
    loyalty: "Loyalty service",
    ldb: "Loyalty DB",
    relay: "Outbox relay",
  },
  metrics: {
    lost: "Lost events",
    dups: "Duplicate credits",
    misorder: "Out-of-order events",
    delay: "Commit to publish",
    unsent: "Unsent outbox rows",
    rows: "Rows in the outbox",
  },
  steps: {
    buy: {
      short: "Purchase",
      title: "Save the purchase, then tell everyone",
      body: "The purchase service commits a purchase to its own database. Right after that it publishes `PurchaseCompleted` to the broker, and the loyalty service credits points: 1 point per 10 000 minor units.\n\nThe code reads like one action. In fact these are two writes to two different systems, and nothing ties them together.",
      fields: {
        COMMIT: "The purchase is durable. From here on, it happened.",
        publish: "A second, separate write over the network. It can fail on its own.",
        "two systems": "The database and the broker cannot share one transaction.",
      },
    },
    dualwrite: {
      short: "Dual write",
      title: "The commit succeeds, the publish does not",
      body: "At 21:14 the broker is slow. The purchase commits, the publish times out after 2 s, and the app still gets `201`. The loyalty service never hears about the purchase.\n\nIt is rare: 0.02% of publishes. But at 300 000 purchases a day that is 60 customers a day without their points, and no one knows which.",
      watch: "Catching the error and logging it does not help: the purchase is already committed, and the process may crash before it reaches the log line.",
      check: {
        q: "What if the service publishes first and commits after?",
        options: [
          "That fixes it: the event is out before anything can fail",
          "It flips the bug: when the commit fails, points are credited for a purchase that does not exist",
          "Retry the publish in a loop before answering the app, then it is safe",
        ],
        answer: 1,
        why: "A commit can fail too: a constraint, a deadlock, a crash. Then the event describes something that never happened. A retry loop lives in memory, so a deploy or an out-of-memory kill between commit and publish still loses the event.",
      },
      fields: {
        COMMIT: "The purchase is saved for good.",
        timeout: "The broker did not answer in time. Whether it got the message is unknown.",
        "201": "The customer sees success: the purchase really did happen.",
        "lost events": "Small rate, big total. Every one is a support ticket.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Write the event into the same transaction",
      body: "The service stops talking to the broker. It inserts the event into an `outbox` table in the same database and the same transaction as the purchase.\n\nNow there is only one write. Either both rows commit or neither does, so a saved purchase always has its event and a rolled-back one never does. Delivering the event becomes a separate job.",
      watch: "The outbox must live in the same database as the data. Another database or a local file is a dual write again.",
      fields: {
        purchases: "The business change, as before.",
        outbox: "The event, as a plain row: what to publish later.",
        aggregate_id: "Which purchase the event is about. Ordering and keys will need it.",
        COMMIT: "One atomic commit for the purchase and its event.",
      },
    },
    relay: {
      short: "Relay",
      title: "A relay publishes what the outbox holds",
      body: "A small worker, the **relay**, reads unsent rows every 500 ms, publishes them, waits for the broker acks and marks the rows sent. `SKIP LOCKED` lets a second relay pod take other rows instead of waiting.\n\nThe event now leaves on average about 260 ms after the commit instead of 4 ms. That is the price, and it buys an event that cannot be lost: if the broker is down, the row just waits.",
      check: {
        q: "The relay published 200 events, and its pod is killed before the `UPDATE ... sent_at`. What happens after the restart?",
        options: [
          "Those 200 events are lost",
          "The same 200 events are published again",
          "The outbox is corrupted and needs a manual fix",
        ],
        answer: 1,
        why: "The rows are still unsent, so the relay publishes them again. No order of \"publish\" and \"mark sent\" is safe: marking first loses events on a crash, marking after repeats them. The outbox gives at-least-once, and the consumer has to cope with that.",
      },
      fields: {
        sent_at: "Empty means not published yet.",
        LIMIT: "Small batches: a short transaction and a short lock.",
        "SKIP LOCKED": "Rows another relay pod holds are skipped, not waited for.",
        acks: "Only rows the broker confirmed get marked.",
        "500 ms": "The poll interval. Half of it, on average, is the extra delay.",
      },
    },
    dups: {
      short: "Duplicates",
      title: "The relay restarts and credits points twice",
      body: "The relay pod is killed between publishing and marking. After the restart it sends the same 200 events again, and the loyalty service credits 249 points to `u_42` a second time.\n\nWith deploys and restarts this is about 600 duplicates a day. The broker itself adds a few more: when a consumer's ack is lost, the broker redelivers.",
      fields: {
        evt_01HV9Q: "The event id is the same on both deliveries. That is the handle for a fix.",
        "+249": "The effect, applied once per delivery.",
        "re-sent": "The relay did what it promised: at least once.",
        "498": "A balance that is wrong by exactly one credit.",
      },
    },
    inbox: {
      short: "Dedup",
      title: "The consumer remembers what it has applied",
      body: "The loyalty service records each `event_id` in `processed_events` in the same transaction as the credit. A second delivery hits the unique key, inserts nothing, and the service rolls back and acks it.\n\nDuplicates become harmless. That is the other half of the outbox: the sender delivers at least once, the receiver applies exactly once.",
      watch: "The dedup row and the effect commit together. Saving the id after the effect, in a separate step, is a dual write again.",
      fields: {
        processed_events: "One row per applied event id, with a unique key.",
        "ON CONFLICT": "A repeat id inserts nothing instead of raising an error.",
        "0 rows": "Seen before: skip the effect, but still ack the message.",
        COMMIT: "The dedup row and the credit become durable together.",
        "INSERT 0 0": "The duplicate, detected by the database itself.",
      },
    },
    ordering: {
      short: "Order",
      title: "The refund arrives before the purchase",
      body: "A second relay pod is added for throughput. Pod A takes rows 1 to 200, pod B takes 201 to 400 and is faster. The messages have no key, so the two events of `p_9188` land in different partitions.\n\nThe loyalty service gets `PurchaseRefunded` first and rejects it on a balance of 0, then credits 249 points for a purchase that was already refunded. About 35 such pairs a day.",
      check: {
        q: "How do you keep the events of one purchase in order and still run two relays?",
        options: [
          "Run only one relay pod, forever",
          "Key every message by `aggregate_id`, and split work between relays by that key, not by row",
          "Sort by timestamp in the consumer",
        ],
        answer: 1,
        why: "Order is only needed within one purchase. A key sends all of its events to one partition, and splitting the relays by key hash means one relay publishes them in outbox order. Timestamps from different pods are not comparable enough to sort by.",
      },
      fields: {
        partition: "Order is kept inside a partition, never across partitions.",
        PurchaseRefunded: "The second event of the purchase, delivered first.",
        key: "Without a key the broker spreads messages at random.",
        rejected: "One wrong order, two wrong balances.",
      },
    },
    keyed: {
      short: "Key",
      title: "One key per purchase, one partition per key",
      body: "The relay sets the message key to the purchase id, and each relay pod takes only the keys whose hash falls into its share. All events of `p_9188` go to partition 3, in outbox order.\n\nEach event also carries `aggregate_version`. The consumer stores the last version per purchase: an older one is skipped, a gap means \"wait, the earlier one is coming\".",
      fields: {
        key: "The purchase id: the same key always maps to the same partition.",
        event_id: "Unique per event, for dedup.",
        aggregate_version: "Position within this purchase: 1 = completed, 2 = refunded.",
        value: "The event itself, as the outbox stored it.",
        partition: "The same partition as event 1 of this purchase.",
      },
    },
    bloat: {
      short: "Bloat",
      title: "The outbox keeps every event forever",
      body: "Nobody deletes sent rows. After 92 days the outbox holds 27.6 million rows, and every `UPDATE sent_at` leaves dead index entries behind. The relay's query, 2 ms in the first week, now takes 870 ms, twice a second, on the primary.\n\nThe delay climbs past a second, and the whole database pays for a table that is 99.99% history.",
      fields: {
        sent_at: "Only 1 200 rows match. The other 27.6 million are in the way.",
        "27.6 M rows": "300 000 events a day for three months.",
        "dead entries": "Old row versions that vacuum has not caught up with.",
        "Execution Time": "A poll that should be instant, now a real load.",
      },
    },
    cleanup: {
      short: "Cleanup",
      title: "Delete sent rows in small batches",
      body: "A job deletes rows sent more than 3 days ago, 5 000 at a time, every minute. Small batches keep locks and replication lag short. At higher volume, a partition per day is better: dropping an old partition is instant and leaves no dead rows.\n\nThe table goes back to about 900 000 rows and the poll to a few milliseconds. The loyalty service's `processed_events` needs the same care, but it must keep ids longer than the longest possible redelivery, say 7 days.",
      fields: {
        sent_at: "Only rows already delivered are deleted.",
        "3 days": "Enough to investigate an incident, no more.",
        LIMIT: "Thousands of rows per run, never millions in one transaction.",
        DROP: "With daily partitions, cleanup is one instant command.",
        "DELETE 5000": "A full batch: the job runs again until a run deletes nothing.",
      },
    },
    logtail: {
      short: "Log",
      title: "Or read the outbox from the database log",
      body: "Instead of polling, the relay can follow the database's write-ahead log through a replication slot, as CDC does. Every committed outbox insert comes out of the log about 40 ms after the commit, with no polling query and no `UPDATE`.\n\nThe cost is operational: a slot that nobody reads keeps the log on disk until the disk is full. Polling works on any SQL database and is easy to reason about; log tailing wins when the delay or the polling load really matters.",
      watch: "Either way, publish events that you designed, not raw table rows: the outbox is your contract, the schema stays private.",
      fields: {
        slot: "The database keeps the log until this reader confirms it.",
        WAL: "Write-ahead log: every commit, in commit order.",
        "38 ms": "From commit to publish, without a poll interval.",
        sent_at: "Not needed any more: the log position is the bookmark.",
        confirm: "Move the bookmark only after the broker ack, so a crash repeats rather than loses.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for the outbox.\n\n1) Never write to the database and the broker as two steps: either order loses or invents events. 2) Insert the event into an outbox table in the same transaction as the data. 3) A relay publishes unsent rows and marks them after the ack; that is at-least-once, never exactly-once. 4) Consumers dedup by event id in the same transaction as the effect. 5) Key messages by aggregate id and split relays by key, so one aggregate's events stay in order. 6) Delete or drop sent rows, and choose polling for simplicity or log tailing for low delay.",
    },
  },
  scenarios: {
    "broker-down": {
      label: "Broker down 30 s",
      steps: {
        "down-pile": {
          short: "Broker down",
          title: "The broker is unreachable for 30 seconds",
          body: "At 21:40 the broker stops accepting connections. The relay retries with backoff: 0.5 s, 1 s, 2 s, then at most every 5 s.\n\nThe shop does not notice. Purchases commit with their outbox rows and the app gets `201` as usual. At 40 purchases a second, 1 200 events wait in the outbox.",
          check: {
            q: "What do shop customers notice during these 30 seconds?",
            options: [
              "Every purchase fails with an error",
              "Nothing at checkout; points arrive about half a minute late",
              "Purchases succeed, but these 1 200 events are lost",
            ],
            answer: 1,
            why: "The purchase path only touches the database, so it keeps working. The events are durable rows, so nothing is lost; they are only late. With the old dual write, these 30 seconds would have meant 1 200 timeouts or lost events.",
          },
          fields: {
            "connection refused": "The broker is down. The relay knows nothing was published.",
            retry: "Growing pauses, so the relay does not hammer the broker as it comes back.",
            "201": "Checkout does not depend on the broker any more.",
            "unsent rows": "The backlog: durable, in order, waiting.",
          },
        },
        "down-drain": {
          short: "Drain",
          title: "The broker returns and the backlog drains",
          body: "At 21:40:30 the broker is back. The relay publishes the backlog in batches of 200, in outbox order per key, and in under 2 seconds the outbox is empty again.\n\nThe oldest event waited 31 s. Nothing was lost and nothing was reordered. The batch that was in flight when the broker fell over is published a second time, and the consumer's dedup drops it.",
          fields: {
            "in id order": "Same key, same relay, same order as in the outbox.",
            "unsent rows": "Back to zero.",
            "31 s": "The outage turned into delay, not into loss.",
            dedup: "At-least-once delivery, exactly-once effect.",
          },
        },
      },
    },
  },
};

export default text;
