import { LANGS, type Lang, glossary, lessons, order, sectionOf } from "@mufassall/content";
import type { StepText } from "@mufassall/scene-schema";
import type { APIRoute } from "astro";
import { site } from "../../i18n/site";

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

/** Markdown-ish lesson text to plain words for matching. */
const plain = (s: string) => s.replace(/[*_`[\]()]/g, "").replace(/\s+/g, " ").trim();

/**
 * Search index for one language, fetched only when the reader opens search.
 * Rows: [title, href, context, kind, text]; kind 0 = lesson, 1 = step, 2 = glossary term.
 */
export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const s = site[lang];
  const rows: [string, string, string, 0 | 1 | 2, string][] = [];
  for (const slug of order) {
    const entry = lessons[slug]!;
    const text = entry.text[lang];
    const section = sectionOf(slug);
    const where = section ? (s.sections[section.id]?.title ?? "") : "";
    const href = `/${lang}/l/${slug}/`;
    rows.push([text.title, href, where, 0, plain(`${text.summary} ${text.learn.join(" ")}`)]);
    const steps = text.steps as Record<string, StepText>;
    entry.lesson.steps.forEach((step, i) => {
      const t = steps[step.id];
      if (!t) return;
      rows.push([plain(t.title), `${href}?step=${i + 1}`, text.title, 1, plain(`${t.short} ${t.body}`).slice(0, 160)]);
    });
  }
  for (const g of glossary) {
    if (!lessons[g.lesson]) continue;
    rows.push([g.term[lang], `/${lang}/glossary/#${g.id}`, s.glossary.title, 2, g.short[lang]]);
  }
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json; charset=utf-8" } });
};
