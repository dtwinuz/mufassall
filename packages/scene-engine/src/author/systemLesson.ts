import { type LessonInput, type LessonText, resolve, resolveScenario } from "@mufassall/scene-schema";
import { AUTHOR_LANGS, type AuthorLang, type Draft, type DraftStep, allSteps, toLessonInput, toLessonText } from "./model";

/* ---------- Draft → playable lesson ---------- */

type StepLike = { short: string; title: string; body: string };

const hasText = (d: Draft, l: AuthorLang) =>
  !!d.title[l].trim() || allSteps(d).some((s) => !!(s.text[l].title.trim() || s.text[l].body.trim() || s.text[l].short.trim()));

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
 * another language's text, then the id. Cases play as the player's scenarios; a case that cannot
 * play (no steps, a branch point that is gone, a broken step) is left out instead of failing the
 * whole system.
 */
export function systemLesson(d0: Draft, want: AuthorLang, slug: string): SystemLesson {
  const { lang, fallback } = pickLang(d0, want);
  try {
    const base: Draft = { ...d0, cases: [] };
    resolve(toLessonInput(base, { dropBadExchange: true }));
    const playable = (d0.cases ?? []).filter((c) => {
      if (!c.steps.length) return false;
      try {
        const one = toLessonInput({ ...d0, cases: [c] }, { dropBadExchange: true });
        if (!one.scenarios?.length) return false;
        resolveScenario(one, c.id);
        return true;
      } catch {
        return false;
      }
    });
    // scenario ids and step ids must not repeat across scenarios either: the first one wins
    const caseIds = new Set<string>();
    const stepIds = new Set(d0.steps.map((s) => s.id));
    const kept = playable.filter((c) => {
      if (caseIds.has(c.id) || c.steps.some((s) => stepIds.has(s.id))) return false;
      caseIds.add(c.id);
      for (const s of c.steps) stepIds.add(s.id);
      return true;
    });
    const d: Draft = { ...d0, cases: kept };
    const lesson: LessonInput = { ...toLessonInput(d, { dropBadExchange: true }), slug };
    for (const sc of lesson.scenarios ?? []) resolveScenario(lesson, sc.id);
    const t = toLessonText(d, lang);
    const fillSteps = (steps: Record<string, StepLike>, list: readonly DraftStep[]) => {
      for (const s of list) {
        const st = steps[s.id]!;
        st.title = firstOf((l) => s.text[l].title, lang, s.id);
        st.short = firstOf((l) => s.text[l].short, lang, st.title.slice(0, 40));
        if (!st.body.trim()) st.body = firstOf((l) => s.text[l].body, lang, "");
      }
    };
    fillSteps(t.steps as Record<string, StepLike>, d.steps);
    const scenarios = (t.scenarios ?? {}) as Record<string, { label: string; steps: Record<string, StepLike> }>;
    for (const c of d.cases) {
      const sc = scenarios[c.id]!;
      sc.label = firstOf((l) => c.label[l], lang, c.id);
      fillSteps(sc.steps, c.steps);
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
