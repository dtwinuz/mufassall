import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Circuit breaker",
  summary:
    "A product API builds every page from a reviews service and a stock service. Reviews gets slow, and even with a 2 s timeout it takes all of the API's threads, so pages that never needed reviews fail too. A circuit breaker with concrete thresholds stops the cascade, a fallback keeps the page useful, a bulkhead covers the half-sick case the breaker cannot see, and the lesson ends with retries, per-instance state, alerts and a threshold set too low.",
  learn: [
    "How one slow dependency takes down its caller even when there is a timeout, and the arithmetic behind it",
    "The closed, open and half-open states with real thresholds: 50% over 20 calls, slow calls counted as failures, 30 s open, 3 trial calls",
    "Fallbacks (a cached value, a degraded answer, 503 with Retry-After) and a bulkhead: separate limits per dependency",
    "Where retries go relative to the breaker, per-instance versus shared state, and which metrics and alerts to keep",
  ],
  nodes: {
    web: "Web shop",
    api: "Product API",
    reviews: "Reviews service",
    stock: "Stock service",
    rdb: "Reviews DB",
    sdb: "Stock DB",
    breaker: "Breaker (in the API)",
    cache: "Fallback cache",
  },
  metrics: {
    p99: "Page p99",
    err: "Failed pages",
    threads: "API threads busy",
    revcalls: "Calls to reviews",
    opens: "Breaker opens",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "Every product page asks two services",
      body: "The web shop opens 600 product pages a second. For each one the product API calls the **reviews** service (80 ms) and the **stock** service (20 ms) and puts the answers together.\n\nThe API runs on 12 instances with 200 worker threads each. On a normal day a quarter of the threads are busy and the page p99 is 180 ms.",
      fields: {
        "Server-Timing": "How long each dependency took for this page: reviews is the slow part even on a good day.",
        in_stock: "From the stock service. Without it the customer cannot buy.",
        reviews: "From the reviews service. Nice to have: the page is still useful without it.",
      },
    },
    cascade: {
      short: "Cascade",
      title: "Reviews gets slow, and the API dies with it",
      body: "The reviews database starts a heavy reindex, and reviews answers in 10 s instead of 80 ms. The API gives up after 2 s, so each call still holds a thread for 2 s.\n\n600 calls a second times 2 s is 1 200 calls waiting at once, and an instance has 200 threads. In seconds every thread waits on reviews, requests queue up behind them, and even the cart, which never calls reviews, fails. A problem in a nice-to-have service has become an outage of the whole shop: a **cascading failure**.",
      watch: "The callers of the API now hold their own threads waiting on it, so the cascade can climb one more level.",
      check: {
        q: "The API already has a 2 s timeout. Why does it still run out of threads?",
        options: [
          "The timeout does not work for slow responses, only for refused connections",
          "Each call still waits up to 2 s: 600/s x 2 s = 1 200 waiting calls, six times the 200 threads",
          "Reviews sends more traffic back to the API when it is slow",
        ],
        answer: 1,
        why: "A timeout limits how long one call waits, not how many calls wait at once. Concurrency is rate times wait (Little's law). With a 2 s wait the API needs 1 200 threads; it has 200. What is needed is to stop making calls that are going to fail.",
      },
      fields: {
        "200/200 busy": "Every worker thread of this instance is taken.",
        timeout: "The 2 s timeout fires, but 2 s per call is far too long at this rate.",
        "in flight": "Rate times wait: how many calls wait at the same moment.",
        "/v1/cart": "Does not use reviews, yet finds no free thread: this is the cascade.",
      },
    },
    closed: {
      short: "Closed",
      title: "A breaker that counts failures and slow calls",
      body: "The API now calls reviews through a **circuit breaker**. While it is **closed**, every call goes through and the breaker keeps the outcome of the last 20 calls. If at least half of them failed, it opens.\n\nA call counts as failed when it throws or when it takes longer than 1 s. The slow rule matters most: in the cascade, reviews did not return errors, it was just slow. A breaker that counted only errors would never have opened.",
      watch: "Set the slow limit from the dependency's real p99 (250 ms here) with a wide margin, not from the timeout.",
      check: {
        q: "Why not count only errors and timeouts?",
        options: [
          "Because a slow answer under the timeout also holds a thread: 1.9 s answers drain the pool without a single error",
          "Because errors are already counted by the HTTP client",
          "There is no reason: slow calls succeed, so they are fine",
        ],
        answer: 0,
        why: "Threads are what runs out, and a thread is held for as long as the call lasts, error or not. Counting calls slower than 1 s lets the breaker react to slowness before the timeout is reached.",
      },
      fields: {
        CLOSED: "Normal state: calls go through, outcomes are counted.",
        window: "A rolling window of the last 20 calls, not of a minute: it reacts at any traffic level.",
        minimum_calls: "No decision before 20 calls: 1 failure out of 2 calls is not a 50% failure rate.",
        failure_rate_threshold: "Opens when half of the window failed.",
        slow_call_duration: "Slower than 1 s counts as a failure, four times the normal p99.",
        wait_in_open: "How long to stop calling before trying again.",
        trial_calls: "How many test calls decide the way back.",
      },
    },
    open: {
      short: "Open",
      title: "Open: fail at once, do not wait",
      body: "Of the last 20 calls, 14 were slower than 1 s and 2 failed: 80%. The breaker **opens**. For the next 30 s the API does not call reviews at all: the call is refused in 0.2 ms, and the page is built without that part.\n\nThreads stop waiting, the busy share falls from 100% to 30%, and the cart works again. Reviews gets no traffic from this instance and can finish its reindex.",
      fields: {
        OPEN: "Calls are not sent. Each one is refused right away.",
        "slower than 1 s": "Not errors, just too slow: counted as failures by the slow rule.",
        "failure rate": "16 of 20 is 80%, over the 50% threshold.",
        "not permitted": "0.2 ms instead of 2 000 ms: the thread is free at once.",
      },
    },
    fallback: {
      short: "Fallback",
      title: "What to answer instead",
      body: "An open breaker only says \"do not call\". What the customer gets is a separate decision, made per endpoint:\n\n- a **cached value**: the last good rating from the fallback cache, marked as stale;\n- a **degraded answer**: the page without the reviews block, and a header that says so;\n- **503 with Retry-After: 30** for an endpoint that is nothing but reviews, such as `/v1/products/88/reviews`, so clients come back after the breaker's wait instead of retrying at once.\n\nThe product page uses the first: a rating 9 minutes old is better than no rating.",
      watch: "Never invent data in a fallback. For stock or prices a stale or made-up value can sell what is not there; there an honest error is the right answer.",
      fields: {
        "X-Degraded": "Tells the client and the logs which parts of the answer are not live.",
        stale: "The rating came from the cache, not from the reviews service.",
        reviews_age_s: "How old the cached value is: 540 s. The UI can say \"rating as of 9 minutes ago\".",
      },
    },
    "half-open": {
      short: "Half-open",
      title: "Half-open: three trial calls decide",
      body: "After 30 s the breaker goes **half-open** and lets exactly 3 real calls through. Every other call still gets the fallback. All three answer in about 100 ms, so the breaker closes, empties its window and traffic returns.\n\nIf 2 of the 3 had failed, the breaker would open again for another 30 s. Three calls instead of one: a single trial can fail by bad luck on a healthy service, or pass by luck on a sick one.",
      check: {
        q: "Why not just let all traffic through after 30 s and see?",
        options: [
          "It would work the same: if reviews is still sick, the breaker opens again in a moment",
          "600 calls a second would hit a service that may still be sick or warming up: the cascade would repeat while the window fills",
          "Reviews cannot accept more than 3 calls after a restart",
        ],
        answer: 1,
        why: "A service coming back is often cold: empty caches, a small connection pool. Full traffic can knock it over again, and until 20 calls are counted the API threads wait on it again. A few trial calls test it at almost no cost.",
      },
      fields: {
        HALF_OPEN: "A test state: a fixed number of calls go through, the rest get the fallback.",
        "trial 1": "A real request, not a health check: it tests the path the page actually uses.",
        fallback: "Calls beyond the 3 trials do not wait for the result.",
        CLOSED: "Back to normal, counting from zero.",
        "OPEN again": "A failed trial restarts the 30 s wait.",
      },
    },
    "half-sick": {
      short: "Half-sick",
      title: "Slow, but not slow enough to trip",
      body: "A week later one of the three reviews replicas has a bad disk. A third of the calls take 1.9 s, just under the timeout. The slow rate is 30%, below the 50% threshold, so the breaker stays closed, and it is right: 70% of calls are fine.\n\nBut threads are counted differently: 600 x (0.7 x 0.08 s + 0.3 x 1.9 s) = 376 threads needed, and there are 200. The pool drains again, and pages fail again, with the breaker closed.",
      check: {
        q: "Should the threshold go down to 25% so the breaker trips here?",
        options: [
          "Yes, a lower threshold is always safer",
          "No: then it would cut off all reviews while 70% of them are fine, and trip on normal blips; what is missing is a cap on how many threads reviews may hold",
          "No, the timeout should go up to 5 s instead",
        ],
        answer: 1,
        why: "The breaker answers \"is this dependency broken?\" Here it is not broken, it is partly slow. The problem is that it may take every thread. That needs a limit on concurrency, not a different failure threshold.",
      },
      fields: {
        "30% of calls": "Slow calls from the one sick replica.",
        "slow call rate": "30% is under 50%: by its own rules the breaker has no reason to open.",
        CLOSED: "Closed and correct, and the API still drowns.",
        "threads needed": "Little's law again: average wait times rate.",
      },
    },
    bulkhead: {
      short: "Bulkhead",
      title: "Bulkhead: separate limits per dependency",
      body: "Like the walls inside a ship's hull, a **bulkhead** splits the API's capacity: at most 60 calls to reviews at once, at most 40 to stock, and the rest of the threads are never used for outgoing calls. When the 60 reviews slots are full, a new call is not queued, it is refused in 0.1 ms and the page gets the cached rating.\n\nOnly about 96 review calls a second get through now, so many pages show the cached rating. But no page fails, and stock and the cart do not notice anything.",
      watch: "A bulkhead refusal is not a failure of reviews. Do not let it count in the breaker's window, or a full bulkhead will open the breaker by itself.",
      fields: {
        max_concurrent: "The wall: no more than this many calls to one dependency at once.",
        max_wait: "0 ms: a full bulkhead refuses at once instead of growing a queue of threads.",
        rest: "Threads a sick dependency can never take.",
        rejected: "The call is refused immediately and the fallback is used.",
      },
    },
    retries: {
      short: "Retries",
      title: "Retry outside the breaker, within a budget",
      body: "Reviews is healthy again, and the team wants one retry for the odd failed call. The order of the wrappers matters: the **retry** goes outside, then the breaker, the bulkhead and a 1 s timeout inside. Every attempt passes through the breaker, so the breaker sees each failure.\n\nTwo rules keep retries from doing harm. A call refused by an open breaker is never retried: it would be refused again. And retries may be at most 5% of calls, so in a real outage they add 30 calls a second, not double the load.",
      check: {
        q: "The retry is put inside the breaker instead: the breaker sees one call that made 3 attempts. What goes wrong?",
        options: [
          "Nothing, it is only a different order",
          "The breaker counts one failure for three timed-out attempts, so it opens later, and each counted call can hold a thread for 3 s",
          "The breaker opens three times as often",
        ],
        answer: 1,
        why: "Inside the breaker, retries hide failures from it and multiply how long a thread is held. Outside, each attempt is counted, and an open breaker stops the retries too.",
      },
      fields: {
        retry: "The outermost wrapper: it decides whether to try again.",
        "breaker records": "Each attempt is counted, so the failure rate is the real one.",
        jitter: "A random part of the pause, so retries of many requests do not arrive together.",
        budget: "Retries capped at 5% of calls: 30 a second on top of 600.",
        "not permitted": "An open breaker is an answer, not an error to retry.",
      },
    },
    instances: {
      short: "Instances",
      title: "One breaker per instance is usually enough",
      body: "Each of the 12 API instances has its own breaker and counts only its own calls. At 50 review calls a second per instance, a window of 20 calls fills in 0.4 s, so all 12 opened within about a second of each other at 14:02.\n\nA shared breaker state in an external store would make them agree exactly, but it adds a network hop to every call and one more dependency that can fail. It pays off only when each instance sees so few calls that its window takes minutes to fill.",
      fields: {
        "each counts only its own calls": "Twelve independent breakers, no coordination.",
        "fills in 0.4 s": "With enough traffic, each instance decides on fresh data.",
        "all 12": "They open at slightly different times, which does no harm.",
        "shared state": "Exact agreement, at the cost of latency and a new failure point.",
      },
    },
    alerts: {
      short: "Alerts",
      title: "A breaker that opens must be seen",
      body: "A breaker hides an outage from customers, so it can also hide it from the team. Every instance exports the state of each breaker, a counter of transitions and a counter of refused calls.\n\nTwo alerts are enough to start: open for more than 2 minutes on at least 3 instances pages the on-call engineer, because a dependency is really down; more than 4 opens in 15 minutes opens a ticket, because the breaker is **flapping** and its settings are probably wrong.",
      fields: {
        breaker_state: "One gauge per dependency: closed, open or half-open, per instance.",
        breaker_transitions_total: "Counts every change. Opens per hour is the number to watch.",
        breaker_not_permitted_total: "How many calls got a fallback: the size of the customer impact.",
        "open for more than 2 min": "Not a blip: someone has to look at the dependency.",
        flapping: "Opening and closing again and again on a healthy service: a sign of a bad threshold.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for circuit breakers.\n\n1) A timeout limits how long one call waits, not how many wait: rate x wait must fit in your threads. 2) Count slow calls as failures, with a limit well above the normal p99. 3) Decide on a window of enough calls (here 50% of 20), stay open for a fixed time (30 s), and let a few trial calls (3) decide the way back. 4) Pick a fallback per endpoint: a cached value, a degraded answer, or 503 with Retry-After; never invent data. 5) Add a bulkhead per dependency for the partly sick case the breaker rightly ignores. 6) Retry outside the breaker, never after a refusal, within a budget. 7) Per-instance state is usually enough; alert on long opens and on flapping.",
    },
  },
  scenarios: {
    flapping: {
      label: "Threshold too low",
      steps: {
        "flap-open": {
          short: "Flapping",
          title: "A breaker that opens on every blip",
          body: "To \"react faster\", someone sets the breaker to open at 10% failures over a window of 10 calls, with a slow limit of 300 ms. During a normal deploy of reviews one replica restarts, 2 of 10 calls take 340 ms, and the breaker opens.\n\nThe trials pass 30 s later and it closes, until the next garbage-collection pause. 14 opens an hour, each hiding reviews from the page for 30 s, while reviews itself was healthy the whole time.",
          check: {
            q: "What made the breaker trip on a healthy service?",
            options: [
              "Reviews was in fact failing and the breaker was right",
              "A window of 10 calls and a 10% threshold mean 1 slow call trips it, and 300 ms is close to the normal p99 of 250 ms: normal noise looks like an outage",
              "The 30 s wait in the open state is too short",
            ],
            answer: 1,
            why: "Every service has blips: deploys, GC pauses, a cold cache. The threshold must sit above what a healthy service does in its worst normal window, and the window must be large enough that one call cannot decide.",
          },
          fields: {
            failure_rate_threshold: "10%: in a window of 10 calls, a single bad call is enough.",
            OPEN: "Reviews disappears from every page for 30 s.",
            HALF_OPEN: "The trials pass, because the service was fine all along.",
            "GC pause": "A normal 320 ms pause, now enough to trip the breaker.",
            "14 opens": "Each one a 30 s hole in the page, caused by the breaker itself.",
          },
        },
        "flap-fix": {
          short: "Measure",
          title: "Set the threshold from measured blips",
          body: "The team looks at a week of data. The worst 20-call window on a healthy day had 15% failures, with a p99 of 410 ms. The real outage at 14:02 had 80%.\n\nThe settings go back to 50% over 20 calls, at least 20 calls before any decision and a slow limit of 1 s: well above normal noise, well below a real outage. Opens drop to zero, and the flapping alert, which fired 3 times on the old settings, would have caught it before customers did.",
          fields: {
            minimum_calls: "No decision on fewer than 20 calls.",
            "worst 20-call window": "The noise level of a healthy week: the threshold must be above it.",
            "real outage": "What the breaker exists for: the threshold must be below it.",
            "flapping alert": "Opens per hour, watched, catch a bad setting early.",
          },
        },
      },
    },
  },
};

export default text;
