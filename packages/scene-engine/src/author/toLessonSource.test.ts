import { describe, expect, it } from "vitest";
import {
  type LessonInput,
  type LessonText,
  PUBLIC_MASK,
  STEP_KINDS,
  annotate,
  maskedRaw,
  resolve,
} from "@mufassall/scene-schema";
import { validateLesson } from "@mufassall/scene-schema/validate";
import { lessons } from "../../../../content/index";
import { ALLOWED_UNITS, AUTHOR_LANGS, type Draft, fromLesson, normalize } from "./model";
import { printTs, toLessonSource } from "./toLessonSource";
import { checkDraft } from "./validation";

/** Runs the generated source as JavaScript: drop the imports and the one type annotation. */
function evalModule(src: string): unknown {
  const body = src
    .replace(/^import .*$/gm, "")
    .replace("export default defineLesson(", "return (")
    .replace(/const text: LessonText<typeof lesson> = /, "const text = ")
    .replace("export default text;", "return text;");
  return new Function(body)();
}

function load(draft: Draft) {
  const src = toLessonSource(draft);
  const lesson = evalModule(src["lesson.ts"]) as LessonInput;
  const text = Object.fromEntries(AUTHOR_LANGS.map((l) => [l, evalModule(src[`${l}.ts`])])) as Record<string, LessonText<LessonInput>>;
  return { src, lesson, text };
}

/** The rules of content/lessons.test.ts that apply to a single lesson without scenarios. */
function courseRules(lesson: LessonInput, text: Record<string, LessonText<LessonInput>>) {
  validateLesson(lesson);
  expect(() => resolve(lesson)).not.toThrow();
  expect(lesson.tier).toBe("public");
  expect(lesson.steps.at(-1)?.kind).toBe("recap");
  for (const s of lesson.steps) expect(STEP_KINDS).toContain(s.kind);
  for (const m of lesson.metrics) expect(ALLOWED_UNITS as readonly string[]).toContain(m.unit);
  const work = lesson.steps.filter((s) => s.kind !== "recap");
  expect(work.filter((s) => s.exchange).length * 2).toBeGreaterThanOrEqual(work.length);
  for (const lang of AUTHOR_LANGS) {
    const t = text[lang]!;
    for (const s of lesson.steps) {
      const st = (t.steps as Record<string, { title: string; short: string; body: string; fields?: Record<string, string> }>)[s.id];
      expect(st?.title && st.short && st.body, `${lang} ${s.id}`).toBeTruthy();
      const ex = s.exchange;
      if (!ex) continue;
      const seen = new Set<string>();
      const lines = [ex.request, ...(ex.response ? [ex.response] : [])].flatMap((m) => annotate(m, ex.marks, ex.masked, seen));
      for (const raw of maskedRaw(lines)) expect(raw).toBe(PUBLIC_MASK);
      for (const name of ex.marks ?? []) {
        expect(seen.has(name), `${s.id}: mark ${name}`).toBe(true);
        expect(st?.fields?.[name], `${lang} ${s.id}: note for ${name}`).toBeTruthy();
      }
    }
    expect(t.learn.length).toBeGreaterThan(0);
  }
  for (const lang of ["uz", "en"]) expect(/[Ѐ-ӿ]/.test(JSON.stringify(text[lang]))).toBe(false);
}

describe("printTs", () => {
  it("prints short values inline and quotes only odd keys", () => {
    expect(printTs({ a: 1, "false-ok": [2, 3], s: 'he said "hi"\n' })).toBe('{ a: 1, "false-ok": [2, 3], s: "he said \\"hi\\"\\n" }');
    expect(printTs({ x: null, y: undefined })).toBe("{ x: null }");
  });
  it("breaks long values over lines", () => {
    const out = printTs({ list: Array.from({ length: 30 }, (_, i) => `item-${i}`) });
    expect(out.split("\n").length).toBeGreaterThan(10);
    expect(new Function(`return (${out});`)()).toEqual({ list: Array.from({ length: 30 }, (_, i) => `item-${i}`) });
  });
});

describe("toLessonSource", () => {
  const sample = ["callbacks", "payments"].filter((s) => lessons[s]);

  it.each(sample)("re-exports %s into files that pass the course rules", (slug) => {
    const entry = lessons[slug]!;
    const { draft } = fromLesson(entry.lesson as LessonInput, entry.text as Record<"uz" | "ru" | "en", LessonText<LessonInput>>);
    expect(checkDraft(draft).filter((i) => i.level === "error")).toEqual([]);
    const { lesson, text } = load(draft);
    courseRules(lesson, text);
    expect(resolve(lesson)).toEqual(resolve(entry.lesson as LessonInput));
    expect(text.en!.steps).toEqual(entry.text.en.steps);
    expect(text.uz!.nodes).toEqual(entry.text.uz.nodes);
  });

  it("is pure and starts every file with its imports", () => {
    const entry = lessons.callbacks ?? Object.values(lessons)[0]!;
    const { draft } = fromLesson(entry.lesson as LessonInput, entry.text as Record<"uz" | "ru" | "en", LessonText<LessonInput>>);
    const a = toLessonSource(draft);
    expect(toLessonSource(normalize(draft))).toEqual(a);
    expect(a["lesson.ts"]).toMatch(/^import \{ defineLesson \} from "@mufassall\/scene-schema";/);
    expect(a["ru.ts"]).toMatch(/const text: LessonText<typeof lesson> = \{/);
    expect(a["uz.ts"]).toMatch(/export default text;\n$/);
  });

  it("escapes text that looks like code", () => {
    const entry = Object.values(lessons)[0]!;
    const { draft } = fromLesson(entry.lesson as LessonInput, entry.text as Record<"uz" | "ru" | "en", LessonText<LessonInput>>);
    draft.title.en = "`${alert(1)}` \"); process.exit(1); (\"";
    const { text } = load(draft);
    expect(text.en!.title).toBe(draft.title.en);
  });
});
