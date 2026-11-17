import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A merchant behind a payment gateway that speaks JSON-RPC: check → create → perform → cancel.
 * The method names follow the common public merchant-API shape; no specific provider is named.
 * Numbers are a model scenario, not measurements.
 */
const rpc = (id: number, method: string, params: string): WireMessage => ({
  format: "json",
  head: "POST /merchant/rpc HTTP/1.1",
  headers: [
    ["Content-Type", "application/json"],
    ["Authorization", "***"],
  ],
  // `params` comes before the envelope `id`, so a mark on `id` lands on the gateway's transaction id
  body: `{
  "jsonrpc": "2.0",
  "method": "${method}",
  "params": ${params},
  "id": ${id}
}`,
});

const reply = (id: number, result: string): WireMessage => ({
  format: "json",
  head: "HTTP/1.1 200 OK",
  body: `{
  "jsonrpc": "2.0",
  "result": ${result},
  "id": ${id}
}`,
});

const createParams = `{
    "id": "gw_6f41",
    "time": 1795392843000,
    "amount": 500000,
    "account": { "order_id": "1042" }
  }`;

export default defineLesson({
  slug: "payments",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "double", unit: "/day", better: "down" },
    { id: "unpaid", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "check",
      kind: "case",
      nodes: {
        payer: { kind: "actor", at: [0, 1] },
        gateway: { kind: "external", at: [0, 6] },
        api: { kind: "service", at: [4, 4] },
        orders: { kind: "db", at: [8, 5] },
      },
      edges: {
        pay: { from: "payer", to: "gateway", rate: 2 },
        call: { from: "gateway", to: "api", rate: 2 },
        answer: { from: "api", to: "gateway", flow: "ack", rate: 2 },
        read: { from: "api", to: "orders", rate: 2 },
      },
      metrics: { p95: 120, double: 0, unpaid: 0 },
      focus: ["gateway", "api"],
      exchange: {
        edge: "call",
        request: rpc(
          1,
          "CheckPerformTransaction",
          `{
    "amount": 500000,
    "account": { "order_id": "1042" }
  }`,
        ),
        response: reply(1, `{ "allow": true }`),
        marks: ["Authorization", "amount", "order_id", "allow"],
        masked: ["Authorization"],
      },
    },
    {
      id: "create",
      kind: "case",
      focus: ["api", "orders"],
      exchange: {
        edge: "call",
        request: rpc(2, "CreateTransaction", createParams),
        response: reply(
          2,
          `{
    "transaction": "tx_77",
    "create_time": 1795392843512,
    "state": 1
  }`,
        ),
        marks: ["id", "time", "transaction", "state"],
        masked: ["Authorization"],
      },
    },
    {
      id: "create-twice",
      kind: "problem",
      nodes: { api: { state: "slow" } },
      edges: { call: { flow: "dup" } },
      metrics: { p95: 6200, double: 3 },
      focus: ["gateway", "api"],
      exchange: {
        edge: "call",
        request: rpc(3, "CreateTransaction", createParams),
        response: reply(
          3,
          `{
    "transaction": "tx_78",
    "create_time": 1795392849730,
    "state": 1
  }`,
        ),
        marks: ["id", "transaction"],
        masked: ["Authorization"],
      },
    },
    {
      id: "same-answer",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { call: { flow: "request" } },
      metrics: { p95: 140, double: 0 },
      focus: ["api", "orders"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "SELECT id, state, create_time FROM transactions",
          body: "WHERE gateway_id = 'gw_6f41';",
        },
        response: { format: "text", head: "tx_77 | 1 | 1795392843512" },
        marks: ["gateway_id", "tx_77"],
      },
    },
    {
      id: "perform",
      kind: "case",
      focus: ["api", "orders"],
      exchange: {
        edge: "call",
        request: rpc(4, "PerformTransaction", `{ "id": "gw_6f41" }`),
        response: reply(
          4,
          `{
    "transaction": "tx_77",
    "perform_time": 1795392871004,
    "state": 2
  }`,
        ),
        marks: ["perform_time", "state"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ship-early",
      kind: "problem",
      nodes: { warehouse: { kind: "worker", at: [8, 0] } },
      edges: { ship: { from: "api", to: "warehouse", rate: 2 } },
      metrics: { unpaid: 4 },
      focus: ["api", "warehouse"],
      exchange: {
        edge: "call",
        request: rpc(
          5,
          "CancelTransaction",
          `{
    "id": "gw_9a02",
    "reason": 4
  }`,
        ),
        response: reply(
          5,
          `{
    "transaction": "tx_81",
    "cancel_time": 1795436043000,
    "state": -1
  }`,
        ),
        marks: ["reason", "state"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ship-after",
      kind: "fix",
      edges: { ship: { flow: "request" } },
      metrics: { unpaid: 0 },
      focus: ["api", "warehouse"],
      exchange: {
        edge: "ship",
        request: {
          format: "json",
          head: "POST /shipments HTTP/1.1",
          body: `{
  "order_id": "1042",
  "transaction": "tx_77",
  "paid_state": 2
}`,
        },
        response: { format: "http", head: "HTTP/1.1 201 Created" },
        marks: ["paid_state"],
      },
    },
    {
      id: "refund",
      kind: "case",
      focus: ["gateway", "api", "warehouse"],
      exchange: {
        edge: "call",
        request: rpc(
          6,
          "CancelTransaction",
          `{
    "id": "gw_6f41",
    "reason": 5
  }`,
        ),
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "jsonrpc": "2.0",
  "error": {
    "code": -31007,
    "message": "order already delivered"
  },
  "id": 6
}`,
        },
        marks: ["reason", "code"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
