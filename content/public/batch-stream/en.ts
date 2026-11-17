import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Batch vs stream",
  summary:
    "An ad network counts clicks to bill advertisers and stop ads when the budget runs out. A nightly job is simple but a day late; a stream is fresh but has to deal with time, late events and replays.",
  learn: [
    "What a nightly batch job buys you and what its latency costs",
    "Tumbling and sliding windows, and what each is for",
    "Late events, event time and watermarks",
    "At-least-once delivery plus an idempotent sink gives exactly-once results",
  ],
  nodes: {
    app: "Apps",
    collector: "Click collector",
    files: "Raw click files",
    nightly: "Nightly job",
    stats: "Stats DB",
    ads: "Ad server",
    topic: "Click topic",
    stream: "Stream processor",
  },
  metrics: {
    lag: "Count lag",
    overspend: "Budget overspend",
    miscount: "Miscounted",
  },
  steps: {
    nightly: {
      short: "Nightly",
      title: "A nightly job counts yesterday",
      body: "Apps send clicks to a collector, which appends them to files. At 02:00 a job reads all of yesterday's files, groups by ad and writes the totals.\n\nIt is simple and easy to fix: if the code had a bug, run it again and the day is rewritten. The price is freshness: numbers arrive up to a day late.",
      check: {
        q: "The ad server stops an ad once its $50 daily budget is spent. An ad goes viral at 10:00. What happens?",
        options: [
          "It stops within minutes, once the budget is gone",
          "It keeps showing all day: spend still reads $0",
          "It is paused until the nightly job recounts",
        ],
        answer: 1,
        why: "The budget check reads stats from last night's run, so today's spend shows 0.00. The ad burned its budget in an hour and kept showing all day: $340 the network cannot bill.",
      },
      fields: {
        OVERWRITE: "The job replaces the whole day. Running it twice gives the same result, not double counts.",
        PARTITION: "One partition per day. A rerun touches only that day.",
        "GROUP BY": "One total per ad, over the full day. All data is already there, nothing is late.",
      },
    },
    overspend: {
      short: "Overspend",
      title: "The budget check reads last night's numbers",
      body: "The ad server stops an ad when its daily budget of $50 is spent. It checks the stats DB, but the stats are from last night.\n\nAd `ad_7` went viral at 10:00 and burned its budget in an hour. The ad server kept showing it all day, and the network ate $340 it cannot bill.",
      watch: "Batch is fine for reports. It is wrong for decisions that must react within minutes.",
      fields: {
        spent: "Zero. Today's clicks are not counted until tonight.",
        budget: "The daily limit the ad server is supposed to enforce.",
        "as of": "The real age of the number: the last nightly run.",
      },
    },
    stream: {
      short: "Stream",
      title: "Stream: count clicks as they arrive",
      body: "The collector now also writes each click to a topic. A stream processor reads it continuously and updates per-minute counts in the stats DB.\n\nThe ad server sees spend about a minute behind reality. Overspend drops to a few dollars, the price of that one minute.",
      fields: {
        key: "The ad id. All clicks of one ad go to one partition, so one processor instance counts them.",
        click_id: "Unique id of the click, set by the app. Needed to spot duplicates.",
        event_time: "When the click happened on the phone. Not when it reached us.",
      },
    },
    tumbling: {
      short: "Tumbling",
      title: "Tumbling windows: fixed one-minute buckets",
      body: "The processor groups clicks into **tumbling** windows: 10:00-10:01, 10:01-10:02, back to back, no overlap. Every click falls into exactly one window.\n\nTo stay fresh it flushes a partial count every 10 seconds and adds it to the row. Keep this `+` in mind: it comes back later.",
      fields: {
        window_start: "The window's start. With the ad id it forms the row's key.",
        "ON CONFLICT": "The row for this minute already exists, so it is updated instead of inserted.",
        EXCLUDED: "The new partial count. It is **added** to what is stored.",
      },
    },
    sliding: {
      short: "Sliding",
      title: "Sliding windows: catching click fraud",
      body: "Fraud rule: more than 20 clicks from one device within any 60 seconds. Fixed minutes miss a burst split across 10:00:50-10:01:20, so the processor uses **sliding** windows of 60 s that move every 10 s.\n\nWindows overlap, so each click is counted in six of them. Processor load jumps from 45% to 70%.",
      watch: "Sliding windows multiply state and work by size divided by step. Use them only where a burst matters.",
      fields: {
        device_id: "The device that clicked too often. The ad server stops counting its clicks.",
        window_start: "This window opened 10 seconds after the previous one.",
        window_end: "60 seconds after the start: the size of every window.",
        rule: "The condition that fired, so a human can check it later.",
      },
    },
    late: {
      short: "Late events",
      title: "Clicks that arrive minutes late",
      body: "A phone in the metro has no network. Its clicks are queued and sent when it gets signal again, three minutes later.\n\nThe 10:00 window was already finished and written. The late click falls on the floor, and the counts drift 3% below the truth.",
      watch: "Processing time is when you saw it, event time is when it happened. Windows must use event time.",
      check: {
        q: "The processor now waits 5 minutes for late clicks before closing a window. What does that cost?",
        options: [
          "Final counts arrive about 6 minutes late instead of 1",
          "Nothing: late clicks are counted, the rest is the same",
          "Clicks later than 5 minutes are counted twice",
        ],
        answer: 0,
        why: "A window is final only when the watermark, newest event time minus 5 minutes, passes its end. Miscounts fall to 0.2%, but final numbers come six minutes after the fact instead of one.",
      },
      fields: {
        event_time: "10:00:52: the click belongs to the 10:00 window.",
        received_at: "10:03:40: almost three minutes later. That window has already closed.",
      },
    },
    watermark: {
      short: "Watermark",
      title: "Watermarks: how long to wait for stragglers",
      body: "The processor tracks a **watermark**: the newest event time seen minus 5 minutes of allowed lateness. A window is final only when the watermark passes its end.\n\nLate clicks are now counted. Even later ones go to a side output, saved for correction. The cost: final numbers come six minutes after the fact instead of one.",
      watch: "The watermark is a guess. A longer wait is more complete and less fresh; there is no setting that gives both.",
      fields: {
        watermark: "\"I assume nothing older than 10:05:40 is still coming.\"",
        final: "The 10:00 window is closed; its count will no longer change.",
        "side output": "Events later than the watermark. They are not dropped silently; they go to files for the nightly fix.",
      },
    },
    crash: {
      short: "Crash",
      title: "Crash and replay: clicks counted twice",
      body: "The processor wrote counts up to offset 89320 and crashed before saving its position. On restart it resumes from the last saved offset, 88120.\n\nDelivery is **at least once**, which is right: nothing is lost. But the sink adds partial counts, so 1200 clicks are added a second time and advertisers are overbilled.",
      check: {
        q: "Delivery stays at-least-once. How do replays stop adding the same clicks twice?",
        options: [
          "Commit the offset before writing to the database",
          "Flush more often, so less is replayed after a crash",
          "Write the full window count with its offset; skip older offsets",
        ],
        answer: 2,
        why: "The sink now writes the whole count plus `last_offset`, and the row changes only if the offset is newer. A replay writes with an old offset and is ignored: the count stays 219.",
      },
      fields: {
        "committed offset": "The last position the processor saved. Everything after it is read again.",
        "second time": "The writes already happened. With `+` they are applied twice.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "An idempotent sink: replays change nothing",
      body: "The processor now writes the **full** count of the window, not a delta, together with the offset it has reached. The row only changes if the offset is newer.\n\nA replay writes the same value with an old offset and is ignored. At-least-once delivery plus an idempotent write gives exactly-once **results**, without distributed transactions.",
      fields: {
        last_offset: "How far in the topic this row already reflects.",
        EXCLUDED: "The full count. Writing it twice gives the same row.",
        WHERE: "The guard: an older or equal offset does not touch the row.",
        "replay ignored": "The replayed write matched nothing. The count is still 219.",
      },
    },
    both: {
      short: "Both",
      title: "Keep the batch job for the final word",
      body: "The stream is fast and almost right; it drives budgets and fraud blocks. The nightly job still runs on the raw files, including the side output, and rewrites yesterday with the exact total for billing.\n\nTwo paths, one per need. If they disagree, the batch result wins, because it saw every click.",
      watch: "Two code paths for one number must be kept in sync. Many teams share the counting code between them.",
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Four rules for batch and stream.\n\n1) Batch is simple, rerunnable and late; stream is fresh and harder. 2) Window by event time: tumbling for counts, sliding for bursts. 3) A watermark decides how long to wait for late events; later ones go to a side output. 4) Delivery is at least once, so make the sink idempotent: write full values keyed by window and offset.",
    },
  },
};

export default text;
