import { type Lang, lessons, sections } from "@mufassall/content";
import { type StepText, branchIndex } from "@mufassall/scene-schema";

/** One exam question: a lesson's prediction check plus where it lives. */
export interface TestQuestion {
  /** "<slug>#<stepId>"; step ids are unique within a lesson, scenarios included */
  id: string;
  lesson: string;
  /** 0-based step index in the base story, or in the scenario path when `sc` is set */
  step: number;
  /** scenario id when the check sits in an alternative ending (link needs ?sc=) */
  sc?: string;
  lessonTitle: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
}

/** Every check in the section's lessons, base story first, then each scenario's own steps. */
export function questionsOf(sectionId: string, lang: Lang): TestQuestion[] {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return [];
  const out: TestQuestion[] = [];
  for (const slug of section.lessons) {
    const entry = lessons[slug];
    if (!entry) continue;
    const text = entry.text[lang];
    const push = (stepId: string, t: StepText | undefined, step: number, sc?: string) => {
      const c = t?.check;
      if (!c) return;
      out.push({ id: `${slug}#${stepId}`, lesson: slug, step, ...(sc ? { sc } : {}), lessonTitle: text.title, q: c.q, options: c.options, answer: c.answer, why: c.why });
    };
    const steps = text.steps as Record<string, StepText>;
    entry.lesson.steps.forEach((s, i) => push(s.id, steps[s.id], i));
    const scTexts = (text.scenarios ?? {}) as Record<string, { steps: Record<string, StepText> }>;
    for (const sc of entry.lesson.scenarios ?? []) {
      // a scenario path is the base up to and including `from`, then its own steps
      const at = branchIndex(entry.lesson, sc.id);
      sc.steps.forEach((s, j) => push(s.id, scTexts[sc.id]?.steps[s.id], at + 1 + j, sc.id));
    }
  }
  return out;
}
