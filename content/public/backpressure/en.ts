import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Backpressure",
  summary:
    "A mobile app sends analytics events to an ingest API, which keeps them in memory until a writer stores them. When the database slows down, events arrive faster than they leave, the buffer has no limit, and the API dies of memory with 1.8 million events already confirmed. Backpressure is how a system says \"slower\" back up the chain: a bounded buffer, a chosen way to overflow, 429 with Retry-After, consumers that pull, shedding by priority and a limit at the door.",
  learn: [
    "Why an unbounded queue turns overload into latency and then into lost data, and how to compute it",
    "A bounded buffer and the four overflow strategies: block, drop newest, drop oldest, sample",
    "Load shedding with 429 and Retry-After, and pull-based flow: consumer poll, TCP window, request(n)",
    "Carrying the signal upstream by priority, and a concurrency limit that rejects fast instead of queueing",
  ],
  nodes: {
    apps: "Mobile apps",
    api: "Ingest API",
    buffer: "Memory buffer",
    writer: "Writers",
    db: "Analytics DB",
    log: "Event log",
  },
  metrics: {
    mem: "API memory",
    lag: "Event delay",
    lost: "Events lost",
    shed: "Events turned away",
  },
  steps: {
    pipeline: {
      short: "Pipeline",
      title: "Events go into memory, a writer drains them",
      body: "The app's SDK collects events and sends them in batches of up to 50. In the evening peak all phones together send 1,200 events a second. The ingest API puts each batch into a buffer in its own memory and answers `202` right away. Four writers take events from the buffer and insert them 500 rows at a time: together about 2,000 events a second.\n\nThe load is 1,200 / 2,000 = 0.6. There is room, and an event reaches the database in half a second.",
      fields: {
        device: "Which phone sent the batch.",
        events: "Up to 50 events per request, so the app does not open a connection per tap.",
        "202 Accepted": "\"Taken\", not \"stored\". The event lives only in the API's memory so far.",
        accepted: "How many events of the batch the API took.",
      },
    },
    slow: {
      short: "Slow DB",
      title: "The database slows down, the buffer grows",
      body: "At 19:00 a nightly index rebuild starts and the writers drop to 800 events a second. 1,200 still arrive. The difference, 400 a second, stays in the buffer: 120,000 after five minutes, 240,000 after ten.\n\nNobody upstream notices. The API still answers `202` in 3 ms, the apps keep sending at full speed. The only sign is the API's memory, which climbs steadily.",
      watch: "Load above 1 has no steady state: the queue grows by (in − out) every second for as long as it lasts.",
      check: {
        q: "The rebuild takes two hours. What does the buffer do?",
        options: [
          "It levels off once the writers catch up",
          "It grows by 400 events every second, 1.44 million an hour, until memory runs out",
          "The API slows down by itself and the apps send less",
        ],
        answer: 1,
        why: "With 1,200 in and 800 out, the writers can never catch up while the rebuild runs. Nothing tells the producers, because a memory buffer always says yes. The queue grows linearly: 400 × 3,600 = 1.44 million an hour.",
      },
      fields: {
        "out 800/s": "What the writers manage while the index is rebuilt: 40% of normal.",
        depth: "Events waiting. +400 every second.",
        heap: "About 1 KB per event in memory, plus the API itself.",
        "202": "The producers get the same answer as before: no signal at all.",
      },
    },
    oom: {
      short: "Out of memory",
      title: "The API dies with 1.8 million confirmed events",
      body: "At 20:16 the API container reaches its 2 GiB limit and is killed. 1,840,000 events were in the buffer. Every one of them had been answered `202`, so the apps deleted them. After the restart the buffer is empty: these events are gone.\n\nBy Little's law the delay was depth / out rate = 1,840,000 / 800 = 2,300 s, so the oldest event had waited 38 minutes. The unbounded buffer did not absorb the overload. It turned it into delay, then into loss.",
      watch: "A queue without a limit does not remove overload. It only postpones the moment it hurts, and makes that moment bigger.",
      fields: {
        OOMKilled: "The container used more memory than allowed and was stopped by the system.",
        "buffered events": "Everything that was waiting, in RAM only.",
        "answered 202": "Each one was promised. The apps removed them from the phone.",
        "buffer empty": "Memory does not survive a restart.",
      },
    },
    bounded: {
      short: "Bounded",
      title: "The buffer gets a limit: block when full",
      body: "The buffer now holds at most 50,000 events: about 50 MB, never more. When it is full, the API's `put` blocks for up to 200 ms waiting for room. A blocked `put` holds the request, so the apps see slower answers and the next batch leaves later.\n\nThat is **backpressure**: a slow consumer slows the producer instead of growing a queue. The worst delay is now bounded too: 50,000 / 800 = 62 seconds. The cost: the API's request threads wait, and its own load climbs to 95%.",
      fields: {
        capacity: "The limit. Pick it by the delay you accept, not by the memory you have.",
        on_full: "What to do when there is no room. Here: wait.",
        put_timeout: "How long to wait before giving up on this request.",
        "worst wait": "Capacity / out rate: the longest an event can sit in the buffer.",
      },
    },
    strategies: {
      short: "Strategies",
      title: "When it is full: block, drop or sample",
      body: "Blocking is one answer, not the only one. The choice depends on what the data is worth. **Block** loses nothing but moves the waiting to the producer. **Drop newest** keeps what is already queued and rejects new arrivals. **Drop oldest** evicts the head of the queue, so the freshest data survives. **Sample** keeps one event in N and multiplies the counts back.\n\nPayments and orders are never dropped: they block or get an explicit error. A metric that is resent every second can lose a few points without harm.",
      watch: "Dropping silently is the worst option: if you drop, count what you drop and expose the number.",
      check: {
        q: "A courier app sends its GPS position every 2 seconds. The buffer is full. Which strategy fits?",
        options: ["Block the app until there is room", "Drop the newest positions", "Drop the oldest positions"],
        answer: 2,
        why: "Only the latest position matters: a point from a minute ago is already wrong. Dropping the oldest keeps the map current. Blocking makes the courier's app wait for data nobody needs any more; dropping the newest keeps exactly the stale points.",
      },
      fields: {
        block: "The producer waits. Safe for data that must not be lost.",
        "drop newest": "Reject at the door. Good when the old data is still useful.",
        "drop oldest": "Evict the head. Good when only fresh data matters.",
        sample: "Keep 1 of N and scale counts by N. Fine for statistics, wrong for money.",
      },
    },
    shed: {
      short: "429",
      title: "Shed load: a fast no with Retry-After",
      body: "Blocked requests still hold a connection and a thread. When the buffer is more than 80% full, the API now answers at once: `429 Too Many Requests` with `Retry-After: 2`. The SDK keeps the batch on the phone and sends it again later.\n\nThe API now turns away a third of the batches: 1,200 arrive, 800 can be stored. Its own load drops from 95% to 70%, and nothing is lost: what is not accepted stays on the device, and the device knows it.",
      check: {
        q: "The SDK gets `429` with `Retry-After: 2`. What should it do?",
        options: [
          "Send the same batch again at once",
          "Keep the batch on the phone, wait 2 s plus a random jitter, then send it again",
          "Delete the batch: the server did not want it",
        ],
        answer: 1,
        why: "Retrying at once multiplies the overload. Waiting exactly 2 s makes every phone come back in the same second. Waiting the hinted time plus jitter spreads the retries, and keeping the batch means `429` loses nothing.",
      },
      fields: {
        "429 Too Many Requests": "\"Not now, and it is not your fault\". Nothing was stored.",
        "Retry-After": "When to come back, in seconds. The server sets the pace.",
        queue_fill: "How full the buffer is. Shedding starts at 0.8, before it is full.",
        accepted: "0: the whole batch stays with the client.",
      },
    },
    pull: {
      short: "Pull",
      title: "A durable log, and writers that pull",
      body: "The memory buffer is replaced by an **event log** on disk with three replicas. The API answers `202` only after the log has the batch, so a restart loses nothing. The log keeps three days of events: the limit is now disk, not RAM.\n\nThe writers **pull**: each asks for at most 500 records, stores them, commits its offset and only then asks again. Nobody can push more onto a writer than it is ready to take. The same idea is the TCP window, where the receiver announces how many bytes it can still accept, and `request(n)` in Reactive Streams.",
      watch: "Pull does not make the work go away: if consumer lag grows for hours, add consumers or shed. Alert on lag, not on CPU.",
      fields: {
        max_records: "The writer's credit: never more than it can handle in one go.",
        "commit offset": "Done up to here. After a crash the writer continues from this point.",
        "poll again only now": "The consumer sets the pace, not the producer.",
        "consumer lag": "How far the writers are behind, in records and in seconds.",
      },
    },
    propagate: {
      short: "Upstream",
      title: "The lag travels up the chain, by priority",
      body: "The API reads the consumer lag every 5 seconds. Below 60 seconds it takes everything. Above, it sheds by priority: purchases are always accepted, screen views half, debug logs get `429` with `Retry-After: 30`.\n\nThe slow database is now felt where it can be handled: on the device, which waits and keeps its data. Every link in the chain, from writer to log to API to app, passes the signal one step back. Only a fifth of the events are turned away now, and none of them are purchases.",
      fields: {
        consumer_lag: "The writers' delay, read by the API: the signal from downstream.",
        priority: "Decided in advance: what the business can lose last.",
        "accept 50%": "Half of the screen views get in, the other half wait on the phone.",
        "Retry-After": "Low priority gets a long pause so it does not crowd the retry window.",
      },
    },
    admission: {
      short: "Admission",
      title: "A concurrency limit at the door",
      body: "The last guard is at the API itself. By Little's law, 2,000 requests a second at 50 ms each means about 100 requests in flight. The limiter allows 200. Request 201 gets `503` in under a millisecond instead of waiting in a thread pool until it times out.\n\nThe limit adapts: when the median latency rises, the limit goes down; when it recovers, it goes up by 10 a second. The index rebuild is over, the writers are back at 2,000 a second, and the delay is back to one second.",
      watch: "A fast rejection costs microseconds. A slow one holds memory, a thread and the client's patience, and makes the next retry worse.",
      fields: {
        in_flight: "Requests being handled right now. The limit counts these, not requests per second.",
        "503": "Rejected before any work was done, so rejection itself is cheap.",
        "limit 200 -> 140": "Latency rose, so the server is saturated: take less.",
        "+10 per s": "Grow slowly, cut quickly, like TCP congestion control.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for backpressure.\n\n1) If load is above 1, the queue grows by (in − out) every second: compute it, do not hope. 2) Every buffer has a limit, chosen by the delay you accept. 3) Decide what happens when it is full: block, drop newest, drop oldest or sample, and count what you drop. 4) Shed with a fast `429` and `Retry-After`; clients keep data and retry with jitter. 5) Let consumers pull, keep the backlog in a durable log and alert on consumer lag. 6) Pass the signal upstream by priority and limit concurrency at the door, so rejection is cheap.",
    },
  },
  scenarios: {
    spike: {
      label: "3x spike",
      steps: {
        "spike-hit": {
          short: "Spike",
          title: "A push campaign triples the traffic",
          body: "At 19:00 marketing sends a push notification to every user. For 20 minutes 3,600 events a second arrive instead of 1,200. The writers handle 2,000. The excess is 1,600 a second: 1.92 million events in 20 minutes.\n\nThe API hits its concurrency limit, and its load is at 100%.",
          check: {
            q: "What protects the database during these 20 minutes?",
            options: [
              "Add 4 more writers within a minute",
              "Admission by priority at the API: purchases always, the rest partly or with 429 and Retry-After, phones keep their batches",
              "Raise the log limit to keep 2 million more events",
            ],
            answer: 1,
            why: "More writers do not help when the database itself is the limit at 2,000 a second. The log could keep the events, but the delay would grow to 16 minutes. Admission keeps the delay short, the purchases flowing, and the rest waiting safely on the phones.",
          },
          fields: {
            "3x traffic": "Three times the usual peak, known in advance from the campaign plan.",
            writers: "Healthy now, but 2,000 a second is the database's ceiling.",
            excess: "What has to wait somewhere: in RAM, on disk or on the phone.",
            "nowhere to go": "Without backpressure, 1.92 million events end up in memory.",
          },
        },
        "spike-hold": {
          short: "Hold",
          title: "The phones hold the excess",
          body: "The API turns away 44% of the batches with `429` and `Retry-After: 20`. Each phone keeps its batches, up to 5 MB, and tries again after 20 seconds plus a random 0 to 10. Purchases are sent at once and never shed.\n\nThe excess is now spread across tens of thousands of phones, a few kilobytes each, instead of 2 GB in one process. The delay stays at 30 seconds.",
          fields: {
            "Retry-After": "The server stretches the pause while the spike lasts.",
            "kept on device": "The backlog lives where there is room for it.",
            jitter: "Random spread, so the phones do not return all at once.",
            purchases: "The highest priority goes through even now.",
          },
        },
        "spike-after": {
          short: "After",
          title: "The spike ends, the backlog drains",
          body: "At 19:20 the campaign traffic is over. The phones send what they kept, spread out by the jitter: 700 extra events a second on top of the normal 1,200. The writers run at 95%, and by 19:31 the delay is back to one second.\n\nNo event was lost and the database never went above its limit. The spike was absorbed by the whole chain, not by one buffer.",
          fields: {
            "backlog from devices": "The batches the phones kept, coming back at a pace the server allows.",
            "consumer lag": "Back to normal in 11 minutes.",
            lost: "Nothing: every event was either stored or still on the phone.",
          },
        },
      },
    },
  },
};

export default text;
