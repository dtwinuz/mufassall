import type { Lang } from "@mufassall/content";
import { AuthorEditor, type AuthorLessonEntry } from "@mufassall/scene-engine/author";
import { player } from "../i18n/ui";
import { lab } from "../i18n/site";

interface Props {
  lang: Lang;
  /** lessons a draft can start from: only slug and title cross the island boundary */
  lessons: { slug: string; title: string }[];
}

/** The whole course is loaded only when the author picks "start from a lesson". */
async function loadLesson(slug: string): Promise<AuthorLessonEntry | undefined> {
  const { lessons } = await import("@mufassall/content");
  const entry = lessons[slug];
  return entry ? { lesson: entry.lesson, text: entry.text } : undefined;
}

export default function Author({ lang, lessons }: Props) {
  return <AuthorEditor ui={player[lang]} lab={lab[lang]} lang={lang} lessons={lessons} loadLesson={loadLesson} />;
}
