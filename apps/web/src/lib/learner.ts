import { type Lang, glossary, lessons } from "@mufassall/content";
import { type StepText, resolve } from "@mufassall/scene-schema";
import { player } from "../i18n/ui";

/**
 * Build-time helpers for the learner pages: cheat sheets, compare, learning paths.
 * Lessons are read from the registry on every build, so new lessons show up without edits here.
 */

/** Locale-stable number format, same rules as formatNumber in scene-engine/src/ui.ts (no Intl). */
export function formatNumber(value: number, lang: string, decimals = 0): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [int = "0", dec] = rounded.toFixed(decimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const mark = lang === "en" ? "." : ",";
  return (value < 0 && rounded !== 0 ? "−" : "") + grouped + (dec ? mark + dec : "");
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** `code` and **bold** to HTML; lesson text is authored, and everything else is escaped. */
export function rich(text: string): string {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return `<strong>${escape(part.slice(2, -2))}</strong>`;
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return `<code>${escape(part.slice(1, -1))}</code>`;
      return escape(part);
    })
    .join("");
}

export const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

/** First sentence of a step body, for one-line summaries. */
export function firstSentence(body: string): string {
  const first = paragraphs(body)[0] ?? "";
  const m = first.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1]! : first).trim();
}

export interface SheetMetric {
  label: string;
  before: string;
  after: string;
  better: "up" | "down";
  /** moved in the better direction, moved the wrong way, or stayed */
  trend: "better" | "worse" | "same";
}

export interface SheetStep {
  n: number;
  kind: string;
  title: string;
  line: string;
}

export interface Sheet {
  slug: string;
  title: string;
  summary: string;
  learn: string[];
  minutes: number;
  level: string;
  recap: string[];
  metrics: SheetMetric[];
  steps: SheetStep[];
  terms: { id: string; name: string; short: string }[];
}

/** Everything a one-page summary of a lesson needs, in one language. */
export function sheetOf(slug: string, lang: Lang): Sheet {
  const entry = lessons[slug]!;
  const text = entry.text[lang];
  const ui = player[lang];
  const stepTexts = text.steps as Record<string, StepText>;
  const metricLabels = text.metrics as Record<string, string>;
  const states = resolve(entry.lesson);

  const metrics: SheetMetric[] = entry.lesson.metrics.flatMap((m) => {
    const seen = states.map((st) => st.metrics[m.id]).filter((v): v is number => typeof v === "number");
    if (!seen.length) return [];
    const first = seen[0]!;
    const last = seen[seen.length - 1]!;
    const unit = ui.units?.[m.unit] ?? m.unit;
    const show = (v: number) => {
      const n = formatNumber(v, lang, Number.isInteger(v) ? 0 : 1);
      return unit ? (/^[%/]/.test(unit) ? `${n}${unit}` : `${n} ${unit}`) : n;
    };
    const trend = first === last ? "same" : (last > first) === (m.better === "up") ? "better" : "worse";
    return [{ label: metricLabels[m.id] ?? m.id, before: show(first), after: show(last), better: m.better, trend }];
  });

  const steps: SheetStep[] = entry.lesson.steps.map((st, i) => {
    const t = stepTexts[st.id];
    return { n: i + 1, kind: ui.kinds[st.kind], title: t?.title ?? st.id, line: t ? firstSentence(t.body) : "" };
  });

  const recap = entry.lesson.steps
    .filter((st) => st.kind === "recap")
    .flatMap((st) => paragraphs(stepTexts[st.id]?.body ?? ""));

  const terms = glossary
    .filter((g) => g.lesson === slug)
    .map((g) => ({ id: g.id, name: g.term[lang], short: g.short[lang] }));

  return {
    slug,
    title: text.title,
    summary: text.summary,
    learn: text.learn,
    minutes: entry.lesson.minutes,
    level: ui.levels[entry.lesson.level],
    recap,
    metrics,
    steps,
    terms,
  };
}

/** Curated learning paths; slugs not (yet) in the course are dropped at build time. */
const PATHS: { id: string; slugs: string[] }[] = [
  {
    id: "interview",
    slugs: [
      "napkin-math",
      "latency-throughput",
      "vertical-horizontal",
      "load-balancing",
      "caching",
      "cdn",
      "sql-nosql",
      "indexes",
      "replication",
      "sharding",
      "consistent-hashing",
      "cap",
      "queues",
      "rate-limiting",
      "unique-ids",
      "design-url-shortener",
      "design-news-feed",
      "design-chat",
    ],
  },
  {
    id: "architect",
    slugs: [
      "request-lifecycle",
      "hld-lld",
      "apis",
      "stateless",
      "microservices",
      "service-discovery",
      "pubsub",
      "sagas",
      "batch-stream",
      "authentication",
      "authorization",
      "testing",
      "cicd",
    ],
  },
  {
    id: "reliability",
    slugs: ["redundancy", "replication", "timeouts-retries", "rate-limiting", "queues", "callbacks", "consensus", "transactions", "observability"],
  },
  {
    id: "data",
    slugs: ["sql-nosql", "indexes", "storage-engines", "replication", "sharding", "consistent-hashing", "unique-ids", "cap", "consensus", "transactions", "files", "batch-stream"],
  },
];

export const paths = PATHS.map((p) => ({ ...p, slugs: p.slugs.filter((s) => s in lessons) })).filter((p) => p.slugs.length > 0);

/** Lesson pairs that are often confused or chosen between. */
const PAIRS: [string, string][] = [
  ["caching", "cdn"],
  ["queues", "pubsub"],
  ["replication", "sharding"],
  ["vertical-horizontal", "load-balancing"],
  ["sagas", "transactions"],
  ["batch-stream", "queues"],
  ["sql-nosql", "indexes"],
  ["authentication", "authorization"],
];

export const pairs = PAIRS.filter(([a, b]) => a in lessons && b in lessons);
