import { AUTHOR_LANGS, type AuthorLang, type Draft, toLessonInput, toLessonText } from "./model";

export type LessonFile = "lesson.ts" | "en.ts" | "uz.ts" | "ru.ts";
export type LessonSource = Record<LessonFile, string>;
export const LESSON_FILES: readonly LessonFile[] = ["lesson.ts", "en.ts", "uz.ts", "ru.ts"];

const IDENT = /^[A-Za-z_$][\w$]*$/;
const WIDTH = 110;

const key = (k: string) => (IDENT.test(k) ? k : JSON.stringify(k));

/**
 * A plain value as a TypeScript literal in the style of the hand-written lessons: short objects
 * and arrays on one line, longer ones broken up, strings as JSON (always valid and escaped).
 */
export function printTs(v: unknown, indent = 0): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === undefined) return "undefined";
  const pad = "  ".repeat(indent + 1);
  const end = "  ".repeat(indent);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const inline = `[${v.map((x) => printTs(x, 0)).join(", ")}]`;
    if (!inline.includes("\n") && inline.length + indent * 2 <= WIDTH) return inline;
    return `[\n${v.map((x) => `${pad}${printTs(x, indent + 1)},`).join("\n")}\n${end}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
  if (!entries.length) return "{}";
  const inline = `{ ${entries.map(([k, x]) => `${key(k)}: ${printTs(x, 0)}`).join(", ")} }`;
  if (!inline.includes("\n") && inline.length + indent * 2 <= WIDTH && entries.every(([, x]) => typeof x !== "string" || x.length < 60)) {
    return inline;
  }
  return `{\n${entries.map(([k, x]) => `${pad}${key(k)}: ${printTs(x, indent + 1)},`).join("\n")}\n${end}}`;
}

function lessonFile(d: Draft): string {
  return [
    'import { defineLesson } from "@mufassall/scene-schema";',
    "",
    "/**",
    " * Written in the author mode. Numbers are a model scenario for the story, not measurements;",
    " * the player says so under the scene.",
    " */",
    `export default defineLesson(${printTs(toLessonInput(d))});`,
    "",
  ].join("\n");
}

function textFile(d: Draft, lang: AuthorLang): string {
  return [
    'import type { LessonText } from "@mufassall/scene-schema";',
    'import type lesson from "./lesson";',
    "",
    `const text: LessonText<typeof lesson> = ${printTs(toLessonText(d, lang))};`,
    "",
    "export default text;",
    "",
  ].join("\n");
}

/** The four files of `content/public/<slug>/`, as source text. Pure: same draft, same text. */
export function toLessonSource(d: Draft): LessonSource {
  const out = { "lesson.ts": lessonFile(d) } as LessonSource;
  for (const lang of AUTHOR_LANGS) out[`${lang}.ts`] = textFile(d, lang);
  return out;
}
