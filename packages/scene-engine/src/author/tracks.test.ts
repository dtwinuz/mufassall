import { describe, expect, it } from "vitest";
import { AUTHOR_UI } from "./author-ui";
import { AUTHOR_LANGS, addCase, addCaseStep, newDraft } from "./model";
import { casesByFrom, editIn, issuesOfCase, patchIn, prevStepIn, renameStepIn, stepsIn, visibleRows } from "./tracks";
import { hasCyrillic } from "./validation";

const withCase = () => {
  const r = addCase(newDraft(), "start");
  return { d: addCaseStep(r.draft, r.caseId, 0), id: r.caseId };
};

describe("tracks", () => {
  it("reads and patches the base story or one case", () => {
    const { d, id } = withCase();
    expect(stepsIn(d, null)).toBe(d.steps);
    expect(stepsIn(d, id)).toHaveLength(2);
    expect(stepsIn(d, "nope")).toEqual([]);
    const p = patchIn(d, id, 1, (s) => ({ ...s, kind: "recap" }));
    expect(p.cases[0]!.steps[1]!.kind).toBe("recap");
    expect(p.steps).toBe(d.steps);
    expect(patchIn(d, null, 0, (s) => ({ ...s, kind: "recap" })).cases).toBe(d.cases);
  });

  it("edits a case step without touching the base story", () => {
    const { d, id } = withCase();
    const next = editIn(d, id, 0, (s) => ({ ...s, nodes: { ...s.nodes, api: { ...s.nodes.api!, state: "down" } } }), true);
    expect(next.cases[0]!.steps[0]!.nodes.api!.state).toBe("down");
    expect(next.cases[0]!.steps[1]!.nodes.api!.state).toBe("down");
    expect(next.steps.every((s) => s.nodes.api!.state === "ok")).toBe(true);
  });

  it("renames a step only to a free id across base and cases, and keeps the case branch", () => {
    const { d, id } = withCase();
    const caseStep = d.cases[0]!.steps[0]!.id;
    expect(renameStepIn(d, null, 1, caseStep)).toBe(d);
    expect(renameStepIn(d, id, 0, "recap")).toBe(d);
    expect(renameStepIn(d, null, 0, "Bad id")).toBe(d);
    const r = renameStepIn(d, null, 0, "begin");
    expect(r.steps[0]!.id).toBe("begin");
    expect(r.cases[0]!.from).toBe("begin");
    expect(renameStepIn(d, id, 1, "retry").cases[0]!.steps[1]!.id).toBe("retry");
  });

  it("a case's first step starts from the base step it branches after", () => {
    const { d, id } = withCase();
    expect(prevStepIn(d, id, 0)?.id).toBe("start");
    expect(prevStepIn(d, id, 1)).toBe(d.cases[0]!.steps[0]);
    expect(prevStepIn(d, null, 0)).toBeUndefined();
    expect(prevStepIn(d, null, 1)).toBe(d.steps[0]);
  });

  it("lists case steps under their base step only when the case is open", () => {
    const { d, id } = withCase();
    expect(casesByFrom(d).get("start")?.map((c) => c.id)).toEqual([id]);
    expect(visibleRows(d, new Set())).toEqual([
      { track: null, i: 0 },
      { track: null, i: 1 },
    ]);
    expect(visibleRows(d, new Set([id]))).toEqual([
      { track: null, i: 0 },
      { track: id, i: 0 },
      { track: id, i: 1 },
      { track: null, i: 1 },
    ]);
  });

  it("picks the issues of one case", () => {
    const list = [
      { level: "error", code: "text", case: "a" },
      { level: "error", code: "text" },
    ] as const;
    expect(issuesOfCase(list, "a")).toHaveLength(1);
  });
});

describe("author strings", () => {
  it("every language has the same keys, none empty, uz and en without Cyrillic", () => {
    const flat = (v: unknown, path = "", out = new Map<string, string>()) => {
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) flat(x, path ? `${path}.${k}` : k, out);
      else out.set(path, String(v));
      return out;
    };
    const maps = Object.fromEntries(AUTHOR_LANGS.map((l) => [l, flat(AUTHOR_UI[l])]));
    const keys = [...maps.en!.keys()].sort();
    for (const l of AUTHOR_LANGS) {
      expect([...maps[l]!.keys()].sort(), l).toEqual(keys);
      for (const [k, v] of maps[l]!) {
        expect(v.trim(), `${l} ${k}`).not.toBe("");
        // language names are allowed to be written in their own script
        if (l !== "ru" && !k.startsWith("langNames")) expect(hasCyrillic(v), `${l} ${k}`).toBe(false);
      }
    }
  });
});
