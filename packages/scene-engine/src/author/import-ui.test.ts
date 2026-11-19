import { describe, expect, it } from "vitest";
import { IMPORT_UI } from "./import-ui";
import type { ImportWarningCode } from "./importkit";
import type { MermaidErrorCode } from "./mermaid";
import { AUTHOR_LANGS } from "./model";
import type { PipelineErrorCode } from "./pipeline";
import { hasCyrillic } from "./validation";

describe("import dialog strings", () => {
  it("every warning and error has a text in all three languages; uz and en are Latin", () => {
    const warn: ImportWarningCode[] = ["include", "extends", "unknownStage", "unknownNeeds", "cycle", "notes", "blocks", "subgraph", "unsupported", "selfLoop", "noLines", "maxNodes", "maxSteps", "translate"];
    const perr: PipelineErrorCode[] = ["empty", "tooLarge", "notYaml", "notPipeline", "noJobs"];
    const merr: MermaidErrorCode[] = ["empty", "tooLarge", "notMermaid", "noNodes"];
    const flat = (v: unknown, path = ""): [string, string][] =>
      typeof v === "string" ? [[path, v]] : Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => flat(x, path ? `${path}.${k}` : k));
    const keys = (l: (typeof AUTHOR_LANGS)[number]) => flat(IMPORT_UI[l]).map(([k]) => k).sort();
    for (const l of AUTHOR_LANGS) {
      const t = IMPORT_UI[l];
      for (const c of warn) expect(t.warning[c]?.trim(), `${l} ${c}`).toBeTruthy();
      for (const c of perr) expect(t.pipelineError[c]?.trim(), `${l} ${c}`).toBeTruthy();
      for (const c of merr) expect(t.mermaidError[c]?.trim(), `${l} ${c}`).toBeTruthy();
      for (const [k, v] of flat(t)) {
        expect(v.trim(), `${l} ${k}`).toBeTruthy();
        if (l !== "ru") expect(hasCyrillic(v), `${l} ${k}`).toBe(false);
      }
      expect(keys(l)).toEqual(keys("en"));
    }
  });
});
