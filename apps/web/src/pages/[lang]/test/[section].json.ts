import { LANGS, type Lang, sections } from "@mufassall/content";
import type { APIRoute } from "astro";
import { questionsOf } from "./_bank";

export function getStaticPaths() {
  return LANGS.flatMap((lang) => sections.map((s) => ({ params: { lang, section: s.id } })));
}

/** The question bank of one section, fetched by /test.js on /<lang>/test/<section>/. */
export const GET: APIRoute = ({ params }) => {
  const rows = questionsOf(params.section as string, params.lang as Lang);
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json; charset=utf-8" } });
};
