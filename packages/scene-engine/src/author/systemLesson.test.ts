import { describe, expect, it } from "vitest";
import { type LessonInput, type LessonText, resolve } from "@mufassall/scene-schema";
import { lessons } from "../../../../content/index";
import { AUTHOR_LANGS, type AuthorLang, fromLesson, newDraft, sanitizeDraft } from "./model";
import { pickLang, systemLesson } from "./systemLesson";
import { VIEW_UI } from "./view-ui";

const texts = (e: { text: Record<string, LessonText<LessonInput>> }) => e.text as Partial<Record<AuthorLang, LessonText<LessonInput>>>;

describe("every built-in lesson plays the same as a system", () => {
  for (const [slug, entry] of Object.entries(lessons)) {
    it(slug, () => {
      const base = resolve(entry.lesson);
      const { draft } = fromLesson(entry.lesson, texts(entry));
      // the way it comes back from storage
      const stored = sanitizeDraft(JSON.parse(JSON.stringify(draft)));
      expect(stored).not.toBeNull();
      for (const lang of AUTHOR_LANGS) {
        const r = systemLesson(stored!, lang, `my-${slug}`);
        if (!r.ok) throw new Error(r.error);
        expect(r.fallback).toBe(false);
        const states = resolve(r.lesson);
        expect(states.length).toBe(base.length);
        states.forEach((s, i) => expect(Object.keys(s.nodes).sort(), `${lang} step ${i + 1}`).toEqual(Object.keys(base[i]!.nodes).sort()));
        expect(r.lesson.steps.map((s) => s.id)).toEqual(base.map((_, i) => entry.lesson.steps[i]!.id));
        expect(r.lesson.steps.filter((s) => s.exchange).length).toBe(entry.lesson.steps.filter((s) => s.exchange).length);
        expect(r.text.title).toBe(entry.text[lang]!.title);
      }
    });
  }
});

describe("systemLesson", () => {
  it("falls back to the first language with text and says so", () => {
    const d = newDraft();
    d.title.ru = "Система";
    d.steps[0]!.text.ru.title = "Шаг";
    expect(pickLang(d, "uz")).toEqual({ lang: "ru", fallback: true });
    const r = systemLesson(d, "uz", "my-x");
    expect(r.ok && r.lang).toBe("ru");
    expect(r.ok && r.text.title).toBe("Система");
  });

  it("fills empty names with another language, then the id", () => {
    const d = newDraft();
    d.labels.uz = {};
    const r = systemLesson(d, "uz", "my-x");
    if (!r.ok) throw new Error(r.error);
    const nodes = r.text.nodes as Record<string, string>;
    expect(nodes.client).toBe("Клиент"); // from ru, the next language with a name
    const steps = r.text.steps as Record<string, { title: string; short: string }>;
    expect(steps.start!.title).toBe("start");
    expect(steps.start!.short).toBe("start");
    expect(r.text.title).toBe("my-lesson");
  });

  it("keeps the page language when nothing has text", () => {
    expect(pickLang(newDraft(), "en")).toEqual({ lang: "en", fallback: false });
  });
});

describe("VIEW_UI", () => {
  const flat = (o: unknown, p = ""): [string, string][] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k)) : [[p, String(o)]];
  it("has the same non-empty keys in every language, no Cyrillic in uz/en", () => {
    const keys = flat(VIEW_UI.en).map(([k]) => k);
    for (const l of AUTHOR_LANGS) {
      const f = flat(VIEW_UI[l]);
      expect(f.map(([k]) => k)).toEqual(keys);
      for (const [k, v] of f) {
        expect(v.trim(), `${l}.${k}`).not.toBe("");
        if (l !== "ru") expect(/[Ѐ-ӿ]/.test(v), `${l}.${k}`).toBe(false);
      }
    }
  });
});
