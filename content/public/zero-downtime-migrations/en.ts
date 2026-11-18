import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Zero-downtime migrations",
  summary:
    "A shop wants customer phone numbers in one normalised format, in a new column of a 40-million-row table, without stopping checkout. A plain rename breaks the pods that still run the old code, and a 5 ms ALTER stops every query because it waits for a lock behind a long report. The safe way is expand and contract: add a nullable column, write both, backfill in batches, verify and switch reads, stop the old writes, and drop the old column last, with a way back at every phase.",
  learn: [
    "Why a rolling deploy means two app versions on one schema, and why a rename breaks the old one",
    "Locks on a big table: the lock queue behind a long query, lock_timeout, concurrent indexes",
    "Expand and contract: nullable column, dual write, batched backfill, verify, switch reads, drop last",
    "Adding NOT NULL without a long lock, and which phase can still be rolled back",
  ],
  nodes: {
    users: "Shoppers",
    old: "App (old)",
    new: "App (new)",
    db: "Customers DB",
    ci: "Migrations",
    report: "Nightly report",
    filler: "Backfill job",
  },
  metrics: {
    errors: "Checkout errors",
    blocked: "Longest blocked query",
    backfill: "Rows backfilled",
    rollback: "Time to roll back",
  },
  steps: {
    naive: {
      short: "Plan",
      title: "One migration, then the deploy",
      body: "Phone numbers are typed in by hand: `90 123-45-67`, `+998 (90) 1234567`. The team wants them in one format, E.164 (`+998901234567`), in a column called `phone_e164`. The plan: a migration renames the column, then version v2, which reads `phone_e164`, rolls out.\n\nThe `customers` table has 40 million rows and checkout writes to it 900 times a second. The rename itself takes 12 ms.",
      fields: {
        "0042": "The migration runs in the pipeline, just before the new code.",
        "RENAME COLUMN": "Instant: it only changes the name in the catalog.",
        phone_e164: "The name the new code expects.",
        "40 M rows": "A big, hot table: every lock on it is felt at checkout.",
      },
    },
    rename: {
      short: "Rename",
      title: "The old pods ask for a column that is gone",
      body: "The migration finishes at 14:00:03. The rollout replaces pods one at a time, and for the next minutes most of them still run the old code, which asks for `phone`. That column no longer exists: every checkout on an old pod fails with `500`.\n\nWith 9 of 12 pods still old, three quarters of checkouts fail. Rolling back the code does not help, because the old code needs the old name: the way back is another migration.",
      watch: "During a rolling deploy two versions of the app run against one schema. Every schema change must work with both.",
      check: {
        q: "Which order lets the old and the new code run side by side at every moment?",
        options: [
          "Rename first, then deploy as fast as possible",
          "Add the new column, write both, backfill, read the new one, stop writing the old one, drop it",
          "Deploy the new code first, then rename",
        ],
        answer: 1,
        why: "Any order with a rename has a moment when one version asks for a column that does not exist: the old code after it, or the new code before it. Expand and contract only adds things the old code ignores, and removes things only after no running code uses them.",
      },
      fields: {
        "does not exist": "The old code was not changed: it still writes `phone`.",
        "500": "The database error reaches the shopper.",
        "3/12": "The rollout takes minutes. All that time both versions are live.",
        "old code": "And a rollback would bring back exactly this code.",
      },
    },
    lock: {
      short: "Lock",
      title: "A 5 ms ALTER stops the whole table",
      body: "Second try, without a rename: `ADD COLUMN phone_e164`. It needs an exclusive lock on the table for a few milliseconds. But a nightly report has been reading `customers` since 13:42 and holds a shared lock. The ALTER waits for it.\n\nWorse: every new query on `customers` now queues behind the waiting ALTER, even plain reads. In 38 seconds 1,240 queries pile up and a third of checkouts time out. Nothing is slow by itself: everything is waiting in one line.",
      check: {
        q: "The ALTER itself takes 5 ms. Why does checkout stop?",
        options: [
          "Adding a column rewrites all 40 million rows",
          "The ALTER waits for a lock behind a long query, and every new query waits behind the ALTER",
          "The report uses up all database connections",
        ],
        answer: 1,
        why: "A nullable column without a default changes only the catalog: no rewrite. But the exclusive lock request goes into the lock queue, and later requests cannot jump ahead of it, even ones that would be compatible with the report. One long reader plus one tiny ALTER block the table.",
      },
      fields: {
        AccessShareLock: "What any SELECT holds. The report has held it for 38 minutes.",
        "waiting AccessExclusiveLock": "The ALTER needs the table to itself, so it waits for the report.",
        "waiting behind 902": "New queries are not allowed to pass the waiting ALTER.",
        "5 ms": "The work is tiny. The wait is the outage.",
      },
    },
    expand: {
      short: "Expand",
      title: "Expand: a nullable column, a lock timeout, a concurrent index",
      body: "The migration now sets `lock_timeout = 2s`: if the lock is not free in 2 seconds, the ALTER gives up instead of blocking the queue, and the pipeline tries again 30 seconds later. The column is nullable and has no default, so adding it takes 4 ms.\n\nThe index is built with `CONCURRENTLY`: slower, 11 minutes, but writes keep going the whole time. Old code ignores the new column, so rolling back is just deploying the previous version: 3 minutes.",
      watch: "Leave NOT NULL for the end. On 40 M rows it means a full scan under a heavy lock, unless it is added as NOT VALID and validated separately.",
      fields: {
        lock_timeout: "The longest this migration may block others: 2 s, then it retries.",
        "ADD COLUMN": "Nullable, no default: only the catalog changes, no rows are rewritten.",
        CONCURRENTLY: "Builds the index without blocking writes. It cannot run inside a transaction.",
        "try again": "A failed lock attempt is normal. Retry in a quiet moment.",
      },
    },
    dual: {
      short: "Dual write",
      title: "The new version writes both columns",
      body: "Version v2 rolls out. It writes the phone into both columns, but still reads the old one. For a while old and new pods run side by side, and both are correct: the old ones write `phone` only, the new ones write both.\n\nRollback is still trivial: the old version simply ignores `phone_e164`.",
      watch: "Every phase must work with the version before it and the version after it, because during a rollout both are live.",
      fields: {
        phone: "Still written and still read: it is the source of truth for now.",
        phone_e164: "Written too, so new and changed rows are already right.",
        "reads still": "Reads move only after the backfill and a check.",
      },
    },
    backfill: {
      short: "Backfill",
      title: "Backfill in small batches",
      body: "Once all 12 pods run v2, a job fills `phone_e164` for the old rows: 5,000 rows per batch by id range, 140 ms each, then a 50 ms pause. If a replica falls more than a second behind, the job waits. 8,000 batches take about 25 minutes, and no row is locked longer than one batch.\n\n`IS NULL` makes the job safe to restart: after a crash it skips what is done and never overwrites a value the app has just written.",
      check: {
        q: "The backfill starts while 4 of 12 pods still run the old version. What goes wrong?",
        options: [
          "Nothing: the backfill fixes every row",
          "Rows that old pods change after their batch has passed keep a stale phone_e164",
          "The old pods crash on the new column",
        ],
        answer: 1,
        why: "Old code writes only `phone`. If a customer changes their number on an old pod after the backfill has passed that id, `phone_e164` keeps the previous number, and the job will not come back. Start the backfill after 100% of pods write both, or keep the two in sync with a trigger.",
      },
      fields: {
        BETWEEN: "A range on the primary key: each batch touches a known, small set of rows.",
        "IS NULL": "Skip rows that are already filled: safe to re-run, never overwrites the app.",
        "sleep 50 ms": "Leaves room for checkout between batches.",
        "replica lag": "Big writes also have to be replayed on the replicas. The job slows down for them.",
        "UPDATE 4987": "13 rows of the range were filled already by v2.",
      },
    },
    switch: {
      short: "Switch reads",
      title: "Verify, then switch reads",
      body: "Before anything reads the new column, a query checks that every row agrees with the old one: 0 differences. Version v3 reads `phone_e164` behind a flag, first for 5% of requests, then for half, then for all, over two days. It still writes both columns.\n\nIf something is wrong, the flag goes back and v2 is still a valid version: both columns are full and current.",
      fields: {
        "IS DISTINCT FROM": "Like `<>`, but treats NULL as a value, so missing rows are counted too.",
        "count = 0": "Every row matches. Only now can the new column be trusted.",
        "still writes both": "So the way back to reading `phone` stays open.",
        "read-e164": "A flag turns reads over gradually and turns them back in seconds.",
      },
    },
    contract: {
      short: "Contract",
      title: "Contract: make the old column optional, the new one required",
      body: "The next version, v4, stops writing `phone`. If `phone` is still `NOT NULL`, every insert from v4 fails, so that constraint goes first. It is instant.\n\nThe new column must become required, but a plain `SET NOT NULL` scans 40 million rows under an exclusive lock. Instead, a CHECK constraint is added as `NOT VALID`, which only applies to new writes and takes milliseconds. `VALIDATE` then checks the old rows with a light lock: 3 minutes 40 seconds, reads and writes keep going.",
      fields: {
        "DROP NOT NULL": "Lets v4 insert rows without `phone`. Instant.",
        "NOT VALID": "Enforced for new and changed rows from now on, old rows not checked yet.",
        "VALIDATE CONSTRAINT": "Checks the old rows under a lock that does not block reads or writes.",
        "not blocked": "The long part runs without stopping checkout.",
      },
    },
    drop: {
      short: "Drop",
      title: "Drop the old column last",
      body: "v4 has run for 7 days, query logs show no reader of `phone`, and nobody plans to roll back to v3. Only now is the column dropped, again with `lock_timeout`. It takes 3 ms: the column is only marked as removed, the space comes back as rows are rewritten.\n\nThis is the one step with no way back except a restore. It is done last, on its own, after the rollback window has passed.",
      watch: "Code with `SELECT *` or cached prepared statements can break on a dropped column: list columns explicitly and tell the ORM to ignore the column one release earlier.",
      fields: {
        "7 days": "The rollback window: until it passes, v3 may come back and still needs `phone`.",
        lock_timeout: "The drop needs an exclusive lock too, and the same lock queue applies.",
        "DROP COLUMN": "The only step that cannot be undone by deploying older code.",
        "metadata only": "Fast, because nothing is rewritten now.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for zero-downtime migrations.\n\n1) During a rollout the old and the new version run on one schema: every change must work for both, so never rename in place. 2) Every DDL statement on a hot table gets a `lock_timeout` and a retry; build indexes concurrently. 3) Expand: add a nullable column without a default, then write both. 4) Backfill in small, restartable batches, only after all pods write both, and watch replica lag. 5) Verify, switch reads gradually, then stop the old writes; add NOT NULL as NOT VALID plus VALIDATE. 6) Drop last, after the rollback window: until then, each phase can be undone by deploying the previous version.",
    },
  },
  scenarios: {
    "one-update": {
      label: "Backfill locks",
      steps: {
        "big-update": {
          short: "One UPDATE",
          title: "The backfill as one big UPDATE",
          body: "Someone runs the backfill as one statement over the whole table, while old and new pods are still live. After 18 minutes it has updated 26 million rows, and every one of them stays locked until the statement commits.\n\nAny checkout that changes such a customer waits for the row lock, up to the 30-second statement timeout. 18% of checkouts fail. The replicas fall 9 minutes behind, and 31 GB of WAL pile up.",
          check: {
            q: "The UPDATE is cancelled now. What happens to the 26 million updated rows?",
            options: [
              "They keep the new value, only the rest is missing",
              "The whole statement rolls back: no row keeps the new value, the locks go away, and vacuum cleans up the dead row versions",
              "Only the locked rows are rolled back",
            ],
            answer: 1,
            why: "One statement is one transaction: all or nothing. In PostgreSQL the abort itself is fast, the locks are released at once, and the 26 million new row versions become dead tuples for autovacuum. 18 minutes of work are lost, but the table is consistent.",
          },
          fields: {
            "until COMMIT": "A transaction keeps every row lock it takes until it ends.",
            "waiting for row lock": "Both app versions wait to change customers the UPDATE has touched.",
            "replica lag": "The replicas replay the same huge transaction and fall behind.",
            WAL: "Every changed row is logged: the disk and the replicas pay for it.",
          },
        },
        cancel: {
          short: "Cancel",
          title: "Cancel it",
          body: "On-call cancels the statement. PostgreSQL aborts it, the row locks are released at once, and checkout recovers within seconds. The column is as empty as before: the backfill starts again from zero.\n\nAutovacuum will now clean up 26 million dead row versions in the background.",
          fields: {
            pg_cancel_backend: "Asks that one backend to stop its current statement.",
            "canceling statement": "The transaction aborts: all or nothing.",
            "released at once": "The waiting checkouts go through.",
            "dead row versions": "Space used by the aborted update, reclaimed later by vacuum.",
          },
        },
        batched: {
          short: "Batches",
          title: "Again, after the rollout, in batches",
          body: "The team waits until all 12 pods write both columns and then runs the batched job. No row is locked longer than 140 ms, the replicas never fall more than 0.6 seconds behind, and after 26 minutes every row is filled.\n\nCheckout never notices. The same work, split into 8,000 small transactions, costs nothing in uptime.",
          fields: {
            "12/12 pods": "No old pod is left to write `phone` alone.",
            "longest row lock": "One batch at most.",
            "replica lag max": "Kept under one second by the pauses.",
            total: "A little longer than one UPDATE, and nobody had to wait.",
          },
        },
      },
    },
  },
};

export default text;
