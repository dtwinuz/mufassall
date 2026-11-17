import { LANGS, type Lang, lessons, sectionOf } from "@mufassall/content";
import type { APIRoute } from "astro";
import { site } from "../../../i18n/site";
import { player } from "../../../i18n/ui";
import { renderCard } from "../../../og/card.mjs";

export function getStaticPaths() {
  return LANGS.flatMap((lang) => Object.keys(lessons).map((slug) => ({ params: { lang, slug } })));
}

/** Share card of one lesson: /og/<lang>/<slug>.png, referenced by og:image on the lesson page. */
export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const slug = params.slug!;
  const entry = lessons[slug]!;
  const ui = player[lang];
  const section = sectionOf(slug);
  const png = await renderCard({
    kicker: (section && site[lang].sections[section.id]?.title) || site[lang].tagline,
    title: entry.text[lang].title,
    meta: `${ui.levels[entry.lesson.level]} · ${ui.minutes.replace("{n}", String(entry.lesson.minutes))}`,
  });
  return new Response(png, { headers: { "content-type": "image/png" } });
};
