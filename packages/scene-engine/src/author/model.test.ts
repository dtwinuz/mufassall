import { describe, expect, it } from "vitest";
import { type LessonInput, type LessonText, type SceneState, resolve } from "@mufassall/scene-schema";
import { lessons } from "../../../../content/index";
import {
  type Draft,
  addStep,
  deleteStep,
  duplicateStep,
  editStep,
  fromLesson,
  moveStep,
  newDraft,
  normalize,
  renameEdge,
  renameNode,
  sanitizeDraft,
  snapshotOf,
  toLessonInput,
  toPatches,
} from "./model";

const snapshots = (d: Draft): SceneState[] => d.steps.map((s) => snapshotOf(s));

/** The core promise of the author mode: exported patches fold back into exactly the edited snapshots. */
function roundTrip(d: Draft) {
  const n = normalize(d);
  expect(resolve(toLessonInput(n))).toEqual(snapshots(n));
}

describe("snapshots to patches", () => {
  it("round-trips the starter draft", () => roundTrip(newDraft()));

  it("writes only what changed, null for removals", () => {
    let d = newDraft();
    d = editStep(d, 0, (s) => ({ ...s, nodes: { ...s.nodes, db: { id: "db", kind: "db", at: [9, 6], state: "ok" } } }), true);
    d = addStep(d, 0);
    d = editStep(
      d,
      1,
      (s) => {
        const nodes: typeof s.nodes = { ...s.nodes, api: { ...s.nodes.api!, state: "slow", load: 90 } };
        delete nodes.db;
        return { ...s, nodes, edges: { ...s.edges, call: { ...s.edges.call!, cut: true } } };
      },
      false,
    );
    const p = toPatches(d.steps);
    expect(p[0]!.nodes?.db).toEqual({ kind: "db", at: [9, 6] });
    expect(p[1]!.nodes).toEqual({ db: null, api: { state: "slow", load: 90 } });
    expect(p[1]!.edges).toEqual({ call: { cut: true } });
    // the recap still has db (it was added to every step); it comes back with kind and at
    expect(p[2]!.nodes?.db).toEqual({ kind: "db", at: [9, 6] });
    roundTrip(d);
  });

  it("does not null an edge that a node removal already took away", () => {
    let d = newDraft();
    d = editStep(
      d,
      1,
      (s) => {
        const nodes = { ...s.nodes };
        delete nodes.api;
        return { ...s, nodes, edges: {} };
      },
      false,
    );
    const p = toPatches(d.steps);
    expect(p[1]!.nodes).toEqual({ api: null });
    expect(p[1]!.edges).toBeUndefined();
    roundTrip(d);
  });

  it("carries metrics, load and edge mode forward like resolve does", () => {
    let d = newDraft();
    d.metrics = [{ id: "p95", unit: "ms", better: "down", label: { uz: "p95", ru: "p95", en: "p95" } }];
    d = editStep(
      d,
      0,
      (s) => ({
        ...s,
        metrics: { p95: 900 },
        nodes: { ...s.nodes, api: { ...s.nodes.api!, load: 70 } },
        edges: { ...s.edges, call: { ...s.edges.call!, mode: "call" } },
      }),
      false,
    );
    d = normalize(d);
    expect(d.steps[1]!.metrics.p95).toBe(900);
    expect(d.steps[1]!.nodes.api!.load).toBe(70);
    expect(d.steps[1]!.edges.call!.mode).toBe("call");
    roundTrip(d);
  });

  it.each(Object.entries(lessons))("round-trips the registered lesson %s", (_slug, entry) => {
    const { draft } = fromLesson(entry.lesson as LessonInput, entry.text as Record<"uz" | "ru" | "en", LessonText<LessonInput>>);
    roundTrip(draft);
    // and the base story resolves to the same scenes as the original
    expect(resolve(toLessonInput(draft))).toEqual(resolve(entry.lesson as LessonInput));
  });
});

describe("editing", () => {
  it("propagates a change forward until a step overrides it", () => {
    let d = newDraft();
    d = addStep(d, 0);
    d = addStep(d, 1);
    // step 2 sets its own state; step 0's change must reach step 1 only
    d = editStep(d, 2, (s) => ({ ...s, nodes: { ...s.nodes, api: { ...s.nodes.api!, state: "down" } } }), false);
    d = editStep(d, 0, (s) => ({ ...s, nodes: { ...s.nodes, api: { ...s.nodes.api!, state: "slow" } } }), true);
    expect(d.steps.map((s) => s.nodes.api!.state)).toEqual(["slow", "slow", "down", "ok"]);
    roundTrip(d);
  });

  it("keeps later steps untouched without forward", () => {
    const d = editStep(newDraft(), 0, (s) => ({ ...s, nodes: { ...s.nodes, api: { ...s.nodes.api!, at: [6, 9] } } }), false);
    expect(d.steps[1]!.nodes.api!.at).toEqual([6, 6]);
  });

  it("moves a node forward only onto free cells", () => {
    let d = newDraft();
    d = editStep(d, 1, (s) => ({ ...s, nodes: { ...s.nodes, db: { id: "db", kind: "db", at: [6, 9], state: "ok" } } }), false);
    d = editStep(d, 0, (s) => ({ ...s, nodes: { ...s.nodes, api: { ...s.nodes.api!, at: [6, 9] } } }), true);
    expect(d.steps[1]!.nodes.api!.at).toEqual([6, 6]);
  });

  it("renames a node and an edge everywhere", () => {
    let d = newDraft();
    d.steps[0]!.focus = ["api"];
    d.steps[0]!.exchange = { edge: "call", request: { format: "http", head: "GET / HTTP/1.1", headers: [], body: "" }, marks: [], masked: [] };
    d = renameNode(d, "api", "backend");
    d = renameEdge(d, "call", "req");
    expect(Object.keys(d.steps[1]!.nodes).sort()).toEqual(["backend", "client"]);
    expect(d.steps[0]!.edges.req!.to).toBe("backend");
    expect(d.steps[0]!.focus).toEqual(["backend"]);
    expect(d.steps[0]!.exchange!.edge).toBe("req");
    expect(d.labels.en.backend).toBe("API");
    expect(renameNode(d, "client", "backend")).toBe(d);
    expect(renameNode(d, "client", "Bad Id")).toBe(d);
  });

  it("adds, duplicates, moves and deletes steps", () => {
    let d = newDraft();
    d = duplicateStep(d, 0);
    expect(d.steps.map((s) => s.id)).toEqual(["start", "start-2", "recap"]);
    d = moveStep(d, 2, -1);
    expect(d.steps.map((s) => s.id)).toEqual(["start", "recap", "start-2"]);
    expect(moveStep(d, 0, -1)).toBe(d);
    d = deleteStep(d, 1);
    expect(d.steps.map((s) => s.id)).toEqual(["start", "start-2"]);
    d = addStep(d, 0);
    expect(d.steps[1]!.id).toBe("step");
    expect(Object.keys(d.steps[1]!.nodes)).toEqual(Object.keys(d.steps[0]!.nodes));
    roundTrip(d);
  });
});

describe("sanitizeDraft", () => {
  it("accepts its own output", () => {
    const d = newDraft();
    expect(sanitizeDraft(JSON.parse(JSON.stringify(d)))).toEqual(normalize(d));
  });

  it("rejects junk and drops malformed parts", () => {
    expect(sanitizeDraft(null)).toBeNull();
    expect(sanitizeDraft({ v: 2, steps: [] })).toBeNull();
    const raw = JSON.parse(JSON.stringify(newDraft()));
    raw.steps[0].nodes.bad = { kind: "rocket", at: [1, 1] };
    raw.steps[0].nodes.off = { kind: "db", at: [40, 1] };
    raw.steps[0].edges.dangling = { from: "client", to: "ghost" };
    raw.steps[0].nodes.__proto__ = { kind: "db", at: [3, 3] };
    const d = sanitizeDraft(raw)!;
    expect(Object.keys(d.steps[0]!.nodes).sort()).toEqual(["api", "client"]);
    expect(Object.keys(d.steps[0]!.edges)).toEqual(["call"]);
  });
});
