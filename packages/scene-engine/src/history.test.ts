import { describe, expect, it } from "vitest";
import type { LessonInput, LessonText } from "@mufassall/scene-schema";
import { lessons } from "../../../content/index";
import { branchOf } from "./branch";
import { type HistoryText, addedEntries, formatOffset, historyOf, responseTone, STEP_GAP_MS } from "./history";
import { HISTORY_UI } from "./ui";

const STATES = { ok: "ok", slow: "slow", down: "down" } as const;
const FLOWS = { request: "request", ack: "ack", fail: "fail", retry: "retry", dup: "dup" } as const;

function textOf(entry: { text: Record<string, LessonText<LessonInput>> }, lang = "en"): HistoryText {
  const t = entry.text[lang]!;
  return {
    nodes: t.nodes as Record<string, string>,
    states: STATES,
    flows: FLOWS,
    strings: HISTORY_UI[lang as "en"],
    scenarios: t.scenarios as HistoryText["scenarios"],
  };
}

/** Every body and every header value of every step on a path: none of it may reach the log. */
function secretsOf(lesson: LessonInput, steps: LessonInput["steps"]): string[] {
  const out: string[] = [];
  for (const s of steps) {
    const x = s.exchange;
    if (!x) continue;
    for (const m of [x.request, x.response]) {
      if (!m) continue;
      for (const line of (m.body ?? "").split("\n")) if (line.trim().length >= 8) out.push(line.trim());
      for (const [, v] of m.headers ?? []) if (v.length >= 8) out.push(v);
    }
  }
  return out.filter((v) => !steps.some((s) => s.exchange && (s.exchange.request.head.includes(v) || s.exchange.response?.head.includes(v))));
}

const entries = Object.entries(lessons) as [string, { lesson: LessonInput; text: Record<string, LessonText<LessonInput>> }][];

describe("historyOf on every lesson and scenario", () => {
  for (const [slug, entry] of entries) {
    const paths = [null, ...(entry.lesson.scenarios ?? []).map((s) => s.id)];
    for (const sc of paths) {
      it(`${slug}${sc ? ` / ${sc}` : ""}`, () => {
        const branch = branchOf(entry.lesson, sc);
        for (const lang of ["uz", "ru", "en"]) {
          const log = historyOf(entry.lesson, branch, branch.steps.length - 1, textOf(entry, lang));
          for (let i = 1; i < log.length; i++) {
            expect(log[i]!.t).toBeGreaterThanOrEqual(log[i - 1]!.t);
            expect(log[i]!.step).toBeGreaterThanOrEqual(log[i - 1]!.step);
          }
          const all = log.map((e) => `${e.label} ${e.actor} ${e.target ?? ""}`).join("\n");
          expect(all).not.toContain("***");
          expect(all).not.toMatch(/\{\w+\}/);
          for (const secret of secretsOf(entry.lesson, branch.steps)) expect(all).not.toContain(secret);
          for (const e of log) {
            expect(e.label.length).toBeGreaterThan(0);
            expect(Number.isFinite(e.t)).toBe(true);
          }
        }
      });
    }
  }
});

describe("historyOf details", () => {
  const cb = entries.find(([s]) => s === "callbacks")![1];
  const text = textOf(cb);

  it("puts each response after its request and steps apart by the gap", () => {
    const base = branchOf(cb.lesson, null);
    const log = historyOf(cb.lesson, base, 1, text);
    const req = log.find((e) => e.kind === "request" && e.step === 0)!;
    const res = log.find((e) => e.kind === "response" && e.step === 0)!;
    expect(req.label).toBe("POST /callbacks HTTP/1.1");
    expect(res.label).toBe("HTTP/1.1 200 OK");
    expect(res.t).toBeGreaterThan(req.t);
    // step 0 has p95 3800 ms: the reply waits that long
    expect(res.t - req.t).toBe(3800);
    const next = log.filter((e) => e.step === 1);
    expect(Math.min(...next.map((e) => e.t))).toBe(res.t + STEP_GAP_MS);
    expect(next.find((e) => e.kind === "response")!.tone).toBe("bad");
  });

  it("marks the branch, a cut edge and a lost message in the lost scenario", () => {
    const lost = branchOf(cb.lesson, "lost");
    const log = historyOf(cb.lesson, lost, lost.from + 1, text);
    const at = log.filter((e) => e.step === lost.from + 1);
    expect(at[0]!.kind).toBe("branch");
    expect(at.some((e) => e.kind === "flow" && e.tone === "bad")).toBe(true);
    expect(at.find((e) => e.kind === "lost")!.label).toContain("POST /callbacks HTTP/1.1");
    expect(at.some((e) => e.kind === "response")).toBe(false);
  });

  it("is a prefix of itself: stepping on only appends", () => {
    const b = branchOf(cb.lesson, "slow");
    const short = historyOf(cb.lesson, b, 3, text);
    const long = historyOf(cb.lesson, b, b.steps.length - 1, text);
    expect(long.slice(0, short.length)).toEqual(short);
    expect(addedEntries(long, 3, b.steps.length - 1)).toEqual(long.slice(short.length));
    expect(addedEntries(long, 5, 3)).toEqual([]);
  });

  it("clamps the latency of a 30 s stall into the clock", () => {
    const b = branchOf(cb.lesson, "slow");
    const log = historyOf(cb.lesson, b, b.from + 1, text);
    const req = log.find((e) => e.step === b.from + 1 && e.kind === "request")!;
    const res = log.find((e) => e.step === b.from + 1 && e.kind === "response")!;
    expect(res.t - req.t).toBe(30000);
  });
});

describe("formatOffset and responseTone", () => {
  it("prints minutes, seconds and tenths", () => {
    expect(formatOffset(0)).toBe("+00:00.0");
    expect(formatOffset(3650)).toBe("+00:03.6");
    expect(formatOffset(61_250)).toBe("+01:01.2");
    expect(formatOffset(-5)).toBe("+00:00.0");
  });
  it("reads status lines", () => {
    expect(responseTone("HTTP/1.1 200 OK")).toBe("good");
    expect(responseTone("HTTP/1.1 503 Service Unavailable")).toBe("bad");
    expect(responseTone("ERROR: deadlock detected")).toBe("bad");
    expect(responseTone("INSERT 0 1")).toBe("good");
    expect(responseTone("basic.deliver")).toBe("neutral");
  });
});
