import { defineLesson } from "@mufassall/scene-schema";

/**
 * A team chat that must show new messages "live": polling, long polling, Server-Sent Events,
 * WebSockets, a gateway layer, pub/sub between gateways, and reconnect without gaps.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "realtime",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "requests", unit: "/s", better: "down" },
    { id: "delay", unit: "ms", better: "down" },
    { id: "missed", unit: "/min", better: "down" },
  ],
  steps: [
    {
      id: "polling",
      kind: "problem",
      nodes: {
        alice: { kind: "client", at: [0, 2] },
        bob: { kind: "client", at: [0, 8] },
        api: { kind: "service", at: [5, 5], load: 85 },
        db: { kind: "db", at: [11, 3], load: 70 },
      },
      edges: {
        "poll-a": { from: "alice", to: "api", rate: 8 },
        "poll-b": { from: "bob", to: "api", rate: 8 },
        read: { from: "api", to: "db", rate: 8 },
      },
      metrics: { requests: 50000, delay: 1000, missed: 0 },
      focus: ["api"],
      exchange: {
        edge: "poll-b",
        request: {
          format: "http",
          head: "GET /rooms/r_17/updates?since=m_730 HTTP/1.1",
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
      id: "long-poll",
      kind: "fix",
      nodes: { api: { load: 45 }, db: { load: 25 } },
      edges: { "poll-a": { rate: 1 }, "poll-b": { rate: 1 }, read: { rate: 2 } },
      metrics: { requests: 4000, delay: 120 },
      focus: ["api"],
      exchange: {
        edge: "poll-b",
        request: {
          format: "http",
          head: "GET /rooms/r_17/updates?since=m_730&wait=25 HTTP/1.1",
          headers: [["Host", "chat.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Response-Time", "7140 ms"]],
          body: `{
  "messages": [
    { "id": "m_731", "text": "standup in 5" }
  ],
  "cursor": "m_731"
}`,
        },
        marks: ["wait", "X-Response-Time", "cursor"],
      },
    },
    {
      id: "sse",
      kind: "fix",
      edges: {
        "poll-a": { rate: 0 },
        "poll-b": { rate: 0 },
        "push-a": { from: "api", to: "alice", flow: "ack", rate: 2 },
        "push-b": { from: "api", to: "bob", flow: "ack", rate: 2 },
      },
      metrics: { requests: 400, delay: 60 },
      focus: ["api", "bob"],
      exchange: {
        edge: "push-b",
        request: {
          format: "http",
          head: "GET /rooms/r_17/stream HTTP/1.1",
          headers: [["Accept", "text/event-stream"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Content-Type", "text/event-stream"]],
          body: 'id: m_732\nevent: message\ndata: {"text": "on my way"}',
        },
        marks: ["Accept", "id", "data"],
      },
    },
    {
      id: "websocket",
      kind: "fix",
      edges: { "poll-a": { rate: 2 }, "poll-b": { rate: 2 } },
      metrics: { requests: 300, delay: 40 },
      focus: ["alice", "api", "bob"],
      exchange: {
        edge: "poll-a",
        request: {
          format: "http",
          head: "GET /ws HTTP/1.1",
          headers: [
            ["Host", "chat.example.com"],
            ["Upgrade", "websocket"],
            ["Connection", "Upgrade"],
            ["Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ=="],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 101 Switching Protocols",
          headers: [
            ["Upgrade", "websocket"],
            ["Sec-WebSocket-Accept", "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="],
          ],
        },
        marks: ["Upgrade", "101", "Sec-WebSocket-Accept"],
      },
    },
    {
      id: "too-many",
      kind: "problem",
      nodes: { api: { state: "slow", load: 100 } },
      edges: { "poll-b": { cut: true, flow: "fail" } },
      metrics: { delay: 900, missed: 20 },
      focus: ["api"],
      exchange: {
        edge: "poll-b",
        request: {
          format: "text",
          head: "chat-1: accept() failed: EMFILE (too many open files)",
          body: "open_sockets=65535 limit=65535\nrss=7.8 GB, gc pause 640 ms",
        },
        marks: ["EMFILE", "open_sockets", "gc pause"],
      },
    },
    {
      id: "gateways",
      kind: "fix",
      nodes: {
        api: null,
        lb: { kind: "lb", at: [2, 5], load: 20 },
        gw1: { kind: "service", at: [5, 2], load: 40 },
        gw2: { kind: "service", at: [5, 8], load: 40 },
        chat: { kind: "service", at: [8, 3], load: 30 },
        db: { load: 30 },
      },
      edges: {
        "conn-a": { from: "alice", to: "lb", rate: 2 },
        "conn-b": { from: "bob", to: "lb", rate: 2 },
        "lb-gw1": { from: "lb", to: "gw1", rate: 2 },
        "lb-gw2": { from: "lb", to: "gw2", rate: 2 },
        send: { from: "gw1", to: "chat", rate: 2 },
        write: { from: "chat", to: "db", rate: 2 },
        "push-a": { from: "gw1", to: "alice", flow: "ack", rate: 2 },
      },
      metrics: { delay: 40, missed: 0 },
      focus: ["lb", "gw1", "gw2"],
      exchange: {
        edge: "conn-b",
        request: {
          format: "http",
          head: "GET /ws?room=r_17 HTTP/1.1",
          headers: [
            ["Host", "chat.example.com"],
            ["Upgrade", "websocket"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 101 Switching Protocols",
          headers: [["X-Gateway", "gw2"]],
        },
        marks: ["room", "X-Gateway"],
      },
    },
    {
      id: "wrong-node",
      kind: "problem",
      nodes: { gw1: { load: 45 } },
      edges: { "push-b": { from: "gw2", to: "bob", flow: "fail", cut: true, rate: 1 } },
      metrics: { missed: 450 },
      focus: ["gw1", "gw2", "bob"],
      exchange: {
        edge: "push-a",
        request: {
          format: "text",
          head: "gw1: deliver m_740 to room r_17",
          body: "local members: alice\nbob: not connected here, skipped",
        },
        marks: ["local members", "skipped"],
      },
    },
    {
      id: "bus",
      kind: "fix",
      nodes: { bus: { kind: "cache", at: [8, 7], load: 15 } },
      edges: {
        "push-b": { flow: "ack", cut: false, rate: 2 },
        fanout: { from: "chat", to: "bus", rate: 2 },
        "sub-gw1": { from: "bus", to: "gw1", flow: "ack", rate: 2 },
        "sub-gw2": { from: "bus", to: "gw2", flow: "ack", rate: 2 },
      },
      metrics: { missed: 0, delay: 45 },
      focus: ["chat", "bus"],
      exchange: {
        edge: "fanout",
        request: {
          format: "text",
          head: "PUBLISH room:r_17",
          body: '\'{"id": "m_740", "from": "u_42", "text": "done"}\'',
        },
        response: { format: "text", head: "(integer) 2" },
        marks: ["PUBLISH", "room:r_17", "(integer) 2"],
      },
    },
    {
      id: "dropped",
      kind: "problem",
      nodes: { bob: { state: "down" } },
      edges: { "push-b": { cut: true, flow: "fail" }, "conn-b": { rate: 0 } },
      metrics: { missed: 30 },
      focus: ["bob", "gw2"],
      exchange: {
        edge: "push-b",
        request: {
          format: "text",
          head: "gw2: socket u_77 closed, code 1006",
          body: "while offline: m_741, m_742, m_743 published\nsubscribers for u_77: 0, dropped",
        },
        marks: ["1006", "dropped"],
      },
    },
    {
      id: "resume",
      kind: "fix",
      nodes: { bob: { state: "ok" } },
      edges: {
        "push-b": { cut: false, flow: "ack" },
        "conn-b": { rate: 2, flow: "retry" },
        history: { from: "gw2", to: "chat", rate: 1 },
      },
      metrics: { missed: 0 },
      focus: ["bob", "gw2", "chat"],
      exchange: {
        edge: "conn-b",
        request: {
          format: "json",
          head: "WS frame (after reconnect)",
          body: `{
  "type": "resume",
  "room": "r_17",
  "after": "m_740"
}`,
        },
        response: {
          format: "json",
          head: "WS frame",
          body: `{
  "type": "history",
  "messages": ["m_741", "m_742", "m_743"],
  "live": true
}`,
        },
        marks: ["after", "messages", "live"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
