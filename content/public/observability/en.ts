import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Observability",
  summary:
    "Checkout takes 2.4 seconds and every service says it is fine. How logs, a propagated request id, RED and USE metrics, an alert on p95 and a distributed trace find the slow part.",
  learn: [
    "What logs, metrics and traces each answer, and what they cannot",
    "Why one request or trace id must travel through every service",
    "RED metrics for services, USE metrics for resources, and alerting on p95",
    "Reading a trace to find the slow span, and sampling to keep the cost down",
  ],
  nodes: {
    client: "Customer app",
    api: "API",
    orders: "Orders service",
    stock: "Inventory service",
    db: "Orders DB",
    logs: "Log store",
    tsdb: "Metrics DB",
    oncall: "On-call engineer",
    tracer: "Trace store",
  },
  metrics: {
    p95: "Checkout p95",
    detect: "Time to find cause",
    telemetry: "Telemetry per day",
  },
  steps: {
    blind: {
      short: "Blind",
      title: "Slow, but nothing is broken",
      body: "Customers say checkout hangs. Every request succeeds, just in 2.4 seconds. There is no error to search for.\n\nEach service writes plain text logs to its own disk. To understand one slow order, someone opens three servers and guesses which lines belong together. It takes an hour and a half.",
      fields: {
        "201 Created": "Success. Nothing failed, so no error log and no exception to follow.",
        "X-Response-Time": "2.4 seconds. The only clue, and it says nothing about where the time went.",
      },
    },
    logs: {
      short: "Logs",
      title: "Structured logs in one place",
      body: "Every service now writes one JSON object per event to stdout. A shipper sends it to a central log store, where you can filter by field instead of grepping text.\n\nNow you can find slow orders: `duration_ms > 2000`. But you still cannot tell which line in orders matches which line in the API.",
      fields: {
        level: "`info`, `warn`, `error`. Filter on it; never parse it out of a sentence.",
        service: "Which service wrote it. With ten services in one store, this is the first filter.",
        duration_ms: "A number, not text, so the store can sort and compare it.",
      },
    },
    "request-id": {
      short: "Request ID",
      title: "One id for the whole request",
      body: "The API creates a request id when a request arrives and passes it on in a header. Every service puts that id in every log line it writes for this request.\n\nOne search for `req_7f3a91` now shows the whole path in order. Time to find the cause drops from an hour to 25 minutes.",
      watch: "A service that forgets to forward the header breaks the chain for every service after it.",
      fields: {
        "X-Request-Id": "Set once at the edge, copied into every outgoing call. Never generated again further down.",
        request_id: "The same id inside the log line, so the log store can join the services.",
      },
    },
    red: {
      short: "RED",
      title: "RED metrics: rate, errors, duration",
      body: "Logs describe single events. Metrics are cheap counters that the metrics DB reads from each service every 15 seconds: how many requests, how many failed, how long they took.\n\nThis is **RED** for every service: Rate, Errors, Duration. Orders shows normal rate, few errors and a fat duration tail. The problem is inside orders or below it.",
      fields: {
        http_requests_total: "A counter that only grows. The DB turns it into requests per second.",
        code: "One series per status code: the error rate is 500s divided by all.",
        le: "Histogram bucket: how many requests took at most 0.5 s, at most 2.5 s. Percentiles come from these.",
      },
    },
    use: {
      short: "USE",
      title: "USE metrics: is the database the problem?",
      body: "For resources, such as a database, a disk or a pool, look at **USE**: Utilisation, Saturation, Errors.\n\nThe database is at 41% CPU, nothing is waiting for a connection, no errors. The database is not the cause. Metrics rule things out fast, but they do not point at the exact line of code.",
      fields: {
        db_cpu_utilization: "Utilisation: 41% busy. Far from the limit.",
        db_connections_waiting: "Saturation: zero queries waiting for a connection. No queue in front of the DB.",
        db_errors_total: "Errors: none. The database is healthy.",
      },
    },
    alert: {
      short: "Alert",
      title: "Alert on p95, not on the average",
      body: "Until now, customers noticed first. Now the metrics DB checks a rule every minute: if checkout p95 stays above 800 ms for 5 minutes, page the on-call engineer.\n\nThe average would hide this: most orders are fast, and a slow 5% barely moves it. p95 says what one customer in twenty feels.",
      watch: "Alert on what users feel (latency, errors), not on every CPU spike. A noisy pager gets muted.",
      fields: {
        histogram_quantile: "Computes p95 from the histogram buckets of the previous step.",
        for: "Must be true for 5 minutes. One slow second does not wake anyone up.",
        value: "2.31 s right now. Far over the 0.8 s limit.",
      },
    },
    traces: {
      short: "Traces",
      title: "Traces: time spent in every hop",
      body: "The request id is upgraded to a trace. Each service records a **span**: what it did, when it started and how long it took. The `traceparent` header links each span to its parent.\n\nSpans go to a trace store, which puts them back into one tree per request.",
      fields: {
        traceparent: "Standard header: version, 32-hex trace id (the whole request), 16-hex parent span id, and a sampled flag `01`.",
      },
    },
    "slow-span": {
      short: "Slow span",
      title: "Finding the slow span",
      body: "Open one slow trace. Orders takes 2.3 s. Inside it, the database insert takes 38 ms. Then come 12 calls to inventory, one after another, about 180 ms each.\n\nNo single call is slow. There are just too many, in a row. Logs and metrics could not show this; the trace makes it obvious in a minute.",
      fields: {
        create_order: "The parent span. Its children explain where its 2.3 seconds went.",
        sku_19: "One call per item in the cart. A cart with 12 items means 12 calls.",
        "10 more": "Sequential: each waits for the previous one. This is the slow part.",
      },
    },
    batch: {
      short: "Batch",
      title: "One call for the whole cart",
      body: "Orders now asks inventory once for all items in the cart. Checkout p95 falls from 2.4 s to 0.42 s.\n\nThe new trace confirms it: one stock span of 46 ms instead of twelve. The same trace id shows up, with a new parent span id for this hop.",
      fields: {
        skus: "All items in one request instead of one request per item.",
        traceparent: "Same trace id, new parent span id. The trace store adds this call to the same tree.",
        "X-Response-Time": "46 ms for the whole cart.",
      },
    },
    sampling: {
      short: "Sampling",
      title: "Traces are expensive: sample",
      body: "Tracing every request produces 12 GB per day, most of it fast, boring requests. The collector now keeps 10% of normal traces, but every trace with an error or slower than 1 s.\n\nStorage drops to 2.5 GB per day. The traces you actually open are still all there.",
      watch: "Deciding at the start (head sampling) is cheap but blind. Keeping slow and failed traces means deciding at the end (tail sampling).",
      fields: {
        "10%": "Random share of normal traces. Enough to see the typical shape.",
        dropped: "Fast and successful: this one is not stored.",
        kept: "Slow or failed: always stored, because these are the traces people investigate.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Logs say what happened, metrics say how much and how often, traces say where the time went.\n\n1) Log structured JSON to one place. 2) Create one request or trace id at the edge and forward it everywhere. 3) RED for services, USE for resources. 4) Alert on p95 and errors over minutes, not on averages. 5) Use traces to find the slow span, and sample them to control cost.",
    },
  },
};

export default text;
