import { describe, expect, it } from "vitest";
import cyrillicXml from "./fixtures/cyrillic.bpmn?raw";
import orderXml from "./fixtures/order-process.bpmn?raw";
import poolsXml from "./fixtures/two-pools.bpmn?raw";
import { AUTHOR_UI } from "./author-ui";
import {
  BPMN_MAX_CHARS,
  BPMN_MAX_NODES,
  BPMN_MAX_STEPS,
  type BpmnErrorCode,
  type BpmnModel,
  type BpmnWarningCode,
  bpmnToDraft,
  decodeEntities,
  importBpmn,
  isBlankDraft,
  parseBpmn,
  parseXml,
  slugify,
  transliterate,
} from "./bpmn";
import { AUTHOR_LANGS, type Draft, ID_RE, newDraft, sanitizeDraft } from "./model";
import { type IssueCode, checkDraft, hasCyrillic } from "./validation";

const model = (xml: string): BpmnModel => {
  const r = parseBpmn(xml);
  if (!r.ok) throw new Error(`parse failed: ${JSON.stringify(r.error)}`);
  return r.model;
};
const errorOf = (xml: string): BpmnErrorCode | undefined => {
  const r = parseBpmn(xml);
  return r.ok ? undefined : r.error.code;
};
const codes = (ws: { code: BpmnWarningCode }[]) => new Set(ws.map((w) => w.code));

/** What a skeleton is allowed to miss: the texts the author writes next, and the real requests. */
const TO_WRITE = new Set<IssueCode>(["text", "title", "learn", "wireShare", "fewSteps"]);
const structuralErrors = (d: Draft) => checkDraft(d).filter((i) => i.level === "error" && !TO_WRITE.has(i.code));

const DEFS = (body: string, prefix = "bpmn") =>
  `<${prefix}:definitions xmlns:${prefix}="http://www.omg.org/spec/BPMN/20100524/MODEL">${body}</${prefix}:definitions>`;

describe("XML scanner", () => {
  it("decodes the five entities and numeric references, leaves unknown ones", () => {
    expect(decodeEntities("a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#65;&#x42;&#x1F600; &nbsp; & x")).toBe(
      "a & b <c> \"d\" 'e' AB\u{1F600} &nbsp; & x",
    );
  });
  it("handles prefixes, default namespaces, comments, CDATA and self-closing tags", () => {
    const x = parseXml(
      `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e "boom">]><!-- c --><a:r xmlns:a="urn:a" xmlns="urn:d"><b k='1 &amp; 2'/><a:c><![CDATA[<raw> & ]]>t&lt;</a:c><!-- <fake/> --></a:r>`,
    );
    expect(x.local).toBe("r");
    expect(x.ns).toBe("urn:a");
    expect(x.children.map((c) => [c.local, c.ns])).toEqual([
      ["b", "urn:d"],
      ["c", "urn:a"],
    ]);
    expect(x.children[0]!.attrs.k).toBe("1 & 2");
    expect(x.children[1]!.text).toBe("<raw> & t<");
  });
  it("reports broken XML with a line", () => {
    const r = parseBpmn(DEFS(`<bpmn:process id="p">\n<bpmn:task id="t">\n</bpmn:process>`));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("malformed");
      expect(r.error.line).toBe(3);
      expect(r.error.x).toBe("</bpmn:process>");
    }
    for (const bad of [
      "<a",
      "<a b=1></a>",
      '<a b="1></a>',
      "<a><!-- never closed </a>",
      "<a><![CDATA[x</a>",
      "<a></a><b></b>",
      "text<a></a>",
      "<a></b>",
      "<a>",
    ]) {
      expect(errorOf(bad), bad).toBe("malformed");
    }
  });
  it("refuses empty, huge, deep and non-BPMN input with a code", () => {
    expect(errorOf("  \n ")).toBe("empty");
    expect(errorOf(`<a>${" ".repeat(BPMN_MAX_CHARS)}</a>`)).toBe("tooLarge");
    expect(errorOf(`${"<a>".repeat(300)}${"</a>".repeat(300)}`)).toBe("tooDeep");
    expect(errorOf(`<a>${"<b/>".repeat(100_001)}</a>`)).toBe("tooMany");
    expect(errorOf(`<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>`)).toBe("notBpmn");
    expect(errorOf(`<definitions><process/></definitions>`)).toBe("notBpmn");
    expect(errorOf(DEFS(`<bpmn:process id="p"/>`))).toBe("noElements");
  });
  it("stays linear on hostile input", () => {
    const attrs = Array.from({ length: 20_000 }, (_, k) => `a${k}="${"&amp;".repeat(5)}"`).join(" ");
    const t0 = Date.now();
    expect(errorOf(`<x ${attrs}>${"&".repeat(200_000)}</x>`)).toBe("notBpmn");
    expect(errorOf(`<x>${"<!-".repeat(300_000)}`)).toBe("malformed");
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});

describe("names", () => {
  it("transliterates Russian and Uzbek Cyrillic", () => {
    expect(transliterate("Ҳужжат тайёр", "uz")).toBe("Hujjat tayyor");
    expect(transliterate("Ўзбекистон, ғалла", "uz")).toBe("O'zbekiston, g'alla");
    expect(transliterate("Щука и ёж", "en")).toBe("Shchuka i yozh");
  });
  it("makes valid ids from any name", () => {
    expect(slugify("Check the order")).toBe("check-the-order");
    expect(slugify("Проверить клиента")).toBe("proverit-klienta");
    expect(slugify("O'zbek tili: so'rov")).toBe("ozbek-tili-sorov");
    expect(slugify("Café № 1")).toBe("cafe-no-1");
    expect(slugify("123 go")).toBe("go");
    expect(slugify("!!!")).toBe("");
    expect(slugify("a".repeat(80)).length).toBe(32);
  });
});

describe("order process (gateway, loop, data store, diagram)", () => {
  const m = model(orderXml);
  it("reads elements, flows, names and bounds", () => {
    expect(m.name).toBe("Order & payment");
    expect(m.elements.map((e) => e.type)).toEqual([
      "startEvent",
      "userTask",
      "exclusiveGateway",
      "serviceTask",
      "sendTask",
      "endEvent",
      "dataStoreReference",
    ]);
    const check = m.elements[1]!;
    expect(check.name).toBe("Check the order");
    expect(check.doc).toBe("A clerk checks that <items> & prices match.");
    expect(check.bounds).toEqual({ x: 240, y: 80, w: 100, h: 80 });
    expect(m.elements[4]!.name).toBe('Ask to fix "details"');
    expect(m.flows.filter((f) => f.kind === "sequence")).toHaveLength(6);
    expect(m.flows.find((f) => f.kind === "data")).toMatchObject({ source: "Task_pay", target: "DataStore_orders" });
  });
  it("walks the flow in order, the loop back does not block it", () => {
    const { draft, warnings, ids } = bpmnToDraft(m, "en");
    expect(draft.steps.map((s) => s.id)).toEqual(["order-placed", "check-the-order", "order-valid", "charge-the-card", "order-paid", "ask-to-fix-details", "recap"]);
    expect(draft.steps[0]!.kind).toBe("problem");
    expect(draft.steps.at(-1)!.kind).toBe("recap");
    expect(draft.steps[1]!.focus).toEqual([ids.Task_check]);
    expect(codes(warnings)).toContain("loop");
    expect(codes(warnings)).not.toContain("unreachable");
    expect(draft.steps[1]!.text.en.body).toBe("A clerk checks that <items> & prices match.");
    expect(draft.steps[1]!.text.ru.body).toBe("");
  });
  it("maps kinds and lines", () => {
    const { draft, ids } = bpmnToDraft(m, "en");
    const s = draft.steps[0]!;
    const kind = (bpmn: string) => s.nodes[ids[bpmn]!]!.kind;
    expect([kind("StartEvent_1"), kind("Task_check"), kind("Gateway_ok"), kind("Task_pay"), kind("DataStore_orders")]).toEqual(["client", "actor", "lb", "service", "db"]);
    expect(Object.keys(s.edges)).toHaveLength(7);
    expect(s.edges.yes).toMatchObject({ from: ids.Gateway_ok, to: ids.Task_pay, flow: "request" });
    expect(Object.values(s.edges).every((e) => e.mode === undefined)).toBe(true);
  });
  it("follows the diagram: left to right is the grid x axis", () => {
    const { draft, ids } = bpmnToDraft(m, "en");
    const at = (bpmn: string) => draft.steps[0]!.nodes[ids[bpmn]!]!.at;
    expect(at("StartEvent_1")[0]).toBeLessThan(at("Task_check")[0]);
    expect(at("Task_check")[0]).toBeLessThan(at("Task_pay")[0]);
    expect(at("Task_fix")[1]).toBeGreaterThan(at("Gateway_ok")[1]);
  });
  it("passes the author checks except the texts still to write", () => {
    const { draft } = bpmnToDraft(m, "en");
    expect(structuralErrors(draft)).toEqual([]);
    expect(checkDraft(draft).filter((i) => i.code === "close" || i.code === "sameCell")).toEqual([]);
    expect(sanitizeDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });
});

describe("two pools with message flows, lanes, no diagram", () => {
  const m = model(poolsXml);
  it("reads pools, lanes and message flows; reports what it skips", () => {
    expect(m.participants.map((p) => p.id)).toEqual(["P_shop", "P_warehouse", "P_bank"]);
    expect(m.lanes.map((l) => l.name)).toEqual(["Sales", "Support"]);
    expect(m.elements.find((e) => e.id === "C_shipped")).toMatchObject({ lane: "L_support", participant: "P_shop", eventKind: "message" });
    expect(m.elements.find((e) => e.id === "P_bank")).toMatchObject({ category: "participant" });
    expect(m.elements.some((e) => e.id === "SP_t" || e.id === "B_timeout")).toBe(false);
    expect(codes(m.warnings)).toEqual(new Set(["boundary", "subprocess"]));
  });
  it("orders both pools along the messages, a message line is async", () => {
    const { draft, warnings, ids } = bpmnToDraft(m, "uz");
    const order = draft.steps.map((s) => s.focus[0]);
    const pos = (bpmn: string) => order.indexOf(ids[bpmn]);
    // the story opens at the start event; the unreachable task comes last, before the recap
    expect(pos("S_shop")).toBe(0);
    expect(pos("T_apology")).toBe(order.length - 2);
    expect(pos("T_send")).toBeLessThan(pos("S_wh"));
    expect(pos("E_wh_done")).toBeLessThan(pos("C_shipped"));
    expect(pos("G_join")).toBeGreaterThan(Math.max(pos("T_pick"), pos("SP_pack")));
    const edges = Object.values(draft.steps[0]!.edges);
    expect(edges.find((e) => e.from === ids.T_send && e.to === ids.S_wh)).toMatchObject({ id: "pick-order", mode: "async" });
    // a pool-to-pool message lands on the pool's start event
    expect(edges.find((e) => e.from === ids.P_bank)).toMatchObject({ to: ids.S_shop, mode: "async" });
    expect(draft.steps[0]!.nodes[ids.P_bank!]!.kind).toBe("external");
    // the boundary path is cut off, so its task is kept as a block but reported
    expect(warnings.find((w) => w.code === "unreachable")?.x).toBe("Say sorry");
    expect(draft.labels.uz[ids.G_split!]).toBe("Tanlov");
    expect(draft.labels.ru[ids.G_split!]).toBe("Развилка");
  });
  it("lays blocks on free cells two apart and passes the checks", () => {
    const { draft } = bpmnToDraft(m, "uz");
    expect(structuralErrors(draft)).toEqual([]);
    expect(checkDraft(draft).filter((i) => i.code === "close" || i.code === "sameCell" || i.code === "offGrid")).toEqual([]);
  });
});

describe("Cyrillic names", () => {
  const m = model(cyrillicXml);
  it("keeps Russian as written and gives uz/en a Latin copy", () => {
    const { draft, ids, warnings } = bpmnToDraft(m, "ru");
    expect(draft.title).toEqual({ ru: "Выдача кредита", uz: "Vidacha kredita", en: "Vidacha kredita" });
    expect(draft.slug).toBe("vidacha-kredita");
    expect(ids.t1).toBe("proverit-klienta");
    expect(draft.labels.ru[ids.t1!]).toBe("Проверить клиента");
    expect(draft.labels.en[ids.e1!]).toBe("Huzhzhat tayyor");
    expect(draft.labels.uz[ids.e1!]).toBe("Hujjat tayyor");
    expect(draft.labels.en[ids.e2!]).toBe("End");
    expect(draft.steps[0]!.nodes[ids.doc!]!.kind).toBe("storage");
    expect(codes(warnings)).toEqual(new Set(["danglingFlow", "translate"]));
    for (const l of ["uz", "en"] as const) {
      expect(Object.values(draft.labels[l]).some(hasCyrillic)).toBe(false);
      expect(draft.steps.some((s) => hasCyrillic(s.text[l].title + s.text[l].short))).toBe(false);
    }
    expect(structuralErrors(draft)).toEqual([]);
  });
  it("every id is valid and unique", () => {
    const { draft } = bpmnToDraft(m, "ru");
    const stepIds = draft.steps.map((s) => s.id);
    expect(new Set(stepIds).size).toBe(stepIds.length);
    for (const id of [...stepIds, ...Object.keys(draft.steps[0]!.nodes), ...Object.keys(draft.steps[0]!.edges)]) expect(id).toMatch(ID_RE);
  });
});

describe("limits and odd shapes", () => {
  const chain = (n: number, named = true) => {
    const nodes = Array.from({ length: n }, (_, k) => `<bpmn:task id="t${k}"${named ? ` name="Step ${k}"` : ""}/>`).join("");
    const flows = Array.from({ length: n - 1 }, (_, k) => `<bpmn:sequenceFlow id="f${k}" sourceRef="t${k}" targetRef="t${k + 1}"/>`).join("");
    return DEFS(`<bpmn:process id="p"><bpmn:startEvent id="s"/><bpmn:sequenceFlow id="f" sourceRef="s" targetRef="t0"/>${nodes}${flows}</bpmn:process>`);
  };
  it("caps blocks and steps with warnings instead of failing", () => {
    const { draft, warnings } = bpmnToDraft(model(chain(300)), "en");
    expect(Object.keys(draft.steps[0]!.nodes)).toHaveLength(BPMN_MAX_NODES);
    expect(draft.steps).toHaveLength(BPMN_MAX_STEPS);
    expect(warnings.find((w) => w.code === "maxNodes")?.x).toBe(String(301 - BPMN_MAX_NODES));
    expect(codes(warnings)).toContain("maxSteps");
    expect(structuralErrors(draft).filter((i) => i.code !== "crossing")).toEqual([]);
    expect(checkDraft(draft).filter((i) => i.code === "sameCell")).toEqual([]);
  });
  it("caps elements read from a huge file", () => {
    const r = importBpmn(chain(2_500), "en");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.warnings.find((w) => w.code === "maxElements")).toBeDefined();
  });
  it("names unnamed elements and keeps ids unique", () => {
    const { draft } = bpmnToDraft(model(chain(4, false)), "uz");
    expect(Object.keys(draft.steps[0]!.nodes)).toEqual(["start", "task", "task-2", "task-3", "task-4"]);
    expect(draft.labels.uz.task).toBe("Vazifa");
  });
  it("handles no start event, a pure cycle and self loops", () => {
    const xml = DEFS(
      `<bpmn:process id="p"><bpmn:task id="a" name="A"/><bpmn:task id="b" name="B"/><bpmn:sequenceFlow id="x" sourceRef="a" targetRef="b"/><bpmn:sequenceFlow id="y" sourceRef="b" targetRef="a"/><bpmn:sequenceFlow id="z" sourceRef="b" targetRef="b"/></bpmn:process>`,
    );
    const { draft, warnings } = bpmnToDraft(model(xml), "en");
    expect(draft.steps.map((s) => s.focus[0] ?? "-")).toEqual(["a", "b", "-"]);
    expect(codes(warnings)).toEqual(new Set(["selfLoop", "noStart", "loop", "translate"]));
  });
  it("drops an event subprocess and reports unknown elements", () => {
    const xml = DEFS(
      `<bpmn:process id="p"><bpmn:startEvent id="s"/><bpmn:subProcess id="es" triggeredByEvent="true"/><bpmn:choreographyTask id="c"/></bpmn:process>`,
    );
    const m = model(xml);
    expect(m.elements.map((e) => e.id)).toEqual(["s"]);
    expect(m.warnings).toEqual([{ code: "eventSubprocess", x: "es" }, { code: "unsupported", x: "choreographyTask" }]);
  });
});

describe("isBlankDraft", () => {
  it("is true only for the untouched starter", () => {
    expect(isBlankDraft(newDraft())).toBe(true);
    const titled = newDraft();
    titled.title.en = "Mine";
    expect(isBlankDraft(titled)).toBe(false);
    expect(isBlankDraft(bpmnToDraft(model(orderXml), "en").draft)).toBe(false);
  });
});

describe("strings", () => {
  it("every warning and error has a text in all three languages, uz and en Latin", () => {
    const warn: BpmnWarningCode[] = ["boundary", "subprocess", "eventSubprocess", "unsupported", "danglingFlow", "selfLoop", "loop", "unreachable", "noStart", "maxElements", "maxNodes", "maxSteps", "partialLayout", "translate"];
    const err: BpmnErrorCode[] = ["empty", "tooLarge", "malformed", "notBpmn", "tooDeep", "tooMany", "noElements"];
    for (const l of AUTHOR_LANGS) {
      const b = AUTHOR_UI[l].bpmn;
      for (const c of warn) expect(b.warning[c]?.trim(), `${l} ${c}`).toBeTruthy();
      for (const c of err) expect(b.error[c]?.trim(), `${l} ${c}`).toBeTruthy();
      const flat = JSON.stringify(b);
      if (l !== "ru") expect(hasCyrillic(flat), l).toBe(false);
    }
    const keys = (l: (typeof AUTHOR_LANGS)[number]) => Object.keys(AUTHOR_UI[l].bpmn).sort();
    expect(keys("uz")).toEqual(keys("en"));
    expect(keys("ru")).toEqual(keys("en"));
  });
});
