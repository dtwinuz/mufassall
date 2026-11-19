import {
  type LessonInput,
  type LessonText,
  PUBLIC_MASK,
  type SceneState,
  type StepInput,
  type StepText,
  annotate,
  maskedRaw,
  resolve,
  resolveScenario,
} from "@mufassall/scene-schema";
import { loadSpots } from "@mufassall/scene-schema/layout";
import { validateLesson } from "@mufassall/scene-schema/validate";
import { describe, expect, it } from "vitest";
import { LANGS, type Lang, type LessonEntry } from "./types";

type Texts = Record<Lang, LessonText<LessonInput>>;
type ScenarioTexts = Record<string, { label?: string; steps?: Record<string, StepText> } | undefined>;

/** Every step a reader can reach: the base story, then each scenario's own steps. */
function everyStep(lesson: LessonInput): { step: StepInput; sc: string | null }[] {
  return [
    ...lesson.steps.map((step) => ({ step, sc: null })),
    ...(lesson.scenarios ?? []).flatMap((s) => s.steps.map((step) => ({ step, sc: s.id }))),
  ];
}

function stepText(text: Texts, lang: Lang, sc: string | null, id: string): StepText | undefined {
  const t = text[lang];
  if (sc === null) return (t.steps as Record<string, StepText>)[id];
  return ((t.scenarios ?? {}) as ScenarioTexts)[sc]?.steps?.[id];
}

/** Every state a reader can see, each with the id of its step. */
function everyState(lesson: LessonInput): { id: string; state: SceneState }[] {
  const base = resolve(lesson).map((state, i) => ({ id: lesson.steps[i]!.id, state }));
  const extra = (lesson.scenarios ?? []).flatMap((s) => {
    const states = resolveScenario(lesson, s.id);
    return s.steps.map((step, i) => ({ id: `${s.id}/${step.id}`, state: states[states.length - s.steps.length + i]! }));
  });
  return [...base, ...extra];
}

/** Every per-lesson rule of the course, for a set of lessons of one tier (public site or internal). */
export function describeLessons(entries: Record<string, LessonEntry>, tier: "public" | "internal"): void {
  describe.each(Object.entries(entries))("lesson %s", (slug, { lesson, text }) => {
    it("has a valid shape and resolves", () => {
      expect(lesson.slug).toBe(slug);
      expect(lesson.tier).toBe(tier);
      validateLesson(lesson);
      expect(() => resolve(lesson)).not.toThrow();
      for (const s of lesson.scenarios ?? []) expect(() => resolveScenario(lesson, s.id), `scenario ${s.id}`).not.toThrow();
    });

    it.each(LANGS)("is fully written in %s", (lang) => {
      const t = text[lang];
      const nodeIds = new Set(everyStep(lesson).flatMap(({ step }) => Object.keys(step.nodes ?? {})));
      for (const id of nodeIds) expect((t.nodes as Record<string, string>)[id], `node ${id}`).toBeTruthy();
      for (const m of lesson.metrics) expect((t.metrics as Record<string, string>)[m.id], `metric ${m.id}`).toBeTruthy();
      for (const { step, sc } of everyStep(lesson)) {
        const st = stepText(text as Texts, lang, sc, step.id);
        expect(st?.title && st.short && st.body, `step ${sc ? `${sc}/` : ""}${step.id}`).toBeTruthy();
      }
      expect(t.learn.length).toBeGreaterThan(0);
      // scenario texts: a label for each scenario, and nothing written for scenarios or steps that do not exist
      const written = (t.scenarios ?? {}) as ScenarioTexts;
      const scenarios = lesson.scenarios ?? [];
      expect(Object.keys(written).sort(), "scenario texts match the scenarios").toEqual(scenarios.map((s) => s.id).sort());
      for (const s of scenarios) {
        expect(written[s.id]?.label?.trim(), `scenario ${s.id}: label`).toBeTruthy();
        expect(Object.keys(written[s.id]?.steps ?? {}).sort(), `scenario ${s.id}: step texts`).toEqual(s.steps.map((x) => x.id).sort());
      }
    });

    it("writes scenarios like the base story", () => {
      for (const s of lesson.scenarios ?? []) {
        expect(s.steps.length, `${s.id}: 2-4 steps`).toBeGreaterThanOrEqual(2);
        expect(s.steps.length).toBeLessThanOrEqual(4);
        const work = s.steps.filter((x) => x.kind !== "recap");
        const withWire = work.filter((x) => x.exchange).length;
        expect(withWire * 2, `${s.id}: at least half of the steps show the real request`).toBeGreaterThanOrEqual(work.length);
        const last = s.steps.at(-1)!;
        expect(Object.keys(last.metrics ?? {}).length, `${s.id}: the outcome step moves a metric`).toBeGreaterThan(0);
      }
    });

    it("follows the course conventions", () => {
      expect(lesson.steps.at(-1)?.kind, "last step is the recap").toBe("recap");
      expect(lesson.steps.length).toBeGreaterThanOrEqual(7);
      for (const { id, state: s } of everyState(lesson)) {
        const cells = Object.values(s.nodes).map((n) => n.at.join(","));
        expect(new Set(cells).size, `${id}: two nodes on one cell`).toBe(cells.length);
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
      for (const { step: s, sc } of everyStep(lesson)) {
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
            const fields = stepText(text as Texts, lang, sc, s.id)?.fields;
            expect(fields?.[name], `${lang} ${s.id}: note for ${name}`).toBeTruthy();
          }
        }
      }
    });
  });

  describe("prediction checks", () => {
    it.each(Object.entries(entries))("%s: checks agree across languages", (_slug, { lesson, text }) => {
      for (const { step: s, sc } of everyStep(lesson)) {
        const per = LANGS.map((l) => stepText(text as Texts, l, sc, s.id)?.check);
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

  describe("scene layout", () => {
    it.each(Object.entries(entries))("%s: every load bar has a spot clear of names and blocks", (_slug, { lesson, text }) => {
      const bad: string[] = [];
      for (const { id: step, state: s } of everyState(lesson)) {
        const names = (id: string) => LANGS.map((l) => (text[l].nodes as Record<string, string>)[id] ?? id);
        for (const id of loadSpots(Object.values(s.nodes), names).blocked) bad.push(`${step}: ${id}`);
      }
      expect(bad).toEqual([]);
    });

    it.each(Object.entries(entries))("%s: no edge crosses another node's name", (_slug, { lesson, text }) => {
      const scr = ([x, y]: readonly [number, number]) => [(x - y) * 32, (x + y) * 16] as const;
      const widest = (id: string) =>
        Math.max(...LANGS.map((l) => ((text[l].nodes as Record<string, string>)[id] ?? id).length));
      const bad: string[] = [];
      for (const { id: step, state: s } of everyState(lesson)) {
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
                bad.push(`${step}: ${e.id} over ${n.id}`);
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
}
