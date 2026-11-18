import { useEffect, useMemo, useRef, useState } from "react";
import { KeyHint, useShortcuts } from "./keys";
import {
  type Change,
  type LessonInput,
  type LessonText,
  type StepText,
  diff,
  emptyState,
} from "@mufassall/scene-schema";
import { type Branch, branchChoices, branchOf, parseBranch, progressIndex, switchIndex } from "./branch";
import { lessonBounds } from "./iso";
import { tween, useReducedMotion } from "./motion";
import { Scene } from "./Scene";
import { Check } from "./Check";
import { downloadPng } from "./export";
import { encodeDoc, fromScene } from "./lab";
import { inline, paragraphs, plain } from "./text";
import { type UiStrings, fill, formatNumber, historyUi, scenarioUi } from "./ui";
import { historyOf } from "./history";
import { HistoryPanel } from "./HistoryPanel";
import { Wire } from "./Wire";
import { Feedback, TryPanel, useSpeech, useTry } from "./extras";

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
  const [sc, setSc] = useState<string | null>(null);
  const branch = useMemo(() => branchOf(lesson, sc), [lesson, sc]);
  const states = branch.states;
  // one frame for every path, so switching scenarios never rescales the scene
  const box = useMemo(
    () => lessonBounds([...branchOf(lesson, null).states, ...(lesson.scenarios ?? []).flatMap((s) => branchOf(lesson, s.id).states)]),
    [lesson],
  );
  const total = states.length;
  const baseSteps = text.steps as Record<string, StepText>;
  const scenarioTexts = (text.scenarios ?? {}) as Record<string, { label: string; steps: Record<string, StepText> } | undefined>;
  const textOf = (id: string): StepText | undefined => baseSteps[id] ?? (sc ? scenarioTexts[sc]?.steps[id] : undefined);
  const labels = text.nodes as Record<string, string>;
  const metricLabels = text.metrics as Record<string, string>;
  const sui = scenarioUi(ui, lang);

  const [rawIndex, setIndex] = useState(0);
  const index = Math.min(rawIndex, total - 1);
  const branchRef = useRef<Branch>(branch);
  branchRef.current = branch;
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);

  // "break it": the current step under live traffic, nodes can be switched off
  const [tryOn, setTryOn] = useState(false);
  const [tryRps, setTryRps] = useState(500);
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  const speech = useSpeech(lang);
  const [listening, setListening] = useState(false);

  // read through a ref: the keyboard handler is registered once and must see the current path
  const go = (i: number) => {
    const b = branchRef.current;
    const clamped = Math.max(0, Math.min(b.states.length - 1, i));
    // before the fork every path is the same: stepping back there returns to the base story
    if (b.sc !== null && clamped < b.from) setSc(null);
    setIndex(clamped);
    setRunKey((k) => k + 1);
  };

  const pick = (next: string | null) => {
    const target = branchOf(lesson, next);
    setIndex(switchIndex(lesson, branch, index, target));
    setSc(next);
    setRunKey((k) => k + 1);
  };

  useEffect(() => {
    const at = parseBranch(lesson, window.location.search);
    setSc(at.sc);
    setIndex(at.index);
  }, [lesson]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(index + 1));
    if (branch.sc) url.searchParams.set("sc", branch.sc);
    else url.searchParams.delete("sc");
    window.history.replaceState(window.history.state, "", url);
    const done = progressIndex(branch, index);
    if (done < 0) return;
    try {
      const p = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, number>;
      if ((p[lesson.slug] ?? -1) < done) {
        p[lesson.slug] = done;
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
      }
    } catch {
      /* storage can be blocked; progress is a convenience */
    }
  }, [index, branch, lesson.slug]);

  const [keysOn, toggleKeys] = useShortcuts();
  const keysRef = useRef(keysOn);
  keysRef.current = keysOn;
  // the step strip scrolls sideways on its own, never the page: the current step stays in view
  const timelineRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = timelineRef.current;
    const btn = nav?.querySelector<HTMLElement>("[aria-current=step]");
    if (!nav || !btn) return;
    const box = [nav, ...Array.from(nav.querySelectorAll<HTMLElement>("ol"))].find((el) => el.scrollWidth > el.clientWidth + 1);
    if (!box) return;
    const a = box.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const left = box.scrollLeft + (b.left - a.left) - box.clientWidth / 2 + b.width / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [index, sc]);
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") go(indexRef.current + 1);
      else if (e.key === "ArrowLeft") go(indexRef.current - 1);
      // arrows are not character keys (WCAG 2.1.4), so only R and Space follow the switch
      else if (!keysRef.current) return;
      else if (e.key === "r" || e.key === "R") setRunKey((k) => k + 1);
      else if (e.key === " " && !(t && t.tagName === "BUTTON")) setPaused((p) => !p);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steps = branch.steps;
  const step = steps[index]!;
  const state = states[index]!;
  const prev = index > 0 ? states[index - 1]! : emptyState();
  const changes = index > 0 ? diff(prev, state) : [];
  const t = textOf(step.id)!;
  const nextStep = index < total - 1 ? textOf(steps[index + 1]!.id) : undefined;
  const exchange = step.exchange;
  const choices = branchChoices(lesson, branch, index);
  const modes = new Set(Object.values(state.edges).flatMap((e) => (e.mode ? [e.mode] : [])));
  const tried = useTry(state, labels, tryOn, tryRps, down);
  // a new step starts with every node back on
  useEffect(() => setDown(new Set()), [index, sc]);
  // listening mode reads each step as the reader moves on
  const spoken = `${plain(t.title)}. ${plain(t.body)}`;
  useEffect(() => {
    if (listening) speech.speak(spoken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, spoken]);
  useEffect(() => {
    if (listening && !speech.speaking) {
      const id = window.setTimeout(() => {
        if (!window.speechSynthesis?.speaking) setListening(false);
      }, 400);
      return () => window.clearTimeout(id);
    }
  }, [listening, speech.speaking]);
  const wireEdge = exchange ? state.edges[exchange.edge] : undefined;
  const hui = historyUi(ui, lang);
  const history = useMemo(
    () => historyOf(lesson, branch, index, { nodes: labels, states: ui.states, flows: ui.flows, strings: hui, scenarios: scenarioTexts }),
    // labels and scenario texts come from `text`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson, branch, index, text, ui, hui],
  );

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
      case "edge-mode":
        return fill(sui.edgeMode, { from: n(c.from), to: n(c.to), was: sui.modes[c.was ?? "none"], now: sui.modes[c.now ?? "none"] });
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
            <li>{fill(ui.steps, { n: lesson.steps.length })}</li>
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
                <button type="button" className="mf-btn mf-btn--sim" aria-pressed={tryOn} onClick={() => setTryOn((v) => !v)}>
                  {tryOn ? ui.tryIt.close : ui.tryIt.open}
                </button>
                {speech.supported && (
                  <button
                    type="button"
                    className="mf-btn"
                    aria-pressed={listening}
                    title={speech.hasVoice ? undefined : ui.listen.noVoice}
                    onClick={() => {
                      if (listening) {
                        speech.stop();
                        setListening(false);
                      } else setListening(true);
                    }}
                  >
                    {listening ? ui.listen.stop : ui.listen.start}
                  </button>
                )}
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
                    if (svg) void downloadPng(svg, `${lesson.slug}-${sc ? `${sc}-` : ""}${index + 1}`).catch(() => undefined);
                  }}
                >
                  {ui.savePicture}
                </button>
              </div>
            </div>

            {tried && (
              <TryPanel
                ui={ui.tryIt}
                lang={lang}
                state={state}
                labels={labels}
                result={tried.result}
                rps={tryRps}
                setRps={setTryRps}
                down={down}
                toggle={(id) =>
                  setDown((d) => {
                    const n = new Set(d);
                    if (!n.delete(id)) n.add(id);
                    return n;
                  })
                }
              />
            )}
            <Scene
              state={tried ? tried.scene : state}
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
                {(["call", "async"] as const)
                  .filter((m) => modes.has(m))
                  .map((m) => (
                    <li key={m} className={`mf-legend__item mf-legend__item--${m}`}>
                      {sui.legend[m]}
                    </li>
                  ))}
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
              {choices.length > 0 && (
                <fieldset className="mf-branch">
                  <legend>{sui.label}</legend>
                  <div className="mf-branch__opts">
                    {[null, ...choices].map((id) => (
                      <label key={id ?? ""} className="mf-branch__opt">
                        <input
                          type="radio"
                          name={`mf-sc-${lesson.slug}`}
                          value={id ?? ""}
                          checked={branch.sc === id}
                          onChange={() => pick(id)}
                        />
                        <span>{id === null ? sui.base : (scenarioTexts[id]?.label ?? id)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
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
              <HistoryPanel entries={history} current={index} path={branch.sc ?? ""} ui={hui} onJump={go} />
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
              <Feedback ui={ui.feedback} lesson={lesson.slug} step={step.id} lang={lang} />
              <KeyHint text={ui.keys} on={keysOn} toggle={toggleKeys} labels={{ on: ui.keysOn, off: ui.keysOff }} />
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

        <nav className="mf-timeline" aria-label={ui.inLesson} ref={timelineRef}>
          <ol>
            {steps.map((s, i) => (
              <li
                key={s.id}
                className={`${i < index ? "mf-tl--past" : i === index ? "mf-tl--now" : ""}${branch.sc !== null && i > branch.from ? " mf-tl--branch" : ""}`}
              >
                <button type="button" onClick={() => go(i)} aria-current={i === index ? "step" : undefined} title={plain(textOf(s.id)?.title ?? "")}>
                  <span className="mf-tl__dot">{i + 1}</span>
                  <span className="mf-tl__label">{textOf(s.id)?.short}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
  );
}
