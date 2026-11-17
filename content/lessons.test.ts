import { PUBLIC_MASK, annotate, maskedRaw, resolve } from "@mufassall/scene-schema";
import { validateLesson } from "@mufassall/scene-schema/validate";
import { describe, expect, it } from "vitest";
import { LANGS, lessons } from "./index";
import { sections as allSections } from "./sections";

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

  it("follows the course conventions", () => {
    const states = resolve(lesson);
    expect(lesson.steps.at(-1)?.kind, "last step is the recap").toBe("recap");
    expect(lesson.steps.length).toBeGreaterThanOrEqual(7);
    for (const [i, s] of states.entries()) {
      const cells = Object.values(s.nodes).map((n) => n.at.join(","));
      expect(new Set(cells).size, `${lesson.steps[i]!.id}: two nodes on one cell`).toBe(cells.length);
      for (const n of Object.values(s.nodes)) {
        for (const c of n.at) expect(c >= 0 && c <= 12, `${n.id} at ${n.at} is off the 0..12 grid`).toBe(true);
      }
    }
    const work = lesson.steps.filter((s) => s.kind !== "recap");
    const withWire = work.filter((s) => s.exchange).length;
    expect(withWire * 2, "at least half of the steps show the real request").toBeGreaterThanOrEqual(work.length);
    for (const lang of ["uz", "en"] as const) {
      expect(/[Ѐ-ӿ]/.test(JSON.stringify(text[lang])), `${lang} text contains Cyrillic`).toBe(false);
    }
  });

  it("public wire messages carry no real secret, every mark appears and is explained", () => {
    for (const s of lesson.steps) {
      const ex = s.exchange;
      if (!ex) continue;
      const seen = new Set<string>();
      const lines = [ex.request, ...(ex.response ? [ex.response] : [])].flatMap((m) =>
        annotate(m, ex.marks, ex.masked, seen),
      );
      for (const raw of maskedRaw(lines)) expect(raw, `${s.id}: masked value`).toBe(PUBLIC_MASK);
      for (const name of ex.masked ?? []) {
        expect(lines.some((l) => l.some((g) => g.kind === "mask" && g.name === name)), `${s.id}: ${name} masked`).toBe(true);
      }
      for (const name of ex.marks ?? []) {
        expect(seen.has(name), `${s.id}: mark ${name} not found in the message`).toBe(true);
        for (const lang of LANGS) {
          const fields = (text[lang].steps as Record<string, { fields?: Record<string, string> }>)[s.id]?.fields;
          expect(fields?.[name], `${lang} ${s.id}: note for ${name}`).toBeTruthy();
        }
      }
    }
  });
});

describe("course map", () => {
  it("every lesson in sections.ts is written", () => {
    const missing = allSections.flatMap((s) => s.lessons).filter((slug) => !lessons[slug]);
    expect(missing).toEqual([]);
  });
  it("every written lesson is on the map exactly once", () => {
    const listed = allSections.flatMap((s) => s.lessons);
    for (const slug of Object.keys(lessons)) expect(listed.filter((l) => l === slug), slug).toHaveLength(1);
  });
});
