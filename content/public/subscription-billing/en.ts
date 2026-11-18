import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Subscription billing",
  summary:
    "A SaaS product sells monthly plans and charges cards every night. Two runs of the job charge the same customer twice, cards get declined, customers upgrade mid-month, months have different lengths and the provider reports results later by webhook. Each problem has a concrete fix that keeps money correct and customers on board.",
  learn: [
    "Subscriptions, plans, billing periods and the invoice row behind every charge",
    "Overlapping billing runs: idempotency keys per invoice and leases on each row",
    "Dunning after a decline, and proration when a customer changes plan mid-period",
    "Month ends and time zones, provider webhooks, and cancelling at period end",
  ],
  nodes: {
    customer: "Customer",
    api: "Billing API",
    invoices: "Invoices DB",
    job: "Billing job",
    job2: "Billing job #2",
    provider: "Payment provider",
    mailer: "Email service",
  },
  metrics: {
    dupes: "Double charges",
    unpaid: "Unpaid invoices",
    recovered: "Recovered after decline",
    churn: "Involuntary churn",
  },
  steps: {
    subscribe: {
      short: "Subscribe",
      title: "A subscription is a plan plus a billing period",
      body: "A customer picks the Basic plan, $20.00 a month. The Billing API stores a subscription and opens its first invoice for the period from November 1 to December 1.\n\nEvery charge in this lesson belongs to exactly one invoice. The invoice is the unit of money: it says what is owed, for which period, and whether it is paid.",
      fields: {
        subscription_id: "The long-lived contract. Invoices come and go, the subscription stays.",
        plan: "What is sold and at what price. A price change means a new plan version, not an edit.",
        amount_minor: "Integer cents: `2000` = $20.00.",
        period_start: "Periods are half-open: start included, end excluded.",
        period_end: "The next period starts exactly here. No gaps, no overlaps.",
        status: "`open` until paid, then `paid`; or `void`, `uncollectible`.",
      },
    },
    nightly: {
      short: "Nightly run",
      title: "Every night a job renews what is due",
      body: "At 02:00 UTC a billing job selects every active subscription whose period has ended. For each one it creates the next invoice, charges the saved card through the payment provider and extends the period.\n\nTonight that is 18,412 subscriptions. The job takes about two hours.",
      fields: {
        current_period_end: "Due when this moment has passed.",
        active: "Paused, suspended and canceled subscriptions are not renewed.",
        "18 412 rows": "One night's work. At this size the run is long and may crash halfway.",
      },
    },
    overlap: {
      short: "Overlap",
      title: "Two copies of the job charge the same customers",
      body: "A deploy started a new instance of the billing service while the old one was still running. Both had the cron trigger, both selected the same due subscriptions and both charged them.\n\n41 customers paid twice tonight. Each will open a support ticket, and some will open a chargeback with their bank.",
      watch: "\"The cron runs once\" is a hope. Deploys, retries and failovers start second copies.",
      check: {
        q: "How do you make a second copy of the job harmless?",
        options: [
          "Make sure only one server has the cron entry",
          "Check after the run whether anyone was charged twice and refund them",
          "Each worker takes a lease on an invoice before charging, and each charge carries an idempotency key from the invoice",
        ],
        answer: 2,
        why: "One cron server is still a single point that fails and gets duplicated by deploys. A lease means only one worker owns an invoice at a time, and the idempotency key makes even a repeated call return the first charge.",
      },
      fields: {
        "node-a": "The old instance, still finishing its run.",
        "node-b": "The new instance from the deploy, starting its own run.",
        ch_501: "The first charge for `sub_42`.",
        ch_502: "The second charge for the same invoice period.",
      },
    },
    lease: {
      short: "Lease",
      title: "A lease per invoice and an idempotency key per charge",
      body: "A worker claims a batch of due invoices with `FOR UPDATE SKIP LOCKED` and writes `lease_until = now() + 10 min`. Another worker skips claimed rows. If a worker dies, its lease expires and someone else continues.\n\nThe charge request carries a key built from the invoice and the attempt number. If two calls slip through anyway, the provider returns the first charge to the second one.",
      watch: "The key is per invoice attempt, not random per request. A random key protects nothing.",
      fields: {
        "Idempotency-Key": "`in_7001-attempt-1`: the same invoice and attempt always give the same key.",
        invoice_id: "Stored with the charge so webhooks and reports can find the invoice.",
        "Idempotent-Replayed": "The provider saw this key before and returned the stored result.",
        status: "The first charge's result. No new money was taken.",
      },
    },
    decline: {
      short: "Decline",
      title: "The card is declined",
      body: "Every night about 4% of renewals fail. Most are not fraud: the card is out of funds until payday, expired, or hit a limit. Tonight that is $18,400 of unpaid invoices.\n\nThe first version simply canceled the subscription on a decline. 2.9% of customers a month were lost to it without ever deciding to leave.",
      check: {
        q: "What should happen after a decline that the provider marks as retryable?",
        options: [
          "Retry on a schedule over several days, tell the customer, keep access during a grace period, then suspend",
          "Retry every hour until it works",
          "Cancel at once and ask the customer to sign up again",
        ],
        answer: 0,
        why: "Soft declines often succeed a few days later, and the customer can update the card when told. Hourly retries look like card testing to banks and get the merchant flagged. Canceling loses a customer who still wanted the product.",
      },
      fields: {
        "402": "Payment Required: the charge failed, nothing was taken.",
        decline_code: "Why: `insufficient_funds` is temporary; a stolen or closed card is not.",
        retryable: "Retry only soft declines. Retrying a hard decline never works and annoys the bank.",
      },
    },
    dunning: {
      short: "Dunning",
      title: "Dunning: retries over days, a grace period, then suspend",
      body: "Each failed invoice gets a dunning record: retry on days 1, 3, 5 and 7, at mid-morning when salaries have landed rather than at 02:00. After each failure the customer gets an email with a link to update the card. Access continues until the grace period ends.\n\nIf all retries fail, the subscription is suspended, not deleted: paying later brings it back. 64% of declined invoices are recovered, and involuntary churn drops to 1.0%.",
      fields: {
        attempt: "How many tries so far. Part of the next idempotency key.",
        schedule_days: "Days after the first failure when the job tries again.",
        next_retry_at: "The job picks the record up when this time has passed.",
        grace_until: "Access stays on until here, so a late payment costs the customer nothing.",
        on_exhausted: "`suspend`: keep the data, stop the service, wait for payment.",
      },
    },
    proration: {
      short: "Proration",
      title: "Upgrade mid-period: credit the unused part, charge the new one",
      body: "On November 16 the customer upgrades from Basic ($20) to Pro ($50). Half the period is left. The unused half of Basic is worth $10.00 of credit; the remaining half of Pro costs $25.00. The customer pays $15.00 now, and the December invoice is the full $50.00.\n\nThe calculation is stored as invoice lines, so the customer, support and finance all see the same numbers.",
      watch: "Decide the rounding rule once (per day or per second, round to the cent) and use it everywhere.",
      check: {
        q: "A customer subscribed on January 31. When should the next two renewals be?",
        options: [
          "March 3 and April 3: add 31 days each time",
          "February 28 and March 31: keep the 31st, use the last day of shorter months",
          "February 28 and March 28: add one month to the previous end",
        ],
        answer: 1,
        why: "The subscription remembers its anchor day, 31. Each period end is that day in the next month, clamped to the month's last day. Counting from the previous end drifts to the 28th forever.",
      },
      fields: {
        "15 left": "Days left in the period at the moment of the change.",
        credit: "The unused part of the old plan, as a negative invoice line.",
        charge: "The new plan for the rest of the period.",
        "due now": "`2500 - 1000`, charged immediately with its own idempotency key.",
      },
    },
    monthend: {
      short: "Month end",
      title: "Month ends and time zones",
      body: "A customer in UTC+5 subscribed at midnight their time on January 31. The subscription stores the anchor day and the time zone, and computes each period end from them: February 28, March 31, April 30.\n\nThe moment itself is stored in UTC, so midnight on February 28 in UTC+5 is 19:00 on February 27 in UTC. The nightly run sees a lot of renewals on the 28th to 31st, so the job runs a little longer at month end.",
      fields: {
        anchor_day: "The day of the month the customer signed up. Never overwritten by a short month.",
        "+05:00": "The customer's offset. \"Monthly\" means their calendar, not the server's.",
        drift: "End plus one month, repeated: 31, 28, 28, 28... The anchor prevents it.",
        UTC: "Stored and compared in UTC; shown in the customer's time zone.",
      },
    },
    webhook: {
      short: "Webhook",
      title: "The provider confirms payments later by webhook",
      body: "Some charges do not finish in the call: the bank asks for extra verification or processes the payment later. The provider answers `pending`, and sends the final result as a signed webhook minutes or hours later.\n\nThe API checks the signature, skips an `event_id` it has seen and moves the invoice forward only (`open` to `paid`, never back). A nightly check asks the provider about every invoice still `pending` after 24 hours, in case a webhook was lost.",
      watch: "Before webhooks, pending charges were treated as failed, and paid customers got dunning emails.",
      fields: {
        Signature: "Proves the webhook came from the provider. A shared secret, hidden here.",
        event_id: "The same event can arrive twice. Process it once.",
        type: "`charge.succeeded` marks the invoice `paid`; `charge.failed` starts dunning.",
        invoice_id: "Sent with the charge, so the webhook finds its invoice without guessing.",
      },
    },
    cancel: {
      short: "Cancel",
      title: "Cancel at period end, or now with a refund",
      body: "Most customers who cancel have already paid for this month, so they keep access until the period ends. The subscription gets `cancel_at_period_end`, and the nightly job closes those before it looks for renewals.\n\nWithout that order, 312 canceled subscriptions a night were renewed, failed on removed cards and entered dunning. An immediate cancel is the other path: access stops now and the unused part is refunded, using the same proration rule.",
      fields: {
        cancel_at_period_end: "The customer's decision, applied on the date they already paid up to.",
        current_period_end: "The same boundary as for renewals: one moment, two outcomes.",
        RETURNING: "The ids feed the goodbye email and the access revocation.",
        "UPDATE 312": "Tonight's canceled subscriptions. None of them gets a new invoice.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for recurring billing.\n\n1) Every charge belongs to one invoice for one half-open period. 2) Assume the billing job runs twice: lease each invoice and give each charge an idempotency key from the invoice and attempt. 3) After a soft decline, run dunning: retries over days, emails, a grace period, then suspend. 4) Prorate plan changes as invoice lines with one rounding rule. 5) Keep the anchor day and the customer's time zone; store moments in UTC. 6) Let signed, deduplicated webhooks finish payments, check stuck invoices with the provider, and cancel at period end unless the customer asks for now.",
    },
  },
};

export default text;
