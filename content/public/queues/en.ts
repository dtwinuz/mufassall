import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Message queues",
  summary:
    "A shop sends an order email through a provider that takes 100 messages a second, and a sale brings 600 orders a second. How a queue absorbs the spike, and what you must set on it: leases, acks, backoff, a dead-letter queue and backpressure.",
  learn: [
    "How a queue between producer and workers smooths a spike",
    "Visibility timeout and ack: what happens when a worker dies or is slow",
    "Retries with exponential backoff and jitter, and a dead-letter queue for poison messages",
    "Scaling consumers by backlog and slowing producers with backpressure",
  ],
  nodes: {
    buyers: "Buyers",
    api: "Shop API",
    mail: "Mail provider",
    queue: "Queue",
    w1: "Worker 1",
    w2: "Worker 2",
    dlq: "Dead-letter queue",
    campaign: "Newsletter job",
  },
  metrics: {
    p95: "Order p95",
    backlog: "Backlog",
    delay: "Email delay",
    lost: "Lost emails",
  },
  steps: {
    direct: {
      short: "Direct",
      title: "The email is sent inside the order request",
      body: "When an order is paid, the API calls the mail provider and waits for its answer before replying to the buyer. The provider takes 0.8 s.\n\nAt 40 orders a second this works. The buyer waits a little longer, and nobody notices that the order now depends on a stranger's server.",
      fields: {
        Authorization: "The shop's API key at the provider. Hidden here.",
        template: "Which email to send. The provider fills it with the order data.",
        "X-Response-Time": "820 ms of every order request is spent waiting for someone else.",
      },
    },
    spike: {
      short: "Spike",
      title: "A sale: 600 orders a second",
      body: "At 10:00 a sale starts and orders jump fifteen times. The provider accepts 100 emails a second and rejects the rest with `429`.\n\nAPI threads hang on the provider, order requests time out, and the emails that got `429` are simply dropped. The busiest hour of the year is the worst one.",
      watch: "When a slow dependency sits inside the request path, its limit becomes your limit.",
      fields: {
        "429": "Too many requests: the provider protects itself.",
        "Retry-After": "Try again in a second. But the API has no place to keep the email meanwhile.",
        limit_per_second: "The provider's ceiling. No amount of API servers will raise it.",
      },
    },
    queue: {
      short: "Queue",
      title: "A queue between the order and the email",
      body: "The API now only puts a small job in a queue and answers the buyer at once. A worker takes jobs from the queue and sends them at the pace the provider accepts.\n\nThe spike does not disappear, it is spread over time: 42 000 jobs wait in the queue, and the last email leaves 8 minutes late. But no order fails and no email is lost.",
      watch: "A queue trades errors for delay. Watch the backlog and the age of the oldest message, not only errors.",
      fields: {
        persistent: "The queue writes the job to disk. It survives a broker restart.",
        order_id: "Only the key. The worker reads the rest when it builds the email.",
        depth: "How many jobs are waiting. The spike now shows up here, not as errors.",
      },
    },
    "scale-out": {
      short: "Scale out",
      title: "More workers, up to the provider's cap",
      body: "The autoscaler watches the backlog and the age of the oldest message, and starts a second worker. Both take from the same queue: each job goes to only one of them.\n\nThe backlog drains twice as fast and the delay drops to a minute and a half. A third worker would not help: two already come close to the provider's 100 a second.",
      watch: "Scale consumers by what they wait on. Past the downstream limit, more workers only add errors.",
      fields: {
        backlog: "Jobs waiting. The main signal for adding workers.",
        oldest_age: "How long the oldest job has waited: the delay a buyer actually sees.",
        "provider cap": "The ceiling that matters. Workers beyond it just hit `429`.",
      },
    },
    crash: {
      short: "Crash",
      title: "A worker dies holding a message",
      body: "Worker 2 takes message `m_8812` and dies before sending it. The queue did not delete the message on delivery: it only hid it for 30 seconds, the **visibility timeout**.\n\nNobody deleted it in time, so it becomes visible again and worker 1 takes it. The worker deletes a message, its ack, only after the email has gone out.",
      fields: {
        receive_count: "The second delivery of this message. The queue counts them.",
        visibility_timeout: "The lease: how long the message stays hidden from other workers.",
        DELETE: "The ack. Until it arrives, the message belongs to the queue, not the worker.",
      },
    },
    "lease-expired": {
      short: "Lease ran out",
      title: "A slow job outlives its lease",
      body: "A wholesale order has a 212-page receipt, and the PDF takes 45 seconds. The lease is 30. At 30 seconds the queue thinks worker 1 died and gives the message to worker 2.\n\nBoth finish, and the buyer gets two identical emails. Nothing crashed: the job simply took longer than the queue was told.",
      fields: {
        "212 pages": "A rare large job. The timeout was set for typical ones.",
        "visible again": "The lease is over while worker 1 is still working.",
        receive_count: "The second receive. The job is now done twice in parallel.",
      },
    },
    heartbeat: {
      short: "Heartbeat",
      title: "Extend the lease while working",
      body: "While a job runs, the worker extends its lease every 20 seconds. The message stays hidden as long as its worker is alive, and comes back 60 seconds after it dies.\n\nThe second guard stays too: the worker sends the provider an idempotency key from the message ID, so even a rare repeat becomes one email.",
      watch: "Delivery is at least once. Leases make repeats rare, never impossible.",
      fields: {
        EXTEND: "\"I'm still working on it.\" Sent by the worker, not by the queue.",
        visibility_timeout: "The new lease, counted from now.",
        "every 20 s": "Shorter than the lease, so one missed heartbeat does not release the message.",
      },
    },
    "retry-storm": {
      short: "Retry storm",
      title: "The provider is down, workers hammer it",
      body: "The mail provider goes down for twenty minutes. The workers catch the error and put the message back right away, so they get it again a moment later.\n\nEach message is tried dozens of times a minute. The workers burn CPU on nothing, and when the provider tries to come back up, it gets hit by thousands of retries at once.",
      fields: {
        "503": "The provider is unavailable. A temporary failure: worth retrying, but not right away.",
        "Retry-After": "The provider asks for 60 seconds of quiet.",
        "attempt 38": "The same message 38 times in a minute. The retries only add load.",
      },
    },
    backoff: {
      short: "Backoff",
      title: "Exponential backoff with jitter",
      body: "After a failure the worker returns the message with a delay that doubles each time: 10 s, 20 s, 40 s, 80 s, capped at 15 minutes. A random jitter is added so thousands of messages do not come back in the same second.\n\nThe provider gets room to recover, and when it does, the queue drains gradually instead of in one blow.",
      watch: "Without jitter, all messages that failed together retry together, and the storm comes back on schedule.",
      fields: {
        NACK: "\"Did not work, return it.\" The message goes back to the queue, not away.",
        delay: "It becomes visible again only after 86 s.",
        jitter: "A random addition. Retries spread out instead of arriving in waves.",
      },
    },
    dlq: {
      short: "DLQ",
      title: "A poison message goes to the dead-letter queue",
      body: "One message refers to an email template that was deleted. It fails every time, and no backoff will fix it. Without a limit it would circle in the queue forever.\n\nAfter 5 receives the queue moves it to a separate dead-letter queue. Others are not held up, an alert fires, and after the template is fixed the messages are sent back to the main queue.",
      watch: "A DLQ nobody watches is just a slower way to lose messages. Alert on its size.",
      fields: {
        max_receive_count: "After 5 failed receives the message counts as poisoned.",
        dead_letter_queue: "Where poisoned messages go. A separate queue, with its own alert.",
        moved: "The message left the main queue. Workers no longer waste attempts on it.",
        "last error": "The reason travels with the message, so it is clear what to fix.",
      },
    },
    backpressure: {
      short: "Backpressure",
      title: "Backpressure: the producer slows down",
      body: "Marketing launches a newsletter: 2 million emails pushed into the same queue at once. Order emails would wait behind them for hours.\n\nThe newsletter job now checks the queue depth before publishing. Above 20 000 it pauses and waits for the workers to catch up. The queue tells the producer to slow down instead of growing without limit.",
      watch: "An unbounded queue only hides an overload. Bound it, and decide what the producer does when it is full: wait, shed or fail.",
      fields: {
        depth: "The signal the producer reads. Above the limit it stops adding.",
        pause: "The producer waits instead of filling the queue.",
        resume: "Workers caught up. The newsletter continues at a pace the system can carry.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for a queue.\n\n1) Slow and limited work leaves the request path and goes through a queue. 2) Scale workers by backlog and the oldest message's age, up to the downstream limit. 3) Ack after the work; extend the lease for long jobs. 4) Retry with exponential backoff and jitter. 5) Poison messages go to a watched dead-letter queue. 6) Bound the queue and let producers slow down.",
    },
  },
};

export default text;
