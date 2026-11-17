import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Sending webhooks reliably",
  summary:
    "A payment service tells online shops that a payment went through by calling their URL: a webhook. How to send it without blocking payments, how the shop knows the call is real and fresh, and how both sides survive retries, duplicates, out-of-order events and endpoints that are gone.",
  learn: [
    "Why webhooks go through a queue and a sender, not inside the payment request",
    "HMAC signatures over id, timestamp and body, and replay protection",
    "Retries with backoff, and an idempotent receiver that answers fast",
    "Ordering by version, and handling endpoints that stay dead for days",
  ],
  nodes: {
    payments: "Payments API",
    shop: "Shop server",
    shopdb: "Shop DB",
    queue: "Webhook queue",
    sender: "Sender",
    attacker: "Attacker",
    oldshop: "Dead endpoint",
  },
  metrics: {
    p95: "Payment p95",
    forged: "Fake events accepted",
    dups: "Double fulfilments",
    backlog: "Pending deliveries",
  },
  steps: {
    inline: {
      short: "Inline",
      title: "The webhook is sent inside the payment",
      body: "When a card payment succeeds, the Payments API calls the shop's URL with the news and waits for the answer before replying to the buyer.\n\nOne shop's server takes 8 seconds to answer. Every payment for that shop now takes 8 seconds, and the payment threads are held by a stranger's slow code.",
      fields: {
        type: "What happened. The shop decides what to do by this name.",
        order_id: "The shop's own order, so it knows what to ship.",
        "X-Response-Time": "8.1 s of the payment spent waiting for the shop.",
      },
    },
    queue: {
      short: "Queue",
      title: "A queue and a sender take the webhook out of the payment",
      body: "The Payments API now stores the event and answers the buyer at once. A separate sender takes events from the queue and calls the shops, with a 10-second timeout.\n\nAny `2xx` answer means delivered. Anything else, or no answer, means try again later. A slow shop now slows only its own deliveries.",
      fields: {
        evt_9f2: "The event id. It stays the same on every retry.",
        timeout: "The sender does not wait forever. A shop that needs longer must answer first and work later.",
        "2xx": "The only answer that counts as delivered.",
      },
    },
    forged: {
      short: "Forged",
      title: "Anyone can call the shop's webhook URL",
      body: "The URL is not a secret: it shows up in browser tools, logs and support tickets. An attacker sends the same JSON with an order of their own and a large amount.\n\nThe shop cannot tell it from a real call. It marks the order paid and ships goods that nobody paid for.",
      watch: "A webhook endpoint is a public door. Trust what you can verify, not where the request seems to come from.",
      fields: {
        order_id: "The attacker's own order, still unpaid.",
        amount: "Whatever the attacker likes. Nothing checks it.",
        "marked paid": "The shop acted on an unverified message.",
      },
    },
    signing: {
      short: "Signature",
      title: "Sign every webhook with HMAC",
      body: "Each shop gets its own secret when it registers the endpoint. The sender computes an HMAC-SHA256 over the event id, the timestamp and the exact body, and sends it in a header.\n\nThe shop recomputes it with the same secret and compares. Without the secret nobody can make a valid signature, and changing one byte of the body breaks it.",
      watch: "Verify the raw bytes you received, before parsing JSON. Re-serialised JSON may not match byte for byte.",
      check: {
        q: "An attacker copies one real, signed request from a log and sends it again the next day. What does signature checking alone do?",
        options: [
          "Rejects it: a signature is single-use",
          "Accepts it: the signature is still valid for those bytes",
          "Rejects it: the secret changes every day",
        ],
        answer: 1,
        why: "The signature proves who made the bytes, not when they are sent. The same bytes carry the same valid signature forever. To stop replays, the timestamp must be signed and checked, and the id remembered.",
      },
      fields: {
        "Webhook-Id": "Unique event id, part of the signed string.",
        "Webhook-Timestamp": "When the sender signed it, in Unix seconds. Also signed.",
        "Webhook-Signature": "`v1,` plus the base64 HMAC. There may be several during secret rotation.",
      },
    },
    replay: {
      short: "Replay",
      title: "A real request, sent again",
      body: "A misconfigured proxy logged full requests, and the log leaked. The attacker resends yesterday's `payment.succeeded` for a real order.\n\nThe signature is valid, because these are the very bytes the sender signed. The shop ships a second parcel for one payment.",
      fields: {
        leaked: "The attacker never learned the secret. They only have a copy of a real request.",
        yesterday: "The request is old, but nothing checks its age.",
        valid: "The signature checks out, because nothing in the bytes changed.",
      },
    },
    timestamp: {
      short: "Timestamp",
      title: "Signed timestamp, a time window and a seen-id list",
      body: "The signed string is `id.timestamp.body`, so the timestamp cannot be changed without breaking the signature. The shop rejects anything older than 5 minutes and remembers ids it has seen in that window.\n\nThe comparison is constant-time, so the response time does not leak how many signature bytes were right.",
      watch: "Keep server clocks synced. A shop whose clock is 6 minutes off rejects every real webhook.",
      fields: {
        signed: "Id, timestamp and body glued together: all three are covered by the signature.",
        "HMAC-SHA256": "A keyed hash. Same secret and bytes give the same result.",
        "constant-time": "The compare takes the same time whatever the input, so it leaks nothing.",
        reject: "A day-old request is refused even with a valid signature.",
      },
    },
    retries: {
      short: "Retries",
      title: "The shop is down: retry on a schedule",
      body: "The shop's server is down for an hour during a deploy. The sender does not give up and does not hammer it either: it retries on a growing schedule with jitter, spread over about a day and a half.\n\nDeliveries pile up for that shop only. When it comes back, they drain over the following attempts.",
      check: {
        q: "The shop processed attempt 1 but answered after 12 s, past the 10 s timeout. What happens next?",
        options: [
          "The sender sends the same event again, and the shop may act on it twice",
          "Nothing: the shop did the work, so it counts as delivered",
          "The sender marks the endpoint dead",
        ],
        answer: 0,
        why: "The sender saw no answer in time, so for it the delivery failed. It retries the same `Webhook-Id`. Delivery is at least once, and the receiver must expect repeats.",
      },
      fields: {
        "503": "The shop is unavailable. A temporary failure, worth retrying.",
        attempt: "The sender counts attempts per event, not per shop.",
        schedule: "Growing gaps: quick retries for blips, long ones for outages.",
        jitter: "Random spread, so a shop that comes back is not hit by every retry at once.",
      },
    },
    duplicate: {
      short: "Duplicate",
      title: "A slow answer turns into a double bonus",
      body: "The shop handles the event inside the request: it marks the order paid and adds 500 bonus points. That takes 12 seconds, so the sender times out and retries.\n\nThe retry arrives while the first attempt is still running. The order is paid once, but the buyer gets the bonus twice. It happens about 25 times a day.",
      fields: {
        timeout: "For the sender the first attempt failed, although the shop is still working on it.",
        "attempt 2": "The same event id, delivered again.",
        bonus: "A side effect without a guard runs twice.",
      },
    },
    inbox: {
      short: "Inbox",
      title: "Receiver: remember the id, answer fast, work later",
      body: "The shop first inserts the `Webhook-Id` into an inbox table with a unique key. If the row already exists, the event was seen: it answers `200` and stops.\n\nIf the row is new, the shop answers `200` at once and does the real work in a background job. Answers take 12 ms, the sender stops retrying, and a repeat can never run twice.",
      watch: "Answer within the timeout, then process. Long work inside a webhook request always turns into duplicates.",
      fields: {
        webhook_id: "The event id from the header, unique in the inbox.",
        "ON CONFLICT": "A second delivery inserts nothing. The database settles the race.",
        background: "The slow work leaves the request, so the answer is quick.",
        "X-Response-Time": "12 ms: well inside the sender's 10 s timeout.",
      },
    },
    ordering: {
      short: "Ordering",
      title: "Events arrive out of order",
      body: "A payment succeeded and was refunded five minutes later. The first event hit the shop during its outage and is still waiting for a retry, so the refund arrives first.\n\nThe sender does not promise order. Each event carries a version of the payment, and the shop keeps the version it has applied.",
      watch: "Another option is a thin event: \"payment pay_771 changed\", and the shop fetches the current state from the API.",
      check: {
        q: "The refund (version 3) is applied. Now `payment.succeeded` (version 2) finally arrives. What should the shop do?",
        options: [
          "Apply it: it is the newest message received",
          "Answer 500, so the sender tries again later",
          "Skip it: its version is older than what the shop already has",
        ],
        answer: 2,
        why: "Arrival order is not event order. Version 2 is older than the applied version 3, so applying it would turn a refunded payment back into a paid one. The shop answers 200 and ignores it.",
      },
      fields: {
        type: "A refund: it comes after the success in real life, but before it on the wire.",
        created_at: "When the event happened at the sender. Useful for logs, not enough for ordering.",
        version: "The payment's version. Only a higher one changes the shop's state.",
        skipped: "The late, older event is accepted and ignored.",
      },
    },
    "dead-endpoint": {
      short: "Dead endpoint",
      title: "An endpoint that never comes back",
      body: "One shop closed and its domain expired. Every attempt fails, and 9000 events wait for it, taking sender slots.\n\nThe sender limits each endpoint to 2 deliveries in flight, so other shops are not slowed down. After 5 days of failures it disables the endpoint, emails the owner, and keeps the events for 30 days so they can be replayed from the dashboard.",
      watch: "Isolate endpoints from each other. One dead or slow customer must not delay everyone's webhooks.",
      fields: {
        NXDOMAIN: "The domain does not exist. No retry will fix that.",
        "per-endpoint": "A concurrency cap per shop, so one shop cannot take every worker.",
        disabled: "The sender stops trying and tells a human.",
        replay: "Events are kept, so the shop can fetch what it missed when it comes back.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for webhooks.\n\n1) Send from a queue with a timeout, never inside the business request. 2) Sign id, timestamp and raw body with a per-endpoint secret; verify in constant time. 3) Reject old timestamps and remember seen ids. 4) Retry on a growing schedule with jitter. 5) The receiver stores the id with a unique key, answers fast and works in the background. 6) Do not rely on order: use versions or fetch current state; isolate and disable dead endpoints.",
    },
  },
};

export default text;
