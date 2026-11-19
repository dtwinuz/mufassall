import type { NodeKind } from "@mufassall/scene-schema";
import {
  IMPORT_MAX_CASES,
  IMPORT_MAX_NODES,
  IMPORT_MAX_STEPS,
  IMPORT_MIN_STEPS,
  type ImportWarning,
  type ImportWarningCode,
  type KitBeat,
  type KitCase,
  type KitEdge,
  type KitNode,
  LATTICE,
  type PerLang,
  buildDraft,
  centredRows,
  clip,
  fillIn,
  kindFromName,
  listIn,
  oneLine,
  perLangOf,
} from "./importkit";
import type { AuthorLang, Draft } from "./model";

/*
 * GitLab CI / GitHub Actions YAML -> a playable draft: the trigger, one column of jobs per wave
 * (stage, or DAG level when `needs` is used), then where results go. The YAML is only read as
 * data (the `yaml` package, loaded on demand); nothing in it is run or fetched.
 */

export const PIPELINE_MAX_CHARS = 1_000_000;
/** `yaml` weighs each alias by the size of what it points at, so this stops alias bombs early */
export const PIPELINE_MAX_ALIASES = 100;
/** jobs read from one file; more are counted, not read */
export const PIPELINE_MAX_JOBS = 500;

export type PipelineKind = "gitlab-ci" | "github-actions";
export type PipelineErrorCode = "empty" | "tooLarge" | "notYaml" | "notPipeline" | "noJobs";

export interface PipelineJob {
  key: string;
  name: string;
  /** GitLab stage; "" for GitHub */
  stage: string;
  /** `null`: no `needs`, the job waits for every earlier stage (GitLab) */
  needs: string[] | null;
  manual: boolean;
  rules: boolean;
  only: string[];
  condition?: string;
  environment?: string;
  artifacts: boolean;
  cache: boolean;
  services: string[];
  trigger?: string;
  reusable?: string;
  /** parallel copies; 0 when none */
  matrix: number;
  allowFailure: boolean;
  /** GitLab `when: on_failure`, GitHub `if: failure()`: runs only after an earlier job failed */
  onFailure: boolean;
  /** automatic retries (GitLab `retry`); 0 when none */
  retry: number;
  /** GitLab `environment: { action: stop }`: the job that takes an environment down */
  stopsEnv?: string;
  /** runs only for tags (`only: [tags]`, `$CI_COMMIT_TAG` rules, `refs/tags` conditions) */
  tagOnly: boolean;
  image?: string;
  script: string[];
}

export interface PipelineModel {
  kind: PipelineKind;
  name: string;
  triggers: string[];
  workflowRules: boolean;
  /** GitLab stage order, `.pre` and `.post` included; empty for GitHub */
  stages: string[];
  jobs: PipelineJob[];
  warnings: ImportWarning[];
}

export type PipelineImport = { draft: Draft; warnings: ImportWarning[]; kind: PipelineKind };
export type PipelineResult = { ok: true; result: PipelineImport } | { ok: false; error: { code: PipelineErrorCode } };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : "");
const own = (o: Obj, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const strings = (v: unknown): string[] => {
  if (typeof v === "string") return [v];
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x)) out.push(...strings(x)); // GitLab `!reference` and nested script lists
  }
  return out;
};

/** NUL and other control characters a text file does not have. */
function looksBinary(s: string): boolean {
  const n = Math.min(s.length, 8000);
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12) || c === 0xfffd) return true;
  }
  return false;
}

/** `registry.example/library/postgres:16-alpine` -> `postgres` */
export function imageName(image: string): string {
  const slash = image.lastIndexOf("/");
  let s = slash >= 0 ? image.slice(slash + 1) : image;
  const at = s.indexOf("@");
  if (at >= 0) s = s.slice(0, at);
  const colon = s.indexOf(":");
  if (colon >= 0) s = s.slice(0, colon);
  return s || image;
}

/** `./.github/workflows/deploy.yml` -> `deploy.yml`; `org/repo/.github/workflows/x.yml@v1` -> `org/repo: x.yml` */
function workflowName(uses: string): string {
  const at = uses.indexOf("@");
  const path = at >= 0 ? uses.slice(0, at) : uses;
  const file = path.slice(path.lastIndexOf("/") + 1);
  const wf = path.indexOf("/.github/");
  if (path.startsWith("./") || wf <= 0) return file || uses;
  return `${path.slice(0, wf)}: ${file}`;
}

function matrixSize(m: unknown): number {
  if (!isObj(m)) return 0;
  let product = 1;
  let axes = 0;
  for (const [k, v] of Object.entries(m)) {
    if (k === "include" || k === "exclude") continue;
    if (Array.isArray(v)) {
      product *= Math.max(1, v.length);
      axes++;
    }
  }
  const include = Array.isArray(m.include) ? m.include.length : 0;
  const exclude = Array.isArray(m.exclude) ? m.exclude.length : 0;
  const n = axes ? Math.max(1, product - exclude) + include : include;
  return n > 1 ? Math.min(n, 9999) : 0;
}

/* ---------- GitLab CI ---------- */

const GITLAB_RESERVED = new Set([
  "image",
  "services",
  "stages",
  "types",
  "before_script",
  "after_script",
  "variables",
  "cache",
  "include",
  "workflow",
  "default",
  "spec",
]);
const GITLAB_JOB_KEYS = ["script", "run", "trigger", "extends", "stage", "needs"];
const MERGED = ["stage", "needs", "environment", "services", "artifacts", "cache", "when", "rules", "only", "trigger", "image", "script", "parallel", "allow_failure", "retry"];

const isGitlabJob = (k: string, v: unknown) => !GITLAB_RESERVED.has(k) && !k.startsWith(".") && isObj(v) && GITLAB_JOB_KEYS.some((j) => own(v, j));

function includeNames(v: unknown): string[] {
  const list = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const x of list) {
    if (typeof x === "string") out.push(x);
    else if (isObj(x)) {
      const name = str(x.local) || str(x.template) || str(x.component) || str(x.remote) || (str(x.project) && `${str(x.project)}: ${strings(x.file).join(", ")}`);
      if (name) out.push(name);
    }
  }
  return out;
}

function services(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const s of v) {
    const image = typeof s === "string" ? s : isObj(s) ? str(s.name) : "";
    if (image) out.push(imageName(image));
  }
  return [...new Set(out)];
}

function readGitlab(root: Obj): PipelineModel {
  const warnings: ImportWarning[] = [];
  const warn = (code: ImportWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  if (own(root, "include")) warn("include", includeNames(root.include).slice(0, 5).join(", ") || "include");
  const declared = Array.isArray(root.stages) ? strings(root.stages) : Array.isArray(root.types) ? strings(root.types) : ["build", "test", "deploy"];
  const stages = [".pre", ...declared.filter((s) => s !== ".pre" && s !== ".post"), ".post"];
  const defaults = isObj(root.default) ? root.default : {};
  const globalServices = services(defaults.services ?? root.services);
  const globalCache = own(defaults, "cache") || own(root, "cache");
  const globalImage = str(isObj(defaults.image) ? defaults.image.name : defaults.image) || str(isObj(root.image) ? root.image.name : root.image);

  const jobs: PipelineJob[] = [];
  const unknownStages: string[] = [];
  const deepExtends: string[] = [];
  let skipped = 0;
  for (const [key, raw] of Object.entries(root)) {
    if (!isGitlabJob(key, raw)) continue;
    if (jobs.length >= PIPELINE_MAX_JOBS) {
      skipped++;
      continue;
    }
    let job = raw as Obj;
    if (own(job, "extends")) {
      const base: Obj = {};
      for (const name of strings(job.extends)) {
        const t = root[name];
        if (!isObj(t)) {
          deepExtends.push(name);
          continue;
        }
        if (own(t, "extends")) deepExtends.push(name);
        for (const k of MERGED) if (own(t, k)) base[k] = t[k];
      }
      job = { ...base, ...job };
    }
    let stage = str(job.stage) || "test";
    if (!stages.includes(stage)) {
      unknownStages.push(stage);
      stages.splice(stages.length - 1, 0, stage);
    }
    let needs: string[] | null = null;
    if (Array.isArray(job.needs)) {
      needs = [];
      for (const n of job.needs) {
        if (typeof n === "string") needs.push(n);
        else if (isObj(n) && typeof n.job === "string" && !own(n, "project") && !own(n, "pipeline")) needs.push(n.job);
      }
    }
    const rules = Array.isArray(job.rules) ? job.rules : [];
    const onlyRaw = job.only;
    const only = isObj(onlyRaw) ? strings(onlyRaw.refs) : strings(onlyRaw);
    const env = isObj(job.environment) ? str(job.environment.name) : str(job.environment);
    const stops = isObj(job.environment) && job.environment.action === "stop";
    const retryRaw = job.retry;
    const retry = typeof retryRaw === "number" ? retryRaw : isObj(retryRaw) ? (typeof retryRaw.max === "number" ? retryRaw.max : 1) : 0;
    const ruleIfs = rules.map((r) => (isObj(r) ? str(r.if) : "")).join(" ");
    const trig = job.trigger;
    const trigger = typeof trig === "string" ? trig : isObj(trig) ? str(trig.project) || (own(trig, "include") ? "child" : "") : "";
    const par = job.parallel;
    const matrix = typeof par === "number" ? (par > 1 ? Math.min(par, 9999) : 0) : isObj(par) && Array.isArray(par.matrix) ? par.matrix.reduce((sum: number, m) => sum + Math.max(1, matrixSize(m) || 1), 0) : 0;
    const image = str(isObj(job.image) ? job.image.name : job.image) || globalImage;
    if (stage === "") stage = "test";
    jobs.push({
      key,
      name: key,
      stage,
      needs,
      manual: job.when === "manual" || rules.some((r) => isObj(r) && r.when === "manual"),
      rules: rules.length > 0,
      only,
      ...(env ? { environment: env } : {}),
      artifacts: isObj(job.artifacts),
      cache: own(job, "cache") ? job.cache !== null && job.cache !== false : globalCache,
      services: own(job, "services") ? services(job.services) : globalServices,
      ...(trigger ? { trigger } : {}),
      matrix: matrix > 1 ? matrix : 0,
      allowFailure: job.allow_failure === true || isObj(job.allow_failure),
      onFailure: job.when === "on_failure" || rules.some((r) => isObj(r) && r.when === "on_failure"),
      retry: Math.max(0, Math.min(retry, 9)),
      ...(stops && env ? { stopsEnv: env } : {}),
      tagOnly: only.includes("tags") || ruleIfs.includes("CI_COMMIT_TAG"),
      ...(image ? { image } : {}),
      script: strings(job.script ?? job.run).slice(0, 12),
    });
  }
  if (unknownStages.length) warn("unknownStage", [...new Set(unknownStages)].slice(0, 5).join(", "));
  if (deepExtends.length) warn("extends", [...new Set(deepExtends)].slice(0, 5).join(", "));
  if (skipped) warn("maxNodes", String(skipped));
  const wf = isObj(root.workflow) ? root.workflow : {};
  return {
    kind: "gitlab-ci",
    name: str(wf.name),
    triggers: ["push", "merge_request"],
    workflowRules: Array.isArray(wf.rules) && wf.rules.length > 0,
    stages: stages.filter((s) => jobs.some((j) => j.stage === s)),
    jobs,
    warnings,
  };
}

/* ---------- GitHub Actions ---------- */

const isGithub = (root: Obj) =>
  isObj(root.jobs) && Object.values(root.jobs).some((j) => isObj(j) && (own(j, "runs-on") || own(j, "steps") || own(j, "uses")));

function readGithub(root: Obj): PipelineModel {
  const warnings: ImportWarning[] = [];
  const on = own(root, "on") ? root.on : root.true; // a YAML 1.1 reader turns `on` into `true`
  const triggers = isObj(on) ? Object.keys(on) : strings(on);
  const jobs: PipelineJob[] = [];
  let skipped = 0;
  for (const [key, j] of Object.entries(root.jobs as Obj)) {
    if (!isObj(j)) continue;
    if (jobs.length >= PIPELINE_MAX_JOBS) {
      skipped++;
      continue;
    }
    const steps = Array.isArray(j.steps) ? j.steps.filter(isObj) : [];
    const uses = steps.map((s) => str(s.uses));
    const env = isObj(j.environment) ? str(j.environment.name) : str(j.environment);
    const svc = isObj(j.services)
      ? [...new Set(Object.entries(j.services).map(([k, v]) => imageName(isObj(v) ? str(v.image) || k : typeof v === "string" ? v : k)))]
      : [];
    const strategy = isObj(j.strategy) ? j.strategy : {};
    const container = isObj(j.container) ? str(j.container.image) : str(j.container);
    const runsOn = strings(j["runs-on"]).join(", ") || (isObj(j["runs-on"]) ? "runner group" : "");
    jobs.push({
      key,
      name: str(j.name) || key,
      stage: "",
      needs: strings(j.needs),
      manual: false,
      rules: false,
      only: [],
      ...(str(j.if) ? { condition: str(j.if) } : {}),
      ...(env ? { environment: env } : {}),
      artifacts: uses.some((u) => u.startsWith("actions/upload-artifact")),
      cache: uses.some((u) => u.startsWith("actions/cache")),
      services: svc,
      ...(typeof j.uses === "string" ? { reusable: workflowName(j.uses) } : {}),
      matrix: matrixSize(strategy.matrix),
      allowFailure: j["continue-on-error"] === true,
      onFailure: str(j.if).includes("failure()"),
      retry: 0,
      tagOnly: str(j.if).includes("refs/tags"),
      ...(container ? { image: container } : runsOn ? { image: `runs-on: ${runsOn}` } : {}),
      script: steps
        .map((s) => str(s.name) || str(s.run).split("\n")[0] || (str(s.uses) && `uses: ${str(s.uses)}`))
        .filter(Boolean)
        .slice(0, 12),
    });
  }
  if (skipped) warnings.push({ code: "maxNodes", x: String(skipped) });
  return { kind: "github-actions", name: str(root.name), triggers, workflowRules: false, stages: [], jobs, warnings };
}

/* ---------- parsing ---------- */

export type PipelineParse = { ok: true; model: PipelineModel } | { ok: false; error: { code: PipelineErrorCode } };

/** Reads the YAML and finds the dialect. Only data is read: no tags are executed, no include is fetched. */
export async function parsePipeline(text: string): Promise<PipelineParse> {
  const fail = (code: PipelineErrorCode): PipelineParse => ({ ok: false, error: { code } });
  if (text.length > PIPELINE_MAX_CHARS) return fail("tooLarge");
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!src.trim()) return fail("empty");
  if (looksBinary(src)) return fail("notYaml");
  const YAML = await import("yaml");
  let docs: unknown[];
  try {
    const parsed = YAML.parseAllDocuments(src, { merge: true, uniqueKeys: false, prettyErrors: false });
    const list = Array.isArray(parsed) ? parsed : [parsed];
    if (list.some((d) => d.errors.length)) return fail("notYaml");
    docs = list.map((d) => d.toJS({ maxAliasCount: PIPELINE_MAX_ALIASES }) as unknown);
  } catch (e) {
    // "Excessive alias count" is a ReferenceError; a stack overflow on absurd nesting a RangeError
    return fail(e instanceof ReferenceError ? "tooLarge" : "notYaml");
  }
  // a GitLab component file has a `spec:` header document before the pipeline
  for (const root of docs) {
    if (!isObj(root)) continue;
    if (isGithub(root)) {
      const m = readGithub(root);
      return m.jobs.length ? { ok: true, model: m } : fail("noJobs");
    }
    const keys = Object.keys(root);
    if (keys.some((k) => isGitlabJob(k, root[k]))) return { ok: true, model: readGitlab(root) };
    if (own(root, "stages") || own(root, "include") || (isObj(root.jobs) && own(root, "on"))) return fail("noJobs");
  }
  return fail("notPipeline");
}

/* ---------- waves ---------- */

export interface Waves {
  /** wave index per job key */
  level: Map<string, number>;
  /** what each job waits for (direct), for lines and texts */
  deps: Map<string, string[]>;
  cycle: string[];
  unknownNeeds: string[];
}

/**
 * GitLab: a job without `needs` waits for every job of the earlier stages; `needs` replaces that
 * with its own list (so a DAG job can run ahead of its stage). GitHub: only `needs`.
 * Kahn's algorithm with one barrier per stage keeps this linear in jobs + needs.
 */
export function computeWaves(m: PipelineModel): Waves {
  const keys = new Set(m.jobs.map((j) => j.key));
  const unknownNeeds: string[] = [];
  const stageIx = new Map(m.stages.map((s, k) => [s, k]));
  const byStage = m.stages.map((s) => m.jobs.filter((j) => j.stage === s).map((j) => j.key));
  // nodes: jobs, plus barrier "\u0000s<k>" = earliest wave a stage-k job without needs may take
  const preds = new Map<string, { from: string; plus: number }[]>();
  const add = (to: string, from: string, plus: number) => preds.set(to, [...(preds.get(to) ?? []), { from, plus }]);
  const barrier = (k: number) => `\u0000s${k}`;
  const deps = new Map<string, string[]>();
  const nodes: string[] = [...keys];
  if (m.kind === "gitlab-ci") {
    for (let k = 0; k < byStage.length; k++) {
      nodes.push(barrier(k));
      if (k > 0) {
        add(barrier(k), barrier(k - 1), 0);
        for (const j of byStage[k - 1]!) add(barrier(k), j, 1);
      }
    }
  }
  for (const j of m.jobs) {
    if (j.needs === null) {
      const k = stageIx.get(j.stage) ?? 0;
      add(j.key, barrier(k), 0);
      // lines come from the nearest earlier stage that has jobs
      let near: string[] = [];
      for (let s = k - 1; s >= 0 && !near.length; s--) near = byStage[s]!;
      deps.set(j.key, near);
    } else {
      const ok: string[] = [];
      for (const n of j.needs) {
        if (keys.has(n) && n !== j.key) {
          add(j.key, n, 1);
          ok.push(n);
        } else unknownNeeds.push(n);
      }
      deps.set(j.key, [...new Set(ok)]);
    }
  }
  const indeg = new Map(nodes.map((n) => [n, 0]));
  const succ = new Map<string, { to: string; plus: number }[]>();
  for (const [to, list] of preds) {
    for (const p of list) {
      indeg.set(to, (indeg.get(to) ?? 0) + 1);
      succ.set(p.from, [...(succ.get(p.from) ?? []), { to, plus: p.plus }]);
    }
  }
  const value = new Map<string, number>();
  const queue = nodes.filter((n) => indeg.get(n) === 0);
  for (const n of queue) value.set(n, 0);
  for (let q = 0; q < queue.length; q++) {
    const n = queue[q]!;
    for (const s of succ.get(n) ?? []) {
      value.set(s.to, Math.max(value.get(s.to) ?? 0, value.get(n)! + s.plus));
      const d = indeg.get(s.to)! - 1;
      indeg.set(s.to, d);
      if (d === 0) queue.push(s.to);
    }
  }
  const cycle = m.jobs.filter((j) => !value.has(j.key)).map((j) => j.key);
  let top = 0;
  for (const j of m.jobs) if (value.has(j.key)) top = Math.max(top, value.get(j.key)!);
  const level = new Map<string, number>();
  for (const j of m.jobs) level.set(j.key, value.get(j.key) ?? top + 1);
  // drop empty waves (a barrier can leave a gap)
  const used = [...new Set(level.values())].sort((a, b) => a - b);
  const pack = new Map(used.map((v, k) => [v, k]));
  for (const [k, v] of level) level.set(k, pack.get(v)!);
  return { level, deps, cycle, unknownNeeds: [...new Set(unknownNeeds)] };
}

/* ---------- texts ---------- */

type NoteKey = "manual" | "rules" | "only" | "if" | "matrix" | "env" | "artifacts" | "services" | "trigger" | "reusable" | "allowFailure" | "onFailure" | "retry";

const T = {
  en: {
    title: "CI pipeline: {name}",
    gitlabName: "GitLab CI pipeline",
    githubName: "GitHub Actions workflow",
    summary: "How {n} jobs in {waves} waves run after {trigger}, step by step: what waits for what, where results go and what a failure stops.",
    learn: ["Which event starts the pipeline", "Which jobs run in parallel and which wait (stages and needs)", "Where artifacts, services and deployments fit", "What happens when a job fails and how a retry continues"],
    pushMr: "Push / merge request",
    artifacts: "Artifacts",
    cache: "Cache",
    more: "+{n} jobs",
    child: "Child pipeline",
    startTitle: "The pipeline starts",
    startShort: "Start",
    startBody: "The event {trigger} creates a new pipeline.{rules} First to start: {first}.",
    wfRules: " workflow: rules decide whether a pipeline is created at all.",
    dispatch: " workflow_dispatch also lets a person start it by hand.",
    schedule: " schedule runs it on a timer (cron).",
    stage: "Stage: {x}",
    wave: "Wave {n}",
    parallel: "These jobs run in parallel: {jobs}.",
    single: "This job runs: {jobs}.",
    waits1: " It starts when {deps} {verb} done.",
    waitsN: " They start when {deps} {verb} done.",
    waitsOne: "is",
    waitsMany: "are",
    noWait1: " It starts as soon as the pipeline is created.",
    noWaitN: " They start as soon as the pipeline is created.",
    needs1: " needs lets it start without waiting for the whole previous stage.",
    needsN: " needs lets them start without waiting for the whole previous stage.",
    manualWatch: "This job does not start by itself: someone must press Run. Until then everything after it waits.",
    notes: {
      manual: "waits for someone to press Run (when: manual)",
      rules: "runs only when its rules match",
      only: "runs only for: {x}",
      if: "runs only if: {x}",
      matrix: "runs ×{x} (matrix)",
      env: "deploys to {x}",
      artifacts: "saves artifacts for later jobs",
      services: "starts {x} next to it",
      trigger: "starts another pipeline: {x}",
      reusable: "calls the reusable workflow {x}",
      allowFailure: "may fail without stopping the pipeline",
      onFailure: "runs only after an earlier job fails",
      retry: "is retried up to {x} times",
    } satisfies Record<NoteKey, string>,
    deployTitle: "Deploy: {x}",
    deployShort: "Deploy",
    deployBody: "{jobs} deliver the build to {x}. Each deployment is recorded per environment, so you can see which version runs where and roll back.{manual}",
    deployManual: " The deploy waits for a person (when: manual): a gate before the environment changes.",
    storeTitle: "Artifacts and cache",
    storeShort: "Artifacts",
    storeBody: "{jobs} save files when they finish. Artifacts are passed on to later jobs and can be downloaded; the cache only speeds up the next run and may be empty, so a job must work without it.",
    svcTitle: "Service containers: {x}",
    svcShort: "Services",
    svcBody: "{x} start as separate containers next to {jobs} for as long as the job runs, for example a database for tests. When the job ends they are thrown away with all their data.",
    extTitle: "Other pipelines: {x}",
    extShort: "Downstream",
    extBody: "{jobs} hand work over to {x}. That pipeline runs on its own; the calling job can wait for its result or just start it and move on.",
    overTitle: "The whole pipeline",
    overShort: "Overview",
    overBody: "{n} jobs in {waves} waves. The longest chain of waiting jobs decides how long a pipeline takes, so jobs that do not depend on each other should run in parallel.",
    logTitle: "What a job runs: {job}",
    logShort: "Job log",
    logBody: "A job is a fresh runner environment that runs its script line by line. The first command that exits with an error stops the job; nothing is kept unless it is saved as an artifact or cache.",
    failTitle: "A job fails: {job}",
    failShort: "Failure",
    failNext: "If {job} exits with an error, the jobs that wait for it ({next}) do not start and the pipeline turns red.",
    failAlone: "If {job} exits with an error, the pipeline turns red.",
    failTail: " Jobs that do not depend on it can still finish.",
    failWatch: "Look at the lines after {job}: nothing travels on them now.",
    retryTitle: "Fix and retry",
    retryShort: "Retry",
    retryBody: "After a fix (a new commit) or the Retry button, {job} runs again and the jobs that waited for it continue.",
    recapTitle: "Recap",
    recapBody: "{trigger} creates the pipeline. Then {waves} waves of jobs follow: inside a wave jobs run in parallel, and a wave starts when the jobs it needs are done.{targets} If a job fails, everything that waits for it stops until a retry.",
    recapTargets: " Results go to: {x}.",
    caseOnFailure: "{job} runs after a failure",
    onFailFailTitle: "{dep} fails",
    onFailFailBody: "{dep} exits with an error. The jobs that wait for it do not start, but {job} has {how}: it starts exactly now.",
    onFailRunTitle: "{job} handles the failure",
    onFailRunBody: "{job} runs only when an earlier job has failed, for example to notify the team, collect logs or clean up. On a green pipeline it never starts. The pipeline stays red: {job} reports the failure, it does not repair it.",
    caseAllowFail: "{job} fails, the pipeline goes on",
    allowFailTitle: "{job} fails, and that is allowed",
    allowFailBody: "{job} exits with an error, but it is marked {how}. The pipeline does not stop: it gets a warning sign instead of turning red.",
    allowGoTitle: "The pipeline goes on",
    allowGoNext: "{next} still start as if {job} had passed. A yellow warning is easy to miss: a job that keeps failing should be fixed or removed.",
    allowGoAlone: "The other jobs finish as usual and the pipeline passes with a warning. A yellow warning is easy to miss: a job that keeps failing should be fixed or removed.",
    caseRetry: "{job} is retried automatically",
    retryFailTitle: "{job} fails on the first try",
    retryFailBody: "The runner loses its network for a moment and {job} fails. retry: {n} tells the runner to start it again by itself, up to {n} more times, before the pipeline turns red.",
    retryOkTitle: "The second attempt passes",
    retryOkBody: "{job} runs again on a fresh runner and passes, and the pipeline continues. Retries help with flaky networks and runners; a real bug fails every attempt, so a retry only costs time there.",
    caseManual: "Nobody presses Run on {job}",
    manualIdleTitle: "{job} is never started",
    manualIdleNext: "Nobody presses Run on {job}, so {next} never start and nothing behind this gate changes. A manual job is a decision point: the pipeline waits for a person, not for a machine.",
    manualIdleAlone: "Nobody presses Run on {job}, so nothing behind this gate changes. A manual job is a decision point: the pipeline waits for a person, not for a machine.",
    manualLateTitle: "Someone presses Run later",
    manualLateBody: "Hours later someone presses Run: {job} starts from the same commit and the rest of the pipeline continues from there.",
    caseApproval: "{job} waits for approval",
    approvalWaitTitle: "{job} waits for a reviewer",
    approvalWaitBody: "{job} deploys to the environment {env}. When that environment has protection rules (required reviewers, a wait timer), the job does not start until a person approves it.",
    approvalOkTitle: "The deploy is approved",
    approvalOkBody: "A reviewer approves the run and {job} starts. The approval is recorded next to the deployment, so it is clear who let which version into {env}.",
    caseRollback: "Rollback of {env}",
    badTitle: "The new version is broken",
    badBody: "The deploy to {env} finishes, but the new version does not work: errors grow right after the release. The pipeline is green, the users see failures.",
    rollTitle: "Roll back",
    rollJob: "{rb} brings back the previous version on {env}. The fix then comes as a new commit and goes through the whole pipeline again.",
    rollGitlab: "The previous successful deploy job is run again (Environments, Rollback). {env} is back on the old version; the fix then comes as a new commit and goes through the whole pipeline again.",
    rollGithub: "The last good workflow run is re-run, so {env} gets the previous version back. The fix then comes as a new commit and goes through the whole pipeline again.",
    caseTag: "A pipeline for a tag",
    tagTitle: "A tag is pushed",
    tagBody: "A release tag starts the pipeline. Now {jobs} also run: their rules match only tags, so on ordinary pushes they are skipped.",
    caseBranch: "A pipeline on another branch",
    branchTitle: "Another branch",
    branchBody: "A push to a feature branch starts a smaller pipeline: {jobs} have rules (only, rules or if) that do not match here, so they are skipped. The other jobs run as usual.",
  },
  ru: {
    title: "CI-пайплайн: {name}",
    gitlabName: "Пайплайн GitLab CI",
    githubName: "Workflow GitHub Actions",
    summary: "Как {n} задач в {waves} волнах выполняются после события {trigger}, шаг за шагом: что чего ждёт, куда уходят результаты и что останавливает сбой.",
    learn: ["Какое событие запускает пайплайн", "Какие задачи идут параллельно, а какие ждут (stages и needs)", "Где в пайплайне артефакты, сервисы и деплой", "Что происходит при падении задачи и как продолжает повтор"],
    pushMr: "Push / merge request",
    artifacts: "Артефакты",
    cache: "Кэш",
    more: "+{n} задач",
    child: "Дочерний пайплайн",
    startTitle: "Пайплайн стартует",
    startShort: "Старт",
    startBody: "Событие {trigger} создаёт новый пайплайн.{rules} Первыми стартуют: {first}.",
    wfRules: " Правила workflow: rules решают, создавать ли пайплайн вообще.",
    dispatch: " workflow_dispatch позволяет запустить его и вручную.",
    schedule: " schedule запускает его по расписанию (cron).",
    stage: "Этап: {x}",
    wave: "Волна {n}",
    parallel: "Параллельно выполняются: {jobs}.",
    single: "Выполняется задача: {jobs}.",
    waits1: " Старт — после завершения: {deps}.",
    waitsN: " Старт — после завершения: {deps}.",
    waitsOne: "",
    waitsMany: "",
    noWait1: " Старт — сразу после создания пайплайна.",
    noWaitN: " Старт — сразу после создания пайплайна.",
    needs1: " needs позволяет не ждать весь предыдущий этап.",
    needsN: " needs позволяет не ждать весь предыдущий этап.",
    manualWatch: "Эта задача не стартует сама: кто-то должен нажать Run. До этого всё, что после неё, ждёт.",
    notes: {
      manual: "ждёт, пока кто-то нажмёт Run (when: manual)",
      rules: "запускается, только если совпали rules",
      only: "запускается только для: {x}",
      if: "запускается только при условии: {x}",
      matrix: "запускается ×{x} (matrix)",
      env: "деплоит в {x}",
      artifacts: "сохраняет артефакты для следующих задач",
      services: "поднимает рядом {x}",
      trigger: "запускает другой пайплайн: {x}",
      reusable: "вызывает переиспользуемый workflow {x}",
      allowFailure: "может упасть, не останавливая пайплайн",
      onFailure: "запускается, только если упала задача раньше",
      retry: "перезапускается до {x} раз",
    } satisfies Record<NoteKey, string>,
    deployTitle: "Деплой: {x}",
    deployShort: "Деплой",
    deployBody: "{jobs} доставляет сборку в {x}. Каждый деплой записывается по окружению: видно, какая версия где работает, и можно откатиться.{manual}",
    deployManual: " Деплой ждёт человека (when: manual): это ворота перед изменением окружения.",
    storeTitle: "Артефакты и кэш",
    storeShort: "Артефакты",
    storeBody: "{jobs} сохраняют файлы после работы. Артефакты передаются следующим задачам и доступны для скачивания; кэш лишь ускоряет следующий запуск и может быть пустым, поэтому задача должна работать и без него.",
    svcTitle: "Сервисные контейнеры: {x}",
    svcShort: "Сервисы",
    svcBody: "{x} запускаются отдельными контейнерами рядом с {jobs}, пока идёт задача, например база для тестов. Когда задача заканчивается, они удаляются вместе с данными.",
    extTitle: "Другие пайплайны: {x}",
    extShort: "Дочерние",
    extBody: "{jobs} передаёт работу в {x}. Тот пайплайн идёт сам по себе; вызывающая задача может ждать его результата или просто запустить его и идти дальше.",
    overTitle: "Весь пайплайн",
    overShort: "Обзор",
    overBody: "{n} задач в {waves} волнах. Длительность пайплайна определяет самая длинная цепочка ожидающих задач, поэтому независимые задачи стоит запускать параллельно.",
    logTitle: "Что делает задача: {job}",
    logShort: "Лог задачи",
    logBody: "Задача — это чистое окружение раннера, которое выполняет script строка за строкой. Первая команда с ошибкой останавливает задачу; ничего не сохраняется, если это не артефакт или кэш.",
    failTitle: "Задача падает: {job}",
    failShort: "Сбой",
    failNext: "Если {job} завершается с ошибкой, задачи, которые её ждут ({next}), не стартуют, и пайплайн становится красным.",
    failAlone: "Если {job} завершается с ошибкой, пайплайн становится красным.",
    failTail: " Независимые задачи ещё могут завершиться.",
    failWatch: "Посмотрите на линии после {job}: по ним сейчас ничего не идёт.",
    retryTitle: "Исправить и перезапустить",
    retryShort: "Повтор",
    retryBody: "После исправления (новый коммит) или кнопки Retry задача {job} запускается снова, и ждавшие её задачи продолжают работу.",
    recapTitle: "Итог",
    recapBody: "{trigger} создаёт пайплайн. Дальше идут волны задач ({waves}): внутри волны задачи работают параллельно, а волна стартует, когда готово всё, что ей нужно.{targets} Если задача падает, всё, что её ждёт, стоит до повтора.",
    recapTargets: " Результаты уходят в: {x}.",
    caseOnFailure: "{job} после сбоя",
    onFailFailTitle: "{dep} падает",
    onFailFailBody: "{dep} завершается с ошибкой. Задачи, которые её ждут, не стартуют, но у {job} стоит {how}: она стартует именно сейчас.",
    onFailRunTitle: "{job} обрабатывает сбой",
    onFailRunBody: "{job} запускается, только если раньше упала другая задача, например чтобы оповестить команду, собрать логи или прибрать за собой. В зелёном пайплайне она не стартует. Пайплайн остаётся красным: {job} сообщает о сбое, но не исправляет его.",
    caseAllowFail: "{job} падает, пайплайн идёт дальше",
    allowFailTitle: "{job} падает, и это разрешено",
    allowFailBody: "{job} завершается с ошибкой, но у неё стоит {how}. Пайплайн не останавливается: вместо красного статуса он получает предупреждение.",
    allowGoTitle: "Пайплайн идёт дальше",
    allowGoNext: "{next} всё равно стартуют, будто {job} прошла. Жёлтое предупреждение легко пропустить: задачу, которая падает постоянно, стоит починить или убрать.",
    allowGoAlone: "Остальные задачи завершаются как обычно, пайплайн проходит с предупреждением. Жёлтое предупреждение легко пропустить: задачу, которая падает постоянно, стоит починить или убрать.",
    caseRetry: "Автоповтор {job}",
    retryFailTitle: "{job} падает с первой попытки",
    retryFailBody: "У раннера на миг пропадает сеть, и {job} падает. retry: {n} велит раннеру запустить её снова самому, до {n} раз, прежде чем пайплайн станет красным.",
    retryOkTitle: "Вторая попытка проходит",
    retryOkBody: "{job} запускается заново на чистом раннере и проходит, пайплайн продолжается. Повторы спасают от нестабильной сети и раннеров; настоящая ошибка падает каждый раз, и повтор там лишь тратит время.",
    caseManual: "Никто не нажимает Run у {job}",
    manualIdleTitle: "{job} так и не запускают",
    manualIdleNext: "Никто не нажимает Run у {job}, поэтому {next} не стартуют и за этими воротами ничего не меняется. Ручная задача — точка решения: пайплайн ждёт человека, а не машину.",
    manualIdleAlone: "Никто не нажимает Run у {job}, поэтому за этими воротами ничего не меняется. Ручная задача — точка решения: пайплайн ждёт человека, а не машину.",
    manualLateTitle: "Run нажимают позже",
    manualLateBody: "Через несколько часов кто-то нажимает Run: {job} стартует с того же коммита, и остальной пайплайн продолжается с этого места.",
    caseApproval: "{job} ждёт одобрения",
    approvalWaitTitle: "{job} ждёт ревьюера",
    approvalWaitBody: "{job} деплоит в окружение {env}. Если у окружения есть правила защиты (обязательные ревьюеры, таймер ожидания), задача не стартует, пока человек её не одобрит.",
    approvalOkTitle: "Деплой одобрен",
    approvalOkBody: "Ревьюер одобряет запуск, и {job} стартует. Одобрение записывается рядом с деплоем: видно, кто пустил какую версию в {env}.",
    caseRollback: "Откат {env}",
    badTitle: "Новая версия сломана",
    badBody: "Деплой в {env} завершился, но новая версия не работает: сразу после релиза растут ошибки. Пайплайн зелёный, а пользователи видят сбои.",
    rollTitle: "Откат",
    rollJob: "{rb} возвращает в {env} предыдущую версию. Исправление потом приходит новым коммитом и снова проходит весь пайплайн.",
    rollGitlab: "Предыдущая успешная задача деплоя запускается снова (Environments, Rollback). В {env} снова старая версия; исправление потом приходит новым коммитом и снова проходит весь пайплайн.",
    rollGithub: "Последний удачный запуск workflow перезапускается, и {env} получает предыдущую версию. Исправление потом приходит новым коммитом и снова проходит весь пайплайн.",
    caseTag: "Пайплайн для тега",
    tagTitle: "Пушат тег",
    tagBody: "Пайплайн запускает релизный тег. Теперь выполняются и {jobs}: их правила совпадают только для тегов, при обычных пушах они пропускаются.",
    caseBranch: "Пайплайн в другой ветке",
    branchTitle: "Другая ветка",
    branchBody: "Пуш в feature-ветку запускает пайплайн поменьше: у {jobs} есть правила (only, rules или if), которые здесь не совпадают, и они пропускаются. Остальные задачи идут как обычно.",
  },
  uz: {
    title: "CI pipeline: {name}",
    gitlabName: "GitLab CI pipeline",
    githubName: "GitHub Actions workflow",
    summary: "{trigger} hodisasidan keyin {waves} to'lqindagi {n} ta job qanday ishlashi, qadamma-qadam: nima nimani kutadi, natijalar qayerga boradi va xato nimani to'xtatadi.",
    learn: ["Pipeline'ni qaysi hodisa ishga tushiradi", "Qaysi job'lar parallel ishlaydi, qaysilari kutadi (stages va needs)", "Artefaktlar, servislar va deploy qayerda turadi", "Job yiqilsa nima bo'ladi va qayta ishga tushirish qanday davom etadi"],
    pushMr: "Push / merge request",
    artifacts: "Artefaktlar",
    cache: "Kesh",
    more: "+{n} ta job",
    child: "Ichki pipeline",
    startTitle: "Pipeline boshlanadi",
    startShort: "Boshlanish",
    startBody: "{trigger} hodisasi yangi pipeline yaratadi.{rules} Birinchi bo'lib boshlanadi: {first}.",
    wfRules: " workflow: rules pipeline umuman yaratilishini hal qiladi.",
    dispatch: " workflow_dispatch uni qo'lda ishga tushirishga ham imkon beradi.",
    schedule: " schedule uni jadval bo'yicha (cron) ishga tushiradi.",
    stage: "Bosqich: {x}",
    wave: "{n}-to'lqin",
    parallel: "Bu job'lar parallel ishlaydi: {jobs}.",
    single: "Bu job ishlaydi: {jobs}.",
    waits1: " U {deps} tugagach boshlanadi.",
    waitsN: " Ular {deps} tugagach boshlanadi.",
    waitsOne: "",
    waitsMany: "",
    noWait1: " U pipeline yaratilishi bilan boshlanadi.",
    noWaitN: " Ular pipeline yaratilishi bilan boshlanadi.",
    needs1: " needs tufayli u butun oldingi bosqichni kutmaydi.",
    needsN: " needs tufayli ular butun oldingi bosqichni kutmaydi.",
    manualWatch: "Bu job o'zi boshlanmaydi: kimdir Run tugmasini bosishi kerak. Ungacha undan keyingi hamma narsa kutadi.",
    notes: {
      manual: "kimdir Run tugmasini bosishini kutadi (when: manual)",
      rules: "faqat rules mos kelsa ishga tushadi",
      only: "faqat {x} uchun ishga tushadi",
      if: "faqat shu shartda ishga tushadi: {x}",
      matrix: "×{x} marta ishga tushadi (matrix)",
      env: "{x} ga deploy qiladi",
      artifacts: "keyingi job'lar uchun artefakt saqlaydi",
      services: "yonida {x} ni ishga tushiradi",
      trigger: "boshqa pipeline'ni ishga tushiradi: {x}",
      reusable: "qayta ishlatiladigan {x} workflow'ini chaqiradi",
      allowFailure: "pipeline'ni to'xtatmasdan yiqilishi mumkin",
      onFailure: "faqat oldingi job yiqilsa ishga tushadi",
      retry: "{x} martagacha qayta ishga tushiriladi",
    } satisfies Record<NoteKey, string>,
    deployTitle: "Deploy: {x}",
    deployShort: "Deploy",
    deployBody: "{jobs} build'ni {x} ga yetkazadi. Har bir deploy muhit bo'yicha yoziladi: qaysi versiya qayerda ishlayotgani ko'rinadi va orqaga qaytish mumkin.{manual}",
    deployManual: " Deploy odamni kutadi (when: manual): bu muhit o'zgarishidan oldingi darvoza.",
    storeTitle: "Artefaktlar va kesh",
    storeShort: "Artefaktlar",
    storeBody: "{jobs} ishdan keyin fayllarni saqlaydi. Artefaktlar keyingi job'larga uzatiladi va yuklab olinadi; kesh esa faqat keyingi ishga tushirishni tezlashtiradi va bo'sh bo'lishi mumkin, shuning uchun job usiz ham ishlashi kerak.",
    svcTitle: "Servis konteynerlar: {x}",
    svcShort: "Servislar",
    svcBody: "{x} job ishlab turgan vaqtda {jobs} yonida alohida konteyner bo'lib ishga tushadi, masalan testlar uchun baza. Job tugagach ular barcha ma'lumotlari bilan o'chiriladi.",
    extTitle: "Boshqa pipeline'lar: {x}",
    extShort: "Ichki",
    extBody: "{jobs} ishni {x} ga topshiradi. U pipeline o'zicha ishlaydi; chaqirgan job uning natijasini kutishi yoki shunchaki ishga tushirib, davom etishi mumkin.",
    overTitle: "Butun pipeline",
    overShort: "Umumiy ko'rinish",
    overBody: "{waves} to'lqinda {n} ta job. Pipeline qancha davom etishini eng uzun kutish zanjiri belgilaydi, shuning uchun bir-biriga bog'liq bo'lmagan job'lar parallel ishlashi kerak.",
    logTitle: "Job nima qiladi: {job}",
    logShort: "Job logi",
    logBody: "Job — bu toza runner muhiti, u script'ni qatorma-qator bajaradi. Xato bilan tugagan birinchi buyruq job'ni to'xtatadi; artefakt yoki kesh sifatida saqlanmagan narsa qolmaydi.",
    failTitle: "Job yiqiladi: {job}",
    failShort: "Xato",
    failNext: "Agar {job} xato bilan tugasa, uni kutayotgan job'lar ({next}) boshlanmaydi va pipeline qizil bo'ladi.",
    failAlone: "Agar {job} xato bilan tugasa, pipeline qizil bo'ladi.",
    failTail: " Unga bog'liq bo'lmagan job'lar baribir tugashi mumkin.",
    failWatch: "{job} dan keyingi chiziqlarga qarang: hozir ular bo'ylab hech narsa o'tmaydi.",
    retryTitle: "Tuzatib, qayta ishga tushirish",
    retryShort: "Qayta",
    retryBody: "Tuzatishdan keyin (yangi commit) yoki Retry tugmasi bilan {job} qayta ishlaydi va uni kutgan job'lar davom etadi.",
    recapTitle: "Xulosa",
    recapBody: "{trigger} pipeline'ni yaratadi. Keyin job'lar to'lqinlari ({waves}) keladi: to'lqin ichida job'lar parallel ishlaydi, to'lqin esa kerakli job'lar tugagach boshlanadi.{targets} Job yiqilsa, uni kutayotgan hamma narsa qayta ishga tushirilguncha to'xtaydi.",
    recapTargets: " Natijalar boradi: {x}.",
    caseOnFailure: "Xatodan keyin {job}",
    onFailFailTitle: "{dep} yiqiladi",
    onFailFailBody: "{dep} xato bilan tugaydi. Uni kutayotgan job'lar boshlanmaydi, lekin {job} da {how} bor: u aynan hozir boshlanadi.",
    onFailRunTitle: "{job} xatoni qayta ishlaydi",
    onFailRunBody: "{job} faqat oldingi job yiqilganda ishga tushadi, masalan jamoaga xabar berish, loglarni yig'ish yoki tozalash uchun. Yashil pipeline'da u hech qachon boshlanmaydi. Pipeline qizilligicha qoladi: {job} xato haqida xabar beradi, uni tuzatmaydi.",
    caseAllowFail: "{job} yiqiladi, pipeline davom etadi",
    allowFailTitle: "{job} yiqiladi, bunga ruxsat bor",
    allowFailBody: "{job} xato bilan tugaydi, lekin unda {how} belgilangan. Pipeline to'xtamaydi: qizil bo'lish o'rniga ogohlantirish belgisini oladi.",
    allowGoTitle: "Pipeline davom etadi",
    allowGoNext: "{next} xuddi {job} o'tgandek baribir boshlanadi. Sariq ogohlantirishni o'tkazib yuborish oson: doim yiqiladigan job tuzatilishi yoki olib tashlanishi kerak.",
    allowGoAlone: "Qolgan job'lar odatdagidek tugaydi va pipeline ogohlantirish bilan o'tadi. Sariq ogohlantirishni o'tkazib yuborish oson: doim yiqiladigan job tuzatilishi yoki olib tashlanishi kerak.",
    caseRetry: "{job} avtomatik qayta ishga tushadi",
    retryFailTitle: "{job} birinchi urinishda yiqiladi",
    retryFailBody: "Runner'da bir lahzaga tarmoq uziladi va {job} yiqiladi. retry: {n} runner'ga uni o'zi qayta ishga tushirishni aytadi, pipeline qizil bo'lishidan oldin {n} martagacha.",
    retryOkTitle: "Ikkinchi urinish o'tadi",
    retryOkBody: "{job} toza runner'da qayta ishlaydi va o'tadi, pipeline davom etadi. Qayta urinish beqaror tarmoq va runner'lardan saqlaydi; haqiqiy xato har safar yiqiladi, u yerda qayta urinish faqat vaqt oladi.",
    caseManual: "{job} da hech kim Run bosmaydi",
    manualIdleTitle: "{job} ishga tushirilmaydi",
    manualIdleNext: "{job} da hech kim Run bosmaydi, shuning uchun {next} boshlanmaydi va bu darvozadan keyin hech narsa o'zgarmaydi. Qo'lda ishga tushadigan job — qaror nuqtasi: pipeline mashinani emas, odamni kutadi.",
    manualIdleAlone: "{job} da hech kim Run bosmaydi, shuning uchun bu darvozadan keyin hech narsa o'zgarmaydi. Qo'lda ishga tushadigan job — qaror nuqtasi: pipeline mashinani emas, odamni kutadi.",
    manualLateTitle: "Keyinroq kimdir Run bosadi",
    manualLateBody: "Bir necha soatdan keyin kimdir Run bosadi: {job} o'sha commit'dan boshlanadi va pipeline'ning qolgan qismi shu joydan davom etadi.",
    caseApproval: "{job} tasdiqni kutadi",
    approvalWaitTitle: "{job} tekshiruvchini kutadi",
    approvalWaitBody: "{job} {env} muhitiga deploy qiladi. Bu muhitda himoya qoidalari (majburiy tekshiruvchilar, kutish taymeri) bo'lsa, odam tasdiqlamaguncha job boshlanmaydi.",
    approvalOkTitle: "Deploy tasdiqlandi",
    approvalOkBody: "Tekshiruvchi ishga tushirishni tasdiqlaydi va {job} boshlanadi. Tasdiq deploy yonida yoziladi: {env} ga qaysi versiyani kim kiritgani ko'rinadi.",
    caseRollback: "{env} ni orqaga qaytarish",
    badTitle: "Yangi versiya buzuq",
    badBody: "{env} ga deploy tugadi, lekin yangi versiya ishlamayapti: relizdan keyin darhol xatolar ko'payadi. Pipeline yashil, foydalanuvchilar esa xatolarni ko'radi.",
    rollTitle: "Orqaga qaytarish",
    rollJob: "{rb} {env} ga oldingi versiyani qaytaradi. Tuzatish keyin yangi commit bo'lib keladi va butun pipeline'dan yana o'tadi.",
    rollGitlab: "Oldingi muvaffaqiyatli deploy job'i qayta ishga tushiriladi (Environments, Rollback). {env} yana eski versiyada; tuzatish keyin yangi commit bo'lib keladi va butun pipeline'dan yana o'tadi.",
    rollGithub: "Oxirgi muvaffaqiyatli workflow qayta ishga tushiriladi va {env} oldingi versiyani qaytarib oladi. Tuzatish keyin yangi commit bo'lib keladi va butun pipeline'dan yana o'tadi.",
    caseTag: "Teg uchun pipeline",
    tagTitle: "Teg push qilinadi",
    tagBody: "Reliz tegi pipeline'ni boshlaydi. Endi {jobs} ham ishlaydi: ularning qoidalari faqat teglarga mos keladi, oddiy push'larda ular o'tkazib yuboriladi.",
    caseBranch: "Boshqa branch'dagi pipeline",
    branchTitle: "Boshqa branch",
    branchBody: "Feature branch'ga push kichikroq pipeline'ni boshlaydi: {jobs} ning qoidalari (only, rules yoki if) bu yerda mos kelmaydi, shuning uchun ular o'tkazib yuboriladi. Qolgan job'lar odatdagidek ishlaydi.",
  },
} satisfies Record<AuthorLang, unknown>;

// one pass: a job named "{x}" is not filled again
const fill = fillIn;
const tr = (f: (s: (typeof T)["en"], l: AuthorLang) => string): PerLang<string> => perLangOf((l) => f(T[l] as (typeof T)["en"], l));

/* ---------- model -> draft ---------- */

interface Group {
  key: string;
  level: number;
  /** jobs shown by this block */
  jobs: PipelineJob[];
}

export function pipelineToDraft(m: PipelineModel): PipelineImport {
  const warnings: ImportWarning[] = [...m.warnings];
  const warn = (code: ImportWarningCode, x?: string) => warnings.push(x === undefined ? { code } : { code, x });
  const waves = computeWaves(m);
  if (waves.unknownNeeds.length) warn("unknownNeeds", waves.unknownNeeds.slice(0, 5).join(", "));
  if (waves.cycle.length) warn("cycle", waves.cycle.slice(0, 5).join(", "));
  const byKey = new Map(m.jobs.map((j) => [j.key, j]));
  const levelCount = Math.max(0, ...waves.level.values()) + 1;
  const jobsAt: PipelineJob[][] = Array.from({ length: levelCount }, () => []);
  for (const j of m.jobs) jobsAt[waves.level.get(j.key)!]!.push(j);

  // targets: one block per environment, service image, downstream; one for artifacts, one for cache
  const MAX_TARGETS = 8;
  const envs = [...new Set(m.jobs.map((j) => j.environment).filter((x): x is string => !!x))];
  const svcs = [...new Set(m.jobs.flatMap((j) => j.services))];
  const exts = [...new Set(m.jobs.map((j) => j.trigger ?? j.reusable).filter((x): x is string => !!x))];
  const hasArtifacts = m.jobs.some((j) => j.artifacts);
  const hasCache = m.jobs.some((j) => j.cache);
  type Target = { key: string; kind: NodeKind; label: PerLang<string>; group: "env" | "ext" | "store" | "svc"; name: string };
  const targets: Target[] = [];
  const same = (s: string) => perLangOf(() => s);
  for (const e of envs) targets.push({ key: `env:${e}`, kind: "service", label: same(e), group: "env", name: e });
  for (const x of exts) {
    const label = x === "child" ? tr((s) => s.child) : same(x);
    targets.push({ key: `ext:${x}`, kind: "external", label, group: "ext", name: x === "child" ? T.en.child : x });
  }
  if (hasArtifacts) targets.push({ key: "store:artifacts", kind: "storage", label: tr((s) => s.artifacts), group: "store", name: "artifacts" });
  if (hasCache) targets.push({ key: "store:cache", kind: "cache", label: tr((s) => s.cache), group: "store", name: "cache" });
  for (const s of svcs) targets.push({ key: `svc:${s}`, kind: kindFromName(s) ?? "service", label: same(s), group: "svc", name: s });
  if (targets.length > MAX_TARGETS) warn("maxNodes", String(targets.length - MAX_TARGETS));
  const keptTargets = targets.slice(0, MAX_TARGETS);
  const targetKeys = new Set(keptTargets.map((t) => t.key));

  // job blocks: as many per wave as fit in IMPORT_MAX_NODES, the rest folded into "+N jobs"
  const budget = IMPORT_MAX_NODES - 1 - keptTargets.length;
  let levels = levelCount;
  while (levels > 1 && levels > budget) levels--;
  if (levels < levelCount) {
    const dropped = jobsAt.slice(levels).reduce((n, l) => n + l.length, 0);
    warn("maxNodes", String(dropped));
  }
  const fits = (k: number) => jobsAt.slice(0, levels).reduce((n, l) => n + Math.min(l.length, k) + (l.length > k ? 1 : 0), 0) <= budget;
  let perLevel = Math.max(1, ...jobsAt.map((l) => l.length));
  while (perLevel > 0 && !fits(perLevel)) perLevel--;
  const groups: Group[] = [];
  const groupOf = new Map<string, string>();
  let folded = 0;
  for (let l = 0; l < levels; l++) {
    const list = jobsAt[l]!;
    // a fold of one job is the job itself: same block count, better name
    const shown = list.length > perLevel + 1 ? list.slice(0, perLevel) : list;
    for (const j of shown) {
      groups.push({ key: `job:${j.key}`, level: l, jobs: [j] });
      groupOf.set(j.key, `job:${j.key}`);
    }
    const rest = list.slice(shown.length);
    if (rest.length) {
      const key = `more:${l}`;
      groups.push({ key, level: l, jobs: rest });
      for (const j of rest) groupOf.set(j.key, key);
      folded += rest.length;
    }
  }
  if (folded) warn("maxNodes", String(folded));

  // blocks and their lattice points
  const nodes: KitNode[] = [];
  const triggerName = m.kind === "github-actions" ? m.triggers.join(", ") || "push" : "";
  nodes.push({
    key: "trigger",
    idBase: m.kind === "github-actions" ? m.triggers[0] || "trigger" : "push",
    fallbackId: "trigger",
    kind: "actor",
    label: m.kind === "github-actions" ? same(clip(triggerName, 48)) : tr((s) => s.pushMr),
    at: [0, 3],
  });
  for (let l = 0; l < levels; l++) {
    const inLevel = groups.filter((g) => g.level === l);
    const rows = centredRows(inLevel.length);
    inLevel.forEach((g, k) => {
      const j = g.jobs[0]!;
      const single = g.key.startsWith("job:");
      nodes.push({
        key: g.key,
        idBase: single ? j.key : `more-jobs-${l + 1}`,
        fallbackId: "job",
        kind: "worker",
        label: single ? same(j.name + (j.matrix ? ` ×${j.matrix}` : "")) : tr((s) => fill(s.more, { n: g.jobs.length })),
        at: [l + 1, rows[k]!],
      });
    });
  }
  const right = keptTargets.filter((t) => t.group === "env" || t.group === "ext");
  const below = keptTargets.filter((t) => t.group === "store" || t.group === "svc");
  const rightRows = centredRows(right.length);
  right.forEach((t, k) => nodes.push({ key: t.key, idBase: t.name, fallbackId: t.group, kind: t.kind, label: t.label, at: [levels + 1, rightRows[k]!] }));
  below.forEach((t, k) => {
    const user = m.jobs.find((j) => usesTarget(j, t.key));
    const col = user && groupOf.has(user.key) ? waves.level.get(user.key)! + 1 : Math.min(levels, k + 1);
    nodes.push({ key: t.key, idBase: t.name, fallbackId: t.group, kind: t.kind, label: t.label, at: [col, LATTICE - 1 - (k % 2)] });
  });

  // lines
  const edges: KitEdge[] = [];
  const edgeKeys = new Set<string>();
  const line = (from: string, to: string, extra: Partial<KitEdge> = {}) => {
    if (from === to) return "";
    const key = `${from}>${to}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({ key, from, to, ...extra });
    }
    return key;
  };
  const shownKeys = new Set(groups.map((g) => g.key));
  for (const g of groups) {
    const sources = new Set<string>();
    for (const j of g.jobs) {
      const deps = waves.deps.get(j.key) ?? [];
      const inPipeline = deps.map((d) => groupOf.get(d)).filter((x): x is string => !!x && shownKeys.has(x));
      if (!inPipeline.length) sources.add("trigger");
      for (const s of inPipeline.slice(0, 4)) sources.add(s);
    }
    for (const s of [...sources].slice(0, 4)) line(s, g.key);
  }
  // a cycle can leave the first wave without a start line
  if (!edges.some((e) => e.from === "trigger")) for (const g of groups.filter((x) => x.level === 0)) line("trigger", g.key);
  // a shared target (a default cache) would draw a line from every job: three are enough to read it
  const linesInto = new Map<string, number>();
  for (const g of groups) {
    for (const j of g.jobs) {
      for (const t of keptTargets) {
        if (!usesTarget(j, t.key) || (linesInto.get(t.key) ?? 0) >= 3 || edgeKeys.has(`${g.key}>${t.key}`)) continue;
        linesInto.set(t.key, (linesInto.get(t.key) ?? 0) + 1);
        line(g.key, t.key, t.group === "ext" ? { mode: "async" } : {});
      }
    }
  }
  if (edges.length === 0) warn("noLines");

  /* ---------- beats ---------- */
  const jobName = (j: PipelineJob) => j.name;
  const intoGroup = (g: string) => edges.find((e) => e.to === g)?.key;
  const level0 = groups.filter((g) => g.level === 0);
  const firstNames = level0.flatMap((g) => g.jobs.map(jobName));
  const triggerText = m.kind === "github-actions" ? triggerName : "push / merge request";
  const workTargets = keptTargets.filter((t) => targetKeys.has(t.key));
  const beats: KitBeat[] = [];

  const startRules = (s: (typeof T)["en"]) =>
    (m.workflowRules ? s.wfRules : "") + (m.triggers.includes("workflow_dispatch") ? s.dispatch : "") + (m.triggers.includes("schedule") ? s.schedule : "");
  const trigEdge = edges.find((e) => e.from === "trigger")?.key;
  beats.push({
    idBase: "start",
    kind: "case",
    focus: ["trigger", ...level0.map((g) => g.key)],
    ...(trigEdge
      ? {
          exchange: {
            edge: trigEdge,
            request: { format: "text", head: `event: ${triggerText}`, body: m.kind === "github-actions" ? `on:\n${m.triggers.map((t) => `  ${t}`).join("\n")}` : m.workflowRules ? "workflow:\n  rules: [...]" : "" },
            response: {
              format: "text",
              head: "pipeline created",
              body: m.stages.length ? `stages: ${m.stages.join(" -> ")}` : `jobs: ${m.jobs.length}`,
            },
          },
        }
      : {}),
    text: perLangOf((l) => {
      const s = T[l] as (typeof T)["en"];
      return { title: s.startTitle, short: s.startShort, body: fill(s.startBody, { trigger: triggerText, rules: startRules(s), first: listIn(firstNames, l) || "-" }) };
    }),
  });

  // one beat per wave; when they do not fit, the last beat covers the remaining waves
  const extraBeats = new Set(workTargets.map((t) => t.group)).size + 2;
  const waveBudget = Math.max(1, IMPORT_MAX_STEPS - 2 - extraBeats);
  const waveBeats: number[][] = [];
  for (let l = 0; l < levels; l++) {
    if (waveBeats.length < waveBudget) waveBeats.push([l]);
    else waveBeats[waveBeats.length - 1]!.push(l);
  }
  if (levels > waveBudget) warn("maxSteps", String(levels - waveBudget));
  /** wave level -> index of the beat that tells it, for the cases that branch there */
  const waveBeatAt = new Map<number, number>();
  for (const ls of waveBeats) {
    for (const l of ls) waveBeatAt.set(l, beats.length);
    const gs = groups.filter((g) => ls.includes(g.level));
    const jobs = gs.flatMap((g) => g.jobs);
    const names = jobs.map(jobName);
    const stagesHere = [...new Set(jobs.map((j) => j.stage).filter(Boolean))];
    const depNames = [...new Set(jobs.flatMap((j) => waves.deps.get(j.key) ?? []))].filter((d) => !jobs.some((j) => j.key === d)).map((d) => byKey.get(d)?.name ?? d);
    const usesNeeds = m.kind === "gitlab-ci" && jobs.some((j) => j.needs !== null && j.needs.length > 0);
    const manual = jobs.some((j) => j.manual);
    const first = gs[0]!;
    const firstJob = first.jobs[0]!;
    const edge = intoGroup(first.key);
    const notes = (s: (typeof T)["en"]) => {
      let out = "";
      for (const j of jobs.slice(0, 8)) {
        const list: string[] = [];
        const add = (k: NoteKey, x = "") => list.push(fill(s.notes[k], { x }));
        if (j.manual) add("manual");
        if (j.rules && !j.manual) add("rules");
        if (j.only.length) add("only", j.only.slice(0, 3).join(", "));
        if (j.condition) add("if", clip(oneLine(j.condition), 80));
        if (j.matrix) add("matrix", String(j.matrix));
        if (j.environment) add("env", j.environment);
        if (j.artifacts) add("artifacts");
        if (j.services.length) add("services", j.services.join(", "));
        if (j.trigger) add("trigger", j.trigger === "child" ? s.child : j.trigger);
        if (j.reusable) add("reusable", j.reusable);
        if (j.allowFailure) add("allowFailure");
        if (j.onFailure) add("onFailure");
        if (j.retry) add("retry", String(j.retry));
        if (list.length) out += ` ${j.name}: ${list.join("; ")}.`;
      }
      return out;
    };
    const waveNo = ls[0]! + 1;
    beats.push({
      idBase: stagesHere.length === 1 && m.kind === "gitlab-ci" ? `stage-${stagesHere[0]}` : `wave-${waveNo}`,
      kind: manual ? "problem" : "case",
      focus: gs.map((g) => g.key),
      ...(edge
        ? {
            exchange: {
              edge,
              request: { format: "text", head: `job: ${firstJob.name}`, body: jobBody(firstJob) },
              response: { format: "text", head: firstJob.manual ? "job waiting: manual" : "job succeeded" },
            },
          }
        : {}),
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        const title = stagesHere.length && m.kind === "gitlab-ci" ? fill(s.stage, { x: stagesHere.join(", ") }) : fill(s.wave, { n: waveNo });
        const short = stagesHere.length && m.kind === "gitlab-ci" ? stagesHere.join(", ") : fill(s.wave, { n: waveNo });
        const many = names.length > 1;
        const body =
          fill(many ? s.parallel : s.single, { jobs: listIn(names, l, 6) }) +
          (depNames.length ? fill(many ? s.waitsN : s.waits1, { deps: listIn(depNames, l), verb: depNames.length > 1 ? s.waitsMany : s.waitsOne }) : many ? s.noWaitN : s.noWait1) +
          (usesNeeds ? (many ? s.needsN : s.needs1) : "") +
          notes(s);
        return { title, short, body: body.trim(), ...(manual ? { watch: s.manualWatch } : {}) };
      }),
    });
  }

  // where results go: one beat per kind of target
  let deployBeat = -1;
  const targetBeat = (group: Target["group"]) => {
    const ts = workTargets.filter((t) => t.group === group);
    if (!ts.length) return;
    const users = groups.filter((g) => g.jobs.some((j) => ts.some((t) => usesTarget(j, t.key))));
    const userJobs = m.jobs.filter((j) => ts.some((t) => usesTarget(j, t.key)));
    const edge = edges.find((e) => ts.some((t) => t.key === e.to))?.key;
    const tNames = ts.map((t) => (t.key === "store:artifacts" ? T.en.artifacts : t.key === "store:cache" ? T.en.cache : t.name));
    const manual = group === "env" && userJobs.some((j) => j.manual);
    const t0 = ts[0]!;
    const u0 = userJobs[0];
    const req =
      group === "env"
        ? { head: `deploy: ${t0.name}`, body: `environment: ${t0.name}\njob: ${u0?.name ?? ""}` }
        : group === "ext"
          ? { head: `trigger: ${t0.name}`, body: `job: ${u0?.name ?? ""}` }
          : group === "svc"
            ? { head: `service: ${t0.name}`, body: `job: ${u0?.name ?? ""}` }
            : { head: t0.key === "store:cache" ? "save cache" : "upload artifacts", body: `job: ${u0?.name ?? ""}` };
    const res = group === "env" ? "deployment recorded" : group === "ext" ? "downstream pipeline created" : group === "svc" ? "service ready" : "stored";
    if (group === "env") deployBeat = beats.length;
    beats.push({
      idBase: group === "env" ? "deploy" : group === "ext" ? "downstream" : group === "svc" ? "services" : "artifacts",
      kind: manual ? "problem" : "case",
      focus: [...users.map((g) => g.key), ...ts.map((t) => t.key)],
      ...(edge ? { exchange: { edge, request: { format: "text", ...req }, response: { format: "text", head: res } } } : {}),
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        const x = listIn(
          ts.map((t, k) => (t.key === "store:artifacts" ? s.artifacts : t.key === "store:cache" ? s.cache : t.key.startsWith("ext:child") ? s.child : tNames[k]!)),
          l,
        );
        const jobs = listIn(userJobs.map(jobName), l);
        if (group === "env") return { title: fill(s.deployTitle, { x }), short: s.deployShort, body: fill(s.deployBody, { jobs, x, manual: manual ? s.deployManual : "" }), ...(manual ? { watch: s.manualWatch } : {}) };
        if (group === "ext") return { title: fill(s.extTitle, { x }), short: s.extShort, body: fill(s.extBody, { jobs, x }) };
        if (group === "svc") return { title: fill(s.svcTitle, { x }), short: s.svcShort, body: fill(s.svcBody, { jobs, x }) };
        return { title: s.storeTitle, short: s.storeShort, body: fill(s.storeBody, { jobs }) };
      }),
    });
  };
  for (const g of ["svc", "store", "env", "ext"] as const) targetBeat(g);

  // padding up to the course minimum, then failure and retry
  const shownJobs = groups.filter((g) => g.key.startsWith("job:")).map((g) => g.jobs[0]!);
  const work = () => beats.length + 2;
  if (work() < IMPORT_MIN_STEPS - 1 && trigEdge) {
    beats.push({
      idBase: "overview",
      kind: "case",
      focus: groups.map((g) => g.key),
      exchange: {
        edge: trigEdge,
        request: {
          format: "text",
          head: "pipeline graph",
          body: Array.from({ length: levels }, (_, l) => `wave ${l + 1}: ${jobsAt[l]!.map(jobName).slice(0, 8).join(", ")}`).join("\n"),
        },
      },
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        return { title: s.overTitle, short: s.overShort, body: fill(s.overBody, { n: m.jobs.length, waves: levels }) };
      }),
    });
  }
  const logJob = shownJobs.find((j) => j.script.length) ?? shownJobs[0];
  if (work() < IMPORT_MIN_STEPS - 1 && logJob) {
    const edge = intoGroup(`job:${logJob.key}`);
    beats.push({
      idBase: "job-log",
      kind: "case",
      focus: [`job:${logJob.key}`],
      ...(edge
        ? {
            exchange: {
              edge,
              request: { format: "text", head: `job log: ${logJob.name}`, body: logJob.script.slice(0, 10).map((x) => `$ ${clip(oneLine(x), 160)}`).join("\n") },
              response: { format: "text", head: "exit code 0" },
            },
          }
        : {}),
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        return { title: fill(s.logTitle, { job: logJob.name }), short: s.logShort, body: s.logBody };
      }),
    });
  }
  const failJob = shownJobs.find((j) => waves.level.get(j.key) === 1 && !j.allowFailure) ?? shownJobs.find((j) => !j.allowFailure) ?? shownJobs[0];
  if (failJob) {
    const g = `job:${failJob.key}`;
    const edge = intoGroup(g);
    const after = m.jobs.filter((j) => (waves.deps.get(j.key) ?? []).includes(failJob.key)).map(jobName);
    const outEdges = Object.fromEntries(edges.filter((e) => e.from === g).map((e) => [e.key, { flow: "fail" as const, cut: true }]));
    beats.push({
      idBase: "failure",
      kind: "problem",
      focus: [g],
      states: { [g]: "down" },
      edgeChange: outEdges,
      ...(edge
        ? {
            exchange: {
              edge,
              request: { format: "text", head: `job: ${failJob.name}`, body: jobBody(failJob) },
              response: { format: "text", head: "job failed: exit code 1" },
            },
          }
        : {}),
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        const body = (after.length ? fill(s.failNext, { job: failJob.name, next: listIn(after, l) }) : fill(s.failAlone, { job: failJob.name })) + s.failTail;
        return { title: fill(s.failTitle, { job: failJob.name }), short: s.failShort, body, watch: fill(s.failWatch, { job: failJob.name }) };
      }),
    });
    beats.push({
      idBase: "retry",
      kind: "fix",
      focus: [g],
      ...(edge
        ? {
            exchange: {
              edge,
              request: { format: "text", head: `retry job: ${failJob.name}` },
              response: { format: "text", head: "job succeeded" },
            },
          }
        : {}),
      text: perLangOf((l) => {
        const s = T[l] as (typeof T)["en"];
        return { title: s.retryTitle, short: s.retryShort, body: fill(s.retryBody, { job: failJob.name }) };
      }),
    });
  }
  if (beats.length > IMPORT_MAX_STEPS - 1) warn("maxSteps", String(beats.length - (IMPORT_MAX_STEPS - 1)));
  const cases = pipelineCases({ m, waves, groups, groupOf, edges, keptTargets, waveBeatAt, deployBeat });
  if (cases.length > IMPORT_MAX_CASES) warn("maxSteps", String(cases.length - IMPORT_MAX_CASES));

  const resultNames = (l: AuthorLang) => workTargets.map((t) => t.label[l]);
  const draft = buildDraft({
    slugBase: m.name || (m.kind === "gitlab-ci" ? "gitlab-ci-pipeline" : "github-actions-workflow"),
    fallbackSlug: "ci-pipeline",
    title: perLangOf((l) => (m.name ? fill(T[l].title, { name: m.name }) : m.kind === "gitlab-ci" ? T[l].gitlabName : T[l].githubName)),
    summary: perLangOf((l) => fill(T[l].summary, { n: m.jobs.length, waves: levelCount, trigger: triggerText })),
    learn: perLangOf((l) => [...T[l].learn]),
    nodes,
    edges,
    beats,
    cases,
    recap: perLangOf((l) => {
      const s = T[l] as (typeof T)["en"];
      const targetsLine = workTargets.length ? fill(s.recapTargets, { x: listIn(resultNames(l), l, 6) }) : "";
      return { title: s.recapTitle, short: s.recapTitle, body: fill(s.recapBody, { trigger: triggerText, waves: levelCount, targets: targetsLine }) };
    }),
  });
  warn("translate");
  return { draft, warnings, kind: m.kind };
}

interface CaseCtx {
  m: PipelineModel;
  waves: Waves;
  groups: Group[];
  groupOf: Map<string, string>;
  edges: KitEdge[];
  keptTargets: { key: string; group: string; name: string }[];
  waveBeatAt: Map<number, number>;
  deployBeat: number;
}

/** per kind of case: enough to show the pattern without crowding the case list */
const CASES_PER_KIND = 2;

/**
 * Alternative paths read from the YAML, each branching after the base beat where it starts:
 * on-failure jobs, allowed failures, automatic retries, manual gates (GitLab) and environment
 * approvals (GitHub), a rollback when something is deployed, tag-only and branch-only jobs.
 */
function pipelineCases(c: CaseCtx): KitCase[] {
  const { m, waves } = c;
  const out: KitCase[] = [];
  const gl = m.kind === "gitlab-ci";
  const groupOf = (j: PipelineJob) => c.groupOf.get(j.key);
  const beatOf = (j: PipelineJob) => c.waveBeatAt.get(waves.level.get(j.key) ?? -1);
  const into = (g: string) => c.edges.find((e) => e.to === g)?.key;
  const outOf = (g: string) => c.edges.filter((e) => e.from === g);
  const waiters = (j: PipelineJob) => m.jobs.filter((x) => (waves.deps.get(x.key) ?? []).includes(j.key));
  const shown = m.jobs.filter((j) => groupOf(j) !== undefined && beatOf(j) !== undefined);
  const say = (f: (s: (typeof T)["en"], l: AuthorLang) => { title: string; short: string; body: string; watch?: string }) =>
    perLangOf((l) => f(T[l] as (typeof T)["en"], l));
  const ex = (edge: string | undefined, head: string, res: string, body?: string) =>
    edge ? { exchange: { edge, request: { format: "text" as const, head, ...(body ? { body } : {}) }, response: { format: "text" as const, head: res } } } : {};

  // a job that runs only after a failure: an earlier job fails, then this one starts
  for (const j of shown.filter((x) => x.onFailure).slice(0, CASES_PER_KIND)) {
    const g = groupOf(j)!;
    const dep = (waves.deps.get(j.key) ?? []).map((k) => m.jobs.find((x) => x.key === k)).find((x): x is PipelineJob => !!x && groupOf(x) !== undefined && beatOf(x) !== undefined);
    if (!dep) continue;
    const dg = groupOf(dep)!;
    const how = gl ? "when: on_failure" : "if: failure()";
    out.push({
      idBase: `on-failure-${j.key}`,
      from: beatOf(dep)!,
      label: perLangOf((l) => fill(T[l].caseOnFailure, { job: j.name })),
      beats: [
        {
          idBase: `${dep.key}-fails`,
          kind: "problem",
          focus: [dg],
          states: { [dg]: "down" },
          edgeChange: Object.fromEntries(outOf(dg).map((e) => [e.key, e.to === g ? { flow: "fail" as const } : { flow: "fail" as const, cut: true }])),
          ...ex(into(dg), `job: ${dep.name}`, "job failed: exit code 1", jobBody(dep)),
          text: say((s) => ({ title: fill(s.onFailFailTitle, { dep: dep.name }), short: s.failShort, body: fill(s.onFailFailBody, { dep: dep.name, job: j.name, how }) })),
        },
        {
          idBase: `${j.key}-runs`,
          kind: "fix",
          focus: [g],
          states: { [dg]: "down" },
          ...ex(c.edges.find((e) => e.from === dg && e.to === g)?.key ?? into(g), `job: ${j.name}`, "job succeeded", jobBody(j)),
          text: say((s) => ({ title: fill(s.onFailRunTitle, { job: j.name }), short: clip(j.name, 24), body: fill(s.onFailRunBody, { job: j.name }) })),
        },
      ],
    });
  }

  // allowed to fail: the job goes red, the pipeline does not
  for (const j of shown.filter((x) => x.allowFailure && !x.onFailure).slice(0, CASES_PER_KIND)) {
    const g = groupOf(j)!;
    const how = gl ? "allow_failure: true" : "continue-on-error: true";
    const next = waiters(j).filter((x) => groupOf(x));
    out.push({
      idBase: `allowed-failure-${j.key}`,
      from: beatOf(j)!,
      label: perLangOf((l) => fill(T[l].caseAllowFail, { job: j.name })),
      beats: [
        {
          idBase: `${j.key}-fails`,
          kind: "problem",
          focus: [g],
          states: { [g]: "down" },
          ...ex(into(g), `job: ${j.name}`, "job failed: allowed to fail", jobBody(j)),
          text: say((s) => ({ title: fill(s.allowFailTitle, { job: j.name }), short: s.failShort, body: fill(s.allowFailBody, { job: j.name, how }) })),
        },
        {
          idBase: `${j.key}-goes-on`,
          kind: "case",
          focus: next.length ? [...new Set(next.map((x) => groupOf(x)!))] : [g],
          states: { [g]: "down" },
          ...ex(next.length ? into(groupOf(next[0]!)!) : into(g), next.length ? `job: ${next[0]!.name}` : "pipeline", next.length ? "job succeeded" : "passed with warnings"),
          text: say((s, l) => ({
            title: s.allowGoTitle,
            short: s.allowGoTitle,
            body: next.length ? fill(s.allowGoNext, { next: listIn(next.map((x) => x.name), l), job: j.name }) : s.allowGoAlone,
          })),
        },
      ],
    });
  }

  // automatic retry
  for (const j of shown.filter((x) => x.retry > 0).slice(0, CASES_PER_KIND)) {
    const g = groupOf(j)!;
    const e = into(g);
    out.push({
      idBase: `retry-${j.key}`,
      from: beatOf(j)!,
      label: perLangOf((l) => fill(T[l].caseRetry, { job: j.name })),
      beats: [
        {
          idBase: `${j.key}-attempt-1`,
          kind: "problem",
          focus: [g],
          states: { [g]: "down" },
          ...(e ? { edgeChange: { [e]: { flow: "fail" as const } } } : {}),
          ...ex(e, `job: ${j.name}`, "job failed: runner system failure", jobBody(j)),
          text: say((s) => ({ title: fill(s.retryFailTitle, { job: j.name }), short: s.failShort, body: fill(s.retryFailBody, { job: j.name, n: j.retry }) })),
        },
        {
          idBase: `${j.key}-attempt-2`,
          kind: "fix",
          focus: [g],
          ...(e ? { edgeChange: { [e]: { flow: "retry" as const } } } : {}),
          ...ex(e, `retry ${2}/${j.retry + 1}: ${j.name}`, "job succeeded"),
          text: say((s) => ({ title: s.retryOkTitle, short: s.retryShort, body: fill(s.retryOkBody, { job: j.name }) })),
        },
      ],
    });
  }

  // a gate: GitLab `when: manual`; GitHub deployments to a protected-looking environment
  const gate = (j: PipelineJob) => j.manual || (!gl && !!j.environment && isProtectedName(j.environment));
  for (const j of shown.filter(gate).slice(0, CASES_PER_KIND)) {
    const g = groupOf(j)!;
    const e = into(g);
    const next = waiters(j).filter((x) => groupOf(x));
    const blocked = outOf(g);
    if (j.manual) {
      out.push({
        idBase: `manual-${j.key}`,
        from: beatOf(j)!,
        label: perLangOf((l) => fill(T[l].caseManual, { job: j.name })),
        beats: [
          {
            idBase: `${j.key}-not-run`,
            kind: "problem",
            focus: [g],
            states: { [g]: "slow" },
            edgeChange: Object.fromEntries(blocked.map((x) => [x.key, { cut: true }])),
            ...ex(e, `job: ${j.name}`, "job waiting: manual", jobBody(j)),
            text: say((s, l) => ({
              title: fill(s.manualIdleTitle, { job: j.name }),
              short: clip(j.name, 24),
              body: next.length ? fill(s.manualIdleNext, { job: j.name, next: listIn(next.map((x) => x.name), l) }) : fill(s.manualIdleAlone, { job: j.name }),
              watch: s.manualWatch,
            })),
          },
          {
            idBase: `${j.key}-run-later`,
            kind: "fix",
            focus: [g],
            ...ex(e, `play job: ${j.name}`, "job succeeded"),
            text: say((s) => ({ title: s.manualLateTitle, short: "Run", body: fill(s.manualLateBody, { job: j.name }) })),
          },
        ],
      });
    } else {
      const env = j.environment!;
      out.push({
        idBase: `approval-${j.key}`,
        from: beatOf(j)!,
        label: perLangOf((l) => fill(T[l].caseApproval, { job: j.name })),
        beats: [
          {
            idBase: `${j.key}-waits-review`,
            kind: "problem",
            focus: [g],
            states: { [g]: "slow" },
            edgeChange: Object.fromEntries(blocked.map((x) => [x.key, { cut: true }])),
            ...ex(e, `job: ${j.name}`, "waiting for review", `environment: ${env}`),
            text: say((s) => ({ title: fill(s.approvalWaitTitle, { job: j.name }), short: clip(env, 24), body: fill(s.approvalWaitBody, { job: j.name, env }) })),
          },
          {
            idBase: `${j.key}-approved`,
            kind: "fix",
            focus: [g],
            ...ex(e, `review: approved`, "job started", `environment: ${env}`),
            text: say((s) => ({ title: s.approvalOkTitle, short: s.deployShort, body: fill(s.approvalOkBody, { job: j.name, env }) })),
          },
        ],
      });
    }
  }

  // rollback, after the deploy beat: the last environment is usually the one that matters most
  const envTargets = c.keptTargets.filter((t) => t.group === "env");
  const envT = envTargets[envTargets.length - 1];
  if (envT && c.deployBeat >= 0) {
    const env = envT.name;
    const deployer = [...m.jobs].reverse().find((j) => j.environment === env && !j.stopsEnv && groupOf(j));
    const rb = m.jobs.find((j) => groupOf(j) && (j.stopsEnv === env || isRollbackName(j.name)));
    const dEdge = deployer ? c.edges.find((e) => e.from === groupOf(deployer) && e.to === envT.key)?.key : undefined;
    const rEdge = (rb && c.edges.find((e) => e.from === groupOf(rb) && e.to === envT.key)?.key) ?? dEdge;
    out.push({
      idBase: `rollback-${env}`,
      from: c.deployBeat,
      label: perLangOf((l) => fill(T[l].caseRollback, { env })),
      beats: [
        {
          idBase: `bad-release-${env}`,
          kind: "problem",
          focus: [envT.key],
          states: { [envT.key]: "down" },
          ...(dEdge ? { edgeChange: { [dEdge]: { flow: "fail" as const } } } : {}),
          ...ex(dEdge, `deploy: ${env}`, "health check failed: 5xx", deployer ? `environment: ${env}\njob: ${deployer.name}` : `environment: ${env}`),
          text: say((s) => ({ title: s.badTitle, short: s.failShort, body: fill(s.badBody, { env }) })),
        },
        {
          idBase: `rollback-${env}`,
          kind: "fix",
          focus: [...(rb ? [groupOf(rb)!] : deployer ? [groupOf(deployer)!] : []), envT.key],
          ...(rEdge ? { edgeChange: { [rEdge]: { flow: "retry" as const } } } : {}),
          ...ex(rEdge, `rollback: ${env}`, "deployment recorded", `environment: ${env}\nversion: previous`),
          text: say((s) => ({ title: s.rollTitle, short: s.rollTitle, body: rb ? fill(s.rollJob, { rb: rb.name, env }) : fill(gl ? s.rollGitlab : s.rollGithub, { env }) })),
        },
      ],
    });
  }

  // jobs that only some refs run: the pipeline for a tag, and a smaller one on another branch
  const restricted = shown.filter((j) => j.only.length || j.rules || j.condition);
  const tagJobs = restricted.filter((j) => j.tagOnly);
  const branchJobs = restricted.filter((j) => !j.tagOnly && !j.onFailure);
  const start = (focus: PipelineJob[], cut: boolean) => ({
    focus: [...new Set(focus.map((j) => groupOf(j)!))],
    ...(cut ? { edgeChange: Object.fromEntries(focus.flatMap((j) => c.edges.filter((e) => e.to === groupOf(j)).map((e) => [e.key, { cut: true }]))) } : {}),
  });
  const trig = c.edges.find((e) => e.from === "trigger")?.key;
  if (tagJobs.length && tagJobs.length < shown.length) {
    out.push({
      idBase: "tag-pipeline",
      from: 0,
      label: perLangOf((l) => T[l].caseTag),
      beats: [
        {
          idBase: "tag-pushed",
          kind: "case",
          ...start(tagJobs, false),
          ...ex(trig, gl ? "event: tag push" : "event: push (tag)", "pipeline created", gl ? "CI_COMMIT_TAG: v1.0.0" : "github.ref: refs/tags/v1.0.0"),
          text: say((s, l) => ({ title: s.tagTitle, short: s.tagTitle, body: fill(s.tagBody, { jobs: listIn(tagJobs.map((j) => j.name), l) }) })),
        },
      ],
    });
  }
  if (branchJobs.length && branchJobs.length < shown.length) {
    out.push({
      idBase: "other-branch",
      from: 0,
      label: perLangOf((l) => T[l].caseBranch),
      beats: [
        {
          idBase: "feature-branch",
          kind: "case",
          ...start(branchJobs, true),
          ...ex(trig, "event: push", "pipeline created", gl ? "CI_COMMIT_BRANCH: feature/login" : "github.ref: refs/heads/feature/login"),
          text: say((s, l) => ({ title: s.branchTitle, short: s.branchTitle, body: fill(s.branchBody, { jobs: listIn(branchJobs.map((j) => j.name), l) }) })),
        },
      ],
    });
  }
  return out;
}

/** Whole lowercase words of a name, Latin letters and digits only. Linear, no regex. */
function words(name: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of name.toLowerCase()) {
    const c = ch.charCodeAt(0);
    if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) cur += ch;
    else if (cur) out.push(cur), (cur = "");
  }
  if (cur) out.push(cur);
  return out;
}
const isProtectedName = (env: string) => words(env).some((w) => w === "production" || w === "prod" || w === "live");
const isRollbackName = (name: string) => words(name).some((w) => w === "rollback" || w === "revert" || w === "undeploy");

function usesTarget(j: PipelineJob, key: string): boolean {
  if (key.startsWith("env:")) return j.environment === key.slice(4);
  if (key.startsWith("svc:")) return j.services.includes(key.slice(4));
  if (key.startsWith("ext:")) return (j.trigger ?? j.reusable) === key.slice(4);
  if (key === "store:artifacts") return j.artifacts;
  if (key === "store:cache") return j.cache;
  return false;
}

/** The job as it would read in the YAML: stage, image, the first script lines. */
function jobBody(j: PipelineJob): string {
  const lines: string[] = [];
  if (j.stage) lines.push(`stage: ${j.stage}`);
  if (j.image) lines.push(j.image.startsWith("runs-on:") ? j.image : `image: ${j.image}`);
  if (j.needs?.length) lines.push(`needs: [${j.needs.slice(0, 6).join(", ")}]`);
  if (j.environment) lines.push(`environment: ${j.environment}`);
  if (j.manual) lines.push("when: manual");
  if (j.script.length) {
    lines.push(j.stage ? "script:" : "steps:");
    for (const s of j.script.slice(0, 8)) lines.push(`  - ${clip(oneLine(s), 160)}`);
  }
  return lines.join("\n");
}

/** Parse and convert in one go: the shape the dialog needs. */
export async function importPipeline(text: string, lang: AuthorLang): Promise<PipelineResult> {
  void lang; // generated texts are written in all three languages; names stay as written
  const p = await parsePipeline(text);
  return p.ok ? { ok: true, result: pipelineToDraft(p.model) } : p;
}
