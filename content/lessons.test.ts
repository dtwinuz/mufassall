import { describe, expect, it } from "vitest";
import { describeLessons } from "./lesson-checks";
import { LANGS, glossary, lessons } from "./index";
import { sections as allSections } from "./sections";

describeLessons(lessons, "public");

describe("glossary", () => {
  it("every term is written in every language and points at a real lesson", () => {
    const ids = new Set<string>();
    for (const g of glossary) {
      expect(g.id, "id is kebab-case").toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(ids.has(g.id), `duplicate ${g.id}`).toBe(false);
      ids.add(g.id);
      expect(lessons[g.lesson], `${g.id}: lesson ${g.lesson}`).toBeTruthy();
      for (const l of LANGS) expect(g.term[l]?.trim() && g.short[l]?.trim(), `${g.id} ${l}`).toBeTruthy();
      for (const l of ["uz", "en"] as const) expect(/[Ѐ-ӿ]/.test(g.term[l] + g.short[l]), `${g.id} ${l} Cyrillic`).toBe(false);
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
