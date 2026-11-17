import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * Counting ad clicks: a nightly batch job versus a stream processor.
 * Numbers are a model scenario for the story, not measurements.
 */
const click = (body: string): WireMessage => ({
  format: "json",
  head: "produce topic=clicks key=ad_7",
  body,
});

export default defineLesson({
  slug: "batch-stream",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "lag", unit: "s", better: "down" },
    { id: "overspend", unit: "$", better: "down" },
    { id: "miscount", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "nightly",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 2] },
        collector: { kind: "service", at: [3, 2] },
        files: { kind: "storage", at: [3, 6] },
        nightly: { kind: "worker", at: [6, 8] },
        stats: { kind: "db", at: [9, 6] },
      },
      edges: {
        send: { from: "app", to: "collector", rate: 6 },
        dump: { from: "collector", to: "files", rate: 4 },
        scan: { from: "files", to: "nightly", rate: 2 },
        write: { from: "nightly", to: "stats", rate: 1 },
      },
      metrics: { lag: 86400, overspend: 0, miscount: 0 },
      focus: ["files", "nightly"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT OVERWRITE daily_clicks",
          body: "PARTITION (day = '2026-11-17')\nSELECT ad_id, count(*) AS clicks\nFROM raw_clicks\nWHERE day = '2026-11-17'\nGROUP BY ad_id;",
        },
        response: { format: "text", head: "wrote 18400 rows in 312 s" },
        marks: ["OVERWRITE", "PARTITION", "GROUP BY"],
      },
    },
    {
      id: "overspend",
      kind: "problem",
      nodes: { ads: { kind: "service", at: [12, 6] } },
      edges: { budget: { from: "ads", to: "stats", rate: 4 } },
      metrics: { overspend: 340 },
      focus: ["ads", "stats"],
      exchange: {
        edge: "budget",
        request: {
          format: "sql",
          head: "SELECT spent, budget FROM ad_budgets",
          body: "WHERE ad_id = 'ad_7';",
        },
        response: {
          format: "text",
          head: "spent = 0.00 | budget = 50.00",
          body: "as of 2026-11-18 02:00 (nightly run)",
        },
        marks: ["spent", "budget", "as of"],
      },
    },
    {
      id: "stream",
      kind: "fix",
      nodes: {
        topic: { kind: "queue", at: [6, 2] },
        stream: { kind: "worker", at: [9, 2], load: 40 },
      },
      edges: {
        produce: { from: "collector", to: "topic", rate: 6 },
        consume: { from: "topic", to: "stream", rate: 6 },
        upsert: { from: "stream", to: "stats", rate: 3 },
        scan: { rate: 0 },
        write: { rate: 0 },
      },
      metrics: { lag: 60, overspend: 6 },
      focus: ["topic", "stream"],
      exchange: {
        edge: "produce",
        request: click(`{
  "click_id": "c_9f3",
  "ad_id": "ad_7",
  "event_time": "2026-11-18T10:00:41Z",
  "price": 0.05
}`),
        response: { format: "text", head: "ack partition=5 offset=88120" },
        marks: ["key", "click_id", "event_time"],
      },
    },
    {
      id: "tumbling",
      kind: "case",
      nodes: { stream: { load: 45 } },
      focus: ["stream", "stats"],
      exchange: {
        edge: "upsert",
        request: {
          format: "sql",
          head: "INSERT INTO ad_minute (ad_id, window_start, clicks)",
          body: "VALUES ('ad_7', '10:00', 37)\nON CONFLICT (ad_id, window_start)\nDO UPDATE SET clicks =\n  ad_minute.clicks + EXCLUDED.clicks;",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["window_start", "ON CONFLICT", "EXCLUDED"],
      },
    },
    {
      id: "sliding",
      kind: "case",
      nodes: { stream: { load: 70 } },
      edges: { alert: { from: "stream", to: "ads", rate: 1 } },
      focus: ["stream", "ads"],
      exchange: {
        edge: "alert",
        request: {
          format: "json",
          head: "POST /blocklist HTTP/1.1",
          body: `{
  "device_id": "dev_3",
  "clicks": 23,
  "window_start": "10:00:10",
  "window_end": "10:01:10",
  "rule": "more than 20 clicks in 60 s"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 204 No Content" },
        marks: ["device_id", "window_start", "window_end", "rule"],
      },
    },
    {
      id: "late",
      kind: "problem",
      edges: { send: { flow: "retry" } },
      metrics: { miscount: 3 },
      focus: ["app", "collector", "stream"],
      exchange: {
        edge: "produce",
        request: click(`{
  "click_id": "c_a11",
  "ad_id": "ad_7",
  "event_time": "2026-11-18T10:00:52Z",
  "received_at": "2026-11-18T10:03:40Z"
}`),
        marks: ["event_time", "received_at"],
      },
    },
    {
      id: "watermark",
      kind: "fix",
      edges: {
        send: { flow: "request" },
        late: { from: "stream", to: "files", flow: "retry", rate: 1 },
      },
      metrics: { miscount: 0.2, lag: 360 },
      focus: ["stream", "stats"],
      exchange: {
        edge: "upsert",
        request: {
          format: "text",
          head: "watermark = 10:05:40 (max event_time - 5 min)",
          body: "close window [10:00, 10:01) ad_7: final clicks = 219\nc_b02 event_time 09:58:02 too late -> side output",
        },
        marks: ["watermark", "final", "side output"],
      },
    },
    {
      id: "crash",
      kind: "problem",
      nodes: { stream: { state: "down" } },
      edges: {
        consume: { flow: "dup" },
        upsert: { flow: "dup" },
      },
      metrics: { miscount: 4 },
      focus: ["topic", "stream", "stats"],
      exchange: {
        edge: "consume",
        request: {
          format: "text",
          head: "consumer restarted, resume at committed offset 88120",
          body: "last batch written to DB: up to offset 89320\n1200 clicks will be added a second time",
        },
        marks: ["committed offset", "second time"],
      },
    },
    {
      id: "idempotent",
      kind: "fix",
      nodes: { stream: { state: "ok" } },
      edges: { upsert: { flow: "request" } },
      metrics: { miscount: 0.2 },
      focus: ["stream", "stats"],
      exchange: {
        edge: "upsert",
        request: {
          format: "sql",
          head: "INSERT INTO ad_minute",
          body: "  (ad_id, window_start, clicks, last_offset)\nVALUES ('ad_7', '10:00', 219, 89320)\nON CONFLICT (ad_id, window_start)\nDO UPDATE SET clicks = EXCLUDED.clicks,\n  last_offset = EXCLUDED.last_offset\nWHERE ad_minute.last_offset\n  < EXCLUDED.last_offset;",
        },
        response: { format: "text", head: "INSERT 0 0 -- replay ignored" },
        marks: ["last_offset", "EXCLUDED", "WHERE", "replay ignored"],
      },
    },
    {
      id: "both",
      kind: "case",
      edges: {
        consume: { flow: "request" },
        scan: { rate: 2 },
        write: { rate: 1 },
      },
      metrics: { miscount: 0 },
      focus: ["files", "nightly", "stream"],
    },
    { id: "recap", kind: "recap" },
  ],
});
