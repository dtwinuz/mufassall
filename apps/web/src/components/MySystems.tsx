import type { Lang } from "@mufassall/content";
import { type AuthorLessonEntry, Library } from "@mufassall/scene-engine/author";

interface Props {
  lang: Lang;
  /** lessons a system can start from: only slug and title cross the island boundary */
  lessons: { slug: string; title: string }[];
}

/** The whole course is loaded only when the person picks "from a lesson". */
async function loadLesson(slug: string): Promise<AuthorLessonEntry | undefined> {
  const { lessons } = await import("@mufassall/content");
  const entry = lessons[slug];
  return entry ? { lesson: entry.lesson, text: entry.text } : undefined;
}

export default function MySystems({ lang, lessons }: Props) {
  return <Library lang={lang} lessons={lessons} loadLesson={loadLesson} />;
}
