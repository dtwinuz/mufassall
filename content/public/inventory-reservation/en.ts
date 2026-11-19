import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Inventory reservation",
  summary:
    "One kettle left and two buyers, a cart that never pays, a mobile app that retries, a payment that fails, a flash sale with 20 000 buyers for 500 units. Stock looks like one number, and every one of these breaks it: the shop sells what it does not have, or hides what it does.",
  learn: [
    "Why read-then-write oversells the last unit, and how an atomic conditional decrement with a row count check stops it",
    "On hand, reserved and available; reserve-then-confirm with a hold that expires, and a sweeper that gives units back",
    "Idempotent reservations per order, releasing a hold when payment fails, and the race between expiry and a late payment",
    "Hot SKUs in a flash sale: one locked row as a bottleneck, sharded counters, and the daily count against the warehouse",
  ],
  nodes: {
    buyer: "Buyer A",
    buyer2: "Buyer B",
    api: "Order service",
    db: "Stock DB",
    pay: "Payment provider",
    sweeper: "Hold sweeper",
    wh: "Warehouse",
    recon: "Daily count",
  },
  metrics: {
    oversold: "Orders with no unit",
    stuck: "Units held for nothing",
    doubles: "Orders holding twice",
    p99: "Checkout p99",
    drift: "Units off the shelf count",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "One kettle left",
      body: "A shop sells the electric kettle `KET-200`. The stock row keeps three numbers: what is on the shelf, what is promised to unpaid orders, and what may still be sold.\n\nOne unit is left. A buyer presses \"Buy\", the order service checks the row and decides. Even on a quiet day, 14 units across the catalogue do not match the warehouse shelf.",
      fields: {
        on_hand: "Physical units in the warehouse right now.",
        reserved: "Units promised to orders whose payment has not finished.",
        available: "on_hand minus reserved: the only number the site may sell from.",
      },
    },
    oversell: {
      short: "Oversell",
      title: "Two buyers take the last kettle",
      body: "Buyer A and buyer B press \"Buy\" 40 ms apart. Each request reads `available = 1`, decides there is stock, computes `1 - 1 = 0` in the application and writes `0` back.\n\nBoth writes succeed, both orders are confirmed, and there is one kettle. In a sale week this happens 37 times a day: someone gets an apology instead of a parcel.",
      watch: "Read, decide, write: another request can slip in between any two of these.",
      fields: {
        "SELECT available": "Both read the same old value.",
        "UPDATE stock": "Both write a number computed from that old value.",
        "computed in the app": "The database is told \"set 0\", not \"take one away\".",
        "two orders": "Two promises for one unit.",
      },
    },
    atomic: {
      short: "Atomic",
      title: "Decrement in the database, with the condition in WHERE",
      body: "The order service sends one statement: take one away, but only if at least one is left. The database computes from the row's current value under a row lock and checks the condition at write time.\n\nA gets `UPDATE 1`. B waits for A's lock, re-reads the row, sees 0 and gets `UPDATE 0`. The service reads the affected row count: 0 means sold out, and no order is created.",
      check: {
        q: "Why does `available - 1` in SQL stop the oversell, while `available = 0` computed in the app does not?",
        options: [
          "SQL arithmetic is faster",
          "The database computes from the current value under the lock and re-checks WHERE; the app wrote a number based on an old read",
          "available - 1 cannot go below zero by itself",
        ],
        answer: 1,
        why: "The second writer waits for the first one's lock and then evaluates both the expression and the condition against the committed value. Without `AND available >= 1` it would happily write -1: the condition is what refuses the sale.",
      },
      fields: {
        "available - 1": "Relative change: applied to whatever the value is at write time.",
        "available >= 1": "The rule, checked by the database inside the write.",
        "UPDATE 1": "One row changed: the unit is yours.",
        "row lock": "B waits until A commits, then sees A's result.",
        "UPDATE 0": "Nothing changed: answer sold out. Always check this count.",
      },
    },
    abandoned: {
      short: "Abandoned",
      title: "Carts that never pay keep the stock",
      body: "The decrement runs when checkout starts, before payment. Yesterday 40 checkouts took a unit; 12 paid, 28 closed the payment page.\n\n40 kettles stand on the shelf and the site says sold out. Nothing ever gives those 28 units back. Decrementing only after payment is no answer either: then two people pay for the last kettle.",
      fields: {
        on_hand: "The shelf is full.",
        "sold out": "The site trusts available, which reached 0.",
        "28 closed": "A third of checkouts end without payment: normal for a shop.",
        "gives those 28 units back": "A decrement with no way back is a leak of stock.",
      },
    },
    hold: {
      short: "Hold",
      title: "Reserve with an expiry, confirm on payment",
      body: "Checkout now moves a unit from available to reserved and writes a hold for the order with `expires_at` 15 minutes ahead, in one transaction. Payment success turns the hold into `confirmed` and the unit leaves on_hand.\n\nA sweeper runs every 30 s and releases holds past their expiry: reserved goes down, available goes up. Units held for unpaid carts drop from 28 to about 6, each for at most 15 minutes.",
      check: {
        q: "The payment page gives the buyer 10 minutes. How long should the hold last?",
        options: [
          "As long as the cart exists",
          "Longer than the payment page, for example 15 minutes",
          "1 minute, to free stock as fast as possible",
        ],
        answer: 1,
        why: "A payment that can still succeed must always find its hold. If the hold is shorter than the payment window, a buyer can pay for a unit that was already given away. Longer than needed only keeps abandoned units a little longer.",
      },
      fields: {
        "reserved + 1": "The unit is promised, not gone: it can come back.",
        holds: "One row per order and SKU: what is held, for whom, until when.",
        expires_at: "The promise has an end written into the data.",
        confirmed: "Paid: the unit leaves the shelf count.",
        released: "Not paid in time: the unit returns to available.",
        sweeper: "A background job that ends expired holds.",
      },
    },
    retry: {
      short: "Retry",
      title: "A mobile retry reserves twice",
      body: "On a weak mobile network the checkout request gets no answer for 8 s. The app retries with the same order. The server handles both and writes two holds for `ord_7710`.\n\nThe buyer will pay for one kettle; the other stays held for nothing for 15 minutes while the next buyer sees sold out. 9 orders a day hold twice.",
      fields: {
        "no answer": "Unknown, not failed: the first request may have worked.",
        retries: "The same order sent again.",
        "two holds": "Each request reserved on its own.",
        "sold out": "Real stock hidden behind a duplicate.",
      },
    },
    idem: {
      short: "Once",
      title: "One hold per order and SKU",
      body: "The `holds` table gets a unique key on `(order_id, sku)`. Checkout inserts the hold first with `ON CONFLICT DO NOTHING`; 0 rows means this order already holds the kettle, so the service answers with the existing hold and touches no stock.\n\nOnly a new hold decrements, in the same transaction. If the decrement updates 0 rows, the transaction rolls back and the answer is sold out.",
      check: {
        q: "Which key makes the reservation idempotent?",
        options: [
          "A random id generated for every HTTP request",
          "(order_id, sku): one order can hold one SKU once",
          "The buyer's user id",
        ],
        answer: 1,
        why: "A per-request id changes with every retry, so it protects nothing. A user id would block a second, legitimate order of the same buyer. The order already exists before checkout and every retry carries it.",
      },
      fields: {
        "ON CONFLICT": "The unique key turns a repeat into a no-op.",
        "0 rows": "Either a retry (hold exists) or no stock (decrement refused).",
        "existing hold": "The retry gets the same answer as the first request.",
        ROLLBACK: "No stock: the hold row is not kept either.",
      },
    },
    payfail: {
      short: "Pay fails",
      title: "Payment failed: give the unit back now",
      body: "The provider reports `payment.failed` with a signed webhook. Waiting for the sweeper would keep the kettle off sale for up to 15 minutes, in the busiest hour.\n\nThe handler releases the hold only if it is still `held` and returns the unit in the same transaction. This is the compensation for the reservation: the kettle is back on sale 40 ms after the failure. Units held for nothing drop to about 1.",
      watch: "Release only from `held`. A second copy of the webhook, or a release after the sweeper, must change nothing.",
      fields: {
        event_id: "Unique per event: copies are dropped by it.",
        type: "The payment did not go through.",
        reason: "Why: useful for the buyer, not needed for the stock.",
        "status = 'held'": "The guard: a hold is released once, from one state.",
        "40 ms": "Instead of waiting for the expiry.",
      },
    },
    hot: {
      short: "Hot SKU",
      title: "A flash sale queues every checkout on one row",
      body: "At 11:00 the kettle goes on sale: 500 units, 20 000 buyers in the first 10 seconds. Every checkout updates the same stock row, and each transaction holds its lock for about 2 ms. That row allows at most about 500 reservations a second, while 2 000 arrive.\n\nRequests queue on the lock, the connection pool fills up, and checkouts for other products time out too. Checkout p99 goes from 35 ms to 4 200 ms.",
      fields: {
        "one lock": "Correctness came from the row lock; now the lock is the limit.",
        "2 ms": "Decrement, hold insert and commit, all while holding the lock.",
        "500 reservations/s": "1 s divided by 2 ms: the ceiling of a single row.",
        "100/100": "Every connection waits on one row, so everything else waits too.",
      },
    },
    slots: {
      short: "Slots",
      title: "Split the hot counter into slots",
      body: "The 500 units are split into 10 slot rows of 50. Each checkout picks a slot at random and decrements it with the same conditional `UPDATE`. On 0 rows it tries the next slot; only when all ten are empty is the answer sold out. Ten rows mean ten locks and about 5 000 reservations a second.\n\nWhen the sum reaches 0, a `sold_out` flag goes into the cache and the 19 500 late buyers get their answer without touching the database. Another option is a queue per hot SKU with one consumer reserving in order. p99 is back to 40 ms.",
      check: {
        q: "Slots 0 to 8 are empty, slot 9 has 3 units. A buyer randomly picks slot 2. What happens?",
        options: [
          "The buyer sees sold out",
          "The service tries the other slots and reserves from slot 9",
          "The buyer waits until slot 2 is refilled",
        ],
        answer: 1,
        why: "The sum of the slots is the real stock. A random pick is only a way to spread locks, so an empty slot must fall through to the others. Otherwise the shop shows sold out while units remain. A background job can rebalance slots as they drain.",
      },
      fields: {
        stock_slots: "The same stock, kept in several rows.",
        "slot = 7": "One of ten rows: buyers rarely wait for each other.",
        "next slot": "An empty slot is not sold out.",
        "5 000": "Ten times the ceiling of a single row.",
        sold_out: "A cheap answer for the crowd that arrives after the end.",
      },
    },
    count: {
      short: "Count",
      title: "Match the stock table with the warehouse every day",
      body: "Each morning a job loads the warehouse count and compares it with on_hand. Most SKUs match. Three kettles were damaged in the returns area, so the shelf has 46, not 49: an adjustment is recorded as a movement with a reason.\n\nTwo mugs exist only in the database, and two paid orders hold them. Those orders cannot ship: the team cancels and refunds them and writes to the buyers. Reserved is never changed by a count: holds belong to orders.",
      fields: {
        shelf: "What people actually counted in the warehouse.",
        on_hand: "What the system believes is there.",
        "do not exist": "Orders promised stock that is gone: handle them before more are sold.",
        stock_movements: "Every change has a row and a reason, so the number can be explained.",
        reserved: "Owned by holds; the count only corrects on_hand.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for stock.\n\n1) Keep on_hand, reserved and available apart; sell only from available. 2) Decrement in the database with the condition in WHERE, and check the affected row count; never write a number computed from an earlier read. 3) Reserve then confirm: a hold with an expiry longer than the payment window, and a sweeper that releases expired holds. 4) One hold per order and SKU, enforced by a unique key, so retries reserve once. 5) Release a hold as soon as payment fails, and every release or confirmation only from `held`. 6) A hot SKU needs its lock spread: slots, or a queue per SKU, and a sold-out flag in front. 7) Count against the warehouse daily and record adjustments as movements.",
    },
  },
  scenarios: {
    "late-pay": {
      label: "Paid 1 s late",
      steps: {
        "late-race": {
          short: "1 s late",
          title: "The hold expires one second before the payment succeeds",
          body: "The hold for `ord_7710` expires at 12:15:00.000, and the payment page was also open for 15 minutes, started a moment later. At 12:15:00 the sweeper releases the hold, and 400 ms later `ord_7741` reserves the same kettle.\n\nAt 12:15:01 the provider reports that `ord_7710` paid at 14:59 of its page. The handler marks the hold confirmed without checking anything. Money is taken for a kettle that now belongs to someone else.",
          check: {
            q: "What should have stopped this?",
            options: [
              "Running the sweeper less often",
              "Confirmation only from `held`, and a payment window shorter than the hold",
              "A faster payment provider",
            ],
            answer: 1,
            why: "The sweeper and the payment handler race for the same hold. Both must change it only from `held`, so exactly one wins. And when the payment window ends before the hold does, this race needs a payment that arrives after its own page has closed.",
          },
          fields: {
            expires_at: "Equal to the payment window: no margin at all.",
            sweeper: "It did its job on time.",
            ord_7741: "A second buyer, now holding the unit legally.",
            "payment.succeeded": "Real money, one second too late.",
            confirmed: "Written without checking that the hold was still held.",
          },
        },
        "late-fix": {
          short: "Guard",
          title: "One guarded transition, a margin, and a plan for the loser",
          body: "Confirmation becomes the same kind of guarded update as expiry: only from `held`. The sweeper also waits a 2-minute grace after `expires_at`, and the payment page closes after 10 minutes, so a normal payment always finds its hold.\n\nIf the payment still loses the race, the service tries to reserve again with the atomic decrement. If there is no unit, the money goes back at once with an apology. No order is ever confirmed without a unit.",
          fields: {
            "status = 'held'": "Exactly one of confirm and expire can win.",
            "lost the race": "0 rows: the hold is gone, act on that, do not overwrite it.",
            grace: "Extra time for webhooks that are on their way.",
            "10 min": "The payment window ends well before the hold.",
            refund: "The rare loser gets their money back automatically.",
          },
        },
      },
    },
  },
};

export default text;
