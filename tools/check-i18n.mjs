// Every UI string exists in every language, is not empty, and uz/en carry no Cyrillic.
// Lesson texts are checked by content/lessons.test.ts (typed against the scene).
import { player } from "../apps/web/src/i18n/ui.ts";
import { lab, site } from "../apps/web/src/i18n/site.ts";

const LANGS = ["uz", "ru", "en"];
const problems = [];

function walk(value, path, out) {
  if (Array.isArray(value)) value.forEach((v) => walk(v, `${path}[]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
  else out.set(path, (out.get(path) ?? []).concat(String(value)));
  return out;
}

for (const [name, table] of Object.entries({ site, player, lab })) {
  const maps = Object.fromEntries(LANGS.map((l) => [l, walk(table[l], "", new Map())]));
  const keys = new Set(LANGS.flatMap((l) => [...maps[l].keys()]));
  for (const key of keys) {
    for (const l of LANGS) {
      const vals = maps[l].get(key);
      // units are optional per language (an unchanged unit needs no entry)
      if (!vals) {
        if (!key.startsWith("units.")) problems.push(`${name}.${l}: missing ${key}`);
      } else if (vals.some((v) => v.trim() === "")) problems.push(`${name}.${l}: empty ${key}`);
      else if (l !== "ru" && key !== "langName" && vals.some((v) => /[Ѐ-ӿ]/.test(v)))
        problems.push(`${name}.${l}: Cyrillic in ${key}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`i18n ok: ${LANGS.join(", ")}`);
