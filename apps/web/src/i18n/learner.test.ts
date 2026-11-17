import { describe, expect, it } from "vitest";
import { diagram } from "./learner";

function flat(value: unknown, path = "", out = new Map<string, string>()) {
  if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flat(v, path ? `${path}.${k}` : k, out);
  else out.set(path, String(value));
  return out;
}

describe("diagram strings", () => {
  const maps = { uz: flat(diagram.uz), ru: flat(diagram.ru), en: flat(diagram.en) };
  const keys = new Set(Object.values(maps).flatMap((m) => [...m.keys()]));

  it("exist and are not empty in every language", () => {
    for (const key of keys) for (const m of Object.values(maps)) expect(m.get(key)?.trim(), key).toBeTruthy();
  });

  it("carry no Cyrillic in uz and en, and Uzbek uses the ASCII apostrophe", () => {
    for (const lang of ["uz", "en"] as const) for (const [k, v] of maps[lang]) expect(v, `${lang}.${k}`).not.toMatch(/[Ѐ-ӿ]/);
    for (const [k, v] of maps.uz) expect(v, k).not.toMatch(/[ʻʼ‘’]/);
  });
});
