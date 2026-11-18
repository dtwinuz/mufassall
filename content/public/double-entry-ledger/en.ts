import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Double-entry ledger",
  summary:
    "A marketplace keeps buyer wallets, pays sellers and takes a fee. A balance column updated in place loses money in races and cannot say where it went. A double-entry ledger records every movement as an entry whose postings sum to zero, derives balances from it and never rewrites history.",
  learn: [
    "Why a balance column updated in place loses updates and leaves no trail",
    "Accounts, journal entries and postings that sum to zero, written in one transaction",
    "Derived balances with a versioned cache, idempotency keys, holds and available balance",
    "Refunds as reversal entries, one currency per sum, and a daily trial balance with alerts",
  ],
  nodes: {
    app: "Buyer app",
    web: "Buyer web",
    api: "Wallet API",
    wallets: "Wallets table",
    ledger: "Ledger",
    balances: "Balance cache",
    payout: "Capture job",
    support: "Support agent",
    rates: "FX rates",
    checker: "Trial balance",
    pager: "On-call alert",
  },
  metrics: {
    unexplained: "Unexplained money",
    lost: "Lost updates",
    dupes: "Double charges",
    "balance-ms": "Balance read",
  },
  steps: {
    column: {
      short: "Column",
      title: "A wallet is one number in one row",
      body: "A buyer pays $45.00 for an order. The Wallet API reads the balance, subtracts the price in code and writes the new number back. One row per user, one column, one `UPDATE`.\n\nIt works in a demo. The row only knows the latest number, not how it got there.",
      fields: {
        balance_minor: "Integer cents: `12000` = $120.00. Never floats for money.",
        SET: "The old value is overwritten. Whatever it was is gone.",
        "UPDATE 1": "The database is happy. It has no idea whether 7500 is right.",
      },
    },
    lost: {
      short: "Lost update",
      title: "Two payments at once, one of them vanishes",
      body: "The buyer pays one order on the phone and another in the browser in the same second. Both requests read 12000, both subtract their own order and write. The second write wins: the wallet shows 9000, but 7500 left it.\n\nSupport gets the question \"where did the $45 go?\" and has nothing to answer with: the only record is the current number. About 37 such races a day, $2,480 nobody can explain.",
      watch: "Read, compute in code, write back: every copy of this pattern is a race.",
      check: {
        q: "What fixes both the race and the missing history?",
        options: [
          "Lock the row with `SELECT ... FOR UPDATE` before the write",
          "Record every movement as an entry with postings that sum to zero, and derive the balance",
          "Recompute every wallet at night from the orders table",
        ],
        answer: 1,
        why: "A lock stops the race but still overwrites the number, so the history is still gone. Appending an entry per movement keeps every change, and the balance becomes a sum nobody can lose.",
      },
      fields: {
        "tx A": "The phone payment, $45.00.",
        "tx B": "The browser payment, $30.00. It read the balance before A wrote.",
        "write 9000": "The last writer wins and A's subtraction is gone.",
        "no history": "The row cannot tell what happened. Only logs, if anyone kept them.",
      },
    },
    journal: {
      short: "Journal",
      title: "Every movement is an entry, its postings sum to zero",
      body: "The wallet becomes an **account**, and so do the seller and the platform's fee income. Paying an order is one **journal entry** with three **postings**: $45.00 leaves the buyer, $40.50 goes to the seller, $4.50 to fees. Signed amounts must sum to zero: debit equals credit.\n\nAll postings are inserted in one transaction, so either the whole entry exists or none of it. Nothing is ever updated, so two payments at once are simply two entries.",
      watch: "An entry that does not sum to zero is rejected by the database, not by a code review.",
      fields: {
        BEGIN: "One transaction for the entry and all its postings.",
        journal_entries: "One row per business event: what happened and why (`order_paid`, `ord_5120`).",
        postings: "One row per account touched. Append-only.",
        account: "A named bucket: `wallet:u_42`, `seller:s_7`, `platform:fees`.",
        amount_minor: "Negative leaves the account, positive enters it. `-4500 + 4050 + 450 = 0`.",
        COMMIT: "A deferred constraint checks the sum per entry here, at commit time.",
      },
    },
    derived: {
      short: "Balance",
      title: "The balance is a sum, cached with a version",
      body: "The true balance is `SUM(amount_minor)` of an account's postings. With millions of postings that sum takes 180 ms, too slow for every screen. So the API keeps a cached balance per account and updates it in the same transaction as the postings.\n\nThe update carries the version it read. If another payment changed the balance meanwhile, the version does not match, zero rows update and the transaction retries. The same check refuses a spend below zero.",
      fields: {
        account_balances: "A cache of the sum, one row per account. It can always be rebuilt from postings.",
        version: "Optimistic locking: the write only applies to the balance it was computed from.",
        SUM: "The source of truth. The audit query must always agree with the cache.",
        "UPDATE 1": "The version matched. `UPDATE 0` would mean: someone was faster, retry.",
      },
    },
    retry: {
      short: "Retry",
      title: "A retry posts the same payment twice",
      body: "The pay request times out on a slow network. The app retries the same tap, and the API posts a second entry for the same order. Both entries are perfectly balanced, which is the problem: the ledger is consistent and wrong.\n\nThe buyer paid $19.90 twice. About 14 a day.",
      check: {
        q: "How should the API make the second request harmless?",
        options: [
          "The app sends an idempotency key per operation; the API stores it with the entry and returns the first result on a repeat",
          "Refuse a second payment from the same user within 10 seconds",
          "Let the trial balance find duplicates at night",
        ],
        answer: 0,
        why: "Only the client knows that two requests are one tap. A key per business operation, unique in the database, turns the repeat into a lookup. A time window blocks real second purchases, and the trial balance cannot see a duplicate: both entries sum to zero.",
      },
      fields: {
        retries: "The app never got an answer, so it does not know the first try worked.",
        je_9107: "The first entry: correct.",
        je_9108: "The second entry: also balanced, also posted.",
        "paid twice": "Double entry proves the books balance, not that each event happened once.",
      },
    },
    idempotent: {
      short: "Idempotency",
      title: "One key per business operation",
      body: "The app creates the key once per payment, `pay-ord_5133`, and sends it on every retry. The API inserts it into a unique column together with the entry. The second insert conflicts, so the API reads the first entry and returns it.\n\nA repeat with the same key but a different amount is not a retry: the API answers `422` instead of guessing.",
      fields: {
        "Idempotency-Key": "Unique in the ledger. Per operation, not per HTTP request.",
        "Idempotent-Replayed": "This answer is the stored result of the first request.",
        entry_id: "The same `je_9107` as the first try. No second entry exists.",
      },
    },
    hold: {
      short: "Hold",
      title: "Holds: ledger balance and available balance",
      body: "A buyer orders a $129.00 item that ships next week. The money must be reserved now and moved to the seller only on shipping. The API places a **hold**: a record that lowers the available balance, without postings yet.\n\nWhen the item ships, the capture job posts the real entry and releases the hold. If it never ships, the hold expires. The wallet shows two numbers: ledger (settled) and available (what can be spent).",
      watch: "Spend checks use the available balance. Statements use the ledger balance.",
      check: {
        q: "The buyer returns the item a week after capture. How is the payment undone?",
        options: [
          "`DELETE` the entry and its postings",
          "`UPDATE` the postings' amounts to zero",
          "Post a new entry with the opposite postings that points to the original",
        ],
        answer: 2,
        why: "The original payment did happen, and statements, payouts and reports already rely on it. A reversal entry undoes its effect and keeps both events in history.",
      },
      fields: {
        ledger_minor: "Sum of settled postings: $310.00.",
        held_minor: "Reserved by open holds: $129.00.",
        available_minor: "Ledger minus holds. This is what the next purchase is checked against.",
        expires_at: "A hold that is never captured gives the money back by itself.",
      },
    },
    reversal: {
      short: "Reversal",
      title: "A refund is a new entry, never an edit",
      body: "Support refunds order `ord_5120`. The API posts entry `je_9230` with the same three accounts and opposite signs, and marks it as reversing `je_9001`. The buyer's wallet is back, the seller and the fee are taken back.\n\nThe original entry stays untouched. A statement shows the payment and the refund, and last month's report still adds up to what was sent last month.",
      watch: "Revoke `UPDATE` and `DELETE` on postings for the application role.",
      fields: {
        reverses: "The link to the entry being undone. One entry can be reversed only once.",
        refund: "The business reason, as for any entry.",
        "never updated": "History is append-only. Corrections are new rows.",
        "INSERT 0 3": "Three new postings, summing to zero like any entry.",
      },
    },
    currency: {
      short: "Currency",
      title: "One currency per sum, FX goes through accounts",
      body: "A buyer pays 100.00 EUR into a USD wallet. `-10000 EUR + 10850 USD` is not zero and not meaningful: you cannot add euros and dollars. So the entry has two legs, each balanced in its own currency, joined by the platform's FX accounts.\n\nThe rate comes from a rates feed and is stored on the entry, so the conversion can be explained a year later.",
      watch: "Minor units differ by currency: 2 digits for USD, 0 for some, 3 for others. Store the currency on every posting.",
      fields: {
        EUR: "The euro leg: 100.00 EUR in from the card, into the platform's EUR account.",
        "fx:EUR": "The platform holds the euros it bought.",
        "fx:USD": "And gives out the dollars it sold.",
        rate: "Saved with the entry, never looked up again later.",
        sums: "Zero per currency. The ledger checks each currency separately.",
      },
    },
    trial: {
      short: "Trial balance",
      title: "Every night: does everything still sum to zero?",
      body: "A nightly job runs the **trial balance**: the sum of all postings per currency must be exactly zero. Then it compares every cached balance with the sum of that account's postings.\n\nLast night both totals were 0, but one cache was off by $2.00 after a hand-written hotfix. The job pages on-call and rebuilds that cache from the postings, which stay the source of truth.",
      watch: "A trial balance that is not zero is an incident, not a report line.",
      fields: {
        "GROUP BY": "One total per currency, never across currencies.",
        "total 0": "Every entry balanced, so the whole ledger does.",
        "cache drift": "The cache disagrees with the postings. The postings win.",
        "on-call": "A person looks today, while the cause is still fresh.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for money in a product.\n\n1) Never keep money as a number overwritten in place. 2) Every movement is a journal entry whose postings sum to zero, inserted in one transaction. 3) Balances are sums of postings; a cache is fine if it has a version and can be rebuilt. 4) One idempotency key per business operation; holds lower the available balance until capture or expiry. 5) Undo with reversal entries, never `UPDATE` or `DELETE`; one currency per sum, FX through accounts. 6) Run a trial balance every day and page a person when it is not zero.",
    },
  },
};

export default text;
