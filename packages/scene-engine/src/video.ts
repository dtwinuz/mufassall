// "Video" export: the lesson's own scene, step by step, recorded from a canvas into a WebM file.
// Loaded with a dynamic import on click, so the lesson page does not download it up front.
// The pure pieces (timeline, layout, caption wrapping, mime, names) are tested; the
// MediaRecorder glue at the bottom needs a real browser.

import { backdrop, standaloneSvg, viewBox } from "./export";

export const SITE = "mufassall.dtwin.uz";

export interface Segment {
  step: number;
  start: number;
  end: number;
}

/** Every step gets `stepMs`; the last one holds a little longer so the video does not end mid-motion. */
export function stepDurations(steps: number, stepMs = 2500, tailMs = 800): number[] {
  return Array.from({ length: Math.max(0, steps) }, (_, i) => stepMs + (i === steps - 1 ? tailMs : 0));
}

export function timeline(durations: number[]): Segment[] {
  let at = 0;
  return durations.map((d, step) => {
    const start = at;
    at += Math.max(0, d);
    return { step, start, end: at };
  });
}

export function totalMs(plan: Segment[]): number {
  return plan.length ? plan[plan.length - 1]!.end : 0;
}

/** The step shown at `ms` since the start, or -1 once the timeline is over. */
export function stepAt(plan: Segment[], ms: number): number {
  if (ms < 0) return plan.length ? 0 : -1;
  for (const s of plan) if (ms < s.end) return s.step;
  return -1;
}

export function frameCount(plan: Segment[], fps: number): number {
  return Math.ceil((totalMs(plan) / 1000) * fps);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fit a w×h picture inside `box`, centred, aspect kept. */
export function fitRect(w: number, h: number, box: Rect): Rect {
  if (!(w > 0) || !(h > 0)) return { ...box };
  const k = Math.min(box.w / w, box.h / h);
  const fw = w * k;
  const fh = h * k;
  return { x: box.x + (box.w - fw) / 2, y: box.y + (box.h - fh) / 2, w: fw, h: fh };
}

export interface FrameLayout {
  scene: Rect;
  bar: Rect;
  pad: number;
  /** font sizes in px */
  label: number;
  title: number;
  mark: number;
}

/** Caption bar along the bottom, the scene above it; sizes follow the height (readable at 720p). */
export function frameLayout(width: number, height: number): FrameLayout {
  const u = height / 720;
  const barH = Math.round(150 * u);
  const pad = Math.round(36 * u);
  return {
    scene: { x: pad, y: Math.round(20 * u), w: width - pad * 2, h: height - barH - Math.round(20 * u) },
    bar: { x: 0, y: height - barH, w: width, h: barH },
    pad,
    label: Math.round(22 * u),
    title: Math.round(34 * u),
    mark: Math.round(18 * u),
  };
}

const ELLIPSIS = "…";

function words(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === " " || ch === "\n" || ch === "\t") {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** Shorten `s` until `s…` fits. */
function withEllipsis(s: string, maxWidth: number, measure: (s: string) => number): string {
  const chars = Array.from(s);
  while (chars.length && measure(chars.join("").trimEnd() + ELLIPSIS) > maxWidth) chars.pop();
  return chars.join("").trimEnd() + ELLIPSIS;
}

/**
 * Word-wrap `text` into at most `maxLines` lines no wider than `maxWidth`. A word longer than a
 * line is broken by characters; text that does not fit ends with an ellipsis.
 */
export function wrapCaption(text: string, maxWidth: number, measure: (s: string) => number, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = "";
  let overflow = false;
  const push = (l: string) => {
    if (lines.length < maxLines) lines.push(l);
    else overflow = true;
  };
  for (const w of words(text)) {
    const tryLine = line ? `${line} ${w}` : w;
    if (measure(tryLine) <= maxWidth) {
      line = tryLine;
      continue;
    }
    if (line) push(line);
    line = "";
    if (overflow) break;
    // a single word wider than the line
    let rest = w;
    while (measure(rest) > maxWidth) {
      const chars = Array.from(rest);
      let n = Math.max(1, chars.length - 1);
      while (n > 1 && measure(chars.slice(0, n).join("")) > maxWidth) n--;
      push(chars.slice(0, n).join(""));
      rest = chars.slice(n).join("");
      if (overflow) break;
    }
    line = rest;
    if (overflow) break;
  }
  if (line) push(line);
  if (overflow && lines.length) lines[lines.length - 1] = withEllipsis(lines[lines.length - 1]!, maxWidth, measure);
  return lines;
}

export interface VideoFormat {
  mime: string;
  ext: "webm" | "mp4";
}

const CANDIDATES: VideoFormat[] = [
  { mime: "video/webm;codecs=vp9", ext: "webm" },
  { mime: "video/webm;codecs=vp8", ext: "webm" },
  { mime: "video/webm", ext: "webm" },
  // Safari records MP4 only
  { mime: "video/mp4;codecs=avc1", ext: "mp4" },
  { mime: "video/mp4", ext: "mp4" },
];

export function pickFormat(isTypeSupported: (mime: string) => boolean): VideoFormat | null {
  for (const c of CANDIDATES) {
    try {
      if (isTypeSupported(c.mime)) return c;
    } catch {
      /* a throwing probe counts as "no" */
    }
  }
  return null;
}

function safe(part: string): string {
  let out = "";
  for (const ch of part.toLowerCase()) {
    const ok = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "-" || ch === "_";
    out += ok ? ch : "-";
  }
  return out || "x";
}

/** `<slug>-<lang>.webm`; a scenario path goes between them: `<slug>-<sc>-<lang>.webm`. */
export function videoFilename(slug: string, lang: string, ext: string, sc?: string | null): string {
  return `${safe(slug)}${sc ? `-${safe(sc)}` : ""}-${safe(lang)}.${ext}`;
}

export function watermarkText(lang: string, slug: string): string {
  return `${SITE}/${lang}/l/${slug}`;
}

// ---------- browser glue ----------

export interface Caption {
  /** "Step 2 / 7" */
  label: string;
  title: string;
}

export interface RecordOptions {
  steps: number;
  /** show step `i` in the recorded scene (the host re-renders it) */
  show: (i: number) => void;
  /** the scene being recorded */
  svg: () => SVGSVGElement | null;
  caption: (i: number) => Caption;
  watermark: string;
  signal: AbortSignal;
  onStep?: (i: number) => void;
  stepMs?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export interface Recorded {
  blob: Blob;
  ext: VideoFormat["ext"];
}

/** rAF, or a timeout when the tab is in the background and rAF stalls. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(end);
    window.setTimeout(end, 100);
  });
}

async function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([standaloneSvg(svg, { packets: true })], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Records the scene; resolves to null when cancelled through `signal`. */
export async function recordLesson(o: RecordOptions): Promise<Recorded | null> {
  const width = o.width ?? 1280;
  const height = o.height ?? 720;
  const fps = o.fps ?? 30;
  const format = pickFormat((m) => MediaRecorder.isTypeSupported(m));
  if (!format) throw new Error("no video format");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");

  const L = frameLayout(width, height);
  const sans = cssVar("--font-sans", "system-ui, sans-serif");
  const mono = cssVar("--font-mono", "ui-monospace, monospace");
  const fg = cssVar("--fg", "#0b0f14");
  const muted = cssVar("--muted", "#5b6573");
  const signal = cssVar("--signal", "#2f6bff");
  const surface = cssVar("--surface", "#ffffff");
  const line = cssVar("--line", "#e3e7ec");

  const captions = new Map<number, { label: string; lines: string[] }>();
  const captionOf = (i: number) => {
    let c = captions.get(i);
    if (!c) {
      const cap = o.caption(i);
      ctx.font = `600 ${L.title}px ${sans}`;
      c = { label: cap.label, lines: wrapCaption(cap.title, width - L.pad * 2, (s) => ctx.measureText(s).width, 2) };
      captions.set(i, c);
    }
    return c;
  };

  const draw = async (i: number) => {
    const svg = o.svg();
    if (!svg) return;
    const img = await svgImage(svg);
    ctx.fillStyle = backdrop(svg) || surface;
    ctx.fillRect(0, 0, width, height);
    const [, , vw, vh] = viewBox(svg);
    const r = fitRect(vw, vh, L.scene);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);

    ctx.font = `500 ${L.mark}px ${mono}`;
    ctx.fillStyle = muted;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(o.watermark, width - L.pad, L.pad * 0.6);

    const { bar } = L;
    ctx.fillStyle = surface;
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.fillStyle = line;
    ctx.fillRect(bar.x, bar.y, bar.w, Math.max(1, Math.round(height / 720)));
    ctx.fillStyle = signal;
    ctx.fillRect(bar.x, bar.y, Math.round((bar.w * (i + 1)) / o.steps), Math.max(3, Math.round((4 * height) / 720)));

    const c = captionOf(i);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${L.label}px ${mono}`;
    ctx.fillStyle = signal;
    const top = bar.y + L.pad * 0.6;
    ctx.fillText(c.label, L.pad, top + L.label);
    ctx.font = `600 ${L.title}px ${sans}`;
    ctx.fillStyle = fg;
    c.lines.forEach((l, k) => ctx.fillText(l, L.pad, top + L.label + L.title * 1.25 * (k + 1)));
  };

  const plan = timeline(stepDurations(o.steps, o.stepMs));
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

  let started = false;
  try {
    o.show(0);
    o.onStep?.(0);
    await nextFrame();
    await nextFrame();
    await draw(0);
    rec.start(1000);
    started = true;
    const t0 = performance.now();
    let cur = 0;
    while (!o.signal.aborted) {
      const s = stepAt(plan, performance.now() - t0);
      if (s < 0) break;
      if (s !== cur) {
        cur = s;
        o.show(s);
        o.onStep?.(s);
        // let the host commit the new step before the next frame is serialised
        await nextFrame();
      }
      await draw(cur);
      await nextFrame();
    }
  } finally {
    if (started) {
      if (rec.state !== "inactive") rec.stop();
      await stopped;
    }
    for (const t of stream.getTracks()) t.stop();
  }
  if (o.signal.aborted) return null;
  return { blob: new Blob(chunks, { type: format.mime.split(";")[0] }), ext: format.ext };
}
