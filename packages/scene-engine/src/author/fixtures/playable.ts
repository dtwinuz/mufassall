import { expect } from "vitest";
import { IMPORT_MAX_CASE_STEPS, IMPORT_MAX_CASES, IMPORT_MAX_NODES, IMPORT_MAX_STEPS } from "../importkit";
import { AUTHOR_LANGS, type Draft, ID_RE, sanitizeDraft } from "../model";
import { checkDraft, hasCyrillic } from "../validation";

/**
 * Course limits (16 steps, 4 cases, 6 steps per case) are errors for a course lesson, but an
 * imported system may hold the full workflow up to the model caps.
 */
export const COURSE_LIMITS = new Set(["manySteps", "manyCases", "manyCaseSteps"]);

/** The importers' promise: a draft the author checks accept as is, cases included. */
export function assertPlayable(d: Draft) {
  expect(checkDraft(d).filter((i) => i.level === "error" && !COURSE_LIMITS.has(i.code))).toEqual([]);
  const nodes = Object.values(d.steps[0]!.nodes);
  const cells = nodes.map((n) => n.at.join(","));
  expect(new Set(cells).size).toBe(cells.length);
  expect(nodes.length).toBeLessThanOrEqual(IMPORT_MAX_NODES);
  expect(d.steps.length).toBeLessThanOrEqual(IMPORT_MAX_STEPS);
  expect(d.cases.length).toBeLessThanOrEqual(IMPORT_MAX_CASES);
  const base = new Set(d.steps.slice(0, -1).map((s) => s.id));
  for (const c of d.cases) {
    expect(c.id).toMatch(ID_RE);
    expect(base.has(c.from), `${c.id} from ${c.from}`).toBe(true);
    expect(c.steps.length).toBeGreaterThan(0);
    expect(c.steps.length).toBeLessThanOrEqual(IMPORT_MAX_CASE_STEPS);
    for (const l of AUTHOR_LANGS) expect(c.label[l].trim(), `${c.id} ${l}`).toBeTruthy();
  }
  expect(new Set(d.cases.map((c) => c.id)).size).toBe(d.cases.length);
  const stepIds = [...d.steps, ...d.cases.flatMap((c) => c.steps)].map((s) => s.id);
  expect(new Set(stepIds).size).toBe(stepIds.length);
  for (const id of [...stepIds, ...nodes.map((n) => n.id), ...Object.keys(d.steps[0]!.edges)]) expect(id).toMatch(ID_RE);
  for (const l of ["uz", "en"] as const) {
    const texts = [d.labels[l], d.title[l], d.summary[l], d.steps.map((s) => s.text[l]), d.cases.map((c) => [c.label[l], c.steps.map((s) => s.text[l])])];
    expect(hasCyrillic(JSON.stringify(texts))).toBe(false);
  }
  expect(sanitizeDraft(JSON.parse(JSON.stringify(d)))).toEqual(d);
}
