import { LANGS, type Lang, lessons, order } from "@mufassall/content";
import { practiceFor } from "@mufassall/scene-engine";
import type { APIRoute } from "astro";

/** Only lessons whose final scene can be rebuilt get a practice file (and a "build it yourself" link). */
export function getStaticPaths() {
  return LANGS.flatMap((lang) =>
    order
      .filter((slug) => practiceFor(lessons[slug]!.lesson) !== null)
      .map((slug) => ({ params: { lang, slug } })),
  );
}

/**
 * One lesson's practice task, fetched by the Lab at /<lang>/lab/?practice=<slug>,
 * so the Lab bundle never carries the lessons themselves.
 */
export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const slug = params.slug!;
  const entry = lessons[slug]!;
  const text = entry.text[lang];
  const p = practiceFor(entry.lesson, text.nodes as Record<string, string>)!;
  const body = { slug, title: text.title, rules: p.rules, hints: p.hints, solution: p.solution };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8" } });
};
