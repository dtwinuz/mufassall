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
  const re =
    format === "json"
      ? /"([A-Za-z0-9_.$-]+)"\s*:\s*/g
      : format === "xml"
        ? /<([A-Za-z0-9_:-]+)(?:\s[^>]*)?>(?=[^<]*<\/\1>)/g
        : null;
  if (!re) return [{ kind: "text", text: line }, ...markWords(line, marks, markNo)];

  const segs: Segment[] = [];
  let pos = 0;
  for (const m of line.matchAll(re)) {
    const name = m[1]!;
    const end = m.index! + m[0].length;
    segs.push({ kind: "text", text: line.slice(pos, end) });
    segs.push(...markNo(name));
    pos = end;
    if (isMasked(name)) {
      const rest = line.slice(pos);
      const stop = format === "json" ? rest.search(/,\s*("|$)|\s*[}\]]\s*,?\s*$|$/) : rest.indexOf("<");
      const valueEnd = stop < 0 ? rest.length : stop;
      const raw = rest.slice(0, valueEnd);
      if (raw.trim()) {
        segs.push({ kind: "mask", name, raw: unquote(raw) });
        pos += valueEnd;
      }
    }
  }
  segs.push({ kind: "text", text: line.slice(pos) });
  return segs.filter((s) => s.kind !== "text" || s.text !== "");
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
