import { defineLesson } from "@mufassall/scene-schema";

/**
 * A shop's images and scripts move from one far-away origin to edge caches near users.
 * Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "cdn",
  level: "beginner",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "hit-ratio", unit: "%", better: "up" },
    { id: "origin-reqs", unit: "/s", better: "down" },
    { id: "wrong", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "far-origin",
      kind: "problem",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        origin: { kind: "service", at: [9, 3], load: 78 },
        bucket: { kind: "storage", at: [12, 6] },
      },
      edges: {
        page: { from: "client", to: "origin", rate: 8 },
        files: { from: "origin", to: "bucket", rate: 8 },
      },
      metrics: { p95: 1900, "hit-ratio": 0, "origin-reqs": 1200, wrong: 0 },
      focus: ["client", "origin"],
      exchange: {
        edge: "page",
        request: {
          format: "http",
          head: "GET /img/sofa-1042.jpg HTTP/1.1",
          headers: [["Host", "shop.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Type", "image/jpeg"],
            ["Content-Length", "412000"],
            ["Server-Timing", "total;dur=1870"],
          ],
        },
        marks: ["Content-Length", "Server-Timing"],
      },
    },
    {
      id: "edge-cache",
      kind: "fix",
      nodes: { edge: { kind: "cdn", at: [3, 4], load: 20 } },
      edges: {
        page: null,
        enter: { from: "client", to: "edge", rate: 8 },
        fetch: { from: "edge", to: "origin", rate: 8 },
      },
      metrics: { p95: 1950 },
      focus: ["client", "edge"],
      exchange: {
        edge: "enter",
        request: { format: "text", head: "dig static.example.com" },
        response: {
          format: "text",
          head: "static.example.com. 300 IN CNAME edge.cdn.example.net.",
          body: "edge.cdn.example.net. 60 IN A 198.51.100.24",
        },
        marks: ["CNAME", "198.51.100.24"],
      },
    },
    {
      id: "miss",
      kind: "case",
      nodes: { origin: { load: 50 } },
      edges: { fetch: { rate: 4 } },
      metrics: { p95: 900, "hit-ratio": 40, "origin-reqs": 700 },
      focus: ["edge", "origin"],
      exchange: {
        edge: "fetch",
        request: {
          format: "http",
          head: "GET /img/sofa-1042.jpg HTTP/1.1",
          headers: [["Host", "origin.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=86400"],
            ["ETag", '"a71c"'],
          ],
        },
        marks: ["Cache-Control", "ETag"],
      },
    },
    {
      id: "hit",
      kind: "case",
      nodes: { origin: { load: 12 }, edge: { load: 45 } },
      edges: { fetch: { rate: 1 }, files: { rate: 1 } },
      metrics: { p95: 110, "hit-ratio": 95, "origin-reqs": 60 },
      focus: ["client", "edge"],
      exchange: {
        edge: "enter",
        request: {
          format: "http",
          head: "GET /img/sofa-1042.jpg HTTP/1.1",
          headers: [["Host", "static.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["X-Cache", "HIT"],
            ["Age", "5312"],
          ],
        },
        marks: ["X-Cache", "Age"],
      },
    },
    {
      id: "wrong-image",
      kind: "problem",
      metrics: { wrong: 35 },
      focus: ["edge"],
      exchange: {
        edge: "enter",
        request: {
          format: "http",
          head: "GET /img/sofa-1042.jpg HTTP/1.1",
          headers: [["Host", "static.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["ETag", '"a71c"'],
            ["X-Cache", "HIT"],
            ["Age", "30210"],
          ],
        },
        marks: ["ETag", "Age"],
      },
    },
    {
      id: "purge",
      kind: "fix",
      nodes: { ops: { kind: "actor", at: [9, 0] }, origin: { load: 30 } },
      edges: { purge: { from: "ops", to: "edge", rate: 1 }, fetch: { rate: 3 } },
      metrics: { wrong: 0, "hit-ratio": 88, "origin-reqs": 300 },
      focus: ["ops", "edge"],
      exchange: {
        edge: "purge",
        request: {
          format: "json",
          head: "POST /v1/purge HTTP/1.1",
          headers: [
            ["Host", "api.cdn.example.net"],
            ["Authorization", "***"],
          ],
          body: `{
  "paths": ["/img/sofa-1042.jpg"]
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 202 Accepted",
          body: `{
  "purge_id": "pg_31",
  "eta_s": 5
}`,
        },
        marks: ["Authorization", "paths", "eta_s"],
        masked: ["Authorization"],
      },
    },
    {
      id: "versioned",
      kind: "fix",
      nodes: { ops: null, origin: { load: 10 } },
      edges: { fetch: { rate: 1 } },
      metrics: { "hit-ratio": 97, "origin-reqs": 40, p95: 95 },
      focus: ["client", "edge"],
      exchange: {
        edge: "enter",
        request: {
          format: "http",
          head: "GET /img/sofa-1042.3f9a2c.jpg HTTP/1.1",
          headers: [["Host", "static.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=31536000, immutable"],
            ["X-Cache", "HIT"],
          ],
        },
        marks: ["3f9a2c", "Cache-Control"],
      },
    },
    {
      id: "many-edges",
      kind: "problem",
      nodes: {
        client2: { kind: "client", at: [0, 9] },
        edge2: { kind: "cdn", at: [3, 9], load: 20 },
        origin: { load: 88, state: "slow" },
      },
      edges: {
        enter2: { from: "client2", to: "edge2", rate: 8 },
        fetch: { rate: 6 },
        fetch2: { from: "edge2", to: "origin", rate: 6 },
      },
      metrics: { "hit-ratio": 70, "origin-reqs": 1500, p95: 640 },
      focus: ["edge", "edge2", "origin"],
      exchange: {
        edge: "fetch2",
        request: {
          format: "text",
          head: "GET /app.9c1d.js edge=edge-a MISS",
          body: "GET /app.9c1d.js edge=edge-b MISS\nGET /app.9c1d.js edge=edge-c MISS\n... 41 edges, 41 fetches of one file",
        },
        marks: ["MISS", "41 edges"],
      },
    },
    {
      id: "shield",
      kind: "fix",
      nodes: {
        shield: { kind: "cdn", at: [6, 7], load: 30 },
        origin: { load: 15, state: "ok" },
      },
      edges: {
        fetch: null,
        fetch2: null,
        up1: { from: "edge", to: "shield", rate: 3 },
        up2: { from: "edge2", to: "shield", rate: 3 },
        up3: { from: "shield", to: "origin", rate: 1 },
      },
      metrics: { "hit-ratio": 96, "origin-reqs": 45, p95: 120 },
      focus: ["shield", "origin"],
      exchange: {
        edge: "up3",
        request: {
          format: "http",
          head: "GET /app.9c1d.js HTTP/1.1",
          headers: [
            ["Host", "origin.example.com"],
            ["Via", "1.1 edge-b, 1.1 shield-1"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Cache-Control", "public, max-age=31536000, immutable"]],
        },
        marks: ["Via", "Cache-Control"],
      },
    },
    {
      id: "private-leak",
      kind: "problem",
      edges: { enter2: { flow: "fail" } },
      metrics: { wrong: 4 },
      focus: ["client2", "edge2"],
      exchange: {
        edge: "enter2",
        request: {
          format: "http",
          head: "GET /api/cart HTTP/1.1",
          headers: [
            ["Host", "shop.example.com"],
            ["Cookie", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=60"],
            ["X-Cache", "HIT"],
          ],
          body: `{
  "user_id": "u_42",
  "items": 3
}`,
        },
        marks: ["Cookie", "Cache-Control", "X-Cache", "user_id"],
        masked: ["Cookie"],
      },
    },
    {
      id: "no-store",
      kind: "fix",
      nodes: { origin: { load: 22 } },
      edges: { enter2: { flow: "request" }, up2: { rate: 4 }, up3: { rate: 2 } },
      metrics: { wrong: 0, "hit-ratio": 93, "origin-reqs": 120 },
      focus: ["edge2", "origin"],
      exchange: {
        edge: "enter2",
        request: {
          format: "http",
          head: "GET /api/cart HTTP/1.1",
          headers: [
            ["Host", "shop.example.com"],
            ["Cookie", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "private, no-store"],
            ["X-Cache", "BYPASS"],
          ],
          body: `{
  "user_id": "u_77",
  "items": 1
}`,
        },
        marks: ["Cache-Control", "X-Cache", "user_id"],
        masked: ["Cookie"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
