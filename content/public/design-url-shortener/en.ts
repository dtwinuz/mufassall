import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design a URL shortener",
  summary:
    "A long link goes in, a short code comes out, and every click is a redirect. We build the whole service step by step: estimates, short codes, the redirect, cache, replicas, click analytics, aliases and expiry.",
  learn: [
    "How to size a read-heavy service from a few numbers",
    "Why a counter plus base62 beats hashing the URL",
    "301 or 302: what you give up with each",
    "Where cache, replicas and a queue each take load off the database",
  ],
  nodes: {
    user: "Browser",
    api: "Link API",
    db: "Links DB (primary)",
    cache: "Link cache",
    replica: "Read replica",
    queue: "Click queue",
    worker: "Click worker",
    stats: "Stats DB",
  },
  metrics: {
    p99: "Redirect p99",
    "primary-reads": "Reads on primary",
    collisions: "Code collisions",
  },
  steps: {
    estimate: {
      short: "Estimate",
      title: "What we are building, and how big",
      body: "Two calls: `POST /api/links` turns a long URL into a short code, and `GET /<code>` redirects to it. Say 100 million new links a month: about **40 writes/s**. Links are clicked far more than created, roughly 100:1, so about **4 000 redirects/s** on average and three times that at peak.\n\nStorage: 6 billion links over five years at about 500 bytes each is about 3 TB. A 7-character base62 code gives 62^7 ≈ 3.5 trillion values, plenty of room. The system is read-heavy: every design choice below protects the redirect path.",
      fields: {
        long_url: "The destination. Validate it: scheme, length, and a blocklist of known phishing hosts.",
        code: "The short key. It is the primary key in the links table and the cache key later.",
        short_url: "What the user shares: our short domain plus the code.",
      },
    },
    hash: {
      short: "Hash codes",
      title: "Hashing the URL collides",
      body: "First idea: take an MD5 of the long URL, base62-encode it and keep the first 7 characters. No coordination needed. But truncating a hash throws away most of its bits, and different URLs start to share a code.\n\nEach collision means a failed insert, a retry with a salt, and an extra round trip. With billions of rows the rate only grows. And the same URL from two users always maps to one code, so they cannot have separate stats or expiry.",
      watch: "A 7-character prefix of a hash is not unique. The unique constraint catches it, but now every write may need a retry.",
      fields: {
        q7Bx2Lm: "First 7 base62 characters of the hash. Another URL already produced the same prefix.",
        "duplicate key": "The primary key on `code` rejects the second row. The API has to retry with a different input.",
      },
    },
    counter: {
      short: "Counter",
      title: "A counter plus base62: no collisions by construction",
      body: "Give every link a unique number and encode it in base62: 125000417 becomes `8sujL`. Different numbers always give different codes, so collisions are impossible.\n\nTo avoid hitting the database for each number, every API server takes a **block** of 1 000 ids in one update and hands them out from memory. A server that crashes loses at most the rest of its block: gaps are fine, duplicates never happen.",
      watch: "Sequential codes are guessable: anyone can walk `8sujK`, `8sujL`, `8sujM`. Shuffle the number with a reversible mix before encoding.",
      fields: {
        next_id: "The end of the block this server now owns: ids 125000001 to 125001000.",
        RETURNING: "Reads the new value in the same atomic update, so two servers never get the same block.",
      },
    },
    redirect: {
      short: "Redirect",
      title: "The redirect: 302, not 301",
      body: "A click arrives as `GET /8sujL`. The API finds the long URL and answers with a redirect status and a `Location` header. The browser follows it.\n\nA **301** (permanent) is cached by the browser: the next click never reaches us. That saves load but we lose click counts and cannot change or expire the link. A **302** (temporary) brings every click back to us. We pick 302 and pay for it with traffic.",
      fields: {
        "302": "Temporary redirect: the browser must ask again next time.",
        Location: "Where the browser goes next: the stored long URL.",
        "Cache-Control": "Tells browsers and proxies not to keep the redirect, so the next click is counted.",
      },
    },
    "read-flood": {
      short: "Read flood",
      title: "Every click is a database read",
      body: "Traffic grows to 4 000 redirects/s. Each one runs the same lookup on the primary, which also takes all the writes. Its CPU sits at 96% and p99 climbs to 900 ms.\n\nThe data barely changes: a link is written once and read thousands of times. Reading it from the database every time is the waste.",
      fields: {
        code: "The lookup key. The index is fine; the problem is the sheer number of lookups.",
        Time: "Normally under a millisecond. Under this load the query waits in line for CPU.",
      },
    },
    cache: {
      short: "Cache",
      title: "A cache in front of the database",
      body: "The API first asks the cache for `link:<code>`. On a hit it redirects at once. On a miss it reads the database and stores the answer with a TTL (cache-aside).\n\nClicks follow a power law: a small set of fresh links gets most of the traffic. A modest cache serves about 90% of redirects, and reads on the primary fall from 4 000/s to 400/s.",
      watch: "A popular link that expires from the cache sends a burst of misses at once. Refresh hot keys early or let one request refill while others wait.",
      fields: {
        GET: "One key lookup in memory, well under a millisecond.",
        link: "Key prefix. It keeps link entries apart from other data in the same cache.",
      },
    },
    replicas: {
      short: "Replicas",
      title: "Cache misses go to a read replica",
      body: "The remaining misses move to a read replica that streams changes from the primary. The primary now handles writes and almost nothing else; we can add more replicas as reads grow.\n\nReplication is asynchronous, so a replica is a little behind. Here the lag is 180 ms.",
      watch: "A link created and clicked within the lag misses on the replica and would get 404. On a miss, ask the primary before answering 404, or put the new link in the cache when you create it.",
      fields: {
        lag: "How far the replica is behind the primary. Watch it; alert when it grows past a few seconds.",
      },
    },
    "click-count": {
      short: "Click count",
      title: "Counting clicks in the links table",
      body: "Marketing wants click counts. The quick way: increment a `clicks` column on every redirect. That turns 4 000 reads/s back into 4 000 writes/s on the primary.\n\nWorse, a viral link means thousands of updates to **one row**. They queue on its lock, the redirect waits for the update, and p99 jumps to 320 ms.",
      fields: {
        clicks: "One counter per link, updated in place: every click fights for the same row.",
        "lock wait": "Most of the time is spent waiting for other updates of the same row to finish.",
      },
    },
    "click-queue": {
      short: "Click queue",
      title: "Clicks go to a queue, a worker counts them",
      body: "The redirect now only publishes a small event and returns. A worker reads the queue, adds clicks up per link per minute and writes one row per batch to a separate stats database.\n\nThe event key is the code, so all clicks of one link land in one partition and one worker can sum them without locks. Redirect p99 is back to 12 ms.",
      watch: "If the queue is down, the redirect must still work. Send events fire-and-forget with a small local buffer: losing a few clicks is acceptable, failing redirects is not.",
      fields: {
        partition: "Chosen from the key `8sujL`: every click of this link goes to partition 7, in order.",
        ts: "When the click happened, so late events still land in the right minute.",
        country: "Taken from the IP at the edge. We store the country, not the raw IP.",
        offset: "Position of the event in the partition. The worker commits it after the batch is written.",
      },
    },
    alias: {
      short: "Aliases",
      title: "Custom aliases: one namespace, two sources",
      body: "Users want readable links like `/spring-sale`. An alias is just a code chosen by the user, stored in the same table. The insert either wins or finds the name taken, in one statement, with no race between check and write.\n\nGenerated codes and aliases must never clash: an alias must contain a `-` or be at least 8 characters, which generated codes never are. Then the counter can never hand out a code someone already took.",
      fields: {
        "spring-sale": "The requested alias. It has a dash, so it cannot be a generated code.",
        "ON CONFLICT": "If the code exists, insert nothing. No separate check that another request could race.",
        "409": "Zero rows inserted means the alias is taken. The API answers 409 Conflict.",
      },
    },
    expiry: {
      short: "Expiry",
      title: "Links that expire",
      body: "A link can carry `expires_at`. The redirect checks it and answers **410 Gone** after that moment. The cache TTL is the smaller of one hour and the time left, so an expired link never lives on in the cache.\n\nA background job deletes expired rows in small batches at night. Codes from the counter are never reused, so an old printed link cannot suddenly point somewhere new.",
      fields: {
        EX: "TTL in seconds. Here 3600, capped by the time left until `expires_at`.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "The redirect path is the product: keep it short and keep the primary out of it.\n\n1) Estimate first: 40 writes/s, 4 000 reads/s, 3 TB. 2) A counter in blocks plus base62 gives unique codes without retries. 3) 302 keeps every click visible. 4) Cache for hot links, replicas for misses, and a queue for click counting. 5) Aliases share the table but not the code shape; expiry caps the cache TTL.",
    },
  },
};

export default text;
