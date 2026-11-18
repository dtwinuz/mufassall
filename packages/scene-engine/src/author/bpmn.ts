import type { EdgeState, NodeKind, NodeState } from "@mufassall/scene-schema";
import { AUTHOR_LANGS, type AuthorLang, type Draft, type DraftStep, GRID_MAX, blankStep, normalize } from "./model";

/*
 * One-way BPMN 2.0 import: a `.bpmn` file from Camunda Modeler / bpmn.io becomes a draft skeleton.
 * The XML is read by a linear hand scanner (indexOf + char loops, no regex over the input), so it
 * runs in node and in the browser alike and has no catastrophic-backtracking path.
 */

export const BPMN_MAX_CHARS = 5_000_000;
export const BPMN_MAX_XML_ELEMENTS = 100_000;
export const BPMN_MAX_DEPTH = 200;
/** model elements kept from one file; the rest is reported, not read */
export const BPMN_MAX_ELEMENTS = 2_000;
/** blocks in the draft: 7 x 7 free lattice cells two apart fit 49, keep air */
export const BPMN_MAX_NODES = 30;
/** the course allows 16 steps; one is the recap */
export const BPMN_MAX_STEPS = 16;

const MODEL_NS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const DI_NS = "http://www.omg.org/spec/BPMN/20100524/DI";
const DC_NS = "http://www.omg.org/spec/DD/20100524/DC";

/* ---------- XML ---------- */

export interface XmlNode {
  /** local name, prefix stripped */
  local: string;
  /** namespace URI the prefix resolves to ("" when none) */
  ns: string;
  /** attributes by local name; prefixed ones also by their full name */
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export type BpmnErrorCode = "empty" | "tooLarge" | "malformed" | "notBpmn" | "tooDeep" | "tooMany" | "noElements";

export interface BpmnError {
  code: BpmnErrorCode;
  line?: number;
  /** the offending token, for `malformed` */
  x?: string;
}

class XmlFail extends Error {
  constructor(readonly info: BpmnError) {
    super(info.code);
  }
}

const isSpace = (c: number) => c === 32 || c === 9 || c === 10 || c === 13;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Replaces the five XML entities and numeric references; anything else stays as written. */
export function decodeEntities(s: string): string {
  let amp = s.indexOf("&");
  if (amp < 0) return s;
  let out = "";
  let from = 0;
  while (amp >= 0) {
    const semi = s.indexOf(";", amp + 1);
    if (semi < 0 || semi - amp > 12) {
      amp = s.indexOf("&", amp + 1);
      continue;
    }
    const ref = s.slice(amp + 1, semi);
    let rep: string | undefined;
    if (ref.charCodeAt(0) === 35 /* # */) {
      const hex = ref[1] === "x" || ref[1] === "X";
      const code = hex ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      const digits = hex ? ref.slice(2) : ref.slice(1);
      const ok = digits.length > 0 && [...digits].every((ch) => (hex ? "0123456789abcdefABCDEF" : "0123456789").includes(ch));
      if (ok && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) rep = String.fromCodePoint(code);
    } else rep = ENTITIES[ref];
    if (rep !== undefined) {
      out += s.slice(from, amp) + rep;
      from = semi + 1;
      amp = s.indexOf("&", from);
    } else amp = s.indexOf("&", amp + 1);
  }
  return out + s.slice(from);
}

/** A small namespace-aware XML reader. Throws `XmlFail` on broken input; DTD entities are not expanded. */
export function parseXml(xml: string): XmlNode {
  const n = xml.length;
  const lineAt = (pos: number) => {
    let line = 1;
    for (let k = xml.indexOf("\n"); k >= 0 && k < pos; k = xml.indexOf("\n", k + 1)) line++;
    return line;
  };
  const fail = (pos: number, x?: string, code: BpmnErrorCode = "malformed"): never => {
    throw new XmlFail({ code, line: lineAt(pos), ...(x ? { x: x.slice(0, 60) } : {}) });
  };
  const top: XmlNode = { local: "", ns: "", attrs: {}, children: [], text: "" };
  const stack: { node: XmlNode; qname: string; scope: Record<string, string> }[] = [
    { node: top, qname: "", scope: { xml: "http://www.w3.org/XML/1998/namespace" } },
  ];
  let count = 0;
  let i = 0;
  const addText = (pos: number, t: string) => {
    if (stack.length > 1) stack[stack.length - 1]!.node.text += t;
    else if (t.trim()) fail(pos, t.trim());
  };
  while (i < n) {
    const lt = xml.indexOf("<", i);
    if (lt < 0) {
      addText(i, xml.slice(i));
      break;
    }
    if (lt > i) addText(i, decodeEntities(xml.slice(i, lt)));
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      if (end < 0) fail(lt, "<!--");
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9);
      if (end < 0) fail(lt, "<![CDATA[");
      addText(lt, xml.slice(lt + 9, end));
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2);
      if (end < 0) fail(lt, "<?");
      i = end + 2;
      continue;
    }
    if (xml.startsWith("<!", lt)) {
      // DOCTYPE: skip to the closing `>` outside quotes and the internal subset
      let j = lt + 2;
      let depth = 0;
      let quote = 0;
      for (; j < n; j++) {
        const c = xml.charCodeAt(j);
        if (quote) {
          if (c === quote) quote = 0;
        } else if (c === 34 || c === 39) quote = c;
        else if (c === 91) depth++;
        else if (c === 93) depth--;
        else if (c === 62 && depth <= 0) break;
      }
      if (j >= n) fail(lt, "<!");
      i = j + 1;
      continue;
    }
    if (xml.startsWith("</", lt)) {
      const end = xml.indexOf(">", lt + 2);
      if (end < 0) fail(lt, "</");
      const qname = xml.slice(lt + 2, end).trim();
      const open = stack[stack.length - 1]!;
      if (stack.length === 1 || open.qname !== qname) fail(lt, `</${qname}>`);
      stack.pop();
      i = end + 1;
      continue;
    }
    // start tag
    let j = lt + 1;
    const nameStart = j;
    while (j < n) {
      const c = xml.charCodeAt(j);
      if (isSpace(c) || c === 47 || c === 62 || c === 60 || c === 61) break;
      j++;
    }
    const qname = xml.slice(nameStart, j);
    if (!qname) fail(lt, "<");
    const raw: [string, string][] = [];
    let selfClose = false;
    for (;;) {
      while (j < n && isSpace(xml.charCodeAt(j))) j++;
      if (j >= n) fail(lt, `<${qname}`);
      const c = xml.charCodeAt(j);
      if (c === 62) {
        j++;
        break;
      }
      if (c === 47) {
        if (xml.charCodeAt(j + 1) !== 62) fail(j, `<${qname}`);
        selfClose = true;
        j += 2;
        break;
      }
      const aStart = j;
      while (j < n) {
        const d = xml.charCodeAt(j);
        if (isSpace(d) || d === 61 || d === 62 || d === 47 || d === 60) break;
        j++;
      }
      const aName = xml.slice(aStart, j);
      while (j < n && isSpace(xml.charCodeAt(j))) j++;
      if (!aName || xml.charCodeAt(j) !== 61) fail(j, aName || `<${qname}`);
      j++;
      while (j < n && isSpace(xml.charCodeAt(j))) j++;
      const q = xml.charCodeAt(j);
      if (q !== 34 && q !== 39) fail(j, aName);
      const vEnd = xml.indexOf(q === 34 ? '"' : "'", j + 1);
      if (vEnd < 0) fail(j, aName);
      const value = xml.slice(j + 1, vEnd);
      if (value.includes("<")) fail(j, aName);
      raw.push([aName, decodeEntities(value)]);
      j = vEnd + 1;
    }
    if (++count > BPMN_MAX_XML_ELEMENTS) fail(lt, undefined, "tooMany");
    if (stack.length > BPMN_MAX_DEPTH) fail(lt, undefined, "tooDeep");
    const parent = stack[stack.length - 1]!;
    let scope = parent.scope;
    for (const [k, v] of raw) {
      if (k === "xmlns" || k.startsWith("xmlns:")) {
        if (scope === parent.scope) scope = { ...parent.scope };
        scope[k === "xmlns" ? "" : k.slice(6)] = v;
      }
    }
    const colon = qname.indexOf(":");
    const prefix = colon < 0 ? "" : qname.slice(0, colon);
    const attrs: Record<string, string> = {};
    for (const [k, v] of raw) {
      if (k === "xmlns" || k.startsWith("xmlns:")) continue;
      const c2 = k.indexOf(":");
      attrs[k] = v;
      // unprefixed wins over a prefixed attribute of the same local name
      if (c2 >= 0 && !(k.slice(c2 + 1) in attrs)) attrs[k.slice(c2 + 1)] = v;
    }
    const node: XmlNode = {
      local: colon < 0 ? qname : qname.slice(colon + 1),
      ns: scope[prefix] ?? "",
      attrs,
      children: [],
      text: "",
    };
    if (stack.length === 1 && top.children.length) fail(lt, `<${qname}>`);
    parent.node.children.push(node);
    if (!selfClose) stack.push({ node, qname, scope });
    i = j;
  }
  if (stack.length > 1) fail(n, `<${stack[stack.length - 1]!.qname}>`);
  const root = top.children[0];
  if (!root) fail(0, undefined, "empty");
  return root!;
}

/* ---------- BPMN model ---------- */

export type BpmnCategory = "event" | "task" | "gateway" | "subprocess" | "call" | "data" | "participant";

export interface BpmnBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BpmnElement {
  id: string;
  /** BPMN element name, e.g. `userTask`, `exclusiveGateway`, `participant` */
  type: string;
  category: BpmnCategory;
  name: string;
  /** e.g. `message`, `timer` for events with an event definition */
  eventKind?: string;
  process?: string;
  participant?: string;
  lane?: string;
  doc?: string;
  bounds?: BpmnBounds;
}

export interface BpmnFlow {
  id: string;
  kind: "sequence" | "message" | "data";
  source: string;
  target: string;
  name: string;
}

export interface BpmnParticipant {
  id: string;
  name: string;
  processRef?: string;
}

export interface BpmnLane {
  id: string;
  name: string;
  process: string;
  nodes: string[];
}

export type BpmnWarningCode =
  | "boundary"
  | "subprocess"
  | "eventSubprocess"
  | "unsupported"
  | "danglingFlow"
  | "selfLoop"
  | "loop"
  | "unreachable"
  | "noStart"
  | "maxElements"
  | "maxNodes"
  | "maxSteps"
  | "partialLayout"
  | "translate";

export interface BpmnWarning {
  code: BpmnWarningCode;
  /** element names or ids, or a count */
  x?: string;
}

export interface BpmnModel {
  name: string;
  participants: BpmnParticipant[];
  lanes: BpmnLane[];
  elements: BpmnElement[];
  flows: BpmnFlow[];
  warnings: BpmnWarning[];
}

export type BpmnParseResult = { ok: true; model: BpmnModel } | { ok: false; error: BpmnError };

const TASKS = new Set(["task", "userTask", "manualTask", "serviceTask", "scriptTask", "businessRuleTask", "sendTask", "receiveTask"]);
const EVENTS = new Set(["startEvent", "endEvent", "intermediateCatchEvent", "intermediateThrowEvent"]);
const GATEWAYS = new Set(["exclusiveGateway", "parallelGateway", "inclusiveGateway", "eventBasedGateway", "complexGateway"]);
const SUBPROCESSES = new Set(["subProcess", "transaction", "adHocSubProcess"]);
const DATA = new Set(["dataStoreReference", "dataObjectReference"]);
/** process children that carry nothing the scene can show */
const QUIET = new Set([
  "dataObject",
  "textAnnotation",
  "association",
  "group",
  "extensionElements",
  "documentation",
  "ioSpecification",
  "property",
  "laneSet",
  "sequenceFlow",
  "boundaryEvent",
  "dataStore",
  "category",
]);

const isFlowNode = (t: string) => TASKS.has(t) || EVENTS.has(t) || GATEWAYS.has(t) || SUBPROCESSES.has(t) || t === "callActivity";
const clean = (s: string) => s.split(/\s+/).filter(Boolean).join(" ");
const kids = (x: XmlNode, ns: string, local?: string) => x.children.filter((c) => c.ns === ns && (local === undefined || c.local === local));
const childText = (x: XmlNode, local: string) => kids(x, MODEL_NS, local).map((c) => c.text.trim()).filter(Boolean);

/** Reads a BPMN 2.0 file. Unsupported parts become warnings; only unreadable input is an error. */
export function parseBpmn(xml: string): BpmnParseResult {
  if (!xml.trim()) return { ok: false, error: { code: "empty" } };
  if (xml.length > BPMN_MAX_CHARS) return { ok: false, error: { code: "tooLarge" } };
  let root: XmlNode;
  try {
    root = parseXml(xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml);
  } catch (e) {
    if (e instanceof XmlFail) return { ok: false, error: e.info };
    throw e;
  }
  if (root.local !== "definitions" || root.ns !== MODEL_NS) return { ok: false, error: { code: "notBpmn" } };

  const warnings: BpmnWarning[] = [];
  const warn = (code: BpmnWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  const elements: BpmnElement[] = [];
  const flows: BpmnFlow[] = [];
  const lanes: BpmnLane[] = [];
  const participants: BpmnParticipant[] = [];
  const seenIds = new Set<string>();
  let overflow = 0;
  const label = (x: XmlNode) => clean(x.attrs.name ?? "") || (x.attrs.id ?? x.local);

  const addElement = (el: BpmnElement) => {
    if (!el.id || seenIds.has(el.id)) return;
    if (elements.length >= BPMN_MAX_ELEMENTS) {
      overflow++;
      return;
    }
    seenIds.add(el.id);
    elements.push(el);
  };

  const readProcess = (p: XmlNode) => {
    const process = p.attrs.id ?? "";
    for (const c of p.children) {
      if (c.ns !== MODEL_NS) continue;
      const t = c.local;
      const id = c.attrs.id ?? "";
      const base = { id, type: t, name: clean(c.attrs.name ?? ""), process };
      const doc = childText(c, "documentation").join("\n\n");
      const withDoc = doc ? { doc } : {};
      if (t === "boundaryEvent") warn("boundary", label(c));
      else if (SUBPROCESSES.has(t)) {
        if (c.attrs.triggeredByEvent === "true") {
          warn("eventSubprocess", label(c));
          continue;
        }
        const inner = c.children.filter((k) => k.ns === MODEL_NS && isFlowNode(k.local)).length;
        if (inner) warn("subprocess", label(c));
        addElement({ ...base, category: "subprocess", ...withDoc });
      } else if (TASKS.has(t)) addElement({ ...base, category: "task", ...withDoc });
      else if (t === "callActivity") addElement({ ...base, category: "call", ...withDoc });
      else if (GATEWAYS.has(t)) addElement({ ...base, category: "gateway", ...withDoc });
      else if (EVENTS.has(t)) {
        const def = c.children.find((k) => k.ns === MODEL_NS && k.local.endsWith("EventDefinition"));
        const eventKind = def ? def.local.slice(0, -"EventDefinition".length) : undefined;
        addElement({ ...base, category: "event", ...(eventKind ? { eventKind } : {}), ...withDoc });
      } else if (DATA.has(t)) addElement({ ...base, category: "data" });
      else if (!QUIET.has(t)) warn("unsupported", t);

      if (t === "sequenceFlow") {
        flows.push({ id, kind: "sequence", source: c.attrs.sourceRef ?? "", target: c.attrs.targetRef ?? "", name: clean(c.attrs.name ?? "") });
      }
      // data associations live inside the activity: output goes activity -> data, input data -> activity
      for (const a of kids(c, MODEL_NS, "dataOutputAssociation")) {
        for (const target of childText(a, "targetRef")) flows.push({ id: a.attrs.id ?? "", kind: "data", source: id, target, name: "" });
      }
      for (const a of kids(c, MODEL_NS, "dataInputAssociation")) {
        for (const source of childText(a, "sourceRef")) flows.push({ id: a.attrs.id ?? "", kind: "data", source, target: id, name: "" });
      }
    }
    const readLanes = (set: XmlNode) => {
      for (const l of kids(set, MODEL_NS, "lane")) {
        lanes.push({ id: l.attrs.id ?? "", name: clean(l.attrs.name ?? ""), process, nodes: childText(l, "flowNodeRef") });
        for (const inner of kids(l, MODEL_NS, "childLaneSet")) readLanes(inner);
      }
    };
    for (const set of kids(p, MODEL_NS, "laneSet")) readLanes(set);
  };

  for (const c of kids(root, MODEL_NS)) {
    if (c.local === "process") readProcess(c);
    else if (c.local === "collaboration") {
      for (const k of kids(c, MODEL_NS)) {
        if (k.local === "participant") {
          const processRef = k.attrs.processRef;
          participants.push({ id: k.attrs.id ?? "", name: clean(k.attrs.name ?? ""), ...(processRef ? { processRef } : {}) });
        } else if (k.local === "messageFlow") {
          flows.push({ id: k.attrs.id ?? "", kind: "message", source: k.attrs.sourceRef ?? "", target: k.attrs.targetRef ?? "", name: clean(k.attrs.name ?? "") });
        } else if (k.local !== "extensionElements" && k.local !== "documentation" && k.local !== "textAnnotation" && k.local !== "association" && k.local !== "group") {
          warn("unsupported", k.local);
        }
      }
    }
  }
  if (overflow) warn("maxElements", String(overflow));

  // lanes: the innermost lane listed last wins
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (const l of lanes) for (const id of l.nodes) {
    const el = byId.get(id);
    if (el) el.lane = l.id;
  }
  // pools: an expanded pool tags its elements, a collapsed one (no process content) is a block of its own
  for (const p of participants) {
    const own = p.processRef ? elements.filter((e) => e.process === p.processRef) : [];
    if (own.length) for (const e of own) e.participant = p.id;
    else addElement({ id: p.id, type: "participant", category: "participant", name: p.name });
  }

  // diagram coordinates
  const shapes = new Map<string, BpmnBounds>();
  const walkDi = (x: XmlNode) => {
    for (const c of x.children) {
      if (c.ns === DI_NS && c.local === "BPMNShape" && c.attrs.bpmnElement) {
        const b = c.children.find((k) => k.ns === DC_NS && k.local === "Bounds");
        if (b) {
          const v = [b.attrs.x, b.attrs.y, b.attrs.width, b.attrs.height].map((s) => Number(s ?? "0"));
          if (v.every(Number.isFinite)) shapes.set(c.attrs.bpmnElement, { x: v[0]!, y: v[1]!, w: v[2]!, h: v[3]! });
        }
      } else if (c.ns === DI_NS) walkDi(c);
    }
  };
  for (const d of kids(root, DI_NS, "BPMNDiagram")) walkDi(d);
  for (const e of elements) {
    const b = shapes.get(e.id);
    if (b) e.bounds = b;
  }

  if (!elements.length) return { ok: false, error: { code: "noElements" } };
  const name = clean(root.attrs.name ?? "") || participants.find((p) => p.name)?.name || "";
  return { ok: true, model: { name, participants, lanes, elements, flows, warnings } };
}

/* ---------- names and ids ---------- */

const CYR_UZ: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "'", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h", і: "i", ї: "yi", є: "ye", ґ: "g",
};
const CYR_EN: Record<string, string> = { ...CYR_UZ, ж: "zh", х: "kh", щ: "shch", ъ: "", ў: "o", ғ: "gh" };

/** Cyrillic to Latin, the Uzbek way for `uz` and a plain English way for `en` (used for ids too). */
export function transliterate(s: string, to: "uz" | "en"): string {
  const table = to === "uz" ? CYR_UZ : CYR_EN;
  let out = "";
  for (const ch of s) {
    const low = ch.toLowerCase();
    const rep = table[low];
    if (rep === undefined) out += ch;
    else if (low !== ch && rep) out += rep[0]!.toUpperCase() + rep.slice(1);
    else out += rep;
  }
  return out;
}

const hasCyr = (s: string) => {
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x400 && c <= 0x4ff) return true;
  }
  return false;
};

/** A lowercase latin id from any name: transliterated, accents dropped, other characters become dashes. */
export function slugify(name: string, max = 32): string {
  const latin = transliterate(name, "en").normalize("NFKD");
  let out = "";
  let dash = false;
  for (const ch of latin) {
    const c = ch.toLowerCase();
    const code = c.charCodeAt(0);
    const alnum = c.length === 1 && ((code >= 97 && code <= 122) || (code >= 48 && code <= 57));
    if (alnum) {
      if (dash && out) out += "-";
      out += c;
      dash = false;
      if (out.length >= max) break;
    } else if (code >= 0x300 && code <= 0x36f) continue; // combining accent
    else if (c !== "'" && c !== "’" && c !== "ʻ" && c !== "ʼ") dash = true; // o'z -> oz
  }
  let start = 0;
  while (start < out.length && !(out.charCodeAt(start) >= 97 && out.charCodeAt(start) <= 122)) start++;
  out = out.slice(start);
  while (out.endsWith("-")) out = out.slice(0, -1);
  return out;
}

function uniqueSlug(base: string, fallback: string, taken: Set<string>): string {
  const stem = slugify(base) || fallback;
  let id = stem;
  for (let k = 2; taken.has(id); k++) id = `${stem.slice(0, 28)}-${k}`;
  taken.add(id);
  return id;
}

/** A name for one language: uz and en must stay Latin. */
const nameFor = (s: string, lang: AuthorLang) => (lang !== "ru" && hasCyr(s) ? transliterate(s, lang) : s);
const cut = (s: string, max: number) => ([...s].length > max ? `${[...s].slice(0, max - 1).join("").trimEnd()}…` : s);

type Named = "start" | "end" | "event" | "task" | "gateway" | "subprocess" | "call" | "store" | "data" | "participant" | "recap";
const DEFAULT_NAMES: Record<AuthorLang, Record<Named, string>> = {
  en: { start: "Start", end: "End", event: "Event", task: "Task", gateway: "Decision", subprocess: "Subprocess", call: "Call", store: "Data store", data: "Data", participant: "Participant", recap: "Recap" },
  ru: { start: "Старт", end: "Конец", event: "Событие", task: "Задача", gateway: "Развилка", subprocess: "Подпроцесс", call: "Вызов", store: "Хранилище", data: "Данные", participant: "Участник", recap: "Итог" },
  uz: { start: "Boshlanish", end: "Tugash", event: "Hodisa", task: "Vazifa", gateway: "Tanlov", subprocess: "Ichki jarayon", call: "Chaqiruv", store: "Ma'lumotlar ombori", data: "Ma'lumot", participant: "Ishtirokchi", recap: "Xulosa" },
};

function namedAs(e: BpmnElement): Named {
  if (e.type === "startEvent") return "start";
  if (e.type === "endEvent") return "end";
  if (e.category === "event") return "event";
  if (e.category === "data") return e.type === "dataStoreReference" ? "store" : "data";
  return e.category === "task" ? "task" : e.category;
}

/**
 * Scene kinds. There is no "gateway" block, so a gateway is drawn as `lb`: the block that sends
 * one stream down one of several lines, which is what a split does.
 */
export function kindOf(e: BpmnElement): NodeKind {
  switch (e.category) {
    case "task":
      return e.type === "userTask" || e.type === "manualTask" ? "actor" : "service";
    case "event":
      if (e.type === "startEvent" || e.type === "endEvent") return e.eventKind === "timer" ? "worker" : "client";
      return e.eventKind === "timer" ? "worker" : "queue";
    case "gateway":
      return "lb";
    case "subprocess":
      return "worker";
    case "call":
    case "participant":
      return "external";
    case "data":
      return e.type === "dataStoreReference" ? "db" : "storage";
  }
}

/* ---------- order ---------- */

interface Graph {
  ids: string[];
  out: Map<string, string[]>;
}

/**
 * Step order: DFS preorder from the start events gives each node a priority (one branch is told to
 * its end before the next), then Kahn's algorithm keeps every node after its predecessors. Edges
 * that close a loop (back edges of the DFS) do not count, so loops cannot block the order.
 */
export function walkOrder(g: Graph, starts: readonly string[]): { order: string[]; backEdges: [string, string][]; reached: Set<string> } {
  const rank = new Map<string, number>();
  const state = new Map<string, 1 | 2>(); // 1 on the DFS path, 2 done
  const back = new Set<string>();
  const backEdges: [string, string][] = [];
  const dfs = (root: string) => {
    if (state.has(root)) return;
    const stack: { id: string; k: number }[] = [{ id: root, k: 0 }];
    state.set(root, 1);
    rank.set(root, rank.size);
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const next = g.out.get(top.id) ?? [];
      if (top.k >= next.length) {
        state.set(top.id, 2);
        stack.pop();
        continue;
      }
      const to = next[top.k++]!;
      const st = state.get(to);
      if (st === 1) {
        const key = `${top.id}\u0000${to}`;
        if (!back.has(key)) backEdges.push([top.id, to]);
        back.add(key);
      } else if (st === undefined) {
        state.set(to, 1);
        rank.set(to, rank.size);
        stack.push({ id: to, k: 0 });
      }
    }
  };
  for (const s of starts) dfs(s);
  const reached = new Set(rank.keys());
  for (const id of g.ids) dfs(id);

  const indeg = new Map(g.ids.map((id) => [id, 0]));
  for (const [from, tos] of g.out) for (const to of tos) if (!back.has(`${from}\u0000${to}`)) indeg.set(to, (indeg.get(to) ?? 0) + 1);
  const ready = g.ids.filter((id) => indeg.get(id) === 0);
  const order: string[] = [];
  while (ready.length) {
    let best = 0;
    for (let k = 1; k < ready.length; k++) if (rank.get(ready[k]!)! < rank.get(ready[best]!)!) best = k;
    const id = ready.splice(best, 1)[0]!;
    order.push(id);
    for (const to of g.out.get(id) ?? []) {
      if (back.has(`${id}\u0000${to}`)) continue;
      const d = indeg.get(to)! - 1;
      indeg.set(to, d);
      if (d === 0) ready.push(to);
    }
  }
  return { order, backEdges, reached };
}

/* ---------- layout ---------- */

/** Ranks of values, close values sharing a rank, then squeezed into `0..slots-1`. */
function ranks(values: number[], gap: number, slots: number): number[] {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const rankOf = new Map<number, number>();
  let r = -1;
  let last = -Infinity;
  for (const v of sorted) {
    if (v - last > gap) r++;
    rankOf.set(v, r);
    last = v;
  }
  const count = r + 1;
  return values.map((v) => {
    const k = rankOf.get(v)!;
    return count > slots ? Math.round((k * (slots - 1)) / (count - 1)) : k;
  });
}

const LATTICE = GRID_MAX / 2 + 1; // cells 0, 2, .., 12

/** Lattice spots (two cells apart, so no two blocks are "close"), nearest free one on collision. */
function place(points: [number, number][]): [number, number][] {
  const used = new Set<string>();
  return points.map(([x, y]) => {
    for (let r = 0; r < LATTICE; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= LATTICE || py >= LATTICE || used.has(`${px},${py}`)) continue;
          used.add(`${px},${py}`);
          return [px * 2, py * 2] as [number, number];
        }
      }
    }
    // more blocks than lattice spots: BPMN_MAX_NODES keeps this unreachable
    return [x * 2, y * 2] as [number, number];
  });
}

/* ---------- draft ---------- */

export interface BpmnImport {
  draft: Draft;
  warnings: BpmnWarning[];
  /** BPMN element id -> block id */
  ids: Record<string, string>;
}

/**
 * Model -> draft skeleton. Every block and line is on the scene from the first step; each step
 * puts one flow element in focus, in process order, and a recap closes the lesson. Names go to
 * `lang` as written; the other languages get a copy (Latin for uz and en) to translate. The
 * element documentation becomes the step text in `lang`.
 */
export function bpmnToDraft(model: BpmnModel, lang: AuthorLang): BpmnImport {
  const warnings: BpmnWarning[] = [...model.warnings];
  const warn = (code: BpmnWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  const els = new Map(model.elements.map((e) => [e.id, e]));
  const display = (e: BpmnElement) => e.name || DEFAULT_NAMES.en[namedAs(e)];
  const list = (ids: readonly string[]) => {
    const names = ids.map((id) => (els.get(id) ? display(els.get(id)!) : id));
    return names.length > 5 ? `${names.slice(0, 5).join(", ")}, +${names.length - 5}` : names.join(", ");
  };

  // a message flow may point at a whole expanded pool: use its first or last element instead
  const poolEnd = (pid: string, asSource: boolean) => {
    const own = model.elements.filter((e) => e.participant === pid && e.category !== "data");
    if (!own.length) return undefined;
    const pick = asSource ? own.filter((e) => e.type === "endEvent") : own.filter((e) => e.type === "startEvent");
    return (pick[0] ?? (asSource ? own[own.length - 1] : own[0]))!.id;
  };
  const resolveRef = (ref: string, asSource: boolean) => (els.has(ref) ? ref : model.participants.some((p) => p.id === ref) ? poolEnd(ref, asSource) : undefined);

  const flows: BpmnFlow[] = [];
  const dangling: string[] = [];
  for (const f of model.flows) {
    const source = resolveRef(f.source, true);
    const target = resolveRef(f.target, false);
    if (!source || !target) {
      dangling.push(f.name || f.id || `${f.source} > ${f.target}`);
      continue;
    }
    if (source === target) {
      warn("selfLoop", display(els.get(source)!));
      continue;
    }
    flows.push({ ...f, source, target });
  }
  if (dangling.length) warn("danglingFlow", dangling.length > 5 ? `${dangling.slice(0, 5).join(", ")}, +${dangling.length - 5}` : dangling.join(", "));

  // steps follow flow elements only: a data store or a pool has no step, and as an order root it
  // would push an unreachable element ahead of the start event
  const isStep = (id: string) => {
    const c = els.get(id)!.category;
    return c !== "data" && c !== "participant";
  };
  const ids = model.elements.map((e) => e.id).filter(isStep);
  const out = new Map<string, string[]>();
  for (const f of flows) if (isStep(f.source) && isStep(f.target)) out.set(f.source, [...(out.get(f.source) ?? []), f.target]);
  let starts = model.elements.filter((e) => e.type === "startEvent").map((e) => e.id);
  if (!starts.length) {
    const hasIn = new Set(flows.filter((f) => f.kind !== "data").map((f) => f.target));
    starts = ids.filter((id) => !hasIn.has(id));
    warn("noStart");
  }
  const { order: flowNodes, backEdges, reached } = walkOrder({ ids, out }, starts);
  const loops = backEdges.filter(([a, b]) => flows.some((f) => f.kind === "sequence" && f.source === a && f.target === b));
  if (loops.length) warn("loop", list([...new Set(loops.map(([, b]) => b))]));
  const unreachable = flowNodes.filter((id) => !reached.has(id));
  if (unreachable.length && starts.length) warn("unreachable", list(unreachable));

  // blocks: flow elements in order first, then data and pools
  const others = model.elements.map((e) => e.id).filter((id) => !isStep(id));
  const all = [...flowNodes, ...others];
  const kept = all.slice(0, BPMN_MAX_NODES);
  if (all.length > kept.length) warn("maxNodes", String(all.length - kept.length));
  const keptSet = new Set(kept);

  const nodeIds = new Set<string>();
  const idOf: Record<string, string> = {};
  for (const id of kept) idOf[id] = uniqueSlug(display(els.get(id)!), DEFAULT_NAMES.en[namedAs(els.get(id)!)].toLowerCase().replace(" ", "-"), nodeIds);

  // layout: diagram coordinates when every block has them, else layers along the order
  let points: [number, number][];
  const withBounds = kept.filter((id) => els.get(id)!.bounds);
  if (withBounds.length === kept.length) {
    const cx = kept.map((id) => {
      const b = els.get(id)!.bounds!;
      return b.x + b.w / 2;
    });
    const cy = kept.map((id) => {
      const b = els.get(id)!.bounds!;
      return b.y + b.h / 2;
    });
    const rx = ranks(cx, 60, LATTICE);
    const ry = ranks(cy, 40, LATTICE);
    points = kept.map((_, k) => [rx[k]!, ry[k]!]);
  } else {
    if (withBounds.length) warn("partialLayout");
    const layer = new Map<string, number>();
    const pos = new Map(flowNodes.map((id, k) => [id, k]));
    for (const id of flowNodes) {
      const l = layer.get(id) ?? 0;
      layer.set(id, l);
      for (const to of out.get(id) ?? []) if (pos.get(to)! > pos.get(id)!) layer.set(to, Math.max(layer.get(to) ?? 0, l + 1));
    }
    // a data store or a pool sits in the layer of the first element it is linked to
    for (const id of others) {
      const near = flows.find((f) => (f.source === id && layer.has(f.target)) || (f.target === id && layer.has(f.source)));
      layer.set(id, near ? layer.get(near.source === id ? near.target : near.source)! : 0);
    }
    const rowIn = new Map<number, number>();
    const row = new Map<string, number>();
    for (const id of kept) {
      const l = layer.get(id) ?? 0;
      row.set(id, rowIn.get(l) ?? 0);
      rowIn.set(l, (rowIn.get(l) ?? 0) + 1);
    }
    const rx = ranks(kept.map((id) => layer.get(id) ?? 0), 0, LATTICE);
    const ry = ranks(kept.map((id) => row.get(id)!), 0, LATTICE);
    points = kept.map((_, k) => [rx[k]!, ry[k]!]);
  }
  const cells = place(points);

  const nodes: Record<string, NodeState> = {};
  kept.forEach((id, k) => {
    const nid = idOf[id]!;
    nodes[nid] = { id: nid, kind: kindOf(els.get(id)!), at: cells[k]!, state: "ok" };
  });

  const edgeIds = new Set<string>();
  const edges: Record<string, EdgeState> = {};
  for (const f of flows) {
    if (!keptSet.has(f.source) || !keptSet.has(f.target)) continue;
    const from = idOf[f.source]!;
    const to = idOf[f.target]!;
    const eid = uniqueSlug(f.name || `${from.slice(0, 15)}-${to.slice(0, 15)}`, "line", edgeIds);
    edges[eid] = { id: eid, from, to, flow: "request", rate: 1, cut: false, ...(f.kind === "message" ? { mode: "async" as const } : {}) };
  }

  const labels = {} as Record<AuthorLang, Record<string, string>>;
  for (const l of AUTHOR_LANGS) {
    labels[l] = {};
    for (const id of kept) {
      const e = els.get(id)!;
      labels[l][idOf[id]!] = cut(nameFor(e.name || DEFAULT_NAMES[l][namedAs(e)], l), 48);
    }
  }

  const stepNodes = flowNodes.filter((id) => keptSet.has(id));
  const stepped = stepNodes.slice(0, BPMN_MAX_STEPS - 1);
  if (stepNodes.length > stepped.length) warn("maxSteps", String(stepNodes.length - stepped.length));
  const stepIds = new Set<string>(["recap"]);
  const steps: DraftStep[] = stepped.map((id, k) => {
    const e = els.get(id)!;
    const s = blankStep(uniqueSlug(idOf[id]!, "step", stepIds), k === 0 ? "problem" : "case");
    s.nodes = JSON.parse(JSON.stringify(nodes)) as Record<string, NodeState>;
    s.edges = JSON.parse(JSON.stringify(edges)) as Record<string, EdgeState>;
    s.focus = [idOf[id]!];
    for (const l of AUTHOR_LANGS) {
      const title = nameFor(e.name || DEFAULT_NAMES[l][namedAs(e)], l);
      s.text[l].title = cut(title, 120);
      s.text[l].short = cut(title, 24);
    }
    if (e.doc) s.text[lang].body = e.doc.slice(0, 4000);
    return s;
  });
  const recap = blankStep("recap", "recap");
  recap.nodes = JSON.parse(JSON.stringify(nodes)) as Record<string, NodeState>;
  recap.edges = JSON.parse(JSON.stringify(edges)) as Record<string, EdgeState>;
  for (const l of AUTHOR_LANGS) {
    recap.text[l].title = DEFAULT_NAMES[l].recap;
    recap.text[l].short = DEFAULT_NAMES[l].recap;
  }
  steps.push(recap);

  const title = model.name;
  const slug = slugify(title, 40) || "bpmn-lesson";
  const draft: Draft = {
    v: 1,
    slug,
    level: "beginner",
    minutes: Math.max(3, Math.min(30, steps.length)),
    title: { uz: nameFor(title, "uz"), ru: title, en: nameFor(title, "en") },
    summary: { uz: "", ru: "", en: "" },
    learn: { uz: [], ru: [], en: [] },
    labels,
    metrics: [],
    steps,
  };
  if (kept.some((id) => els.get(id)!.name)) warn("translate");
  return { draft: normalize(draft), warnings, ids: idOf };
}

/** Nothing the author wrote or drew beyond the starter draft: replacing it needs no question. */
export function isBlankDraft(d: Draft): boolean {
  const starter = new Set(["client", "api"]);
  return AUTHOR_LANGS.every(
    (l) =>
      !d.title[l].trim() &&
      !d.summary[l].trim() &&
      !d.learn[l].some((x) => x.trim()) &&
      d.steps.every((s) => {
        const t = s.text[l];
        return !t.short.trim() && !t.title.trim() && !t.body.trim() && !t.watch.trim();
      }),
  ) && d.metrics.length === 0 && d.steps.every((s) => !s.exchange && Object.keys(s.nodes).every((id) => starter.has(id)));
}

/** Parse and convert in one go: the shape the editor needs. */
export function importBpmn(xml: string, lang: AuthorLang): { ok: true; result: BpmnImport } | { ok: false; error: BpmnError } {
  const p = parseBpmn(xml);
  return p.ok ? { ok: true, result: bpmnToDraft(p.model, lang) } : p;
}
