import { defineLesson } from "@mufassall/scene-schema";

/**
 * Case study built only on Figma's public post by Evan Wallace (2019):
 * https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
 * The post gives almost no numbers; the metrics here count edits in this small model
 * scenario, not Figma measurements. Wire messages are simplified illustrations of the
 * mechanism, not Figma's real protocol.
 */
export default defineLesson({
  slug: "case-figma-multiplayer",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "unacked", unit: "", better: "down" },
    { id: "flicker", unit: "", better: "down" },
    { id: "lost", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "open",
      kind: "case",
      nodes: {
        alice: { kind: "client", at: [1, 1] },
        bob: { kind: "client", at: [1, 9] },
        srv: { kind: "service", at: [7, 5], load: 20 },
      },
      edges: {
        aup: { from: "alice", to: "srv", rate: 2 },
        adown: { from: "srv", to: "alice", flow: "ack", rate: 2 },
        bup: { from: "bob", to: "srv", rate: 2 },
        bdown: { from: "srv", to: "bob", flow: "ack", rate: 2 },
      },
      metrics: { unacked: 0, flicker: 0, lost: 0 },
      focus: ["alice", "srv"],
      exchange: {
        edge: "aup",
        request: {
          format: "text",
          head: "open a file (simplified)",
          body: "1) download a full copy of the document\n2) open a WebSocket to the process that serves this document\n3) from now on only changes travel, in both directions",
        },
        marks: ["full copy", "WebSocket", "only changes"],
      },
    },
    {
      id: "model",
      kind: "case",
      focus: ["alice", "srv"],
      metrics: { unacked: 1 },
      exchange: {
        edge: "aup",
        request: {
          format: "json",
          head: "Alice -> server: change",
          body: `{
  "id": "1:20",
  "fill": "#1E88E5"
}`,
        },
        response: { format: "text", head: "ack: server stored fill of 1:20" },
        marks: ["id", "fill", "ack"],
      },
    },
    {
      id: "no-conflict",
      kind: "case",
      edges: { bup: { rate: 3 }, adown: { rate: 3 } },
      metrics: { unacked: 0 },
      focus: ["bob", "srv", "alice"],
      exchange: {
        edge: "adown",
        request: {
          format: "json",
          head: "server -> Alice: Bob's change",
          body: `{
  "id": "1:20",
  "x": 120
}`,
        },
        marks: ["id", "x"],
      },
    },
    {
      id: "same-property",
      kind: "case",
      edges: { aup: { flow: "dup" }, bup: { flow: "dup" } },
      focus: ["alice", "bob", "srv"],
      exchange: {
        edge: "bdown",
        request: {
          format: "json",
          head: "server -> everyone: the value it received last",
          body: `{
  "id": "1:21",
  "text": "BC"
}`,
        },
        response: { format: "text", head: "Alice sent AB, Bob sent BC; never ABC" },
        marks: ["text", "never"],
      },
    },
    {
      id: "flicker",
      kind: "problem",
      edges: { aup: { flow: "request" }, bup: { flow: "request" }, adown: { flow: "fail" } },
      metrics: { unacked: 1, flicker: 1 },
      focus: ["alice", "srv"],
      exchange: {
        edge: "adown",
        request: {
          format: "text",
          head: "Alice's screen, fill of 1:20",
          body: "t1: Alice sets red (applied at once, still unacknowledged)\nt2: server -> Alice: blue (Bob's older change)\nt3: server -> Alice: ack red",
        },
        response: { format: "text", head: "screen: red -> blue -> red" },
        marks: ["unacknowledged", "older", "screen"],
      },
    },
    {
      id: "drop-echo",
      kind: "fix",
      edges: { adown: { flow: "ack" } },
      metrics: { unacked: 0, flicker: 0 },
      focus: ["alice"],
      exchange: {
        edge: "adown",
        request: {
          format: "text",
          head: "Alice's client: incoming changes",
          body: "fill = blue for 1:20: Alice has an unacknowledged fill there, drop\nx = 120 for 1:20: no local change to x, apply",
        },
        marks: ["drop", "apply"],
      },
    },
    {
      id: "ids",
      kind: "fix",
      edges: { bup: { rate: 4 } },
      focus: ["bob", "srv"],
      exchange: {
        edge: "bup",
        request: {
          format: "json",
          head: "Bob -> server: create",
          body: `{
  "id": "17:42",
  "type": "RECTANGLE",
  "parent": "0:1"
}`,
        },
        marks: ["id", "type", "parent"],
      },
    },
    {
      id: "cycle",
      kind: "problem",
      edges: { bup: { flow: "fail" }, aup: { rate: 3 } },
      metrics: { unacked: 1 },
      focus: ["alice", "bob", "srv"],
      exchange: {
        edge: "bup",
        request: {
          format: "json",
          head: "Bob -> server: move frame B into frame A",
          body: `{
  "id": "5:2",
  "parent": "5:3"
}`,
        },
        response: { format: "text", head: "rejected: Alice already moved 5:3 into 5:2, this would make a cycle" },
        marks: ["parent", "rejected"],
      },
    },
    {
      id: "order",
      kind: "fix",
      edges: { bup: { flow: "request", rate: 2 } },
      metrics: { unacked: 0 },
      focus: ["alice", "srv"],
      exchange: {
        edge: "aup",
        request: {
          format: "json",
          head: "Alice -> server: put 5:9 between two layers",
          body: `{
  "id": "5:9",
  "parent_and_position": {
    "parent": "5:1",
    "position": 0.625
  }
}`,
        },
        marks: ["parent_and_position", "position"],
      },
    },
    {
      id: "offline",
      kind: "problem",
      nodes: { bob: { state: "down" } },
      edges: { bup: { cut: true, rate: 0 }, bdown: { cut: true, rate: 0 } },
      metrics: { unacked: 3 },
      focus: ["bob"],
      exchange: {
        edge: "bup",
        request: {
          format: "text",
          head: "Bob's laptop is offline",
          body: "edits keep working locally: 3 changes not yet sent\nmeanwhile Alice keeps editing the same file",
        },
        marks: ["locally", "Alice"],
      },
    },
    {
      id: "reconnect",
      kind: "fix",
      nodes: { bob: { state: "ok" } },
      edges: { bup: { cut: false, rate: 3 }, bdown: { cut: false, rate: 2 } },
      metrics: { unacked: 0, lost: 0 },
      focus: ["bob", "srv"],
      exchange: {
        edge: "bup",
        request: {
          format: "text",
          head: "Bob is back online",
          body: "1) download a fresh copy of the document\n2) reapply the 3 offline edits on top of it\n3) open a new WebSocket and send them",
        },
        marks: ["fresh copy", "reapply", "new WebSocket"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
