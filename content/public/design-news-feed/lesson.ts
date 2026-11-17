import { defineLesson } from "@mufassall/scene-schema";

/**
 * A social feed built step by step: pull on read, push on write, the celebrity problem and a
 * hybrid, ranking with cursors, media on a CDN, and losing the feed cache. Numbers are a model.
 */
export default defineLesson({
  slug: "design-news-feed",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "feed-p99", unit: "ms", better: "down" },
    { id: "fanout", unit: "/s", better: "down" },
    { id: "post-delay", unit: "s", better: "down" },
  ],
  steps: [
    {
      id: "post",
      kind: "case",
      nodes: {
        author: { kind: "client", at: [0, 2] },
        reader: { kind: "client", at: [0, 8] },
        api: { kind: "service", at: [4, 5], load: 15 },
        db: { kind: "db", at: [8, 2], load: 15 },
      },
      edges: {
        publish: { from: "author", to: "api", rate: 1 },
        save: { from: "api", to: "db", rate: 1 },
      },
      metrics: { "feed-p99": 80, fanout: 0, "post-delay": 0 },
      focus: ["author", "api"],
      exchange: {
        edge: "publish",
        request: {
          format: "json",
          head: "POST /v1/posts HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "text": "First snow in the mountains",
  "media_ids": ["m_5521"]
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "post_id": "7393018847102976",
  "created_at": "2026-11-18T09:12:04Z"
}`,
        },
        marks: ["Authorization", "media_ids", "post_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "pull",
      kind: "case",
      edges: {
        open: { from: "reader", to: "api", rate: 3 },
        read: { from: "api", to: "db", rate: 3 },
      },
      focus: ["reader", "api", "db"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "SELECT p.id, p.author_id, p.created_at",
          body: `FROM posts p
JOIN follows f ON f.followee_id = p.author_id
WHERE f.follower_id = 'u_42'
ORDER BY p.created_at DESC
LIMIT 50;`,
        },
        response: { format: "text", head: "(50 rows)", body: "Time: 38.204 ms" },
        marks: ["JOIN", "ORDER BY", "LIMIT"],
      },
    },
    {
      id: "pull-slow",
      kind: "problem",
      nodes: { api: { load: 60 }, db: { state: "slow", load: 97 } },
      edges: { open: { rate: 10 }, read: { rate: 10 } },
      metrics: { "feed-p99": 1800 },
      focus: ["db"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE SELECT p.id ...",
          body: "WHERE f.follower_id = 'u_42' ...",
        },
        response: {
          format: "text",
          head: "Sort  (top-N heapsort)",
          body: "Rows Removed: 48160\nExecution Time: 1712.4 ms",
        },
        marks: ["EXPLAIN", "Rows Removed", "Execution Time"],
      },
    },
    {
      id: "push",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [4, 0], load: 20 },
        fanout: { kind: "worker", at: [11, 0], load: 30 },
        feeds: { kind: "cache", at: [10, 8], load: 30 },
        api: { load: 30 },
        db: { state: "ok", load: 30 },
      },
      edges: {
        read: null,
        enqueue: { from: "api", to: "queue", rate: 1 },
        take: { from: "queue", to: "fanout", rate: 1 },
        followers: { from: "fanout", to: "db", rate: 1 },
        deliver: { from: "fanout", to: "feeds", rate: 8 },
        feed: { from: "api", to: "feeds", rate: 10 },
      },
      metrics: { "feed-p99": 25, fanout: 1800, "post-delay": 2 },
      focus: ["queue", "fanout", "feeds"],
      exchange: {
        edge: "deliver",
        request: {
          format: "text",
          head: "LPUSH feed:u_42 7393018847102976",
          body: "LTRIM feed:u_42 0 799",
        },
        response: { format: "text", head: "(integer) 801", body: "OK" },
        marks: ["LPUSH", "LTRIM", "feed"],
      },
    },
    {
      id: "read-fast",
      kind: "case",
      nodes: { feeds: { load: 45 } },
      edges: { open: { rate: 12 }, feed: { rate: 12 } },
      focus: ["reader", "api", "feeds"],
      exchange: {
        edge: "feed",
        request: { format: "text", head: "LRANGE feed:u_42 0 49" },
        response: {
          format: "text",
          head: '1) "7393018847102976"',
          body: '2) "7393011920338944"\n...\n50) "7392870115643392"',
        },
        marks: ["LRANGE", "49"],
      },
    },
    {
      id: "celebrity",
      kind: "problem",
      nodes: {
        queue: { load: 100, state: "slow" },
        fanout: { load: 100, state: "slow" },
        feeds: { load: 90 },
      },
      edges: { take: { rate: 12 }, deliver: { rate: 12 } },
      metrics: { fanout: 200000, "post-delay": 600 },
      focus: ["queue", "fanout"],
      exchange: {
        edge: "take",
        request: {
          format: "text",
          head: "fanout post=7393102255110144 author=u_star",
          body: "followers=30412887 done=812000 eta=37m",
        },
        marks: ["followers", "eta"],
      },
    },
    {
      id: "hybrid",
      kind: "fix",
      nodes: {
        queue: { load: 20, state: "ok" },
        fanout: { load: 35, state: "ok" },
        feeds: { load: 45 },
      },
      edges: {
        take: { rate: 1 },
        deliver: { rate: 8 },
        stars: { from: "api", to: "db", rate: 3 },
      },
      metrics: { fanout: 1800, "post-delay": 2, "feed-p99": 40 },
      focus: ["api", "db", "fanout"],
      exchange: {
        edge: "stars",
        request: {
          format: "sql",
          head: "SELECT id, author_id, created_at FROM posts",
          body: `WHERE author_id IN ('u_star', 'u_band')
  AND created_at > now() - interval '2 days'
ORDER BY created_at DESC
LIMIT 20;`,
        },
        response: { format: "text", head: "(7 rows)", body: "Time: 1.9 ms" },
        marks: ["author_id", "interval"],
      },
    },
    {
      id: "rank",
      kind: "case",
      nodes: { api: { load: 55 } },
      focus: ["reader", "api"],
      exchange: {
        edge: "open",
        request: {
          format: "http",
          head: "GET /v1/feed?limit=20&cursor=c_7f2a HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "items": [
    { "post_id": "7393018847102976",
      "score": 0.91 },
    { "post_id": "7393102255110144",
      "score": 0.87 }
  ],
  "next_cursor": "c_80b1"
}`,
        },
        marks: ["cursor", "score", "next_cursor"],
        masked: ["Authorization"],
      },
    },
    {
      id: "media",
      kind: "fix",
      nodes: {
        cdn: { kind: "cdn", at: [4, 11], load: 40 },
        media: { kind: "storage", at: [8, 12], load: 10 },
      },
      edges: {
        img: { from: "reader", to: "cdn", rate: 10 },
        origin: { from: "cdn", to: "media", rate: 1 },
      },
      focus: ["reader", "cdn", "media"],
      exchange: {
        edge: "img",
        request: {
          format: "http",
          head: "GET /m/m_5521/720.webp HTTP/1.1",
          headers: [["Host", "media.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Type", "image/webp"],
            ["Cache-Control", "public, max-age=31536000, immutable"],
            ["X-Cache", "HIT"],
          ],
        },
        marks: ["720", "Cache-Control", "X-Cache"],
      },
    },
    {
      id: "cache-loss",
      kind: "problem",
      nodes: { feeds: { state: "down", load: 0 } },
      edges: { feed: { flow: "fail" }, deliver: { cut: true } },
      metrics: { "feed-p99": 5000 },
      focus: ["api", "feeds"],
      exchange: {
        edge: "feed",
        request: { format: "text", head: "LRANGE feed:u_42 0 49" },
        response: { format: "text", head: "(error) connection refused", body: "node feeds-3 marked down" },
        marks: ["connection refused"],
      },
    },
    {
      id: "rebuild",
      kind: "fix",
      nodes: { feeds: { state: "ok", load: 50 }, db: { load: 55 } },
      edges: { feed: { flow: "request" }, deliver: { cut: false }, stars: { rate: 6 } },
      metrics: { "feed-p99": 60 },
      focus: ["api", "db", "feeds"],
    },
    { id: "recap", kind: "recap" },
  ],
});
