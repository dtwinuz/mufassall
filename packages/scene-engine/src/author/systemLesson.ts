import { type LessonInput, type LessonText, resolve } from "@mufassall/scene-schema";
import { AUTHOR_LANGS, type AuthorLang, type Draft, toLessonInput, toLessonText } from "./model";

/* ---------- Draft → playable lesson ---------- */

const hasText = (d: Draft, l: AuthorLang) =>
  !!d.title[l].trim() || d.steps.some((s) => !!(s.text[l].title.trim() || s.text[l].body.trim() || s.text[l].short.trim()));

/** The page language when the system has text in it, otherwise the first language that has any. */
export function pickLang(d: Draft, want: AuthorLang): { lang: AuthorLang; fallback: boolean } {
  if (hasText(d, want)) return { lang: want, fallback: false };
  const other = AUTHOR_LANGS.find((l) => hasText(d, l));
  return other ? { lang: other, fallback: true } : { lang: want, fallback: false };
}

/** First non-empty value: the chosen language, then the others, then `last`. */
function firstOf(get: (l: AuthorLang) => string | undefined, lang: AuthorLang, last: string): string {
  for (const l of [lang, ...AUTHOR_LANGS.filter((x) => x !== lang)]) {
    const v = get(l);
    if (v?.trim()) return v;
  }
  return last;
}

export type SystemLesson =
  | { ok: true; lesson: LessonInput; text: LessonText<LessonInput>; lang: AuthorLang; fallback: boolean }
  | { ok: false; error: string };

/**
 * The same conversion the editor preview uses (patches from snapshots, a wire on a missing line
 * dropped), plus text fallbacks so a half-translated system still reads: an empty field takes
 * another language's text, then the id.
 */
export function systemLesson(d: Draft, want: AuthorLang, slug: string): SystemLesson {
  const { lang, fallback } = pickLang(d, want);
  try {
    const lesson: LessonInput = { ...toLessonInput(d, { dropBadExchange: true }), slug };
    resolve(lesson);
    const t = toLessonText(d, lang);
    const steps = t.steps as Record<string, { short: string; title: string; body: string }>;
    for (const s of d.steps) {
      const st = steps[s.id]!;
      st.title = firstOf((l) => s.text[l].title, lang, s.id);
      st.short = firstOf((l) => s.text[l].short, lang, st.title.slice(0, 40));
      if (!st.body.trim()) st.body = firstOf((l) => s.text[l].body, lang, "");
    }
    const nodes = t.nodes as Record<string, string>;
    for (const id of Object.keys(nodes)) nodes[id] = firstOf((l) => d.labels[l][id], lang, id);
    const metrics = t.metrics as Record<string, string>;
    for (const m of d.metrics) metrics[m.id] = firstOf((l) => m.label[l], lang, m.id);
    t.title = firstOf((l) => d.title[l], lang, d.slug);
    t.summary = firstOf((l) => d.summary[l], lang, "");
    return { ok: true, lesson, text: t, lang, fallback };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
