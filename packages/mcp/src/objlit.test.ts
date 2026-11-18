import { describe, expect, it } from "vitest";
import { SourceError, parseLessonSource } from "./objlit";
import { checkSchema } from "./schema";

describe("parseLessonSource", () => {
  it("reads strict JSON", () => {
    expect(parseLessonSource('{"a":[1,2,{"b":null}]}')).toEqual({ a: [1, 2, { b: null }] });
  });

  it("reads a lesson.ts-like file", () => {
    const src = `import { defineLesson } from "@mufassall/scene-schema";

/** doc comment { not the literal } */
export default defineLesson({
  slug: "demo", // line comment
  minutes: 1_2,
  'quoted': 'it\\'s',
  at: [0, -4] as const,
  big: 2.5e3,
  body: \`line one
line "two"\`,
  ok: true,
  none: null,
  "__proto__": { x: 1 },
  tail: [1, 2,],
});`;
    const v = parseLessonSource(src) as Record<string, unknown>;
    expect(v).toMatchObject({ slug: "demo", minutes: 12, quoted: "it's", at: [0, -4], big: 2500, body: 'line one\nline "two"', ok: true, none: null, tail: [1, 2] });
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
    expect(Object.hasOwn(v, "__proto__")).toBe(true);
  });

  it("reads an en.ts-like file with a typed const", () => {
    const src = `import type { LessonText } from "x";\nconst text: LessonText<typeof lesson> = { title: "T", learn: ["\\u0041\\u{1F600}"] };\nexport default text;`;
    expect(parseLessonSource(src)).toEqual({ title: "T", learn: ["A\u{1F600}"] });
  });

  it("rejects code with a position", () => {
    const cases = [
      "export default { a: someVar }",
      "export default { ...base }",
      "export default { a: `x ${y}` }",
      "export default { a: 'open",
      "export default { a: 1 b: 2 }",
      "no literal here",
    ];
    for (const c of cases) expect(() => parseLessonSource(c), c).toThrow(SourceError);
  });

  it("stops a hostile nesting depth", () => {
    expect(() => parseLessonSource(`export default {a:${"[".repeat(500)}`)).toThrow(/too deep/);
  });

  it("stays linear on a long hostile input", () => {
    const t = performance.now();
    expect(() => parseLessonSource(`export default { a: "${"\\\\".repeat(200_000)}`)).toThrow();
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe("checkSchema", () => {
  const schema = {
    type: "object" as const,
    properties: { a: { type: "string" as const, enum: ["x", "y"] }, n: { type: "number" as const }, m: { type: ["object" as const, "string" as const] } },
    required: ["a"],
    additionalProperties: false,
  };
  it("accepts a fitting value", () => {
    expect(checkSchema({ a: "x", n: 1.5, m: "s" }, schema)).toEqual([]);
    expect(checkSchema({ a: "y", m: {} }, schema)).toEqual([]);
  });
  it("names each problem with its path", () => {
    expect(checkSchema({ n: "1", z: 0, m: [] }, schema)).toEqual([
      "arguments.a: required",
      "arguments.n: expected number, got string",
      "arguments.z: unknown property",
      "arguments.m: expected object or string, got array",
    ]);
    expect(checkSchema({ a: "q" }, schema)).toEqual(["arguments.a: must be one of x, y"]);
  });
});
