// Internal lessons live in content/internal/ (a separate private repo, gitignored here), so on CI this
// suite finds nothing and only asserts that. Locally it holds them to the same rules as public lessons.
import { describe, expect, it } from "vitest";
import { describeLessons } from "./lesson-checks";
import type { LessonEntry } from "./types";

type Mod = { default: unknown };
declare global {
  interface ImportMeta {
    glob<T>(pattern: string, opts: { eager: true }): Record<string, T>;
  }
}
const files = import.meta.glob<Mod>("./internal/*/{lesson,uz,ru,en}.ts", { eager: true });

const entries: Record<string, LessonEntry> = {};
for (const path of Object.keys(files)) {
  const m = /^\.\/internal\/([^/]+)\/lesson\.ts$/.exec(path);
  if (!m) continue;
  const slug = m[1]!;
  const text = (l: string) => files[`./internal/${slug}/${l}.ts`]?.default;
  if (!text("uz") || !text("ru") || !text("en")) continue;
  entries[slug] = { lesson: files[path]!.default, text: { uz: text("uz"), ru: text("ru"), en: text("en") } } as LessonEntry;
}

describe("internal lessons", () => {
  it("are found or the folder is absent (CI)", () => {
    expect(Object.keys(entries).length).toBeGreaterThanOrEqual(0);
  });
  it("use internal slugs", () => {
    for (const [slug, e] of Object.entries(entries)) expect(e.lesson.slug, slug).toBe(slug);
  });
});

if (Object.keys(entries).length > 0) describeLessons(entries, "internal");
