import { PUBLIC_MASK, annotate, maskedRaw, resolve } from "@mufassall/scene-schema";
import { loadSpots } from "@mufassall/scene-schema/layout";
import { validateLesson } from "@mufassall/scene-schema/validate";
import { describe, expect, it } from "vitest";
import { LANGS, glossary, lessons } from "./index";
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

describe("prediction checks", () => {
  it.each(Object.entries(lessons))("%s: checks agree across languages", (_slug, { lesson, text }) => {
    type T = { check?: { q: string; options: string[]; answer: number; why: string } };
    for (const s of lesson.steps) {
      const per = LANGS.map((l) => (text[l].steps as Record<string, T>)[s.id]?.check);
      const base = per[0];
      expect(per.every((c) => !!c === !!base), `${s.id}: check missing in a language`).toBe(true);
      if (!base) continue;
      expect(s.kind, `${s.id}: no check on the recap`).not.toBe("recap");
      for (const c of per) {
        expect(c!.options.length, `${s.id}: 2-4 options`).toBeGreaterThanOrEqual(2);
        expect(c!.options.length).toBeLessThanOrEqual(4);
        expect(c!.options.length, `${s.id}: same option count`).toBe(base.options.length);
        expect(c!.answer, `${s.id}: same answer in every language`).toBe(base.answer);
        expect(c!.answer >= 0 && c!.answer < c!.options.length).toBe(true);
        expect(c!.q && c!.why && c!.options.every(Boolean), `${s.id}: empty text`).toBeTruthy();
      }
    }
  });
});

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

describe("scene layout", () => {
  it.each(Object.entries(lessons))("%s: every load bar has a spot clear of names and blocks", (_slug, { lesson, text }) => {
    const bad: string[] = [];
    for (const [i, s] of resolve(lesson).entries()) {
      const names = (id: string) => LANGS.map((l) => (text[l].nodes as Record<string, string>)[id] ?? id);
      for (const id of loadSpots(Object.values(s.nodes), names).blocked) bad.push(`${lesson.steps[i]!.id}: ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it.each(Object.entries(lessons))("%s: no edge crosses another node's name", (_slug, { lesson, text }) => {
    const scr = ([x, y]: readonly [number, number]) => [(x - y) * 32, (x + y) * 16] as const;
    const widest = (id: string) =>
      Math.max(...LANGS.map((l) => ((text[l].nodes as Record<string, string>)[id] ?? id).length));
    const bad: string[] = [];
    for (const [i, s] of resolve(lesson).entries()) {
      for (const e of Object.values(s.edges)) {
        const a = s.nodes[e.from];
        const b = s.nodes[e.to];
        if (!a || !b) continue;
        const [ax, ay] = scr(a.at);
        const [bx, by] = scr(b.at);
        for (const n of Object.values(s.nodes)) {
          if (n.id === e.from || n.id === e.to) continue;
          const [nx, ny] = scr(n.at);
          const half = widest(n.id) * 3.7 + 2;
          for (let k = 0; k <= 50; k++) {
            const t = k * 0.02;
            const px = ax + (bx - ax) * t;
            const py = ay + (by - ay) * t;
            if (px > nx - half && px < nx + half && py > ny + 24 && py < ny + 38) {
              bad.push(`${lesson.steps[i]!.id}: ${e.id} over ${n.id}`);
              break;
            }
          }
        }
      }
    }
    const crossings = [...new Set(bad)];
    expect(crossings, crossings.join(" | ")).toEqual([]);
  });
});
