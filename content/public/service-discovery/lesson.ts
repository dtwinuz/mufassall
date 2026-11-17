import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * An orders service calls inventory instances that come and go. From hard-coded IPs to a
 * Consul-style registry with heartbeats, DNS answers and a load balancer that discovers for you.
 * Numbers are a model scenario, not measurements.
 */
const stockAt = (host: string): WireMessage => ({
  format: "http",
  head: "GET /v1/stock/sku_19 HTTP/1.1",
  headers: [["Host", host]],
});

export default defineLesson({
  slug: "service-discovery",
  level: "intermediate",
  minutes: 11,
  tier: "public",
  metrics: [
    { id: "errors", unit: "%", better: "down" },
    { id: "drain", unit: "s", better: "down" },
    { id: "instances", unit: "", better: "up" },
  ],
  steps: [
    {
      id: "hardcoded",
      kind: "case",
      nodes: {
        orders: { kind: "service", at: [1, 4], load: 40 },
        "inv-a": { kind: "service", at: [7, 1], load: 45 },
        "inv-b": { kind: "service", at: [7, 5], load: 45 },
      },
      edges: {
        "to-a": { from: "orders", to: "inv-a", rate: 3 },
        "to-b": { from: "orders", to: "inv-b", rate: 3 },
      },
      metrics: { errors: 0.1, instances: 2 },
      focus: ["orders"],
      exchange: {
        edge: "to-a",
        request: stockAt("192.0.2.11:8080"),
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "sku": "sku_19",
  "qty": 14
}`,
        },
        marks: ["Host", "qty"],
      },
    },
    {
      id: "moved",
      kind: "problem",
      nodes: {
        "inv-b": { state: "down", load: 0 },
        "inv-c": { kind: "service", at: [7, 9], load: 0 },
      },
      edges: { "to-b": { flow: "fail", cut: true } },
      metrics: { errors: 50, drain: 1800 },
      focus: ["orders", "inv-b", "inv-c"],
      exchange: {
        edge: "to-b",
        request: stockAt("192.0.2.12:8080"),
        response: {
          format: "text",
          head: "connect ECONNREFUSED 192.0.2.12:8080",
          body: "config: INVENTORY_HOSTS=192.0.2.11,192.0.2.12",
        },
        marks: ["Host", "ECONNREFUSED", "INVENTORY_HOSTS"],
      },
    },
    {
      id: "registry",
      kind: "fix",
      nodes: {
        "inv-b": null,
        registry: { kind: "db", at: [2, 9] },
      },
      edges: {
        "reg-a": { from: "inv-a", to: "registry", rate: 1 },
        "reg-c": { from: "inv-c", to: "registry", rate: 1 },
      },
      focus: ["registry", "inv-c"],
      exchange: {
        edge: "reg-c",
        request: {
          format: "json",
          head: "PUT /v1/agent/service/register HTTP/1.1",
          headers: [["Host", "registry.internal:8500"]],
          body: `{
  "Name": "inventory",
  "ID": "inv-c",
  "Address": "192.0.2.27",
  "Port": 8080
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Name", "ID", "Address", "Port"],
      },
    },
    {
      id: "client-side",
      kind: "fix",
      nodes: {
        "inv-a": { load: 40 },
        "inv-c": { load: 40 },
        "inv-d": { kind: "service", at: [11, 5], load: 40 },
      },
      edges: {
        ask: { from: "orders", to: "registry", rate: 1 },
        "reg-d": { from: "inv-d", to: "registry", rate: 1 },
        "to-c": { from: "orders", to: "inv-c", rate: 3 },
        "to-d": { from: "orders", to: "inv-d", rate: 3 },
      },
      metrics: { errors: 0.1, instances: 3 },
      focus: ["orders", "registry"],
      exchange: {
        edge: "ask",
        request: {
          format: "http",
          head: "GET /v1/health/service/inventory?passing=true HTTP/1.1",
          headers: [["Host", "registry.internal:8500"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `[
  { "ID": "inv-a", "Address": "192.0.2.11" },
  { "ID": "inv-c", "Address": "192.0.2.27" },
  { "ID": "inv-d", "Address": "192.0.2.31" }
]`,
        },
        marks: ["passing", "Address"],
      },
    },
    {
      id: "crash",
      kind: "problem",
      nodes: { "inv-a": { state: "down", load: 0 } },
      edges: {
        "to-a": { flow: "fail", cut: true },
        "reg-a": { rate: 0 },
      },
      metrics: { errors: 33, drain: 600 },
      focus: ["orders", "inv-a", "registry"],
      exchange: {
        edge: "to-a",
        request: stockAt("192.0.2.11:8080"),
        response: {
          format: "text",
          head: "timeout after 2000ms",
          body: "inv-a still listed as passing in registry",
        },
        marks: ["timeout", "passing"],
      },
    },
    {
      id: "heartbeat",
      kind: "fix",
      edges: {
        "to-a": null,
        "reg-a": null,
        "reg-c": { flow: "ack" },
        "reg-d": { flow: "ack" },
      },
      metrics: { errors: 0.3, drain: 20, instances: 2 },
      focus: ["registry", "inv-c", "inv-a"],
      exchange: {
        edge: "reg-c",
        request: {
          format: "http",
          head: "PUT /v1/agent/check/pass/service:inv-c HTTP/1.1",
          headers: [["Host", "registry.internal:8500"]],
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: `registry: inv-a last pass 17s ago, TTL 15s -> critical
registry: inv-a dropped from passing list`,
        },
        marks: ["pass", "TTL", "critical"],
      },
    },
    {
      id: "dns",
      kind: "case",
      edges: { ask: { flow: "request", rate: 2 } },
      metrics: { drain: 35 },
      focus: ["orders", "registry"],
      exchange: {
        edge: "ask",
        request: {
          format: "text",
          head: "dig @registry.internal -p 8600 inventory.service.internal A",
        },
        response: {
          format: "text",
          head: ";; ANSWER SECTION:",
          body: `inventory.service.internal. 5 IN A 192.0.2.27
inventory.service.internal. 5 IN A 192.0.2.31`,
        },
        marks: ["ANSWER SECTION", "IN A"],
      },
    },
    {
      id: "server-side",
      kind: "fix",
      nodes: {
        lb: { kind: "lb", at: [4, 4], load: 30 },
        orders: { load: 30 },
      },
      edges: {
        ask: null,
        "to-c": null,
        "to-d": null,
        in: { from: "orders", to: "lb", rate: 4 },
        "lb-c": { from: "lb", to: "inv-c", rate: 2 },
        "lb-d": { from: "lb", to: "inv-d", rate: 2 },
        watch: { from: "registry", to: "lb", flow: "ack", rate: 1 },
      },
      metrics: { drain: 15 },
      focus: ["orders", "lb", "registry"],
      exchange: {
        edge: "in",
        request: stockAt("inventory.internal"),
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Upstream", "192.0.2.31:8080"]],
        },
        marks: ["Host", "X-Upstream"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
