import { resolve } from "@mufassall/scene-schema";
import { validateLesson } from "@mufassall/scene-schema/validate";
import { describe, expect, it } from "vitest";
import { LANGS, lessons, tracks } from "./index";

describe.each(Object.entries(lessons))("lesson %s", (slug, { lesson, text }) => {
  it("has a valid shape and resolves", () => {
    expect(lesson.slug).toBe(slug);
    expect(lesson.tier).toBe("public");
    validateLesson(lesson);
    expect(() => resolve(lesson)).not.toThrow();
  });

  it.each(LANGS)("is fully written in %s", (lang) => {
    const t = text[lang];
    const nodeIds = new Set(lesson.steps.flatMap((s) => Object.keys(s.nodes ?? {})));
    for (const id of nodeIds) expect((t.nodes as Record<string, string>)[id], `node ${id}`).toBeTruthy();
    for (const m of lesson.metrics) expect((t.metrics as Record<string, string>)[m.id], `metric ${m.id}`).toBeTruthy();
    for (const s of lesson.steps) {
      const st = (t.steps as Record<string, { title: string; short: string; body: string }>)[s.id];
      expect(st?.title && st.short && st.body, `step ${s.id}`).toBeTruthy();
    }
    expect(t.learn.length).toBeGreaterThan(0);
  });
});

it("every track lesson exists", () => {
  for (const t of tracks) for (const slug of t.lessons) expect(lessons[slug], slug).toBeDefined();
});
