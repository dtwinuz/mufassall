import { defineLesson } from "@mufassall/scene-schema";

/**
 * Callback reliability. Numbers are a model scenario for the story, not measurements;
 * the player says so under the scene.
 */
export default defineLesson({
  slug: "callbacks",
  level: "intermediate",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "incoming", unit: "/s", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "lost", unit: "%", better: "down" },
    { id: "dupes", unit: "/min", better: "down" },
  ],
  steps: [
    {
      id: "sync",
      kind: "problem",
      nodes: {
        provider: { kind: "external", at: [0, 6] },
        api: { kind: "service", at: [2, 4], state: "slow" },
        store: { kind: "db", at: [7, 5] },
      },
      edges: {
        in: { from: "provider", to: "api", rate: 3 },
        out: { from: "api", to: "provider", flow: "ack", rate: 1 },
        write: { from: "api", to: "store", rate: 3 },
      },
      metrics: { incoming: 40, p95: 3800, lost: 0, dupes: 0 },
      focus: ["api"],
    },
    {
      id: "false-ok",
      kind: "problem",
      edges: { write: { cut: true }, out: { rate: 3 } },
      metrics: { lost: 2 },
      focus: ["api", "store"],
    },
    {
      id: "save-first",
      kind: "fix",
      nodes: { api: { state: "ok" } },
      edges: { write: { cut: false } },
      metrics: { p95: 45, lost: 0 },
      focus: ["api", "store"],
    },
    {
      id: "queue",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [4, 2] },
        worker: { kind: "worker", at: [6, 0] },
      },
      edges: {
        publish: { from: "api", to: "queue", rate: 3 },
        take: { from: "queue", to: "worker", rate: 3 },
        save: { from: "worker", to: "store", rate: 3 },
      },
      metrics: { p95: 30 },
      focus: ["queue", "worker"],
    },
    {
      id: "early-ack",
      kind: "problem",
      nodes: { worker: { state: "down" } },
      edges: { take: { cut: true }, save: { rate: 0 } },
      metrics: { lost: 1.5 },
      focus: ["queue", "worker"],
    },
    {
      id: "ack-after",
      kind: "fix",
      nodes: { worker: { state: "ok" } },
      edges: { take: { cut: false, flow: "retry" }, save: { rate: 3 } },
      metrics: { lost: 0, dupes: 4 },
      focus: ["queue", "worker"],
    },
    {
      id: "duplicates",
      kind: "case",
      edges: { in: { flow: "dup" } },
      focus: ["provider", "worker", "store"],
    },
    {
      id: "idempotency",
      kind: "fix",
      edges: { in: { flow: "request" }, take: { flow: "request" } },
      metrics: { dupes: 0 },
      focus: ["worker", "store"],
    },
    { id: "recap", kind: "recap" },
  ],
});
