// "Diagram as code": a lesson's scene as Mermaid (flowchart, sequence), PlantUML (sequence, components)
// or D2 text, for pasting into Jira, GitLab, GitHub, Notion or docs. Pure functions, no DOM.
import { type EdgeState, type Flow, type LessonInput, type NodeKind, type SceneState, resolve } from "@mufassall/scene-schema";

export interface TextExportOptions {
  /** flowchart direction, "LR" by default */
  direction?: "LR" | "TB";
  /** colour slow and down nodes with classDef / style blocks (default true) */
  states?: boolean;
  /** words printed on retry / dup / cut / call / async edges; English by default */
  words?: Partial<EdgeWords>;
}

export interface EdgeWords {
  retry: string;
  dup: string;
  lost: string;
  call: string;
  async: string;
}

const WORDS: EdgeWords = { retry: "retry", dup: "duplicate", lost: "lost", call: "call", async: "async" };

/** The scene a lesson ends on before its recap: the design the lesson argues for. */
export function designState(lesson: LessonInput): SceneState {
  const states = resolve(lesson);
  for (let i = lesson.steps.length - 1; i >= 0; i--) {
    if (lesson.steps[i]!.kind !== "recap") return states[i]!;
  }
  return states[states.length - 1] ?? { nodes: {}, edges: {}, metrics: {}, focus: [] };
}

/** One line, no markup: `code` and **bold** lose their marks, whitespace collapses. */
export function plainText(s: string, max = 0): string {
  const flat = s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return max > 0 && flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Stable, safe identifiers: `n_` + [A-Za-z0-9_] only, so no node id can clash with a keyword
 * (`end`, `graph`, `style`) or start an `o`/`x` edge head. Collisions get a numeric suffix.
 */
export function safeIds(ids: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const id of ids) {
    const base = `n_${id.replace(/[^A-Za-z0-9_]/g, "_")}`;
    let s = base;
    for (let i = 2; used.has(s); i++) s = `${base}_${i}`;
    used.add(s);
    out.set(id, s);
  }
  return out;
}

/**
 * Mermaid text inside "..." (flowchart) or after ":" (sequence). Characters that end a label,
 * a statement (`;`) or start an entity or markup are written as Mermaid `#code;` entities.
 */
export function mermaidText(s: string): string {
  // brackets, apostrophes (so'rov) and Cyrillic are safe inside these positions and stay readable
  // "%%" would start a comment
  return plainText(s)
    .replace(/[#";|<>&`]/g, (c) => `#${c.charCodeAt(0)};`)
    .replace(/%%/g, "%#37;");
}

/** A D2 double-quoted string: backslash escapes for `\`, `"` and `$` (variable substitution). */
export function d2String(s: string): string {
  return `"${plainText(s).replace(/[\\"$]/g, (c) => `\\${c}`)}"`;
}

const MERMAID_SHAPE: Record<NodeKind, [string, string]> = {
  actor: ["((", "))"],
  client: ["([", "])"],
  service: ["[", "]"],
  worker: ["(", ")"],
  lb: ["{", "}"],
  cache: ["{{", "}}"],
  cdn: ["[/", "\\]"],
  queue: ["[[", "]]"],
  db: ["[(", ")]"],
  storage: ["[(", ")]"],
  external: [">", "]"],
};

const D2_SHAPE: Record<NodeKind, string> = {
  actor: "person",
  client: "rectangle",
  service: "rectangle",
  worker: "rectangle",
  lb: "diamond",
  cache: "hexagon",
  cdn: "oval",
  queue: "queue",
  db: "cylinder",
  storage: "stored_data",
  external: "cloud",
};

const labelOf = (labels: Readonly<Record<string, string>>, id: string) => {
  const l = labels[id];
  return l && plainText(l) ? l : id;
};

/** `mode` is an optional field some scenes carry (call vs async); read it without requiring it. */
function modeOf(e: EdgeState): "call" | "async" | undefined {
  const m = (e as EdgeState & { mode?: unknown }).mode;
  return m === "call" || m === "async" ? m : undefined;
}

function edgeWord(e: EdgeState, w: EdgeWords): string {
  if (e.cut) return w.lost;
  if (e.flow === "retry") return w.retry;
  if (e.flow === "dup") return w.dup;
  const mode = modeOf(e);
  return mode ? w[mode] : "";
}

const MERMAID_ARROW: Record<Flow, string> = {
  request: "-->",
  ack: "-.->",
  fail: "--x",
  retry: "-.->",
  dup: "==>",
};

export function toMermaidFlowchart(state: SceneState, labels: Readonly<Record<string, string>>, opts: TextExportOptions = {}): string {
  const w = { ...WORDS, ...opts.words };
  const nodes = Object.values(state.nodes);
  const ids = safeIds(nodes.map((n) => n.id));
  const lines = [`flowchart ${opts.direction ?? "LR"}`];
  for (const n of nodes) {
    const [open, close] = MERMAID_SHAPE[n.kind] ?? MERMAID_SHAPE.service;
    lines.push(`  ${ids.get(n.id)}${open}"${mermaidText(labelOf(labels, n.id))}"${close}`);
  }
  for (const e of Object.values(state.edges)) {
    const a = ids.get(e.from);
    const b = ids.get(e.to);
    if (!a || !b) continue;
    const arrow = e.cut ? "--x" : MERMAID_ARROW[e.flow] ?? "-->";
    const word = edgeWord(e, w);
    lines.push(`  ${a} ${arrow}${word ? `|"${mermaidText(word)}"|` : ""} ${b}`);
  }
  if (opts.states !== false) {
    const slow = nodes.filter((n) => n.state === "slow").map((n) => ids.get(n.id));
    const down = nodes.filter((n) => n.state === "down").map((n) => ids.get(n.id));
    if (slow.length) lines.push("  classDef slow fill:#fff4d6,stroke:#b26a00,color:#3d2600", `  class ${slow.join(",")} slow`);
    if (down.length) lines.push("  classDef down fill:#fde2e2,stroke:#c62828,color:#4a0d0d,stroke-dasharray:4 3", `  class ${down.join(",")} down`);
  }
  return `${lines.join("\n")}\n`;
}

/** What the sequence needs from a lesson text: node labels and step titles. */
export interface SequenceText {
  nodes: Readonly<Record<string, string>>;
  steps: Readonly<Record<string, { title: string }>>;
}

export interface SequenceOptions {
  /** a Note with the step title over each exchange (default true) */
  notes?: boolean;
  /** longest start line kept; longer ones end with "…" (default 90) */
  maxHead?: number;
}

/** True when at least one step shows a real message: the sequence diagram has something to say. */
export function hasExchanges(lesson: LessonInput): boolean {
  return lesson.steps.some((s) => s.exchange);
}

/**
 * The lesson's exchanges in step order as a sequenceDiagram. Only start lines travel: headers and
 * bodies (where masked values live) are never written.
 */
export function toMermaidSequence(lesson: LessonInput, text: SequenceText, opts: SequenceOptions = {}): string {
  const states = resolve(lesson);
  const max = opts.maxHead ?? 90;
  const rows: { from: string; to: string; cut: boolean; title: string; req: string; res?: string }[] = [];
  lesson.steps.forEach((step, i) => {
    const x = step.exchange;
    const e = x && states[i]!.edges[x.edge];
    if (!x || !e) return;
    rows.push({
      from: e.from,
      to: e.to,
      cut: e.cut,
      title: text.steps[step.id]?.title ?? step.id,
      req: x.request.head,
      res: x.response?.head,
    });
  });

  const order: string[] = [];
  for (const r of rows) for (const n of [r.from, r.to]) if (!order.includes(n)) order.push(n);
  const ids = safeIds(order);
  const kinds = new Map<string, NodeKind>();
  for (const s of states) for (const n of Object.values(s.nodes)) if (!kinds.has(n.id)) kinds.set(n.id, n.kind);

  const lines = ["sequenceDiagram"];
  for (const n of order) {
    const word = kinds.get(n) === "actor" ? "actor" : "participant";
    lines.push(`  ${word} ${ids.get(n)} as ${mermaidText(labelOf(text.nodes, n))}`);
  }
  for (const r of rows) {
    const a = ids.get(r.from)!;
    const b = ids.get(r.to)!;
    if (opts.notes !== false) lines.push(`  Note over ${a === b ? a : `${a},${b}`}: ${mermaidText(r.title)}`);
    lines.push(`  ${a}${r.cut ? "-x" : "->>"}${b}: ${mermaidText(plainText(r.req, max))}`);
    if (r.res !== undefined && !r.cut) lines.push(`  ${b}-->>${a}: ${mermaidText(plainText(r.res, max))}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * PlantUML text for a quoted name or a label after ":". PlantUML reads Creole markup and
 * preprocessor calls anywhere in a line, so the characters that start them become `&#code;`
 * entities: `"` (ends a quoted name), `\` (`\n` is a line break), `<` `>` (tags), `~` (Creole escape),
 * `%` (`%date()` and friends), `&` (so text never forms an entity), and the second char of a doubled markup pair (`**`, `//` in URLs, `--`).
 */
export function plantUmlText(s: string): string {
  return plainText(s)
    .replace(/["\\<>~%&]/g, (c) => `&#${c.charCodeAt(0)};`)
    .replace(/([*/_^=-])\1/g, (_, c: string) => `${c}&#${c.charCodeAt(0)};`);
}

/** A PlantUML double-quoted display name. */
export function plantUmlString(s: string): string {
  return `"${plantUmlText(s)}"`;
}

/**
 * The lesson's exchanges as a PlantUML sequence diagram, the same rows as {@link toMermaidSequence}.
 * A `call` edge (and an edge with no mode) is a solid `->` answered by a dashed `-->`; an `async`
 * edge has the open `->>` head; a cut edge ends in `->x` and gets no answer. Lost, retry and
 * duplicate deliveries carry their word in front of the message.
 */
export function toPlantUmlSequence(
  lesson: LessonInput,
  text: SequenceText,
  opts: SequenceOptions & { words?: Partial<EdgeWords> } = {},
): string {
  const w = { ...WORDS, ...opts.words };
  const states = resolve(lesson);
  const max = opts.maxHead ?? 90;
  const rows: { from: string; to: string; edge: EdgeState; title: string; req: string; res?: string }[] = [];
  lesson.steps.forEach((step, i) => {
    const x = step.exchange;
    const e = x && states[i]!.edges[x.edge];
    if (!x || !e) return;
    rows.push({ from: e.from, to: e.to, edge: e, title: text.steps[step.id]?.title ?? step.id, req: x.request.head, res: x.response?.head });
  });

  const order: string[] = [];
  for (const r of rows) for (const n of [r.from, r.to]) if (!order.includes(n)) order.push(n);
  const ids = safeIds(order);
  const kinds = new Map<string, NodeKind>();
  for (const s of states) for (const n of Object.values(s.nodes)) if (!kinds.has(n.id)) kinds.set(n.id, n.kind);

  const lines = ["@startuml"];
  for (const n of order) lines.push(`${plantUmlParticipant(kinds.get(n))} ${plantUmlString(labelOf(text.nodes, n))} as ${ids.get(n)}`);
  for (const r of rows) {
    const a = ids.get(r.from)!;
    const b = ids.get(r.to)!;
    const e = r.edge;
    if (opts.notes !== false) lines.push(`note over ${a === b ? a : `${a}, ${b}`} : ${plantUmlText(r.title)}`);
    const word = e.cut ? w.lost : e.flow === "retry" ? w.retry : e.flow === "dup" ? w.dup : "";
    const msg = `${word ? `[${word}] ` : ""}${plainText(r.req, max)}`;
    const async = modeOf(e) === "async";
    lines.push(`${a} ${e.cut ? "->x" : async ? "->>" : "->"} ${b} : ${plantUmlText(msg)}`);
    if (r.res !== undefined && !e.cut) lines.push(`${b} ${async ? "-->>" : "-->"} ${a} : ${plantUmlText(plainText(r.res, max))}`);
  }
  lines.push("@enduml");
  return `${lines.join("\n")}\n`;
}

function plantUmlParticipant(kind: NodeKind | undefined): string {
  switch (kind) {
    case "actor":
      return "actor";
    case "db":
    case "storage":
      return "database";
    case "queue":
      return "queue";
    case "external":
      return "boundary";
    case "cache":
      return "collections";
    default:
      return "participant";
  }
}

const PLANTUML_ELEMENT: Record<NodeKind, string> = {
  actor: "actor",
  client: "agent",
  service: "component",
  worker: "collections",
  lb: "node",
  cache: "stack",
  cdn: "frame",
  queue: "queue",
  db: "database",
  storage: "storage",
  external: "cloud",
};

/** Arrow bodies for the component diagram: dashed for ack / retry, bold for duplicates, red for failures. */
const PLANTUML_ARROW: Record<Flow, string> = {
  request: "-->",
  ack: "..>",
  fail: "-[#c62828]->",
  retry: "..>",
  dup: "-[bold]->",
};

/** The design as a PlantUML component (deployment) diagram: the PlantUML twin of {@link toMermaidFlowchart}. */
export function toPlantUmlComponents(state: SceneState, labels: Readonly<Record<string, string>>, opts: TextExportOptions = {}): string {
  const w = { ...WORDS, ...opts.words };
  const nodes = Object.values(state.nodes);
  const ids = safeIds(nodes.map((n) => n.id));
  const lines = ["@startuml", opts.direction === "TB" ? "top to bottom direction" : "left to right direction"];
  for (const n of nodes) {
    let colour = "";
    if (opts.states !== false && n.state === "slow") colour = " #fff4d6;line:b26a00";
    if (opts.states !== false && n.state === "down") colour = " #fde2e2;line:c62828;line.dashed";
    lines.push(`${PLANTUML_ELEMENT[n.kind] ?? "component"} ${plantUmlString(labelOf(labels, n.id))} as ${ids.get(n.id)}${colour}`);
  }
  for (const e of Object.values(state.edges)) {
    const a = ids.get(e.from);
    const b = ids.get(e.to);
    if (!a || !b) continue;
    const arrow = e.cut ? "-[#c62828,dashed]->" : PLANTUML_ARROW[e.flow] ?? "-->";
    const word = edgeWord(e, w);
    lines.push(`${a} ${arrow} ${b}${word ? ` : ${plantUmlText(word)}` : ""}`);
  }
  lines.push("@enduml");
  return `${lines.join("\n")}\n`;
}

export function toD2(state: SceneState, labels: Readonly<Record<string, string>>, opts: TextExportOptions = {}): string {
  const w = { ...WORDS, ...opts.words };
  const nodes = Object.values(state.nodes);
  const ids = safeIds(nodes.map((n) => n.id));
  const lines = [`direction: ${opts.direction === "TB" ? "down" : "right"}`, ""];
  for (const n of nodes) {
    const body = [`  shape: ${D2_SHAPE[n.kind] ?? "rectangle"}`];
    if (n.kind === "worker") body.push("  style.multiple: true");
    if (opts.states !== false && n.state === "slow") body.push('  style.fill: "#fff4d6"', '  style.stroke: "#b26a00"');
    if (opts.states !== false && n.state === "down") body.push('  style.fill: "#fde2e2"', '  style.stroke: "#c62828"', "  style.stroke-dash: 3");
    lines.push(`${ids.get(n.id)}: ${d2String(labelOf(labels, n.id))} {`, ...body, "}");
  }
  if (Object.keys(state.edges).length) lines.push("");
  for (const e of Object.values(state.edges)) {
    const a = ids.get(e.from);
    const b = ids.get(e.to);
    if (!a || !b) continue;
    const word = edgeWord(e, w);
    const style: string[] = [];
    if (e.flow === "ack" || e.flow === "retry") style.push("  style.stroke-dash: 3");
    if (e.flow === "dup") style.push("  style.stroke-width: 4");
    if (e.flow === "fail" || e.cut) style.push("  target-arrowhead.shape: cross");
    const head = `${a} -> ${b}${word ? `: ${d2String(word)}` : ""}`;
    lines.push(...(style.length ? [`${head} {`, ...style, "}"] : [head]));
  }
  return `${lines.join("\n")}\n`;
}
