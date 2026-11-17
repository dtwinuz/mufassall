import type { NodeKind } from "@mufassall/scene-schema";
import { useEffect, useRef, useState } from "react";
import type { Rule } from "./challenges";
import { HINT_LEVELS, type PracticeFile } from "./practice";
import type { PracticeStrings } from "./practice-ui";
import { type LabStrings, fill } from "./ui";

export type PracticeLoad = { status: "loading" } | { status: "fail" } | { status: "ok"; file: PracticeFile };

export interface PracticePanelProps {
  ps: PracticeStrings;
  lab: LabStrings;
  lang: string;
  slug: string;
  load: PracticeLoad;
  checks: boolean[];
  ruleText: (r: Rule) => string;
  /** day it was solved before (from storage), if ever */
  solvedOn?: string;
  onSolution: () => void;
  onStartOver: () => void;
}

/** Lesson practice: the live checklist, hints that open one level at a time, and the lesson's own answer. */
export function PracticePanel({ ps, lab, lang, slug, load, checks, ruleText, solvedOn, onSolution, onStartOver }: PracticePanelProps) {
  const [level, setLevel] = useState(0);
  const [asking, setAsking] = useState(false);
  const yesRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  useEffect(() => {
    // focus follows the in-page question, then goes back to the button that asked it
    if (asking) yesRef.current?.focus();
    else if (wasAsking.current) askRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  const lessonHref = `/${lang}/l/${slug}/`;
  const back = (
    <a className="mf-btn mf-practice__back" href={lessonHref}>
      {ps.back}
    </a>
  );
  if (load.status !== "ok")
    return (
      <div className="mf-panel__card mf-practice">
        <h2>{ps.heading}</h2>
        <p className="mf-lab__muted" role="status">
          {load.status === "loading" ? ps.loading : ps.loadFail}
        </p>
        {back}
      </div>
    );

  const { file } = load;
  const k = (kind: NodeKind) => lab.kinds[kind];
  const passed = checks.filter(Boolean).length;
  const all = checks.length > 0 && passed === checks.length;
  return (
    <div className={`mf-panel__card mf-practice${all ? " mf-practice--done" : ""}`}>
      <h2 id="mf-practice-title">{fill(ps.task, { title: file.title })}</h2>
      <p className="mf-lab__muted">{ps.lead}</p>
      <ul className="mf-lab__rules" aria-labelledby="mf-practice-title">
        {file.rules.map((r, i) => (
          <li key={i} className={checks[i] ? "is-ok" : undefined}>
            <span aria-hidden="true">{checks[i] ? "✓" : "○"}</span>
            <span className="mf-sr">{checks[i] ? ps.passed : ps.notYet}: </span>
            {ruleText(r)}
          </li>
        ))}
      </ul>
      {/* one short live line instead of a live list: a screen reader hears the count change, not every row again */}
      <p className="mf-practice__progress" aria-live="polite">
        {fill(ps.progress, { n: passed, total: checks.length })}
      </p>
      <p className="mf-lab__goal" role="status">
        {all ? ps.done : ""}
      </p>
      {solvedOn && !all && <p className="mf-lab__muted">{fill(ps.solvedOn, { date: solvedOn })}</p>}

      {level > 0 && (
        <ol className="mf-practice__hints" aria-live="polite">
          <li>
            <span className="mf-practice__level">{fill(ps.hintLevel, { n: 1, total: HINT_LEVELS })}</span>
            {fill(ps.hintKinds, { list: file.hints.kinds.map(([kind, n]) => (n > 1 ? `${n} × ${k(kind)}` : k(kind))).join(", ") })}
          </li>
          {level > 1 && (
            <li>
              <span className="mf-practice__level">{fill(ps.hintLevel, { n: 2, total: HINT_LEVELS })}</span>
              {fill(ps.hintLinks, { list: file.hints.links.map(([a, b]) => `${k(a)} → ${k(b)}`).join("; ") })}
            </li>
          )}
          {level > 2 && (
            <li>
              <span className="mf-practice__level">{fill(ps.hintLevel, { n: 3, total: HINT_LEVELS })}</span>
              {ps.hintPaths}
              <ul>
                {file.hints.paths.map((p, i) => (
                  <li key={i}>{p.map(k).join(" → ")}</li>
                ))}
              </ul>
            </li>
          )}
        </ol>
      )}

      <div className="mf-lab__seg">
        <button type="button" className="mf-btn" disabled={level >= HINT_LEVELS} onClick={() => setLevel((l) => Math.min(HINT_LEVELS, l + 1))}>
          {level === 0 ? ps.hint : ps.hintNext}
        </button>
        <button ref={askRef} type="button" className="mf-btn" aria-expanded={asking} onClick={() => setAsking(true)} hidden={asking}>
          {ps.showSolution}
        </button>
      </div>
      {asking && (
        <div className="mf-practice__ask" role="group" aria-label={ps.showSolution} onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
          <p>{ps.solutionAsk}</p>
          <div className="mf-lab__seg">
            <button
              ref={yesRef}
              type="button"
              className="mf-btn mf-btn--primary"
              onClick={() => {
                onSolution();
                setAsking(false);
              }}
            >
              {ps.solutionYes}
            </button>
            <button type="button" className="mf-btn" onClick={() => setAsking(false)}>
              {ps.solutionNo}
            </button>
          </div>
        </div>
      )}
      <div className="mf-lab__seg">
        {back}
        <button type="button" className="mf-btn" onClick={onStartOver}>
          {ps.startOver}
        </button>
      </div>
      <p className="mf-lab__muted">
        <a href={`/${lang}/lab/`}>{ps.exit}</a>
      </p>
    </div>
  );
}
