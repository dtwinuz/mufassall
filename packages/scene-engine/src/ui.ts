import type { Flow, NodeKind, NodeStatus, StepKind } from "@mufassall/scene-schema";

/** Lab (diagram editor) strings, per language. */
export interface LabStrings {
  title: string;
  palette: string;
  paletteHint: string;
  kinds: Record<NodeKind, string>;
  select: string;
  connect: string;
  hintSelect: string;
  hintPlace: string; // "{kind}: click an empty cell"
  hintConnectFrom: string;
  hintConnectTo: string; // "{from} → click the target"
  empty: string;
  node: string;
  edge: string;
  nothing: string;
  label: string;
  kind: string;
  state: string;
  load: string;
  noLoad: string;
  flow: string;
  rate: string;
  cut: string;
  reverse: string;
  remove: string;
  undo: string;
  redo: string;
  clear: string;
  clearConfirm: string;
  example: string;
  share: string;
  copied: string;
  exportJson: string;
  importJson: string;
  code: string;
  codeTitle: string;
  copy: string;
  close: string;
  play: string;
  pause: string;
  keys: string;
  stageLabel: string;
  limit: string;
  /** a shared link replaced the reader's own diagram */
  linkLoaded: string;
  /** toast after the example, a challenge, a file or Clear replaced the reader's own diagram */
  backedUp: string;
  /** phone Lab: show the whole placement area instead of zooming to the diagram */
  wholeGrid: string;
  /** send to the moderated public gallery */
  galleryShare: string;
  galleryNote: string;
  galleryName: string;
  galleryAuthor: string;
  gallerySend: string;
  gallerySent: string;
  galleryFail: string;
  galleryBusy: string;
  galleryLong: string;
  restore: string;
  importBad: string;
  shareTitle: string;
  exportPng: string;
  exportSvg: string;
  simulate: string;
  traffic: string; // "Traffic: {n} req/s"
  spike: string;
  simOk: string;
  simErrors: string;
  simLatency: string;
  simHot: string; // "Overloaded: {list}"
  simNode: string; // "{rps} req/s · load {rho}% · ~{ms} ms"
  simNote: string;
  challenges: string;
  challengeFree: string;
  challengeDone: string;
  challengeRestart: string;
  ruleLoad: string; // "At {rps} req/s, errors under {err}%"
  ruleLoadMs: string; // "... and latency under {ms} ms"
  ruleCount: string; // "At least {n}: {kind}"
  /** a kind that must not be used, e.g. no CDN for a personal feed */
  ruleNone: string;
  /** heading of the interview scenarios in the challenge list */
  interviews: string;
  /** link from an interview brief to the napkin-math calculator */
  estimateLink: string;
  ruleVia: string; // "Every {from} → {to} path goes through {via}"
  ruleSurvive: string; // "Any one {kind} down: errors under {err}% at {rps} req/s"
  challengeText: Record<string, { title: string; brief: string }>;
}

/** Interface strings the host app supplies per language. `{x}` placeholders are filled by the player. */
export interface UiStrings {
  step: string; // "Qadam {n} / {total}"
  steps: string; // "{n} qadam"
  minutes: string; // "{n} daq"
  levels: Record<"beginner" | "intermediate" | "advanced", string>;
  kinds: Record<StepKind, string>;
  watch: string;
  changed: string;
  firstStep: string;
  noChange: string;
  back: string;
  next: string; // "Keyingi: {title}"
  finish: string;
  replay: string;
  pause: string;
  play: string;
  keys: string; // "← → qadam · R qayta · Space pauza"
  /** switch for the single-key shortcuts (WCAG 2.1.4) */
  keysOff: string;
  keysOn: string;
  inLesson: string;
  youLearn: string;
  modelNote: string;
  sceneLabel: string; // "Sahna: {title}"
  openInLab: string;
  /** download the current step as a PNG picture */
  savePicture: string;
  check: { title: string; right: string; wrong: string; keys: string };
  /** "break it" mode on the lesson scene: live traffic model, nodes can be switched off */
  tryIt: {
    open: string;
    close: string;
    traffic: string; // "Trafik: {n}/s"
    spike: string;
    ok: string;
    errors: string;
    latency: string;
    hot: string; // "Tiqilib qoldi: {list}"
    kill: string; // "O'chirib ko'ring:"
    note: string;
  };
  /** read the step aloud with the browser's own voice */
  listen: { start: string; stop: string; noVoice: string };
  /** "was this step clear?" (sent to /api/feedback, nothing personal) */
  feedback: {
    title: string;
    unclear: string;
    error: string;
    good: string;
    placeholder: string;
    send: string;
    thanks: string;
    fail: string;
  };
  /** localised metric units, keyed by the unit written in the lesson ("/s", "ms", "/min") */
  units?: Record<string, string>;
  /** the "real request" pane under the scene */
  wire: {
    title: string;
    request: string;
    response: string;
    masked: string;
  };
  states: Record<NodeStatus, string>;
  flows: Record<Flow, string>;
  legend: Record<Flow | "lost", string>;
  change: {
    nodeAdded: string;
    nodeRemoved: string;
    nodeState: string;
    edgeAdded: string;
    edgeRemoved: string;
    edgeFlow: string;
    edgeLost: string;
    edgeRestored: string;
    metric: string;
  };
}

/**
 * Locale-stable number format. Intl output differs between Node (build) and browsers, which
 * breaks hydration, so grouping and the decimal mark are fixed here.
 */
export function formatNumber(value: number, lang: string, decimals = 0): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [int = "0", dec] = rounded.toFixed(decimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const mark = lang === "en" ? "." : ",";
  return (value < 0 && rounded !== 0 ? "−" : "") + grouped + (dec ? mark + dec : "");
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
