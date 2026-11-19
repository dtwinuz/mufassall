import { beforeAll, describe, expect, it } from "vitest";
import githubYml from "./fixtures/ci.github-workflow.yml?raw";
import minimalYml from "./fixtures/minimal.gitlab-ci.yml?raw";
import gitlabYml from "./fixtures/web-app.gitlab-ci.yml?raw";
import { IMPORT_MAX_NODES, IMPORT_MAX_STEPS } from "./importkit";
import { AUTHOR_LANGS, type Draft, ID_RE, sanitizeDraft } from "./model";
import { PIPELINE_MAX_CHARS, type PipelineErrorCode, type PipelineImport, computeWaves, imageName, importPipeline, parsePipeline } from "./pipeline";
import { checkDraft, hasCyrillic } from "./validation";

const ok = async (text: string): Promise<PipelineImport> => {
  const r = await importPipeline(text, "en");
  if (!r.ok) throw new Error(`import failed: ${r.error.code}`);
  return r.result;
};
const errorOf = async (text: string): Promise<PipelineErrorCode | undefined> => {
  const r = await importPipeline(text, "en");
  return r.ok ? undefined : r.error.code;
};
const nodesOf = (d: Draft) => Object.values(d.steps[0]!.nodes);
const kinds = (d: Draft) => nodesOf(d).map((n) => n.kind);
const idByLabel = (d: Draft, label: string) => Object.entries(d.labels.en).find(([, v]) => v === label)?.[0];

/** The importer's promise: a draft the author checks accept as is. */
function assertPlayable(d: Draft) {
  expect(checkDraft(d).filter((i) => i.level === "error")).toEqual([]);
  const cells = nodesOf(d).map((n) => n.at.join(","));
  expect(new Set(cells).size).toBe(cells.length);
  expect(nodesOf(d).length).toBeLessThanOrEqual(IMPORT_MAX_NODES);
  expect(d.steps.length).toBeLessThanOrEqual(IMPORT_MAX_STEPS);
  for (const id of [...d.steps.map((s) => s.id), ...nodesOf(d).map((n) => n.id), ...Object.keys(d.steps[0]!.edges)]) expect(id).toMatch(ID_RE);
  for (const l of ["uz", "en"] as const) expect(hasCyrillic(JSON.stringify([d.labels[l], d.title[l], d.summary[l], d.steps.map((s) => s.text[l])]))).toBe(false);
  expect(sanitizeDraft(JSON.parse(JSON.stringify(d)))).toEqual(d);
}

beforeAll(async () => {
  // load the yaml chunk once so the timing checks measure parsing, not module loading
  await parsePipeline("a: 1");
});

describe("GitLab CI", () => {
  it("detects the dialect, follows extends one level, reports include", async () => {
    const p = await parsePipeline(gitlabYml);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const m = p.model;
    expect(m.kind).toBe("gitlab-ci");
    expect(m.name).toBe("Web app pipeline");
    expect(m.stages).toEqual(["build", "test", "package", "deploy"]);
    expect(m.jobs.map((j) => j.key)).toEqual(["build-app", "lint", "unit-tests", "e2e-tests", "docker-image", "deploy-staging", "deploy-production", "docs-pipeline"]);
    const job = (k: string) => m.jobs.find((j) => j.key === k)!;
    expect(job("deploy-staging")).toMatchObject({ stage: "deploy", environment: "staging", only: ["main"], image: "alpine:3.20" });
    expect(job("deploy-production")).toMatchObject({ manual: true, environment: "production", needs: ["deploy-staging"] });
    expect(job("unit-tests")).toMatchObject({ services: ["postgres"], matrix: 3 });
    expect(job("e2e-tests")).toMatchObject({ rules: true, allowFailure: true, needs: null });
    expect(job("docs-pipeline").trigger).toBe("child");
    expect(job("build-app")).toMatchObject({ artifacts: true, cache: true, script: ["npm run build"] });
    expect(m.warnings.find((w) => w.code === "include")?.x).toBe("ci/templates/security.yml, Jobs/SAST.gitlab-ci.yml");
  });
  it("needs beats stage order", async () => {
    const p = await parsePipeline(gitlabYml);
    if (!p.ok) throw new Error();
    const w = computeWaves(p.model);
    const lv = (k: string) => w.level.get(k);
    // lint (stage test) and the docs trigger (stage deploy) have needs: [] and start with the build
    expect([lv("build-app"), lv("lint"), lv("docs-pipeline")]).toEqual([0, 0, 0]);
    expect([lv("unit-tests"), lv("e2e-tests")]).toEqual([1, 1]);
    expect(lv("docker-image")).toBe(2);
    expect(lv("deploy-staging")).toBe(3);
    expect(lv("deploy-production")).toBe(4);
  });
  it("builds the scene: trigger, jobs per wave, targets", async () => {
    const { draft, kind, warnings } = await ok(gitlabYml);
    expect(kind).toBe("gitlab-ci");
    const k = kinds(draft);
    expect(k.filter((x) => x === "worker")).toHaveLength(8);
    expect(k.filter((x) => x === "actor")).toHaveLength(1);
    expect(k.filter((x) => x === "db")).toHaveLength(1); // postgres
    expect(k).toContain("storage");
    expect(k).toContain("cache");
    expect(k).toContain("external");
    expect(draft.labels.en[idByLabel(draft, "unit-tests ×3")!]).toBe("unit-tests ×3");
    expect(nodesOf(draft).find((n) => draft.labels.en[n.id] === "production")!.kind).toBe("service");
    // columns follow the waves
    const x = (label: string) => draft.steps[0]!.nodes[idByLabel(draft, label)!]!.at[0];
    expect(x("lint")).toBe(x("build-app"));
    expect(x("lint")).toBeLessThan(x("unit-tests ×3"));
    expect(x("docker-image")).toBeLessThan(x("deploy-staging"));
    expect(x("deploy-staging")).toBeLessThan(x("deploy-production"));
    // start, 5 waves, services, artifacts, deploy, downstream, failure, retry, recap
    expect(draft.steps.map((s) => s.id)).toEqual([
      "start",
      "wave-1",
      "stage-test",
      "stage-package",
      "stage-deploy",
      "stage-deploy-2",
      "services",
      "artifacts",
      "deploy",
      "downstream",
      "failure",
      "retry",
      "recap",
    ]);
    expect(draft.steps[1]!.focus).toEqual(["build-app", "lint", "docs-pipeline"]);
    expect(draft.steps[1]!.text.en.title).toBe("Stage: build, test, deploy");
    // the manual production deploy is a problem step with a hint
    expect(draft.steps[5]!.kind).toBe("problem");
    expect(draft.steps[5]!.text.en.watch).toContain("Run");
    expect(draft.steps[8]!.kind).toBe("problem");
    expect(draft.steps[2]!.text.en.body).toContain("unit-tests: runs ×3 (matrix); starts postgres next to it.");
    expect(draft.steps[2]!.text.en.body).toContain("needs lets them start");
    expect(draft.steps.at(-3)!.nodes[draft.steps.at(-3)!.focus[0]!]!.state).toBe("down");
    expect(draft.steps.at(-2)!.kind).toBe("fix");
    expect(warnings.map((w) => w.code)).toContain("include");
    assertPlayable(draft);
  });
  it("a one-job file still makes a lesson of at least 7 steps", async () => {
    const { draft } = await ok(minimalYml);
    expect(draft.steps.length).toBe(7);
    expect(kinds(draft)).toEqual(["actor", "worker"]);
    assertPlayable(draft);
  });
  it("folds wide waves into '+N jobs' and caps steps", async () => {
    const wide = Array.from({ length: 60 }, (_, k) => `job-${k}:\n  stage: test\n  script: [echo ${k}]`).join("\n");
    const deep = Array.from({ length: 40 }, (_, k) => `d${k}:\n  stage: build\n  needs: [${k ? `d${k - 1}` : ""}]\n  script: [x]`).join("\n");
    for (const yml of [wide, deep]) {
      const { draft, warnings } = await ok(yml);
      expect(warnings.map((w) => w.code)).toContain("maxNodes");
      expect(nodesOf(draft).length).toBeLessThanOrEqual(IMPORT_MAX_NODES);
      assertPlayable(draft);
    }
    const { draft } = await ok(wide);
    expect(Object.values(draft.labels.en).some((l) => l.startsWith("+") && l.endsWith(" jobs"))).toBe(true);
  });
  it("reports unknown needs and cycles without failing", async () => {
    const { draft, warnings } = await ok("a:\n  script: [x]\n  needs: [b, ghost]\nb:\n  script: [y]\n  needs: [a]\n");
    expect(warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["unknownNeeds", "cycle"]));
    assertPlayable(draft);
  });
});

describe("GitHub Actions", () => {
  it("reads triggers, needs, environments, services, matrix and reusable workflows", async () => {
    const p = await parsePipeline(githubYml);
    if (!p.ok) throw new Error(p.error.code);
    const m = p.model;
    expect(m.kind).toBe("github-actions");
    expect(m.triggers).toEqual(["push", "pull_request", "workflow_dispatch"]);
    const job = (k: string) => m.jobs.find((j) => j.key === k)!;
    expect(job("test")).toMatchObject({ matrix: 6, services: ["postgres", "redis"], cache: true });
    expect(job("build")).toMatchObject({ needs: ["lint", "test"], artifacts: true });
    expect(job("security").reusable).toBe("security-scan.yml");
    expect(job("deploy-production").environment).toBe("production");
    expect(job("deploy-staging").condition).toBe("github.ref == 'refs/heads/main'");
    const w = computeWaves(m);
    expect(["lint", "test", "build", "security", "deploy-staging", "deploy-production"].map((k) => w.level.get(k))).toEqual([0, 0, 1, 2, 2, 3]);
  });
  it("builds a playable draft", async () => {
    const { draft, kind } = await ok(githubYml);
    expect(kind).toBe("github-actions");
    const byLabel = (l: string) => nodesOf(draft).find((n) => draft.labels.en[n.id] === l)!;
    expect(byLabel("push, pull_request, workflow_dispatch").kind).toBe("actor");
    expect(byLabel("test ×6").kind).toBe("worker");
    expect(byLabel("postgres").kind).toBe("db");
    expect(byLabel("redis").kind).toBe("cache");
    expect(byLabel("security-scan.yml").kind).toBe("external");
    expect(byLabel("staging").kind).toBe("service");
    expect(draft.steps.filter((s) => s.id.startsWith("wave-"))).toHaveLength(4);
    expect(draft.steps[0]!.text.en.body).toContain("workflow_dispatch also lets a person start it by hand");
    expect(draft.steps[0]!.exchange?.request.head).toBe("event: push, pull_request, workflow_dispatch");
    assertPlayable(draft);
  });
});

describe("hostile and wrong input", () => {
  const timed = async (text: string) => {
    const t0 = performance.now();
    const code = await errorOf(text);
    return { code, ms: performance.now() - t0 };
  };
  it("refuses with the right code, fast", async () => {
    const bomb = [
      "a: &a [x, x, x, x, x, x, x, x, x]",
      "b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]",
      "c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b]",
      "d: &d [*c, *c, *c, *c, *c, *c, *c, *c, *c]",
      "e: &e [*d, *d, *d, *d, *d, *d, *d, *d, *d]",
      "f: &f [*e, *e, *e, *e, *e, *e, *e, *e, *e]",
      "job:\n  script: *f",
    ].join("\n");
    const cases: [string, PipelineErrorCode][] = [
      ["", "empty"],
      ["  \n\t\n", "empty"],
      [`a: "${"x".repeat(PIPELINE_MAX_CHARS)}"`, "tooLarge"],
      [bomb, "tooLarge"],
      ["\u0000\u0001\u0002PK\u0003\u0004binary", "notYaml"],
      ["key: [unclosed", "notYaml"],
      ["a: 1\na: 2\n  b: : :", "notYaml"],
      ["version: '3'\nservices:\n  web:\n    image: nginx\n", "notPipeline"],
      ["apiVersion: v1\nkind: Pod\nmetadata:\n  name: x\n", "notPipeline"],
      ["- just\n- a list\n", "notPipeline"],
      ["plain text, no yaml structure", "notPipeline"],
      ["stages: [build, test]\nvariables:\n  A: 1\n", "noJobs"],
      ["include:\n  - local: other.yml\n", "noJobs"],
    ];
    for (const [text, code] of cases) {
      const r = await timed(text);
      expect(r.code, text.slice(0, 40)).toBe(code);
      expect(r.ms, text.slice(0, 40)).toBeLessThan(50);
    }
  });
  it("never runs or resolves anything: tags stay data", async () => {
    const { draft } = await ok('job:\n  script:\n    - !reference [.setup, script]\n    - echo "$(rm -rf /)"\n  tags: !!js/function "function(){}"\n');
    assertPlayable(draft);
  });
});

describe("helpers", () => {
  it("names a service from its image", () => {
    expect(imageName("registry.example.com/library/postgres:16-alpine")).toBe("postgres");
    expect(imageName("redis@sha256:abc")).toBe("redis");
    expect(imageName("mysql")).toBe("mysql");
  });
  it("fills every language for every step", async () => {
    for (const yml of [gitlabYml, githubYml, minimalYml]) {
      const { draft } = await ok(yml);
      for (const l of AUTHOR_LANGS) {
        expect(draft.title[l].trim()).toBeTruthy();
        expect(draft.summary[l].trim()).toBeTruthy();
        for (const s of draft.steps) expect(s.text[l].body.trim(), `${l} ${s.id}`).toBeTruthy();
      }
    }
  });
});
