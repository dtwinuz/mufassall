import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Pub/sub and event logs",
  summary:
    "One event, many teams that need it. How a topic decouples them, and what offsets, consumer groups, keys and schemas add.",
  learn: [
    "Why one slow subscriber should never break the checkout",
    "Offsets: how a consumer that was down catches up and replays",
    "Consumer groups and partitions: scaling one subscriber",
    "Ordering per key and changing an event without breaking readers",
  ],
  nodes: {
    shop: "Shop app",
    orders: "Orders",
    email: "Email",
    stock: "Stock",
    "stock-2": "Stock 2",
    analytics: "Analytics",
    topic: "Topic",
  },
  metrics: {
    p95: "Checkout p95",
    failed: "Failed orders",
    lag: "Lag (events)",
    misordered: "Out of order",
  },
  steps: {
    direct: {
      short: "Direct calls",
      title: "Orders calls everyone itself",
      body: "When an order is placed, the orders service calls email, stock and analytics one by one, and only then answers the shop.\n\nEach new team that cares about orders means one more call inside checkout. The reply gets slower with every team.",
      watch: "The orders service now knows every consumer by name. Adding one means changing and redeploying orders.",
      fields: {
        order_id: "The same few fields are sent to every service in a different request.",
        "X-Response-Time": "The receipt alone takes 410 ms. Three calls in a row add up to almost a second.",
      },
    },
    "one-down": {
      short: "One down",
      title: "Analytics is down, checkout is down",
      body: "The analytics service hangs. Orders waits for it until the timeout and then fails the whole checkout.\n\nA report nobody reads until tomorrow has stopped the shop from taking money today.",
      watch: "With direct calls, availability multiplies: the checkout is only as up as all its callees together.",
      fields: {
        timeout: "Five seconds of waiting for a service the customer does not care about.",
        "checkout aborted": "The order is lost because of a side effect, not because of the order itself.",
      },
    },
    topic: {
      short: "Topic",
      title: "Publish one event to a topic",
      body: "Orders now writes one event, `order.placed`, to a topic and answers the shop. Email, stock and analytics each **subscribe** and read the same event on their own.\n\nThe topic is an append-only log on disk. Orders does not know who reads it, and a new team just subscribes.",
      watch: "Publishing is now the only call in checkout. It must be durable, or the event is lost for everyone.",
      check: {
        q: "With the topic in place, analytics goes down again. What happens to checkout?",
        options: [
          "It fails again, after the same 5 s timeout",
          "Nothing: analytics just falls behind in the log",
          "Orders stops publishing until analytics returns",
        ],
        answer: 1,
        why: "Orders keeps writing and email and stock keep reading. The analytics group only stops moving its offset, and its lag grows to 12 300 events, none of them lost.",
      },
      fields: {
        acks: "`all` means the record is copied to every in-sync broker replica before the producer gets OK.",
        event_type: "A fact in past tense: something that already happened, not a command to do something.",
        offset: "The record's position in its partition. Every reader keeps its own offset into the same log.",
      },
    },
    lagging: {
      short: "Lag",
      title: "A dead subscriber only falls behind",
      body: "Analytics is down again. Checkout does not notice: orders keeps writing, email and stock keep reading.\n\nThe analytics group simply stops moving its offset. The gap between its offset and the end of the log is called **lag**.",
      watch: "Lag is the number to alert on. A growing lag means a consumer is down or too slow.",
      fields: {
        "CURRENT-OFFSET": "The last position the analytics group has committed: it has read everything before it.",
        "LOG-END-OFFSET": "Where the producer is writing now.",
        LAG: "The difference: 12 300 events waiting for analytics. None are lost.",
      },
    },
    replay: {
      short: "Replay",
      title: "Catch up from the saved offset",
      body: "Analytics comes back and asks for records from its last committed offset. It reads in batches and commits the new offset after each one.\n\nThe log keeps records for days, not until someone reads them. So a consumer can also **replay**: rewind its offset and process history again after a bug fix.",
      watch: "Commit the offset after the work is done. Commit first and a crash skips records.",
      fields: {
        offset: "Start reading here: exactly where analytics stopped.",
        group: "The offset belongs to the group, not to one process. Any analytics instance can continue.",
        COMMIT: "Saves the new position. After a restart, reading continues from here.",
      },
    },
    "hot-consumer": {
      short: "Too slow",
      title: "One subscriber cannot keep up",
      body: "A sale triples the number of orders. Email and analytics keep up, but stock does a database update per event and runs at 100%.\n\nIts lag grows by thousands a minute. Customers see items in stock that are already sold.",
      watch: "Each subscriber has its own speed. The topic does not wait for the slowest one, and that is the point.",
      check: {
        q: "Stock runs at 100% and its lag grows. What drains the lag without slowing the other subscribers?",
        options: [
          "Make the topic wait for stock to catch up",
          "Give stock its own copy of the topic",
          "Add a second stock instance to the same consumer group",
        ],
        answer: 2,
        why: "The group splits the 6 partitions between the two stock instances, three each. The work halves and the lag drains to 0, while email and analytics, as separate groups, still get every event.",
      },
    },
    group: {
      short: "Group",
      title: "A consumer group splits the partitions",
      body: "The topic has 6 **partitions**. A second stock instance joins the same consumer group, and the partitions are split between the two: each partition is read by exactly one member.\n\nThe work halves and the lag drains. Email and analytics are separate groups, so they still get every event.",
      watch: "You cannot have more busy members than partitions. Choose the partition count with growth in mind.",
      fields: {
        REBALANCE: "Membership changed, so the group redistributes partitions. Reading pauses for a moment.",
        generation: "Each rebalance gets a new number, so a member with an old assignment is rejected.",
        partitions: "Three each. Every record still goes to exactly one stock instance.",
      },
    },
    misorder: {
      short: "Out of order",
      title: "Cancel arrives before the order",
      body: "A customer orders and cancels a second later. The two events have no key, so they land in different partitions, read by different stock instances.\n\nThe cancel is handled first: there is nothing to cancel yet. Then the order reserves stock that will never be paid for.",
      watch: "A topic keeps order only inside one partition. Across partitions there is no order at all.",
      check: {
        q: "Order and cancel land in different partitions. What makes stock see them in the order written?",
        options: [
          "Use the order ID as the record key",
          "Read all partitions with one stock instance",
          "Sort events by `occurred_at` in the consumer",
        ],
        answer: 0,
        why: "The partition is a hash of the key, so every event of `ord_9051` goes to partition 2 and is read in order. Different orders still spread over all partitions, and out-of-order events drop to 0.",
      },
      fields: {
        event_type: "The cancel for the order placed earlier.",
        partition: "Partition 5, while `order.placed` went to partition 2. Different readers, no order.",
      },
    },
    key: {
      short: "Key",
      title: "Same key, same partition",
      body: "The producer now sets the record **key** to the order ID. The partition is a hash of the key, so all events of one order go to one partition and are read in the order written.\n\nDifferent orders still spread across all partitions, so the work is still parallel.",
      watch: "One very busy key makes one hot partition. Pick a key with many distinct values.",
      fields: {
        key: "The order ID. Everything about `ord_9051` now goes to the same place.",
        partition: "Partition 2, the same as its `order.placed`. The stock reader sees them in order.",
      },
    },
    "schema-break": {
      short: "Breaking change",
      title: "A renamed field stops a reader",
      body: "The orders team renames `total` to `amount` and deploys. Their own tests pass.\n\nAnalytics reads the new record, cannot find `total` and stops. Records stay in the log, but its lag climbs again.",
      watch: "An event is a public contract. The producer cannot see all its readers, so it cannot test them all.",
      fields: {
        amount: "The new name. Old readers do not know it.",
        total: "The field analytics expects. It is gone, so the consumer stops on this record.",
      },
    },
    schema: {
      short: "Schema",
      title: "Version the event, change it additively",
      body: "Events get a **schema** with a version, checked when they are produced. Allowed changes are additive: add a field, keep the old one until every reader has moved.\n\nAnalytics restarts, reads both versions and catches up. `total` is removed only in a later version, after readers confirm.",
      fields: {
        schema_version: "Readers can tell which shape they got and handle old records still in the log.",
        total: "Kept for old readers during the transition.",
        amount: "Added for new readers. Both carry the same value.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "The producer writes a fact once; each subscriber group reads it at its own pace through its own offset.\n\n1) Lag, not errors, shows a slow subscriber. 2) Commit offsets after work, and replay when needed. 3) Scale a subscriber with a group, up to the partition count. 4) Order exists only per key. 5) Events are contracts: version them and change them additively.",
    },
  },
};

export default text;
