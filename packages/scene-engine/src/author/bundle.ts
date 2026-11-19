import { type Draft, sanitizeDraft } from "./model";
import { SYSTEM_TITLE_MAX, type SystemSource, isSource } from "./store";

/** `*.mufassall.json`: systems moved between browsers by a file the person saves themselves. */
export const BUNDLE_FORMAT = "mufassall.systems";
export const BUNDLE_MAX_CHARS = 5 * 1024 * 1024;
export const BUNDLE_MAX_SYSTEMS = 50;
/** a share link longer than this is refused: "use a file instead" */
export const SHARE_MAX_CHARS = 6000;
/** what a hash may hold before we even try to decode it */
const SHARE_DECODE_MAX_CHARS = 100_000;
/** what a link may inflate to; reading stops as soon as the output passes it (a zip bomb stays small) */
export const SHARE_INFLATE_MAX_BYTES = 200_000;

export interface BundleSystem {
  title: string;
  source?: SystemSource;
  draft: Draft;
}

export interface Bundle {
  format: typeof BUNDLE_FORMAT;
  v: 1;
  exported: string;
  systems: BundleSystem[];
}

export type BundleError = "tooLarge" | "notJson" | "wrongFormat" | "empty";
export type ParsedBundle =
  | { ok: true; systems: BundleSystem[]; /** entries that were not a usable draft */ dropped: number; /** entries past the 50 cap */ skipped: number }
  | { ok: false; error: BundleError };

export function makeBundle(systems: readonly BundleSystem[], now: Date = new Date()): Bundle {
  return {
    format: BUNDLE_FORMAT,
    v: 1,
    exported: now.toISOString(),
    systems: systems.map((s) => ({ title: s.title, ...(s.source ? { source: s.source } : {}), draft: s.draft })),
  };
}

export const bundleFileName = (now: Date = new Date()) => `systems-${now.toISOString().slice(0, 10)}.mufassall.json`;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Reads a bundle file. A bare draft (the old author page's `.author.json`) is accepted as one
 * system. Every draft goes through `sanitizeDraft`; what is not a draft is counted, not kept.
 */
export function parseBundle(text: string): ParsedBundle {
  if (text.length > BUNDLE_MAX_CHARS) return { ok: false, error: "tooLarge" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "notJson" };
  }
  if (!isObj(data)) return { ok: false, error: "wrongFormat" };
  if (data.format === undefined && (data.v === 1 || data.v === 2) && Array.isArray(data.steps)) {
    const draft = sanitizeDraft(data);
    return draft ? { ok: true, systems: [{ title: "", source: "file", draft }], dropped: 0, skipped: 0 } : { ok: false, error: "wrongFormat" };
  }
  if (data.format !== BUNDLE_FORMAT || data.v !== 1 || !Array.isArray(data.systems)) return { ok: false, error: "wrongFormat" };
  const all = data.systems as unknown[];
  const systems: BundleSystem[] = [];
  let dropped = 0;
  for (const it of all.slice(0, BUNDLE_MAX_SYSTEMS)) {
    const draft = isObj(it) ? sanitizeDraft(it.draft) : null;
    if (!draft || !isObj(it)) {
      dropped++;
      continue;
    }
    const title = typeof it.title === "string" ? it.title.trim().slice(0, SYSTEM_TITLE_MAX) : "";
    systems.push({ title, ...(isSource(it.source) ? { source: it.source } : {}), draft });
  }
  const skipped = Math.max(0, all.length - BUNDLE_MAX_SYSTEMS);
  if (!systems.length) return dropped || skipped ? { ok: true, systems, dropped, skipped } : { ok: false, error: "empty" };
  return { ok: true, systems, dropped, skipped };
}

/* ---------- share link: base64url(deflate-raw(JSON draft)) ---------- */

/** The share button exists only where the browser can compress. */
export function canShare(): boolean {
  return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array | null {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const ok = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 95;
    if (!ok) return null;
  }
  if (s.length % 4 === 1) return null;
  try {
    const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, max: number): Promise<Uint8Array | null> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    // a tiny hash must not inflate into a huge string (zip bomb)
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

export type ShareEncoded = { ok: true; code: string } | { ok: false; error: "unsupported" | "tooLong" };

export async function encodeShare(draft: Draft): Promise<ShareEncoded> {
  if (!canShare()) return { ok: false, error: "unsupported" };
  const raw = new TextEncoder().encode(JSON.stringify(draft));
  const packed = await pipe(raw, new CompressionStream("deflate-raw"), Infinity);
  if (!packed) return { ok: false, error: "unsupported" };
  const code = toBase64Url(packed);
  return code.length > SHARE_MAX_CHARS ? { ok: false, error: "tooLong" } : { ok: true, code };
}

export type ShareDecoded = { ok: true; draft: Draft } | { ok: false; reason: "broken" | "tooBig" | "unsupported" };

/** The draft in a `#s=` hash, or why there is none. Never throws. */
export async function decodeShare(code: string): Promise<ShareDecoded> {
  if (typeof DecompressionStream !== "function" || typeof Blob !== "function") return { ok: false, reason: "unsupported" };
  if (code.length > SHARE_DECODE_MAX_CHARS) return { ok: false, reason: "tooBig" };
  const bytes = fromBase64Url(code);
  if (!bytes || !bytes.length) return { ok: false, reason: "broken" };
  try {
    const raw = await pipe(bytes, new DecompressionStream("deflate-raw"), SHARE_INFLATE_MAX_BYTES);
    if (!raw) return { ok: false, reason: "tooBig" };
    const draft = sanitizeDraft(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)));
    return draft ? { ok: true, draft } : { ok: false, reason: "broken" };
  } catch {
    return { ok: false, reason: "broken" };
  }
}

/** `#s=...` → the code, or `""`. */
export function shareCodeFromHash(hash: string): string {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const part of h.split("&")) if (part.startsWith("s=")) return part.slice(2);
  return "";
}

export const shareUrl = (origin: string, lang: string, code: string) => `${origin}/${lang}/my/view/#s=${code}`;
