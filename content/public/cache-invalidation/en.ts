import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Cache invalidation",
  summary:
    "An account API keeps each account's plan in a cache in front of the database. A TTL alone keeps a customer who just paid on the old plan for up to ten minutes. Deleting the key after the write fixes the usual case but leaves a race in which an old value is written back after the delete. Delete twice, leases and invalidation from the database change log close the gaps one by one, and on the read side a hot key is served stale while one request refreshes it, and rows that do not exist are cached too.",
  learn: [
    "Why a TTL limits how long data is wrong but does not make it right, and how delete-after-write differs from writing the new value into the cache",
    "The race between a slow reader and a writer that leaves an old value in the cache after the delete, and three ways to close it: delete twice, versions, leases",
    "Invalidating from the database change log (CDC), so writers that never call the API cannot leave the cache stale",
    "Stale-while-revalidate with jitter for a hot key, and negative caching for lookups that find nothing",
  ],
  nodes: {
    app: "Web app",
    api: "Account API",
    cache: "Cache",
    db: "Accounts DB",
    batch: "Billing job",
    cdc: "CDC worker",
  },
  metrics: {
    stale: "Stale cache fills",
    age: "Longest stale window",
    dbreads: "DB reads",
    hit: "Cache hit ratio",
    p99: "p99 latency",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "The plan of every account, cached for ten minutes",
      body: "Every page of the web app asks the account API which plan the account is on: 15 000 reads a second. The API uses **cache-aside**: look in the cache, on a miss read the database and store the answer with a TTL of 600 s.\n\n94% of reads are hits, and the database sees only 900 reads a second. The question of this lesson is what happens when the plan changes.",
      fields: {
        "X-Cache": "This answer came from the cache, not from the database.",
        Age: "The cached copy is 212 s old. It can be up to 600 s old.",
        plan: "The value that decides which features the customer gets.",
        seats: "Cached together with the plan, so it goes stale together with it.",
      },
    },
    "ttl-only": {
      short: "TTL only",
      title: "The customer paid, the cache still says Free",
      body: "At 10:00 account 4821 upgrades to Pro and the database commits. Nobody tells the cache, so for the next 9 minutes 48 seconds every page still says `free`, and the features the customer just paid for stay locked.\n\nWith 2 400 plan changes a day, that is 2 400 customers a day who see the wrong plan for up to ten minutes.",
      watch: "A TTL is a bound on how wrong the cache may be, not a way to keep it right.",
      check: {
        q: "Why not just set the TTL to 5 seconds?",
        options: [
          "That solves it: nobody notices 5 seconds, and nothing else changes",
          "Every key is reloaded every 5 s: the hit ratio falls from 94% to about 40% and the database load grows about tenfold, and the data is still up to 5 s stale",
          "The cache cannot keep keys for less than a minute",
        ],
        answer: 1,
        why: "The TTL trades freshness against load. A key that is read every second but changes twice a month gets almost nothing from a 5 s TTL except extra database reads. The fix is to tell the cache when the data changes, and keep the TTL as a safety net.",
      },
      fields: {
        COMMIT: "The database has the new plan from this moment.",
        TTL: "How long the old copy still lives. It counts down, nothing resets it.",
        expired: "Only now does a reader go to the database and get `pro`.",
        "Pro features": "Ten minutes late for a customer who has already paid.",
      },
    },
    delete: {
      short: "Delete",
      title: "After the commit, delete the key",
      body: "The API now deletes the key right after the transaction commits. The next reader misses, reads the new row and fills the cache again. The stale window shrinks from 600 s to a few milliseconds.\n\nWhy delete and not write the new value (**write-through**)? Two writers that commit A then B can send their `SET`s in the order B then A, and the cache keeps A forever. A delete carries no value, so two deletes in any order give the same result.",
      watch: "Delete after the commit, never before: between an early delete and the commit, a reader can load the old row and put it back.",
      fields: {
        version: "Every change bumps it. It will be useful in a moment.",
        COMMIT: "The new plan is durable. Only now is it safe to touch the cache.",
        DEL: "Remove the key. The next reader builds it from the database.",
        misses: "One extra database read per change: cheap.",
      },
    },
    race: {
      short: "Race",
      title: "A slow reader writes the old value back",
      body: "Reader R misses and reads the row while it still says `free`. Then R stalls for 180 ms in a garbage-collection pause. Meanwhile writer W commits `pro` and deletes the key, which is not there yet. R wakes up and stores what it read: `free`, for 600 s.\n\nEach step followed the rules. It is rare, about 40 times a day here, but each time the cache is wrong for a full TTL. Without a TTL it would be wrong forever.",
      check: {
        q: "W deleted the key after its commit, exactly as the rule says. Why is the cache still wrong?",
        options: [
          "W should have deleted the key before the commit",
          "R read the row before the commit and wrote it after the delete: the delete came before R's write",
          "The cache lost the delete command",
        ],
        answer: 1,
        why: "A delete only removes what is in the cache at that moment. R's value was still in flight, read before the commit and written after the delete. Deleting before the commit makes the window bigger, not smaller.",
      },
      fields: {
        miss: "R has to go to the database.",
        "old row": "The commit has not happened yet, so R gets `free`.",
        "GC pause": "Any delay works the same way: a GC pause, a slow network, a retry.",
        COMMIT: "W writes `pro`.",
        "(integer) 0": "Nothing to delete: R has not written yet.",
        SET: "The old value lands after the delete, with a fresh 600 s TTL.",
      },
    },
    "double-delete": {
      short: "Delete twice",
      title: "Delete again a little later",
      body: "A cheap fix: after the first delete, the writer schedules a second one 500 ms later. If a slow reader put an old value back in between, the second delete removes it.\n\nStale fills drop from 40 to 3 a day. The window is narrower, not closed: a reader slower than 500 ms still wins. When the API reads from a replica, the delay must also be longer than the replication lag.",
      fields: {
        "schedule DEL": "A delayed job or a timer. If the process dies before it fires, the second delete is lost.",
        "(integer) 1": "This time there was something to delete: R's old value.",
        "slower than 500 ms": "Delete twice guesses how slow a reader can be. Sometimes the guess is wrong.",
        "3/day": "Better, but still a full TTL of wrong data each time.",
      },
    },
    lease: {
      short: "Lease",
      title: "A lease: the cache refuses a fill it did not expect",
      body: "With a **lease**, a miss returns a token. A fill is accepted only with a token that is still valid, and a delete of the key cancels every open token. R's late write carries token 7731, which W's delete has cancelled, so it is refused. The next reader gets a new token and loads `pro`.\n\nThe lease also solves another problem: while one reader holds the token, other readers do not all go to the database, they wait a few milliseconds or take the old value.\n\nA cache without leases can get the same effect with versions: the writer leaves the new version behind instead of deleting, and a fill with an older version is refused.",
      watch: "A version check works only if the writer leaves its version in the cache. After a plain delete there is nothing to compare with, and the old fill is accepted.",
      fields: {
        "lease 7731": "The right to fill this key, given out with the miss.",
        invalidated: "The delete cancels the token: whatever R read is now suspect.",
        NOT_STORED: "R's old value is refused instead of living for 600 s.",
        STORED: "A reader that started after the change fills the key with `pro`.",
        "wait 10 ms": "Others do not hit the database at the same time.",
      },
    },
    bypass: {
      short: "Bypass",
      title: "A writer that never calls the API",
      body: "Every night at 02:00 a billing job downgrades accounts whose payment has run out: 1 900 rows in one `UPDATE`. It writes straight to the database and has never heard of the cache.\n\nUntil the TTL runs out, 1 900 customers who did not pay keep their Pro features. The same happens with a fix typed in an SQL console, a migration or another service that shares the table.",
      fields: {
        UPDATE: "One statement, 1 900 accounts.",
        paid_until: "The business rule: an unpaid plan goes back to Free.",
        "UPDATE 1900": "1 900 cached plans are now wrong.",
        "no DEL": "Invalidation that lives in the API code only covers writes that go through the API.",
      },
    },
    cdc: {
      short: "CDC",
      title: "Invalidate from the database change log",
      body: "A **CDC** worker reads the database's change log. Every committed change of `accounts` comes out about 40 ms after the commit, whoever made it: the API, the billing job or a console. The worker maps the table to its keys and deletes them.\n\nThe API keeps its own delete, so a customer sees their own change at once. CDC catches everything else. It uses the same deletes, so it needs the same lease or version check against slow readers.",
      watch: "The worker commits its log offset only after the delete succeeded. Otherwise a failed delete is skipped for good.",
      fields: {
        op: "`u` is an update. Inserts and deletes come through the same way.",
        key: "Which row changed: enough to know which cache keys to delete.",
        version: "Lets the worker skip an event older than what the cache already has.",
        committed_at: "Only committed changes are in the log: rolled back ones never appear.",
        "(integer) 2": "The plan key and the limits key of the account, both deleted.",
        "41 ms": "From commit to delete, without any change to the billing job.",
      },
    },
    "hot-expire": {
      short: "Hot key",
      title: "Everyone waits for one rebuild",
      body: "Every request also reads `config:tariffs`, 18 000 times a second. When it expires, the coalescing lock does its job: one request rebuilds the key, the rest wait.\n\nBut the rebuild takes 120 ms. For those 120 ms, 2 160 requests wait in line, and every ten minutes the p99 jumps from 6 ms to 140 ms. If the rebuilding request dies, everyone waits for the lock to expire.",
      check: {
        q: "Coalescing already turns 18 000 database queries into one. What is still wrong?",
        options: [
          "Nothing: one query every ten minutes is ideal",
          "Every reader waits for that one query, so each expiry is a 120 ms stall for everyone",
          "The database cannot handle one query",
        ],
        answer: 1,
        why: "Coalescing protects the database, not the readers. As long as the old value is gone, every reader has to wait for the new one. The value from a second ago would be perfectly good for them.",
      },
      fields: {
        expired: "The key is gone, and every reader needs it.",
        NX: "Only one request gets the lock and rebuilds.",
        wait: "Everyone else waits for the new value.",
        "120 ms": "The rebuild is slow, so the wait is long.",
        "2 160 requests": "18 000 per second times 0.12 s, all of them stalled.",
      },
    },
    swr: {
      short: "Revalidate",
      title: "Serve the old value while one request refreshes it",
      body: "The value now has two lifetimes. After `fresh_until` (the soft TTL, 600 s) it is still served at once, and one request takes the lock and rebuilds it in the background. Only after the hard TTL of an hour is it really gone. This is **stale-while-revalidate**.\n\nNobody waits any more, and the p99 stays at 6 ms. The soft TTL gets 0 to 60 s of random jitter, so keys filled together do not all need a refresh in the same second.",
      watch: "Stale-while-revalidate is for data where a few seconds of staleness is fine. A plan change still uses explicit deletes.",
      fields: {
        fresh_until: "The soft TTL. After it the value is served, but refreshed.",
        built_at: "When this value was built: shows how stale an answer was.",
        "answer with this value now": "The reader gets the old value without waiting.",
        background: "The one request with the lock rebuilds after it has answered.",
        jitter: "Each key gets its own random refresh time.",
      },
    },
    negative: {
      short: "Negative",
      title: "Cache \"not found\" too",
      body: "Every page also asks for the account's custom limits, and 96% of accounts have none. The cache only stored rows that were found, so these lookups always missed: 600 of the 900 database reads a second found nothing.\n\nNow \"none\" is cached too, with a short TTL of 60 s. The hit ratio rises to 98%, and database reads drop to 300 a second.",
      watch: "The same trick protects you from lookups of random ids by bots. Keep the TTL short, and let the insert of a new row delete the \"none\" entry.",
      check: {
        q: "Support adds custom limits for account 4821 at 09:00. The \"none\" entry was cached at 08:59:30. What does the account see at 09:00:10?",
        options: [
          "The new limits, at once",
          "\"No custom limits\" until 09:00:30, unless the insert deletes the key",
          "An error, because the cached value and the database disagree",
        ],
        answer: 1,
        why: "A negative entry is a cached value like any other. An insert has to invalidate it just as an update does; with the CDC worker this already happens, since an insert is a change too.",
      },
      fields: {
        "(nil)": "A miss: either not cached or not existing. The cache cannot tell which.",
        "0 rows": "The database's answer is \"nothing\", and that answer is worth caching.",
        none: "A marker that means \"looked, found nothing\".",
        "EX 60": "Short: if the row appears without an invalidation, the error lasts a minute at most.",
        "found nothing": "Two thirds of database reads were lookups of rows that do not exist.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for cache invalidation.\n\n1) A TTL only limits how long data is wrong; keep it as a safety net. 2) After a write, delete the key after the commit, do not write the new value. 3) A slow reader can put an old value back after the delete: delete twice narrows the window, a lease or a version check closes it. 4) Invalidate from the change log, so every writer is covered, and commit the log offset only after the delete. 5) For hot keys, serve the old value while one request refreshes it, and jitter the TTL. 6) Cache \"not found\" with a short TTL, and invalidate it on insert.",
    },
  },
  scenarios: {
    "event-lost": {
      label: "Lost invalidation",
      steps: {
        "lost-drop": {
          short: "Dropped",
          title: "The cache fails over and the deletes are skipped",
          body: "At 14:20 the cache primary fails over, which takes 4 s. The CDC worker's deletes time out. Its code logs a warning, commits the offset and moves on to the next event.\n\n260 changes happen in those 4 seconds. Their invalidations are gone for good, and the old values stay in the cache for up to 600 s.",
          check: {
            q: "What should the worker do when a delete fails?",
            options: [
              "Log it and move on: the TTL will clean up",
              "Retry, and not commit the offset until the delete succeeds",
              "Flush the whole cache after every failure",
            ],
            answer: 1,
            why: "The offset is the worker's promise that everything before it is done. Committing it after a failed delete loses the invalidation for good. Retrying is safe: deleting the same key twice does no harm.",
          },
          fields: {
            timeout: "The delete may or may not have happened. The worker cannot tell.",
            "commit offset": "The bug: the change is marked done although its delete failed.",
            "260 changes": "Each one a cached value that is now wrong for a full TTL.",
          },
        },
        "lost-retry": {
          short: "Retry",
          title: "Retry, commit the offset only after the delete",
          body: "The worker now retries a failed delete with growing pauses and does not move its offset. When the failover is over, the queued 260 changes replay in 0.3 s and only then is the offset committed.\n\nThe longest stale read during the incident is 6 s instead of 600 s. The TTL is still there for the case nobody planned for.",
          fields: {
            retry: "Growing pauses, so the worker does not hammer a cache that is coming back.",
            "NOT committed": "Until the delete succeeds, the change counts as not done.",
            replay: "The worker reads the change log from its offset again.",
            "commit offset": "Now it is true: everything before it has been invalidated.",
            harmless: "Delete is idempotent: a repeat changes nothing.",
          },
        },
      },
    },
  },
};

export default text;
