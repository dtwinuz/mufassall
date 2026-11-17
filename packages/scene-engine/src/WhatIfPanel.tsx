import { useEffect, useMemo, useRef, useState } from "react";
import { type Values, type WhatIfParam, WHATIF, clampParam, defaultsOf, fmt, readParams, writeParams } from "./whatif";
import { type WhatIfLesson, whatIfUi } from "./whatif-ui";

const URL_DELAY = 300;
const NONE: WhatIfParam[] = [];

/** Shown number for a stored value: fractions as percent, no float noise. */
const shown = (p: WhatIfParam, value: number) => Number((value * (p.scale ?? 1)).toFixed(6));

function NumberField({ p, value, label, unit, onChange }: { p: WhatIfParam; value: number; label: string; unit: string; onChange: (v: number) => void }) {
  const scale = p.scale ?? 1;
  const [draft, setDraft] = useState(String(shown(p, value)));
  const focused = useRef(false);
  // follow the slider and "reset", but never rewrite what the reader is typing
  useEffect(() => {
    if (!focused.current) setDraft(String(shown(p, value)));
  }, [p, value]);
  return (
    <input
      className="mf-whatif__num"
      type="number"
      inputMode="decimal"
      min={p.min * scale}
      max={p.max * scale}
      step={p.step * scale}
      value={draft}
      aria-label={unit ? `${label}, ${unit}` : label}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        const text = e.currentTarget.value;
        setDraft(text);
        const n = Number(text);
        if (text.trim() !== "" && Number.isFinite(n) && n >= p.min * scale && n <= p.max * scale) onChange(clampParam(p, n / scale));
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(String(shown(p, value)));
      }}
    />
  );
}

export interface WhatIfProps {
  slug: string;
  lang: string;
}

/**
 * "What happens if…" panel under a lesson: the reader's own numbers through the lesson's model.
 * The first render uses the lesson's values (same as the static HTML); URL values are applied
 * after mount, so hydration never mismatches.
 */
export function WhatIf({ slug, lang }: WhatIfProps) {
  const model = WHATIF[slug];
  const ui = whatIfUi(lang);
  const text: WhatIfLesson | undefined = ui.lessons[slug];
  const params = model?.params ?? NONE;
  const defaults = useMemo(() => defaultsOf(params), [params]);
  const [values, setValues] = useState<Values>(defaults);
  const [copy, setCopy] = useState<"idle" | "copied" | "fail">("idle");
  // only the reader's own changes are written to the URL, never the initial read
  const touched = useRef(false);

  useEffect(() => {
    setValues(readParams(window.location.search, params));
  }, [params]);

  useEffect(() => {
    if (!touched.current) return;
    const t = window.setTimeout(() => {
      window.history.replaceState(window.history.state, "", writeParams(window.location.href, values, params));
    }, URL_DELAY);
    return () => window.clearTimeout(t);
  }, [values, params]);

  useEffect(() => {
    if (copy === "idle") return;
    const t = window.setTimeout(() => setCopy("idle"), 4000);
    return () => window.clearTimeout(t);
  }, [copy]);

  if (!model || !text) return null;

  const set = (id: string, v: number) => {
    touched.current = true;
    setCopy("idle");
    setValues((old) => ({ ...old, [id]: v }));
  };
  const reset = () => {
    touched.current = true;
    setValues(defaults);
  };
  const share = async () => {
    const href = writeParams(window.location.href, values, params, true);
    try {
      await navigator.clipboard.writeText(href);
      setCopy("copied");
    } catch {
      setCopy("fail");
    }
  };

  const unit = (u: string) => ui.units[u] ?? u;
  const results = model.compute(values);
  const bad = results.some((r) => r.tone === "bad");
  const isDefault = params.every((p) => values[p.id] === p.default);
  const base = `mf-wi-${slug}`;

  return (
    <section className={`mf-whatif${bad ? " is-bad" : ""}`} aria-labelledby={`${base}-title`}>
      <header className="mf-whatif__head">
        <h2 id={`${base}-title`} className="mf-whatif__title">
          {ui.title}
        </h2>
        <p className="mf-whatif__intro">{ui.intro}</p>
      </header>

      <div className="mf-whatif__params">
        {params.map((p) => {
          const id = `${base}-${p.id}`;
          const label = text.params[p.id]?.label ?? p.id;
          const value = values[p.id] ?? p.default;
          const u = unit(p.unit);
          return (
            <div key={p.id} className="mf-whatif__param">
              <label htmlFor={id} className="mf-whatif__label">
                {label}
              </label>
              <div className="mf-whatif__inputs">
                <input
                  id={id}
                  className="mf-whatif__range"
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={value}
                  aria-describedby={`${id}-hint`}
                  aria-valuetext={`${fmt(shown(p, value), lang, Number.isInteger(shown(p, value)) ? 0 : 2)} ${u}`.trim()}
                  onChange={(e) => set(p.id, clampParam(p, Number(e.currentTarget.value)))}
                />
                <NumberField p={p} value={value} label={label} unit={u} onChange={(v) => set(p.id, v)} />
                {u && <span className="mf-whatif__unit" aria-hidden="true">{u}</span>}
              </div>
              <p id={`${id}-hint`} className="mf-whatif__hint">
                {text.params[p.id]?.hint}
              </p>
            </div>
          );
        })}
      </div>

      <h3 className="mf-whatif__sub">{ui.results}</h3>
      <dl className="mf-whatif__results" aria-live="polite">
        {results.map((r) => {
          const infinite = !Number.isFinite(r.value);
          return (
            <div key={r.id} className={`mf-whatif__stat${r.tone && r.tone !== "ok" ? ` is-${r.tone}` : ""}`}>
              <dt>{text.results[r.id] ?? r.id}</dt>
              <dd>
                {infinite ? <span aria-label={ui.unbounded}>∞</span> : fmt(r.value, lang, r.decimals)}
                {r.unit && !infinite && <small>{unit(r.unit)}</small>}
              </dd>
            </div>
          );
        })}
      </dl>
      {bad && (
        <p className="mf-whatif__warn" role="status">
          {text.warn}
        </p>
      )}

      <h3 className="mf-whatif__sub">{ui.formula}</h3>
      <pre className="mf-whatif__formula">
        <code>{model.formula(values, lang)}</code>
      </pre>

      <div className="mf-whatif__actions">
        <button type="button" className="mf-btn" onClick={share}>
          {ui.copy}
        </button>
        <button type="button" className="mf-btn" onClick={reset} disabled={isDefault}>
          {ui.reset}
        </button>
        <span className="mf-whatif__copied" role="status">
          {copy === "copied" ? ui.copied : copy === "fail" ? ui.copyFail : ""}
        </span>
      </div>
      <p className="mf-whatif__note">{ui.note}</p>
    </section>
  );
}
