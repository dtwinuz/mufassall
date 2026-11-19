import type { EdgeMode, Flow, NodeKind, WireFormat } from "@mufassall/scene-schema";
import { mainChoice, splitBranches, walkOrder } from "./bpmn";
import {
  IMPORT_MAX_CASE_STEPS,
  IMPORT_MAX_NODES,
  IMPORT_MAX_STEPS,
  IMPORT_MIN_STEPS,
  type ImportWarning,
  type ImportWarningCode,
  type KitBeat,
  type KitCase,
  type KitEdge,
  type KitMessage,
  type KitNode,
  type PerLang,
  buildDraft,
  centredRows,
  clip,
  fillIn,
  kindFromName,
  listIn,
  oneLine,
  perLangOf,
} from "./importkit";
import type { AuthorLang, Draft } from "./model";

/*
 * Mermaid flowchart / sequenceDiagram -> a playable draft. The text is read by a linear hand
 * scanner (indexOf and char loops, no regex over the input), the same way bpmn.ts reads XML.
 */

export const MERMAID_MAX_CHARS = 1_000_000;
export const MERMAID_MAX_STATEMENTS = 20_000;

export type MermaidKind = "mermaid-flowchart" | "mermaid-sequence";
export type MermaidErrorCode = "empty" | "tooLarge" | "notMermaid" | "noNodes";

export interface MermaidNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** a `{...}` (diamond) shape in a flowchart */
  decision?: boolean;
}

export interface MermaidEdge {
  from: string;
  to: string;
  label: string;
  style: "solid" | "dotted" | "thick" | "cross";
}

export interface MermaidMessage {
  from: string;
  to: string;
  text: string;
  /** `-->>`: drawn dashed, usually an answer */
  dashed: boolean;
  /** `-x`: the message is lost */
  lost: boolean;
  /** `-)`: fire and forget */
  async: boolean;
  /** index in `MermaidModel.branches`; none for the base story */
  branch?: number;
}

/** A sequence block section off the base story: an `else`, an `option`, a `break` body. */
export interface MermaidBranch {
  kind: "alt" | "critical" | "break";
  label: string;
  /** messages read before the block opened: the case branches after the last base one of them */
  at: number;
}

export interface MermaidModel {
  kind: MermaidKind;
  title: string;
  direction: "LR" | "TD";
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  messages: MermaidMessage[];
  branches: MermaidBranch[];
  warnings: ImportWarning[];
}

export type MermaidImport = { draft: Draft; warnings: ImportWarning[]; kind: MermaidKind };
export type MermaidResult = { ok: true; result: MermaidImport } | { ok: false; error: { code: MermaidErrorCode } };

/* ---------- text ---------- */

const NAMED: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", apos: "'", num: "#", semi: ";" };

/** Mermaid `#35;` / `#quot;` entities, `<br>` and markdown backticks; quotes around the whole text go. */
export function mermaidLabel(raw: string): string {
  let s = raw.trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') s = s.slice(1, -1);
  if (s.length >= 2 && s[0] === "`" && s[s.length - 1] === "`") s = s.slice(1, -1);
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === "#") {
      const semi = s.indexOf(";", i + 1);
      if (semi > i + 1 && semi - i <= 10) {
        const ref = s.slice(i + 1, semi);
        let ch: string | undefined = NAMED[ref];
        if (ch === undefined && isDigits(ref)) {
          const code = Number(ref);
          if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) ch = String.fromCodePoint(code);
        }
        if (ch !== undefined) {
          out += ch;
          i = semi + 1;
          continue;
        }
      }
    } else if (c === "<") {
      const close = s.indexOf(">", i + 1);
      const tag = close > i ? s.slice(i + 1, close).trim().toLowerCase() : "";
      if (tag === "br" || tag === "br/" || tag === "br /") {
        out += " ";
        i = close + 1;
        continue;
      }
    }
    out += c;
    i++;
  }
  return oneLine(out);
}

const isDigits = (s: string) => s.length > 0 && [...s].every((ch) => ch >= "0" && ch <= "9");
const isSpace = (c: string | undefined) => c === " " || c === "\t";
function isIdChar(c: string | undefined): boolean {
  if (c === undefined) return false;
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || c === "_" || (code > 127 && c.toLowerCase() !== c.toUpperCase());
}

/** The `;` at `semi` closes a `#38;` / `#quot;` entity, not a statement. */
function endsEntity(line: string, semi: number): boolean {
  let k = semi - 1;
  while (k >= 0 && semi - k <= 9 && isIdChar(line[k])) k--;
  return k >= 0 && k < semi - 1 && line[k] === "#";
}

/** Lines, then `;`-separated statements outside quotes; `%%` comment lines dropped. */
function statements(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) continue;
    let start = 0;
    let quote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') quote = !quote;
      else if (c === ";" && !quote && !endsEntity(line, i)) {
        const st = line.slice(start, i).trim();
        if (st) out.push(st);
        start = i + 1;
      }
    }
    const st = line.slice(start).trim();
    if (st) out.push(st);
    if (out.length > MERMAID_MAX_STATEMENTS) break;
  }
  return out;
}

/** Drops a `---` front matter block, returning its `title:`. */
function frontMatter(text: string): { body: string; title: string } {
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const head = t.trimStart();
  if (!head.startsWith("---")) return { body: t, title: "" };
  const firstNl = head.indexOf("\n");
  if (firstNl < 0) return { body: t, title: "" };
  const end = head.indexOf("\n---", firstNl);
  if (end < 0) return { body: t, title: "" };
  let title = "";
  for (const line of head.slice(firstNl + 1, end).split("\n")) {
    const l = line.trim();
    if (l.startsWith("title:")) title = mermaidLabel(l.slice(6));
  }
  const after = head.indexOf("\n", end + 4);
  return { body: after < 0 ? "" : head.slice(after + 1), title };
}

const firstWord = (s: string) => {
  let i = 0;
  while (i < s.length && !isSpace(s[i])) i++;
  return s.slice(0, i);
};

/* ---------- flowchart ---------- */

const OPENERS = ["(((", "((", "([", "[(", "[[", "[/", "[\\", "{{", "(", "[", "{", ">"] as const;
type Opener = (typeof OPENERS)[number];
const CLOSERS: Record<Opener, string[]> = {
  "(((": [")))"],
  "((": ["))"],
  "([": ["])"],
  "[(": [")]"],
  "[[": ["]]"],
  "[/": ["/]", "\\]"],
  "[\\": ["\\]", "/]"],
  "{{": ["}}"],
  "(": [")"],
  "[": ["]"],
  "{": ["}"],
  ">": ["]"],
};
const SHAPE_KIND: Record<Opener, NodeKind> = {
  "(((": "actor",
  "((": "actor",
  "([": "client",
  "[(": "db",
  "[[": "queue",
  "[/": "cdn",
  "[\\": "cdn",
  "{{": "cache",
  "(": "worker",
  "[": "service",
  "{": "lb",
  ">": "external",
};
/** shapes too generic to say what the block is: the name decides */
const PLAIN = new Set<Opener | "">(["", "[", "("]);

interface NodeRef {
  id: string;
  label?: string;
  shape: Opener | "";
}

interface Link {
  label: string;
  style: MermaidEdge["style"];
  reverse: boolean;
  invisible: boolean;
}

class Scanner {
  i = 0;
  constructor(readonly s: string) {}
  get done() {
    return this.i >= this.s.length;
  }
  spaces() {
    while (isSpace(this.s[this.i])) this.i++;
  }
  id(): string {
    const s = this.s;
    const start = this.i;
    while (this.i < s.length) {
      const c = s[this.i];
      if (isIdChar(c)) this.i++;
      // a dash inside a name (my-api), not the start of an arrow (a-->b, a-.->b)
      else if (c === "-" && isIdChar(s[this.i + 1]) && this.i > start) this.i++;
      else break;
    }
    return s.slice(start, this.i);
  }
  node(): NodeRef | undefined {
    const id = this.id();
    if (!id) return undefined;
    const s = this.s;
    let shape: Opener | "" = "";
    let label: string | undefined;
    if (s.startsWith("@{", this.i)) {
      const end = s.indexOf("}", this.i + 2);
      if (end < 0) return undefined;
      const body = s.slice(this.i + 2, end);
      label = attr(body, "label");
      const sh = attr(body, "shape") ?? "";
      shape = sh === "cyl" || sh === "db" || sh === "database" ? "[(" : sh === "circle" ? "((" : sh === "diam" || sh === "diamond" ? "{" : sh === "hex" ? "{{" : "[";
      this.i = end + 1;
    } else {
      const op = OPENERS.find((o) => s.startsWith(o, this.i));
      if (op) {
        let from = this.i + op.length;
        while (isSpace(s[from])) from++;
        let scanFrom = from;
        if (s[from] === '"') {
          const q = s.indexOf('"', from + 1);
          if (q < 0) return undefined;
          scanFrom = q + 1;
        }
        let close = -1;
        let closer = "";
        for (const c of CLOSERS[op]) {
          const k = s.indexOf(c, scanFrom);
          if (k >= 0 && (close < 0 || k < close)) {
            close = k;
            closer = c;
          }
        }
        if (close < 0) return undefined;
        shape = op;
        label = mermaidLabel(s.slice(from, close));
        this.i = close + closer.length;
      }
    }
    if (s.startsWith(":::", this.i)) {
      this.i += 3;
      this.id();
    }
    return label === undefined ? { id, shape } : { id, shape, label };
  }
  group(): NodeRef[] | undefined {
    const out: NodeRef[] = [];
    for (;;) {
      this.spaces();
      const n = this.node();
      if (!n) return undefined;
      out.push(n);
      this.spaces();
      if (this.s[this.i] !== "&") return out;
      this.i++;
    }
  }
  link(): Link | undefined {
    const s = this.s;
    const start = this.i;
    let reverse = false;
    if (s[this.i] === "~") {
      while (s[this.i] === "~") this.i++;
      return this.i - start >= 3 ? { label: "", style: "solid", reverse: false, invisible: true } : undefined;
    }
    if (s[this.i] === "<") {
      reverse = true;
      this.i++;
    }
    const run = () => {
      const from = this.i;
      while (s[this.i] === "-" || s[this.i] === "=" || s[this.i] === ".") this.i++;
      return s.slice(from, this.i);
    };
    let body = run();
    if (!body) {
      this.i = start;
      return undefined;
    }
    let label = "";
    let head = "";
    const takeHead = () => {
      const c = s[this.i];
      if (c === ">") {
        head = ">";
        this.i++;
      } else if ((c === "x" || c === "o") && (this.i + 1 >= s.length || isSpace(s[this.i + 1]) || s[this.i + 1] === "|")) {
        head = c;
        this.i++;
      }
    };
    takeHead();
    if (!head && !reverse && (body === "--" || body === "==" || body === "-.") && isSpace(s[this.i])) {
      // text form: A -- text --> B, A == text ==> B, A -. text .-> B
      const closeTok = body === "-." ? ".-" : body;
      const close = s.indexOf(closeTok, this.i);
      if (close < 0) {
        this.i = start;
        return undefined;
      }
      label = mermaidLabel(s.slice(this.i, close));
      this.i = close;
      body += run();
      takeHead();
    }
    const save = this.i;
    this.spaces();
    if (s[this.i] === "|") {
      const end = s.indexOf("|", this.i + 1);
      if (end < 0) {
        this.i = start;
        return undefined;
      }
      label = mermaidLabel(s.slice(this.i + 1, end));
      this.i = end + 1;
    } else this.i = save;
    const style: MermaidEdge["style"] = head === "x" ? "cross" : body.includes(".") ? "dotted" : body.includes("=") ? "thick" : "solid";
    return { label, style, reverse: reverse && head !== ">", invisible: false };
  }
}

/** `key: value` or `key: "value"` inside a `@{ ... }` block. */
function attr(body: string, key: string): string | undefined {
  const k = body.indexOf(key);
  if (k < 0) return undefined;
  const colon = body.indexOf(":", k + key.length);
  if (colon < 0) return undefined;
  let v = body.slice(colon + 1).trimStart();
  if (v[0] === '"') {
    const q = v.indexOf('"', 1);
    return q < 0 ? undefined : mermaidLabel(v.slice(1, q));
  }
  const comma = v.indexOf(",");
  if (comma >= 0) v = v.slice(0, comma);
  return v.trim();
}

const SKIP_FLOW = new Set(["classDef", "class", "style", "linkStyle", "click", "direction", "accTitle", "accDescr", "title", "callback", "href"]);

function readFlowchart(stmts: string[], header: string, title: string): MermaidModel {
  const warnings: ImportWarning[] = [];
  const unsupported: string[] = [];
  const dir = header.split(" ").filter(Boolean)[1]?.toUpperCase() ?? "TD";
  const nodes = new Map<string, MermaidNode & { shape: Opener | "" }>();
  const edges: MermaidEdge[] = [];
  let subgraphs = 0;
  let docTitle = title;
  const touch = (r: NodeRef) => {
    const cur = nodes.get(r.id);
    if (!cur) nodes.set(r.id, { id: r.id, label: r.label ?? "", kind: "service", shape: r.shape });
    else if (r.label !== undefined && (!cur.label || r.shape)) {
      cur.label = r.label;
      cur.shape = r.shape;
    }
  };
  for (const st of stmts) {
    const w = firstWord(st);
    if (w === "subgraph") {
      subgraphs++;
      continue;
    }
    if (w === "end" && st === "end") continue;
    if (SKIP_FLOW.has(w)) {
      if (w === "title" && !docTitle) docTitle = mermaidLabel(st.slice(5));
      continue;
    }
    const sc = new Scanner(st);
    let from = sc.group();
    if (!from) {
      unsupported.push(clip(st, 40));
      continue;
    }
    for (const r of from) touch(r);
    for (;;) {
      sc.spaces();
      if (sc.done) break;
      const link = sc.link();
      const to = link ? sc.group() : undefined;
      if (!link || !to) {
        unsupported.push(clip(st, 40));
        break;
      }
      for (const r of to) touch(r);
      if (!link.invisible) {
        for (const a of from) for (const b of to) {
          const [x, y] = link.reverse ? [b.id, a.id] : [a.id, b.id];
          edges.push({ from: x, to: y, label: link.label, style: link.style });
        }
      }
      from = to;
    }
  }
  if (subgraphs) warnings.push({ code: "subgraph", x: String(subgraphs) });
  if (unsupported.length) warnings.push({ code: "unsupported", x: unsupported.slice(0, 3).join(" | ") + (unsupported.length > 3 ? `, +${unsupported.length - 3}` : "") });
  const list: MermaidNode[] = [...nodes.values()].map((n) => {
    const name = n.label || n.id;
    let kind = SHAPE_KIND[n.shape as Opener] ?? "service";
    const guess = kindFromName(name);
    if (PLAIN.has(n.shape) && guess) kind = guess;
    else if (n.shape === "[(" && guess === "storage") kind = "storage";
    return { id: n.id, label: n.label, kind, ...(n.shape === "{" ? { decision: true } : {}) };
  });
  return { kind: "mermaid-flowchart", title: docTitle, direction: dir === "LR" || dir === "RL" ? "LR" : "TD", nodes: list, edges, messages: [], branches: [], warnings };
}

/* ---------- sequence ---------- */

const BLOCKS = new Set(["loop", "alt", "else", "opt", "par", "and", "critical", "option", "break", "rect", "end", "box"]);
const SKIP_SEQ = new Set(["activate", "deactivate", "autonumber", "title", "accTitle", "accDescr", "links", "link", "properties", "details", "destroy"]);

function readSequence(stmts: string[], title: string): MermaidModel {
  const warnings: ImportWarning[] = [];
  const nodes = new Map<string, MermaidNode>();
  const messages: MermaidMessage[] = [];
  const blocks = new Set<string>();
  const unsupported: string[] = [];
  let notes = 0;
  let selfLoops = 0;
  let docTitle = title;
  // open blocks; `cur` is the branch the messages inside belong to (none: the base story)
  const branches: MermaidBranch[] = [];
  const stack: { w: string; cur: number | undefined; at: number }[] = [];
  const here = () => stack[stack.length - 1]?.cur;
  const declare = (id: string, label: string, actor: boolean) => {
    const cur = nodes.get(id);
    const kind: NodeKind = actor ? "actor" : (kindFromName(label || id) ?? "service");
    if (!cur) nodes.set(id, { id, label, kind });
    else if (label) Object.assign(cur, { label, kind: actor ? "actor" : cur.kind === "actor" ? "actor" : kind });
  };
  for (let st of stmts) {
    let w = firstWord(st);
    if (w === "create") {
      st = st.slice(6).trim();
      w = firstWord(st);
    }
    const lw = w.toLowerCase();
    if (lw === "note") {
      notes++;
      continue;
    }
    if (BLOCKS.has(w)) {
      const text = mermaidLabel(st.slice(w.length));
      const outer = here();
      if (w === "end") stack.pop();
      else if (w === "else" || w === "option") {
        const top = stack[stack.length - 1];
        // the first section stays in the base story; each later one is a case (nested: flattened)
        if (top && (top.w === "alt" || top.w === "critical")) {
          const parent = stack[stack.length - 2]?.cur;
          if (parent === undefined) {
            branches.push({ kind: top.w === "alt" ? "alt" : "critical", label: text, at: top.at });
            top.cur = branches.length - 1;
          }
        }
      } else if (w === "break") {
        if (outer === undefined) branches.push({ kind: "break", label: text, at: messages.length });
        stack.push({ w, cur: outer ?? branches.length - 1, at: messages.length });
      } else if (w !== "and") {
        if (w !== "alt" && w !== "critical") blocks.add(w);
        stack.push({ w, cur: outer, at: messages.length });
      }
      continue;
    }
    if (SKIP_SEQ.has(w)) {
      if (w === "title" && !docTitle) docTitle = mermaidLabel(st.slice(5).replace(":", ""));
      continue;
    }
    if (w === "participant" || w === "actor") {
      let rest = st.slice(w.length).trim();
      const meta = rest.indexOf("@{");
      let typed: NodeKind | undefined;
      if (meta >= 0) {
        const type = attr(rest.slice(meta + 2), "type") ?? "";
        typed = type === "database" ? "db" : type === "queue" ? "queue" : type === "boundary" || type === "entity" ? "service" : type === "actor" ? "actor" : undefined;
        rest = rest.slice(0, meta).trim();
      }
      const as = rest.indexOf(" as ");
      const id = (as >= 0 ? rest.slice(0, as) : rest).trim();
      const label = as >= 0 ? mermaidLabel(rest.slice(as + 4)) : "";
      if (!id) continue;
      declare(id, label, w === "actor" || typed === "actor");
      if (typed && typed !== "actor") nodes.get(id)!.kind = typed;
      continue;
    }
    const m = parseMessage(st);
    if (!m) {
      unsupported.push(clip(st, 40));
      continue;
    }
    if (!nodes.has(m.from)) declare(m.from, "", false);
    if (!nodes.has(m.to)) declare(m.to, "", false);
    if (m.from === m.to) {
      selfLoops++;
      continue;
    }
    const b = here();
    messages.push(b === undefined ? m : { ...m, branch: b });
  }
  if (notes) warnings.push({ code: "notes", x: String(notes) });
  if (blocks.size) warnings.push({ code: "blocks", x: [...blocks].join(", ") });
  if (selfLoops) warnings.push({ code: "selfLoop", x: String(selfLoops) });
  if (unsupported.length) warnings.push({ code: "unsupported", x: unsupported.slice(0, 3).join(" | ") + (unsupported.length > 3 ? `, +${unsupported.length - 3}` : "") });
  return { kind: "mermaid-sequence", title: docTitle, direction: "LR", nodes: [...nodes.values()], edges: [], messages, branches, warnings };
}

/** `A->>B: text`, `A-->>+B: text`, `A-x B`, `A-)B: text` */
function parseMessage(st: string): MermaidMessage | undefined {
  const dash = st.indexOf("-");
  if (dash <= 0) return undefined;
  const from = st.slice(0, dash).trim();
  let i = dash;
  let dashes = 0;
  while (st[i] === "-") {
    i++;
    dashes++;
  }
  if (dashes > 2) return undefined;
  let lost = false;
  let async = false;
  if (st.startsWith(">>", i)) i += 2;
  else if (st[i] === ">") i++;
  else if (st[i] === "x") {
    lost = true;
    i++;
  } else if (st[i] === ")") {
    async = true;
    i++;
  } else return undefined;
  if (st[i] === "+" || st[i] === "-") i++;
  const colon = st.indexOf(":", i);
  const to = (colon < 0 ? st.slice(i) : st.slice(i, colon)).trim();
  if (!from || !to) return undefined;
  for (const id of [from, to]) for (const c of id) if (!isIdChar(c) && c !== "-" && c !== "." && c !== " ") return undefined;
  return { from, to, text: colon < 0 ? "" : mermaidLabel(st.slice(colon + 1)), dashed: dashes === 2, lost, async };
}

/* ---------- parse ---------- */

export type MermaidParse = { ok: true; model: MermaidModel } | { ok: false; error: { code: MermaidErrorCode } };

export function parseMermaid(text: string): MermaidParse {
  const fail = (code: MermaidErrorCode): MermaidParse => ({ ok: false, error: { code } });
  if (text.length > MERMAID_MAX_CHARS) return fail("tooLarge");
  if (!text.trim()) return fail("empty");
  const fm = frontMatter(text.split("\r").join(""));
  const stmts = statements(fm.body).filter((s) => !(s.startsWith("%%{") || s.startsWith("---")));
  const header = stmts[0] ?? "";
  const w = firstWord(header);
  let model: MermaidModel;
  if (w === "flowchart" || w === "graph" || w === "flowchart-elk") model = readFlowchart(stmts.slice(1), header, fm.title);
  else if (w === "sequenceDiagram") model = readSequence(stmts.slice(1), fm.title);
  else return fail("notMermaid");
  if (stmts.length > MERMAID_MAX_STATEMENTS) model.warnings.push({ code: "maxNodes", x: String(stmts.length - MERMAID_MAX_STATEMENTS) });
  if (!model.nodes.length) return fail("noNodes");
  return { ok: true, model };
}

/* ---------- texts ---------- */

const T = {
  en: {
    flowTitle: "Flow: {a} to {z}",
    seqTitle: "Messages: {p}",
    flowSummary: "{n} blocks and {e} lines, walked step by step from {a}: what each block receives and passes on.",
    seqSummary: "{m} messages between {n} participants, one step per message, in the order they are sent.",
    flowLearn: ["Where the flow starts and where it ends", "What each block hands to the next one", "What happens when one block stops"],
    seqLearn: ["Who sends which message to whom", "Which messages wait for an answer", "What happens when one participant stops answering"],
    start: "The flow starts at {node}.",
    from: "{node} receives from {prev}{via}.",
    next: " It passes on to {list}.",
    end: " This is where this path ends.",
    via: " ({x})",
    send: "{from} sends {to} the message \"{text}\".",
    reply: " {to} answers \"{x}\".",
    lost: " The message is lost on the way.",
    async: " The sender does not wait for an answer.",
    overTitle: "The whole picture",
    overShort: "Overview",
    overBody: "{n} blocks and {e} lines. Follow the lines: each one is a call or a message from one block to another.",
    failTitle: "What if {node} stops?",
    failShort: "Failure",
    failBody: "If {node} is down, the calls to it fail{prev} and nothing it would pass on goes further{next}.",
    failPrev: " (from {x})",
    failNext: " (to {x})",
    fixTitle: "{node} is back",
    fixShort: "Recovery",
    fixBody: "When {node} answers again, the flow goes on as in the steps before. Retries and timeouts decide how much was lost meanwhile.",
    pathTitle: "One path end to end",
    pathShort: "Path",
    pathBody: "Along the longest path: {list}. The slowest block on it sets the pace for the whole flow.",
    linesTitle: "What the lines mean",
    linesShort: "Lines",
    linesBody: "A solid line is a call that waits for an answer, a dotted one a message that does not wait, a crossed one a message that can be lost.",
    recap: "Recap",
    flowRecap: "The flow goes from {a} to {z} through {n} blocks. Each block takes what the previous one sends and passes it on; when one stops, everything after it waits.",
    seqRecap: "{n} participants exchange {m} messages in a fixed order, and {a} starts it. Every message that waits for an answer is a place where a slow or silent participant holds everyone up.",
    altCase: "Other branch {n}",
    breakCase: "Break {n}",
  },
  ru: {
    flowTitle: "Поток: от {a} до {z}",
    seqTitle: "Обмен сообщениями: {p}",
    flowSummary: "{n} блоков и {e} линий по шагам, начиная с {a}: что каждый блок получает и передаёт дальше.",
    seqSummary: "{m} сообщений между участниками ({n}), по шагу на сообщение, в порядке отправки.",
    flowLearn: ["Где поток начинается и где заканчивается", "Что каждый блок передаёт следующему", "Что происходит, когда один блок останавливается"],
    seqLearn: ["Кто кому какое сообщение отправляет", "Какие сообщения ждут ответа", "Что происходит, когда участник перестаёт отвечать"],
    start: "Поток начинается с блока {node}.",
    from: "{node} получает от: {prev}{via}.",
    next: " Дальше он идёт в: {list}.",
    end: " Здесь этот путь заканчивается.",
    via: " ({x})",
    send: "{from} отправляет {to} сообщение «{text}».",
    reply: " {to} отвечает: «{x}».",
    lost: " Сообщение теряется по дороге.",
    async: " Отправитель не ждёт ответа.",
    overTitle: "Вся картина",
    overShort: "Обзор",
    overBody: "{n} блоков и {e} линий. Следите за линиями: каждая — это вызов или сообщение от одного блока к другому.",
    failTitle: "Что, если {node} остановится?",
    failShort: "Сбой",
    failBody: "Если {node} не работает, вызовы к нему падают{prev}, и дальше ничего не идёт{next}.",
    failPrev: " (от: {x})",
    failNext: " (в: {x})",
    fixTitle: "{node} снова работает",
    fixShort: "Восстановление",
    fixBody: "Когда {node} снова отвечает, поток идёт как в предыдущих шагах. Сколько потерялось за это время, решают повторы и таймауты.",
    pathTitle: "Один путь от начала до конца",
    pathShort: "Путь",
    pathBody: "По самому длинному пути: {list}. Самый медленный блок на нём задаёт темп всему потоку.",
    linesTitle: "Что значат линии",
    linesShort: "Линии",
    linesBody: "Сплошная линия — вызов, который ждёт ответа, пунктирная — сообщение без ожидания, перечёркнутая — сообщение, которое может потеряться.",
    recap: "Итог",
    flowRecap: "Поток идёт от {a} до {z} через блоки ({n}). Каждый блок берёт то, что прислал предыдущий, и передаёт дальше; если один встаёт, всё после него ждёт.",
    seqRecap: "Участники ({n}) обмениваются сообщениями ({m}) в строгом порядке, начинает {a}. Каждое сообщение, ждущее ответа, — место, где медленный или молчащий участник задерживает всех.",
    altCase: "Другая ветка {n}",
    breakCase: "Прерывание {n}",
  },
  uz: {
    flowTitle: "Oqim: {a} dan {z} gacha",
    seqTitle: "Xabar almashinuvi: {p}",
    flowSummary: "{n} ta blok va {e} ta chiziq, {a} dan boshlab qadamma-qadam: har bir blok nimani oladi va nimani uzatadi.",
    seqSummary: "{n} ta ishtirokchi orasidagi {m} ta xabar, har bir xabar uchun bir qadam, yuborilish tartibida.",
    flowLearn: ["Oqim qayerda boshlanib, qayerda tugaydi", "Har bir blok keyingisiga nimani uzatadi", "Bitta blok to'xtasa nima bo'ladi"],
    seqLearn: ["Kim kimga qaysi xabarni yuboradi", "Qaysi xabarlar javob kutadi", "Ishtirokchi javob bermay qo'ysa nima bo'ladi"],
    start: "Oqim {node} dan boshlanadi.",
    from: "{node} quyidagidan oladi: {prev}{via}.",
    next: " Keyin u bu yerga o'tadi: {list}.",
    end: " Bu yo'l shu yerda tugaydi.",
    via: " ({x})",
    send: "{from} {to} ga \"{text}\" xabarini yuboradi.",
    reply: " {to} javob beradi: \"{x}\".",
    lost: " Xabar yo'lda yo'qoladi.",
    async: " Yuboruvchi javob kutmaydi.",
    overTitle: "Umumiy manzara",
    overShort: "Umumiy",
    overBody: "{n} ta blok va {e} ta chiziq. Chiziqlarga qarang: har biri bir blokdan boshqasiga chaqiruv yoki xabar.",
    failTitle: "{node} to'xtasa nima bo'ladi?",
    failShort: "Xato",
    failBody: "{node} ishlamasa, unga chaqiruvlar xato bilan tugaydi{prev} va undan nari hech narsa o'tmaydi{next}.",
    failPrev: " (kimdan: {x})",
    failNext: " (kimga: {x})",
    fixTitle: "{node} yana ishlayapti",
    fixShort: "Tiklanish",
    fixBody: "{node} yana javob bera boshlagach, oqim oldingi qadamlardagidek davom etadi. Shu vaqt ichida qancha yo'qolganini qayta urinishlar va taymautlar hal qiladi.",
    pathTitle: "Boshidan oxirigacha bitta yo'l",
    pathShort: "Yo'l",
    pathBody: "Eng uzun yo'l bo'ylab: {list}. Undagi eng sekin blok butun oqim tezligini belgilaydi.",
    linesTitle: "Chiziqlar nimani bildiradi",
    linesShort: "Chiziqlar",
    linesBody: "Yaxlit chiziq — javob kutadigan chaqiruv, punktir — kutmaydigan xabar, ustidan chizilgani — yo'qolishi mumkin bo'lgan xabar.",
    recap: "Xulosa",
    flowRecap: "Oqim {a} dan {z} gacha {n} ta blok orqali o'tadi. Har bir blok oldingisi yuborganini olib, keyingisiga uzatadi; bittasi to'xtasa, undan keyingi hamma narsa kutadi.",
    seqRecap: "{n} ta ishtirokchi qat'iy tartibda {m} ta xabar almashadi, {a} boshlaydi. Javob kutadigan har bir xabar — sekin yoki jim ishtirokchi hammani ushlab turadigan joy.",
    altCase: "Boshqa tarmoq {n}",
    breakCase: "To'xtatish {n}",
  },
} satisfies Record<AuthorLang, unknown>;
type Strings = (typeof T)["en"];

// one pass: a job named "{x}" is not filled again
const fill = fillIn;
const per = <R>(f: (s: Strings, l: AuthorLang) => R): PerLang<R> => perLangOf((l) => f(T[l] as Strings, l));

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
/** `POST /orders` -> an http request; anything else is plain text. */
export function wireOf(text: string, fallback: string): KitMessage {
  const t = text || fallback;
  const sp = t.indexOf(" ");
  const method = sp > 0 ? t.slice(0, sp) : "";
  const rest = sp > 0 ? t.slice(sp + 1).trimStart() : "";
  if (HTTP_METHODS.includes(method) && (rest.startsWith("/") || rest.startsWith("http"))) return { format: "http", head: t };
  if (t.startsWith("HTTP/") || (t.length >= 3 && isDigits(t.slice(0, 3)) && (t.length === 3 || t[3] === " "))) return { format: "http", head: t };
  return { format: "text" as WireFormat, head: t };
}

/* ---------- model -> draft ---------- */

interface Shared {
  nodes: KitNode[];
  edges: KitEdge[];
  beats: KitBeat[];
  label: (id: string) => string;
  /** message on an edge, for padding beats */
  wire: (edgeKey: string) => KitMessage;
}

/** Overview, failure + recovery, the longest path, the line legend: until the course minimum. */
function pad(sh: Shared, path: string[], warn: (c: ImportWarningCode, x?: string) => void) {
  const work = () => sh.beats.length;
  const need = IMPORT_MIN_STEPS - 1;
  const first = sh.edges[0];
  const exchangeOn = (e: KitEdge | undefined, response?: KitMessage) =>
    e ? { exchange: { edge: e.key, request: sh.wire(e.key), ...(response ? { response } : {}) } } : {};
  if (!first) warn("noLines");
  if (work() < need) {
    sh.beats.push({
      idBase: "overview",
      kind: "case",
      focus: sh.nodes.map((n) => n.key),
      ...exchangeOn(first),
      text: per((s) => ({ title: s.overTitle, short: s.overShort, body: fill(s.overBody, { n: sh.nodes.length, e: sh.edges.length }) })),
    });
  }
  if (work() < need) {
    const hub = sh.nodes.find((n) => sh.edges.some((e) => e.to === n.key) && sh.edges.some((e) => e.from === n.key)) ?? sh.nodes.find((n) => sh.edges.some((e) => e.to === n.key)) ?? sh.nodes[0]!;
    const into = sh.edges.filter((e) => e.to === hub.key);
    const out = sh.edges.filter((e) => e.from === hub.key);
    const e = into[0] ?? out[0];
    const failWire = e ? sh.wire(e.key) : undefined;
    const response: KitMessage | undefined = failWire ? (failWire.format === "http" ? { format: "http", head: "HTTP/1.1 503 Service Unavailable" } : { format: "text", head: "error: no answer" }) : undefined;
    const name = sh.label(hub.key);
    sh.beats.push({
      idBase: "failure",
      kind: "problem",
      focus: [hub.key],
      states: { [hub.key]: "down" },
      edgeChange: Object.fromEntries([...into.map((x) => [x.key, { flow: "fail" as Flow }]), ...out.map((x) => [x.key, { cut: true }])]),
      ...exchangeOn(e, response),
      text: per((s, l) => ({
        title: fill(s.failTitle, { node: name }),
        short: s.failShort,
        body: fill(s.failBody, {
          node: name,
          prev: into.length ? fill(s.failPrev, { x: listIn(into.map((x) => sh.label(x.from)), l) }) : "",
          next: out.length ? fill(s.failNext, { x: listIn(out.map((x) => sh.label(x.to)), l) }) : "",
        }),
      })),
    });
    sh.beats.push({
      idBase: "recovery",
      kind: "fix",
      focus: [hub.key],
      ...exchangeOn(e),
      text: per((s) => ({ title: fill(s.fixTitle, { node: name }), short: s.fixShort, body: fill(s.fixBody, { node: name }) })),
    });
  }
  if (work() < need) {
    const last = sh.edges.find((e) => path.length > 1 && e.from === path[path.length - 2] && e.to === path[path.length - 1]) ?? first;
    sh.beats.push({
      idBase: "path",
      kind: "case",
      focus: path.length ? path : sh.nodes.map((n) => n.key),
      ...exchangeOn(last),
      text: per((s, l) => ({ title: s.pathTitle, short: s.pathShort, body: fill(s.pathBody, { list: listIn((path.length ? path : sh.nodes.map((n) => n.key)).map(sh.label), l, 8) }) })),
    });
  }
  if (work() < need) {
    sh.beats.push({
      idBase: "lines",
      kind: "case",
      focus: [],
      ...exchangeOn(sh.edges[sh.edges.length - 1]),
      text: per((s) => ({ title: s.linesTitle, short: s.linesShort, body: s.linesBody })),
    });
  }
}

const nodeLabel = (n: MermaidNode) => n.label || n.id;

function flowchartToDraft(m: MermaidModel): MermaidImport {
  const warnings: ImportWarning[] = [...m.warnings];
  const warn = (code: ImportWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const edges: MermaidEdge[] = [];
  let selfLoops = 0;
  const seen = new Set<string>();
  for (const e of m.edges) {
    if (e.from === e.to) {
      selfLoops++;
      continue;
    }
    const k = `${e.from}\u0000${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push(e);
  }
  if (selfLoops) warn("selfLoop", String(selfLoops));
  const ids = m.nodes.map((n) => n.id);
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  const hasIn = new Set(edges.map((e) => e.to));
  const roots = ids.filter((id) => !hasIn.has(id));
  const starts = roots.length ? roots : ids.slice(0, 1);
  const { order, backEdges } = walkOrder({ ids, out }, starts);
  // a decision {..} with labelled ways out: the story follows one, the others are cases
  const back = new Set(backEdges.map(([a, b]) => `${a}\u0000${b}`));
  const alt = new Set<string>();
  const altLabel = new Map<string, string>();
  for (const n of m.nodes) {
    if (!n.decision) continue;
    const outs = edges.filter((e) => e.from === n.id);
    if (outs.length < 2 || !outs.some((e) => e.label)) continue;
    const main = mainChoice(out, n.id, outs.map((e) => e.to), outs[0]!.to, back, (id) => !(out.get(id) ?? []).length);
    for (const e of outs) {
      const key = `${e.from}\u0000${e.to}`;
      if (e.to === main || back.has(key)) continue;
      alt.add(key);
      altLabel.set(key, e.label);
    }
  }
  const { base, branches } = splitBranches({ ids, out }, starts, order, alt);
  if (backEdges.length) warn("cycle", listIn([...new Set(backEdges.map(([, b]) => nodeLabel(byId.get(b)!)))], "en", 5));
  const kept = order.slice(0, IMPORT_MAX_NODES);
  if (order.length > kept.length) warn("maxNodes", String(order.length - kept.length));
  const keptSet = new Set(kept);
  const keptEdges = edges.filter((e) => keptSet.has(e.from) && keptSet.has(e.to));

  // layers along the order, rows inside a layer
  const pos = new Map(kept.map((id, k) => [id, k]));
  const layer = new Map<string, number>();
  const pred = new Map<string, string>();
  for (const id of kept) {
    const l = layer.get(id) ?? 0;
    layer.set(id, l);
    for (const to of out.get(id) ?? []) {
      if (!keptSet.has(to) || pos.get(to)! <= pos.get(id)!) continue;
      if ((layer.get(to) ?? -1) < l + 1) {
        layer.set(to, l + 1);
        pred.set(to, id);
      }
    }
  }
  const perLayer = new Map<number, string[]>();
  for (const id of kept) perLayer.set(layer.get(id)!, [...(perLayer.get(layer.get(id)!) ?? []), id]);
  const at = new Map<string, [number, number]>();
  for (const [l, list] of perLayer) {
    const rows = centredRows(list.length);
    list.forEach((id, k) => at.set(id, m.direction === "LR" ? [l, rows[k]!] : [rows[k]!, l]));
  }
  const nodes: KitNode[] = kept.map((id) => {
    const n = byId.get(id)!;
    return { key: id, idBase: n.label || id, fallbackId: "block", kind: n.kind, label: perLangOf(() => nodeLabel(n)), at: at.get(id)! };
  });
  const kitEdges: KitEdge[] = keptEdges.map((e) => ({
    key: `${e.from}>${e.to}`,
    from: e.from,
    to: e.to,
    ...(e.label ? { idBase: e.label } : {}),
    ...(e.style === "cross" ? { flow: "fail" as Flow } : {}),
    ...(e.style === "dotted" ? { mode: "async" as EdgeMode } : {}),
  }));
  const edgeBy = new Map(keptEdges.map((e) => [`${e.from}>${e.to}`, e]));
  const label = (id: string) => (byId.get(id) ? nodeLabel(byId.get(id)!) : id);
  const wire = (key: string) => {
    const e = edgeBy.get(key)!;
    return wireOf(e.label, `${label(e.from)} -> ${label(e.to)}`);
  };

  const baseKept = kept.filter((id) => base.has(id));
  const stepped = baseKept.slice(0, IMPORT_MAX_STEPS - 1);
  if (baseKept.length > stepped.length) warn("maxSteps", String(baseKept.length - stepped.length));
  const beatFor = (id: string): KitBeat => {
    const into = keptEdges.filter((e) => e.to === id && pos.get(e.from)! < pos.get(id)!);
    const outs = keptEdges.filter((e) => e.from === id);
    const e = into[0] ?? outs[0];
    const name = label(id);
    return {
      idBase: byId.get(id)!.label || id,
      kind: "case",
      focus: [id],
      ...(e ? { exchange: { edge: `${e.from}>${e.to}`, request: wire(`${e.from}>${e.to}`) } } : {}),
      text: per((s, l) => {
        const via = into.length === 1 && into[0]!.label ? fill(s.via, { x: into[0]!.label }) : "";
        const body =
          (into.length ? fill(s.from, { node: name, prev: listIn(into.map((x) => label(x.from)), l), via }) : fill(s.start, { node: name })) +
          (outs.length ? fill(s.next, { list: listIn(outs.map((x) => label(x.to)), l) }) : s.end);
        return { title: name, short: name, body };
      }),
    };
  };
  const beats: KitBeat[] = stepped.map(beatFor);
  const cases: KitCase[] = [];
  for (const b of branches) {
    const from = stepped.indexOf(b.from);
    const own = b.nodes.filter((id) => keptSet.has(id));
    if (from < 0 || !own.length) continue;
    const name = altLabel.get(`${b.from}\u0000${b.to}`) || label(b.to);
    cases.push({ idBase: name, from, label: perLangOf(() => name), beats: own.slice(0, IMPORT_MAX_CASE_STEPS).map(beatFor) });
  }
  // the longest path, for the padding beat
  const deepest = kept.reduce((a, b) => ((layer.get(b) ?? 0) > (layer.get(a) ?? 0) ? b : a), kept[0]!);
  const path: string[] = [];
  for (let cur: string | undefined = deepest; cur; cur = pred.get(cur)) path.unshift(cur);
  const sh: Shared = { nodes, edges: kitEdges, beats, label, wire };
  pad(sh, path, warn);

  const a = label(kept[0]!);
  const z = label(path[path.length - 1] ?? kept[kept.length - 1]!);
  const draft = buildDraft({
    slugBase: m.title || `flow-${a}-${z}`,
    fallbackSlug: "mermaid-flowchart",
    title: per((s) => (m.title ? m.title : fill(s.flowTitle, { a, z }))),
    summary: per((s) => fill(s.flowSummary, { n: nodes.length, e: kitEdges.length, a })),
    learn: per((s) => [...s.flowLearn]),
    nodes,
    edges: kitEdges,
    beats,
    cases,
    recap: per((s) => ({ title: s.recap, short: s.recap, body: fill(s.flowRecap, { a, z, n: nodes.length }) })),
  });
  warn("translate");
  return { draft, warnings, kind: m.kind };
}

function sequenceToDraft(m: MermaidModel): MermaidImport {
  const warnings: ImportWarning[] = [...m.warnings];
  const warn = (code: ImportWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  // participants that send or receive come first; the cap keeps the busiest ones
  const kept = m.nodes.slice(0, IMPORT_MAX_NODES);
  if (m.nodes.length > kept.length) warn("maxNodes", String(m.nodes.length - kept.length));
  const keptSet = new Set(kept.map((n) => n.id));
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const label = (id: string) => (byId.get(id) ? nodeLabel(byId.get(id)!) : id);
  const nodes: KitNode[] = kept.map((n, k) => ({
    key: n.id,
    idBase: n.label || n.id,
    fallbackId: "participant",
    kind: n.kind,
    label: perLangOf(() => nodeLabel(n)),
    // a zigzag line keeps names off the lines between neighbours
    at: [k, k % 2 ? 4 : 2],
  }));
  const msgs = m.messages.filter((x) => keptSet.has(x.from) && keptSet.has(x.to));
  // a dashed answer goes to the latest open request on the same pair (calls nest, as activations do)
  interface Row {
    req: MermaidMessage;
    res?: MermaidMessage;
  }
  const rows: Row[] = [];
  for (const x of msgs) {
    let open: Row | undefined;
    if (x.dashed) {
      for (let k = rows.length - 1; k >= Math.max(0, rows.length - 8) && !open; k--) {
        const r = rows[k]!;
        if (!r.res && !r.req.dashed && !r.req.async && !r.req.lost && r.req.from === x.to && r.req.to === x.from && r.req.branch === x.branch) open = r;
      }
    }
    if (open) open.res = x;
    else rows.push({ req: x });
  }
  const edges: KitEdge[] = [];
  const edgeKeys = new Set<string>();
  const edgeKey = (x: MermaidMessage) => {
    const key = `${x.from}>${x.to}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({ key, from: x.from, to: x.to, ...(x.async ? { mode: "async" as EdgeMode } : {}), ...(x.dashed ? { flow: "ack" as Flow } : {}) });
    }
    return key;
  };
  for (const r of rows) edgeKey(r.req);
  const firstMsg = new Map<string, MermaidMessage>();
  for (const r of rows) if (!firstMsg.has(`${r.req.from}>${r.req.to}`)) firstMsg.set(`${r.req.from}>${r.req.to}`, r.req);
  const wire = (key: string) => {
    const x = firstMsg.get(key)!;
    return wireOf(x.text, `${label(x.from)} -> ${label(x.to)}`);
  };
  const baseRows = rows.filter((r) => r.req.branch === undefined);
  const stepped = baseRows.slice(0, IMPORT_MAX_STEPS - 1);
  if (baseRows.length > stepped.length) warn("maxSteps", String(baseRows.length - stepped.length));
  const beatFor = (r: Row): KitBeat => {
    const key = `${r.req.from}>${r.req.to}`;
    const from = label(r.req.from);
    const to = label(r.req.to);
    const text = r.req.text || `${from} -> ${to}`;
    const request = wireOf(r.req.text, `${from} -> ${to}`);
    const response = r.res ? wireOf(r.res.text, "OK") : undefined;
    return {
      idBase: r.req.text || `${from}-${to}`,
      kind: r.req.lost ? "problem" : "case",
      focus: [r.req.from, r.req.to],
      ...(r.req.lost ? { edgeChange: { [key]: { cut: true } } } : {}),
      exchange: { edge: key, request, ...(response ? { response } : {}) },
      text: per((s) => ({
        title: text,
        short: text,
        body: fill(s.send, { from, to, text }) + (r.res ? fill(s.reply, { to, x: r.res.text || "OK" }) : "") + (r.req.lost ? s.lost : r.req.async ? s.async : ""),
      })),
    };
  };
  const beats: KitBeat[] = stepped.map(beatFor);
  // alternative sections: each branches after the last base message sent before its block opened
  const msgIndex = new Map(m.messages.map((x, k) => [x, k]));
  const cases: KitCase[] = [];
  m.branches.forEach((b, k) => {
    const own = rows.filter((r) => r.req.branch === k);
    if (!own.length) return;
    let from = -1;
    for (let i = 0; i < stepped.length && (msgIndex.get(stepped[i]!.req) ?? 0) < b.at; i++) from = i;
    const n = cases.length + 1;
    const label = b.label ? perLangOf(() => b.label) : per((s) => fill(b.kind === "break" ? s.breakCase : s.altCase, { n }));
    cases.push({ idBase: b.label || `${b.kind}-${n}`, from: Math.max(0, from), label, beats: own.slice(0, IMPORT_MAX_CASE_STEPS).map(beatFor) });
  });
  const order = [...new Set(rows.flatMap((r) => [r.req.from, r.req.to]))];
  const sh: Shared = { nodes, edges, beats, label, wire };
  pad(sh, order, warn);
  const first = label(rows[0]?.req.from ?? kept[0]!.id);
  const names = kept.map((n) => nodeLabel(n));
  const draft = buildDraft({
    slugBase: m.title || `messages-${names.slice(0, 3).join("-")}`,
    fallbackSlug: "mermaid-sequence",
    title: per((s, l) => (m.title ? m.title : fill(s.seqTitle, { p: listIn(names, l, 3) }))),
    summary: per((s) => fill(s.seqSummary, { m: rows.length, n: kept.length })),
    learn: per((s) => [...s.seqLearn]),
    nodes,
    edges,
    beats,
    cases,
    recap: per((s) => ({ title: s.recap, short: s.recap, body: fill(s.seqRecap, { n: kept.length, m: rows.length, a: first }) })),
  });
  warn("translate");
  return { draft, warnings, kind: m.kind };
}

export function mermaidToDraft(m: MermaidModel): MermaidImport {
  return m.kind === "mermaid-flowchart" ? flowchartToDraft(m) : sequenceToDraft(m);
}

/** Parse and convert in one go: the shape the dialog needs. */
export function importMermaid(text: string, lang: AuthorLang): MermaidResult {
  void lang; // generated texts are written in all three languages; names stay as written
  const p = parseMermaid(text);
  return p.ok ? { ok: true, result: mermaidToDraft(p.model) } : p;
}
