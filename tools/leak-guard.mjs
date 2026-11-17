// The public build must never carry internal data. Fails CI on any hit.
// Patterns are generic on purpose: this file is public, so it names no real internal host.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.argv[2] ?? "apps/web/dist";
const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".xml", ".txt", ".svg", ".map", ".webmanifest"]);

const RULES = [
  ["secret reference", /\{\{\s*secret:/i],
  ["private IPv4", /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/],
  ["IPv4 with port", /\b\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}\b/],
  ["connection string", /\b(?:Data Source|Initial Catalog|User ID|Password)\s*=/i],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["token-like", /\b(?:ghp|gho|ghs|glpat|xox[bp])[-_][A-Za-z0-9_-]{16,}/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9._-]{24,}/],
  ["internal tier marker", /"tier"\s*:\s*"(?:internal|restricted)"|tier:"(?:internal|restricted)"/],
];

// Extra patterns from the private repo (hostnames, table names) via env, never committed here.
for (const p of (process.env.LEAK_GUARD_EXTRA ?? "").split("\n").map((s) => s.trim()).filter(Boolean))
  RULES.push(["private pattern", new RegExp(p, "i")]);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (TEXT.has(extname(name))) yield full;
  }
}

const hits = [];
let scanned = 0;
for (const file of files(root)) {
  scanned++;
  const text = readFileSync(file, "utf8");
  for (const [label, re] of RULES) {
    const m = re.exec(text);
    if (m) hits.push(`${file}: ${label} near "${text.slice(Math.max(0, m.index - 20), m.index + 40).replace(/\s+/g, " ")}"`);
  }
}

if (scanned === 0) {
  console.error(`leak-guard: nothing to scan in ${root} (build first)`);
  process.exit(1);
}
if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(`leak-guard ok: ${scanned} files, ${RULES.length} rules`);
