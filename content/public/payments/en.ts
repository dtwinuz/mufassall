import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Payment gateway",
  summary:
    "A payer pays for an order through a gateway, and the gateway calls your shop four times. What each call means and where money or goods get lost.",
  learn: [
    "The four calls: check, create, perform, cancel",
    "Why a repeated `CreateTransaction` must get the same answer",
    "The transaction states `1`, `2`, `-1` and `-2`",
    "Why goods leave only after `state: 2`",
  ],
  nodes: {
    payer: "Payer",
    gateway: "Gateway",
    api: "Shop API",
    orders: "Orders DB",
    warehouse: "Warehouse",
  },
  metrics: {
    p95: "Reply p95",
    double: "Double charges",
    unpaid: "Shipped unpaid",
  },
  steps: {
    check: {
      short: "Check",
      title: "Check: can this order be paid?",
      body: "The payer enters a card in the gateway. Before taking money the gateway asks your shop: does order `1042` exist, and is the amount right?\n\nYour API reads the order and answers yes or no. Nothing is charged yet.",
      fields: {
        Authorization: "The gateway proves it is the gateway. A shared secret, hidden here.",
        amount: "In the smallest unit (tiyin): `500000` is 5 000 so'm. Never a float.",
        order_id: "Your own order number, which the payer typed or the payment link carried.",
        allow: "Yes: the order exists, is unpaid and the amount matches.",
      },
    },
    create: {
      short: "Create",
      title: "Create: a transaction is opened",
      body: "The gateway now holds the money and tells your shop to open a transaction for the order.\n\nYour API writes a row: gateway ID, your own transaction ID, state `1`. The money is reserved, not yet yours.",
      fields: {
        id: "The gateway's ID for this payment. Remember it: every later call refers to it.",
        time: "When the gateway created the payment, in milliseconds.",
        transaction: "Your own ID for the same transaction.",
        state: "`1` — created, waiting to be performed.",
      },
    },
    "create-twice": {
      short: "Twice",
      title: "The same create arrives twice",
      body: "The API was slow, the gateway hit its timeout and sent `CreateTransaction` again with the same `id`.\n\nThe code did not look for it and opened a second transaction. One payment, two transactions: a double charge or a mess in the books.",
      watch: "A gateway never waits forever. Every call can arrive more than once.",
      check: {
        q: "The gateway repeats `CreateTransaction` with the same `id`. What should the shop answer?",
        options: [
          "An error, so the gateway stops retrying",
          "A new transaction, since this is a new call",
          "The existing `tx_77`, unchanged",
        ],
        answer: 2,
        why: "The API looks up the gateway ID first and returns the existing transaction word for word. A unique index on the gateway ID stops two parallel calls from both creating, and double charges drop to 0.",
      },
      fields: {
        id: "The same gateway ID as before. This is a repeat, not a new payment.",
        transaction: "A new ID, `tx_78`. The shop now has two transactions for one payment.",
      },
    },
    "same-answer": {
      short: "Same answer",
      title: "A repeat gets the same answer",
      body: "Before creating, the API looks up the gateway ID. If the transaction exists it returns it unchanged: the same ID, the same time, the same state.\n\nThe gateway ID is stored under a **unique** constraint, so two parallel calls cannot both create.",
      fields: {
        gateway_id: "The lookup key. A unique index on it is what makes the repeat safe.",
        tx_77: "The existing transaction. The answer repeats it word for word.",
      },
    },
    perform: {
      short: "Perform",
      title: "Perform: the money is yours",
      body: "The gateway charges the card and tells your shop to perform the transaction.\n\nThe API moves it from state `1` to `2` and marks the order paid. A repeated `Perform` returns the same `perform_time`.",
      check: {
        q: "What if the shop sends the order to the warehouse as soon as the transaction is created?",
        options: [
          "Some goods leave for payments that are later cancelled",
          "Nothing: a created transaction is always performed",
          "The gateway refuses to perform the transaction",
        ],
        answer: 0,
        why: "State `1` is only a promise: cards get declined and payers leave. The gateway cancels after a timeout with state `-1`, and 4 unpaid orders a day are already on their way.",
      },
      fields: {
        perform_time: "When the payment completed. A repeat must return this same value.",
        state: "`2` — performed. Only now is the order paid.",
      },
    },
    "ship-early": {
      short: "Shipped early",
      title: "Goods left before the money",
      body: "The shop handed the order to the warehouse as soon as the transaction was **created**.\n\nBut not every created transaction is performed: the card is declined or the payer leaves. After a timeout the gateway cancels it, and the goods are already on their way.",
      watch: "State `1` is a promise of money, not money.",
      fields: {
        reason: "`4` — cancelled by timeout: the transaction was never performed.",
        state: "`-1` — cancelled before it was performed. No money came.",
      },
    },
    "ship-after": {
      short: "Ship after",
      title: "Ship only after `state: 2`",
      body: "The warehouse now gets an order only after `PerformTransaction`. The request carries the transaction and its state, and the warehouse refuses anything else.\n\nCancelled payments no longer turn into shipped goods.",
      fields: {
        paid_state: "The warehouse checks this itself, so a bug in the API cannot ship an unpaid order.",
      },
    },
    refund: {
      short: "Refund",
      title: "Cancelling a paid transaction",
      body: "The payer asks for a refund. The gateway sends `CancelTransaction` for a performed transaction.\n\nIf the order can be returned, the API cancels it and the state becomes `-2`. If the goods are already delivered, it answers with an error and the money is not returned automatically.",
      fields: {
        reason: "`5` — a refund requested after the payment.",
        code: "`-31007` — this transaction cannot be cancelled: the order is already delivered.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for a payment gateway.\n\n1) Amounts in the smallest unit, never floats. 2) Every call can repeat: look up the gateway ID and return the same answer. 3) Goods leave only after `state: 2`. 4) Cancel has two cases: `-1` before the money, `-2` after it.",
    },
  },
  scenarios: {
    late: {
      label: "Perform in 30 s",
      steps: {
        "perform-slow": {
          short: "Slow perform",
          title: "The shop answers `Perform` in 30 seconds",
          body: "The orders database is locked by a long report. The API performs the transaction, but the answer leaves after 30 seconds.\n\n`PerformTransaction` is a synchronous call: the gateway holds it open and waits for the answer on the same line. Its timeout is much shorter.",
          watch: "The shop's database already says `state: 2`. The gateway has not heard that.",
          fields: {
            "X-Response-Time": "30 seconds. By then the gateway has stopped waiting.",
            state: "`2` in the shop's database: the order counts as paid there.",
          },
        },
        "perform-cancel": {
          short: "Cancelled",
          title: "The gateway gives up and cancels",
          body: "For the gateway, no answer in time means the payment did not go through. It returns the money to the payer and sends `CancelTransaction` with reason `4`.\n\nMeanwhile the shop, seeing `state: 2`, has already sent the order to the warehouse.",
          fields: {
            reason: "`4` — cancelled by timeout. For the gateway the perform never completed.",
            state: "`-2` — cancelled after it was performed. The shop agrees, but the parcel is already packed.",
          },
        },
        "perform-end": {
          short: "Outcome",
          title: "Outcome: the money went back, the goods did not",
          body: "The report ends and the database is fast again. The shop tries to recall the shipment, but the parcel is already with the courier.\n\nCompare with the normal path: the same order, the same calls, only one slow answer. About 5 orders a day leave unpaid, and each has to be chased by hand.",
          watch: "A slow answer to a call is not a late success: for the caller it is a failure.",
          fields: {
            recall: "The shop asks the warehouse to stop the parcel.",
            "409": "Too late: the parcel has left. The order is shipped and unpaid.",
          },
        },
      },
    },
  },
};

export default text;
