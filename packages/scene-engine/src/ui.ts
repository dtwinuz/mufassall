import type { Flow, NodeStatus, StepKind } from "@mufassall/scene-schema";

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
  inLesson: string;
  youLearn: string;
  modelNote: string;
  sceneLabel: string; // "Sahna: {title}"
  /** localised metric units, keyed by the unit written in the lesson ("/s", "ms", "/min") */
  units?: Record<string, string>;
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
