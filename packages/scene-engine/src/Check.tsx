import type { StepCheck } from "@mufassall/scene-schema";
import { useEffect, useRef, useState } from "react";
import { useShortcuts } from "./keys";
import { inline } from "./text";
import type { UiStrings } from "./ui";

const KEY = "mufassall:v1:checks";

/** Remember first answers (lesson/step -> right?), for review later. Storage is optional. */
function record(id: string, right: boolean) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
    if (!(id in all)) {
      all[id] = right;
      window.localStorage.setItem(KEY, JSON.stringify(all));
    }
  } catch {
    /* storage blocked */
  }
}

export interface CheckProps {
  /** "<lesson>/<step>", unique across the course */
  id: string;
  check: StepCheck;
  ui: UiStrings["check"];
}

/** "What happens next?" before the next step reveals it. Keys 1-4 pick; nothing is locked. */
export function Check({ id, check, ui }: CheckProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [keysOn] = useShortcuts();
  const resultRef = useRef<HTMLDivElement>(null);
  // the chosen button turns disabled and drops focus: hand it to the explanation
  useEffect(() => {
    if (chosen !== null) resultRef.current?.focus({ preventScroll: true });
  }, [chosen]);

  const pick = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    record(id, i === check.answer);
  };

  useEffect(() => {
    if (chosen !== null || !keysOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= check.options.length) {
        e.preventDefault();
        pick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const right = chosen === check.answer;
  return (
    <fieldset className="mf-check">
      <legend className="mf-check__title">{ui.title}</legend>
      <p className="mf-check__q">{inline(check.q)}</p>
      <ol className="mf-check__options">
        {check.options.map((o, i) => {
          const state =
            chosen === null ? "" : i === check.answer ? " mf-check__opt--right" : i === chosen ? " mf-check__opt--wrong" : " mf-check__opt--dim";
          return (
            <li key={i}>
              <button type="button" className={`mf-check__opt${state}`} aria-pressed={chosen === i} disabled={chosen !== null} onClick={() => pick(i)}>
                <kbd aria-hidden="true">{i + 1}</kbd>
                <span>{inline(o)}</span>
                {chosen !== null && i === check.answer && <span className="mf-check__mark">✓</span>}
                {chosen === i && i !== check.answer && <span className="mf-check__mark">✗</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mf-check__result" role="status" tabIndex={-1} ref={resultRef}>
        {chosen !== null && (
          <p>
            <strong>{right ? ui.right : ui.wrong}</strong> {inline(check.why)}
          </p>
        )}
      </div>
      {chosen === null && keysOn && <p className="mf-keys">{ui.keys}</p>}
    </fieldset>
  );
}
