import type { Lang } from "@mufassall/content";
import { LessonPlayer } from "@mufassall/scene-engine";
import type { LessonInput, LessonText } from "@mufassall/scene-schema";
import { player } from "../i18n/ui";

interface Props {
  lesson: LessonInput;
  text: LessonText<LessonInput>;
  lang: Lang;
  crumbs: string;
  next?: { title: string; href: string };
}

/**
 * Island wrapper. The lesson and its text arrive as serialised props, so each page ships only
 * its own lesson instead of the whole course.
 */
export default function Lesson({ lesson, text, lang, crumbs, next }: Props) {
  return (
    <LessonPlayer
      lesson={lesson}
      text={text}
      ui={player[lang]}
      lang={lang}
      crumbs={crumbs}
      next={next}
      labHref={`/${lang}/lab/`}
    />
  );
}
