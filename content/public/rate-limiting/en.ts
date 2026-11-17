import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Rate limiting",
  summary:
    "One noisy client can slow an API down for everyone. How to cap each client fairly: windows, token buckets, 429 answers and a counter shared by all servers.",
  learn: [
    "Fixed window, sliding window and token bucket, and where each fails",
    "What a good `429` answer tells the client",
    "Whom to limit: an IP, an API key or a user",
    "Why the counter must be shared, and what to do when it is gone",
  ],
  nodes: {
    partner: "Partner app",
    bot: "Script",
    office: "Office (300 people)",
    api: "API",
    api2: "API 2",
    api3: "API 3",
    lb: "Load balancer",
    db: "Database",
    redis: "Redis",
  },
  metrics: {
    p95: "Partner p95",
    errors: "Honest errors",
    over: "Over the limit",
  },
  steps: {
    noisy: {
      short: "Noisy client",
      title: "One script takes the whole API",
      body: "Someone runs a script that pages through the whole catalogue as fast as it can: 900 requests a second. The API and the database run at full load.\n\nThe partner app, which sends two requests a second, now waits more than two seconds and sometimes times out.",
      watch: "Without a limit, your slowest day is decided by your noisiest client, not by your real traffic.",
      fields: {
        "X-Api-Key": "The script has a valid key. The requests are allowed, just far too many.",
        page: "Page 8812: nobody reads that far. It is a crawl, not a user.",
        "X-Response-Time": "Even this request waited 2.4 s in a queue behind its own siblings.",
      },
    },
    "fixed-window": {
      short: "Fixed window",
      title: "Count requests per second",
      body: "The API now keeps a counter per IP for the current second. The first 10 requests pass; from the 11th until the second ends it answers `429` at once, without touching the database.\n\nThe script still sends 900 a second, but 890 of them cost almost nothing. Load drops and the partner is fast again.",
      watch: "A rejection must be cheap. Check the limit before auth lookups, database calls or anything heavy.",
      check: {
        q: "The script sends 10 requests at the end of one second and 10 at the start of the next. What gets through?",
        options: ["10: the limit is 10 per second", "All 20, within 200 ms", "10, and the second batch gets `429`"],
        answer: 1,
        why: "Each window counts from zero, so both say 10 of 10. The database gets 20 requests in 200 ms, twice the intended rate, and every check passed.",
      },
      fields: {
        "429": "Too Many Requests: the standard answer that means “slow down”, not “you are broken”.",
        "Retry-After": "When to try again, in seconds. A polite client waits exactly this long.",
        "X-RateLimit-Remaining": "How many requests are left in this window. Good clients slow down before hitting zero.",
      },
    },
    boundary: {
      short: "Boundary",
      title: "Twice the limit at the window edge",
      body: "The script learns the rhythm: 10 requests at the very end of one second, 10 more at the very start of the next. Both windows say “10 of 10, fine”.\n\nThe database receives 20 requests in 200 ms, twice the intended rate. With per-minute windows the same trick doubles a whole minute's worth.",
      watch: "A fixed window limits requests per window, not per any span of that length.",
      fields: {
        window: "Each window counts from zero. It knows nothing about the previous one.",
        "20 requests": "Double the limit in a fifth of a second, and every check passed.",
      },
    },
    sliding: {
      short: "Sliding",
      title: "A sliding window looks back",
      body: "The **sliding window** counts the last second at any moment, not the calendar second. A cheap version keeps two counters and weights the previous second by how much of it still overlaps.\n\nThe edge trick stops working: at 12:00:01.250 the script has already spent its budget.",
      check: {
        q: "The partner app opens with 25 requests at once, then is quiet for a minute. What does the sliding window do?",
        options: [
          "Lets all 25 through: the average is far below the limit",
          "Holds the extra 15 and sends them next second",
          "Rejects 15 of them with `429`",
        ],
        answer: 2,
        why: "The sliding window only sees 25 requests in one second, so it allows 10 and rejects 15. A well-behaved client loses requests and the user sees a half-empty screen.",
      },
      fields: {
        "previous second": "The two counters: the whole last second and the current one so far.",
        estimate: "A quarter of the current second has passed, so three quarters of the previous one still count.",
        reject: "Over 10: the request is refused, even though the new second has just begun.",
      },
    },
    burst: {
      short: "Burst",
      title: "An honest burst is rejected",
      body: "When the partner app opens, it loads the home screen with 25 requests at once and then is quiet for a minute. On average that is far below the limit.\n\nThe sliding window sees 25 in one second and rejects 15. The user sees a half-empty screen.",
      watch: "Real clients are bursty. A limit that only allows a smooth rate punishes normal behaviour.",
      fields: {
        rejected: "Fifteen requests from a well-behaved client lost.",
        "next 60 s": "After the burst the app sends nothing. The average is under one request a second.",
      },
    },
    "token-bucket": {
      short: "Token bucket",
      title: "Token bucket: bursts allowed, average fixed",
      body: "Each client gets a **bucket** of up to 30 tokens, refilled at 10 per second. Every request takes one token; with no tokens left, the answer is `429`.\n\nThe partner's burst of 25 fits in the bucket. The script empties it in a moment and is held to 10 a second after that. Only two numbers per client are stored.",
      watch: "Capacity sets the largest burst, refill sets the long-term rate. Tune them separately.",
      fields: {
        capacity: "The biggest burst a client may send at once.",
        refill: "The sustained rate: tokens come back at this speed.",
        tokens: "What is left. 5 after the burst, back to 15 one second later.",
      },
    },
    "shared-ip": {
      short: "Shared IP",
      title: "300 people behind one IP",
      body: "A customer's office of 300 people reaches the internet through one address. To the limiter they look like one very busy client.\n\nThey share 10 requests a second, and most of their work fails with `429`. Meanwhile a script with a hundred cheap IP addresses gets a hundred times the limit.",
      watch: "An IP is not a person: NAT, mobile carriers and proxies put many users behind one address.",
      fields: {
        "X-Forwarded-For": "The office's public address, the same for all 300 people.",
        "429": "An ordinary employee is blocked because of colleagues' traffic.",
      },
    },
    "per-key": {
      short: "Per key",
      title: "Limit by key, not by address",
      body: "Authenticated calls are now limited per **API key** (or per user); the IP limit stays only for anonymous endpoints like login, and it is much looser.\n\nEach office user has a separate budget. A script with many IPs but one key gets one key's worth.",
      watch: "Free keys are easy to create. Limit sign-ups too, or a script will simply make a hundred keys.",
      check: {
        q: "The API moves to three servers, each counting in its own memory. How much does one key get?",
        options: [
          "30 a second: each server allows 10",
          "10 a second: it is still one key",
          "About 3 a second: the limit is split three ways",
        ],
        answer: 0,
        why: "The load balancer spreads one key's requests over all three servers, and each allows 10. The script gets 30 a second, and no server reports an error.",
      },
      fields: {
        "X-Api-Key": "The identity the limit is now counted for. It stays secret in the log.",
        "X-RateLimit-Scope": "Tells the client which limit applies to it: per key here.",
      },
    },
    "scale-out": {
      short: "Three servers",
      title: "Three servers, three separate counters",
      body: "Traffic grows and the API runs on three servers behind a load balancer. Each one still counts in its own memory.\n\nRequests from one key are spread over all three, and each allows 10 a second. The script gets 30: the limit has silently tripled.",
      watch: "An in-memory limiter is correct only on one server. Scaling out breaks it without a single error.",
      fields: {
        key_id: "The same key, counted three times in three places.",
        "total allowed": "Three times the limit, and every server believes it is enforcing it.",
      },
    },
    redis: {
      short: "Redis",
      title: "One counter in Redis",
      body: "The bucket moves to Redis, shared by all API servers. Checking and taking a token is one small script that runs atomically inside Redis, so two servers cannot both take the last token.\n\nThe limit is exact again. Each request pays one Redis round trip, about a millisecond.",
      watch: "Read-then-write from the app is a race: two servers read “1 left” and both pass. Do it in one atomic step.",
      fields: {
        EVALSHA: "Runs a script already loaded into Redis. Nothing else runs between its read and write.",
        "rl:k_88": "One bucket per key. It expires on its own when the client goes quiet.",
        "(integer) 0": "0 means not allowed: the bucket is empty.",
        "(integer) 100": "Milliseconds until the next token. The API puts this into `Retry-After`.",
      },
    },
    "redis-down": {
      short: "Redis down",
      title: "When the limiter itself fails",
      body: "Redis is unavailable. The API must choose: **fail closed** and reject everyone, or **fail open** and let traffic through.\n\nHere it fails open with a rough local limit on each server, a third of the real one, and raises an alert. Limits are a little loose for a while, and nobody is locked out.",
      watch: "Fail closed only where abuse costs more than an outage, for example login attempts or sending SMS.",
      fields: {
        "fail open": "The limiter's outage must not become an outage of the whole API.",
        "local limit": "Each server enforces 4 a second on its own, so three servers give about 12 instead of 10.",
        alert: "Someone must know the limits are approximate right now.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A rate limit protects everyone else from one client, and it must be cheap to say no.\n\n1) Fixed windows leak at the edges; sliding windows and token buckets do not. 2) Token buckets allow honest bursts and hold the average. 3) Answer `429` with `Retry-After`. 4) Limit by key or user, use IP only for anonymous calls. 5) With many servers, keep the counter in one shared place and decide how to fail without it.",
    },
  },
};

export default text;
