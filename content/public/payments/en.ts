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
};

export default text;
