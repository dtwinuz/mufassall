import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Caching",
  summary:
    "A product page reads the same row from the database thousands of times a second. A cache in front of it makes reads fast, then brings its own problems: stale data, a stampede on a hot key and the question of where writes go.",
  learn: [
    "The cache-aside read path: look in the cache, fall back to the database, fill",
    "TTL and invalidation: why a write must delete the cached copy",
    "What a stampede on a hot key is, and how coalescing and jittered TTL stop it",
    "Write-through vs write-back, and what each one risks",
  ],
  nodes: {
    client: "Shop app",
    api: "Product API",
    db: "Database",
    cache: "Cache (Redis)",
    admin: "Shop manager",
    worker: "Flush worker",
  },
  metrics: {
    "hit-ratio": "Cache hit ratio",
    p95: "Reply p95",
    "db-reads": "Database reads",
    stale: "Old price shown for",
  },
  steps: {
    "no-cache": {
      short: "No cache",
      title: "Every page view goes to the database",
      body: "Each time someone opens product `1042`, the API joins two tables and reads the same row again. The data changes a few times a day; it is read 2400 times a second.\n\nThe database runs at over 90% and every page waits for it.",
      fields: {
        JOIN: "Two tables joined on every request: price from `products`, quantity from `stock`.",
        "38 ms": "Cheap on its own. Not at 2400 times a second on one database.",
      },
    },
    "cache-aside": {
      short: "Cache-aside",
      title: "Look in the cache first",
      body: "A cache sits next to the API. The API now asks the cache first, by key. If the key is there, the database is not touched.\n\nThe cache starts empty, so the first answer is «nothing here». That is a **miss**: the API goes to the database as before.",
      fields: {
        "product:1042": "One key per product. The key name is the contract between everyone who reads and writes it.",
        "(nil)": "A miss. The cache does not have this key yet.",
      },
    },
    fill: {
      short: "Fill",
      title: "After a miss, put the answer in the cache",
      body: "After reading from the database, the API stores the result in the cache with a time to live (TTL). The next reader gets it from memory.\n\nThis is **cache-aside**: the application, not the cache, decides what to load and when. Database reads drop by almost ten times.",
      fields: {
        SET: "Write the row into the cache, already shaped the way the page needs it.",
        EX: "TTL of 300 seconds. After that the key disappears and the next reader reloads it.",
      },
    },
    hit: {
      short: "Hit",
      title: "A hit: answer from memory",
      body: "Now most requests find the key. A hit takes about a millisecond instead of tens.\n\nThe **hit ratio** is the share of reads answered by the cache. At 94%, only 6 reads in 100 reach the database.",
      fields: {
        GET: "One lookup by key. No query, no join.",
        price: "The price as of the moment the key was written. Remember this.",
      },
    },
    stale: {
      short: "Stale",
      title: "The price changed, the cache did not",
      body: "The manager lowers the price. The database has the new price, but the cache keeps serving the old one until the TTL runs out.\n\nFor up to five minutes buyers see one price on the page and another at checkout.",
      watch: "A TTL is not a correctness tool. It only limits how long data can be wrong.",
      fields: {
        price: "The new price, now in the database.",
        COMMIT: "The write is done. Nobody told the cache.",
      },
    },
    invalidate: {
      short: "Invalidate",
      title: "A write deletes the cached copy",
      body: "After the update commits, the API deletes the key. The next reader misses and loads the fresh row.\n\nDelete, do not overwrite: two writers racing to set the value can leave the older one in the cache. The TTL stays as a safety net for the rare case where the delete is lost.",
      watch: "Delete after the database commit, not before. Otherwise a reader can refill the cache with the old row in between.",
      fields: {
        DEL: "Remove the key. Cheaper and safer than writing the new value.",
        "(integer) 1": "One key deleted. The old price is gone from the cache.",
      },
    },
    stampede: {
      short: "Stampede",
      title: "A hot key expires during a sale",
      body: "At 08:00 a sale starts and thousands of people open the same product. At that moment its key expires.\n\nEvery one of them misses at the same instant and every one goes to the database with the same query. The database chokes on 2814 identical reads.",
      watch: "The hotter the key, the more dangerous its expiry.",
      fields: {
        expired: "The TTL ran out: normal behaviour, bad timing.",
        MISS: "2814 misses for one key within a few milliseconds.",
      },
    },
    coalesce: {
      short: "Coalesce",
      title: "Only one request rebuilds the key",
      body: "On a miss the API first tries to take a short lock. The one request that gets it reads the database and refills the cache.\n\nEveryone else waits a few milliseconds and reads the fresh key. 2814 identical queries become one. This is **request coalescing**.",
      fields: {
        NX: "Set only if the key does not exist: exactly one caller wins.",
        PX: "The lock dies on its own after 2000 ms, even if the winner crashes.",
        "(nil)": "The others lost the race. They do not touch the database.",
      },
    },
    jitter: {
      short: "Jitter",
      title: "Do not let keys expire together",
      body: "After a deploy, thousands of keys were filled within the same minute with the same TTL, so they all expire within the same minute too.\n\nAdding a random part to each TTL spreads the expiries out. The database sees a steady trickle instead of a wave.",
      fields: {
        EX: "347 seconds this time, a different number next time.",
        random: "Up to a minute of jitter. Enough to break up the wave.",
      },
    },
    "write-modes": {
      short: "Write modes",
      title: "Writes: through the cache or behind it",
      body: "So far writes went straight to the database. **Write-through** writes the cache and the database in the same request: the cache is always fresh, but each write pays twice.\n\n**Write-back** writes only the cache and lets a worker flush to the database later. View counters fit well: very fast, but whatever is not flushed is lost if the cache dies.",
      watch: "Write-back is for data you can afford to lose a few seconds of. Never for money or orders.",
      fields: {
        INCR: "Add one in memory. No database write per view.",
        "views:1042": "The worker flushes this counter to the database every 10 seconds.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for a cache.\n\n1) Cache-aside: read the cache, on a miss read the database and fill. 2) Every key has a TTL as a safety net. 3) A write deletes the key, after the commit. 4) Hot keys need coalescing and jittered TTLs. 5) Write-back only for data you can afford to lose.",
    },
  },
};

export default text;
