import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Payment reconciliation",
  summary:
    "A shop records card payments from the provider's answers and callbacks. Some of them get lost, time out or arrive twice, so the ledger and the real money drift apart. Every morning a job compares the ledger with the provider's settlement report, fixes what is safe to fix and hands the rest to a person.",
  learn: [
    "Why a ledger built from callbacks drifts from the money, and why amounts are integer minor units",
    "Matching the settlement report by provider transaction id, currency and a date window",
    "Four mismatch classes: which one the job may fix itself and which go to a review queue",
    "Day-end totals per currency, alerts, and re-runs that never fix the same thing twice",
  ],
  nodes: {
    client: "Checkout",
    api: "Payments API",
    provider: "Provider",
    ledger: "Ledger",
    files: "Settlement reports",
    recon: "Recon job",
    review: "Review queue",
    analyst: "Finance analyst",
    pager: "On-call alert",
  },
  metrics: {
    mismatches: "Mismatches",
    unmatched: "Unmatched amount",
    autofix: "Fixed automatically",
    review: "Open review cases",
  },
  steps: {
    record: {
      short: "Record",
      title: "The ledger is written from answers and callbacks",
      body: "A buyer pays at checkout. The Payments API asks the provider to charge the card, and the provider later confirms with a signed callback. The API writes one ledger row per payment: our order, their transaction id, amount, status.\n\nThe ledger is what finance, refunds and payouts read. It is only as good as the messages it was built from.",
      fields: {
        Signature: "Proves the callback came from the provider. A shared secret, hidden here.",
        provider_txn_id: "The provider's id for this payment. It is the key everything is matched on later.",
        amount_minor:
          "`129000` cents = $1,290.00. Integers add up exactly; floats like `0.1 + 0.2` do not, and 48 000 rows of rounding errors become real money.",
        currency: "Always stored next to the amount. Minor units differ: 2 digits for USD, 0 for some currencies, 3 for others.",
      },
    },
    drift: {
      short: "Drift",
      title: "The ledger and the money drift apart",
      body: "The charge call times out after 10 s, so the API marks the order `failed`. The provider did charge the card a second later, and its callback hit a restarting server. The buyer paid; our ledger says they did not.\n\nIt is not the only way. A callback arrives twice and creates two rows, the provider takes a different amount, support refunds a payment in the provider's dashboard. About 34 payments a day, $1,840, no longer agree.",
      watch: "A timeout means \"I don't know\", never \"it failed\".",
      check: {
        q: "Callbacks get lost and timeouts lie. What can the shop compare its ledger against?",
        options: [
          "Customer complaints: a buyer who paid will write in",
          "The provider's own daily list of every settled transaction",
          "Its own server logs of the charge calls",
        ],
        answer: 1,
        why: "The provider publishes a settlement report for each day: every charge, refund and fee it actually booked. That is the other side's record of the money, independent of which callbacks reached us.",
      },
      fields: {
        timeout: "No answer in time. The charge may or may not have happened.",
        failed: "The API guessed, and guessed wrong.",
        charged: "The provider's side: the money moved.",
        lost: "The only message that could have corrected the ledger never arrived.",
      },
    },
    settlement: {
      short: "Report",
      title: "The provider's settlement report",
      body: "Every morning the provider publishes yesterday's report as a file (or an API you page through): one line per charge, refund and fee it booked. The shop downloads it into its own storage.\n\nThe report is final for that day and comes from a different system than the callbacks. That is why it is useful: it fails differently.",
      watch: "Card numbers have no place in your copy of the report. Keep only the provider's ids.",
      fields: {
        "T+1": "Day T is reported on day T+1. Late-night payments may land in the next day's file.",
        provider_txn_id: "The same id the callback carried. The join key.",
        amount_minor: "Integer cents again. Refunds are negative.",
        fee_minor: "The provider's fee. Payouts are net of it, so totals must use the net amount.",
        card: "Always `***` in what you store. The card number is not needed to reconcile.",
        refund: "A refund done on the provider's side. Our ledger may never have heard of it.",
      },
    },
    match: {
      short: "Match",
      title: "The recon job joins the report with the ledger",
      body: "A recon job loads the file into a staging table and joins it with the ledger on the provider's transaction id and currency. A `FULL OUTER JOIN` keeps rows that exist on only one side: those are exactly the ones we want.\n\nThe ledger side uses a window a little wider than the day, because the provider closes its day in its own time zone and payments near midnight drift across the boundary.",
      fields: {
        "FULL OUTER JOIN": "Keeps unmatched rows from both sides, with `NULL` on the missing side.",
        provider_txn_id: "Never match on amount and time alone: two $45 payments a second apart are common.",
        currency: "The same id with a different currency is a mismatch, not a match.",
        created_at: "Two extra hours on each side of the day catch cut-off drift.",
        NULL: "`ptx_8813` is in the report and not in our ledger as paid.",
      },
    },
    classes: {
      short: "Classes",
      title: "Every difference falls into one of four classes",
      body: "The job labels each row that did not match cleanly. 23 payments were charged but we say `failed` or `pending`. 6 we call paid, but the provider never booked them. 3 have the same id and a different amount. 2 provider payments have two ledger rows.\n\nThe classes matter because each one has a different cause and a different safe action.",
      check: {
        q: "Which class can the job safely fix on its own?",
        options: [
          "`missing_ours`: we say pending or failed, the provider confirms the same id, amount and currency",
          "`amount_differs`: overwrite our amount with the provider's",
          "`missing_theirs`: refund the buyer, since the provider has no charge",
        ],
        answer: 0,
        why: "The provider is the record of whether money moved. When its answer agrees with ours on id, amount and currency and only our status is behind, moving `pending` to `paid` is safe. The other classes need a person to find out why.",
      },
      fields: {
        missing_ours: "Charged, but our ledger missed it: the lost callback or the lying timeout.",
        missing_theirs: "We think it is paid, the provider has no charge. Possibly goods shipped for free.",
        amount_differs: "One side is wrong and the job cannot know which.",
        duplicate: "One charge, two rows: a callback processed twice.",
      },
    },
    autofix: {
      short: "Auto-fix",
      title: "Auto-fix the safe class, with an audit record",
      body: "For each `missing_ours` row the job asks the provider's status API once more. If it still says `succeeded`, the amount and currency match and nothing was refunded since, the job moves our row to `paid` and writes who changed it and why: `recon 2026-11-17`.\n\n23 of 34 mismatches (68 %) close with no human. The unmatched amount drops to $1,450.",
      watch: "An automatic fix only moves a row forward to what the provider confirms. It never deletes, never changes an amount, never moves money.",
      fields: {
        Authorization: "The shop's API key for the provider. Hidden here.",
        status: "The provider's current state of the payment, not the one from yesterday's file.",
        amount_minor: "Must equal both the file and our row, or the case goes to a person.",
        refunded_minor: "A refund since the report would make `paid` wrong. `0` here.",
      },
    },
    review: {
      short: "Review",
      title: "Everything else goes to a review queue with an SLA",
      body: "The other 11 cases become review cases. Each one carries both sides of the story, so the analyst does not have to rebuild it from logs. `ptx_8790`: we booked $1,290.00, the provider $129.00. Somebody typed an extra zero.\n\nEach case has a deadline. Cases past their SLA show up in the finance stand-up, because an open mismatch is money nobody can account for.",
      fields: {
        case_id: "Built from the day and the provider's id, so the same mismatch always gets the same case.",
        class: "Tells the analyst where to start looking.",
        ours_minor: "What our ledger says, in cents.",
        theirs_minor: "What the provider booked, in cents.",
        sla_due: "Two business days to resolve, then it escalates.",
      },
    },
    totals: {
      short: "Totals",
      title: "Day-end totals per currency",
      body: "Row-by-row matching can miss things a sum catches: a fee rule that changed, a line the parser skipped. So the job also compares net totals per currency, minus what open cases already explain.\n\nUSD is $1,161.00 apart, and the open `ptx_8790` case explains it exactly. EUR is 500.00 short with no case behind it. That is unexplained money, so the job pages a person.",
      watch: "Never add up amounts across currencies. One total per currency, always.",
      fields: {
        provider_net: "The provider's amounts minus fees, in minor units.",
        open_cases: "The difference already covered by review cases.",
        unexplained: "Must be `0`. Anything else means the matching missed something.",
        "on-call": "A human gets woken for unexplained money, not for every mismatch.",
      },
    },
    rerun: {
      short: "Re-run",
      title: "A re-run fixes the same thing twice",
      body: "The provider found an error and re-sent yesterday's report. The job ran again for the same day. Every fix from run #1 happened again: `ord_3307` got a second adjustment, and every open case got a copy.\n\nNow the ledger says one payment was paid twice, and analysts work the same mismatch in two cases.",
      check: {
        q: "How should the job make a second run for the same day harmless?",
        options: [
          "Refuse to run twice for one day",
          "Delete yesterday's fixes and cases, then redo them",
          "Give every fix a key from day, provider id and action, and skip a key that already exists",
        ],
        answer: 2,
        why: "Re-runs are needed: reports get corrected and jobs crash halfway. A unique key on (day, provider id, action) makes the second attempt a no-op, and the fix only applies if the row is still in the expected state.",
      },
      fields: {
        v2: "A corrected report. Real, and it will happen again.",
        "run #2": "The same day processed a second time.",
        adjust: "A ledger change applied once more.",
        copies: "Case ids were random, so the same mismatch opened a new case.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "Every fix has a key; re-runs change nothing",
      body: "Before changing the ledger the job inserts the fix into `recon_fixes` with a unique key. If the key is already there, it skips. The update itself only touches rows still `pending` or `failed`, so even a race cannot apply it twice.\n\nCase ids come from the day and the provider id, so a re-run finds the existing case and updates it. Run the job ten times: the ledger and the queue end up the same.",
      fields: {
        recon_fixes: "The log of every automatic change: what, when, by which run. Also the audit trail.",
        "ON CONFLICT": "The database decides whether this fix already happened.",
        "status IN": "The fix applies only from the expected state, never to a row someone already changed.",
        "INSERT 0 0": "No row inserted: run #2 found the fix and did nothing.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules of reconciliation.\n\n1) Store amounts as integer minor units with their currency. 2) Every day, match the provider's report with your ledger by their transaction id, currency and a widened date window. 3) Classify every difference; auto-fix only rows the provider confirms, moving them forward, with an audit record. 4) Send the rest to a review queue with both sides and an SLA, and check totals per currency so nothing unexplained hides. 5) Key every fix and case so a re-run changes nothing.",
    },
  },
};

export default text;
