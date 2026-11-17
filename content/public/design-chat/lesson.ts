import { defineLesson } from "@mufassall/scene-schema";

/**
 * A chat service built step by step: from polling to WebSocket gateways, routing through a
 * session registry, storage partitioned by conversation, per-conversation sequence numbers,
 * receipts, push for offline users, groups and presence. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "design-chat",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "deliver-p99", unit: "ms", better: "down" },
    { id: "misordered", unit: "/day", better: "down" },
    { id: "missed", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "polling",
      kind: "problem",
      nodes: {
        alice: { kind: "client", at: [0, 3] },
        bob: { kind: "client", at: [0, 9] },
        chat: { kind: "service", at: [6, 6], load: 90 },
        msgs: { kind: "db", at: [10, 6], load: 60 },
      },
      edges: {
        "send-a": { from: "alice", to: "chat", rate: 1 },
        "poll-b": { from: "bob", to: "chat", rate: 10 },
        save: { from: "chat", to: "msgs", rate: 8 },
      },
      metrics: { "deliver-p99": 2100, misordered: 0, missed: 0 },
      focus: ["bob", "chat"],
      exchange: {
        edge: "poll-b",
        request: {
          format: "http",
          head: "GET /v1/messages?since=1795400100 HTTP/1.1",
          headers: [
            ["Host", "chat.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "messages": []
}`,
        },
        marks: ["since", "messages"],
        masked: ["Authorization"],
      },
    },
    {
      id: "websocket",
      kind: "fix",
      nodes: {
        "gw-a": { kind: "service", at: [3, 3], load: 30 },
        "gw-b": { kind: "service", at: [3, 9], load: 30 },
        sessions: { kind: "cache", at: [6, 1], load: 20 },
        chat: { load: 30 },
        msgs: { load: 20 },
      },
      edges: {
        "send-a": null,
        "poll-b": null,
        "ws-a": { from: "alice", to: "gw-a", rate: 2 },
        "ws-b": { from: "bob", to: "gw-b", rate: 1 },
        "up-a": { from: "gw-a", to: "chat", rate: 2 },
        "reg-b": { from: "gw-b", to: "sessions", rate: 1 },
        save: { rate: 2 },
      },
      metrics: { "deliver-p99": 120 },
      focus: ["gw-a", "gw-b", "sessions"],
      exchange: {
        edge: "ws-b",
        request: {
          format: "http",
          head: "GET /ws HTTP/1.1",
          headers: [
            ["Host", "chat.example.com"],
            ["Upgrade", "websocket"],
            ["Connection", "Upgrade"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 101 Switching Protocols",
          headers: [
            ["Upgrade", "websocket"],
            ["Connection", "Upgrade"],
          ],
        },
        marks: ["Upgrade", "Authorization", "101"],
        masked: ["Authorization"],
      },
    },
    {
      id: "route",
      kind: "case",
      edges: {
        lookup: { from: "chat", to: "sessions", rate: 2 },
        "down-b": { from: "chat", to: "gw-b", rate: 2 },
        "push-b": { from: "gw-b", to: "bob", rate: 2 },
      },
      focus: ["chat", "sessions", "gw-b"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "SMEMBERS conn:u_bob" },
        response: {
          format: "text",
          head: '1) "gw-b/c_8812"',
          body: '2) "gw-d/c_0451"',
        },
        marks: ["SMEMBERS", "gw-b", "gw-d"],
      },
    },
    {
      id: "storage",
      kind: "case",
      nodes: { msgs: { load: 40 } },
      edges: { save: { rate: 4 } },
      focus: ["chat", "msgs"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "INSERT INTO messages",
          body: `  (conv_id, sent_at, msg_id, sender, body)
VALUES ('c_a1b2', '12:00:01.204', 'm_7f3e',
        'u_alice', 'dinner tonight?');`,
        },
        response: { format: "text", head: "INSERT 0 1  -- shard 12 of 64" },
        marks: ["conv_id", "sent_at", "shard"],
      },
    },
    {
      id: "order",
      kind: "problem",
      nodes: { chat: { load: 55 } },
      edges: { "up-a": { rate: 6 }, "down-b": { rate: 6 }, "push-b": { rate: 6 } },
      metrics: { misordered: 140 },
      focus: ["chat", "bob"],
      exchange: {
        edge: "push-b",
        request: {
          format: "text",
          head: "u_bob history, sorted by sent_at:",
          body: 'm_7f40  12:00:01.180  "at 7pm?"\nm_7f3e  12:00:01.204  "dinner tonight?"',
        },
        marks: ["sent_at", "m_7f40"],
      },
    },
    {
      id: "seq",
      kind: "fix",
      nodes: { chat: { load: 35 } },
      edges: { "up-a": { rate: 2 }, "down-b": { rate: 2 }, "push-b": { rate: 2 } },
      metrics: { misordered: 0 },
      focus: ["chat", "msgs"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "UPDATE conversations SET last_seq = last_seq + 1",
          body: "WHERE conv_id = 'c_a1b2'\nRETURNING last_seq;",
        },
        response: { format: "text", head: "last_seq = 1043" },
        marks: ["last_seq", "RETURNING"],
      },
    },
    {
      id: "receipts",
      kind: "case",
      edges: {
        "down-a": { from: "chat", to: "gw-a", flow: "ack", rate: 2 },
        "tick-a": { from: "gw-a", to: "alice", flow: "ack", rate: 2 },
      },
      focus: ["bob", "chat", "alice"],
      exchange: {
        edge: "ws-b",
        request: {
          format: "json",
          head: "WS frame (client -> server)",
          body: `{
  "type": "read",
  "conv_id": "c_a1b2",
  "up_to_seq": 1043
}`,
        },
        marks: ["type", "up_to_seq"],
      },
    },
    {
      id: "offline",
      kind: "problem",
      nodes: { bob: { state: "down" } },
      edges: { "ws-b": null, "push-b": null, "down-b": { rate: 0 } },
      metrics: { missed: 900 },
      focus: ["bob", "sessions"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "SMEMBERS conn:u_bob" },
        response: { format: "text", head: "(empty array)" },
        marks: ["empty array"],
      },
    },
    {
      id: "push",
      kind: "fix",
      nodes: {
        notify: { kind: "worker", at: [10, 10], load: 25 },
        push: { kind: "external", at: [5, 12] },
        bob: { state: "ok" },
      },
      edges: {
        offline: { from: "chat", to: "notify", rate: 2 },
        send: { from: "notify", to: "push", rate: 2 },
        wake: { from: "push", to: "bob", rate: 2 },
        "ws-b": { from: "bob", to: "gw-b", rate: 1 },
        "push-b": { from: "gw-b", to: "bob", rate: 2 },
        "down-b": { rate: 2 },
      },
      metrics: { missed: 15 },
      focus: ["notify", "push", "bob"],
      exchange: {
        edge: "send",
        request: {
          format: "json",
          head: "POST /v1/send HTTP/1.1",
          headers: [
            ["Host", "push.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "device_token": "***",
  "title": "Alice",
  "body": "dinner tonight?",
  "collapse_key": "c_a1b2",
  "badge": 3
}`,
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["device_token", "collapse_key", "badge"],
        masked: ["Authorization", "device_token"],
      },
    },
    {
      id: "group",
      kind: "case",
      nodes: { chat: { load: 65 }, sessions: { load: 45 } },
      edges: { lookup: { rate: 8 }, "down-b": { rate: 6 }, offline: { rate: 6 } },
      metrics: { "deliver-p99": 180 },
      focus: ["chat", "sessions", "notify"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "SINTER members:g_team online" },
        response: {
          format: "text",
          head: '1) "u_bob"',
          body: '2) "u_dina"\n...\n41) "u_zafar"',
        },
        marks: ["SINTER", "members", "online", "41"],
      },
    },
    {
      id: "presence",
      kind: "case",
      nodes: { sessions: { load: 60 } },
      edges: { "reg-b": { rate: 6 } },
      focus: ["gw-b", "sessions"],
      exchange: {
        edge: "reg-b",
        request: { format: "text", head: "SET presence:u_bob online EX 60" },
        response: { format: "text", head: "OK" },
        marks: ["presence", "EX"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
