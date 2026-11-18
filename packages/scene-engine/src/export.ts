// Turn a live scene <svg> into a standalone picture: computed styles are baked into attributes,
// so the file looks the same outside the page (no CSS variables, no stylesheet, no fonts fetched).

const PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "paint-order",
] as const;

/** moving packets and editor-only overlays are not part of the picture */
const SKIP = ".mf-packets, .mf-area, .mf-area__hover, .mf-edge__hit";
/** a video frame keeps the packets in flight */
const SKIP_EDITOR = ".mf-area, .mf-area__hover, .mf-edge__hit";

export function viewBox(svg: SVGSVGElement): [number, number, number, number] {
  const v = (svg.getAttribute("viewBox") ?? "0 0 800 500").split(/\s+/).map(Number);
  return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 800, v[3] ?? 500];
}

/** The first painted background behind the scene (the stage colour of the current theme). */
export function backdrop(svg: Element): string {
  for (let n: Element | null = svg; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c)) return c;
  }
  return "";
}

export function standaloneSvg(svg: SVGSVGElement, opts: { packets?: boolean } = {}): string {
  const skip = opts.packets ? SKIP_EDITOR : SKIP;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [...svg.querySelectorAll<SVGElement>("*")];
  const dst = [...clone.querySelectorAll<SVGElement>("*")];
  src.forEach((el, i) => {
    const out = dst[i]!;
    const cs = getComputedStyle(el);
    if (el.closest(skip) || cs.display === "none" || cs.visibility === "hidden") {
      out.remove();
      return;
    }
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) out.setAttribute(p, v);
    }
    // CSS transforms (node positions) become SVG transforms
    if (el.style.transform && cs.transform && cs.transform !== "none") out.setAttribute("transform", cs.transform);
    for (const a of ["class", "style", "tabindex", "role", "aria-pressed", "aria-label"]) out.removeAttribute(a);
  });
  const [x, y, w, h] = viewBox(svg);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", String(x));
  bg.setAttribute("y", String(y));
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", backdrop(svg) || "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  for (const a of ["class", "role"]) clone.removeAttribute(a);
  return new XMLSerializer().serializeToString(clone);
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadSvg(svg: SVGSVGElement, name: string) {
  downloadBlob(new Blob([standaloneSvg(svg)], { type: "image/svg+xml" }), `${name}.svg`);
}

/** PNG at 2x through a canvas; the SVG is self-contained, so the canvas stays untainted. */
export function downloadPng(svg: SVGSVGElement, name: string): Promise<void> {
  const [, , w, h] = viewBox(svg);
  const url = URL.createObjectURL(new Blob([standaloneSvg(svg)], { type: "image/svg+xml" }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * 2);
      canvas.height = Math.round(h * 2);
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => {
        if (!b) return reject(new Error("no blob"));
        downloadBlob(b, `${name}.png`);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("render failed"));
    };
    img.src = url;
  });
}
