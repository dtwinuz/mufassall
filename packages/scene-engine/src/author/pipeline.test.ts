import { beforeAll, describe, expect, it } from "vitest";
import githubYml from "./fixtures/ci.github-workflow.yml?raw";
import minimalYml from "./fixtures/minimal.gitlab-ci.yml?raw";
import releaseGithubYml from "./fixtures/release.github-workflow.yml?raw";
import releaseYml from "./fixtures/release.gitlab-ci.yml?raw";
import gitlabYml from "./fixtures/web-app.gitlab-ci.yml?raw";
import { assertPlayable } from "./fixtures/playable";
import { IMPORT_MAX_NODES } from "./importkit";
import { AUTHOR_LANGS, type Draft } from "./model";
import { PIPELINE_MAX_CHARS, type PipelineErrorCode, type PipelineImport, computeWaves, imageName, importPipeline, parsePipeline } from "./pipeline";

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

describe("cases: the alternative paths of a pipeline", () => {
  const caseOf = (d: Draft, id: string) => {
    const c = d.cases.find((x) => x.id === id);
    if (!c) throw new Error(`no case ${id}: ${d.cases.map((x) => x.id).join(", ")}`);
    return c;
  };
  const stepOf = (d: Draft, id: string) => d.steps.find((s) => s.id === id)!;
  it("reads on_failure, retry, allow_failure, stop jobs and tag rules", async () => {
    const p = await parsePipeline(releaseYml);
    if (!p.ok) throw new Error(p.error.code);
    const job = (k: string) => p.model.jobs.find((j) => j.key === k)!;
    expect(job("build").retry).toBe(2);
    expect(job("notify-failure").onFailure).toBe(true);
    expect(job("stop-staging")).toMatchObject({ stopsEnv: "staging", manual: true });
    expect(job("publish-package").tagOnly).toBe(true);
    expect(job("lint")).toMatchObject({ allowFailure: true, onFailure: false, tagOnly: false });
  });
  it("GitLab: each kind of case branches after the right base step", async () => {
    const { draft } = await ok(releaseYml);
    assertPlayable(draft);
    expect(draft.cases.map((c) => c.id)).toEqual([
      "on-failure-notify-failure",
      "allowed-failure-lint",
      "retry-build",
      "manual-stop-staging",
      "manual-deploy-production",
      "rollback-production",
      "tag-pipeline",
    ]);
    // the wave where the job runs (or, for on_failure, where the failing job runs)
    expect(caseOf(draft, "retry-build").from).toBe("stage-build");
    expect(caseOf(draft, "allowed-failure-lint").from).toBe("stage-test");
    expect(caseOf(draft, "on-failure-notify-failure").from).toBe("stage-deploy");
    expect(caseOf(draft, "manual-deploy-production").from).toBe("stage-deploy-2");
    expect(caseOf(draft, "rollback-production").from).toBe("deploy");
    expect(caseOf(draft, "tag-pipeline").from).toBe("start");
    for (const c of draft.cases) expect(draft.steps.findIndex((s) => s.id === c.from)).toBeLessThan(draft.steps.length - 1);
    // labels in three languages
    expect(caseOf(draft, "retry-build").label).toEqual({ en: "build is retried automatically", ru: "Автоповтор build", uz: "build avtomatik qayta ishga tushadi" });
    expect(caseOf(draft, "rollback-production").label.en).toBe("Rollback of production");
    // the scene tells the story
    const retry = caseOf(draft, "retry-build");
    expect(retry.steps.map((s) => s.kind)).toEqual(["problem", "fix"]);
    expect(retry.steps[0]!.nodes.build!.state).toBe("down");
    expect(retry.steps[1]!.nodes.build!.state).toBe("ok");
    expect(Object.values(retry.steps[1]!.edges).some((e) => e.flow === "retry")).toBe(true);
    const onFail = caseOf(draft, "on-failure-notify-failure");
    expect(onFail.steps[1]!.focus).toEqual(["notify-failure"]);
    expect(onFail.steps[0]!.text.en.body).toContain("when: on_failure");
    const manual = caseOf(draft, "manual-deploy-production").steps[0]!;
    expect(manual.nodes["deploy-production"]!.state).toBe("slow");
    expect(manual.text.en.watch).toContain("Run");
    const roll = caseOf(draft, "rollback-production");
    expect(roll.steps[0]!.nodes.production!.state).toBe("down");
    expect(roll.steps[1]!.text.en.body).toContain("Environments, Rollback");
    expect(caseOf(draft, "tag-pipeline").steps[0]!.focus).toEqual(["publish-package"]);
    // the notes in the base story mention the new keywords
    expect(stepOf(draft, "stage-build").text.en.body).toContain("build: saves artifacts for later jobs; is retried up to 2 times.");
    expect(stepOf(draft, "stage-notify").text.en.body).toContain("notify-failure: runs only after an earlier job fails");
  });
  it("GitHub: if: failure(), continue-on-error, a production approval, tags", async () => {
    const { draft } = await ok(releaseGithubYml);
    assertPlayable(draft);
    expect(draft.cases.map((c) => c.id)).toEqual(["on-failure-alert", "allowed-failure-e2e", "approval-deploy", "rollback-production", "tag-pipeline"]);
    const onFail = caseOf(draft, "on-failure-alert");
    expect(onFail.from).toBe("wave-1");
    expect(onFail.steps[0]!.text.en.body).toContain("if: failure()");
    expect(caseOf(draft, "approval-deploy").from).toBe("wave-2");
    expect(caseOf(draft, "approval-deploy").label.uz).toBe("deploy tasdiqni kutadi");
    expect(caseOf(draft, "rollback-production").steps[1]!.text.en.body).toContain("re-run");
    expect(caseOf(draft, "allowed-failure-e2e").steps[0]!.text.ru).toMatchObject({ title: "e2e падает, и это разрешено" });
  });
  it("web-app fixture: same base story, now with its cases", async () => {
    const { draft } = await ok(gitlabYml);
    expect(draft.cases.map((c) => [c.id, c.from])).toEqual([
      ["allowed-failure-e2e-tests", "stage-test"],
      ["manual-deploy-production", "stage-deploy-2"],
      ["rollback-production", "deploy"],
      ["other-branch", "start"],
    ]);
    assertPlayable(draft);
  });
  it("a long pipeline keeps every wave (no fold at 16 steps)", async () => {
    const chain = Array.from({ length: 30 }, (_, k) => `j${k}:\n  stage: build\n  needs: [${k ? `j${k - 1}` : ""}]\n  script: [x]`).join("\n");
    const { draft, warnings } = await ok(chain);
    expect(draft.steps.filter((s) => s.id.startsWith("wave-") || s.id.startsWith("stage-"))).toHaveLength(30);
    expect(warnings.map((w) => w.code)).not.toContain("maxSteps");
    expect(warnings.map((w) => w.code)).not.toContain("maxNodes");
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
