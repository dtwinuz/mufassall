import { describe, expect, it } from "vitest";
import { type LessonInput, type LessonText, type SceneState, resolve, resolveScenario } from "@mufassall/scene-schema";
import { lessons } from "../../../../content/index";
import { BUNDLE_FORMAT, decodeShare, makeBundle, parseBundle, toBase64Url } from "./bundle";
import {
  AUTHOR_LANGS,
  type AuthorLang,
  type Draft,
  MAX_BASE_STEPS,
  MAX_CASES,
  MAX_CASE_STEPS,
  MAX_EDGES,
  MAX_NODES,
  MAX_STEPS,
  addCase,
  addCaseStep,
  addStep,
  allNodeIds,
  allStepIds,
  deleteCase,
  deleteCaseStep,
  deleteStep,
  duplicateCaseStep,
  duplicateStep,
  editCaseStep,
  editStep,
  fromLesson,
  moveCaseStep,
  newDraft,
  normalize,
  renameCaseId,
  renameEdge,
  renameMetric,
  renameNode,
  sanitizeDraft,
  setCaseFrom,
  setCaseLabel,
  snapshotOf,
  toLessonInput,
  toLessonText,
} from "./model";
import { type StorageLike, createSystem, loadSystem, systemKey } from "./store";
import { systemLesson } from "./systemLesson";
import { toLessonSource } from "./toLessonSource";
import { CASE_ISSUE_TEXT, checkDraft } from "./validation";

const texts = (e: { text: unknown }) => e.text as Partial<Record<AuthorLang, LessonText<LessonInput>>>;

/** Exported patches of every case fold back into exactly the case's snapshots. */
function roundTrip(d: Draft) {
  const n = normalize(d);
  const lesson = toLessonInput(n);
  expect(resolve(lesson)).toEqual(n.steps.map(snapshotOf));
  for (const c of n.cases) {
    const at = n.steps.findIndex((s) => s.id === c.from);
    expect(resolveScenario(lesson, c.id).slice(at + 1)).toEqual(c.steps.map(snapshotOf) as SceneState[]);
  }
}

/** The starter draft with a db, five base steps and one case off step 1. */
function withCase(): { d: Draft; caseId: string } {
  let d = newDraft();
  d = editStep(d, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { id: "db", kind: "db", at: [10, 6], state: "ok" } } }), true);
  d = addStep(d, 0);
  d = addStep(d, 1);
  d = addStep(d, 2);
  const r = addCase(d, d.steps[1]!.id);
  return { d: r.draft, caseId: r.caseId };
}

describe("caps", () => {
  it("exports the full-workflow caps", () => {
    expect([MAX_BASE_STEPS, MAX_STEPS, MAX_CASES, MAX_CASE_STEPS, MAX_NODES, MAX_EDGES]).toEqual([60, 60, 12, 16, 40, 80]);
  });

  it("stops adding base steps, cases and case steps at the cap", () => {
    let d = newDraft();
    for (let i = 0; i < 70; i++) d = addStep(d, d.steps.length - 1);
    expect(d.steps.length).toBe(MAX_BASE_STEPS);
    expect(duplicateStep(d, 0)).toBe(d);
    for (let i = 0; i < 15; i++) d = addCase(d, d.steps[i]!.id).draft;
    expect(d.cases.length).toBe(MAX_CASES);
    expect(addCase(d, "start")).toEqual({ draft: d, caseId: "" });
    const id = d.cases[0]!.id;
    for (let i = 0; i < 20; i++) d = addCaseStep(d, id, 0);
    expect(d.cases[0]!.steps.length).toBe(MAX_CASE_STEPS);
    expect(duplicateCaseStep(d, id, 0)).toBe(d);
    expect(new Set(allStepIds(d)).size).toBe(allStepIds(d).length);
  });

  it("keeps a big sanitized system inside the caps", () => {
    const raw = JSON.parse(JSON.stringify(newDraft()));
    raw.steps = Array.from({ length: 80 }, (_, i) => ({ ...raw.steps[0], id: `s${i}` }));
    raw.steps[0].nodes = Object.fromEntries(
      Array.from({ length: 60 }, (_, i) => [`n${i}`, { kind: "service", at: [i % 13, Math.floor(i / 13)] }]),
    );
    raw.cases = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, from: "s0", label: {}, steps: Array.from({ length: 30 }, (_, j) => ({ id: `c${i}-${j}` })) }));
    const d = sanitizeDraft(raw)!;
    expect(d.steps.length).toBe(MAX_BASE_STEPS);
    expect(Object.keys(d.steps[0]!.nodes).length).toBe(MAX_NODES);
    expect(d.cases.length).toBe(MAX_CASES);
    expect(d.cases.every((c) => c.steps.length === MAX_CASE_STEPS)).toBe(true);
  });
});

describe("case helpers", () => {
  it("adds a case whose first step starts from the branch step's scene", () => {
    const { d, caseId } = withCase();
    expect(caseId).toBe("case");
    const c = d.cases[0]!;
    expect(c.from).toBe(d.steps[1]!.id);
    expect(c.steps).toHaveLength(1);
    expect(c.steps[0]!.kind).toBe("case");
    expect(c.steps[0]!.nodes).toEqual(d.steps[1]!.nodes);
    expect(allStepIds(d)).toContain(c.steps[0]!.id);
    expect(addCase(d, "ghost")).toEqual({ draft: d, caseId: "" });
    expect(addCase(d, d.steps[1]!.id).caseId).toBe("case-2");
    roundTrip(d);
  });

  it("is pure: the input draft never changes", () => {
    const { d, caseId } = withCase();
    const before = JSON.stringify(d);
    addCaseStep(d, caseId, 0);
    duplicateCaseStep(d, caseId, 0);
    editCaseStep(d, caseId, 0, (s) => ({ ...s, metrics: {} }), true);
    setCaseLabel(d, caseId, "en", "Timeout");
    renameCaseId(d, caseId, "timeout");
    setCaseFrom(d, caseId, "start");
    deleteCase(d, caseId);
    deleteStep(d, 1);
    renameNode(d, "db", "store");
    expect(JSON.stringify(d)).toBe(before);
  });

  it("renames, labels, re-points and deletes a case", () => {
    const { d, caseId } = withCase();
    let e = renameCaseId(d, caseId, "timeout");
    expect(e.cases[0]!.id).toBe("timeout");
    expect(renameCaseId(e, "timeout", "Bad Id")).toBe(e);
    const two = addCase(e, "start");
    expect(renameCaseId(two.draft, two.caseId, "timeout")).toBe(two.draft);
    e = setCaseLabel(e, "timeout", "uz", "Vaqt tugadi");
    expect(e.cases[0]!.label).toEqual({ uz: "Vaqt tugadi", ru: "", en: "" });
    e = setCaseFrom(e, "timeout", "start");
    expect(e.cases[0]!.from).toBe("start");
    expect(setCaseFrom(e, "timeout", "ghost")).toBe(e);
    expect(deleteCase(e, "timeout").cases).toEqual([]);
    expect(deleteCase(e, "ghost")).toBe(e);
    roundTrip(e);
  });

  it("adds, duplicates, moves and deletes case steps, keeping one", () => {
    const { d, caseId } = withCase();
    let e = addCaseStep(d, caseId, 0);
    e = duplicateCaseStep(e, caseId, 1);
    expect(e.cases[0]!.steps).toHaveLength(3);
    const ids = e.cases[0]!.steps.map((s) => s.id);
    e = moveCaseStep(e, caseId, 2, -2);
    expect(e.cases[0]!.steps.map((s) => s.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(moveCaseStep(e, caseId, 0, -1)).toBe(e);
    e = deleteCaseStep(e, caseId, 0);
    e = deleteCaseStep(e, caseId, 0);
    expect(e.cases[0]!.steps).toHaveLength(1);
    expect(deleteCaseStep(e, caseId, 0)).toBe(e);
    // an empty case (from a file) grows from the branch step's scene
    const empty = { ...e, cases: [{ ...e.cases[0]!, steps: [] }] };
    expect(addCaseStep(empty, caseId, 5).cases[0]!.steps[0]!.nodes).toEqual(e.steps[1]!.nodes);
    roundTrip(e);
  });

  it("carries a forward case edit into later steps of that case only", () => {
    const { d, caseId } = withCase();
    let e = addCaseStep(d, caseId, 0);
    e = editCaseStep(e, caseId, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { ...s.nodes.db!, state: "down" } } }), true);
    expect(e.cases[0]!.steps.map((s) => s.nodes.db!.state)).toEqual(["down", "down"]);
    expect(e.steps.every((s) => s.nodes.db!.state === "ok")).toBe(true);
    const only = editCaseStep(e, caseId, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { ...s.nodes.db!, state: "slow" } } }), false);
    expect(only.cases[0]!.steps.map((s) => s.nodes.db!.state)).toEqual(["slow", "down"]);
    roundTrip(only);
  });

  it("carries a forward base edit into cases that branch at or after it", () => {
    const { d } = withCase();
    const late = addCase(d, d.steps[3]!.id).draft;
    // edit before both branch points: both cases follow
    const e = editStep(late, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { ...s.nodes.db!, state: "slow" } } }), true);
    expect(e.steps.map((s) => s.nodes.db!.state)).toEqual(Array(e.steps.length).fill("slow"));
    expect(e.cases.map((c) => c.steps[0]!.nodes.db!.state)).toEqual(["slow", "slow"]);
    // edit after the first branch point: only the later case follows
    const f = editStep(late, 2, (s) => ({ ...s, nodes: { ...s.nodes, db: { ...s.nodes.db!, state: "down" } } }), true);
    expect(f.cases.map((c) => c.steps[0]!.nodes.db!.state)).toEqual(["ok", "down"]);
    roundTrip(e);
    roundTrip(f);
  });

  it("follows a base step id rename made in editStep", () => {
    const { d, caseId } = withCase();
    const old = d.steps[1]!.id;
    const e = editStep(d, 1, (s) => ({ ...s, id: "check" }), false);
    expect(e.cases.find((c) => c.id === caseId)!.from).toBe("check");
    expect(d.cases[0]!.from).toBe(old);
    roundTrip(e);
  });

  it("moves a case to the previous step when its branch step is deleted", () => {
    const { d } = withCase();
    const e = deleteStep(d, 1);
    expect(e.cases[0]!.from).toBe(d.steps[0]!.id);
    // the first step: the case moves to the new first step
    const first = addCase(d, "start").draft;
    const f = deleteStep(first, 0);
    expect(f.cases[1]!.from).toBe(d.steps[1]!.id);
    roundTrip(e);
    roundTrip(f);
  });

  it("renames nodes, edges and metrics inside case steps too", () => {
    let { d, caseId } = withCase();
    d = { ...d, metrics: [{ id: "lat", unit: "ms", better: "down", label: { uz: "", ru: "", en: "" } }] };
    d = editCaseStep(
      d,
      caseId,
      0,
      (s) => ({
        ...s,
        nodes: { ...s.nodes, cache: { id: "cache", kind: "cache", at: [6, 10], state: "ok" } },
        edges: { ...s.edges, hit: { id: "hit", from: "api", to: "cache", flow: "request", rate: 1, cut: false } },
        metrics: { lat: 90 },
        focus: ["cache"],
      }),
      true,
    );
    expect(allNodeIds(d)).toContain("cache");
    let e = renameNode(d, "cache", "redis");
    const cs = () => e.cases[0]!.steps[0]!;
    expect(Object.keys(cs().nodes)).toContain("redis");
    expect(cs().edges.hit).toMatchObject({ to: "redis" });
    expect(cs().focus).toEqual(["redis"]);
    expect(renameNode(e, "api", "redis")).toBe(e);
    e = renameEdge(e, "hit", "lookup");
    expect(Object.keys(cs().edges)).toContain("lookup");
    e = renameMetric(e, "lat", "p99");
    expect(cs().metrics).toEqual({ p99: 90 });
    roundTrip(e);
  });
});

describe("old drafts migrate to v2", () => {
  const v1 = () => {
    const raw = JSON.parse(JSON.stringify(newDraft())) as Record<string, unknown>;
    raw.v = 1;
    delete raw.cases;
    return raw;
  };

  it("a v1 draft gets an empty case list", () => {
    const d = sanitizeDraft(v1())!;
    expect(d.v).toBe(2);
    expect(d.cases).toEqual([]);
    expect(sanitizeDraft(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(sanitizeDraft({ ...v1(), v: 3 })).toBeNull();
  });

  it("drops cases off unknown steps and fixes clashing ids", () => {
    const raw = v1();
    raw.v = 2;
    raw.cases = [
      { id: "lost", from: "ghost", label: {}, steps: [{ id: "x", kind: "case" }] },
      { id: "ok", from: "start", label: { en: "Ok" }, steps: [{ id: "start", kind: "case" }] },
      { id: "ok", from: "start", label: {}, steps: [] },
      "junk",
    ];
    const d = sanitizeDraft(raw)!;
    expect(d.cases.map((c) => c.id)).toEqual(["ok", "ok-2"]);
    expect(d.cases[0]!.steps[0]!.id).not.toBe("start");
    expect(new Set(allStepIds(d)).size).toBe(allStepIds(d).length);
  });

  it("localStorage: a system saved as v1 loads as v2", () => {
    const map = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
    const r = createSystem(newDraft(), "blank", { storage });
    if (!r.ok) throw new Error(r.error);
    map.set(systemKey(r.value.id), JSON.stringify(v1()));
    const d = loadSystem(r.value.id, { storage })!;
    expect(d.v).toBe(2);
    expect(d.cases).toEqual([]);
  });

  it("share link: a v1 draft in #s= decodes as v2", async () => {
    const buf = await new Response(
      new Blob([new TextEncoder().encode(JSON.stringify(v1())) as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw")),
    ).arrayBuffer();
    const r = await decodeShare(toBase64Url(new Uint8Array(buf)));
    expect(r.ok && r.draft.v).toBe(2);
    expect(r.ok && r.draft.cases).toEqual([]);
  });

  it("bundle file: v1 drafts inside a bundle and a bare v1 draft both load", () => {
    const bundle = parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, v: 1, systems: [{ title: "A", draft: v1() }] }));
    expect(bundle.ok && bundle.systems[0]!.draft.cases).toEqual([]);
    const bare = parseBundle(JSON.stringify(v1()));
    expect(bare.ok && bare.systems[0]!.draft.v).toBe(2);
    // and a v2 draft with cases survives the round trip
    const { d } = withCase();
    const back = parseBundle(JSON.stringify(makeBundle([{ title: "B", draft: d }])));
    expect(back.ok && back.systems[0]!.draft).toEqual(sanitizeDraft(JSON.parse(JSON.stringify(d))));
    const bareV2 = parseBundle(JSON.stringify(d));
    expect(bareV2.ok && bareV2.systems[0]!.draft.cases).toHaveLength(1);
  });
});

describe("lessons with scenarios", () => {
  const withScenarios = Object.entries(lessons).filter(([, e]) => (e.lesson as LessonInput).scenarios?.length);

  it("there are lessons with scenarios to test against", () => {
    expect(withScenarios.map(([s]) => s)).toContain("kyc-onboarding");
  });

  it.each(withScenarios.map(([s]) => s))("%s keeps every scenario through fromLesson → export → system", (slug) => {
    const entry = lessons[slug]!;
    const lesson = entry.lesson as LessonInput;
    const { draft, droppedScenarios } = fromLesson(lesson, texts(entry));
    expect(droppedScenarios).toBe(0);
    expect(draft.cases.map((c) => [c.id, c.from])).toEqual(lesson.scenarios!.map((s) => [s.id, s.from]));
    const out = toLessonInput(draft);
    for (const sc of lesson.scenarios!) expect(resolveScenario(out, sc.id)).toEqual(resolveScenario(lesson, sc.id));
    for (const lang of AUTHOR_LANGS) {
      const t = toLessonText(draft, lang).scenarios as Record<string, unknown>;
      expect(t).toEqual((entry.text as Record<string, LessonText<LessonInput>>)[lang]!.scenarios);
    }
    // stored and played back
    const stored = sanitizeDraft(JSON.parse(JSON.stringify(draft)))!;
    expect(stored).toEqual(draft);
    const r = systemLesson(stored, "en", `my-${slug}`);
    if (!r.ok) throw new Error(r.error);
    expect(r.lesson.scenarios!.map((s) => s.id)).toEqual(lesson.scenarios!.map((s) => s.id));
    expect(Object.keys(r.text.scenarios ?? {})).toEqual(lesson.scenarios!.map((s) => s.id));
  });

  it("kyc-onboarding: the generated source prints every scenario and its texts", () => {
    const entry = lessons["kyc-onboarding"]!;
    const lesson = entry.lesson as LessonInput;
    const { draft } = fromLesson(lesson, texts(entry));
    const src = toLessonSource(draft);
    const run = (code: string) =>
      new Function(
        code
          .replace(/^import .*$/gm, "")
          .replace("export default defineLesson(", "return (")
          .replace(/const text: LessonText<typeof lesson> = /, "const text = ")
          .replace("export default text;", "return text;"),
      )() as unknown;
    const back = run(src["lesson.ts"]) as LessonInput;
    expect(back.scenarios!.map((s) => s.id)).toEqual(lesson.scenarios!.map((s) => s.id));
    for (const sc of lesson.scenarios!) expect(resolveScenario(back, sc.id)).toEqual(resolveScenario(lesson, sc.id));
    for (const lang of AUTHOR_LANGS) {
      const t = run(src[`${lang}.ts`]) as LessonText<LessonInput>;
      expect(t.scenarios).toEqual((entry.text as Record<string, LessonText<LessonInput>>)[lang]!.scenarios);
    }
  });
});

describe("systemLesson with cases", () => {
  it("plays a case with text fallbacks and leaves out a case that cannot play", () => {
    const { d, caseId } = withCase();
    let e = setCaseLabel(d, caseId, "ru", "Таймаут");
    e = editCaseStep(e, caseId, 0, (s) => ({ ...s, text: { ...s.text, en: { ...s.text.en, title: "Late answer" } } }), false);
    e = { ...e, cases: [...e.cases, { id: "empty", from: "start", label: { uz: "", ru: "", en: "" }, steps: [] }] };
    const r = systemLesson(e, "uz", "my-x");
    if (!r.ok) throw new Error(r.error);
    expect(r.lesson.scenarios!.map((s) => s.id)).toEqual([caseId]);
    const sc = (r.text.scenarios as Record<string, { label: string; steps: Record<string, { title: string; short: string }> }>)[caseId]!;
    expect(sc.label).toBe("Таймаут");
    const st = sc.steps[e.cases[0]!.steps[0]!.id]!;
    expect(st.title).toBe("Late answer");
    expect(st.short).toBe("Late answer");
  });
});

describe("checkDraft on cases", () => {
  it("reports case-level issues with the case id", () => {
    const { d, caseId } = withCase();
    const base = d.steps.map((s) => s.id);
    const bad: Draft = {
      ...d,
      cases: [
        ...d.cases,
        { id: "Bad", from: "ghost", label: { uz: "", ru: "", en: "" }, steps: [] },
        { id: caseId, from: base.at(-1)!, label: { uz: "a", ru: "a", en: "a" }, steps: [{ ...d.steps[0]!, id: base[0]!, focus: ["ghost"] }] },
      ],
    };
    const issues = checkDraft(bad);
    const codes = (code: string) => issues.filter((i) => i.code === code);
    expect(codes("caseId")).toMatchObject([{ case: "Bad", x: "Bad" }]);
    expect(codes("caseFrom")).toMatchObject([{ case: "Bad", x: "ghost" }]);
    expect(codes("caseEmpty")).toMatchObject([{ case: "Bad" }]);
    expect(codes("caseDup")).toMatchObject([{ case: caseId }]);
    expect(codes("caseFromLast")).toMatchObject([{ case: caseId }]);
    expect(codes("stepDup").some((i) => i.case === caseId && i.step === 0)).toBe(true);
    expect(codes("caseNode")).toMatchObject([{ case: caseId, step: 0, x: "ghost" }]);
    expect(codes("caseLabel").filter((i) => i.case === caseId)).toHaveLength(3);
    // step rules run on case steps too, tagged with the case
    expect(issues.some((i) => i.code === "text" && i.case === caseId)).toBe(true);
  });

  it("flags more cases or case steps than a course lesson holds", () => {
    let d = withCase().d;
    for (let i = 0; i < 4; i++) d = addCase(d, "start").draft;
    for (let i = 0; i < 6; i++) d = addCaseStep(d, "case", 0);
    const issues = checkDraft(d);
    expect(issues.find((i) => i.code === "manyCases")).toMatchObject({ x: "5" });
    expect(issues.find((i) => i.code === "manyCaseSteps")).toMatchObject({ case: "case", x: "7", level: "error" });
    // a system in "My systems" holds the full workflow: the course limits are advice there
    const sys = checkDraft(d, { course: false });
    expect(sys.find((i) => i.code === "manyCases")).toMatchObject({ level: "warn" });
    expect(sys.find((i) => i.code === "manyCaseSteps")).toMatchObject({ level: "warn" });
    expect(sys.filter((i) => i.level === "error").length).toBe(issues.filter((i) => i.level === "error").length - 2);
  });

  it("catches Cyrillic in uz/en case labels and has a message for every case code", () => {
    let { d, caseId } = withCase();
    d = setCaseLabel(d, caseId, "en", "Таймаут");
    expect(checkDraft(d).some((i) => i.code === "cyrillic" && i.lang === "en" && i.x === caseId)).toBe(true);
    const keys = Object.keys(CASE_ISSUE_TEXT.en).sort();
    for (const lang of AUTHOR_LANGS) expect(Object.keys(CASE_ISSUE_TEXT[lang]).sort()).toEqual(keys);
    expect(/[Ѐ-ӿ]/.test(JSON.stringify(CASE_ISSUE_TEXT.uz) + JSON.stringify(CASE_ISSUE_TEXT.en))).toBe(false);
  });

  it("lessons with scenarios re-imported have no errors in their cases", () => {
    for (const entry of Object.values(lessons)) {
      if (!(entry.lesson as LessonInput).scenarios?.length) continue;
      const { draft } = fromLesson(entry.lesson as LessonInput, texts(entry));
      const inCases = checkDraft(draft).filter((i) => i.level === "error" && (i.case !== undefined || i.code === "manyCases"));
      expect(inCases, entry.lesson.slug).toEqual([]);
    }
  });
});
