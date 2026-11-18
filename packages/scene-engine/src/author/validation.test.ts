import { describe, expect, it } from "vitest";
import { type Draft, type DraftExchange, editStep, newDraft } from "./model";
import { type IssueCode, cellDistance, checkDraft, checkWire, hasCyrillic } from "./validation";

const codes = (d: Draft) => new Set(checkDraft(d).map((i) => i.code));
const has = (d: Draft, c: IssueCode) => codes(d).has(c);

const ex = (over: Partial<DraftExchange> = {}): DraftExchange => ({
  edge: "call",
  request: {
    format: "json",
    head: "POST /pay HTTP/1.1",
    headers: [["Authorization", "***"]],
    body: '{\n  "order_id": "1042",\n  "token": "***"\n}',
  },
  marks: ["Authorization", "order_id"],
  masked: ["Authorization", "token"],
  ...over,
});

describe("checkWire", () => {
  it("passes a clean message", () => {
    expect(checkWire(ex())).toEqual({ missingMarks: [], badMasks: [], missingMasked: [] });
  });
  it("finds a missing mark, a real secret and an unknown masked field", () => {
    const r = checkWire(
      ex({
        request: { format: "json", head: "POST /pay HTTP/1.1", headers: [["Authorization", "Bearer abc"]], body: '{ "order_id": 1 }' },
        marks: ["order_id", "amount"],
        masked: ["Authorization", "token"],
      }),
    );
    expect(r.missingMarks).toEqual(["amount"]);
    expect(r.badMasks).toEqual(["Authorization"]);
    expect(r.missingMasked).toEqual(["token"]);
  });
  it("finds marks in plain formats by word", () => {
    const r = checkWire(ex({ request: { format: "sql", head: "INSERT INTO inbox", headers: [], body: "ON CONFLICT DO NOTHING" }, marks: ["inbox", "ON CONFLICT", "box"], masked: [] }));
    expect(r.missingMarks).toEqual(["box"]);
  });
});

describe("checkDraft", () => {
  it("flags the starter as unfinished but structurally sound", () => {
    const c = codes(newDraft());
    expect(c.has("fewSteps")).toBe(true);
    expect(c.has("title")).toBe(true);
    expect(c.has("text")).toBe(true);
    expect(c.has("resolve")).toBe(false);
    expect(c.has("recapLast")).toBe(false);
  });

  it("wants the recap last", () => {
    const d = newDraft();
    d.steps[1]!.kind = "fix";
    expect(has(d, "recapLast")).toBe(true);
  });

  it("checks units, close nodes and node count", () => {
    let d = newDraft();
    d.metrics = [{ id: "speed", unit: "km/h", better: "up", label: { uz: "a", ru: "a", en: "a" } }];
    expect(has(d, "unit")).toBe(true);
    d = editStep(d, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { id: "db", kind: "db", at: [7, 7], state: "ok" } } }), false);
    expect(checkDraft(d).find((i) => i.code === "close")).toMatchObject({ level: "warn", step: 0 });
    d = editStep(
      d,
      0,
      (s) => {
        const nodes = { ...s.nodes };
        for (let k = 0; k < 7; k++) nodes[`w${k}`] = { id: `w${k}`, kind: "worker", at: [k * 2 > 12 ? 0 : k * 2, 11], state: "ok" };
        return { ...s, nodes };
      },
      false,
    );
    expect(has(d, "manyNodes")).toBe(true);
  });

  it("checks Cyrillic in Uzbek and English only", () => {
    const d = newDraft();
    d.steps[0]!.text.ru.body = "Привет";
    expect(has(d, "cyrillic")).toBe(false);
    d.steps[0]!.text.uz.body = "So'rov юборилди";
    expect(checkDraft(d).find((i) => i.code === "cyrillic")).toMatchObject({ lang: "uz", x: "start" });
  });

  it("checks the exchange: edge, marks, masks and notes", () => {
    const d = newDraft();
    d.steps[0]!.exchange = ex({ edge: "nope", marks: ["missing"] });
    const c = codes(d);
    expect(c.has("exEdge")).toBe(true);
    expect(c.has("markMissing")).toBe(true);
    expect(c.has("fieldNote")).toBe(true);
    expect(c.has("resolve")).toBe(true);
  });

  it("counts steps with a real request", () => {
    const d = newDraft();
    expect(has(d, "wireShare")).toBe(true);
    d.steps[0]!.exchange = ex();
    expect(has(d, "wireShare")).toBe(false);
  });
});

describe("helpers", () => {
  it("measures cells and spots Cyrillic", () => {
    expect(cellDistance([0, 0], [1, 1])).toBe(1);
    expect(cellDistance([0, 0], [2, 1])).toBe(2);
    expect(hasCyrillic("o'zbek")).toBe(false);
    expect(hasCyrillic("ўзбек")).toBe(true);
  });
});
