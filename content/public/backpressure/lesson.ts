import { defineLesson } from "@mufassall/scene-schema";

/**
 * A mobile app sends analytics events to an ingest API, which keeps them in an in-memory buffer
 * until a writer stores them in the database. The database slows down, the buffer has no limit,
 * and the API runs out of memory with every event already acknowledged. The fix is a chain:
 * a bounded buffer, a chosen overflow strategy, 429 with Retry-After, a pull-based durable log,
 * shedding by priority from the consumer lag, and a concurrency limit at the door.
 * Numbers are a model scenario: writers take 2 000 events/s healthy, 800 events/s while slow.
 */
export default defineLesson({
  slug: "backpressure",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "mem", unit: "MB", better: "down" },
    { id: "lag", unit: "s", better: "down" },
    { id: "lost", unit: "", better: "down" },
    { id: "shed", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "pipeline",
      kind: "case",
      nodes: {
        apps: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [3, 4], load: 40 },
        buffer: { kind: "queue", at: [6, 4] },
        writer: { kind: "worker", at: [9, 1], load: 60 },
        db: { kind: "db", at: [12, 4] },
      },
      edges: {
        send: { from: "apps", to: "api", rate: 4 },
        put: { from: "api", to: "buffer", rate: 4 },
        take: { from: "writer", to: "buffer", rate: 4 },
        save: { from: "writer", to: "db", rate: 4 },
      },
      metrics: { mem: 40, lag: 0.5, lost: 0, shed: 0 },
      focus: ["apps", "api", "buffer"],
      exchange: {
        edge: "send",
        request: {
          format: "json",
          head: "POST /v1/events HTTP/1.1",
          headers: [
            ["Host", "ingest.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "device": "d_7f",
  "events": [
    { "type": "screen_view", "ts": 1763481600 },
    { "type": "add_to_cart", "ts": 1763481602 }
  ]
}`,
        },
        response: { format: "json", head: "HTTP/1.1 202 Accepted", body: `{ "accepted": 50 }` },
        marks: ["device", "events", "202 Accepted", "accepted"],
        masked: ["Authorization"],
      },
    },
    {
      id: "slow",
      kind: "problem",
      nodes: {
        db: { state: "slow" },
        writer: { state: "slow", load: 100 },
        buffer: { load: 30 },
      },
      edges: { take: { rate: 2 }, save: { rate: 2 } },
      metrics: { mem: 280, lag: 300 },
      focus: ["buffer", "writer", "db"],
      exchange: {
        edge: "put",
        request: {
          format: "text",
          head: "19:10 buffer  in 1 200/s  out 800/s",
          body: "depth  19:00        0\n       19:05  120 000\n       19:10  240 000\nheap   280 MB and growing\n-- every event still gets 202 in 3 ms",
        },
        marks: ["out 800/s", "depth", "heap", "202"],
      },
    },
    {
      id: "oom",
      kind: "problem",
      nodes: {
        api: { state: "down", load: 100 },
        buffer: { state: "down", load: 100 },
      },
      edges: { send: { flow: "fail" }, put: { flow: "fail" } },
      metrics: { mem: 1900, lag: 2300, lost: 1840000 },
      focus: ["api", "buffer"],
      exchange: {
        edge: "put",
        request: {
          format: "text",
          head: "20:16:41 api-3  OOMKilled  (limit 2 GiB)",
          body: "buffered events        1 840 000\nalready answered 202   1 840 000\nwritten to the db              0\n20:16:44 restart: buffer empty\n-- the oldest event had waited 38 min",
        },
        marks: ["OOMKilled", "buffered events", "answered 202", "buffer empty"],
      },
    },
    {
      id: "bounded",
      kind: "fix",
      nodes: {
        api: { state: "slow", load: 95 },
        buffer: { state: "ok", load: 100 },
      },
      edges: { send: { flow: "request", rate: 3 }, put: { flow: "request", rate: 2 } },
      metrics: { mem: 90, lag: 62, lost: 0 },
      focus: ["api", "buffer"],
      exchange: {
        edge: "put",
        request: {
          format: "text",
          head: "buffer = BoundedQueue(capacity=50_000)",
          body: "on_full      = block\nput_timeout  = 200 ms\n-- full: 50 000 x ~1 KB = 50 MB, never more\n-- worst wait: 50 000 / 800 per s = 62 s",
        },
        marks: ["capacity", "on_full", "put_timeout", "worst wait"],
      },
    },
    {
      id: "strategies",
      kind: "fix",
      focus: ["buffer"],
      exchange: {
        edge: "put",
        request: {
          format: "text",
          head: "buffer full (50 000): what happens to event 50 001",
          body: "block        the producer waits   nothing lost, the wait moves upstream\ndrop newest  reject the new one   old data kept, new data lost\ndrop oldest  evict the head       fresh data kept, old data lost\nsample       keep 1 of N          totals stay right after x N",
        },
        marks: ["block", "drop newest", "drop oldest", "sample"],
      },
    },
    {
      id: "shed",
      kind: "fix",
      nodes: { api: { state: "ok", load: 70 } },
      edges: { send: { flow: "retry", rate: 3 } },
      metrics: { lag: 50, shed: 33 },
      focus: ["apps", "api"],
      exchange: {
        edge: "send",
        request: {
          format: "http",
          head: "POST /v1/events HTTP/1.1",
          headers: [
            ["Host", "ingest.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [["Retry-After", "2"]],
          body: `{
  "error": "overloaded",
  "queue_fill": 0.83,
  "accepted": 0
}`,
        },
        marks: ["429 Too Many Requests", "Retry-After", "queue_fill", "accepted"],
        masked: ["Authorization"],
      },
    },
    {
      id: "pull",
      kind: "fix",
      nodes: {
        buffer: null,
        log: { kind: "queue", at: [6, 4], load: 20 },
        writer: { state: "ok", load: 100 },
      },
      edges: {
        append: { from: "api", to: "log", rate: 3 },
        poll: { from: "writer", to: "log", rate: 2 },
      },
      metrics: { mem: 60, lag: 51 },
      focus: ["log", "writer"],
      exchange: {
        edge: "poll",
        request: {
          format: "text",
          head: "writer-2  poll(max_records=500)",
          body: "<- 500 records  offsets 88120500..88120999\n   INSERT 500 rows       610 ms\n   commit offset 88121000\n   poll again only now\nconsumer lag  41 000 records = 51 s",
        },
        marks: ["max_records", "commit offset", "poll again only now", "consumer lag"],
      },
    },
    {
      id: "propagate",
      kind: "fix",
      edges: { send: { flow: "request" } },
      metrics: { lag: 45, shed: 20 },
      focus: ["apps", "api", "log"],
      exchange: {
        edge: "append",
        request: {
          format: "text",
          head: "api admission  consumer_lag=74 s  (limit 60 s)",
          body: "priority  type          action\n   0      purchase      accept all\n   1      screen_view   accept 50%\n   2      debug_log     429, Retry-After: 30\n-- the slow db is now felt on the device, not in RAM",
        },
        marks: ["consumer_lag", "priority", "accept 50%", "Retry-After"],
      },
    },
    {
      id: "admission",
      kind: "fix",
      nodes: {
        db: { state: "ok" },
        writer: { load: 70 },
        api: { load: 60 },
      },
      edges: { poll: { rate: 4 }, save: { rate: 4 } },
      metrics: { lag: 1, shed: 0, mem: 60 },
      focus: ["apps", "api"],
      exchange: {
        edge: "send",
        request: {
          format: "text",
          head: "api concurrency limiter  window 1 s",
          body: "in_flight 200/200   p50 41 ms\nnew request -> 503 in 0.4 ms, not queued\np50 rose to 95 ms -> limit 200 -> 140\np50 back to 42 ms -> limit +10 per s",
        },
        marks: ["in_flight", "503", "limit 200 -> 140", "+10 per s"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "spike",
      from: "admission",
      steps: [
        {
          id: "spike-hit",
          kind: "problem",
          nodes: { api: { state: "slow", load: 100 }, writer: { load: 100 } },
          edges: { send: { rate: 12 }, append: { rate: 6 } },
          metrics: { lag: 60, shed: 44 },
          focus: ["apps", "api"],
          exchange: {
            edge: "send",
            request: {
              format: "text",
              head: "19:00 push campaign: 3x traffic for 20 min",
              body: "arriving  3 600 events/s   (usual 1 200)\nwriters   2 000 events/s   (all 4 busy)\nexcess    1 600 events/s\n-- 20 min x 1 600/s = 1.92 M events with nowhere to go",
            },
            marks: ["3x traffic", "writers", "excess", "nowhere to go"],
          },
        },
        {
          id: "spike-hold",
          kind: "fix",
          nodes: { api: { state: "ok", load: 90 } },
          edges: { send: { flow: "retry", rate: 8 }, append: { rate: 4 } },
          metrics: { lag: 30, lost: 0 },
          focus: ["apps", "api"],
          exchange: {
            edge: "send",
            request: {
              format: "text",
              head: "sdk d_7f  POST /v1/events -> 429  Retry-After: 20",
              body: "kept on device   3 batches, 150 events, 140 KB  (cap 5 MB)\nnext try         20 s + jitter 0..10 s\npurchases        sent at once, never shed",
            },
            marks: ["Retry-After", "kept on device", "jitter", "purchases"],
          },
        },
        {
          id: "spike-after",
          kind: "case",
          nodes: { writer: { load: 95 }, api: { load: 60 } },
          edges: { send: { flow: "request", rate: 5 } },
          metrics: { lag: 1, shed: 0, lost: 0 },
          focus: ["log", "writer"],
          exchange: {
            edge: "poll",
            request: {
              format: "text",
              head: "19:20..19:31 after the spike",
              body: "arriving      1 200/s + backlog from devices 700/s\nwriters       1 900/s  (95%)\nconsumer lag  30 s -> 1 s by 19:31\nlost          0",
            },
            marks: ["backlog from devices", "consumer lag", "lost"],
          },
        },
      ],
    },
  ],
});
