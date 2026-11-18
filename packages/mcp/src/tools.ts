/**
 * The mufassall tools an AI agent sees. Every answer comes from the course's own modules:
 * the lesson registry, the scene resolver, the author-mode checks, the diagram exporters and
 * the practice rubric, so the server never disagrees with the site.
 */
import { LANGS, type Lang, type LessonEntry, lessons, order, sectionOf, sections } from "../../../content/index";
import { type LessonInput, type LessonText, type SceneState, type StepText, resolve } from "../../scene-schema/src/index";
import { lessonSchema } from "../../scene-schema/src/validate";
import { AUTHOR_UI } from "../../scene-engine/src/author/author-ui";
import { type AuthorLang, fromLesson } from "../../scene-engine/src/author/model";
import { type Issue, type IssueCode, checkDraft } from "../../scene-engine/src/author/validation";
import type { Rule } from "../../scene-engine/src/challenges";
import { explainState, finalState, practiceFor, rulesFor } from "../../scene-engine/src/practice";
import {
  designState,
  hasExchanges,
  plainText,
  toD2,
  toMermaidFlowchart,
  toMermaidSequence,
  toPlantUmlComponents,
  toPlantUmlSequence,
} from "../../scene-engine/src/textexport";
import { parseLessonSource } from "./objlit";
import type { Resource, ResourceProvider, Tool, ToolResult } from "./protocol";
import type { Schema } from "./schema";

type Text = LessonText<LessonInput>;

const LANG_SCHEMA: Schema = { type: "string", enum: LANGS, description: "Text language: uz (Uzbek, Latin), ru or en. Default en." };
const SLUG_SCHEMA: Schema = { type: "string", minLength: 1, maxLength: 80, description: "Lesson slug, e.g. \"caching\" (see list_lessons)." };

export const DIAGRAM_FORMATS = ["mermaid-flowchart", "mermaid-sequence", "d2", "plantuml", "plantuml-components"] as const;
export type DiagramFormat = (typeof DIAGRAM_FORMATS)[number];

const langOf = (v: unknown): Lang => (typeof v === "string" && (LANGS as readonly string[]).includes(v) ? (v as Lang) : "en");

const ok = (text: string, structured: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text }],
  structuredContent: structured,
});

const fail = (text: string, structured: Record<string, unknown> = {}): ToolResult => ({
  content: [{ type: "text", text }],
  structuredContent: { error: text, ...structured },
  isError: true,
});

function entryOf(slug: unknown): LessonEntry | null {
  return typeof slug === "string" && Object.hasOwn(lessons, slug) ? (lessons[slug] as LessonEntry) : null;
}

const unknownLesson = (slug: unknown) =>
  fail(`Unknown lesson "${String(slug)}". Call list_lessons for the slugs.`, { slug: String(slug), known: order.length });

/* ---------- list_lessons ---------- */

function listLessons(args: Record<string, unknown>): ToolResult {
  const lang = langOf(args.lang);
  const section = typeof args.section === "string" ? args.section : undefined;
  if (section && !sections.some((s) => s.id === section)) {
    return fail(`Unknown section "${section}". Sections: ${sections.map((s) => s.id).join(", ")}.`, { sections: sections.map((s) => s.id) });
  }
  const rows = order
    .filter((slug) => !section || sectionOf(slug)?.id === section)
    .map((slug) => {
      const { lesson, text } = lessons[slug] as LessonEntry;
      return {
        slug,
        title: text[lang].title,
        section: sectionOf(slug)?.id ?? null,
        level: lesson.level,
        minutes: lesson.minutes,
        steps: lesson.steps.length,
        scenarios: lesson.scenarios?.length ?? 0,
      };
    });
  const lines = rows.map((r) => `${r.slug} | ${r.title} | ${r.section} | ${r.steps} steps | ${r.level}, ${r.minutes} min`);
  return ok([`${rows.length} lessons (${lang})`, ...lines].join("\n"), { lang, section: section ?? null, count: rows.length, lessons: rows });
}

/* ---------- get_lesson ---------- */

function sceneSummary(state: SceneState, labels: Record<string, string>) {
  return {
    nodes: Object.values(state.nodes).map((n) => ({ id: n.id, label: labels[n.id] ?? n.id, kind: n.kind, state: n.state })),
    edges: Object.values(state.edges).map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      flow: e.flow,
      ...(e.mode ? { mode: e.mode } : {}),
      ...(e.cut ? { cut: true } : {}),
    })),
  };
}

export function lessonView(slug: string, lang: Lang) {
  const { lesson, text } = lessons[slug] as LessonEntry;
  const t = text[lang] as Text;
  const labels = t.nodes as Record<string, string>;
  const states = resolve(lesson);
  const stepTexts = t.steps as Record<string, StepText>;
  const checks: { step: string; q: string; options: string[]; answer: number; why: string }[] = [];
  const steps = lesson.steps.map((step, i) => {
    const st = stepTexts[step.id];
    const s = states[i]!;
    if (st?.check) checks.push({ step: step.id, q: plainText(st.check.q), options: st.check.options.map((o) => plainText(o)), answer: st.check.answer, why: plainText(st.check.why) });
    return {
      index: i + 1,
      id: step.id,
      kind: step.kind,
      short: st?.short ?? "",
      title: st?.title ?? step.id,
      text: plainText(st?.body ?? ""),
      ...(st?.watch ? { watch: plainText(st.watch) } : {}),
      focus: s.focus,
      nodes: Object.keys(s.nodes).length,
      edges: Object.keys(s.edges).length,
      metrics: s.metrics,
      ...(step.exchange
        ? { exchange: { edge: step.exchange.edge, request: step.exchange.request.head, ...(step.exchange.response ? { response: step.exchange.response.head } : {}) } }
        : {}),
    };
  });
  const scenarioTexts = (t.scenarios ?? {}) as Record<string, { label: string }>;
  return {
    slug,
    lang,
    title: t.title,
    summary: plainText(t.summary),
    learn: t.learn.map((l) => plainText(l)),
    section: sectionOf(slug)?.id ?? null,
    level: lesson.level,
    minutes: lesson.minutes,
    metrics: lesson.metrics.map((m) => ({ id: m.id, label: (t.metrics as Record<string, string>)[m.id] ?? m.id, unit: m.unit, better: m.better })),
    steps,
    scene: { design: sceneSummary(designState(lesson), labels) },
    scenarios: (lesson.scenarios ?? []).map((sc) => ({ id: sc.id, label: scenarioTexts[sc.id]?.label ?? sc.id, from: sc.from, steps: sc.steps.map((s) => s.id) })),
    checks,
  };
}

function getLesson(args: Record<string, unknown>): ToolResult {
  if (!entryOf(args.slug)) return unknownLesson(args.slug);
  const v = lessonView(args.slug as string, langOf(args.lang));
  const out = [`# ${v.title} (${v.slug}, ${v.lang})`, v.summary, "", "Learn:", ...v.learn.map((l) => `- ${l}`), ""];
  for (const s of v.steps) {
    out.push(`## ${s.index}. ${s.title} [${s.kind}]`, s.text);
    if (s.watch) out.push(`Watch: ${s.watch}`);
    if (s.exchange) out.push(`Message on ${s.exchange.edge}: ${s.exchange.request}${s.exchange.response ? ` -> ${s.exchange.response}` : ""}`);
    out.push("");
  }
  out.push(
    "## Design",
    ...v.scene.design.nodes.map((n) => `- ${n.label} (${n.kind}${n.state === "ok" ? "" : `, ${n.state}`})`),
    ...v.scene.design.edges.map((e) => `- ${e.from} -> ${e.to} (${e.flow}${e.mode ? `, ${e.mode}` : ""}${e.cut ? ", cut" : ""})`),
  );
  if (v.checks.length) {
    out.push("", "## Checks");
    for (const c of v.checks) out.push(`- [${c.step}] ${c.q} ${c.options.map((o, i) => `(${i + 1}) ${o}`).join(" ")} Answer: ${c.answer + 1}. ${c.why}`);
  }
  return ok(out.join("\n"), v);
}

/* ---------- validate_lesson ---------- */

/** Issue codes about texts; skipped when the caller sends a scene without its texts. */
const TEXT_CODES = new Set<IssueCode>(["title", "learn", "label", "metricLabel", "text", "fieldNote", "cyrillic"]);

interface Finding {
  level: "error" | "warn";
  source: "schema" | "author" | "input";
  code: string;
  message: string;
  step?: string;
  lang?: string;
  path?: string;
}

function readInput(v: unknown, what: string): { value?: unknown; error?: string } {
  if (typeof v !== "string") return { value: v };
  try {
    return { value: parseLessonSource(v) };
  } catch (e) {
    return { error: `${what}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function issueMessage(issue: Issue, lang: Lang): string {
  const template = AUTHOR_UI[lang as AuthorLang].issue[issue.code] ?? issue.code;
  return template.replaceAll("{x}", issue.x ?? "");
}

export function validateInput(args: Record<string, unknown>) {
  const lang = langOf(args.lang);
  const findings: Finding[] = [];
  const notes: string[] = [];

  const read = readInput(args.lesson, "lesson");
  if (read.error) findings.push({ level: "error", source: "input", code: "parse", message: read.error });
  let lesson = read.value;
  let textArg = args.text;
  // a { lesson, text } bundle, the shape of a registry entry
  if (lesson && typeof lesson === "object" && !Array.isArray(lesson) && "lesson" in lesson && !("steps" in lesson)) {
    const bundle = lesson as { lesson: unknown; text?: unknown };
    lesson = bundle.lesson;
    textArg ??= bundle.text;
  }

  const texts: Partial<Record<AuthorLang, Text>> = {};
  if (textArg !== undefined) {
    if (typeof textArg !== "object" || textArg === null || Array.isArray(textArg)) {
      findings.push({ level: "error", source: "input", code: "text", message: "text must be an object keyed by language (uz, ru, en)" });
    } else {
      for (const [k, v] of Object.entries(textArg)) {
        if (!(LANGS as readonly string[]).includes(k)) {
          findings.push({ level: "warn", source: "input", code: "text", message: `text.${k}: not a course language, ignored` });
          continue;
        }
        const r = readInput(v, `text.${k}`);
        if (r.error) findings.push({ level: "error", source: "input", code: "parse", message: r.error, lang: k });
        else if (r.value && typeof r.value === "object") texts[k as AuthorLang] = r.value as Text;
      }
    }
  }
  const hasText = Object.keys(texts).length > 0;
  if (!hasText) notes.push("No texts given: only the scene was checked. Pass text {uz, ru, en} to check titles, labels and Cyrillic.");
  else for (const l of LANGS) if (!texts[l]) notes.push(`No ${l} text: its checks used the ${texts.en ? "en" : "first given"} text instead.`);

  if (findings.some((f) => f.code === "parse" && !f.lang) || lesson === undefined) {
    return { valid: false, errors: findings.length, warnings: 0, findings, notes };
  }

  const parsed = lessonSchema.safeParse(lesson);
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      findings.push({ level: "error", source: "schema", code: i.code, message: i.message, path: i.path.map(String).join(".") || "(root)" });
    }
  } else {
    const input = lesson as LessonInput;
    try {
      const { draft, droppedScenarios } = fromLesson(input, texts);
      if (droppedScenarios) notes.push(`${droppedScenarios} scenario(s): checked by the schema, not by the author rules.`);
      for (const issue of checkDraft(draft)) {
        if (!hasText && TEXT_CODES.has(issue.code)) continue;
        findings.push({
          level: issue.level,
          source: "author",
          code: issue.code,
          message: issueMessage(issue, lang),
          ...(issue.step !== undefined ? { step: draft.steps[issue.step]?.id ?? String(issue.step) } : {}),
          ...(issue.lang ? { lang: issue.lang } : {}),
          ...(issue.x !== undefined ? { path: issue.x } : {}),
        });
      }
    } catch (e) {
      findings.push({ level: "error", source: "author", code: "resolve", message: e instanceof Error ? e.message : String(e) });
    }
    if (typeof input.slug === "string" && Object.hasOwn(lessons, input.slug)) notes.push(`Slug "${input.slug}" is already a course lesson.`);
  }
  const errors = findings.filter((f) => f.level === "error").length;
  return { valid: errors === 0, errors, warnings: findings.length - errors, findings, notes };
}

function validate(args: Record<string, unknown>): ToolResult {
  const r = validateInput(args);
  const lines = [
    r.valid ? `Valid: ${r.warnings} warning(s).` : `Invalid: ${r.errors} error(s), ${r.warnings} warning(s).`,
    ...r.findings.map((f) => `${f.level.toUpperCase()} [${f.source}/${f.code}]${f.step ? ` step ${f.step}` : ""}${f.lang ? ` (${f.lang})` : ""}${f.path ? ` at ${f.path}` : ""}: ${f.message}`),
    ...r.notes.map((n) => `Note: ${n}`),
  ];
  // an invalid lesson is a normal answer of this tool, not a tool failure
  return ok(lines.join("\n"), r);
}

/* ---------- export_diagram ---------- */

export function exportDiagram(slug: string, lang: Lang, format: DiagramFormat): { text: string } | { error: string } {
  const { lesson, text } = lessons[slug] as LessonEntry;
  const t = text[lang] as Text;
  const labels = t.nodes as Record<string, string>;
  const seq = { nodes: labels, steps: t.steps as Record<string, StepText> };
  const sequence = format === "mermaid-sequence" || format === "plantuml";
  if (sequence && !hasExchanges(lesson)) return { error: `Lesson "${slug}" shows no messages, so it has no sequence diagram; use mermaid-flowchart, d2 or plantuml-components.` };
  switch (format) {
    case "mermaid-flowchart":
      return { text: toMermaidFlowchart(designState(lesson), labels) };
    case "mermaid-sequence":
      return { text: toMermaidSequence(lesson, seq) };
    case "d2":
      return { text: toD2(designState(lesson), labels) };
    case "plantuml":
      return { text: toPlantUmlSequence(lesson, seq) };
    case "plantuml-components":
      return { text: toPlantUmlComponents(designState(lesson), labels) };
  }
}

function diagram(args: Record<string, unknown>): ToolResult {
  if (!entryOf(args.slug)) return unknownLesson(args.slug);
  const slug = args.slug as string;
  const lang = langOf(args.lang);
  const format = args.format as DiagramFormat;
  const r = exportDiagram(slug, lang, format);
  if ("error" in r) return fail(r.error, { slug, lang, format });
  return ok(r.text, { slug, lang, format, diagram: r.text });
}

/* ---------- practice_rubric ---------- */

export function describeRule(r: Rule): string {
  switch (r.kind) {
    case "count":
      return `at least ${r.min} ${r.node} block(s)${r.max !== undefined ? `, at most ${r.max}` : ""}`;
    case "path":
      return `a request path ${r.kinds.join(" -> ")} (load balancers may sit in between)`;
    case "noEdge":
      return `no direct request line from ${r.from} to ${r.to}`;
    case "link":
      return `a reply (ack) line from ${r.from} to ${r.to}`;
    case "via":
      return `every path from ${r.from} to ${r.to} passes a ${r.via}`;
    case "load":
      return `at ${r.rps} rps, errors under ${r.errors * 100}%${r.ms !== undefined ? ` and latency under ${r.ms} ms` : ""}`;
    case "survive":
      return `at ${r.rps} rps, losing any one ${r.node} keeps errors under ${r.errors * 100}%`;
  }
}

function rubric(args: Record<string, unknown>): ToolResult {
  const entry = entryOf(args.slug);
  if (!entry) return unknownLesson(args.slug);
  const slug = args.slug as string;
  const lang = langOf(args.lang);
  const labels = entry.text[lang].nodes as Record<string, string>;
  const practice = practiceFor(entry.lesson, labels);
  let available = true;
  let blocker: string | undefined;
  let rules: Rule[];
  let hints;
  if (practice) {
    ({ rules, hints } = practice);
  } else {
    // no task is offered on the site; the rubric of the final design still tells what it holds
    available = false;
    const state = finalState(entry.lesson);
    if (!state) return fail(`Lesson "${slug}" has no design step to practise.`, { slug, available });
    blocker = explainState(state, labels).blocker;
    ({ rules, hints } = rulesFor(state));
  }
  const described = rules.map((r) => ({ ...r, text: describeRule(r) }));
  const structured = { slug, lang, title: entry.text[lang].title, available, ...(blocker ? { blocker } : {}), rules: described, hints };
  const lines = [
    `Practice rubric: ${entry.text[lang].title} (${slug})${available ? "" : ` - not offered on the site (${blocker ?? "no task"})`}`,
    ...described.map((r, i) => `${i + 1}. ${r.text}`),
    `Hint 1, blocks: ${hints.kinds.map(([k, n]) => (n > 1 ? `${n} x ${k}` : k)).join(", ")}`,
    `Hint 2, links: ${hints.links.map(([a, b]) => `${a} -> ${b}`).join(", ")}`,
    `Hint 3, paths: ${hints.paths.map((p) => p.join(" -> ")).join(" | ")}`,
  ];
  return ok(lines.join("\n"), structured);
}

/* ---------- registry ---------- */

const readOnly = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

export const TOOLS: Tool[] = [
  {
    name: "list_lessons",
    title: "List lessons",
    description: "The mufassall course lessons in reading order: slug, title, section, step count, level and minutes. Optional filter by section id.",
    inputSchema: {
      type: "object",
      properties: { lang: LANG_SCHEMA, section: { type: "string", description: `Section id: ${sections.map((s) => s.id).join(", ")}.` } },
      additionalProperties: false,
    },
    annotations: readOnly,
    run: listLessons,
  },
  {
    name: "get_lesson",
    title: "Get a lesson",
    description: "One lesson in one language: every step (title, plain text, kind, focus, message start lines), the final design scene (blocks and lines), metrics, scenarios and the quiz checks with answers.",
    inputSchema: { type: "object", properties: { slug: SLUG_SCHEMA, lang: LANG_SCHEMA }, required: ["slug"], additionalProperties: false },
    annotations: readOnly,
    run: getLesson,
  },
  {
    name: "validate_lesson",
    title: "Validate a lesson",
    description:
      "Checks a lesson draft with the course's own rules: the strict scene schema, then the author-mode checks (step count, recap last, grid, messages, masks, texts, Cyrillic in uz/en). `lesson` is a LessonInput object, or lesson.ts source text / JSON; `text` optionally maps uz/ru/en to LessonText objects or en.ts-like sources. Returns errors and warnings.",
    inputSchema: {
      type: "object",
      properties: {
        lesson: { type: ["object", "string"], description: "LessonInput object, a {lesson, text} bundle, or lesson.ts source text." },
        text: {
          type: "object",
          description: "Optional texts keyed by language; each is a LessonText object or source text.",
          additionalProperties: { type: ["object", "string"] },
        },
        lang: { ...LANG_SCHEMA, description: "Language of the issue messages. Default en." },
      },
      required: ["lesson"],
      additionalProperties: false,
    },
    annotations: readOnly,
    run: validate,
  },
  {
    name: "export_diagram",
    title: "Export a lesson diagram",
    description:
      "A lesson as diagram-as-code: mermaid-flowchart / d2 / plantuml-components draw the final design; mermaid-sequence / plantuml draw the step-by-step messages as a sequence diagram (only start lines, never bodies).",
    inputSchema: {
      type: "object",
      properties: { slug: SLUG_SCHEMA, lang: LANG_SCHEMA, format: { type: "string", enum: DIAGRAM_FORMATS, description: "Output notation." } },
      required: ["slug", "format"],
      additionalProperties: false,
    },
    annotations: readOnly,
    run: diagram,
  },
  {
    name: "practice_rubric",
    title: "Practice rubric",
    description: "The checks a reader's Lab diagram must pass to rebuild a lesson's design (the site's practice mode), with the three hint levels.",
    inputSchema: { type: "object", properties: { slug: SLUG_SCHEMA, lang: LANG_SCHEMA }, required: ["slug"], additionalProperties: false },
    annotations: readOnly,
    run: rubric,
  },
];

/* ---------- resources ---------- */

const URI_PREFIX = "mufassall://lessons/";

export const RESOURCES: ResourceProvider = {
  list: (): Resource[] =>
    order.map((slug) => ({
      uri: `${URI_PREFIX}${slug}`,
      name: slug,
      title: (lessons[slug] as LessonEntry).text.en.title,
      description: "The lesson as JSON (English); add /uz or /ru for another language.",
      mimeType: "application/json",
    })),
  templates: () => [
    {
      uriTemplate: `${URI_PREFIX}{slug}/{lang}`,
      name: "lesson",
      title: "A lesson in one language",
      description: "The same JSON as the get_lesson tool. lang: uz, ru or en.",
      mimeType: "application/json",
    },
  ],
  read(uri) {
    if (!uri.startsWith(URI_PREFIX)) return null;
    const [slug, lang = "en", ...rest] = uri.slice(URI_PREFIX.length).split("/");
    if (rest.length || !entryOf(slug) || !(LANGS as readonly string[]).includes(lang)) return null;
    return [{ uri, mimeType: "application/json", text: JSON.stringify(lessonView(slug!, lang as Lang)) }];
  },
};
