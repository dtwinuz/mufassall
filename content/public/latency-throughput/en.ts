import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Latency and throughput",
  summary:
    "How long one request takes and how many requests fit into a second are two different numbers. A search API grows from a handful of users to a rush hour: why the average hides the pain, and why a server at 90% is already in trouble.",
  learn: [
    "Latency vs throughput, and how they are linked by the number of requests in flight",
    "Reading p50, p95 and p99, and why the average lies",
    "Why waiting time explodes as a server nears 100% load",
    "Shedding load early and taking slow work off the request path",
  ],
  nodes: {
    users: "Users",
    api: "Search API",
    db: "Database",
    counter: "Counter cache",
  },
  metrics: {
    rps: "Throughput",
    p50: "Latency p50",
    p99: "Latency p99",
    errors: "Errors",
  },
  steps: {
    one: {
      short: "Latency",
      title: "Latency: how long one request takes",
      body: "A user searches for “lamp”. The API asks the database and answers in 41 ms. That is **latency**: the time one request spends from send to reply.\n\nThe server is almost idle. With so little traffic, latency is just the work itself: 29 ms in the app and 12 ms in the database.",
      fields: {
        "X-Request-Id": "Ties this request to its log lines, so its time can be looked up later.",
        "Server-Timing": "The server's own breakdown: 29 ms of app code and 12 ms of database.",
      },
    },
    throughput: {
      short: "Throughput",
      title: "Throughput: how many per second",
      body: "Now 200 requests arrive every second, and the API answers all of them. That is **throughput**. Each request still takes 41 ms.\n\nThe two are linked: 200 per second, each taking 0.041 s, means about 8 requests are inside the server at any moment. This is Little's law.",
      watch: "High throughput does not mean low latency. A truck carries a lot per trip and is still slow.",
      fields: {
        throughput: "Finished requests per second. It is a property of the whole system, not of one request.",
        "in flight": "Requests being worked on right now: throughput × latency = 200 × 0.041 ≈ 8.",
      },
    },
    averages: {
      short: "Average",
      title: "The average says everything is fine",
      body: "The dashboard shows an average of 62 ms. But users complain that search sometimes hangs for two seconds.\n\nSort all request times and look at points on the list: the middle one (**p50**) is 41 ms, but one request in a hundred (**p99**) takes 1.9 s. The average blends both and describes nobody.",
      watch: "A user who loads a page with 20 requests has an 18% chance to hit at least one p99. Tails are common, not rare.",
      fields: {
        avg: "Pulled up by a few slow requests, still looks harmless.",
        p50: "Half of the requests are faster than this. The typical experience.",
        p95: "One request in twenty is slower than this.",
        p99: "One in a hundred is slower than 1.9 s. At 200/s that is two unhappy requests every second.",
      },
    },
    "hot-row": {
      short: "Hot row",
      title: "Where the tail comes from",
      body: "The slow requests have something in common: every search also increments a counter for its query. Popular words like “lamp” are one row in the database, and every request wants to update it.\n\nOnly one transaction can change a row at a time; the others wait for the lock. Most requests are lucky, some wait almost two seconds.",
      fields: {
        hits: "One shared row for every “lamp” search. Hundreds of requests a second queue for it.",
        "lock wait": "1.79 s spent waiting for other transactions, 1 ms doing the update.",
      },
    },
    rush: {
      short: "Rush hour",
      title: "Rush hour: the server is 93% busy",
      body: "In the evening traffic more than doubles, to 450 requests per second. The API manages 440 and its load reaches 93%.\n\nNo single request got harder, yet the median jumped from 41 to 180 ms. Requests now wait in line for a free worker before any work starts.",
      fields: {
        "Server-Timing": "139 ms waiting in the queue, 41 ms of actual work. The work did not change; the waiting did.",
      },
    },
    knee: {
      short: "The knee",
      title: "Why 90% is already too much",
      body: "Think of a cashier who needs 1 minute per customer. At 50% busy you wait about 1 minute; at 80%, 4 minutes; at 90%, 9; at 95%, 19. Waiting grows like `load / (1 − load)`.\n\nSo the curve stays flat for a long time and then bends up sharply. A server you plan to run at 90% has no room for a burst, a slow query or a lost neighbour.",
      watch: "Plan capacity for peak traffic at roughly 60–70% load, not for the average at 90%.",
      check: {
        q: "At 93% load the app gives up after 3 s and retries at once. What happens to useful throughput?",
        options: [
          "It rises: more attempts mean more successes",
          "It holds at 440: the server is already maxed out",
          "It falls: retries crowd the same overloaded line",
        ],
        answer: 2,
        why: "Each retry is a new request in the same line, and the server still works for clients that already left. Useful throughput drops from 440 to 380 per second and 7% of searches fail.",
      },
    },
    retries: {
      short: "Retries",
      title: "Clients give up and try again",
      body: "The mobile app gives up after 3 s and immediately sends the same search again. Every retry is a new request in the same overloaded line.\n\nThe server now does more work than ever and finishes less of it: useful throughput drops to 380 and 7% of searches fail.",
      watch: "Retries without a pause turn a slow server into a dead one. Back off and add random jitter.",
      check: {
        q: "More requests arrive than the API can finish. What keeps most of them fast?",
        options: [
          "Cap the line and answer the excess with a fast `503`",
          "Raise the client timeout from 3 s to 10 s",
          "Make the waiting line long enough for everyone",
        ],
        answer: 0,
        why: "With at most 64 in flight and 100 waiting, the excess gets an instant `503` with `Retry-After`. Load drops to 85%, p50 returns to 48 ms and errors fall from 7% to 4%.",
      },
      fields: {
        timeout: "The client stops waiting, but the server does not know: it still does the work for nobody.",
        "attempt 3": "The third copy finally succeeds, after the server already did the same work three times.",
      },
    },
    shed: {
      short: "Shed load",
      title: "Say no quickly",
      body: "The API now caps the line: at most 64 requests in flight and 100 waiting. Anything beyond that gets an instant `503` with a hint when to come back.\n\nA few users get a fast “try again” instead of everyone getting a slow failure. Load drops to 85% and the median returns to 48 ms.",
      fields: {
        "503": "Answered in under a millisecond. Rejecting early is cheap; timing out late is expensive.",
        "Retry-After": "The client waits 2 s before trying again instead of hammering the server.",
      },
    },
    "off-path": {
      short: "Off the path",
      title: "Take slow work off the request path",
      body: "The search counter no longer touches the database on every request. The API increments it in an in-memory cache, and once a minute a small job writes the totals with one `UPDATE`.\n\nNo more lock waits. Each request is shorter, so the same server handles all 450 per second at 48% load, and p99 drops to 85 ms.",
      fields: {
        INCR: "An atomic increment in memory. Thousands per second, no row locks.",
        integer: "The new value. Counting is the only thing this request does now.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Latency is the time of one request; throughput is how many finish per second. They meet through the number of requests in flight.\n\n1) Watch p95 and p99, not the average. 2) Near full load, waiting, not work, dominates latency, so keep headroom. 3) Retries need backoff; overload needs a fast `503`. 4) Shorten the request path and the tail shrinks with it.",
    },
  },
};

export default text;
