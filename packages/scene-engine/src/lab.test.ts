import { describe, expect, it } from "vitest";
import { cellTaken, decodeDoc, emptyDoc, encodeDoc, freeCell, nextId, sanitize, toLessonCode } from "./lab";

const sample = () =>
  sanitize({
    nodes: {
      api: { kind: "service", at: [2, 3], state: "slow", load: 70 },
      db: { kind: "db", at: [5, 3], state: "ok" },
    },
    edges: { q: { from: "api", to: "db", flow: "retry", rate: 3, cut: true } },
    labels: { api: "API ‘o’zbek’", db: "Baza" },
  });

describe("lab doc", () => {
  it("round-trips through the share link", () => {
    const doc = sample();
    const code = encodeDoc(doc);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDoc(code)).toEqual(doc);
  });

  it("drops malformed and hostile input", () => {
    const doc = sanitize({
      nodes: {
        ok: { kind: "cache", at: [1, 1] },
        "Bad Id": { kind: "db", at: [2, 2] },
        clash: { kind: "db", at: [1, 1] },
        far: { kind: "db", at: [99, 1] },
        weird: { kind: "<script>", at: [3, 3] },
        hot: { kind: "lb", at: [4, 4], load: 500, state: "melting" },
      },
      edges: {
        self: { from: "ok", to: "ok" },
        ghost: { from: "ok", to: "nobody" },
        good: { from: "ok", to: "hot", flow: "nope", rate: 1e9 },
      },
      labels: { ok: "x".repeat(500) },
    });
    expect(Object.keys(doc.nodes)).toEqual(["ok", "hot"]);
    expect(doc.nodes.hot).toEqual({ id: "hot", kind: "lb", at: [4, 4], state: "ok" });
    expect(doc.labels.ok).toHaveLength(32);
    expect(Object.keys(doc.edges)).toEqual(["good"]);
    expect(doc.edges.good).toMatchObject({ flow: "request", rate: 1 });
    expect(decodeDoc("%%%not-base64")).toEqual(emptyDoc());
    expect(sanitize(null)).toEqual(emptyDoc());
  });

  it("finds free cells and fresh ids", () => {
    const doc = sample();
    expect(cellTaken(doc, [2, 3])).toBe(true);
    expect(cellTaken(doc, [2, 3], "api")).toBe(false);
    const cell = freeCell(doc, [2, 3])!;
    expect(cellTaken(doc, cell)).toBe(false);
    expect(nextId({ "db-1": 1 }, "db")).toBe("db-2");
  });

  it("exports a lesson step", () => {
    const code = toLessonCode(sample());
    expect(code).toContain('api: { kind: "service", at: [2, 3], state: "slow", load: 70 },');
    expect(code).toContain('q: { from: "api", to: "db", flow: "retry", rate: 3, cut: true },');
  });
});
