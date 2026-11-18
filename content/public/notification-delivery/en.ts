import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Notification delivery",
  summary:
    "A business app texts login codes, \"invoice received\" notices and payment receipts. Sending them inside the request ties the app to a slow provider. An outbox, a queue and a sender worker take the provider out of the request; then come rate limits, delivery receipts, a fallback chain with deadlines, dedup, user preferences, cost and a second provider.",
  learn: [
    "Why a notification is written to an outbox with the business event and sent by a worker, not inside the request",
    "Rate limits per provider with a token bucket, `429` and `Retry-After`, and a separate lane for login codes",
    "Accepted is not delivered: delivery receipts, a fallback chain push, SMS, email, and deadlines that stop an expired code",
    "One event, one message per channel: idempotency keys, quiet hours, preferences, cost per message and provider failover",
  ],
  nodes: {
    client: "Phone app",
    api: "Business API",
    sms: "SMS provider A",
    db: "Outbox DB",
    queue: "Queue",
    worker: "Sender worker",
    limiter: "Rate limiter",
    push: "Push service",
    email: "Email provider",
    sms2: "SMS provider B",
  },
  metrics: {
    p95: "API p95 latency",
    delivered: "Delivered",
    dupes: "Duplicate messages",
    spend: "Messaging spend per day",
  },
  steps: {
    inline: {
      short: "Inline",
      title: "The API sends the SMS inside the request",
      body: "A user logs in. The Business API makes a one-time code and calls the SMS provider right there, in the same request, before it answers the phone app. Invoice notices and payment receipts go the same way: the business action and the message share one request.\n\nOn a good day this takes 320 ms and nobody notices. The app is now exactly as fast and as available as someone else's server.",
      fields: {
        Authorization: "The app's API key at the provider. Hidden here.",
        to: "The phone number. Personal data: hidden here and masked in your logs too (`+99890***4512`).",
        sender: "The sender name the phone shows. Many operators accept only names registered in advance.",
        client_ref: "Our own id for this message. It comes back in the delivery receipt, so we can match the two.",
        status: "`accepted` means the provider took the message into its queue. Not that the phone got it.",
        parts: "How many SMS segments were billed. A long or non-Latin text costs 2 or 3.",
      },
    },
    slow: {
      short: "Slow",
      title: "A slow provider stops logins and everything else",
      body: "At 09:00 the provider answers in 10 s instead of 0.3 s. Each login waits for it and times out. Waiting requests hold server threads, all 200 are busy, and even `GET /invoices`, which sends no SMS at all, gets `503`.\n\nAt 09:14 the provider goes down for maintenance. Now login is down too, because the code is sent in the same request that creates it.",
      watch: "Every external call inside a request adds its latency and its downtime to yours.",
      check: {
        q: "The provider will be slow or down again. How do you keep login and the rest of the API fast?",
        options: [
          "Raise the timeout to 30 s so slow sends still finish",
          "Retry the send three times inside the request",
          "Save the message to the database together with the event, answer at once, and let a background worker send it",
        ],
        answer: 2,
        why: "The request only has to record that a message must be sent, in the same transaction as the code or the invoice. That is a fast local write. Sending, waiting and retrying move to a worker, where a slow provider delays a message but blocks nobody.",
      },
      fields: {
        timeout: "No answer in 10 s. The message may still be sent later; we do not know.",
        "504": "The phone app gets an error after 10 seconds of waiting.",
        busy: "Every thread waits on the provider. New requests have nowhere to run.",
        "503": "An endpoint that has nothing to do with SMS fails too.",
        refused: "The provider is down. With inline sending, so is our login.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Write the message to an outbox in the same transaction",
      body: "The login request now saves the code and one `outbox` row in a single transaction: which event, which channel, which template, and by when it must arrive. Then it answers `202 Accepted`. The provider is not called at all.\n\nIf the transaction fails, there is no code and no message. If it commits, the message will be sent. No code without its SMS, no SMS for a code that never existed. p95 drops to 140 ms.",
      fields: {
        code_hash: "Only a hash of the code is stored, like a password. The code itself travels in the SMS.",
        outbox: "A table of messages to send. It lives in the same database as the business data, so one transaction covers both.",
        event_id: "The business event this message belongs to. It becomes the dedup key later.",
        deadline_at: "A login code is useless after 2 minutes. The message carries its own deadline.",
        COMMIT: "Code and message are saved together, or neither is.",
      },
    },
    worker: {
      short: "Worker",
      title: "A queue and a sender worker do the sending",
      body: "A relay reads new outbox rows and publishes them to a queue, one topic per channel. A sender worker takes a message, calls the provider and retries on errors with backoff. The phone app is out of the picture: it got its `202` long ago.\n\nThe provider is still slow sometimes. Now that only delays a few messages; logins stay at 140 ms, and retries bring delivered up to 95 %.",
      fields: {
        notification_id: "The outbox row this queue message came from.",
        channel: "`sms`, `push` or `email`. Each channel has its own topic and its own worker pool.",
        deadline_at: "The worker drops the message after this time instead of sending a dead code.",
        attempt: "Retry count. After the last attempt the message goes to a dead letter queue.",
      },
    },
    throttle: {
      short: "429",
      title: "Month end: the provider answers 429",
      body: "At 18:00 on the last day of the month, 40 000 invoice notices land in the queue. The worker sends as fast as it can, 400 a second. The provider allows 50 and answers the rest with `429`. Retries at once only add to the pile.\n\nWorse, a user trying to log in waits behind 40 000 invoice notices. Some requests time out on our side after the provider accepted them, the worker retries, and about 120 people a day get the same SMS twice.",
      check: {
        q: "What should the worker change so 429s stop and login codes are not stuck?",
        options: [
          "Retry every 429 at once until it passes",
          "Limit its own pace per provider just under the provider's limit, honour Retry-After, and give login codes their own share",
          "Start ten times more workers",
        ],
        answer: 1,
        why: "The limit is the provider's, so more workers or faster retries just make more 429s. A token bucket per provider keeps our sending under 50 a second, a 429 pauses the bucket for Retry-After, and a reserved share keeps the login lane moving during a big campaign.",
      },
      fields: {
        "429": "Too many requests: the provider refused this message without sending it.",
        "Retry-After": "Wait 2 s before the next attempt. Ignoring it can get the account blocked.",
        "X-RateLimit-Limit": "50 messages per second for this account.",
        "X-RateLimit-Remaining": "Nothing left in this second.",
      },
    },
    bucket: {
      short: "Bucket",
      title: "A token bucket per provider, a separate lane for codes",
      body: "Before each send the worker takes a token from a shared rate limiter: one bucket per provider, 50 tokens a second, shared by all workers. No token, wait 20 ms. A `429` pauses the bucket for `Retry-After`. Login codes have their own bucket with 10 of the 50, so a campaign cannot starve them.\n\nThe invoice notices now take about 15 minutes instead of failing, and codes arrive in seconds. Delivered goes back to 96 %.",
      watch: "Operators have quirks: some reject unregistered sender names, and non-Latin text uses 70 characters per segment instead of 160, so the same notice costs twice as much.",
      fields: {
        "bucket:sms_a": "One bucket per provider account, shared by every worker. A per-worker limit adds up past the provider's.",
        rate: "Tokens added per second: the provider's limit.",
        burst: "The most that can go out at once after a quiet period.",
        otp: "Login codes get their own lane, so a campaign never delays them.",
        "Retry-After": "After a 429 the whole bucket waits, not just one worker.",
      },
    },
    dlr: {
      short: "Receipt",
      title: "Accepted is not delivered: delivery receipts",
      body: "The provider's `200` only means it took the message. Whether the phone got it arrives later as a delivery receipt (DLR): a callback to our webhook, seconds or hours later, and sometimes never. The worker marks a message `sent`; the DLR moves it to `delivered`, `failed` or `expired`.\n\nCounted honestly, delivered is 88 %, not 96 %. The phone is off, the number is no longer in use, the operator dropped the message.",
      watch: "No receipt after the deadline is its own status, `unknown`. Never report it as delivered.",
      check: {
        q: "The receipt says `UNDELIVERED` for an invoice notice: the phone is off. What should happen next?",
        options: [
          "Try the next channel the user has, within a deadline set for this kind of message",
          "Send the same SMS every minute until it is delivered",
          "Mark it done: the provider accepted it",
        ],
        answer: 0,
        why: "An invoice notice is still useful by email an hour later, so the worker moves on to the next channel in a fallback chain. Each kind of message has its own chain and deadline: a login code that has expired is not worth sending anywhere.",
      },
      fields: {
        Signature: "Proves the receipt came from the provider. A webhook without it is a door anyone can knock on.",
        message_id: "The provider's id from the send response.",
        status: "The final word from the operator: `DELIVERED`, `UNDELIVERED` or `EXPIRED`.",
        error: "Why: the phone is off or out of coverage.",
        done_at: "When the operator gave up. 1 min 40 s after the send here, hours in other cases.",
      },
    },
    fallback: {
      short: "Fallback",
      title: "A fallback chain with a deadline per kind of message",
      body: "Each kind of message has a chain. Invoice received: push first, because it is free; if the app does not confirm within 10 minutes, SMS; if the SMS fails, email. Payment receipt: email. Login code: push or SMS only.\n\nThe chain stops at the first confirmed delivery, and at the deadline. A login code expires in 2 minutes, so it never falls back to email, which may arrive in 5. Delivered reaches 99 %.",
      fields: {
        chain: "The channels to try, in order, for this kind of message.",
        ack: "The app confirms it showed the push. Push providers rarely report delivery themselves.",
        DELIVERED: "A confirmed delivery ends the chain. No email on top.",
        deadline: "For a code it equals the code's expiry: after that, any message is useless.",
        expired: "The chain stops quietly. The user can ask for a new code.",
      },
    },
    dedup: {
      short: "Dedup",
      title: "One event, one message per channel",
      body: "The queue delivers at least once. A worker that crashed after the provider accepted, or a send that timed out on our side, comes back as a retry, and the user gets the same text twice. Duplicates cost money and look broken.\n\nBefore calling the provider, the worker inserts a row keyed by event and channel. If the row already exists, another attempt owns this message and the worker skips it. The same key goes to the provider as a reference, so its own dedup can catch a retry after a timeout. Duplicates drop to 0.",
      watch: "The key is the event plus the channel, not the message text. The same notice by SMS and by email is fine; two SMS are not.",
      fields: {
        deliveries: "One row per event and channel that was ever sent.",
        event_id: "The business event: this invoice, received by this user.",
        "ON CONFLICT": "The database decides who sends. Two workers cannot both win.",
        provider_ref: "Sent to the provider as an idempotency key. Many providers drop a second message with the same reference.",
        "INSERT 0 0": "Already sent or being sent: skip.",
      },
    },
    prefs: {
      short: "Preferences",
      title: "User preferences and quiet hours",
      body: "Before sending, the worker reads the user's preferences: which channels per kind of message, quiet hours and time zone. This user wants invoice notices by push and email, receipts by email only, and nothing between 22:00 and 08:00.\n\nA receipt at 23:40 waits until 08:00. A login code ignores quiet hours, because the user is asking for it right now. Fewer unwanted SMS cut spend from $410 to $330 a day.",
      watch: "Some messages are not optional: security alerts and codes. Keep them out of the opt-out list, and out of marketing.",
      fields: {
        channels: "Allowed channels per kind of message, chosen by the user.",
        quiet_hours: "A local time window with no non-urgent messages.",
        tz: "Quiet hours are in the user's time, not the server's.",
        hold: "The message is scheduled for later, not dropped.",
      },
    },
    failover: {
      short: "Failover",
      title: "Cost per message and a second provider",
      body: "Every send writes a cost line: provider, segments, encoding, price. Finance can now see spend per kind of message, and that one long template costs 3 segments each time.\n\nWhen provider A starts failing, a circuit breaker opens after 41 % errors in 2 minutes and the worker sends through provider B. B costs more per segment, so spend rises a little, but codes keep arriving. After a few healthy probes, traffic goes back to A.",
      watch: "Keep the second provider warm with a small share of real traffic. A backup that is never used fails on the day you need it.",
      fields: {
        provider: "Which account sent it: the basis of every cost and quality report.",
        parts: "Billed segments. Shorter templates are the cheapest optimisation.",
        encoding: "`gsm7`: 160 characters a segment. `ucs2` for other alphabets: 70.",
        price_usd: "The price of this one message. Summed per day, per provider, per template.",
        breaker: "The circuit breaker: provider A is skipped until probes pass.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules of notification delivery.\n\n1) Never call a provider inside the user's request: write the message to an outbox in the same transaction as the event, and let a worker send it from a queue. 2) Pace sending with a token bucket per provider, honour `429` and `Retry-After`, and give login codes their own lane. 3) Accepted is not delivered: track receipts, and treat no receipt as unknown. 4) Use a fallback chain per kind of message with a deadline, so an expired code is never sent. 5) Dedup on event plus channel, and respect preferences and quiet hours. 6) Log the cost of every message and keep a second provider warm behind a circuit breaker.",
    },
  },
};

export default text;
