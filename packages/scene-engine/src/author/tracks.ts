import { type Draft, type DraftCase, type DraftStep, ID_RE, editCaseStep, editStep } from "./model";
import type { Issue } from "./validation";

/** Which story the editor works on: `null` is the base workflow, otherwise a case id. */
export type Track = string | null;

export const posKey = (track: Track, i: number) => `${track ?? ""}#${i}`;

export function stepsIn(d: Draft, track: Track): DraftStep[] {
  return track === null ? d.steps : (d.cases.find((c) => c.id === track)?.steps ?? []);
}

/** A scene edit on one step; with `forward` it carries into the later steps of the same track only. */
export function editIn(d: Draft, track: Track, i: number, fn: (s: DraftStep) => DraftStep, forward: boolean): Draft {
  return track === null ? editStep(d, i, fn, forward) : editCaseStep(d, track, i, fn, forward);
}

/** A change that never carries into other steps (texts, kind, focus, exchange). */
export function patchIn(d: Draft, track: Track, i: number, fn: (s: DraftStep) => DraftStep): Draft {
  if (track === null) return { ...d, steps: d.steps.map((s, j) => (j === i ? fn(s) : s)) };
  return { ...d, cases: d.cases.map((c) => (c.id === track ? { ...c, steps: c.steps.map((s, j) => (j === i ? fn(s) : s)) } : c)) };
}

export const stepIdTaken = (d: Draft, id: string) => d.steps.some((s) => s.id === id) || d.cases.some((c) => c.steps.some((s) => s.id === id));

/**
 * Step ids are unique across the base story and every case (the player keys texts by them).
 * A renamed base step keeps the cases that branch from it.
 */
export function renameStepIn(d: Draft, track: Track, i: number, to: string): Draft {
  const s = stepsIn(d, track)[i];
  if (!s || s.id === to || !ID_RE.test(to) || stepIdTaken(d, to)) return d;
  const next = patchIn(d, track, i, (x) => ({ ...x, id: to }));
  return track === null ? { ...next, cases: next.cases.map((c) => (c.from === s.id ? { ...c, from: to } : c)) } : next;
}

/** The step a track's step starts from: the previous step, or for a case's first step the base step it branches after. */
export function prevStepIn(d: Draft, track: Track, i: number): DraftStep | undefined {
  if (track === null) return i > 0 ? d.steps[i - 1] : undefined;
  const c = d.cases.find((k) => k.id === track);
  if (!c) return undefined;
  return i > 0 ? c.steps[i - 1] : d.steps.find((s) => s.id === c.from);
}

/** Cases grouped under the base step they branch after, in draft order. */
export function casesByFrom(d: Draft): Map<string, DraftCase[]> {
  const out = new Map<string, DraftCase[]>();
  for (const c of d.cases) out.set(c.from, [...(out.get(c.from) ?? []), c]);
  return out;
}

/** The visible step rows in list order: each base step, then the steps of its expanded cases. */
export function visibleRows(d: Draft, expanded: ReadonlySet<string>): { track: Track; i: number }[] {
  const by = casesByFrom(d);
  const out: { track: Track; i: number }[] = [];
  d.steps.forEach((s, i) => {
    out.push({ track: null, i });
    for (const c of by.get(s.id) ?? []) if (expanded.has(c.id)) c.steps.forEach((_, j) => out.push({ track: c.id, i: j }));
  });
  return out;
}

export function issuesOfCase(issues: readonly Issue[], caseId: string): Issue[] {
  return issues.filter((i) => i.case === caseId);
}
