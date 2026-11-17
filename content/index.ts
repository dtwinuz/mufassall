import { registry } from "./registry";
import { type Section, sections as allSections } from "./sections";

export { LANGS, type Lang, type LessonEntry } from "./types";
export type { Section } from "./sections";

/** Public lessons only. Internal lessons are served by the API and never bundled here. */
export const lessons = registry;

/** Sections with only the lessons that are written; empty sections are hidden. */
export const sections: Section[] = allSections
  .map((s) => ({ ...s, lessons: s.lessons.filter((l) => l in registry) }))
  .filter((s) => s.lessons.length > 0);

/** Reading order across the whole course. */
export const order: string[] = sections.flatMap((s) => s.lessons);

export function sectionOf(slug: string): Section | undefined {
  return sections.find((s) => s.lessons.includes(slug));
}

/** @deprecated kept for the home page until it moves to `sections` */
export const tracks = sections;
