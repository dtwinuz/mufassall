// After `astro build`: write sitemap.xml and the production Caddyfile.
// The CSP stays strict (no 'unsafe-inline' for scripts): every inline <script> Astro emits
// (island hydration) is allowed by its sha256 hash, recomputed on every build.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = process.argv[2] ?? "apps/web/dist";
const SITE = "https://mufassall.dtwin.uz";
const TEMPLATE = "deploy/Caddyfile.template";
const OUT = "deploy/Caddyfile";

function* html(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* html(full);
    else if (name.endsWith(".html")) yield full;
  }
}

const hashes = new Set();
const pages = [];
for (const file of html(DIST)) {
  const text = readFileSync(file, "utf8");
  // application/ld+json is data, never executed, so it needs no hash (one per page would bloat the CSP header)
  for (const m of text.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype=["']?application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = m[1] ?? "";
    if (body.trim()) hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  const rel = relative(DIST, file).split(sep).join("/");
  if (rel === "404.html" || rel === "index.html") continue;
  if (/<meta name="robots" content="noindex"/.test(text)) continue;
  pages.push(`${SITE}/${rel.replace(/index\.html$/, "")}`);
}

pages.sort();
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);

const template = readFileSync(TEMPLATE, "utf8");
if (!template.includes("__SCRIPT_HASHES__")) throw new Error(`${TEMPLATE}: placeholder __SCRIPT_HASHES__ missing`);
writeFileSync(OUT, template.replace("__SCRIPT_HASHES__", [...hashes].sort().join(" ")));
console.log(`postbuild ok: ${pages.length} pages in sitemap, ${hashes.size} inline script hashes`);
