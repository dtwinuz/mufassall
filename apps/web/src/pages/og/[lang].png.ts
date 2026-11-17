import { LANGS, type Lang } from "@mufassall/content";
import type { APIRoute } from "astro";
import { site } from "../../i18n/site";
import { renderCard } from "../../og/card.mjs";

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

/** Default share card of a language: /og/<lang>.png, used by every page that is not a lesson. */
export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const png = await renderCard({ kicker: site[lang].tagline, title: site[lang].home.title });
  return new Response(png, { headers: { "content-type": "image/png" } });
};
