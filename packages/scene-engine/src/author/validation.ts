import { PUBLIC_MASK, annotate, resolve } from "@mufassall/scene-schema";
import { loadSpots } from "@mufassall/scene-schema/layout";
import {
  ALLOWED_UNITS,
  AUTHOR_LANGS,
  type AuthorLang,
  type Draft,
  type DraftExchange,
  type DraftStep,
  GRID_MAX,
  ID_RE,
  allNodeIds,
  allSteps,
  exchangeOut,
  toLessonInput,
} from "./model";

export type IssueCode =
  | "slug"
  | "minutes"
  | "stepId"
  | "stepDup"
  | "recapLast"
  | "fewSteps"
  | "manySteps"
  | "unit"
  | "metricId"
  | "manyMetrics"
  | "manyNodes"
  | "close"
  | "sameCell"
  | "offGrid"
  | "wireShare"
  | "exEdge"
  | "emptyHead"
  | "markMissing"
  | "maskValue"
  | "maskMissing"
  | "manyMarks"
  | "cyrillic"
  | "text"
  | "label"
  | "metricLabel"
  | "learn"
  | "fieldNote"
  | "title"
  | "resolve"
  | "loadSpot"
  | "crossing"
  | CaseIssueCode;

/** Issues about cases (alternative paths); every one but `manyCases` carries `Issue.case`. */
export type CaseIssueCode =
  | "caseId"
  | "caseDup"
  | "caseEmpty"
  | "caseFrom"
  | "caseFromLast"
  | "caseNode"
  | "caseLabel"
  | "manyCases"
  | "manyCaseSteps";

/** The course limits for scenarios (`lessonSchema`); a system may hold more (MAX_CASES...) but then is not a course lesson. */
export const COURSE_MAX_CASES = 4;
export const COURSE_MAX_CASE_STEPS = 6;

/** Messages for the case codes, `{x}` filled like the other issue texts. */
export const CASE_ISSUE_TEXT: Record<AuthorLang, Record<CaseIssueCode, string>> = {
  en: {
    caseId: "Case ID “{x}”: lowercase Latin letters, digits and dashes, starting with a letter.",
    caseDup: "Case ID “{x}” is used twice.",
    caseEmpty: "Case “{x}” has no steps.",
    caseFrom: "The case branches from step “{x}”, which does not exist.",
    caseFromLast: "A case cannot branch from the last step (“{x}”).",
    caseNode: "In the case, “{x}” points to a block that is not on the scene.",
    caseLabel: "The case “{x}” has no name for the switch.",
    manyCases: "A lesson has at most 4 cases (now {x}).",
    manyCaseSteps: "A case in a lesson has at most 6 steps (now {x}).",
  },
  ru: {
    caseId: "ID случая «{x}»: строчные латинские буквы, цифры и дефис, в начале буква.",
    caseDup: "ID случая «{x}» повторяется.",
    caseEmpty: "В случае «{x}» нет шагов.",
    caseFrom: "Случай ответвляется от шага «{x}», которого нет.",
    caseFromLast: "Случай не может ответвляться от последнего шага («{x}»).",
    caseNode: "В случае «{x}» указывает на блок, которого нет на сцене.",
    caseLabel: "У случая «{x}» нет названия для переключателя.",
    manyCases: "В уроке не больше 4 случаев (сейчас {x}).",
    manyCaseSteps: "В случае урока не больше 6 шагов (сейчас {x}).",
  },
  uz: {
    caseId: "“{x}” holat ID: kichik lotin harflari, raqam va chiziqcha, boshida harf.",
    caseDup: "“{x}” holat ID ikki marta ishlatilgan.",
    caseEmpty: "“{x}” holatida qadam yo'q.",
    caseFrom: "Holat “{x}” qadamidan ajraladi, bunday qadam yo'q.",
    caseFromLast: "Holat oxirgi qadamdan (“{x}”) ajrala olmaydi.",
    caseNode: "Holatda “{x}” sahnada yo'q blokka ishora qiladi.",
    caseLabel: "“{x}” holatining almashtirgich uchun nomi yo'q.",
    manyCases: "Darsda ko'pi bilan 4 holat bo'ladi (hozir {x}).",
    manyCaseSteps: "Darsdagi holatda ko'pi bilan 6 qadam bo'ladi (hozir {x}).",
  },
};

/** `error`: the exported lesson would fail the course tests; `warn`: it passes but reads badly. */
export interface Issue {
  level: "error" | "warn";
  code: IssueCode;
  /** zero-based step index; inside `case` when that is set */
  step?: number;
  /** id of the case (alternative path) the issue is in */
  case?: string;
  lang?: AuthorLang;
  /** the field, node, metric or mark the issue is about */
  x?: string;
}

export const MAX_NODES_ADVICE = 8;
const CYRILLIC = /[Ѐ-ӿ]/;
export const hasCyrillic = (s: string) => CYRILLIC.test(s);

/** Chebyshev distance: diagonal neighbours count as 1 cell apart. */
export const cellDistance = (a: readonly number[], b: readonly number[]) => Math.max(Math.abs(a[0]! - b[0]!), Math.abs(a[1]! - b[1]!));

export interface WireReport {
  /** marks that never appear in the request or the response */
  missingMarks: string[];
  /** masked fields whose value is not `***` */
  badMasks: string[];
  /** masked names not found as a header, JSON key or XML element */
  missingMasked: string[];
}

/** Same scan the course test runs, so a green check here means a green test there. */
export function checkWire(x: DraftExchange): WireReport {
  const ex = exchangeOut(x);
  const seen = new Set<string>();
  const lines = [ex.request, ...(ex.response ? [ex.response] : [])].flatMap((m) => annotate(m, ex.marks, ex.masked, seen));
  const bad = new Set<string>();
  for (const l of lines) for (const g of l) if (g.kind === "mask" && g.raw !== PUBLIC_MASK) bad.add(g.name);
  return {
    missingMarks: x.marks.filter((m) => !seen.has(m)),
    badMasks: [...bad],
    missingMasked: x.masked.filter((name) => !lines.some((l) => l.some((g) => g.kind === "mask" && g.name === name))),
  };
}

function stepIssues(s: DraftStep, i: number, d: Draft, all: Issue[], caseId?: string) {
  const out = caseId === undefined ? all : { push: (x: Issue) => all.push({ ...x, case: caseId }) };
  const nodes = Object.values(s.nodes);
  if (!ID_RE.test(s.id)) out.push({ level: "error", code: "stepId", step: i });
  if (nodes.length > MAX_NODES_ADVICE) out.push({ level: "warn", code: "manyNodes", step: i, x: String(nodes.length) });
  for (let a = 0; a < nodes.length; a++) {
    const na = nodes[a]!;
    if (na.at.some((c) => c < 0 || c > GRID_MAX)) out.push({ level: "error", code: "offGrid", step: i, x: na.id });
    for (let b = a + 1; b < nodes.length; b++) {
      const nb = nodes[b]!;
      const dist = cellDistance(na.at, nb.at);
      if (dist === 0) out.push({ level: "error", code: "sameCell", step: i, x: `${na.id}, ${nb.id}` });
      else if (dist < 2) out.push({ level: "warn", code: "close", step: i, x: `${na.id}, ${nb.id}` });
    }
  }
  const names = (id: string) => AUTHOR_LANGS.map((l) => d.labels[l][id] || id);
  for (const id of loadSpots(nodes, names).blocked) out.push({ level: "warn", code: "loadSpot", step: i, x: id });
  for (const c of crossings(s, names)) out.push({ level: "warn", code: "crossing", step: i, x: c });

  for (const lang of AUTHOR_LANGS) {
    const t = s.text[lang];
    if (!t.title.trim() || !t.short.trim() || !t.body.trim()) out.push({ level: "error", code: "text", step: i, lang });
  }

  const x = s.exchange;
  if (!x) return;
  if (!s.edges[x.edge]) out.push({ level: "error", code: "exEdge", step: i, x: x.edge });
  if (!x.request.head.trim() || (x.response && !x.response.head.trim())) out.push({ level: "error", code: "emptyHead", step: i });
  if (x.marks.length > 9) out.push({ level: "error", code: "manyMarks", step: i });
  const w = checkWire(x);
  for (const m of w.missingMarks) out.push({ level: "error", code: "markMissing", step: i, x: m });
  for (const m of w.badMasks) out.push({ level: "error", code: "maskValue", step: i, x: m });
  for (const m of w.missingMasked) out.push({ level: "error", code: "maskMissing", step: i, x: m });
  for (const lang of AUTHOR_LANGS) {
    for (const m of x.marks) if (!s.text[lang].fields[m]?.trim()) out.push({ level: "error", code: "fieldNote", step: i, lang, x: m });
  }
}

/** Edges drawn across another node's name: the same screen geometry as the course layout test. */
export function crossings(s: DraftStep, names: (id: string) => string[]): string[] {
  const scr = ([x, y]: readonly number[]) => [(x! - y!) * 32, (x! + y!) * 16] as const;
  const bad: string[] = [];
  for (const e of Object.values(s.edges)) {
    const a = s.nodes[e.from];
    const b = s.nodes[e.to];
    if (!a || !b) continue;
    const [ax, ay] = scr(a.at);
    const [bx, by] = scr(b.at);
    for (const n of Object.values(s.nodes)) {
      if (n.id === e.from || n.id === e.to) continue;
      const [nx, ny] = scr(n.at);
      const half = Math.max(...names(n.id).map((t) => t.length)) * 3.7 + 2;
      for (let k = 0; k <= 50; k++) {
        const t = k * 0.02;
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        if (px > nx - half && px < nx + half && py > ny + 24 && py < ny + 38) {
          bad.push(`${e.id} / ${n.id}`);
          break;
        }
      }
    }
  }
  return bad;
}

/** Every rule of `content/lessons.test.ts` that can be checked on a draft, plus the readability advice. */
export function checkDraft(d: Draft, opts: { course?: boolean } = {}): Issue[] {
  const out = checkAll(d);
  if (opts.course !== false) return out;
  // A system in "My systems" may hold the full workflow; the course limits only matter on export.
  return out.map((i) => (COURSE_ONLY.has(i.code) ? { ...i, level: "warn" as const } : i));
}

const COURSE_ONLY: ReadonlySet<IssueCode> = new Set<IssueCode>(["manySteps", "manyCases", "manyCaseSteps"]);

function checkAll(d: Draft): Issue[] {
  const out: Issue[] = [];
  if (!ID_RE.test(d.slug)) out.push({ level: "error", code: "slug" });
  if (!Number.isInteger(d.minutes) || d.minutes < 1 || d.minutes > 30) out.push({ level: "error", code: "minutes" });
  if (d.steps.at(-1)?.kind !== "recap") out.push({ level: "error", code: "recapLast" });
  if (d.steps.length < 7) out.push({ level: "error", code: "fewSteps", x: String(d.steps.length) });
  if (d.steps.length > 16) out.push({ level: "error", code: "manySteps" });
  const seen = new Set<string>();
  d.steps.forEach((s, i) => {
    if (seen.has(s.id)) out.push({ level: "error", code: "stepDup", step: i, x: s.id });
    seen.add(s.id);
  });
  caseIssues(d, seen, out);
  if (d.metrics.length > 6) out.push({ level: "error", code: "manyMetrics" });
  const mids = new Set<string>();
  for (const m of d.metrics) {
    if (!ID_RE.test(m.id) || mids.has(m.id)) out.push({ level: "error", code: "metricId", x: m.id });
    mids.add(m.id);
    if (!(ALLOWED_UNITS as readonly string[]).includes(m.unit)) out.push({ level: "error", code: "unit", x: m.id });
  }

  d.steps.forEach((s, i) => stepIssues(s, i, d, out));
  for (const c of d.cases ?? []) c.steps.forEach((s, i) => stepIssues(s, i, d, out, c.id));

  const work = d.steps.filter((s) => s.kind !== "recap");
  if (work.filter((s) => s.exchange).length * 2 < work.length) out.push({ level: "error", code: "wireShare" });

  const ids = allNodeIds(d);
  for (const lang of AUTHOR_LANGS) {
    if (!d.title[lang].trim() || !d.summary[lang].trim()) out.push({ level: "error", code: "title", lang });
    if (!d.learn[lang].some((l) => l.trim())) out.push({ level: "error", code: "learn", lang });
    for (const id of ids) if (!d.labels[lang][id]?.trim()) out.push({ level: "error", code: "label", lang, x: id });
    for (const m of d.metrics) if (!m.label[lang].trim()) out.push({ level: "error", code: "metricLabel", lang, x: m.id });
  }
  for (const lang of ["uz", "en"] as const) {
    for (const [where, text] of textsOf(d, lang)) if (hasCyrillic(text)) out.push({ level: "error", code: "cyrillic", lang, x: where });
  }

  try {
    resolve(toLessonInput(d));
  } catch (e) {
    out.push({ level: "error", code: "resolve", x: e instanceof Error ? e.message : String(e) });
  }
  return out;
}

/** Case-level rules; `seen` holds the base step ids and collects the case step ids. */
function caseIssues(d: Draft, seen: Set<string>, out: Issue[]) {
  const cases = d.cases ?? [];
  if (cases.length > COURSE_MAX_CASES) out.push({ level: "error", code: "manyCases", x: String(cases.length) });
  const base = d.steps.map((s) => s.id);
  const ids = new Set<string>();
  for (const c of cases) {
    const at = (code: IssueCode, x: string, step?: number): Issue => ({ level: "error", code, case: c.id, x, ...(step === undefined ? {} : { step }) });
    if (!ID_RE.test(c.id)) out.push(at("caseId", c.id));
    if (ids.has(c.id)) out.push(at("caseDup", c.id));
    ids.add(c.id);
    const from = base.indexOf(c.from);
    if (from < 0) out.push(at("caseFrom", c.from));
    else if (from === base.length - 1) out.push(at("caseFromLast", c.from));
    if (!c.steps.length) out.push(at("caseEmpty", c.id));
    if (c.steps.length > COURSE_MAX_CASE_STEPS) out.push(at("manyCaseSteps", String(c.steps.length)));
    for (const lang of AUTHOR_LANGS) if (!c.label[lang]?.trim()) out.push({ ...at("caseLabel", c.id), lang });
    c.steps.forEach((s, i) => {
      if (seen.has(s.id)) out.push(at("stepDup", s.id, i));
      seen.add(s.id);
      for (const x of danglingRefs(s)) out.push(at("caseNode", x, i));
    });
  }
}

/** Edges and focus that point at a node missing from the step (a draft built in code, before `normalize`). */
export function danglingRefs(s: DraftStep): string[] {
  const bad: string[] = [];
  for (const e of Object.values(s.edges)) for (const end of [e.from, e.to]) if (!s.nodes[end]) bad.push(`${e.id}: ${end}`);
  for (const f of s.focus) if (!s.nodes[f]) bad.push(f);
  return bad;
}

/** Every reader-facing string of one language, each with where it lives. */
function textsOf(d: Draft, lang: AuthorLang): [string, string][] {
  const out: [string, string][] = [
    ["title", d.title[lang]],
    ["summary", d.summary[lang]],
    ...d.learn[lang].map((l, i) => [`learn ${i + 1}`, l] as [string, string]),
    ...Object.entries(d.labels[lang]),
    ...d.metrics.map((m) => [m.id, m.label[lang]] as [string, string]),
  ];
  for (const c of d.cases ?? []) out.push([c.id, c.label[lang]]);
  for (const s of allSteps(d)) {
    const t = s.text[lang];
    out.push([s.id, [t.short, t.title, t.body, t.watch, ...Object.values(t.fields)].join(" ")]);
    if (t.check) out.push([`${s.id} check`, [t.check.q, t.check.why, ...t.check.options].join(" ")]);
  }
  return out;
}
