import { type LessonInput, type SceneState, type StepInput, branchIndex, resolve, resolveScenario, scenarioSteps } from "@mufassall/scene-schema";

/** One path through a lesson: the base story (`sc` null) or a scenario. */
export interface Branch {
  sc: string | null;
  steps: readonly StepInput[];
  states: SceneState[];
  /** index of the base step the scenario forks from; -1 for the base story */
  from: number;
}

export function branchOf(lesson: LessonInput, sc: string | null): Branch {
  if (sc === null || !lesson.scenarios?.some((s) => s.id === sc)) {
    return { sc: null, steps: lesson.steps, states: resolve(lesson), from: -1 };
  }
  return { sc, steps: scenarioSteps(lesson, sc), states: resolveScenario(lesson, sc), from: branchIndex(lesson, sc) };
}

/** Scenarios the reader can switch to at this step, in lesson order. */
export function branchChoices(lesson: LessonInput, cur: Branch, index: number): string[] {
  // inside a scenario the fork point is where the paths meet; on the base it is the current step
  const reach = cur.sc === null ? index : cur.from;
  if (cur.sc !== null && index < cur.from) return [];
  return (lesson.scenarios ?? []).filter((s) => branchIndex(lesson, s.id) <= reach).map((s) => s.id);
}

/**
 * Step index after switching branches: the same distance from the fork point, clamped to the
 * target's length and never before its fork (before the fork every path is the same).
 */
export function switchIndex(lesson: LessonInput, cur: Branch, index: number, target: Branch): number {
  const fork = target.sc !== null ? target.from : cur.from;
  if (fork < 0) return Math.min(index, target.steps.length - 1);
  const rel = index - (cur.sc !== null ? cur.from : fork);
  return Math.max(fork, Math.min(target.steps.length - 1, fork + rel));
}

/** Reads `?step=N&sc=id`: an unknown scenario falls back to the base story, a bad step to 0. */
export function parseBranch(lesson: LessonInput, search: string): { sc: string | null; index: number } {
  const q = new URLSearchParams(search);
  const raw = q.get("sc");
  const sc = raw && lesson.scenarios?.some((s) => s.id === raw) ? raw : null;
  const total = sc ? scenarioSteps(lesson, sc).length : lesson.steps.length;
  const n = Number(q.get("step"));
  return { sc, index: Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0 };
}

/**
 * The base step index to record as progress, or -1. Stored progress counts base steps only:
 * a scenario step is not a step of the lesson's own story.
 */
export function progressIndex(cur: Branch, index: number): number {
  if (cur.sc === null) return index;
  return index <= cur.from ? index : -1;
}
