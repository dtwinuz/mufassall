import type { WireMessage } from "./index";

/** A piece of a rendered wire line: plain text, a numbered mark, or a masked value. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; n: number; name: string }
  | { kind: "mask"; name: string; raw: string };

export type WireLine = Segment[];

/** The only value a masked field may hold in a public lesson. */
export const PUBLIC_MASK = "***";

const unquote = (s: string) => s.trim().replace(/,$/, "").trim().replace(/^"(.*)"$/, "$1");

/**
 * Splits a message into lines and annotates them. Every name in `marks` gets its number at its
 * first occurrence across all messages sharing `seen`; every name in `masked` has its value
 * replaced by a mask segment (headers, JSON keys, XML elements).
 */
export function annotate(
  msg: WireMessage,
  marks: readonly string[] = [],
  masked: readonly string[] = [],
  seen: Set<string> = new Set(),
): WireLine[] {
  const markNo = (name: string): Segment[] => {
    const i = marks.indexOf(name);
    if (i < 0 || seen.has(name)) return [];
    seen.add(name);
    return [{ kind: "mark", n: i + 1, name }];
  };
  const isMasked = (name: string) => masked.includes(name);

  const out: WireLine[] = [];
  out.push([{ kind: "text", text: msg.head }, ...markWords(msg.head, marks, markNo)]);

  for (const [name, value] of msg.headers ?? []) {
    out.push([
      { kind: "text", text: name },
      ...markNo(name),
      { kind: "text", text: ": " },
      isMasked(name) ? { kind: "mask", name, raw: value } : { kind: "text", text: value },
    ]);
  }

  if (msg.body !== undefined) {
    if (msg.headers?.length) out.push([{ kind: "text", text: "" }]);
    for (const line of msg.body.split("\n")) out.push(annotateLine(line, msg.format, markNo, isMasked, marks));
  }
  return out;
}

function annotateLine(
  line: string,
  format: WireMessage["format"],
  markNo: (name: string) => Segment[],
  isMasked: (name: string) => boolean,
  marks: readonly string[],
): WireLine {
  const keys = format === "json" ? jsonKeys(line) : format === "xml" ? xmlLeafTags(line) : null;
  if (!keys) return [{ kind: "text", text: line }, ...markWords(line, marks, markNo)];

  const segs: Segment[] = [];
  let pos = 0;
  for (const { name, end } of keys) {
    if (end < pos) continue;
    segs.push({ kind: "text", text: line.slice(pos, end) });
    segs.push(...markNo(name));
    pos = end;
    if (isMasked(name)) {
      const valueEnd = format === "json" ? jsonValueEnd(line, pos) : xmlValueEnd(line, pos);
      const raw = line.slice(pos, valueEnd);
      if (raw.trim()) {
        segs.push({ kind: "mask", name, raw: unquote(raw) });
        pos = valueEnd;
      }
    }
  }
  segs.push({ kind: "text", text: line.slice(pos) });
  return segs.filter((s) => s.kind !== "text" || s.text !== "");
}

interface Key {
  name: string;
  /** index right after the key and its separator, where the value starts */
  end: number;
}

const isNameChar = (c: string) => /[A-Za-z0-9_.$:-]/.test(c);
const isSpace = (c: string | undefined) => c === " " || c === "\t";

/** `"name":` keys in one JSON line. Hand-written scanners keep every pass linear in the line. */
function jsonKeys(line: string): Key[] {
  const out: Key[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '"') {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < line.length && line[j] !== '"') j += line[j] === "\\" ? 2 : 1;
    const name = line.slice(i + 1, j);
    let k = j + 1;
    while (isSpace(line[k])) k++;
    if (line[k] === ":" && name !== "" && [...name].every(isNameChar)) {
      k++;
      while (isSpace(line[k])) k++;
      out.push({ name, end: k });
    }
    i = j + 1;
  }
  return out;
}

/** End of a JSON scalar starting at `from`: the first `,`, `}` or `]` outside a string. */
function jsonValueEnd(line: string, from: number): number {
  let i = from;
  let inString = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "," || c === "}" || c === "]") break;
  }
  while (i > from && isSpace(line[i - 1])) i--;
  return i;
}

/** Leaf elements `<name ...>text</name>` in one XML line. */
function xmlLeafTags(line: string): Key[] {
  const out: Key[] = [];
  let i = line.indexOf("<");
  while (i >= 0) {
    let j = i + 1;
    while (j < line.length && isNameChar(line[j]!)) j++;
    const name = line.slice(i + 1, j);
    const close = line.indexOf(">", j);
    if (name && close >= 0 && (j === close || isSpace(line[j]))) {
      const next = line.indexOf("<", close + 1);
      if (next >= 0 && line.startsWith(`</${name}>`, next)) out.push({ name, end: close + 1 });
    }
    i = line.indexOf("<", i + 1);
  }
  return out;
}

function xmlValueEnd(line: string, from: number): number {
  const stop = line.indexOf("<", from);
  return stop < 0 ? line.length : stop;
}

/** Plain formats (http, sql, text): number a mark at the end of the first line that names it. */
function markWords(line: string, marks: readonly string[], markNo: (name: string) => Segment[]): Segment[] {
  const found: Segment[] = [];
  for (const name of marks) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^A-Za-z0-9_])${escaped}($|[^A-Za-z0-9_])`).test(line)) found.push(...markNo(name));
  }
  return found;
}

/** Raw values of masked fields, for the public-lesson rule that they hold only `***`. */
export function maskedRaw(lines: WireLine[]): string[] {
  return lines.flatMap((l) => l.flatMap((s) => (s.kind === "mask" ? [s.raw] : [])));
}
