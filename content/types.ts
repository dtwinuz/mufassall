import type { LessonInput, LessonText } from "@mufassall/scene-schema";

export const LANGS = ["uz", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];

export interface LessonEntry<T extends LessonInput = LessonInput> {
  lesson: T;
  text: Record<Lang, LessonText<T>>;
}
