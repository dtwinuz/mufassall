import { describe, expect, it } from "vitest";
import { type LessonInput, type LessonText } from "@mufassall/scene-schema";
import { lessons } from "../../../../content/index";
import { type AuthorLang, type Draft, fromLesson, newDraft, sanitizeDraft } from "./model";
import {
  BUNDLE_FORMAT,
  BUNDLE_MAX_CHARS,
  SHARE_INFLATE_MAX_BYTES,
  SHARE_MAX_CHARS,
  bundleFileName,
  canShare,
  decodeShare,
  encodeShare,
  fromBase64Url,
  makeBundle,
  parseBundle,
  shareCodeFromHash,
  shareUrl,
  toBase64Url,
} from "./bundle";

function titled(t: string): Draft {
  const d = newDraft();
  d.title.uz = t;
  return d;
}

describe("bundle file", () => {
  it("round-trips systems with title and source", () => {
    const b = makeBundle([{ title: "Kassa", source: "bpmn", draft: titled("Kassa") }, { title: "B", draft: newDraft() }], new Date("2026-11-19T10:00:00Z"));
    expect(b.format).toBe(BUNDLE_FORMAT);
    expect(b.exported).toBe("2026-11-19T10:00:00.000Z");
    const p = parseBundle(JSON.stringify(b));
    if (!p.ok) throw new Error(p.error);
    expect(p.systems.map((s) => [s.title, s.source])).toEqual([["Kassa", "bpmn"], ["B", undefined]]);
    expect(p.systems[0]!.draft).toEqual(titled("Kassa"));
    expect(p.dropped).toBe(0);
    expect(bundleFileName(new Date("2026-11-19T10:00:00Z"))).toBe("systems-2026-11-19.mufassall.json");
  });

  it("accepts a bare draft file from the old author page", () => {
    const p = parseBundle(JSON.stringify(titled("Old")));
    expect(p.ok && p.systems.length === 1 && p.systems[0]!.source === "file").toBe(true);
  });

  it("refuses wrong format, junk and oversize", () => {
    expect(parseBundle("not json")).toEqual({ ok: false, error: "notJson" });
    expect(parseBundle("[]")).toEqual({ ok: false, error: "wrongFormat" });
    expect(parseBundle(JSON.stringify({ format: "other", v: 1, systems: [] }))).toEqual({ ok: false, error: "wrongFormat" });
    expect(parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 2, systems: [] }))).toEqual({ ok: false, error: "wrongFormat" });
    expect(parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 1, systems: [] }))).toEqual({ ok: false, error: "empty" });
    expect(parseBundle(" ".repeat(BUNDLE_MAX_CHARS + 1))).toEqual({ ok: false, error: "tooLarge" });
  });

  it("drops invalid drafts with a count and caps at 50 systems", () => {
    const good = { title: "ok", draft: newDraft() };
    const systems = [good, { title: "bad", draft: { v: 2 } }, null, { title: { x: 1 }, source: "evil", draft: newDraft() }];
    const p = parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 1, systems }));
    if (!p.ok) throw new Error(p.error);
    expect(p.systems).toHaveLength(2);
    expect(p.dropped).toBe(2);
    expect(p.systems[1]).toEqual({ title: "", draft: newDraft() });

    const many = parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 1, systems: Array.from({ length: 51 }, () => good) }));
    if (!many.ok) throw new Error(many.error);
    expect(many.systems).toHaveLength(50);
    expect(many.skipped).toBe(1);

    const allBad = parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 1, systems: [{ draft: 1 }] }));
    expect(allBad).toEqual({ ok: true, systems: [], dropped: 1, skipped: 0 });
  });

  it("does not let a hostile title or prototype key through", () => {
    const evil = JSON.parse(`{"format":"${BUNDLE_FORMAT}","v":1,"systems":[{"title":"${"t".repeat(5000)}","__proto__":{"polluted":true},"draft":${JSON.stringify(newDraft())}}]}`);
    const p = parseBundle(JSON.stringify(evil));
    if (!p.ok) throw new Error(p.error);
    expect(p.systems[0]!.title.length).toBe(200);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("share link", () => {
  it("base64url round-trips any bytes", () => {
    const bytes = new Uint8Array(300).map((_, i) => (i * 37) & 255);
    const s = toBase64Url(bytes);
    expect(s).not.toMatch(/[+/=]/);
    expect(fromBase64Url(s)).toEqual(bytes);
    expect(fromBase64Url("ab c")).toBeNull();
    expect(fromBase64Url("abcde")).toBeNull();
  });

  it("encodes and decodes a draft with deflate-raw", async () => {
    expect(canShare()).toBe(true);
    const d = titled("Ulashish: to'lov");
    d.labels.ru.api = "Шлюз";
    const r = await encodeShare(d);
    if (!r.ok) throw new Error(r.error);
    expect(r.code.length).toBeLessThan(SHARE_MAX_CHARS);
    expect(await decodeShare(r.code)).toEqual({ ok: true, draft: d });
    const url = shareUrl("https://example.org", "uz", r.code);
    expect(shareCodeFromHash(new URL(url).hash)).toBe(r.code);
    expect(shareCodeFromHash("#x=1&s=abc")).toBe("abc");
    expect(shareCodeFromHash("")).toBe("");
  });

  it("refuses a system too large for a link", async () => {
    const d = newDraft();
    // text that does not compress well
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed);
    d.summary.en = Array.from({ length: 1900 }, () => String.fromCharCode(33 + (rnd() % 90))).join("");
    d.summary.ru = Array.from({ length: 1900 }, () => String.fromCharCode(33 + (rnd() % 90))).join("");
    d.summary.uz = Array.from({ length: 1900 }, () => String.fromCharCode(33 + (rnd() % 90))).join("");
    d.title.en = Array.from({ length: 290 }, () => String.fromCharCode(33 + (rnd() % 90))).join("");
    for (const l of ["uz", "ru", "en"] as const) d.steps[0]!.text[l].body = Array.from({ length: 3000 }, () => String.fromCharCode(33 + (rnd() % 90))).join("");
    expect(await encodeShare(d)).toEqual({ ok: false, error: "tooLong" });
  });

  it("round-trips a lesson-sized system, even one past the link length limit", async () => {
    const entry = Object.values(lessons)[0]!;
    const { draft } = fromLesson(entry.lesson, entry.text as Partial<Record<AuthorLang, LessonText<LessonInput>>>);
    const code = toBase64Url(await deflate(new TextEncoder().encode(JSON.stringify(draft))));
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(shareCodeFromHash(`#s=${code}`)).toBe(code);
    const r = await decodeShare(code);
    expect(r.ok && r.draft).toEqual(sanitizeDraft(JSON.parse(JSON.stringify(draft))));
  });

  it("stops reading once a link inflates past the cap", async () => {
    const big = { ...newDraft(), slug: "x", pad: "a".repeat(SHARE_INFLATE_MAX_BYTES + 10) };
    const code = toBase64Url(await deflate(new TextEncoder().encode(JSON.stringify(big))));
    expect(code.length).toBeLessThan(SHARE_MAX_CHARS);
    expect(await decodeShare(code)).toEqual({ ok: false, reason: "tooBig" });
    // a zip bomb: 10 MB of zeros packs into a few KB
    const bomb = await deflate(new Uint8Array(10_000_000));
    expect(await decodeShare(toBase64Url(bomb))).toEqual({ ok: false, reason: "tooBig" });
    // a hash too long to be worth decoding
    expect(await decodeShare("a".repeat(200_000))).toEqual({ ok: false, reason: "tooBig" });
  });

  it("decodes junk links to a reason, never throws", async () => {
    const broken = { ok: false, reason: "broken" };
    expect(await decodeShare("")).toEqual(broken);
    expect(await decodeShare("!!!")).toEqual(broken);
    expect(await decodeShare("@@@")).toEqual(broken);
    expect(await decodeShare("AAAA")).toEqual(broken);
    expect(await decodeShare("aGVsbG8")).toEqual(broken);
    // valid deflate of something that is not a draft
    const notDraft = await deflate(new TextEncoder().encode(JSON.stringify({ hello: 1 })));
    expect(await decodeShare(toBase64Url(notDraft))).toEqual(broken);
    // valid deflate of bytes that are not UTF-8
    const notText = await deflate(new Uint8Array([0xff, 0xfe, 0xfd]));
    expect(await decodeShare(toBase64Url(notText))).toEqual(broken);
  });

  it("reports a browser without DecompressionStream as unsupported", async () => {
    const real = globalThis.DecompressionStream;
    // @ts-expect-error simulating an old browser
    delete globalThis.DecompressionStream;
    try {
      expect(await decodeShare("abc")).toEqual({ ok: false, reason: "unsupported" });
    } finally {
      globalThis.DecompressionStream = real;
    }
  });
});

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  return new Uint8Array(buf);
}
