import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Sagas and the outbox",
  summary:
    "One order needs a payment and a stock reservation in two other services, each with its own database. There is no single transaction to wrap it in. How to keep the three in agreement without locking the world.",
  learn: [
    "Why one database transaction cannot span three services",
    "What two-phase commit costs and why teams avoid it",
    "Saga: local steps plus compensating actions, orchestrated or choreographed",
    "Outbox: the DB write and the event can no longer diverge",
  ],
  nodes: {
    client: "Shop app",
    orders: "Orders",
    odb: "Orders DB",
    payments: "Payments",
    inventory: "Inventory",
    bus: "Event log",
    relay: "Outbox relay",
  },
  metrics: {
    p95: "Order p95",
    orphans: "Charged, no order",
    lost: "Lost events",
  },
  steps: {
    "three-services": {
      short: "Three services",
      title: "One order, three databases",
      body: "The shop app places an order. Orders saves it, then calls Payments to charge the card and Inventory to reserve two lamps.\n\nEach service owns its own database. A `BEGIN ... COMMIT` in the orders DB says nothing about the other two.",
      fields: {
        items: "What to reserve in Inventory.",
        amount: "What to charge in Payments, in the smallest currency unit.",
        status: "`pending`: the order exists, but payment and stock are not settled yet.",
      },
    },
    "half-done": {
      short: "Half done",
      title: "Money taken, stock call failed",
      body: "Payments charged the card. Then Inventory was down and the reservation failed.\n\nThe customer paid for an order that will never ship. Nothing rolls the charge back, because the charge was committed in another database.",
      watch: "Each service commits on its own. A failure in step 2 does not undo step 1 by itself.",
      fields: {
        order_id: "The order the reservation belongs to.",
        "503": "Inventory is not available. The charge before it already went through.",
        "Retry-After": "Inventory asks to come back in 30 seconds. The customer is already charged by then.",
      },
    },
    "two-phase": {
      short: "2PC",
      title: "Two-phase commit: everyone votes first",
      body: "A coordinator (here Orders) asks every participant to **prepare**: do the work, lock the rows, and vote. Only when all vote yes does it send **commit**; otherwise **abort**.\n\nThe orphan charges are gone. But every participant holds its locks for the whole round trip, so p95 triples.",
      check: {
        q: "Orders crashes after Payments and Inventory voted yes. What do the two participants do?",
        options: [
          "Wait with their locks held: they may not decide alone",
          "Abort on their own after a timeout and free the locks",
          "Commit on their own, since everyone already voted yes",
        ],
        answer: 0,
        why: "A prepared participant cannot commit or abort alone, because only the coordinator knows the outcome. Locks stay held, other orders queue behind them, and p95 climbs to about 9 seconds.",
      },
      fields: {
        PREPARE: "Phase 1: do the work but do not commit it yet.",
        VOTE: "The participant promises it can commit. From now on it must wait for the decision.",
        COMMIT: "Phase 2: the coordinator decides. Until then the row stays locked.",
      },
    },
    "in-doubt": {
      short: "In doubt",
      title: "The coordinator dies after the vote",
      body: "Orders crashed between the votes and the decision. Payments and Inventory voted yes and now may neither commit nor abort on their own.\n\nTheir locks stay held, other orders queue behind them, and p95 climbs to nine seconds. One sick node blocks the healthy ones: this is why 2PC is rare between services.",
      watch: "2PC trades availability for consistency. Every participant is only as available as the coordinator.",
      fields: {
        "waiting for decision": "A prepared participant cannot decide alone: the other side may have committed.",
        lock: "The wallet row is still locked. Every other payment for `u_42` waits.",
        "coordinator unreachable": "The only node that knows the outcome is down.",
      },
    },
    "saga-log": {
      short: "Saga",
      title: "Saga: a chain of local transactions",
      body: "Drop the global lock. Orders runs the order as a **saga**: charge, then reserve, each a normal local transaction in its own service. Orders acts as the **orchestrator** and writes where the saga is after every step.\n\nNo one waits on anyone's locks, so p95 drops back. If Orders crashes, it reads `sagas` on restart and continues from the saved step.",
      fields: {
        sagas: "The orchestrator's own table: one row per running saga.",
        step: "The last step that finished. A restart continues from here.",
        status: "`running`, then `done` or `compensating`.",
      },
    },
    compensate: {
      short: "Compensate",
      title: "Failure: undo with a compensating action",
      body: "Inventory answers \"out of stock\". The saga cannot roll back a committed charge, so it runs the **compensation**: a refund that cancels the charge in business terms.\n\nCompensations run in reverse order and must be safe to repeat: the orchestrator may crash and send the refund twice.",
      watch: "A compensation is a new action, not an undo. The customer may still see a charge and a refund on the statement.",
      fields: {
        "Idempotency-Key": "Built from the saga id. A second refund with the same key returns the first result.",
        reason: "Why the order is being undone.",
        status: "The charge is cancelled. The saga's status becomes `compensated`.",
      },
    },
    choreography: {
      short: "Choreography",
      title: "Choreography: services react to events",
      body: "Another way to run the same saga: no orchestrator. Orders publishes `OrderCreated`; Payments reacts and publishes `PaymentCaptured`; Inventory reacts to that.\n\nServices are less coupled and the client gets its answer sooner. The price: the flow lives in many places, and \"where is order 1042 stuck?\" needs tracing across all of them.",
      watch: "Orchestration is easier to follow with many steps. Choreography fits short flows with few participants.",
      check: {
        q: "Orders commits the order, then publishes the event. The broker times out and the code gives up. What happens?",
        options: [
          "The broker delivers the event later on its own",
          "The DB commit rolls back, so no order is saved",
          "The order stays pending forever, and nothing alerts",
        ],
        answer: 2,
        why: "The DB commit already happened, and the event existed only in memory. Order 1042 stays `pending`: nobody charges it or reserves stock, and lost events reach 9 a day.",
      },
      fields: {
        key: "The order id. All events of one order land in one partition, in order.",
        type: "What happened. Every subscriber decides itself what to do about it.",
        event_id: "Unique id of this event. Consumers use it to drop duplicates.",
        offset: "Position of the record in the log. The broker has stored it.",
      },
    },
    "dual-write": {
      short: "Dual write",
      title: "Saved in the DB, event never sent",
      body: "Orders commits the order and then publishes the event: two separate writes. The broker timed out and the code gave up.\n\nOrder 1042 sits in the DB as `pending` forever. Nobody charges it, nobody reserves it, and nothing alerts.",
      watch: "Writing to a DB and to a broker are two systems. Either can fail after the other has succeeded.",
      fields: {
        ERROR: "The publish failed after the DB commit.",
        committed: "The DB part already happened and will not roll back.",
        "no retry": "The event existed only in memory. When the process moves on, it is gone.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Outbox: the event is written with the order",
      body: "Orders writes the order **and** the event into an `outbox` table in one local transaction. Either both rows exist or neither does.\n\nA separate relay reads new outbox rows and publishes them, retrying until the broker accepts. The event can be late, but it can no longer be lost.",
      check: {
        q: "The relay publishes `ev_5c1`, then crashes before marking the row sent. What happens after it restarts?",
        options: [
          "The event is lost: the relay forgot it",
          "It publishes the same event again",
          "The broker refuses it as already stored",
        ],
        answer: 1,
        why: "The row is still unmarked, so the relay sends it again and the broker stores it under a new offset. The outbox gives at least once, so Payments skips the copy by `event_id`.",
      },
      fields: {
        BEGIN: "One local transaction in the orders DB. No broker involved.",
        outbox: "A plain table of events still to publish.",
        event_id: "Generated here, so every retry of this row carries the same id.",
        COMMIT: "From this moment the order and its event exist together.",
      },
    },
    dedupe: {
      short: "Dedupe",
      title: "At-least-once: consumers drop duplicates",
      body: "The relay published row `ev_5c1` and crashed before marking it sent. On restart it publishes it again. The outbox guarantees **at least once**, never exactly once.\n\nPayments records every `event_id` it has handled, in the same transaction as the charge. The second copy hits the unique key and is skipped.",
      fields: {
        offset: "A new offset: to the broker this is a new record.",
        event_id: "The same id as before. This is the only way to tell it is a copy.",
        "ON CONFLICT": "The unique key on `event_id` rejects the second insert without an error.",
        skip: "No second charge. The consumer just acknowledges and moves on.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for work that spans services.\n\n1) There is no transaction across services; avoid 2PC, it blocks everyone on the slowest node. 2) Use a saga: local steps, each with a compensating action, run by an orchestrator or by events. 3) Write events through an outbox in the same transaction as the data. 4) Delivery is at least once, so every consumer dedupes by `event_id`.",
    },
  },
  scenarios: {
    "comp-fails": {
      label: "Refund fails",
      steps: {
        "comp-retry": {
          short: "Refund retry",
          title: "The compensation itself fails",
          body: "Inventory said \"out of stock\" and the saga started the refund. But Payments is down now, and the refund gets `503`.\n\nThe orchestrator keeps the saga in `compensating` and retries with backoff and the same idempotency key. The customer's money is still taken.",
          watch: "A compensation is a call like any other. It can fail, and the saga must survive that.",
          fields: {
            "Idempotency-Key": "The same key on every try, so a late success and a retry never refund twice.",
            "503": "A temporary failure: worth retrying.",
            "attempt 6": "Six tries so far. The pause grows each time.",
          },
        },
        "comp-stuck": {
          short: "Stuck",
          title: "A refund that can never succeed",
          body: "Payments is back, but now it answers `422`: the customer closed the card after paying. The refund has nowhere to go.\n\nThis error is permanent. Retrying it for a week changes nothing, and the saga stays half done: charged, not reserved, not refunded.",
          check: {
            q: "The refund can never go through on its own. What should the orchestrator do with saga `sg_1042`?",
            options: [
              "Keep retrying until the bank accepts it",
              "Stop, mark it for a person and alert",
              "Delete the order so the saga ends",
            ],
            answer: 1,
            why: "A permanent error needs a decision only a person can make: another refund method, a bank transfer, a call to the customer. The saga stops retrying, records why, and lands in a queue that someone watches.",
          },
          fields: {
            "422": "The request is understood but cannot be done. Not a retry case.",
            error: "`card_closed`: the money has no way back to the original card.",
            retryable: "Payments says it plainly: do not try again.",
          },
        },
        "comp-manual": {
          short: "Outcome",
          title: "Outcome: sagas that wait for a person",
          body: "The orchestrator stops retrying and moves the saga to `needs_manual`. An alert fires and support refunds the customer by bank transfer.\n\nCompare with the normal path: there the refund went through in a second. Here 6 sagas a day end with a charged customer and no order, and each one costs a person's time.",
          watch: "Every saga needs a last state for \"cannot finish\", with an owner and an alert.",
          fields: {
            needs_manual: "A final state of its own: the machine is done, a person takes over.",
            count: "Six today. This number belongs on a dashboard with an alert.",
          },
        },
      },
    },
  },
};

export default text;
