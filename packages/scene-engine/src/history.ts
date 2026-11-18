// "Event history": the story so far as an auditable trace, like a run timeline in a workflow engine.
// Derived only from each step's `exchange` and `diff()` of consecutive states; no lesson data of its own.
import { type EdgeState, type Flow, type LessonInput, type NodeStatus, type SceneState, diff, emptyState } from "@mufassall/scene-schema";
import type { Branch } from "./branch";
import { plainText } from "./textexport";
import { fill } from "./ui";

export type HistoryKind = "request" | "response" | "state" | "flow" | "lost" | "branch";
export type HistoryTone = "neutral" | "good" | "warn" | "bad";

export interface HistoryEntry {
  /** index of the step in the branch's step list */
  step: number;
  /** synthetic clock in ms since the story started */
  t: number;
  kind: HistoryKind;
  /** display name of the node that acted */
  actor: string;
  /** display name of the other end, when there is one */
  target?: string;
  label: string;
  tone: HistoryTone;
}

export interface HistoryStrings {
  title: string;
  /** shown before the first event */
  empty: string;
  /** step chip on an entry: "Step {n}" */
  step: string;
  /** visually hidden marker on entries of the current step */
  now: string;
  /** button label for screen readers: "Go to step {n}: {label}" */
  jump: string;
  /** live announcement when stepping forward: "New in the history: {list}" */
  added: string;
  kinds: Record<HistoryKind, string>;
  /** "Scenario: {name}" */
  branch: string;
  /** "{node} is {state}" */
  state: string;
  /** "{from} → {to}: {flow}" */
  flow: string;
  /** "{from} → {to}: messages arrive again" */
  restored: string;
  /** "{head}: never arrived" */
  lost: string;
}

export interface HistoryText {
  nodes: Readonly<Record<string, string>>;
  states: Readonly<Record<NodeStatus, string>>;
  flows: Readonly<Record<Flow, string>>;
  strings: HistoryStrings;
  /** scenario labels for the "branch taken" entry */
  scenarios?: Readonly<Record<string, { label: string } | undefined>>;
}

/** Quiet time between two steps of the story. */
export const STEP_GAP_MS = 1200;
/** How long a reply takes when the step names no latency. */
export const DEFAULT_LATENCY_MS = 180;
/** A latency metric above this is a stall, not a round trip; the clock stops following it. */
const MAX_LATENCY_MS = 120_000;
/** Longest start line kept, the same limit as the Mermaid sequence export. */
const MAX_HEAD = 90;

const STATE_TONE: Record<NodeStatus, HistoryTone> = { ok: "good", slow: "warn", down: "bad" };
const FLOW_TONE: Record<Flow, HistoryTone> = { request: "neutral", ack: "neutral", fail: "bad", retry: "warn", dup: "warn" };

/** HTTP 2xx/3xx is good, 4xx/5xx and database errors are bad, anything else says nothing. */
export function responseTone(head: string): HistoryTone {
  const http = /^HTTP\/[\d.]+\s+(\d{3})/.exec(head);
  if (http) return Number(http[1]) < 400 ? "good" : "bad";
  if (/^(ERROR|FATAL|NACK|REJECT)/i.test(head)) return "bad";
  if (/^(ACK|OK|INSERT|UPDATE|DELETE|COMMIT)\b/i.test(head)) return "good";
  return "neutral";
}

/** Only the start line travels into the log, never headers or bodies (where masked values live). */
function head(s: string): string {
  // a masked value inside a start line (`GET sess:***`) shows as the same dots the wire pane draws
  return plainText(s.replace(/\*{3,}/g, "••••••"), MAX_HEAD);
}

/** The step's round trip: a latency metric (unit "ms") set in this step, else the default. */
function latencyOf(lesson: LessonInput, metrics: Readonly<Record<string, number>> | undefined): number {
  let ms = DEFAULT_LATENCY_MS;
  for (const [id, v] of Object.entries(metrics ?? {})) {
    if (lesson.metrics.find((m) => m.id === id)?.unit !== "ms") continue;
    if (Number.isFinite(v) && v > 0) ms = Math.max(ms, Math.min(v, MAX_LATENCY_MS));
  }
  return Math.round(ms);
}

/** State and flow events of one step; new nodes and edges count when they arrive already unusual. */
function sceneEvents(prev: SceneState, next: SceneState, step: number, t: number, text: HistoryText): HistoryEntry[] {
  const s = text.strings;
  const n = (id: string) => text.nodes[id] ?? id;
  const out: HistoryEntry[] = [];
  const state = (id: string, to: NodeStatus) =>
    out.push({ step, t, kind: "state", actor: n(id), label: fill(s.state, { node: n(id), state: text.states[to] }), tone: STATE_TONE[to] });
  const flow = (e: EdgeState, f: Flow) =>
    out.push({
      step,
      t,
      kind: "flow",
      actor: n(e.from),
      target: n(e.to),
      label: fill(s.flow, { from: n(e.from), to: n(e.to), flow: text.flows[f] }),
      tone: FLOW_TONE[f],
    });
  const lost = (e: EdgeState) =>
    out.push({
      step,
      t,
      kind: "flow",
      actor: n(e.from),
      target: n(e.to),
      label: fill(s.flow, { from: n(e.from), to: n(e.to), flow: s.kinds.lost }),
      tone: "bad",
    });

  for (const c of diff(prev, next)) {
    switch (c.type) {
      case "node": {
        const node = next.nodes[c.id];
        if (c.op === "+" && node && node.state !== "ok") state(c.id, node.state);
        break;
      }
      case "node-state":
        state(c.id, c.to);
        break;
      case "edge": {
        const e = next.edges[c.id];
        if (c.op !== "+" || !e) break;
        if (e.cut) lost(e);
        else if (e.flow !== "request") flow(e, e.flow);
        break;
      }
      case "edge-flow": {
        const e = next.edges[c.id]!;
        // back to plain requests after a retry storm is good news
        out.push({
          step,
          t,
          kind: "flow",
          actor: n(e.from),
          target: n(e.to),
          label: fill(s.flow, { from: n(e.from), to: n(e.to), flow: text.flows[c.now] }),
          tone: c.now === "request" && (c.was === "retry" || c.was === "dup" || c.was === "fail") ? "good" : FLOW_TONE[c.now],
        });
        break;
      }
      case "edge-cut": {
        const e = next.edges[c.id]!;
        if (c.op === "-") lost(e);
        else out.push({ step, t, kind: "flow", actor: n(e.from), target: n(e.to), label: fill(s.restored, { from: n(e.from), to: n(e.to) }), tone: "good" });
        break;
      }
      default:
        // node removals, edge modes and metrics are scenery, not events
        break;
    }
  }
  return out;
}

/**
 * Everything that happened on `branch` up to and including step `upTo`, oldest first.
 * The clock is synthetic but deterministic: each step starts STEP_GAP_MS after the previous one
 * ended, and a reply lands one round trip (the step's latency metric, or DEFAULT_LATENCY_MS)
 * after its request.
 */
export function historyOf(lesson: LessonInput, branch: Branch, upTo: number, text: HistoryText): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  const last = Math.min(upTo, branch.steps.length - 1);
  const n = (id: string) => text.nodes[id] ?? id;
  let clock = 0;

  for (let i = 0; i <= last; i++) {
    const step = branch.steps[i]!;
    const next = branch.states[i]!;
    const prev = i > 0 ? branch.states[i - 1]! : emptyState();
    const start = i === 0 ? 0 : clock + STEP_GAP_MS;
    let end = start;

    if (branch.sc !== null && i === branch.from + 1) {
      const name = text.scenarios?.[branch.sc]?.label ?? branch.sc;
      out.push({ step: i, t: start, kind: "branch", actor: name, label: fill(text.strings.branch, { name }), tone: "neutral" });
    }

    out.push(...sceneEvents(prev, next, i, start, text));

    const x = step.exchange;
    const e = x ? next.edges[x.edge] : undefined;
    if (x && e) {
      const sent = start + 100;
      const rtt = latencyOf(lesson, step.metrics);
      const req = head(x.request.head);
      out.push({ step: i, t: sent, kind: "request", actor: n(e.from), target: n(e.to), label: req, tone: "neutral" });
      end = sent;
      // on a cut edge a written reply (an error, a rollback) still says what happened; without one the message is gone
      if (x.response) {
        end = sent + rtt;
        const res = head(x.response.head);
        const tone = responseTone(x.response.head);
        out.push({ step: i, t: end, kind: "response", actor: n(e.to), target: n(e.from), label: res, tone: e.cut && tone !== "bad" ? "warn" : tone });
      } else if (e.cut) {
        end = sent + rtt;
        out.push({ step: i, t: end, kind: "lost", actor: n(e.from), target: n(e.to), label: fill(text.strings.lost, { head: req }), tone: "bad" });
      }
    }
    clock = end;
  }
  return out;
}

/** Relative time as the log prints it: `+00:03.6` (minutes:seconds.tenths). */
export function formatOffset(ms: number): string {
  const tenths = Math.max(0, Math.floor(ms / 100));
  const min = Math.floor(tenths / 600);
  const sec = Math.floor((tenths % 600) / 10);
  return `+${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${tenths % 10}`;
}

/** Entries added by moving from step `from` to step `to` on the same path; none when moving back or jumping away. */
export function addedEntries(entries: readonly HistoryEntry[], from: number, to: number): HistoryEntry[] {
  if (to <= from) return [];
  return entries.filter((e) => e.step > from && e.step <= to);
}
