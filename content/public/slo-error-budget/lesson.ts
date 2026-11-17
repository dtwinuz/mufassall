import { defineLesson } from "@mufassall/scene-schema";

/**
 * A taxi app's "book a ride" API, about 100 requests a second (some 259 million in 30 days).
 * From "the server is up" to an SLI measured at the load balancer, an SLO with an error budget,
 * multiwindow burn-rate alerts, a release freeze and a latency SLO.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "slo-error-budget",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "sli", unit: "%", better: "up" },
    { id: "budget", unit: "%", better: "up" },
    { id: "burn", unit: "x", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "uptime",
      kind: "problem",
      nodes: {
        riders: { kind: "client", at: [0, 3] },
        lb: { kind: "lb", at: [3, 3], load: 40 },
        api: { kind: "service", at: [6, 3], load: 55 },
        db: { kind: "db", at: [10, 3], state: "slow", load: 90 },
        monitor: { kind: "service", at: [6, 8] },
      },
      edges: {
        book: { from: "riders", to: "lb", rate: 6 },
        route: { from: "lb", to: "api", rate: 6 },
        query: { from: "api", to: "db", flow: "fail", rate: 4 },
        ping: { from: "monitor", to: "api", rate: 1 },
      },
      metrics: { sli: 98.5, p99: 450 },
      focus: ["monitor", "api", "db"],
      exchange: {
        edge: "ping",
        request: { format: "http", head: "GET /healthz HTTP/1.1", headers: [["Host", "ride-api.internal"]] },
        response: { format: "text", head: "HTTP/1.1 200 OK", body: "status: up\nuptime: 100% this month" },
        marks: ["healthz", "200", "uptime"],
      },
    },
    {
      id: "sli",
      kind: "fix",
      edges: {
        ping: null,
        scrape: { from: "lb", to: "monitor", rate: 3 },
      },
      focus: ["lb", "monitor"],
      exchange: {
        edge: "scrape",
        request: {
          format: "text",
          head: "lb access log, POST /rides, 10:00-10:01",
          body: "requests=6000 status_5xx=90 status_4xx=150 slow_over_2s=0\ngood = requests - status_5xx - slow = 5910\nSLI = 5910 / 6000 = 98.5%",
        },
        marks: ["requests", "status_5xx", "status_4xx", "SLI"],
      },
    },
    {
      id: "slo",
      kind: "fix",
      nodes: { db: { state: "ok", load: 45 } },
      edges: { query: { flow: "request" } },
      metrics: { sli: 99.95, budget: 80, burn: 0.5 },
      focus: ["monitor"],
      exchange: {
        edge: "scrape",
        request: {
          format: "text",
          head: "slo ride-booking",
          body: "objective: 99.9% of valid requests are good, rolling 30 days\nrequests_30d = 100/s x 2 592 000 s = 259 200 000\nerror_budget = 0.1% = 259 200 failed requests\n-- or about 43 minutes of full outage",
        },
        marks: ["objective", "rolling", "error_budget", "43 minutes"],
      },
    },
    {
      id: "sla",
      kind: "case",
      focus: ["riders", "lb"],
      exchange: {
        edge: "book",
        request: {
          format: "text",
          head: "SLA, corporate rides contract",
          body: "availability: 99.5% per calendar month\nbelow 99.5%: 10% service credit\nbelow 99.0%: 25% service credit\n-- internal SLO: 99.9%, stricter than the promise",
        },
        marks: ["availability", "credit", "internal SLO"],
      },
    },
    {
      id: "bad-deploy",
      kind: "problem",
      nodes: {
        pipeline: { kind: "worker", at: [2, 8], load: 30 },
        api: { state: "slow", load: 70 },
      },
      edges: {
        deploy: { from: "pipeline", to: "api", rate: 1 },
        route: { flow: "fail" },
      },
      metrics: { sli: 95, burn: 50, budget: 60 },
      focus: ["pipeline", "api"],
      exchange: {
        edge: "deploy",
        request: { format: "text", head: "deploy ride-api v412 to 100%", body: "-- a new fare cache, one pod in twenty times out" },
        response: {
          format: "text",
          head: "error rate 5.0%, the SLO allows 0.1%",
          body: "burn_rate = 5.0 / 0.1 = 50\nthe whole 30-day budget lasts 30 days / 50 = 14.4 hours",
        },
        marks: ["v412", "error rate", "burn_rate", "14.4 hours"],
      },
    },
    {
      id: "naive-alert",
      kind: "problem",
      nodes: { pager: { kind: "actor", at: [10, 8] } },
      edges: { page: { from: "monitor", to: "pager", flow: "fail", rate: 1 } },
      metrics: { budget: 10 },
      focus: ["monitor", "pager"],
      exchange: {
        edge: "page",
        request: {
          format: "text",
          head: "rule A: error_rate_5m > 0.1% -> page",
          body: "fired 31 times last week, 29 healed by themselves within 3 min\nrule B: budget_left < 10% -> page\nfired 10 hours after v412 went out",
        },
        marks: ["rule A", "31 times", "rule B", "10 hours"],
      },
    },
    {
      id: "burn-rate",
      kind: "fix",
      nodes: { api: { state: "ok", load: 55 } },
      edges: { page: { flow: "request" }, route: { flow: "request" } },
      metrics: { sli: 99.95, burn: 0.5, budget: 77 },
      focus: ["monitor", "pager"],
      exchange: {
        edge: "page",
        request: {
          format: "text",
          head: "ALERT BudgetBurnFast (page)",
          body: "burn_rate(1h) > 14.4 and burn_rate(5m) > 14.4\n-- 14.4x for one hour spends 2% of the 30-day budget\nALERT BudgetBurnSlow (ticket)\nburn_rate(6h) > 6 and burn_rate(30m) > 6",
        },
        response: { format: "text", head: "v412 replay: paged at +17 min, rolled back at +25 min, 3% of budget spent" },
        marks: ["burn_rate(1h)", "burn_rate(5m)", "2%", "ticket", "+17 min"],
      },
    },
    {
      id: "freeze",
      kind: "fix",
      nodes: { pipeline: { load: 10 } },
      edges: {
        deploy: { cut: true },
        gate: { from: "pipeline", to: "monitor", rate: 1 },
      },
      metrics: { budget: -12 },
      focus: ["pipeline", "monitor"],
      exchange: {
        edge: "gate",
        request: { format: "http", head: "GET /slo/ride-booking/budget HTTP/1.1", headers: [["Host", "slo.internal"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "budget_left_percent": -12,
  "policy": "freeze",
  "allowed": ["reliability fix", "security fix"],
  "until": "budget_left_percent > 0"
}`,
        },
        marks: ["budget_left_percent", "policy", "allowed", "until"],
      },
    },
    {
      id: "latency",
      kind: "case",
      edges: { deploy: { cut: false } },
      metrics: { p99: 900 },
      focus: ["lb", "monitor"],
      exchange: {
        edge: "scrape",
        request: {
          format: "text",
          head: "histogram ride_request_duration, last 30 days",
          body: "le=100ms   71.0%\nle=300ms   98.2%\nle=1s      99.8%\navg=120ms  p99=900ms\nlatency SLO: 99% of requests faster than 300 ms",
        },
        marks: ["le=300ms", "avg", "p99", "latency SLO"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
