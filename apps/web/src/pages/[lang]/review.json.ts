import { LANGS, type Lang, lessons, order } from "@mufassall/content";
import type { StepText } from "@mufassall/scene-schema";
import type { APIRoute } from "astro";

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

/**
 * Review cards for one language, fetched by /review.js on the review page.
 * Rows: [id "<lesson>/<step>", lesson title, step href, question, options, answer, why].
 * The id matches what the lesson player stores under mufassall:v1:checks.
 */
export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const rows: [string, string, string, string, string[], number, string][] = [];
  for (const slug of order) {
    const entry = lessons[slug]!;
    const text = entry.text[lang];
    const steps = text.steps as Record<string, StepText>;
    entry.lesson.steps.forEach((step, i) => {
      const c = steps[step.id]?.check;
      if (!c) return;
      rows.push([`${slug}/${step.id}`, text.title, `/${lang}/l/${slug}/?step=${i + 1}`, c.q, c.options, c.answer, c.why]);
    });
  }
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json; charset=utf-8" } });
};
