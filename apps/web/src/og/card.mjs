// Share card (Open Graph image), 1200x630 PNG, rendered at build time and fully offline:
// satori lays out the text with bundled Inter (latin, latin-ext, cyrillic) and turns it into
// SVG paths, resvg rasterises that SVG. Used by src/pages/og/*.png.ts.
// Plain JS (types in card.d.mts) so the browser-side tsconfig does not need Node's global types.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const BG = "#0b0f14";
const ACCENT = "#4d86ff";
const FG = "#e8edf4";
const MUTED = "#8a97a8";

// one family name per subset: satori falls back across the font-family list, not inside one name
const SUBSETS = [
  ["latin", "Inter"],
  ["latin-ext", "Inter Ext"],
  ["cyrillic", "Inter Cyrillic"],
];

let fonts;
function loadFonts() {
  if (fonts) return fonts;
  const require = createRequire(import.meta.url);
  const dir = join(dirname(require.resolve("@fontsource/inter/package.json")), "files");
  fonts = [];
  for (const weight of [400, 600, 700])
    for (const [subset, name] of SUBSETS)
      fonts.push({ name, data: readFileSync(join(dir, `inter-${subset}-${weight}-normal.woff`)), weight, style: "normal" });
  return fonts;
}

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// a few isometric blocks joined by links, the course's "system on a stage" motif
function motif() {
  const cube = (x, y, s, lit) => {
    const h = s * 0.58;
    const top = `M${x} ${y - h} L${x + s} ${y} L${x} ${y + h} L${x - s} ${y} Z`;
    const left = `M${x - s} ${y} L${x} ${y + h} L${x} ${y + h + s} L${x - s} ${y + s} Z`;
    const right = `M${x + s} ${y} L${x} ${y + h} L${x} ${y + h + s} L${x + s} ${y + s} Z`;
    return `<path d="${left}" fill="${lit ? "#2b4f9e" : "#18212d"}"/><path d="${right}" fill="${lit ? "#1d3a7a" : "#121a24"}"/><path d="${top}" fill="${lit ? ACCENT : "#243042"}"/>`;
  };
  const link = (x1, y1, x2, y2) =>
    `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${ACCENT}" stroke-opacity="0.55" stroke-width="3" stroke-dasharray="8 8"/>`;
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="460" height="460" viewBox="0 0 460 460">
${link(110, 250, 230, 180)}${link(230, 180, 350, 250)}${link(110, 250, 230, 320)}${link(350, 250, 230, 320)}
${cube(230, 150, 62, true)}${cube(105, 225, 50, false)}${cube(355, 225, 50, false)}${cube(230, 300, 50, false)}
<circle cx="230" cy="180" r="7" fill="#fff"/></svg>`);
}

const LOGO = dataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="44" height="44"><path d="M16 3 27 9.5v13L16 29 5 22.5v-13Z" fill="${FG}"/><path d="M16 16 27 9.5M16 16v13M16 16 5 9.5" stroke="${BG}" stroke-width="1.6" fill="none"/><circle cx="16" cy="16" r="2.6" fill="${ACCENT}"/></svg>`,
);

// satori takes React-like element objects; no JSX needed
const h = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });

/** @param {import("./card.d.mts").CardText} text */
export async function renderCard({ kicker, title, meta }) {
  const size = title.length > 60 ? 54 : title.length > 36 ? 64 : 76;
  const tree = h(
    "div",
    { width: OG_WIDTH, height: OG_HEIGHT, display: "flex", background: BG, fontFamily: "Inter, Inter Ext, Inter Cyrillic", color: FG, position: "relative" },
    [
      h("div", { position: "absolute", left: 0, top: 0, width: OG_WIDTH, height: 8, background: ACCENT }),
      h("img", { position: "absolute", right: 24, top: 150, width: 400, height: 400 }, undefined, { src: motif(), width: 400, height: 400 }),
      h("div", { display: "flex", flexDirection: "column", justifyContent: "space-between", width: 790, height: OG_HEIGHT, boxSizing: "border-box", padding: "64px 40px 56px 72px" }, [
        h("div", { display: "flex", alignItems: "center", gap: 14 }, [
          h("img", { width: 44, height: 44 }, undefined, { src: LOGO, width: 44, height: 44 }),
          h("div", { fontSize: 34, fontWeight: 600, letterSpacing: -1 }, "mufassall"),
        ]),
        h("div", { display: "flex", flexDirection: "column", gap: 20, width: 678 }, [
          h("div", { fontSize: 26, fontWeight: 600, color: ACCENT, letterSpacing: 1, textTransform: "uppercase" }, kicker),
          h("div", { fontSize: size, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, lineClamp: 4, display: "block" }, title),
        ]),
        h("div", { display: "flex", fontSize: 24, color: MUTED, gap: 32 }, [...(meta ? [h("div", {}, meta)] : []), h("div", { color: ACCENT }, "mufassall.dtwin.uz")]),
      ]),
    ],
  );
  const svg = await satori(tree, { width: OG_WIDTH, height: OG_HEIGHT, fonts: loadFonts() });
  // a copy on a plain ArrayBuffer, which is what Response accepts
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng());
}
