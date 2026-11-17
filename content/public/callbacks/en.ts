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
    },
    "false-ok": {
      short: "False OK",
      title: "`200 OK` even on failure",
      body: "The database write failed half way. The code caught the exception and returned success anyway.\n\nThe sender believes the message arrived and never sends it again. The data is lost silently: nothing in the log, nothing on screen.",
      watch: "A success reply is a promise: “I have saved this”. If you have not, return an error so the sender retries.",
    },
    "save-first": {
      short: "Save first",
      title: "Save first, reply second",
      body: "The API now does one thing: it writes the message as received into an **inbox** table and replies `200` at once.\n\nThe heavy work waits. Replies take milliseconds, and the message is safe the moment it is written.",
      watch: "The inbox write can fail too. Then reply `5xx`: the sender retries and nothing is lost.",
    },
    queue: {
      short: "Queue",
      title: "Heavy work goes to a queue",
      body: "Once the message is saved, the API puts a small job on a queue. A worker takes it, does the work and writes the result.\n\nThe API and the worker no longer wait for each other. More callbacks make the queue longer, not the reply slower.",
    },
    "early-ack": {
      short: "Early ack",
      title: "Acknowledged too early",
      body: "The worker tells the queue “got it” (`ack`) the moment a message arrives, then starts working. Mid-way the worker crashes.\n\nThe queue has already dropped the message and the work never finished. The message is gone.",
      watch: "`autoAck` is convenient, but it means “delivered”, not “done”.",
    },
    "ack-after": {
      short: "Ack after",
      title: "Ack only when the work is done",
      body: "The worker acknowledges after the result is written. If it crashes, the queue **redelivers** the message.\n\nLosses drop to zero. But now one message sometimes arrives twice.",
      watch: "Every at-least-once system produces duplicates. You cannot remove them, only handle them.",
    },
    duplicates: {
      short: "Duplicate",
      title: "One message, two results",
      body: "Duplicates come from both ends: the sender retries after a timeout, and the queue redelivers after a worker crash.\n\nWork that is not idempotent runs twice: a document is created twice, a balance is topped up twice.",
      watch: "Anything that touches money or documents must give the same result when repeated.",
    },
    idempotency: {
      short: "Idempotency",
      title: "The idempotency key",
      body: "Every message has a stable key, such as the document ID and its status. Before working, the worker checks the key: if it is already done, it only acknowledges.\n\nThe key is stored under a **unique** constraint, so even two workers at once write only one result.",
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for a reliable callback.\n\n1) `200` only after the message is saved. 2) Heavy work in a queue and a worker. 3) Ack after the work. 4) Every handler is idempotent: a repeat gives the same result.",
    },
  },
};

export default text;
