import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A video-sharing app: phones upload large files, viewers watch them. First every byte goes
 * through the API, then straight to object storage. Numbers are a model scenario, not measurements.
 */
const putPart: WireMessage = {
  format: "http",
  head: "PUT /raw/v_9f3.mp4?uploadId=up_31a&partNumber=17 HTTP/1.1",
  headers: [
    ["Host", "files.example.com"],
    ["Content-Length", "8388608"],
    ["X-Upload-Signature", "***"],
  ],
};

export default defineLesson({
  slug: "files",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "upload", unit: "s", better: "down" },
    { id: "failed", unit: "%", better: "down" },
    { id: "cost", unit: "$", better: "down" },
  ],
  steps: [
    {
      id: "through-api",
      kind: "problem",
      nodes: {
        phone: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [4, 1], state: "slow", load: 85 },
        disk: { kind: "storage", at: [5, 5], load: 70 },
      },
      edges: {
        up: { from: "phone", to: "api", rate: 6 },
        save: { from: "api", to: "disk", rate: 6 },
      },
      metrics: { upload: 94, failed: 7, cost: 1900 },
      focus: ["phone", "api"],
      exchange: {
        edge: "up",
        request: {
          format: "http",
          head: "POST /videos HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
            ["Content-Type", "multipart/form-data; boundary=x9"],
            ["Content-Length", "188743680"],
          ],
          body: "<180 MB of video bytes>",
        },
        response: {
          format: "http",
          head: "HTTP/1.1 201 Created",
          headers: [["X-Response-Time", "94 s"]],
        },
        marks: ["Authorization", "Content-Length", "X-Response-Time"],
        masked: ["Authorization"],
      },
    },
    {
      id: "disk-full",
      kind: "problem",
      nodes: { disk: { state: "down", load: 100 }, api: { state: "down" } },
      edges: { save: { cut: true } },
      metrics: { failed: 18 },
      focus: ["api", "disk"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "write /var/app/uploads/v_9f3.mp4",
          body: "error: no space left on device\napi-2: GET /videos/v_9f3 -> 404 (file is on api-1)",
        },
        marks: ["no space left on device", "404"],
      },
    },
    {
      id: "presign",
      kind: "fix",
      nodes: {
        disk: null,
        api: { state: "ok", load: 10 },
        bucket: { kind: "storage", at: [8, 6], load: 20 },
      },
      edges: {
        up: { rate: 1 },
        put: { from: "phone", to: "bucket", rate: 6 },
      },
      metrics: { upload: 31, failed: 3, cost: 600 },
      focus: ["api", "bucket"],
      exchange: {
        edge: "up",
        request: {
          format: "json",
          head: "POST /uploads HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "filename": "trip.mp4",
  "size": 188743680,
  "content_type": "video/mp4"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "upload_id": "up_31a",
  "url": "https://files.example.com/raw/v_9f3.mp4",
  "expires_in": 900,
  "headers": {
    "X-Upload-Signature": "***"
  }
}`,
        },
        marks: ["size", "url", "expires_in", "X-Upload-Signature"],
        masked: ["Authorization", "X-Upload-Signature"],
      },
    },
    {
      id: "flaky",
      kind: "problem",
      edges: { put: { cut: true } },
      metrics: { upload: 58, failed: 11 },
      focus: ["phone", "bucket"],
      exchange: {
        edge: "put",
        request: {
          format: "http",
          head: "PUT /raw/v_9f3.mp4 HTTP/1.1",
          headers: [
            ["Host", "files.example.com"],
            ["Content-Length", "188743680"],
            ["X-Upload-Signature", "***"],
          ],
        },
        response: {
          format: "text",
          head: "connection reset after 151 MB (80%)",
          body: "app: retrying from byte 0",
        },
        marks: ["Content-Length", "connection reset", "byte 0"],
        masked: ["X-Upload-Signature"],
      },
    },
    {
      id: "multipart",
      kind: "fix",
      edges: { put: { cut: false, rate: 9 } },
      metrics: { upload: 22, failed: 0.4 },
      focus: ["phone", "bucket"],
      exchange: {
        edge: "put",
        request: putPart,
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["ETag", '"9b2cf1"']] },
        marks: ["uploadId", "partNumber", "Content-Length", "ETag"],
        masked: ["X-Upload-Signature"],
      },
    },
    {
      id: "metadata",
      kind: "case",
      nodes: { db: { kind: "db", at: [9, 1] } },
      edges: { meta: { from: "api", to: "db", rate: 1 } },
      focus: ["api", "db"],
      exchange: {
        edge: "meta",
        request: {
          format: "sql",
          head: "INSERT INTO videos",
          body: "  (id, owner_id, object_key, size, status)\nVALUES ('v_9f3', 'u_42', 'raw/v_9f3.mp4',\n  188743680, 'uploaded');",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["object_key", "status"],
      },
    },
    {
      id: "sync-transcode",
      kind: "problem",
      nodes: { api: { state: "slow", load: 95 } },
      edges: { fetch: { from: "api", to: "bucket", rate: 4 } },
      focus: ["api", "bucket"],
      exchange: {
        edge: "fetch",
        request: {
          format: "text",
          head: "api-1: transcode v_9f3 to 720p started",
          body: "api-1: transcode v_9f3 done in 68.4 s\napi-1: 14 requests queued behind it\nlb: api-1 health check timed out",
        },
        marks: ["transcode", "queued", "timed out"],
      },
    },
    {
      id: "worker",
      kind: "fix",
      nodes: {
        api: { state: "ok", load: 12 },
        queue: { kind: "queue", at: [12, 3] },
        worker: { kind: "worker", at: [12, 8], load: 60 },
      },
      edges: {
        fetch: null,
        notify: { from: "bucket", to: "queue", rate: 2 },
        take: { from: "queue", to: "worker", rate: 2 },
        write: { from: "worker", to: "bucket", rate: 3 },
        done: { from: "worker", to: "db", rate: 1 },
      },
      focus: ["queue", "worker"],
      exchange: {
        edge: "notify",
        request: {
          format: "json",
          head: "PUBLISH media.uploaded",
          body: `{
  "event": "object.created",
  "key": "raw/v_9f3.mp4",
  "size": 188743680
}`,
        },
        marks: ["event", "key"],
      },
    },
    {
      id: "viral",
      kind: "problem",
      nodes: {
        viewer: { kind: "client", at: [0, 11] },
        bucket: { state: "slow", load: 90 },
      },
      edges: { download: { from: "viewer", to: "bucket", rate: 12 } },
      metrics: { cost: 4200 },
      focus: ["viewer", "bucket"],
      exchange: {
        edge: "download",
        request: {
          format: "http",
          head: "GET /v/v_9f3/720p.mp4 HTTP/1.1",
          headers: [["Host", "files.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Length", "41943040"],
            ["X-Response-Time", "2.8 s"],
          ],
        },
        marks: ["Content-Length", "X-Response-Time"],
      },
    },
    {
      id: "cdn",
      kind: "fix",
      nodes: {
        cdn: { kind: "cdn", at: [4, 10], load: 40 },
        bucket: { state: "ok", load: 20 },
      },
      edges: {
        download: null,
        watch: { from: "viewer", to: "cdn", rate: 12 },
        origin: { from: "cdn", to: "bucket", rate: 1 },
      },
      metrics: { cost: 900 },
      focus: ["viewer", "cdn"],
      exchange: {
        edge: "watch",
        request: {
          format: "http",
          head: "GET /v/v_9f3/720p.mp4 HTTP/1.1",
          headers: [
            ["Host", "cdn.example.com"],
            ["Range", "bytes=0-1048575"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 206 Partial Content",
          headers: [
            ["Cache-Control", "public, max-age=31536000, immutable"],
            ["X-Cache", "HIT"],
            ["Age", "3600"],
          ],
        },
        marks: ["Range", "Cache-Control", "X-Cache"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
