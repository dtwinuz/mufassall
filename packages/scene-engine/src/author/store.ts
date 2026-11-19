import { isBlankDraft } from "./bpmn";
import { AUTHOR_LANGS, AUTHOR_STORE_KEY, type Draft, cloneDraft, sanitizeDraft } from "./model";

/**
 * The person's own systems, kept only in this browser (localStorage). An index lists them,
 * newest first; each draft lives under its own key so one broken entry never takes the rest down.
 */
export const SYSTEMS_KEY = "mufassall:v1:systems";
export const SYSTEM_KEY_PREFIX = "mufassall:v1:system:";
export const SYSTEM_SOURCES = ["blank", "bpmn", "gitlab-ci", "github-actions", "mermaid", "file", "lesson", "link"] as const;
export type SystemSource = (typeof SYSTEM_SOURCES)[number];
export const SYSTEM_ID_RE = /^[a-z0-9-]{1,40}$/;
export const SYSTEM_TITLE_MAX = 200;

export interface SystemMeta {
  id: string;
  title: string;
  updated: number;
  source?: SystemSource;
}

/** The part of `Storage` the store uses; `key`/`length` only to recover from a broken index. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key?(index: number): string | null;
  readonly length?: number;
}

export type StoreError = "quota" | "blocked" | "missing";
export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: StoreError };

export interface StoreOptions {
  storage?: StorageLike | null;
  now?: () => number;
  /** random id suffix; tests pass a fixed sequence */
  random?: () => string;
}

export const systemKey = (id: string) => SYSTEM_KEY_PREFIX + id;
export const isSource = (v: unknown): v is SystemSource => SYSTEM_SOURCES.includes(v as SystemSource);

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    // reading `localStorage` itself throws when site data is blocked
    return null;
  }
}

const storageOf = (o?: StoreOptions) => (o && "storage" in o ? (o.storage ?? null) : defaultStorage());
const nowOf = (o?: StoreOptions) => (o?.now ?? Date.now)();
const randomSuffix = () => Math.random().toString(36).slice(2, 7).padEnd(5, "0");

export function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const { name, code } = e as { name?: unknown; code?: unknown };
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014;
}

function write(s: StorageLike, key: string, value: string): StoreError | null {
  try {
    s.setItem(key, value);
    return null;
  } catch (e) {
    return isQuotaError(e) ? "quota" : "blocked";
  }
}

function read(s: StorageLike, key: string): string | null {
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function remove(s: StorageLike, key: string) {
  try {
    s.removeItem(key);
  } catch {
    /* nothing to undo */
  }
}

/** Title of a draft in the first language that has one. */
export function draftTitle(d: Draft): string {
  for (const l of AUTHOR_LANGS) if (d.title[l].trim()) return d.title[l].trim().slice(0, SYSTEM_TITLE_MAX);
  return "";
}

/** `[a-z0-9-]`, at most 30 characters, never empty. Letters outside a-z (o', sh, Cyrillic) fold or drop. */
export function slugify(title: string): string {
  let out = "";
  let dash = false;
  for (const ch of title.toLowerCase().normalize("NFKD")) {
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
      if (dash && out) out += "-";
      out += ch;
      dash = false;
      if (out.length >= 30) break;
    } else if (ch === " " || ch === "-" || ch === "_" || ch === "." || ch === "/") dash = true;
  }
  let end = out.length;
  while (end > 0 && out[end - 1] === "-") end--;
  return out.slice(0, end) || "system";
}

/** A fresh id: slug of the title plus a short random suffix, checked against the index and the keys. */
export function newSystemId(title: string, taken: ReadonlySet<string>, s: StorageLike | null, random = randomSuffix): string {
  const stem = slugify(title).slice(0, 30);
  for (let i = 0; i < 50; i++) {
    const suffix = random().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || String(i);
    const id = `${stem}-${suffix}`.slice(0, 40);
    if (!taken.has(id) && (!s || read(s, systemKey(id)) === null)) return id;
  }
  // a broken random source: fall back to a counter, still unique
  for (let i = 2; ; i++) {
    const id = `${stem.slice(0, 30)}-${i}`;
    if (!taken.has(id) && (!s || read(s, systemKey(id)) === null)) return id;
  }
}

/** The index from untrusted JSON: bad entries dropped, ids unique, newest first. `null` if unreadable. */
export function parseIndex(raw: string | null): SystemMeta[] | null {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || (data as { v?: unknown }).v !== 1 || !Array.isArray((data as { items?: unknown }).items)) return null;
  const seen = new Set<string>();
  const out: SystemMeta[] = [];
  for (const it of (data as { items: unknown[] }).items) {
    if (!it || typeof it !== "object") continue;
    const { id, title, updated, source } = it as Record<string, unknown>;
    if (typeof id !== "string" || !SYSTEM_ID_RE.test(id) || seen.has(id)) continue;
    if (typeof updated !== "number" || !Number.isFinite(updated)) continue;
    seen.add(id);
    out.push({ id, title: typeof title === "string" ? title.slice(0, SYSTEM_TITLE_MAX) : "", updated, ...(isSource(source) ? { source } : {}) });
  }
  return sortSystems(out);
}

export const sortSystems = (items: SystemMeta[]) => [...items].sort((a, b) => b.updated - a.updated || a.id.localeCompare(b.id));

/** The index is gone or broken: rebuild it from the draft keys that are still there. */
function recover(s: StorageLike): SystemMeta[] {
  const out: SystemMeta[] = [];
  if (typeof s.key !== "function" || typeof s.length !== "number") return out;
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k?.startsWith(SYSTEM_KEY_PREFIX)) continue;
      const id = k.slice(SYSTEM_KEY_PREFIX.length);
      if (!SYSTEM_ID_RE.test(id)) continue;
      const d = loadFrom(s, id);
      if (d) out.push({ id, title: draftTitle(d), updated: 0 });
    }
  } catch {
    /* partial recovery is still better than none */
  }
  return sortSystems(out);
}

function readIndex(s: StorageLike): SystemMeta[] {
  return parseIndex(read(s, SYSTEMS_KEY)) ?? recover(s);
}

function writeIndex(s: StorageLike, items: SystemMeta[]): StoreError | null {
  return write(s, SYSTEMS_KEY, JSON.stringify({ v: 1, items: sortSystems(items) }));
}

function loadFrom(s: StorageLike, id: string): Draft | null {
  const raw = read(s, systemKey(id));
  if (!raw) return null;
  try {
    return sanitizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function listSystems(o?: StoreOptions): SystemMeta[] {
  const s = storageOf(o);
  return s ? readIndex(s) : [];
}

export function getSystem(id: string, o?: StoreOptions): SystemMeta | undefined {
  return listSystems(o).find((m) => m.id === id);
}

export function loadSystem(id: string, o?: StoreOptions): Draft | null {
  const s = storageOf(o);
  if (!s || !SYSTEM_ID_RE.test(id)) return null;
  return loadFrom(s, id);
}

/**
 * Writes the draft, then the index. A system without a title takes the draft's title, so the list
 * names it as soon as the author types one.
 */
export function saveSystem(id: string, draft: Draft, meta: { title?: string; source?: SystemSource } = {}, o?: StoreOptions): StoreResult<SystemMeta> {
  const s = storageOf(o);
  if (!s) return { ok: false, error: "blocked" };
  if (!SYSTEM_ID_RE.test(id)) return { ok: false, error: "missing" };
  const items = readIndex(s);
  const old = items.find((m) => m.id === id);
  const err = write(s, systemKey(id), JSON.stringify(draft));
  if (err) return { ok: false, error: err };
  const title = (meta.title ?? old?.title ?? "").trim().slice(0, SYSTEM_TITLE_MAX) || draftTitle(draft);
  const source = meta.source ?? old?.source;
  const next: SystemMeta = { id, title, updated: Math.max(nowOf(o), (old?.updated ?? 0) + 1), ...(source ? { source } : {}) };
  const ierr = writeIndex(s, [next, ...items.filter((m) => m.id !== id)]);
  if (ierr) {
    if (!old) remove(s, systemKey(id));
    return { ok: false, error: ierr };
  }
  return { ok: true, value: next };
}

export function createSystem(draft: Draft, source?: SystemSource, o?: StoreOptions & { title?: string }): StoreResult<SystemMeta> {
  const s = storageOf(o);
  if (!s) return { ok: false, error: "blocked" };
  const title = (o?.title ?? draftTitle(draft)).trim().slice(0, SYSTEM_TITLE_MAX);
  const taken = new Set(readIndex(s).map((m) => m.id));
  const id = newSystemId(title || draft.slug, taken, s, o?.random);
  return saveSystem(id, draft, { title, ...(source ? { source } : {}) }, o);
}

export function duplicateSystem(id: string, o?: StoreOptions & { suffix?: string }): StoreResult<SystemMeta> {
  const s = storageOf(o);
  if (!s) return { ok: false, error: "blocked" };
  const meta = readIndex(s).find((m) => m.id === id);
  const draft = loadFrom(s, id);
  if (!meta || !draft) return { ok: false, error: "missing" };
  const base = meta.title || draftTitle(draft);
  const title = base ? `${base}${o?.suffix ?? " (2)"}`.slice(0, SYSTEM_TITLE_MAX) : "";
  return createSystem(cloneDraft(draft), meta.source, { ...o, storage: s, title });
}

export function renameSystem(id: string, title: string, o?: StoreOptions): StoreResult<SystemMeta> {
  const s = storageOf(o);
  if (!s) return { ok: false, error: "blocked" };
  const items = readIndex(s);
  const old = items.find((m) => m.id === id);
  if (!old) return { ok: false, error: "missing" };
  const next = { ...old, title: title.trim().slice(0, SYSTEM_TITLE_MAX) };
  const err = writeIndex(s, items.map((m) => (m.id === id ? next : m)));
  return err ? { ok: false, error: err } : { ok: true, value: next };
}

export function deleteSystem(id: string, o?: StoreOptions): StoreResult<null> {
  const s = storageOf(o);
  if (!s) return { ok: false, error: "blocked" };
  const items = readIndex(s);
  // the index first: a leftover draft key is harmless, a listed system without a draft is not
  const err = writeIndex(s, items.filter((m) => m.id !== id));
  if (err) return { ok: false, error: err };
  remove(s, systemKey(id));
  return { ok: true, value: null };
}

/**
 * The single draft of the old author page becomes a system. The old key goes only after the copy
 * is written; an empty starter draft is not worth a system and is just dropped.
 */
export function migrateLegacyDraft(o?: StoreOptions): SystemMeta | null {
  const s = storageOf(o);
  if (!s) return null;
  const raw = read(s, AUTHOR_STORE_KEY);
  if (raw === null) return null;
  let draft: Draft | null = null;
  try {
    draft = sanitizeDraft(JSON.parse(raw));
  } catch {
    draft = null;
  }
  // junk is kept: maybe a newer page wrote it, it is not ours to destroy
  if (!draft) return null;
  if (isBlankDraft(draft)) {
    remove(s, AUTHOR_STORE_KEY);
    return null;
  }
  const r = createSystem(draft, undefined, { ...o, storage: s });
  if (!r.ok) return null;
  remove(s, AUTHOR_STORE_KEY);
  return r.value;
}
