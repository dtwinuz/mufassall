import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Document lifecycle",
  summary:
    "An electronic invoice between two companies goes from draft to accepted, rejected or cancelled, and every legally important step must also be confirmed by an external registry. How to keep that state machine correct when two people click at once and the registry answers late, twice or never.",
  learn: [
    "Document states and a transition table instead of scattered ifs",
    "Optimistic concurrency: a `version` column, 0 rows updated and a 409",
    "Pending states until the registry confirms through a callback",
    "Idempotent callbacks, a status sync job, history and an outbox",
  ],
  nodes: {
    seller: "Seller app",
    buyer: "Buyer app",
    api: "Document API",
    db: "Document DB",
    registry: "Registry",
    worker: "Status sync",
    events: "Events",
  },
  metrics: {
    lost: "Lost updates",
    mismatch: "Differs from registry",
    stuck: "Stuck in pending",
    dups: "Duplicate effects",
  },
  steps: {
    lifecycle: {
      short: "States",
      title: "An invoice is a state machine",
      body: "The seller creates invoice `inv_5120` as a `draft`, signs it (`signed`) and sends it (`sent`). When it lands in the buyer's inbox it becomes `delivered`, and the buyer may `accept` or `reject` it. The seller may `cancel` it while the buyer has not answered.\n\nEvery change raises `version` by one. The server tells the client which actions are possible now, so the buttons follow the state, not the other way round.",
      fields: {
        state: "The current state. Only the server changes it.",
        version: "How many times the document has changed. Draft 1, signed 2, sent 3, delivered 4.",
        actions: "What this user may do in this state. The UI shows only these buttons.",
      },
    },
    race: {
      short: "Race",
      title: "Two users act at the same time",
      body: "The buyer clicks **accept**, and 5 ms later the seller clicks **cancel**. Both requests read `delivered`, both decide their action is allowed, both write.\n\nThe last write wins: the document ends up `cancelled`, while the buyer was told it was accepted and has already booked the goods. Nobody sees an error.",
      watch: "Read, decide, write is three steps. Another request can change the row between them.",
      check: {
        q: "How do you stop the second write from silently overwriting the first?",
        options: [
          "Update only if the row still has the version that was read",
          "Read the state again just before writing",
          "Let the request that arrived first win by its timestamp",
        ],
        answer: 0,
        why: "The next step puts `version = 4` into the `WHERE` of the update. The first writer moves the row to version 5, so the second update matches 0 rows instead of overwriting it.",
      },
      fields: {
        read: "Both requests saw the same old state.",
        accepted: "The buyer's write. It was correct when it was decided.",
        cancelled: "The seller's write silently replaced the buyer's.",
      },
    },
    version: {
      short: "Version",
      title: "Update only the version you read",
      body: "The update now names the version it was based on. If someone changed the row in between, the condition does not match and the database changes **0 rows**.\n\nThis is optimistic concurrency: no locks are held while the user thinks, the conflict is caught at the moment of writing. The API treats 0 rows as a conflict, never as success.",
      fields: {
        version: "Raised by one on every change. Its old value is the condition.",
        WHERE: "The row must still be exactly what the request read.",
        "UPDATE 0": "Nothing was changed: someone else was first.",
      },
    },
    conflict: {
      short: "409",
      title: "The loser gets a 409, not a silent overwrite",
      body: "The client sends the version it showed to the user in `If-Match`. The API returns **409 Conflict** with the current state and version.\n\nThe seller's screen reloads and says: the buyer has already accepted this invoice. Now the seller decides again, with the real state in front of them.",
      fields: {
        "If-Match": "The version the user saw. The API puts it into the `WHERE`.",
        "409": "Conflict: the document changed after you opened it.",
        error: "A stable code, so the client can show the right message.",
        state: "What the document is now. The client shows it instead of guessing.",
      },
    },
    transitions: {
      short: "Table",
      title: "Allowed moves come from one transition table",
      body: "A second buyer employee has a stale tab and clicks **reject** on the already accepted invoice, with a fresh version. The version check passes, but the move is wrong.\n\nEvery action goes through one table: `(state, action) -> next state`. `delivered + accept` is in it, `accepted + reject` is not, so the API answers 422 before writing anything. An accepted invoice is final: mistakes are fixed with a correcting document, not by moving it back.",
      watch: "Ifs scattered over controllers drift apart. One table is easy to read, to test and to draw.",
      fields: {
        "422": "The request is well-formed, but this move is not allowed from this state.",
        action: "What the user tried.",
        allowed: "What the table allows from `accepted`: nothing.",
      },
    },
    "too-early": {
      short: "Too early",
      title: "The registry has the last word, and it answers later",
      body: "An accepted invoice counts only once the registry has registered it. The API sends the buyer's signed acceptance and gets **202 Accepted**: received, still processing.\n\nThe API wrote `accepted` right away. An hour later the registry rejected some of these acceptances, for example because a signer's certificate was revoked. Now 37 documents are `accepted` here and rejected there.",
      check: {
        q: "What should the local state be between sending to the registry and its confirmation?",
        options: [
          "`accepted`, and roll it back if the registry rejects",
          "`delivered`, as if nothing happened yet",
          "A separate `accept_pending` state",
        ],
        answer: 2,
        why: "The next step adds `accept_pending`: the buyer has acted, but nothing final is shown or sent. Only the registry callback moves it to `accepted`, or back to `delivered` with the reason.",
      },
      fields: {
        action: "What the registry is asked to register.",
        signature: "The buyer's CMS signature over the acceptance. Not a secret, shortened here.",
        "202": "Received, not decided. Never treat it as success.",
        status: "`processing`: the answer will come later, through a callback.",
      },
    },
    pending: {
      short: "Pending",
      title: "Wait in a pending state until the registry confirms",
      body: "The table gets new rows: `delivered + accept -> accept_pending`, then `accept_pending + registered -> accepted` and `accept_pending + rejected -> delivered`. The same goes for sending and cancelling.\n\nThe registry calls back with the result. The API checks the signature header, moves the document and only then tells the buyer it is accepted. Local state and the registry agree again.",
      fields: {
        "X-Signature": "Proves the callback came from the registry. Hidden here.",
        event_id: "The registry's unique id for this event. Every retry repeats it.",
        status: "`registered`: the acceptance is now legally in force.",
        registered_at: "The time from the registry, shown in the document history.",
      },
    },
    "lost-dup": {
      short: "Lost, twice",
      title: "Callbacks come twice, or never",
      body: "The API took 12 seconds on the first callback, the registry gave up after 10 and sent it again. The buyer got two notifications, and in other cases the stock was booked twice.\n\nOther callbacks were lost on the way. 140 documents have been sitting in a pending state for days, and nothing will ever move them.",
      fields: {
        timeout: "The registry did not wait for our answer and counted the attempt as failed.",
        "attempt 2": "The same `event_id` again.",
        notified: "The side effect ran twice.",
        lost: "No callback, no retry: the document waits forever.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "Handle each event id once",
      body: "The handler first records `event_id` in a table with a unique key. If the row already exists, it answers 200 and does nothing. If it is new, it applies the transition in the **same transaction**.\n\nThe transition table helps too: a second `registered` finds the document already `accepted`, and that move is not in the table.",
      check: {
        q: "The callback for `inv_5133` never arrives. What moves it out of `accept_pending`?",
        options: [
          "The registry keeps retrying until it gets a 200",
          "A periodic job asks the registry about documents pending too long",
          "The buyer clicks accept once more",
        ],
        answer: 1,
        why: "The registry does not know its message was lost. The next step adds a job that asks the registry for the status of old pending documents and applies the answer through the same handler.",
      },
      fields: {
        event_id: "The deduplication key, from the registry.",
        "ON CONFLICT": "A second insert of the same id changes nothing.",
        "0 rows": "Already handled: answer 200 so the registry stops retrying.",
        "this transaction": "The event row and the state change are saved together or not at all.",
      },
    },
    sync: {
      short: "Sync",
      title: "A sync job asks about stuck documents",
      body: "Every 5 minutes a job selects documents in a pending state for longer than 15 minutes and asks the registry for their status.\n\nThe answer goes through the same handler as a callback, with its `event_id`. If the callback arrives later anyway, it is a duplicate and does nothing. The 140 stuck documents are settled.",
      fields: {
        status: "The registry's truth for this document.",
        event_id: "The same id a callback would carry, so both paths deduplicate together.",
        registered_at: "The time from the registry, not the time the job ran.",
      },
    },
    history: {
      short: "History",
      title: "Every transition writes history and an outbox row",
      body: "In one transaction the API updates the document, adds a history row (from, to, who, why, when) and an outbox row. A relay reads the outbox and publishes events.\n\nThe UI, notifications and accounting follow those events. A notification is never sent for a change that was rolled back, and support can see who moved the document and why.",
      fields: {
        document_history: "Append-only: from, to, actor, cause and time.",
        accept_pending: "The state before. History keeps every step, including pending ones.",
        outbox: "The event to publish, saved together with the change.",
        COMMIT: "All three rows are saved, or none of them.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for documents synchronised with a registry.\n\n1) States and moves live in one transition table. 2) Every update checks `version`; 0 rows means 409. 3) Until the registry confirms, the document is pending, never final. 4) Callbacks are deduplicated by `event_id`, and a sync job catches the lost ones. 5) Each transition writes history and an outbox row in the same transaction.",
    },
  },
};

export default text;
