import { describe, expect, it } from "vitest";
// the engine does not depend on the content package; the test reaches it by path, as practice.test.ts does
import { LANGS, lessons, order } from "../../../content/index";
import { checkRule } from "./challenges";
import { sanitize } from "./lab";
import { MIN_RULES, practiceFor } from "./practice";
import { PRACTICE_UI } from "./practice-ui";

/** Every lesson in the registry has a "build it yourself" task, in every language. */
describe("practice for every lesson", () => {
  it.each(order.map((slug) => [slug]))("%s", (slug) => {
    const entry = lessons[slug]!;
    const byLang = LANGS.map((lang) => ({ lang, p: practiceFor(entry.lesson, entry.text[lang].nodes as Record<string, string>) }));
    for (const { lang, p } of byLang) {
      expect(p, `${slug}/${lang}`).not.toBeNull();
      const solution = sanitize(JSON.parse(JSON.stringify(p!.solution)));
      expect(Object.keys(solution.nodes).length).toBe(Object.keys(p!.solution.nodes).length);
      expect(p!.rules.length).toBeGreaterThanOrEqual(MIN_RULES);
      for (const r of p!.rules) expect(checkRule(solution, r), `${slug}/${lang} ${JSON.stringify(r)}`).toBe(true);
      expect(p!.hints.kinds.length).toBeGreaterThan(0);
      expect(p!.hints.links.length).toBeGreaterThan(0);
      expect(p!.hints.paths.length).toBeGreaterThan(0);
      for (const label of Object.values(solution.labels)) expect(label.trim(), `${slug}/${lang} label`).toBeTruthy();
      const ui = PRACTICE_UI[lang];
      for (const key of ["hintKinds", "hintLinks", "hintPaths", "rulePath", "ruleNoEdge"] as const) expect(ui[key].trim()).toBeTruthy();
    }
    // the rubric is the same task whatever the language; only the labels differ
    const [first, ...rest] = byLang;
    for (const { p } of rest) {
      expect(p!.rules).toEqual(first!.p!.rules);
      expect(p!.hints).toEqual(first!.p!.hints);
    }
  });
});
