import { type Lang, lessons } from "@mufassall/content";
import { LessonPlayer } from "@mufassall/scene-engine";
import { player } from "../i18n/ui";

interface Props {
  slug: string;
  lang: Lang;
  crumbs: string;
}

/** Island wrapper: props stay serialisable (slug + lang), the lesson is imported here. */
export default function Lesson({ slug, lang, crumbs }: Props) {
  const entry = lessons[slug];
  if (!entry) return null;
  return <LessonPlayer lesson={entry.lesson} text={entry.text[lang]} ui={player[lang]} lang={lang} crumbs={crumbs} />;
}
