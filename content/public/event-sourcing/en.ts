import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Event sourcing",
  summary:
    "An online shop keeps one row per order and updates it in place. Disputes cannot be answered and two edits at once silently overwrite each other. Event sourcing stores every change as an immutable event in a stream with a version, rebuilds state and read models from the events, and then has to deal with long streams, old event formats, read lag and the right to be forgotten.",
  learn: [
    "Why a row updated in place loses history, and how an append-only stream with versions keeps it",
    "Optimistic concurrency with `expected_version` and a 409 that tells the writer what changed",
    "Projections with checkpoints, rebuilds, snapshots for long streams and upcasting of old events",
    "CQRS read lag in the UI, and GDPR erasure of immutable events with crypto-shredding",
  ],
  nodes: {
    app: "Shop app",
    support: "Support agent",
    api: "Order service",
    orders: "Orders table",
    store: "Event store",
    projector: "Projector",
    views: "Read model",
    vault: "Key vault",
  },
  metrics: {
    unknown: "Disputes with no answer",
    overwritten: "Overwritten edits",
    lag: "Read model lag",
    "load-ms": "Load one stream",
  },
  steps: {
    table: {
      short: "Table",
      title: "An order is a row that keeps changing",
      body: "The order service keeps one row per order. Placing, paying, changing the address, shipping: each is an `UPDATE` of the same row. The customer app and the support agents write to it.\n\nThe row always shows the present. It cannot show the past: who changed what, when, and from which value.",
      fields: {
        SET: "The new value replaces the old one. The old one is gone.",
        status: "One column holds the whole life of the order, only its last state.",
        updated_at: "When something changed last, not what changed.",
        "UPDATE 1": "Done. Nothing remembers the address before this one.",
      },
    },
    lost: {
      short: "Lost",
      title: "Support overwrites the customer, nobody can tell",
      body: "At 10:02 the customer changes the delivery address in the app. One second later a support agent saves a form that was opened at 09:58 with the old address. The parcel goes to the old address.\n\nThe customer says \"I changed it at 10:02\". The row only says `9 Oak Ave`. About 23 disputes a day end with \"we cannot see that\", and about 9 edits a day are silently overwritten.",
      watch: "Logs are not a history: they are sampled, rotated and not written in the same transaction as the data.",
      check: {
        q: "What keeps every change and makes the stale write visible?",
        options: [
          "An `order_history` table filled by a trigger after each update",
          "Store each change as an event with a version per order; state is computed from the events",
          "Lock the order while the support form is open",
        ],
        answer: 1,
        why: "A trigger table records the result of the overwrite but does not prevent it. Events with a version make the change itself the record, and a writer that read version 5 cannot append after version 6 unnoticed. A lock held by an open form blocks the customer for minutes.",
      },
      fields: {
        app: "The customer's change, correct and newest.",
        support: "The agent's save, based on what they saw four minutes earlier.",
        "09:58": "When the form was loaded. Its data was already old at 10:02.",
        "nothing else": "One column, one value. No who, no when, no before.",
      },
    },
    store: {
      short: "Events",
      title: "Append events, never update them",
      body: "Every change becomes an **event**: `OrderPlaced`, `ItemAdded`, `AddressChanged`, `OrderShipped`. Events of one order form a **stream**, numbered 1, 2, 3 and so on. The table only gets inserts.\n\nThe current order is computed by folding its events in order. The dispute is now a query: the stream shows both address changes, who made them and when.",
      watch: "Name events in the past tense, as business facts. `AddressChanged`, not `UpdateOrder`.",
      fields: {
        stream_id: "One stream per order: every event of `ord_77`, in order.",
        version: "Position in the stream. 5 means four events came before this one.",
        type: "What happened, in business words.",
        UNIQUE: "Two events can never claim the same position in one stream.",
        fold: "State = apply every event in order to an empty order.",
        "INSERT 0 1": "One new fact. Nothing old was touched.",
      },
    },
    conflict: {
      short: "Conflict",
      title: "Expected version: the stale write is refused",
      body: "Every append says which version the writer last saw. The support form loaded version 5; meanwhile the customer appended version 6. The store refuses the append with `409` and says what happened since.\n\nThe form reloads, shows the agent the customer's new address and asks again. No edit is lost silently: either it applies on top of what the writer saw, or the writer finds out.",
      check: {
        q: "The customer double-taps \"Pay\". Both requests carry `expected_version: 7`. What happens?",
        options: [
          "Both are appended, the order is paid twice",
          "The first is appended as version 8, the second gets 409 and finds the order already paid",
          "Both get 409",
        ],
        answer: 1,
        why: "Only one event can take position 8, so the store accepts exactly one of the two. The second sees that the stream moved on and that the order is already paid, so it can answer success without paying again.",
      },
      fields: {
        expected_version: "\"I decided based on version 5.\" Optimistic: no lock while the form is open.",
        events: "One or more events, appended all together or not at all.",
        "409 Conflict": "The stream is already at a newer version.",
        current_version: "Where the stream really is now.",
        since: "What the writer missed, so the UI can show it instead of a bare error.",
      },
    },
    projection: {
      short: "Projection",
      title: "Read models are built from the events",
      body: "Folding streams is fine for one order, not for \"all open orders of this city\". A **projector** reads new events from the store and updates a **read model**: an ordinary table shaped for the screens. Writes go to the store, reads go to the read model; this split is **CQRS**.\n\nThe projector saves its checkpoint in the same transaction as the update, so after a crash it continues exactly where it stopped. A new screen gets a new read model, built by replaying all events from the start.",
      watch: "A read model can be dropped and rebuilt at any time. The events never can.",
      fields: {
        checkpoint: "Position of the last event applied. The projector's bookmark.",
        apply: "Each event updates the read model. `UPDATE` is fine here: this table is disposable.",
        "same transaction": "Update and checkpoint commit together: no event applied twice, none skipped.",
        lag: "How far the read model is behind the store. Normally a few hundred milliseconds.",
      },
    },
    long: {
      short: "Long stream",
      title: "A stream with 120 000 events",
      body: "Wholesale buyers have an account stream: every order line, payment and credit change since 2021. To accept one new order the service loads and folds all 120 037 events of `account-b_12`. That takes 2.6 seconds, on every order.\n\nThe store is fine, the service is not: it reads the same history again and again to learn a state that barely changed.",
      check: {
        q: "How should the service load this account faster?",
        options: [
          "Delete events older than one year",
          "Save the folded state every few hundred events and load only the events after it",
          "Read the account state from the read model instead",
        ],
        answer: 1,
        why: "Deleting events breaks the history that is the point of the design. The read model lags and is not safe to decide on. A snapshot is the same fold, saved: load it, apply the few events after it, done.",
      },
      fields: {
        "account-b_12": "One wholesale buyer's stream.",
        "ORDER BY": "Events must be applied in stream order.",
        "120037 rows": "Five years of activity read on every new order.",
        fold: "The CPU part, on top of the reading.",
      },
    },
    snapshot: {
      short: "Snapshot",
      title: "Snapshots: start from a saved state",
      body: "Every 500 events the service saves a **snapshot**: the folded state of the stream at a version. Loading now means the latest snapshot plus the events after it: 37 rows instead of 120 037. 30 ms instead of 2.6 s.\n\nA snapshot is a cache, not a source of truth. It carries the version of the state's shape, and when that shape changes, old snapshots are thrown away and rebuilt from events.",
      watch: "Most streams are short. Snapshot only streams that measurably need it.",
      fields: {
        version: "The stream position this state includes.",
        schema: "Version of the snapshot format. Code with schema 4 ignores this one and folds again.",
        state: "The folded result, exactly what the fold would compute.",
        "37 rows": "Only events newer than the snapshot are read.",
      },
    },
    schema: {
      short: "Old events",
      title: "New code meets an event from 2024",
      body: "The team splits the address into street, city and zip. New `AddressChanged` events carry the new shape. The new projector replays from the start for a rebuild and hits an event from March 2024 with only a `to` field. It crashes five times and stops.\n\nThe read model freezes: lag grows to 95 seconds, then minutes. Events are immutable, so the old shape will be in the store forever.",
      fields: {
        AddressChanged: "Same event type, written two years ago in the first format.",
        "data.street": "The new code assumes the new shape.",
        stopped: "A projector that cannot apply an event cannot skip it either, or the read model is wrong.",
        checkpoint: "Stuck: nothing after 88113 reaches the read model.",
      },
    },
    upcast: {
      short: "Upcast",
      title: "Upcasting: old events are converted on read",
      body: "Every event carries a schema version. An **upcaster** is a small pure function that turns version 1 into version 2 when the event is read. The stored event is not changed; the projector and the service only ever see the newest shape.\n\nThe projector restarts, catches up at full speed and the lag falls back below a second. Adding a field with a default needs no upcaster; renaming or splitting one does.",
      watch: "Never edit stored events in place to \"migrate\" them. Write a new event type if the meaning changes.",
      fields: {
        type: "The type stays the same: it is the same business fact.",
        version: "Schema version of this event. 1 = written by the old code.",
        data: "Old shape in, new shape out.",
        zip: "Unknown in 2024. The upcaster says so with `null` instead of guessing.",
      },
    },
    readlag: {
      short: "Read lag",
      title: "The user saves and sees the old value",
      body: "The customer changes the address and the app opens the order page. The page reads the read model, which is 340 ms behind: it still shows the old address. The customer thinks the save failed and does it again.\n\nThe append returns the new version, 7. The app sends it as `min_version`; the read side waits up to a second until the projection reaches it, or the app simply shows what it just saved. Only the writer needs this: other users can see the change a moment later.",
      watch: "Never fix lag by reading the event store from every screen. That undoes CQRS.",
      check: {
        q: "The read model is still behind after one second. What should the API answer?",
        options: [
          "200 with the old data, without saying anything",
          "202 with \"still updating\" and the version, so the app can show its own saved value or retry",
          "500 Internal Server Error",
        ],
        answer: 1,
        why: "Old data presented as current is exactly the bug. A clear \"not yet\" lets the app keep showing what the user saved. It is not an error, so not 500.",
      },
      fields: {
        min_version: "\"I just wrote version 7, do not show me anything older.\"",
        "X-Read-Model-Version": "Which version the answer is built from.",
        version: "Matches what the app asked for: the read is consistent with the write.",
        address: "The new address. The customer trusts the save.",
      },
    },
    shred: {
      short: "Erasure",
      title: "Forget a customer without editing events",
      body: "A customer asks to be erased. Events cannot be deleted without breaking streams, and they also live in backups and replicas. So personal fields were encrypted from the start with a key per customer, kept in a key vault. Erasure destroys that key.\n\nThe 318 events stay, the order totals and history still add up, but name, address and phone are unreadable noise everywhere, backups included. This is **crypto-shredding**. Read models drop their copies when they replay or receive a `CustomerErased` event.",
      watch: "Keep personal data out of event types and ids: `c_501`, not an email address, in the stream id.",
      fields: {
        subject: "The customer whose key is destroyed.",
        keys_destroyed: "Current and rotated old key. Without them the ciphertext is noise.",
        events_affected: "Events that still exist, but their personal fields can never be read again.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for event sourcing.\n\n1) Store changes as immutable past-tense events in streams with a version; state is a fold. 2) Append with `expected_version`; a 409 tells the writer what it missed. 3) Read models are disposable projections with a checkpoint in the same transaction; rebuild them by replay. 4) Snapshot only long streams, and treat snapshots as a cache. 5) Events are forever: version them and upcast old ones on read. 6) Plan for read lag in the UI, and encrypt personal data per subject so erasure is a key deletion.",
    },
  },
};

export default text;
