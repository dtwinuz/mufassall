import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "From requirements to design",
  summary:
    "How to approach a design task without jumping to boxes. One small system, a city bus arrival board, goes through requirements, rough numbers, a high-level picture and then a detailed design of one part, with the trade-offs written down.",
  learn: [
    "Functional and non-functional requirements, and why the second kind shapes the design",
    "Back-of-the-envelope estimates: reads, writes and storage from a few known numbers",
    "High-level design: boxes, arrows and the two paths of the system",
    "Low-level design of one component: API, data layout, schema, and a written trade-off",
  ],
  nodes: {
    rider: "Rider app",
    bus: "Bus GPS unit",
    api: "Arrivals API",
    db: "Database",
    ingest: "Ingest service",
    queue: "Position stream",
    worker: "ETA workers",
    cache: "ETA cache",
  },
  metrics: {
    writes: "Positions in",
    reads: "Rider requests",
    p95: "Answer p95",
    freshness: "ETA age",
  },
  steps: {
    start: {
      short: "Start",
      title: "\"Build a bus arrival board\"",
      body: "The task is one sentence. The first instinct is to draw one server and one database: buses post their position, the server saves it.\n\nThat works for a demo. But nobody has asked yet how many buses, how many riders, or how fresh an arrival time must be. Without those answers any picture is a guess.",
      watch: "Drawing boxes first means designing for a load you have not measured.",
      fields: {
        bus_id: "Which bus. Each of about 800 buses has its own.",
        route: "The line the bus serves now. Riders care about routes, not buses.",
        ts: "When the GPS fix was taken, in seconds. Old positions must not overwrite new ones.",
      },
    },
    requirements: {
      short: "Requirements",
      title: "Requirements: what it does, and how well",
      body: "Functional: a bus reports its position every 10 seconds; a rider opens a stop and sees the next buses with minutes to arrival. Out of scope for now: route planning, tickets.\n\nNon-functional: the answer is under 200 ms at p95; the arrival time is at most 30 seconds old; the board keeps answering even when parts fail; history is kept for 90 days. These numbers decide the design more than the features do.",
      fields: {
        stop: "The stop the rider is looking at. The main key of the read side.",
        arrivals: "Next buses for this stop, soonest first.",
        eta_min: "Minutes to arrival. A first sketch; the detailed design will change it.",
      },
    },
    estimates: {
      short: "Estimates",
      title: "Rough numbers before any boxes",
      body: "800 buses, one position every 10 s: 80 writes per second. At the morning peak about 60 000 riders refresh every 20 s: 3 000 reads per second. A position is about 120 bytes, so 0.8 GB a day and about 75 GB for 90 days.\n\nThe result: reads outnumber writes about 40 to 1, and each read needs a computed arrival time. If one server computes it on every read from the database, it is overloaded at the peak.",
      watch: "Estimates only need to be right within a factor of a few. Their job is to show which part is heavy.",
      check: {
        q: "Reads outnumber writes 40 to 1, and each read needs a computed ETA. What takes the load off?",
        options: [
          "A bigger database for every rider read",
          "Compute ETAs per position, read them from a cache",
          "Buses reporting their position less often",
        ],
        answer: 1,
        why: "Workers compute arrival times once per position and write them to a cache; the API only reads the ready answer. Answer p95 falls from 900 ms to 45 ms.",
      },
    },
    hld: {
      short: "High level",
      title: "High-level design: two paths",
      body: "The picture now has two separate paths. Write path: buses send positions to a small ingest service, which puts them on a stream. Workers read the stream, compute arrival times per stop and write them to a cache; history goes to the database.\n\nRead path: the API only reads the ready answer from the cache. The heavy work happens once per position, not once per rider, and each path scales on its own.",
      fields: {
        topic: "The stream of all bus positions.",
        key: "The bus id. All positions of one bus go to one partition, so they stay in order.",
        partition: "One of 12 slices of the stream. Workers split partitions between them.",
      },
    },
    lag: {
      short: "Lag",
      title: "The worker falls behind",
      body: "At rush hour one worker computes arrival times for every position. Each takes about 15 ms, so one worker finishes about 66 a second while 80 arrive.\n\nThe backlog grows to 40 seconds. Riders get answers fast, but the answers are 40 seconds old: the 30-second requirement is broken while every server looks healthy.",
      check: {
        q: "One worker does 66 positions a second while 80 arrive. What brings the ETA age back under 30 s?",
        options: [
          "A bigger cache in front of the API",
          "Merging the stream into one partition",
          "Four workers splitting the 12 partitions",
        ],
        answer: 2,
        why: "Four instances share the 12 partitions, and each bus still goes to one worker, so order is kept. The backlog disappears and ETA age falls from 40 s to about 11 s.",
      },
      fields: {
        consumers: "One worker for 12 partitions: eleven of them wait.",
        lag: "Positions received but not yet processed. This is the freshness the rider sees.",
        "eta calc": "The cost of one position. Fast enough once, too slow 80 times a second.",
      },
    },
    scale: {
      short: "Scale out",
      title: "More workers, one per partition",
      body: "The worker group grows to four instances, and the 12 partitions are split between them. Each bus still goes to one worker, so its positions stay in order.\n\nThe backlog disappears and arrival times are about 11 seconds old. The number of partitions is the upper limit of parallel workers, which is why it was set above today's needs.",
    },
    "lld-api": {
      short: "API",
      title: "Low-level design: the arrivals API",
      body: "Now one component in detail. The endpoint gets a version in the path, times in seconds instead of minutes, and the time the data was computed.\n\nThe answer can be cached for 10 seconds. A repeated request with the same `ETag` gets an empty `304`. Most rider refreshes now cost almost nothing. Here the data changed, so a new ETag and a full 200 come back.",
      fields: {
        v1: "A version in the path. A later change in the answer can ship as `v2` without breaking old apps.",
        "If-None-Match": "The tag of the answer the app already has. If nothing changed, the server sends no body.",
        "Cache-Control": "The app and any proxy may reuse this answer for 10 seconds.",
        updated_at: "When the arrival time was computed. The rider sees how fresh it is.",
        eta_s: "Seconds, not minutes: the app rounds it itself and can count down.",
      },
    },
    "lld-cache": {
      short: "Cache layout",
      title: "Low-level design: one key per stop",
      body: "The cache holds one hash per stop: route to seconds of arrival, plus the computation time. The API answers with one read of one key.\n\nEach key expires 90 seconds after its last update. If a worker stops, old arrival times disappear instead of lying to riders forever.",
      fields: {
        HSET: "Writes several fields of one hash in a single command.",
        "arrivals:s_204": "The key is the stop: exactly what the read side asks for.",
        EXPIRE: "90 seconds of life. Stale data removes itself.",
      },
    },
    "lld-history": {
      short: "Schema",
      title: "Low-level design: the history table",
      body: "History is append-only: one row per position, never updated. The key is the bus plus the time, so a repeated message cannot create a second row.\n\nThe table is split into one partition per day. Deleting 90-day-old data is dropping a partition, not running a huge `DELETE`.",
      check: {
        q: "The cache goes down. The board must keep answering. What should the API do?",
        options: [
          "Answer from the database and mark it stale",
          "Return an error until the cache is back",
          "Hold each request until the cache returns",
        ],
        answer: 0,
        why: "Availability is the requirement, so the API falls back to the last positions in the database and marks the answer `stale`. The cost: p95 rises to 180 ms and the ETA is a minute old.",
      },
      fields: {
        "PRIMARY KEY": "Bus plus time: the same position sent twice is stored once.",
        "PARTITION BY": "One table on the outside, a separate piece per day on the inside.",
        "90 days": "The requirement from the start, now written into the schema.",
      },
    },
    tradeoff: {
      short: "Trade-off",
      title: "Trade-off: stale but available",
      body: "The cache goes down. The API could return an error, or fall back to the last stored positions in the database and compute a rough answer. The design picks the second and marks the answer as stale.\n\nThat is a written trade-off: availability over freshness, because the requirement says the board keeps answering. The cost is a slower answer and more database load while the cache is down.",
      watch: "Write each trade-off down with the requirement that decided it. Next year someone will ask why.",
      fields: {
        updated_at: "A minute old. The app shows the time next to the arrival.",
        stale: "The API admits the answer is old. The app shows it in grey instead of hiding it.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A design is a chain of decisions, each tied to a number.\n\n1) Write functional and non-functional requirements first: the second kind decides the design. 2) Estimate reads, writes and storage to find the heavy part. 3) High level: boxes and arrows, separate paths for different loads. 4) Low level for one component at a time: API, data layout, schema. 5) Write down each trade-off and the requirement behind it.",
    },
  },
};

export default text;
