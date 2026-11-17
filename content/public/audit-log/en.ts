import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Audit log",
  summary:
    "Someone in the back office changed a customer's bank account, the next payout went to a stranger, and nobody can prove who did it. This lesson builds an audit trail that answers who did what, when, from where, and what it looked like before and after, and that survives crashes, a growing table and an insider with database access.",
  learn: [
    "What an audit event holds and why it is written in the same transaction as the change",
    "Moving audit to its own append-only store through an outbox, partitioned by month",
    "Making tampering visible with a hash chain and signed checkpoints",
    "Personal data in the audit, a separate reader role, retention on write-once storage and an investigation by request id",
  ],
  nodes: {
    admin: "Back-office user",
    api: "Back-office API",
    db: "Customer database",
    relay: "Audit relay",
    auditdb: "Audit store",
    insider: "Insider",
    signer: "Signing service",
    archive: "WORM archive",
    investigator: "Investigator",
  },
  metrics: {
    untraced: "Changes without an actor",
    p95: "API p95",
    hot: "Audit on fast disks",
    undetected: "Unnoticed tampering",
  },
  steps: {
    who: {
      short: "Who?",
      title: "Bank details changed, and nobody can say who",
      body: "A customer complains that this month's payout never arrived. It went to an account they do not own. The database shows the account was changed on Tuesday at 09:41.\n\nThat is all it shows. The old account number was overwritten, and `updated_by` is the single login that 40 staff share. About 14 changes a day are like this: real, and owned by nobody.",
      watch: "An `updated_at` column is not an audit log. It keeps one moment and forgets everyone before it.",
      fields: {
        bank_account: "The new value. Bank details are sensitive, so the lesson hides them.",
        updated_at: "Only the last change. The one before is lost.",
        updated_by: "A shared service account. It proves that someone used the back office, not who.",
        gone: "The previous value is lost, so even the damage cannot be measured.",
      },
    },
    event: {
      short: "Event",
      title: "One audit event per business action",
      body: "Every business action now writes an event: who did it, what action, on what, when, the value before and after, the request it came from and the network. Staff log in as themselves, so `actor_id` is a person.\n\nThe event is written in the same transaction as the change: either both exist or neither does. A bank-details change without its event is impossible.",
      watch: "Log business actions, not table writes. `customer.bank_account.update` means something to an investigator; `UPDATE customers` does not.",
      fields: {
        actor_id: "The person, from their own login. Never a shared account.",
        action: "A stable name for the business action, in dotted form.",
        target: "What was changed: type and id.",
        before: "The value before the change. Here masked: sensitive values are stored encrypted or as a fingerprint.",
        after: "The value after. A fingerprint is enough to tell whether two changes set the same account.",
        request_id: "Ties this event to everything else the same request did, across services.",
        ip: "Only the network, not the full address: enough to see \"from outside the office\", less personal data.",
      },
    },
    hot: {
      short: "Hot table",
      title: "Two years later the audit table owns the database",
      body: "Every action writes a row and nothing is ever deleted. The audit table is now 2.1 TB, 61% of the customer database. Backups take 9 hours, vacuum on that table never finishes, and the API's p95 has gone from 52 ms to 310 ms.\n\nThe audit is slowing down the very business it records, and it shares a failure domain with it.",
      check: {
        q: "The audit must leave the customer database. How should the API send events to a separate store?",
        options: [
          "After the commit, call the audit service over HTTP and forget it",
          "Write the event to an outbox table in the same transaction and let a relay ship it",
          "Write the event to the application log file and collect the files",
        ],
        answer: 1,
        why: "Fire-and-forget loses events on every crash or network blip, and a lost audit record is a hole nobody can explain later. An outbox row commits together with the change; the relay delivers it at least once, and the store drops duplicates.",
      },
      fields: {
        audit_events: "The largest table, growing every minute.",
        backup: "The whole database is backed up and restored at the audit's size.",
        vacuum: "Maintenance cannot keep up with a table this large.",
        p95: "Business requests pay for the audit's weight.",
      },
    },
    outbox: {
      short: "Outbox",
      title: "Same transaction, separate store: the outbox",
      body: "The API still writes the event in the business transaction, but into a small `audit_outbox` table. A relay reads the outbox, writes each event to the audit store and only then deletes the outbox row.\n\nIf the store is down, events wait in the outbox and the change still succeeds. A slow audit write is fine; a lost one is not, because an incomplete audit trail cannot be trusted for any case.",
      watch: "Watch the outbox size. An outbox that grows means the relay has stopped, and the trail is getting late.",
      fields: {
        BEGIN: "One transaction for the business change and its event.",
        audit_outbox: "A small queue table: rows live only until the relay has shipped them.",
        COMMIT: "Both rows become real at once, or neither does.",
        relay: "Delivers at least once. After a crash it may send an event twice.",
      },
    },
    partitions: {
      short: "Partitions",
      title: "Append-only, one partition per month",
      body: "The audit store has one table split into monthly partitions. New events land in the current month; old months are never touched again, so they can be backed up once and later moved away whole.\n\nThe relay's database user can only insert. Nobody's application role can update or delete an audit row.",
      fields: {
        "PARTITION BY RANGE": "The table is split by event time.",
        audit_events_2026_11: "This month's partition. Queries for a time range only read the months they need.",
        REVOKE: "No update, no delete: the store is append-only by permission.",
        "ON CONFLICT": "A duplicate from the relay is ignored by `event_id`.",
      },
    },
    tamper: {
      short: "Tamper",
      title: "Someone with superuser access deletes a row",
      body: "Permissions stop applications, not a database superuser. Late at night someone with that access deletes exactly one event: the bank-details change from step one.\n\nThe store says `DELETE 1`. No error, no alert, and the next investigation will find a payout to a stranger with no change before it.",
      watch: "The people who can change the audit are often the people the audit is meant to watch.",
      fields: {
        superuser: "Above every permission in the database.",
        DELETE: "Removes one inconvenient event.",
        "DELETE 1": "Success. Nothing in the store notices.",
      },
    },
    chain: {
      short: "Hash chain",
      title: "Each record carries the hash of the previous one",
      body: "Each event stores `prev_hash`, and its own hash covers the previous hash plus the event's canonical bytes. Change or remove one record and every hash after it stops matching.\n\nAn hourly verify job walks the chain. When the insider's deletion happens, the next run reports the exact gap: a record between `ae_01J9Z3` and `ae_01J9Z5` is missing.",
      check: {
        q: "A careful insider deletes a row and then recomputes every hash after it. What does the hourly verify show?",
        options: [
          "A broken link at the deleted row",
          "Nothing, but tight permissions make this impossible anyway",
          "Nothing: a rebuilt chain is valid, so its head must be signed somewhere the insider cannot reach",
        ],
        answer: 2,
        why: "A chain catches a removed row only if the attacker cannot rebuild it. So the head hash and the record count are signed every hour by a separate service with a key the insider does not hold, and the checkpoint goes to write-once storage.",
      },
      fields: {
        "SHA-256": "A cryptographic hash. No one can make two different inputs give the same output.",
        prev_hash: "Links this record to the one before it.",
        canonical: "One fixed byte form of the event (key order, number format), or the same event hashes differently.",
        BROKEN: "The stored link does not match the previous record's hash: something was removed.",
      },
    },
    anchor: {
      short: "Checkpoint",
      title: "Signed checkpoints anchor the chain",
      body: "A careful insider could delete a row and rebuild every hash after it. So every hour the store asks a separate signing service to sign the current head hash and the record count. The key lives in that service; nobody with database access can use it.\n\nThe signed checkpoint is written to a write-once archive. A rebuilt chain no longer ends at a signed hash, and the count does not match.",
      fields: {
        Authorization: "The audit store's credential for the signing service. Hidden here.",
        count: "Number of records up to this point. A deleted row changes it.",
        head_hash: "The hash of the last record: one value that stands for the whole chain so far.",
        key_id: "Which key signed, so verification still works after the key is rotated.",
        signature: "The proof. Hidden here; anyone with the public key can check it.",
      },
    },
    pii: {
      short: "Access",
      title: "The audit contains personal data: minimise it and lock reading",
      body: "An audit trail collects who did what to whom, so it is personal data itself. Events keep ids and fingerprints instead of names, passport numbers and full bank details, and IPs keep only the network.\n\nReading the audit is a role of its own. Support and analytics lose access; investigators get it through a ticket, and every query they run is audited as well.",
      check: {
        q: "Monthly partitions older than 13 months are rarely read but must be kept for years. What happens to them?",
        options: [
          "Exported to write-once object storage, checked against the checkpoint, then dropped from the store",
          "Kept in the audit store forever, since the disks are already bought",
          "Deleted, since nobody reads them",
        ],
        answer: 0,
        why: "Old months move to cheap object storage with an object lock, so not even an admin can delete them before the retention date. The export is checked against the signed checkpoint before the partition is dropped, and fast disks shrink from 2.1 TB to 380 GB.",
      },
      fields: {
        audit_reader: "The only role that can read audit events.",
        GRANT: "Given to named people, through a ticket, not to whole teams.",
        REVOKE: "Teams that only needed it \"just in case\" lose it.",
        "itself audited": "Who looked at whose history is recorded too.",
      },
    },
    retention: {
      short: "Retention",
      title: "Retention: old months go to write-once storage",
      body: "Rules require keeping the audit for several years, but nobody needs last year's events on fast disks. Each month older than 13 months is exported as one compressed file to object storage with an object lock in compliance mode.\n\nBefore the partition is dropped, the export's last hash is compared with the signed checkpoint for that month. The archive stays verifiable years later.",
      watch: "Retention cuts both ways: keep audit data as long as the rules require, and no longer.",
      fields: {
        checkpoint: "The export matches what was signed at the time, so nothing changed on the way.",
        "object lock": "Write once: until that date nobody, including the account owner, can delete or overwrite it.",
        "DROP TABLE": "A whole month leaves the fast store in one cheap operation.",
      },
    },
    investigate: {
      short: "Investigate",
      title: "The investigation: one request id, the whole story",
      body: "Back to the payout. The investigator takes the `request_id` from the bank-details event and asks for everything that request did. Two events come back: `u_17` changed the account and, 43 ms later in the payouts service, the payout destination.\n\nThe chain is intact up to the last signed checkpoint, so the result holds up: who, what, when, from where, before and after.",
      fields: {
        request_id: "Generated at the edge and passed to every service, so their events can be joined.",
        u_17: "A person, not a shared login.",
        "payout.destination.change": "The second effect of the same request, recorded by a different service.",
        "chain ok": "The answer comes from records that provably were not changed.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for an audit log.\n\n1) One event per business action: actor, action, target, time, before and after, request id. 2) Write it in the same transaction as the change; ship it through an outbox, because a lost record is worse than a slow one. 3) Keep it in its own append-only store, partitioned by month. 4) Chain the records by hash and sign the head regularly with a key outside the database. 5) Minimise personal data and give reading its own audited role. 6) Move old months to write-once storage, verified against the checkpoints.",
    },
  },
};

export default text;
