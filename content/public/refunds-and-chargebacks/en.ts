import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Refunds and chargebacks",
  summary:
    "A shop gives money back in two ways: it refunds on its own, in full or in part, or the cardholder's bank takes the money back through a chargeback. Both look like \"minus some amount\", and both break in the same places: an edited payment row, a click sent twice, two agents refunding at once, a status that only arrives later by webhook, and a dispute deadline nobody watched.",
  learn: [
    "Why a refund is its own record and its own ledger entry, and the original payment is never edited",
    "How an idempotency key and a conditional update stop a refund from being paid twice or above what was captured",
    "Refund statuses that finish asynchronously: pending, succeeded, failed, and webhooks that arrive twice or out of order",
    "The chargeback lifecycle: dispute opened, funds held, evidence before the deadline, won or lost, and the daily match against the provider's report",
  ],
  nodes: {
    support: "Support agent",
    support2: "Second agent",
    api: "Refund service",
    db: "Payments DB",
    provider: "Card provider",
    issuer: "Card issuer",
    recon: "Daily match",
  },
  metrics: {
    dups: "Refunds paid twice",
    over: "Refunds above captured",
    stuck: "Refunds with a wrong status",
    cblost: "Chargebacks lost",
    drift: "Report lines that differ",
  },
  steps: {
    captured: {
      short: "Captured",
      title: "A paid order and a return",
      body: "Order `ord_5120` was paid by card: 4 500.00, stored as `450000` minor units. The money is captured, the goods are shipped.\n\nThe customer sends one item of 1 500.00 back. A support agent opens the payment and presses \"Refund\". The question is what exactly that button writes.",
      fields: {
        captured_minor: "How much the provider actually took from the card, in cents.",
        captured: "The payment is final: money moved, it can only be given back, not cancelled.",
        "**** 4417": "Only the last four digits are stored and shown; the full card number never reaches the shop.",
        "1 500.00": "A partial refund: one item out of three.",
      },
    },
    edit: {
      short: "Edit",
      title: "The refund is written over the payment",
      body: "The first version simply lowers the captured amount and changes the status. It looks tidy: one row, the right total today.\n\nBut the fact that 4 500.00 was taken is gone. Last month's revenue report now shows a different number than the one sent to the accountant, a second partial refund cannot tell what was refunded before, and the provider's report has two lines where the shop has one. 38 report lines a month no longer match.",
      watch: "A refund is a second money movement, often on another day and another month. It needs its own row.",
      fields: {
        captured_minor: "The historical fact, overwritten.",
        status: "One status cannot describe \"captured 4 500, refunded 1 500 of it\".",
        "revenue report": "A closed period changes after it was reported.",
        "-1 500.00": "The provider keeps both movements; the shop now has only the difference.",
      },
    },
    entry: {
      short: "Refund row",
      title: "A refund is a new record and a new entry",
      body: "A refund gets its own row with its own id, amount, reason and status, and a ledger entry with opposite postings that points at it. The payment row stays as it was.\n\nFull or partial is now just the amount: one refund of 450000, or several smaller ones. What may still be refunded is the captured amount minus the refunds that succeeded or are still pending.",
      check: {
        q: "The customer returns the second item tomorrow. How does the shop know how much may still be refunded?",
        options: [
          "It reads the payment's current amount",
          "Captured minus the sum of refunds that are pending or succeeded",
          "Captured minus only the refunds that succeeded",
        ],
        answer: 1,
        why: "Pending refunds are already promised to the provider and may still succeed. If they were left out, a second refund could be approved against money that is about to leave anyway. Failed refunds give the amount back.",
      },
      fields: {
        refunds: "One row per refund attempt, with the payment it belongs to.",
        amount_minor: "Partial or full is only this number.",
        pending: "Sent to the provider, the final answer comes later.",
        journal: "Opposite postings, summing to zero, referencing the refund.",
        "never touched": "The original payment remains the record of what happened.",
      },
    },
    twice: {
      short: "Twice",
      title: "A timeout and a second click",
      body: "The provider is slow and the request times out after 10 s. The agent sees an error and presses \"Refund\" again. Both requests reached the provider, and both refunds were made.\n\nThe customer gets 3 000.00 for an item of 1 500.00. Across agents, retries and a mobile app, this happens 14 times a month.",
      watch: "A timeout does not mean \"not done\". It means \"unknown\".",
      fields: {
        timeout: "The shop stopped waiting; the provider did not stop working.",
        again: "A second, independent request for the same refund.",
        re_51A: "Two refund ids at the provider: two real money movements.",
        "3 000.00": "Double the amount that was returned.",
      },
    },
    idem: {
      short: "Key",
      title: "The refund id is the idempotency key",
      body: "The service first saves the refund row `rf_2208`, then calls the provider with `Idempotency-Key: rf_2208`. Every retry of this refund, by the agent, a job or the network, sends the same key.\n\nThe provider recognises the key and returns the refund it already made instead of making another. The shop always knows which provider refund belongs to which of its own.",
      check: {
        q: "Where does the key come from so that a retry after a crash still sends the same one?",
        options: [
          "A new random value for every HTTP request",
          "The id of the refund row, saved before the provider is called",
          "The payment id",
        ],
        answer: 1,
        why: "A key made per request differs on every retry, so it protects nothing. The payment id would block every second partial refund of the same payment. The refund row exists before the call and survives a crash, so any retry finds and reuses it.",
      },
      fields: {
        "Idempotency-Key": "The same value for every attempt of one refund.",
        "Idempotent-Replayed": "The provider answered from its memory: no new refund was made.",
        id: "The provider's refund id, stored next to rf_2208.",
        status: "Not final yet: refunds finish asynchronously.",
      },
    },
    race: {
      short: "Race",
      title: "Two agents refund at the same time",
      body: "After the first refund, 300000 is left. Two agents handle two complaints about the same order. Each reads the sum of refunds, sees 150000, decides 200000 fits, and commits.\n\nTogether they refund 550000 of a 450000 payment. The provider may accept it too: many allow refunds up to the captured amount per refund, not in total. 6 times a month the difference comes out of the shop's pocket.",
      fields: {
        "left 300000": "The real limit for all further refunds together.",
        "SELECT sum": "A check that reads, then decides later: another writer can slip in between.",
        COMMIT: "Both transactions are valid on their own.",
        "550000": "More money returned than was ever taken.",
      },
    },
    guard: {
      short: "Guard",
      title: "Check and reserve in one statement",
      body: "The payment keeps a `refunded_minor` counter. A refund increases it with an `UPDATE` whose `WHERE` holds the limit, in the same transaction that inserts the refund row. The amount is reserved before the provider is called.\n\nThe database takes a row lock: agent B waits for A, re-checks the condition against A's new value, and updates 0 rows. B gets \"only 100000 left\". A `SELECT ... FOR UPDATE` before the check does the same job.",
      watch: "If the provider then answers `failed`, subtract the amount again: the reservation is released.",
      check: {
        q: "Why not check the limit in application code under a mutex?",
        options: [
          "It is fine as long as there is only one server",
          "Several servers and background jobs write refunds; only the database sees them all",
          "A mutex is slower than a row lock",
        ],
        answer: 1,
        why: "Refunds come from the panel, from jobs and from several replicas of the service. A lock in one process does not see the others. The row in the database is the one place every writer passes through.",
      },
      fields: {
        refunded_minor: "Refunds pending plus succeeded, kept on the payment.",
        "<= captured_minor": "The limit, checked by the database at write time.",
        "UPDATE 1": "The amount fitted and is now reserved.",
        "row lock": "B waits until A commits, then sees A's value.",
        "UPDATE 0": "Nothing changed: the refund is refused before money moves.",
      },
    },
    async: {
      short: "Webhook",
      title: "The provider answers later",
      body: "The provider accepted `re_51A` as `pending`. The money goes back through the card networks, which takes from minutes to days. The final answer comes as a signed webhook: `refund.succeeded` or `refund.failed`.\n\nHere the card was closed. The service marks the refund failed, gives the 150000 back to `refunded_minor` and opens a task to pay the customer another way. A job asks the provider about refunds still pending after 3 days, in case a webhook never arrives.",
      fields: {
        event_id: "Unique per event: the key for dropping duplicates.",
        type: "The new status the provider reports.",
        refund: "Which refund it is about, the id saved with rf_2208.",
        failure_reason: "Why the money could not go back: the next step depends on it.",
      },
    },
    dispute: {
      short: "Dispute",
      title: "The customer's bank takes the money back",
      body: "Another customer tells their bank the goods never arrived. The bank opens a chargeback: the provider debits 4 500.00 from the shop at once and adds a 15.00 fee. The shop has until the 25th to send evidence.\n\nThe event lands in a mailbox nobody reads. The deadline passes, the dispute is lost by default. 71% of chargebacks are lost, most of them without any answer.",
      watch: "A chargeback is not a refund the shop chose: the money has already left, and silence counts as agreement.",
      check: {
        q: "While the dispute is open, the customer writes to support and asks for a refund. What should support do?",
        options: [
          "Refund at once to keep the customer happy",
          "Not refund: answer the dispute, or accept it, so the money goes back only once",
          "Refund and also close the dispute",
        ],
        answer: 1,
        why: "The bank has already taken the money for the customer. A refund on top returns it a second time, and the shop cannot win it back. Block refunds on a payment with an open dispute; if the shop agrees with the customer, it accepts the dispute instead.",
      },
      fields: {
        reason: "The bank's reason code decides what evidence counts.",
        amount: "Taken from the shop immediately, not at the end.",
        fee: "Charged even if the shop wins.",
        evidence_due_by: "After this moment the provider decides without the shop.",
        pan: "The card number is masked; the payment id is enough to find the order.",
      },
    },
    evidence: {
      short: "Evidence",
      title: "Hold the money, answer before the deadline",
      body: "The dispute gets its own row and status: `needs_response`, `under_review`, then `won` or `lost`. The ledger moves 4 515.00 into a `disputes_held` account, so the shop's balance shows money it may not keep.\n\nA task with the deadline goes to the team on day 1: tracking number, delivery photo, the customer's messages. On day 5 an empty task raises an alert. Lost chargebacks drop from 71% to 24%.",
      fields: {
        needs_response: "The clock is running, the shop must act.",
        due_by: "Stored with the dispute, so alerts can use it.",
        disputes_held: "Money taken but not finally lost: held apart from the free balance.",
        "day 5": "Two days before the deadline, enough to collect papers.",
        won: "The money comes back: the opposite entry undoes the hold.",
        lost: "The held amount becomes a loss, the fee too.",
      },
    },
    report: {
      short: "Report",
      title: "Match against the provider's report every day",
      body: "Each morning a job loads the provider's report of refunds and disputes and matches every line by the provider's id. Most lines match.\n\nTwo do not: a refund the shop still thinks is pending because a webhook got lost, and a refund someone made by hand in the provider's panel, which the shop has no row for. The first is fixed automatically, the second goes to a person.",
      fields: {
        "provider report": "The provider's own list of what really moved.",
        "missed webhook": "Safe to fix: the provider's status is final.",
        "provider panel": "A refund made outside the system: create the row, find out why.",
        "421": "Every line is checked, not a sample.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for giving money back.\n\n1) A refund is a new row and a new ledger entry; the payment that happened is never edited. 2) The refund row's id is the idempotency key for every call to the provider. 3) Check the limit and reserve the amount in one conditional update or under a row lock: pending plus succeeded must never exceed captured. 4) Refunds finish asynchronously; take the final status from signed webhooks, only forward, and ask the provider about the ones that stay pending. 5) A chargeback has a deadline: hold the money, answer with evidence in time, and do not refund a disputed payment. 6) Match refunds and disputes against the provider's report every day.",
    },
  },
  scenarios: {
    "hook-twice": {
      label: "Webhook twice",
      steps: {
        "hook-mess": {
          short: "Out of order",
          title: "The same webhook twice, and an old one late",
          body: "The provider sends `refund.succeeded` for `re_70D`. Two seconds later an earlier `refund.pending` arrives, a retry from 10:00 that waited in the provider's queue. Then `succeeded` comes again, because the first delivery's answer was lost.\n\nThe handler simply copies the event's status and posts a ledger entry each time. The refund now shows `pending` forever, and its entry is in the ledger twice.",
          check: {
            q: "What should the handler do with `refund.pending` arriving after `refund.succeeded`?",
            options: [
              "Apply it: the latest arrival is the truth",
              "Ignore it: a status may only move forward, and succeeded is final",
              "Ask the provider again and wait for a third webhook",
            ],
            answer: 1,
            why: "Arrival order is not event order. Refund statuses form a small state machine: pending can become succeeded or failed, and those are final. An update allowed only from the expected state makes late events harmless.",
          },
          fields: {
            "refund.succeeded": "The final answer, arrived first.",
            "a retry": "An old event delivered late: arrival order is not event order.",
            "the same event": "Same event id: at-least-once delivery.",
            "posted twice": "Side effects repeated with every copy.",
          },
        },
        "hook-order": {
          short: "Forward only",
          title: "Drop copies, move only forward",
          body: "In one transaction the handler first records the event id; a copy hits the unique key and stops. Then it updates the refund only from `pending`. Only when that update changes a row does it post the ledger entry.\n\nThe second `succeeded` is dropped as a copy, the late `pending` updates 0 rows. The refund is succeeded, the entry is posted once.",
          fields: {
            processed_events: "Every applied event id, committed together with its effect.",
            "ON CONFLICT": "A copy changes nothing.",
            "status = 'pending'": "The update is allowed only from the state before.",
            "1 row": "The transition really happened: now post the entry.",
            "UPDATE 0": "A late or repeated event, harmless.",
          },
        },
      },
    },
  },
};

export default text;
