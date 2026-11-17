import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Timeouts and retries",
  summary:
    "A checkout API depends on a rates service that gets slow, then dies. How timeouts, backoff, retry budgets and a circuit breaker keep one sick dependency from taking everything down.",
  learn: [
    "Why a call without a timeout can freeze every thread",
    "Exponential backoff with jitter, and how retries multiply into a storm",
    "Retry budgets and the circuit breaker: closed, open, half-open",
    "Retry only what is idempotent, or make it so with a key",
  ],
  nodes: {
    client: "Shop app",
    api: "Checkout API",
    rates: "Rates service",
    db: "Orders DB",
    pay: "Payment provider",
  },
  metrics: {
    p95: "Checkout p95",
    errors: "Failed checkouts",
    "rates-rps": "Calls to rates",
    double: "Double charges",
  },
  steps: {
    normal: {
      short: "Normal",
      title: "Every checkout asks for a delivery price",
      body: "The shop app sends a checkout to the API. Before saving the order, the API asks the rates service how much delivery costs.\n\nOn a good day the answer takes 85 ms and nobody thinks about it. The code just waits for it.",
      check: {
        q: "Rates starts answering in 30 seconds. The API has no timeout. What happens to the API?",
        options: [
          "Only checkout slows down; the rest works",
          "The HTTP client gives up on its own in a second",
          "Its 200 threads all hang, and every endpoint fails",
        ],
        answer: 2,
        why: "Each request holds a worker thread while it waits. In seconds all 200 threads are stuck on rates, so even requests that never touch rates find no free thread and fail.",
      },
      fields: {
        Host: "An internal service, not a public one. It is still a network call that can hang.",
        "X-Response-Time": "85 ms today. The code has no idea what to do if it becomes 30 seconds.",
        price: "Delivery price in the smallest unit. Checkout cannot finish without some price.",
      },
    },
    "slow-dep": {
      short: "Hang",
      title: "One slow dependency freezes everything",
      body: "The rates service starts answering in 30 seconds instead of 85 ms. The API has no timeout, so each request holds a worker thread while it waits.\n\nIn a few seconds all 200 threads are waiting on rates. Now even requests that never touch rates, like opening an order, find no free thread and fail.",
      watch: "Most HTTP clients default to no timeout or a very long one. The default is a bug waiting for a slow day.",
      fields: {
        "X-Response-Time": "Thirty seconds of a thread doing nothing but waiting.",
        "threads busy": "The pool is full. Every new request queues behind requests stuck on rates.",
      },
    },
    timeout: {
      short: "Timeout",
      title: "Give up after 800 ms",
      body: "The API now waits at most 800 ms for rates: a short connect timeout plus a read timeout. When time runs out it uses a flat delivery price and finishes the order.\n\nThreads are released quickly, so the rest of the API works again. The timeout is set from the real p99 of rates, with some margin, not picked at random.",
      check: {
        q: "The API now retries 3 times at once, and the app retries checkout 3 times. What does rates get?",
        options: [
          "Up to 16 calls per order, and it falls over",
          "At most 4 calls per order: retries do not stack",
          "Fewer fallbacks, and time to recover",
        ],
        answer: 0,
        why: "Four tries in the app times four tries in the API is up to 16 calls to rates per order. Rates was only slow; under that load it goes fully down, and every retry makes it worse.",
      },
      fields: {
        timeout: "Waiting stops here. The thread goes back to the pool.",
        fallback: "A safe default instead of an error: the customer pays a flat price and the order is not lost.",
      },
    },
    "naive-retry": {
      short: "Storm",
      title: "Instant retries become a storm",
      body: "To cut the fallbacks, someone added three instant retries in the API. The shop app also retries checkout three times. Four tries times four tries: up to 16 calls to rates per order.\n\nRates was only slow. Under 16 times the traffic it falls over completely, and every retry makes it worse.",
      watch: "Retries at several layers multiply. Retry in one layer only, the one closest to the failing call.",
      fields: {
        attempt: "Each timeout is followed by another try at once. Four tries, four timeouts.",
        "10:42:07.913": "0.8 s after the first try: exactly the timeout, no pause. Rates gets no time to recover.",
      },
    },
    backoff: {
      short: "Backoff",
      title: "Exponential backoff with jitter",
      body: "Only the API retries now; the app does not. Between tries it sleeps, and the sleep doubles each time: up to 100 ms, then 200 ms, then 400 ms.\n\nThe exact sleep is random inside that window (jitter). Without it, thousands of clients that failed at the same moment would retry at the same moment again.",
      fields: {
        sleep: "The pause before the next try. It grows each time, so a sick service gets breathing room.",
        base: "First window. Try n waits a random time between 0 and `base × 2^n`, with an upper cap.",
        jitter: "Randomness spreads the retries out, so they do not arrive as one wave.",
      },
    },
    budget: {
      short: "Budget",
      title: "A retry budget caps the extra load",
      body: "Backoff spaces retries out, but in a long outage they still add up. So the API keeps a budget: retries may be at most 10% of normal calls to rates.\n\nWhen the budget is spent, the API skips the retry and uses the fallback at once. Extra load on rates can never be more than 1.1×.",
      fields: {
        budget: "40 retries per second on top of 400 calls. The counter resets every few seconds.",
        skipped: "No retry for this order: the budget is used up. Fallback instead.",
      },
    },
    "breaker-open": {
      short: "Breaker",
      title: "Circuit breaker: stop calling a dead service",
      body: "Rates is fully down. Even budgeted retries are wasted, and each first call still burns 800 ms. The circuit breaker counts failures over a 10-second window.\n\nWhen failures pass 50%, the breaker **opens**: for 30 seconds the API does not call rates at all and returns the fallback in under a millisecond. Rates gets zero traffic and can restart in peace.",
      watch: "Keep one breaker per dependency. One shared breaker would cut healthy services too.",
      fields: {
        OPEN: "Open means the circuit is broken: calls do not go out at all.",
        failures: "62% of the last 50 calls failed: above the 50% threshold.",
        "fail fast": "An instant fallback is better than an 800 ms wait for a call that is sure to fail.",
      },
    },
    "half-open": {
      short: "Half-open",
      title: "Half-open: one probe decides",
      body: "After 30 seconds the breaker goes **half-open** and lets a single real call through. If it fails, the breaker opens again for another 30 seconds.\n\nThe probe answered in 92 ms, so the breaker closes and traffic returns. Nobody had to wake up and flip a switch.",
      check: {
        q: "The same retry code now wraps the payment call. The first charge times out at 800 ms. What happens?",
        options: [
          "Nothing bad: a timeout means no charge",
          "The customer can be charged twice for one order",
          "The provider sees the same order_id and ignores it",
        ],
        answer: 1,
        why: "The provider had already taken the money; only the answer was late. The retry looks like a new payment, so a second charge `ch_2` appears next to `ch_1`.",
      },
      fields: {
        HALF_OPEN: "A test state: one call goes out, all others still get the fallback.",
        probe: "One real request. One is enough to learn and too little to hurt.",
        CLOSED: "Normal again: every call goes to rates and failures are counted from zero.",
      },
    },
    "double-charge": {
      short: "Charged twice",
      title: "Retrying a charge charges twice",
      body: "The same retry code is reused for the payment call. The first `POST /v1/charges` timed out at 800 ms, but the provider had already taken the money; only the answer was late.\n\nThe retry looks like a new payment to the provider. The customer is charged twice for one order.",
      watch: "A timeout says nothing about the result. The other side may have done the work.",
      fields: {
        order_id: "Same order in both requests. The provider cannot know that from the body alone.",
        charge_id: "`ch_2`: a second, separate charge. The first one, `ch_1`, already exists.",
      },
    },
    "idem-key": {
      short: "Key",
      title: "Retry only idempotent calls",
      body: "GET for a price is safe to repeat. A charge is not, unless it carries an `Idempotency-Key`: the same key on every try of one order.\n\nThe provider stores the key with the result. A retry with a known key gets the stored answer back, `ch_1`, and no new money moves.",
      fields: {
        "Idempotency-Key": "Built from the order, not random per try. Every retry of this order sends the same value.",
        "Idempotent-Replayed": "The provider says: this is the saved answer from the first request, nothing was charged now.",
        charge_id: "`ch_1` again. One order, one charge.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for calling something that can fail.\n\n1) Every network call has a timeout set from real latency. 2) Retry in one layer, with exponential backoff and jitter. 3) A retry budget caps the extra load. 4) A circuit breaker stops calls to a dead service and probes it in half-open. 5) Retry only idempotent calls; give the rest an idempotency key.",
    },
  },
};

export default text;
