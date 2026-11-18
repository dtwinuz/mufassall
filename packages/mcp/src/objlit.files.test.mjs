// JS, not TS: reads files with node:fs, and the repo has no @types/node for tsc.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { lessons } from "../../../content/index";
import { SourceError, parseLessonSource } from "./objlit";

it("reads the course's own lesson files to the same data they export", () => {
  let read = 0;
  for (const [slug, entry] of Object.entries(lessons)) {
    const dir = new URL(`../../../content/public/${slug}/`, import.meta.url);
    const files = [["lesson.ts", entry.lesson], ...Object.entries(entry.text).map(([l, t]) => [`${l}.ts`, t])];
    for (const [file, data] of files) {
      let parsed;
      try {
        parsed = parseLessonSource(readFileSync(new URL(file, dir), "utf8"));
      } catch (e) {
        // a file that builds values with code may be refused, but only with a SourceError
        expect(e, `${slug}/${file}`).toBeInstanceOf(SourceError);
        continue;
      }
      expect(parsed, `${slug}/${file}`).toEqual(JSON.parse(JSON.stringify(data)));
      read++;
    }
  }
  expect(read).toBeGreaterThan(Object.keys(lessons).length * 3);
});
