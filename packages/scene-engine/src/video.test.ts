import { describe, expect, it } from "vitest";
import {
  fitRect,
  frameCount,
  frameLayout,
  pickFormat,
  stepAt,
  stepDurations,
  timeline,
  totalMs,
  videoFilename,
  watermarkText,
  wrapCaption,
} from "./video";

const len = (s: string) => Array.from(s).length;

describe("timeline", () => {
  it("gives every step the same time and holds the last one longer", () => {
    expect(stepDurations(3, 2500, 800)).toEqual([2500, 2500, 3300]);
    expect(stepDurations(0)).toEqual([]);
  });

  it("maps time to the step on screen and ends with -1", () => {
    const plan = timeline([1000, 2000, 500]);
    expect(plan).toEqual([
      { step: 0, start: 0, end: 1000 },
      { step: 1, start: 1000, end: 3000 },
      { step: 2, start: 3000, end: 3500 },
    ]);
    expect(totalMs(plan)).toBe(3500);
    expect(stepAt(plan, 0)).toBe(0);
    expect(stepAt(plan, 999)).toBe(0);
    expect(stepAt(plan, 1000)).toBe(1);
    expect(stepAt(plan, 3499)).toBe(2);
    expect(stepAt(plan, 3500)).toBe(-1);
    expect(stepAt(plan, -5)).toBe(0);
    expect(stepAt([], 0)).toBe(-1);
  });

  it("counts frames at the given rate; negative durations count as zero", () => {
    expect(frameCount(timeline(stepDurations(4, 2500, 800)), 30)).toBe(324);
    expect(totalMs(timeline([-100, 200]))).toBe(200);
  });
});

describe("layout", () => {
  it("fits the scene inside its box, centred, aspect kept", () => {
    expect(fitRect(800, 500, { x: 0, y: 0, w: 1600, h: 500 })).toEqual({ x: 400, y: 0, w: 800, h: 500 });
    expect(fitRect(100, 100, { x: 10, y: 10, w: 200, h: 400 })).toEqual({ x: 10, y: 110, w: 200, h: 200 });
    expect(fitRect(0, 100, { x: 1, y: 2, w: 3, h: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it("keeps a caption bar under the scene and scales type with the height", () => {
    const a = frameLayout(1280, 720);
    expect(a.bar.y + a.bar.h).toBe(720);
    expect(a.scene.y + a.scene.h).toBeLessThanOrEqual(a.bar.y);
    expect(a.title).toBeGreaterThanOrEqual(30);
    const b = frameLayout(1920, 1080);
    expect(b.title).toBe(Math.round(a.title * 1.5));
  });
});

describe("wrapCaption", () => {
  it("keeps a short title on one line", () => {
    expect(wrapCaption("Cache hit", 20, len)).toEqual(["Cache hit"]);
  });

  it("wraps on spaces", () => {
    expect(wrapCaption("one two three four", 9, len, 3)).toEqual(["one two", "three", "four"]);
    expect(wrapCaption("one two three four", 9, len, 2)).toEqual(["one two", "three…"]);
  });

  it("wraps into two lines when it fits", () => {
    expect(wrapCaption("one two three", 9, len)).toEqual(["one two", "three"]);
  });

  it("ends with an ellipsis when it does not fit", () => {
    const lines = wrapCaption("alpha beta gamma delta epsilon", 11, len, 2);
    expect(lines).toEqual(["alpha beta", "gamma delt…"]);
    expect(lines.every((l) => len(l) <= 11)).toBe(true);
  });

  it("breaks a word longer than the line", () => {
    expect(wrapCaption("abcdefghij", 4, len, 3)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrapCaption("abcdefghijkl", 4, len, 2)).toEqual(["abcd", "efg…"]);
  });

  it("collapses whitespace and handles empty text", () => {
    expect(wrapCaption("  a \n  b\t", 10, len)).toEqual(["a b"]);
    expect(wrapCaption("", 10, len)).toEqual([]);
  });

  it("never loops on a character wider than the line", () => {
    expect(wrapCaption("ab", 0.5, len, 2)).toEqual(["a", "b"]);
    expect(wrapCaption("ab", 0.5, len, 1)).toEqual(["…"]);
  });
});

describe("pickFormat", () => {
  const only = (...ok: string[]) => (m: string) => ok.includes(m);

  it("prefers VP9, then VP8, then plain WebM", () => {
    expect(pickFormat(() => true)).toEqual({ mime: "video/webm;codecs=vp9", ext: "webm" });
    expect(pickFormat(only("video/webm;codecs=vp8", "video/webm"))?.mime).toBe("video/webm;codecs=vp8");
    expect(pickFormat(only("video/webm"))?.mime).toBe("video/webm");
  });

  it("falls back to MP4 (Safari) and to nothing", () => {
    expect(pickFormat(only("video/mp4"))).toEqual({ mime: "video/mp4", ext: "mp4" });
    expect(pickFormat(() => false)).toBeNull();
    expect(
      pickFormat(() => {
        throw new Error("probe");
      }),
    ).toBeNull();
  });
});

describe("names", () => {
  it("builds <slug>-<lang>.<ext>, with the scenario in between", () => {
    expect(videoFilename("rate-limiting", "uz", "webm")).toBe("rate-limiting-uz.webm");
    expect(videoFilename("rate-limiting", "ru", "mp4", "retry")).toBe("rate-limiting-retry-ru.mp4");
    expect(videoFilename("A/b c", "en", "webm")).toBe("a-b-c-en.webm");
  });

  it("points the watermark at the lesson page", () => {
    expect(watermarkText("en", "dns")).toBe("mufassall.dtwin.uz/en/l/dns");
  });
});
