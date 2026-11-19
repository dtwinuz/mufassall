import { defineLesson } from "@mufassall/scene-schema";

/**
 * A marketplace app talks to three services on three hosts. The story puts one gateway in front:
 * routing by host and path with TLS ended at the edge, the token checked once and a verified
 * identity passed inward, per-key limits, quotas and size limits, a BFF that turns a chain of five
 * calls into one, canary routing by user hash, then the gateway as a single point of failure and a
 * "god" layer with business logic, and finally gateway vs load balancer vs service mesh.
 * Scenario: a new route forgets to strip a client-supplied `X-User-Id`. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "api-gateway",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "edge", unit: "", better: "down" },
    { id: "spoof", unit: "/day", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "home", unit: "ms", better: "down" },
    { id: "exposed", unit: "%", better: "down" },
    { id: "outage", unit: "min", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 2] },
        catalog: { kind: "service", at: [11, 0] },
        orders: { kind: "service", at: [12, 4] },
        profile: { kind: "service", at: [11, 8] },
      },
      edges: {
        "d-cat": { from: "app", to: "catalog", rate: 2, mode: "call" },
        "d-ord": { from: "app", to: "orders", rate: 2, mode: "call" },
        "d-prof": { from: "app", to: "profile", rate: 1, mode: "call" },
      },
      metrics: { edge: 3, spoof: 0, p99: 120, home: 2100, exposed: 100, outage: 0 },
      focus: ["app", "catalog", "orders", "profile"],
      exchange: {
        edge: "d-ord",
        request: {
          format: "http",
          head: "GET /v1/orders?limit=20 HTTP/1.1",
          headers: [
            ["Host", "orders.shop.example"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "text",
          head: "one app, three public hosts: catalog.shop.example, orders.shop.example, profile.shop.example",
          body: "-- each service: its own TLS certificate to renew\n-- its own JWT check: 3 libraries, 3 versions, 3 ways to get it wrong\n-- its own CORS rules, its own limits, or none",
        },
        marks: ["Host", "Authorization", "three public hosts", "TLS certificate", "JWT check", "CORS"],
        masked: ["Authorization"],
      },
    },
    {
      id: "gateway",
      kind: "fix",
      nodes: { gw: { kind: "lb", at: [5, 4], load: 20 } },
      edges: {
        "d-cat": null,
        "d-ord": null,
        "d-prof": null,
        in: { from: "app", to: "gw", rate: 4, mode: "call" },
        "to-cat": { from: "gw", to: "catalog", rate: 2, mode: "call" },
        "to-ord": { from: "gw", to: "orders", rate: 2, mode: "call" },
        "to-prof": { from: "gw", to: "profile", rate: 1, mode: "call" },
      },
      metrics: { home: 1500 },
      focus: ["app", "gw"],
      exchange: {
        edge: "in",
        request: {
          format: "text",
          head: "listen 443  tls cert=api.shop.example  (one certificate, renewed every 60 days)",
          body: "route host=api.shop.example  path=/v1/catalog/*  -> catalog:8080   timeout 2 s\nroute host=api.shop.example  path=/v1/orders/*   -> orders:8080    timeout 5 s\nroute host=api.shop.example  path=/v1/me         -> profile:8080   timeout 1 s\nroute host=partners.shop.example  path=/*        -> catalog:8080   timeout 2 s\n-- inside: services are not reachable from the internet; gateway to service over mTLS",
        },
        marks: ["tls", "host", "path", "timeout", "mTLS"],
      },
    },
    {
      id: "edge-auth",
      kind: "fix",
      metrics: { edge: 0 },
      focus: ["gw", "orders"],
      exchange: {
        edge: "to-ord",
        request: {
          format: "http",
          head: "GET /v1/orders?limit=20 HTTP/1.1",
          headers: [
            ["X-User-Id", "u_5120"],
            ["X-User-Scopes", "orders:read"],
            ["X-Request-Id", "req_7f3a"],
            ["X-Forwarded-For", "203.0.113.24"],
          ],
          body: "-- the gateway checked the JWT once: RS256 signature with a cached key, exp, aud=shop-api\n-- every X-User-* header the client sent was removed before these were set\n-- no Authorization header goes inside: services never see the raw token",
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK   orders: WHERE customer_id = 'u_5120'   (ownership is still checked here)",
        },
        marks: ["X-User-Id", "X-User-Scopes", "X-Request-Id", "X-Forwarded-For", "removed", "ownership"],
      },
    },
    {
      id: "flood",
      kind: "problem",
      nodes: {
        partner: { kind: "client", at: [0, 9] },
        gw: { load: 85 },
        catalog: { state: "slow", load: 98 },
      },
      edges: {
        "p-in": { from: "partner", to: "gw", rate: 10, mode: "call" },
        "to-cat": { flow: "fail" },
      },
      metrics: { p99: 2600 },
      focus: ["partner", "gw", "catalog"],
      exchange: {
        edge: "p-in",
        request: {
          format: "http",
          head: "GET /v1/catalog/search?q=a&page=1 HTTP/1.1",
          headers: [
            ["Host", "partners.shop.example"],
            ["X-Api-Key", "***"],
          ],
          body: "-- 3 000 requests/s from this one key: a price scraper in a loop\n-- the whole catalog normally serves 400/s for everyone\n-- POST /v1/reviews takes any body: 8 bodies of 48 MB fill a worker's memory",
        },
        marks: ["X-Api-Key", "3 000", "400/s", "48 MB"],
        masked: ["X-Api-Key"],
      },
    },
    {
      id: "limits",
      kind: "fix",
      nodes: { gw: { load: 30 }, catalog: { state: "ok", load: 40 } },
      edges: { "p-in": { rate: 3 }, "to-cat": { flow: "request" } },
      metrics: { p99: 130 },
      focus: ["partner", "gw", "catalog"],
      exchange: {
        edge: "p-in",
        request: {
          format: "text",
          head: "plans: limits per API key, counted at the gateway, one counter for all its instances",
          body: "free      10 req/s   burst 20     100 000 req/month\npartner   200 req/s  burst 400    20 000 000 req/month\nevery route: body <= 1 MB (/v1/uploads: 20 MB, streamed), headers <= 16 KB, URL <= 8 KB\n-- over the rate: 429; over the quota: 429 until the 1st; too big: 413 before the body is read",
        },
        response: {
          format: "http",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [
            ["Retry-After", "1"],
            ["RateLimit-Remaining", "0"],
          ],
        },
        marks: ["burst", "req/month", "1 MB", "413", "Retry-After"],
      },
    },
    {
      id: "chatty",
      kind: "problem",
      metrics: { home: 2400 },
      focus: ["app", "gw"],
      exchange: {
        edge: "in",
        request: {
          format: "text",
          head: "home screen v5 on a 3G phone, RTT 300 ms",
          body: "0 ms       GET /v1/me                          -> city\n450 ms     GET /v1/orders?limit=3              needs the user\n900 ms     GET /v1/catalog/banners?city=...    needs the city\n1 350 ms   GET /v1/catalog/recs?after=...      needs the orders\n1 800 ms   GET /v1/catalog/promos\n2 400 ms   the screen is complete\n-- 5 round trips in a chain, 210 KB of fields the screen never shows",
        },
        marks: ["RTT 300 ms", "needs the user", "needs the orders", "5 round trips", "210 KB"],
      },
    },
    {
      id: "bff",
      kind: "fix",
      nodes: { bff: { kind: "service", at: [9, 1] } },
      edges: {
        home: { from: "gw", to: "bff", rate: 2, mode: "call" },
        "b-cat": { from: "bff", to: "catalog", rate: 2, mode: "call" },
        "b-ord": { from: "bff", to: "orders", rate: 1, mode: "call" },
        "b-prof": { from: "bff", to: "profile", rate: 1, mode: "call" },
      },
      metrics: { home: 650 },
      focus: ["app", "gw", "bff"],
      exchange: {
        edge: "home",
        request: {
          format: "http",
          head: "GET /v1/home HTTP/1.1",
          headers: [
            ["X-User-Id", "u_5120"],
            ["X-Request-Id", "req_9c1e"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "profile": { "name": "Ali", "city": "Samarqand" },
  "orders": [{ "id": "ord_7710", "status": "on_the_way" }],
  "banners": ["b_12", "b_40"],
  "recommendations": null,
  "partial": ["recommendations"],
  "took_ms": 340
}`,
        },
        marks: ["X-Request-Id", "orders", "recommendations", "partial", "took_ms"],
      },
    },
    {
      id: "canary",
      kind: "fix",
      nodes: { orders2: { kind: "service", at: [12, 11] } },
      edges: { v2: { from: "gw", to: "orders2", rate: 1, mode: "call" } },
      metrics: { exposed: 5 },
      focus: ["gw", "orders", "orders2"],
      exchange: {
        edge: "v2",
        request: {
          format: "text",
          head: "route /v1/orders/*",
          body: "  header X-Canary: 1  (staff phones)   -> orders-v2\n  else hash(user_id) % 100 < 5          -> orders-v2\n  else                                  -> orders-v1\n-- the same user always lands on the same version\n-- gateway logs per version: v1 errors 0.2 %, v2 errors 4.1 % -> weight back to 0 in one config push",
        },
        marks: ["X-Canary", "hash(user_id)", "same user", "per version", "weight back to 0"],
      },
    },
    {
      id: "spof",
      kind: "problem",
      nodes: { gw: { state: "down", load: 100 } },
      edges: { in: { flow: "fail" }, "p-in": { flow: "fail" } },
      metrics: { outage: 47 },
      focus: ["app", "partner", "gw"],
      exchange: {
        edge: "in",
        request: {
          format: "text",
          head: "14:02 gateway deploy: plugin pricing.lua v31",
          body: "-- the gateway now also computes discounts: 1 900 lines of Lua, owned by nobody\n14:02  one instance gets the new config: a nil in the discount rule for one city\n14:02  every worker crashes on its first /v1/home, restarts, crashes again\n14:02-14:49  every route is down: catalog, orders, profile, partners\n-- 47 minutes, and the fix needed the pricing team and the platform team together",
        },
        marks: ["pricing.lua", "owned by nobody", "one instance", "every route", "47 minutes"],
      },
    },
    {
      id: "thin",
      kind: "fix",
      nodes: {
        l4: { kind: "lb", at: [2, 5] },
        gw: { state: "ok", load: 35 },
        gw2: { kind: "lb", at: [5, 8], load: 35 },
      },
      edges: {
        in: null,
        "p-in": null,
        "l-app": { from: "app", to: "l4", rate: 4, mode: "call" },
        "l-part": { from: "partner", to: "l4", rate: 2, mode: "call" },
        "l-gw": { from: "l4", to: "gw", rate: 3, mode: "call" },
        "l-gw2": { from: "l4", to: "gw2", rate: 3, mode: "call" },
        "g2-home": { from: "gw2", to: "bff", rate: 1, mode: "call" },
        "g2-prof": { from: "gw2", to: "profile", rate: 1, mode: "call" },
        "g2-v2": { from: "gw2", to: "orders2", rate: 1, mode: "call" },
      },
      metrics: { outage: 1 },
      focus: ["l4", "gw", "gw2"],
      exchange: {
        edge: "l-gw2",
        request: {
          format: "text",
          head: "gateway: 3 instances in 2 zones behind an L4 load balancer, health check every 2 s",
          body: "config lives in git, is validated in CI, goes to 1 instance first and to the rest 10 min later\nin the gateway: routing, TLS, auth, keys, limits, request id\nnot in the gateway: discounts, order rules, joining business data -> back to the pricing service\n-- a bad config now breaks 1 of 3 instances, and the balancer takes it out within 6 s",
        },
        marks: ["3 instances", "L4", "in git", "1 instance first", "back to the pricing service", "6 s"],
      },
    },
    {
      id: "compare",
      kind: "case",
      focus: ["l4", "gw", "orders"],
      exchange: {
        edge: "l-gw",
        request: {
          format: "text",
          head: "three boxes that all \"forward requests\"",
          body: "L4 load balancer   TCP: spreads connections over healthy instances; reads no URL, no token\nAPI gateway        north-south: client to services; host and path, auth, keys, quotas, BFF\nservice mesh       east-west: service to service; mTLS, retries, timeouts in a sidecar per service\n-- many systems run all three: a balancer in front of the gateway, a mesh behind it",
        },
        marks: ["L4 load balancer", "north-south", "east-west", "sidecar", "all three"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "unstripped",
      from: "edge-auth",
      steps: [
        {
          id: "spoof-route",
          kind: "problem",
          nodes: { wallet: { kind: "service", at: [8, 10] } },
          edges: { "to-wal": { from: "gw", to: "wallet", flow: "fail", rate: 1, mode: "call" } },
          metrics: { spoof: 240 },
          focus: ["app", "gw", "wallet"],
          exchange: {
            edge: "to-wal",
            request: {
              format: "http",
              head: "GET /v1/wallet/balance HTTP/1.1",
              headers: [
                ["X-User-Id", "u_0042"],
                ["X-User-Id", "u_5120"],
                ["X-Request-Id", "req_51aa"],
              ],
              body: "-- the first X-User-Id came from the client; the gateway appended its own after it\n-- the wallet framework returns the first value: u_0042, someone else\n-- the route /v1/wallet/* was made from a template without the strip-identity step",
            },
            response: {
              format: "json",
              head: "HTTP/1.1 200 OK",
              body: `{
  "user_id": "u_0042",
  "balance_uzs": 1250000
}`,
            },
            marks: ["X-User-Id", "appended", "first value", "template", "user_id"],
          },
        },
        {
          id: "strip-all",
          kind: "fix",
          edges: { "to-wal": { flow: "request" } },
          metrics: { spoof: 3 },
          focus: ["app", "gw"],
          exchange: {
            edge: "in",
            request: {
              format: "text",
              head: "gateway, before any route: drop every inbound X-User-*, X-Internal-*, X-Forwarded-User",
              body: "on routes with auth: set X-User-Id from the token's sub, never append\na route without an auth block fails the config check in CI\nCI test: every route gets X-User-Id: u_0042 with a token of u_5120 -> must see u_5120 or 401\n-- still 3 a day: an admin tool on the office network calls wallet directly, past the gateway",
            },
            marks: ["before any route", "never append", "fails the config check", "every route", "directly"],
          },
        },
        {
          id: "verify-inside",
          kind: "fix",
          metrics: { spoof: 0 },
          focus: ["gw", "wallet"],
          exchange: {
            edge: "to-wal",
            request: {
              format: "http",
              head: "GET /v1/wallet/balance HTTP/1.1",
              headers: [
                ["X-Identity", "***"],
                ["X-Request-Id", "req_51ab"],
              ],
              body: "-- X-Identity: a token signed by the gateway, 60 s life, aud=wallet, sub=u_5120\n-- no valid X-Identity -> 401, whoever sent the request and from wherever\n-- audit: 1 912 past requests where the header did not match the token, 37 accounts, owners told",
            },
            marks: ["X-Identity", "60 s", "aud=wallet", "401", "37 accounts"],
            masked: ["X-Identity"],
          },
        },
      ],
    },
  ],
});
