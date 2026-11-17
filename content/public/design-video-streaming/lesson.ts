import { defineLesson } from "@mufassall/scene-schema";

/**
 * A video site built step by step: resumable uploads straight to storage, a transcoding
 * pipeline that cuts a video into chunks, HLS segments with adaptive bitrate, a CDN in front of
 * the origin, view counting without a hot row, and cold storage for the long tail.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "design-video-streaming",
  level: "advanced",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "start", unit: "s", better: "down" },
    { id: "rebuffer", unit: "%", better: "down" },
    { id: "ready", unit: "min", better: "down" },
    { id: "origin", unit: "Gbps", better: "down" },
    { id: "cost", unit: "$/mo", better: "down" },
  ],
  steps: [
    {
      id: "upload",
      kind: "problem",
      nodes: {
        creator: { kind: "client", at: [0, 2] },
        upload: { kind: "service", at: [3, 2], state: "slow", load: 95 },
        raw: { kind: "storage", at: [8, 0] },
      },
      edges: {
        send: { from: "creator", to: "upload", flow: "fail", rate: 2 },
        "put-raw": { from: "upload", to: "raw", rate: 1 },
      },
      metrics: { cost: 18000 },
      focus: ["creator", "upload"],
      exchange: {
        edge: "send",
        request: {
          format: "http",
          head: "POST /v1/videos HTTP/1.1",
          headers: [
            ["Content-Type", "video/mp4"],
            ["Content-Length", "2147483648"],
            ["Authorization", "***"],
          ],
          body: "-- 1.4 GB sent after 23 minutes, then the hotel Wi-Fi drops",
        },
        response: { format: "http", head: "HTTP/1.1 504 Gateway Timeout" },
        marks: ["Content-Length", "1.4 GB", "504"],
        masked: ["Authorization"],
      },
    },
    {
      id: "resumable",
      kind: "fix",
      nodes: { upload: { state: "ok", load: 10 } },
      edges: {
        send: { flow: "request", rate: 1 },
        "put-raw": null,
        parts: { from: "creator", to: "raw", rate: 6 },
      },
      focus: ["creator", "raw"],
      exchange: {
        edge: "parts",
        request: {
          format: "http",
          head: "PUT /raw/v_8812.mp4?partNumber=88&uploadId=u_31&X-Amz-Signature=*** HTTP/1.1",
          headers: [["Content-Length", "16777216"]],
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: "ETag: \"9b2cf5\"\n-- parts 1..87 already stored; after a drop only part 88 is sent again",
        },
        marks: ["partNumber", "Content-Length", "ETag", "only part 88"],
      },
    },
    {
      id: "play-raw",
      kind: "problem",
      nodes: { viewer: { kind: "client", at: [2, 9] } },
      edges: { watch: { from: "viewer", to: "raw", flow: "fail", rate: 2 } },
      metrics: { start: 14, rebuffer: 22 },
      focus: ["viewer", "raw"],
      exchange: {
        edge: "watch",
        request: { format: "http", head: "GET /raw/v_8812.mp4 HTTP/1.1", headers: [["Range", "bytes=0-"]] },
        response: {
          format: "text",
          head: "HTTP/1.1 206 Partial Content",
          body: "file: 3840x2160, 45 Mbit/s, 2 GB\nviewer link: 4 Mbit/s on a phone",
        },
        marks: ["Range", "45 Mbit/s", "4 Mbit/s"],
      },
    },
    {
      id: "transcode",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [8, 4], load: 40 },
        workers: { kind: "worker", at: [11, 4], load: 85 },
        media: { kind: "storage", at: [11, 8] },
      },
      edges: {
        watch: null,
        job: { from: "raw", to: "queue", rate: 1 },
        take: { from: "queue", to: "workers", rate: 4 },
        out: { from: "workers", to: "media", rate: 4 },
      },
      metrics: { ready: 12 },
      focus: ["queue", "workers", "media"],
      exchange: {
        edge: "take",
        request: {
          format: "json",
          head: "SEND transcode",
          body: `{
  "video_id": "v_8812",
  "chunk": 17,
  "from_s": 960,
  "to_s": 1020,
  "ladder": ["1080p", "720p", "480p", "240p"]
}`,
        },
        response: { format: "text", head: "chunk 17 done in 70 s by w_09" },
        marks: ["chunk", "from_s", "ladder"],
      },
    },
    {
      id: "hls",
      kind: "fix",
      nodes: { workers: { load: 50 } },
      edges: { play: { from: "viewer", to: "media", rate: 3 } },
      metrics: { start: 2, rebuffer: 6 },
      focus: ["viewer", "media"],
      exchange: {
        edge: "play",
        request: { format: "http", head: "GET /v_8812/master.m3u8 HTTP/1.1" },
        response: {
          format: "text",
          head: "#EXTM3U",
          body: "#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\n1080p/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480\n480p/index.m3u8\n-- each index lists 6-second segments: seg_000.m4s, seg_001.m4s ...",
        },
        marks: ["master.m3u8", "BANDWIDTH", "RESOLUTION", "6-second segments"],
      },
    },
    {
      id: "abr",
      kind: "case",
      metrics: { rebuffer: 2 },
      focus: ["viewer"],
      exchange: {
        edge: "play",
        request: { format: "http", head: "GET /v_8812/480p/seg_042.m4s HTTP/1.1" },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: "player: measured 1.9 Mbit/s, buffer 7 s\nplayer: seg_041 was 1080p, seg_042 is 480p\nplayer: buffer 24 s again -> back to 720p",
        },
        marks: ["measured", "buffer", "480p"],
      },
    },
    {
      id: "premiere",
      kind: "problem",
      nodes: { media: { state: "slow" } },
      edges: { play: { rate: 12, flow: "fail" } },
      metrics: { origin: 1000, rebuffer: 30 },
      focus: ["viewer", "media"],
      exchange: {
        edge: "play",
        request: {
          format: "text",
          head: "20:00 premiere: 200000 viewers x 5 Mbit/s",
          body: "= 1 Tbit/s from one storage bucket\norigin: 503 Slow Down, p99 first byte 4.8 s",
        },
        marks: ["200000 viewers", "1 Tbit/s", "Slow Down"],
      },
    },
    {
      id: "cdn",
      kind: "fix",
      nodes: { media: { state: "ok" }, cdn: { kind: "cdn", at: [6, 10], load: 60 } },
      edges: {
        play: null,
        edge: { from: "viewer", to: "cdn", rate: 12 },
        fill: { from: "cdn", to: "media", rate: 1 },
      },
      metrics: { origin: 20, rebuffer: 2 },
      focus: ["viewer", "cdn", "media"],
      exchange: {
        edge: "edge",
        request: { format: "http", head: "GET /v_8812/720p/seg_042.m4s HTTP/1.1" },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=31536000, immutable"],
            ["X-Cache", "HIT"],
            ["Age", "312"],
          ],
        },
        marks: ["Cache-Control", "X-Cache", "Age"],
      },
    },
    {
      id: "views",
      kind: "problem",
      nodes: {
        counter: { kind: "service", at: [4, 12], load: 70 },
        videos: { kind: "db", at: [9, 12], state: "slow", load: 100 },
      },
      edges: {
        beat: { from: "viewer", to: "counter", rate: 8 },
        inc: { from: "counter", to: "videos", flow: "fail", rate: 8 },
      },
      focus: ["counter", "videos"],
      exchange: {
        edge: "inc",
        request: { format: "sql", head: "UPDATE videos SET views = views + 1 WHERE id = 'v_8812';" },
        response: { format: "text", head: "lock wait on row v_8812", body: "40000 updates/s on one row, p99 2.3 s" },
        marks: ["views + 1", "lock wait", "one row"],
      },
    },
    {
      id: "view-batch",
      kind: "fix",
      nodes: { videos: { state: "ok", load: 20 }, counter: { load: 40 } },
      edges: { inc: { flow: "request", rate: 1 } },
      focus: ["counter", "videos"],
      exchange: {
        edge: "inc",
        request: {
          format: "text",
          head: "counter: 1 minute window for v_8812",
          body: "heartbeats 2400000 -> views 41700 (watched >= 30 s, one per session)\nUPDATE videos SET views = views + 41700 WHERE id = 'v_8812'",
        },
        marks: ["window", "30 s", "one per session", "41700"],
      },
    },
    {
      id: "cold",
      kind: "fix",
      nodes: { cold: { kind: "storage", at: [12, 10] } },
      edges: { tier: { from: "media", to: "cold", rate: 1 } },
      metrics: { cost: 7000 },
      focus: ["media", "cold"],
      exchange: {
        edge: "tier",
        request: {
          format: "json",
          head: "PUT lifecycle media",
          body: `{
  "rule": "views_90d < 10",
  "move_to": "cold",
  "keep_hot": ["480p"],
  "delete_raw_after_days": 30
}`,
        },
        response: { format: "text", head: "4.1 PB moved, first byte from cold: up to 3 s" },
        marks: ["rule", "move_to", "keep_hot", "delete_raw_after_days"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
