import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Reliable callbacks",
  summary:
    "Another system sends you a message. What it takes so the message is never lost, never handled twice and never slows you down.",
  learn: [
    "Why `200 OK` comes only after the message is saved",
    "How a queue and a worker split the reply from the heavy work",
    "When to acknowledge (`ack`): before the work or after it",
    "Redelivery and the idempotency key",
  ],
  nodes: {
    provider: "Sender",
    api: "API",
    store: "Database",
    queue: "Queue",
    worker: "Worker",
  },
  metrics: {
    incoming: "Incoming",
    p95: "Reply p95",
    lost: "Lost",
    dupes: "Handled twice",
  },
  steps: {
    sync: {
      short: "Synchronous",
      title: "All the work before the reply",
      body: "The sender posts a callback. The API checks the document, writes it to the database and only then replies.\n\nWhen the work is heavy the reply takes seconds, and the sender has a timeout of its own.",
      watch: "A sender never waits forever. On timeout it retries or gives up.",
      fields: {
        "X-Signature": "The sender signs the body so you can tell a real callback from a forged one. A secret, so it stays hidden here.",
        event_id: "The sender's own ID for this event. It stays the same on every retry, which matters later.",
        "X-Response-Time": "Almost four seconds. If the sender gives up at three, it already sent the callback again.",
      },
    },
    "false-ok": {
      short: "False OK",
      title: "`200 OK` even on failure",
      body: "The database write failed half way. The code caught the exception and returned success anyway.\n\nThe sender believes the message arrived and never sends it again. The data is lost silently: nothing in the log, nothing on screen.",
      watch: "A success reply is a promise: “I have saved this”. If you have not, return an error so the sender retries.",
      check: {
        q: "`200` must mean \"saved\", but the full work takes about 4 s. What gives both an honest and a fast reply?",
        options: [
          "Ask the sender to raise its timeout to 10 s",
          "Reply `200` at once and save in the background",
          "Write the raw message to an inbox table, then reply",
        ],
        answer: 2,
        why: "The API only inserts the message as received into an `inbox` table and then replies `200`. Replies drop from seconds to about 45 ms, and nothing is lost: the message is saved before the reply.",
      },
      fields: {
        ERROR: "The database refused the write. This should have become a `5xx` reply.",
        ROLLBACK: "Nothing was saved. Yet the sender received `200 OK`.",
      },
    },
    "save-first": {
      short: "Save first",
      title: "Save first, reply second",
      body: "The API now does one thing: it writes the message as received into an **inbox** table and replies `200` at once.\n\nThe heavy work waits. Replies take milliseconds, and the message is safe the moment it is written.",
      watch: "The inbox write can fail too. Then reply `5xx`: the sender retries and nothing is lost.",
      fields: {
        inbox: "A plain table of received messages. No checks, no joins: the write is fast and rarely fails.",
        payload: "The body exactly as it arrived, so the work can be redone later without asking the sender.",
        "INSERT 0 1": "One row written. Only now does the API reply `200`.",
      },
    },
    queue: {
      short: "Queue",
      title: "Heavy work goes to a queue",
      body: "Once the message is saved, the API puts a small job on a queue. A worker takes it, does the work and writes the result.\n\nThe API and the worker no longer wait for each other. More callbacks make the queue longer, not the reply slower.",
      fields: {
        delivery_mode: "`2` means persistent: the queue keeps the job on disk and it survives a restart.",
        event_id: "The job carries only the key. The full message is already in the inbox.",
      },
    },
    "early-ack": {
      short: "Early ack",
      title: "Acknowledged too early",
      body: "The worker tells the queue “got it” (`ack`) the moment a message arrives, then starts working. Mid-way the worker crashes.\n\nThe queue has already dropped the message and the work never finished. The message is gone.",
      watch: "`autoAck` is convenient, but it means “delivered”, not “done”.",
      check: {
        q: "The worker now acks only after the result is written. What changes?",
        options: [
          "Nothing is lost and nothing is handled twice",
          "Nothing is lost, but some messages arrive twice",
          "The queue stalls while it waits for slow acks",
        ],
        answer: 1,
        why: "If the worker crashes, the queue redelivers the message, so losses drop to zero. But a message that was partly handled comes again: about 4 duplicates a minute.",
      },
      fields: {
        auto_ack: "The queue counts the message as handled the moment it is sent, before the worker has done anything.",
      },
    },
    "ack-after": {
      short: "Ack after",
      title: "Ack only when the work is done",
      body: "The worker acknowledges after the result is written. If it crashes, the queue **redelivers** the message.\n\nLosses drop to zero. But now one message sometimes arrives twice.",
      watch: "Every at-least-once system produces duplicates. You cannot remove them, only handle them.",
      fields: {
        redelivered: "The queue says it has sent this message before. Someone may already have done part of the work.",
        ACK: "Sent only after the result is committed. Until then the queue keeps the message.",
      },
    },
    duplicates: {
      short: "Duplicate",
      title: "One message, two results",
      body: "Duplicates come from both ends: the sender retries after a timeout, and the queue redelivers after a worker crash.\n\nWork that is not idempotent runs twice: a document is created twice, a balance is topped up twice.",
      watch: "Anything that touches money or documents must give the same result when repeated.",
      fields: {
        "X-Retry-Count": "The sender's second attempt: it never saw the first reply.",
        event_id: "The same ID as the first time. This is how the duplicate can be recognised.",
      },
    },
    idempotency: {
      short: "Idempotency",
      title: "The idempotency key",
      body: "Every message has a stable key, such as the document ID and its status. Before working, the worker checks the key: if it is already done, it only acknowledges.\n\nThe key is stored under a **unique** constraint, so even two workers at once write only one result.",
      fields: {
        "ON CONFLICT": "If the key is already there, the database skips the insert instead of failing.",
        "INSERT 0 0": "Zero rows: this event was already done. The worker acknowledges and moves on.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for a reliable callback.\n\n1) `200` only after the message is saved. 2) Heavy work in a queue and a worker. 3) Ack after the work. 4) Every handler is idempotent: a repeat gives the same result.",
    },
  },
  scenarios: {
    slow: {
      label: "Reply in 30 s",
      steps: {
        "slow-db": {
          short: "Slow DB",
          title: "The inbox write takes 30 seconds",
          body: "The database is under a heavy report and every write waits for a lock. The inbox insert, normally a few milliseconds, now takes 30 seconds.\n\nThe callback is a synchronous call: the sender holds the connection and waits for the `200` on the same line. It gave up long ago.",
          watch: "The reply still comes. Nobody is listening for it any more.",
          fields: {
            "X-Response-Time": "30 seconds. The sender's timeout is 3, so for it this delivery failed.",
          },
        },
        "slow-retry": {
          short: "Retries",
          title: "Timeouts turn into retries",
          body: "For the sender every timeout is a failed delivery, so it sends the same callback again. Each retry also waits 30 seconds and also times out.\n\nOne event now arrives three times, and the extra traffic makes the slow database slower still.",
          fields: {
            "X-Retry-Count": "The third attempt. The first two were saved, but their `200` came too late.",
            event_id: "The same ID every time. Without idempotency each copy becomes a job.",
          },
        },
        "slow-end": {
          short: "Outcome",
          title: "Outcome: nothing lost, three times the work",
          body: "Nothing is lost: every copy was saved. But the queue fills with copies and the worker does the same job up to three times, about 36 a minute.\n\nCompare with the normal path: a fast `200` is not only about speed. It is what stops the sender from retrying.",
        },
      },
    },
    lost: {
      label: "Callback lost",
      steps: {
        gone: {
          short: "Lost",
          title: "The callback never arrives",
          body: "A network failure between the sender and you drops some callbacks on the way. The sender got no answer and, after a few retries, gave up.\n\nOn your side nothing happened: no error, no log line. Document `doc_5521` stays pending forever.",
          watch: "You cannot see a callback that never came. Only a regular check against the source finds it.",
          fields: {
            event_id: "This event never reached the API. Nothing on your side knows its ID.",
          },
        },
        "gone-poll": {
          short: "Reconcile",
          title: "Reconcile: ask about what is still pending",
          body: "Every few minutes the API takes documents that have been pending too long and asks the sender for their status itself.\n\nThis is a synchronous call in the other direction: the API waits, and the status comes back on the same line. Lost callbacks are no longer lost, only late.",
          fields: {
            Authorization: "Your own key for the sender's API. A secret, hidden here.",
            status: "The real status. The API records it as if the callback had arrived.",
            updated_at: "When the status changed at the sender. The lost callback would have said the same.",
          },
        },
        "gone-end": {
          short: "Outcome",
          title: "Outcome: late, and sometimes twice",
          body: "The network recovers and the delayed callback finally arrives, after reconciliation has already recorded the status. The same event now comes from two sides, about 2 times a minute.\n\nThe cost of reconciliation: extra calls to the sender and duplicates. Which is why handling must be idempotent.",
        },
      },
    },
  },
};

export default text;
