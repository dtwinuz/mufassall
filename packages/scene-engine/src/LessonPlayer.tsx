import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Change,
  type LessonInput,
  type LessonText,
  type StepText,
  diff,
  emptyState,
  resolve,
} from "@mufassall/scene-schema";
import { lessonBounds } from "./iso";
import { tween, useReducedMotion } from "./motion";
import { Scene } from "./Scene";
import { Check } from "./Check";
import { downloadPng } from "./export";
import { encodeDoc, fromScene } from "./lab";
import { inline, paragraphs, plain } from "./text";
import { type UiStrings, fill, formatNumber } from "./ui";
import { Wire } from "./Wire";

const PROGRESS_KEY = "mufassall:v1:progress";

function Num({ value, format }: { value: number | undefined; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (value === undefined || from.current === undefined) {
      from.current = value;
      setShown(value);
      return;
    }
    const stop = tween(from.current, value, 600, setShown);
    from.current = value;
    return stop;
  }, [value]);
  return <>{shown === undefined ? "—" : format(shown)}</>;
}

export interface LessonPlayerProps<T extends LessonInput> {
  lesson: T;
  text: LessonText<T>;
  ui: UiStrings;
  lang: string;
  crumbs?: string;
  next?: { title: string; href: string };
  /** Lab page URL; when set, the current step can be opened there for editing */
  labHref?: string;
}

export function LessonPlayer<T extends LessonInput>({ lesson, text, ui, lang, crumbs, next, labHref }: LessonPlayerProps<T>) {
  const states = useMemo(() => resolve(lesson), [lesson]);
  const box = useMemo(() => lessonBounds(states), [states]);
  const total = states.length;
  const steps = text.steps as Record<string, StepText>;
  const labels = text.nodes as Record<string, string>;
  const metricLabels = text.metrics as Record<string, string>;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(total - 1, i));
    setIndex(clamped);
    setRunKey((k) => k + 1);
  };

  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(n) && n >= 1 && n <= total) setIndex(n - 1);
  }, [total]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(index + 1));
    window.history.replaceState(window.history.state, "", url);
    try {
      const p = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, number>;
      if ((p[lesson.slug] ?? -1) < index) {
        p[lesson.slug] = index;
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
      }
    } catch {
      /* storage can be blocked; progress is a convenience */
    }
  }, [index, lesson.slug]);

  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") go(indexRef.current + 1);
      else if (e.key === "ArrowLeft") go(indexRef.current - 1);
      else if (e.key === "r" || e.key === "R") setRunKey((k) => k + 1);
      else if (e.key === " " && !(t && t.tagName === "BUTTON")) setPaused((p) => !p);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const step = lesson.steps[index]!;
  const state = states[index]!;
  const prev = index > 0 ? states[index - 1]! : emptyState();
  const changes = index > 0 ? diff(prev, state) : [];
  const t = steps[step.id]!;
  const nextStep = index < total - 1 ? steps[lesson.steps[index + 1]!.id] : undefined;
  const exchange = step.exchange;
  const wireEdge = exchange ? state.edges[exchange.edge] : undefined;

  const metricOf = (id: string) => lesson.metrics.find((m) => m.id === id);
  /** `target` decides the decimals, so a tween towards an integer never shows fractions. */
  const fmtMetric = (id: string, v: number, target = v) => {
    const unit = metricOf(id)?.unit ?? "";
    const shownUnit = ui.units?.[unit] ?? unit;
    const n = formatNumber(v, lang, Number.isInteger(target) ? 0 : 1);
    return shownUnit ? `${n} ${shownUnit}` : n;
  };

  const describe = (c: Change): string => {
    const n = (id: string) => labels[id] ?? id;
    switch (c.type) {
      case "node":
        return fill(c.op === "+" ? ui.change.nodeAdded : ui.change.nodeRemoved, { node: n(c.id) });
      case "node-state":
        return fill(ui.change.nodeState, { node: n(c.id), from: ui.states[c.from], to: ui.states[c.to] });
      case "edge":
        return fill(c.op === "+" ? ui.change.edgeAdded : ui.change.edgeRemoved, { from: n(c.from), to: n(c.to) });
      case "edge-flow":
        return fill(ui.change.edgeFlow, { from: n(c.from), to: n(c.to), was: ui.flows[c.was], now: ui.flows[c.now] });
      case "edge-cut":
        return fill(c.op === "-" ? ui.change.edgeLost : ui.change.edgeRestored, { from: n(c.from), to: n(c.to) });
      case "metric":
        return fill(ui.change.metric, {
          metric: metricLabels[c.id] ?? c.id,
          was: c.was === undefined ? "—" : fmtMetric(c.id, c.was),
          now: fmtMetric(c.id, c.now),
        });
    }
  };

  return (
    <div className="mf-player">
        <header className="mf-head">
          <div>
            {crumbs && <p className="mf-crumbs">{crumbs}</p>}
            <h1 className="mf-title">{text.title}</h1>
            <p className="mf-summary">{text.summary}</p>
          </div>
          <ul className="mf-chips" aria-label="meta">
            <li>{fill(ui.minutes, { n: lesson.minutes })}</li>
            <li>{ui.levels[lesson.level]}</li>
            <li>{fill(ui.steps, { n: total })}</li>
          </ul>
        </header>

        <div className="mf-body">
          <div className="mf-main">
          <section ref={stageRef} className="mf-stage" aria-label={fill(ui.sceneLabel, { title: text.title })}>
            <div className="mf-stage__top">
              <dl className="mf-metrics">
                {lesson.metrics.map((m) => {
                  const now = state.metrics[m.id];
                  const was = prev.metrics[m.id];
                  const moved = index > 0 && was !== undefined && now !== undefined && now !== was;
                  const good = moved && (m.better === "up" ? now! > was! : now! < was!);
                  return (
                    <div key={m.id} className={`mf-metric${moved ? (good ? " mf-metric--good" : " mf-metric--bad") : ""}`}>
                      <dt>{metricLabels[m.id]}</dt>
                      <dd>
                        <Num value={now} format={(v) => fmtMetric(m.id, v, now ?? v)} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <div className="mf-controls">
                <button type="button" className="mf-btn" onClick={() => setRunKey((k) => k + 1)}>
                  {ui.replay}
                </button>
                <button type="button" className="mf-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
                  {paused ? ui.play : ui.pause}
                </button>
                {labHref && (
                  <a className="mf-btn" href={`${labHref}#d=${encodeDoc(fromScene(state, labels))}`}>
                    {ui.openInLab}
                  </a>
                )}
                <button
                  type="button"
                  className="mf-btn"
                  onClick={() => {
                    const svg = stageRef.current?.querySelector<SVGSVGElement>("svg.mf-scene");
                    if (svg) void downloadPng(svg, `${lesson.slug}-${index + 1}`).catch(() => undefined);
                  }}
                >
                  {ui.savePicture}
                </button>
              </div>
            </div>

            <Scene
              state={state}
              box={box}
              labels={labels}
              title={plain(t.title)}
              paused={paused}
              reduced={reduced}
              runKey={runKey}
              active={exchange?.edge}
            />

            <div className="mf-stage__foot">
              <ul className="mf-legend">
                {(["request", "ack", "retry", "dup"] as const).map((f) => (
                  <li key={f} className={`mf-legend__item mf-legend__item--${f}`}>
                    {ui.legend[f]}
                  </li>
                ))}
                <li className="mf-legend__item mf-legend__item--lost">{ui.legend.lost}</li>
              </ul>
              <p className="mf-note">{ui.modelNote}</p>
            </div>
          </section>

          {exchange && wireEdge && (
            <Wire
              key={step.id}
              exchange={exchange}
              notes={t.fields ?? {}}
              from={labels[wireEdge.from] ?? wireEdge.from}
              to={labels[wireEdge.to] ?? wireEdge.to}
              ui={ui.wire}
            />
          )}
          </div>

          <aside className="mf-panel" aria-live="polite">
            <div className="mf-panel__card">
              <div className="mf-panel__meta">
                <span>{fill(ui.step, { n: index + 1, total })}</span>
                <span className={`mf-kind mf-kind--${step.kind}`}>{ui.kinds[step.kind]}</span>
              </div>
              <h2 className="mf-panel__title">{inline(t.title)}</h2>
              <div className="mf-panel__body">{paragraphs(t.body)}</div>
              {t.check && <Check key={`${lesson.slug}/${step.id}`} id={`${lesson.slug}/${step.id}`} check={t.check} ui={ui.check} />}
              {t.watch && (
                <div className="mf-watch">
                  <h3>{ui.watch}</h3>
                  <p>{inline(t.watch)}</p>
                </div>
              )}
              <div className="mf-changes">
                <h3>{ui.changed}</h3>
                {index === 0 ? (
                  <p className="mf-changes__none">{ui.firstStep}</p>
                ) : changes.length === 0 ? (
                  <p className="mf-changes__none">{ui.noChange}</p>
                ) : (
                  <ul>
                    {changes.map((c, i) => (
                      <li key={i} className={`mf-change mf-change--${c.op === "+" ? "add" : c.op === "-" ? "del" : "mod"}`}>
                        <span aria-hidden="true">{c.op === "~" ? "~" : c.op === "+" ? "+" : "−"}</span>
                        {describe(c)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mf-nav">
                <button type="button" className="mf-btn" onClick={() => go(index - 1)} disabled={index === 0}>
                  ← {ui.back}
                </button>
                {nextStep ? (
                  <button type="button" className="mf-btn mf-btn--primary" onClick={() => go(index + 1)}>
                    {fill(ui.next, { title: nextStep.short })} →
                  </button>
                ) : next ? (
                  <a className="mf-btn mf-btn--primary" href={next.href}>
                    {fill(ui.next, { title: next.title })} →
                  </a>
                ) : (
                  <span className="mf-btn mf-btn--done">{ui.finish}</span>
                )}
              </div>
              <p className="mf-keys">{ui.keys}</p>
            </div>

            <div className="mf-panel__card mf-learn">
              <h3>{ui.youLearn}</h3>
              <ul>
                {text.learn.map((l, i) => (
                  <li key={i}>{inline(l)}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <nav className="mf-timeline" aria-label={ui.inLesson}>
          <ol>
            {lesson.steps.map((s, i) => (
              <li key={s.id} className={i < index ? "mf-tl--past" : i === index ? "mf-tl--now" : ""}>
                <button type="button" onClick={() => go(i)} aria-current={i === index ? "step" : undefined} title={plain(steps[s.id]?.title ?? "")}>
                  <span className="mf-tl__dot">{i + 1}</span>
                  <span className="mf-tl__label">{steps[s.id]?.short}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
  );
}
