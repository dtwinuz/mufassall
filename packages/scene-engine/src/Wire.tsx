import { type Exchange, type WireLine, annotate } from "@mufassall/scene-schema";
import { inline } from "./text";
import type { UiStrings } from "./ui";

interface WireProps {
  exchange: Exchange;
  notes: Record<string, string>;
  from: string;
  to: string;
  ui: UiStrings["wire"];
}

function Lines({ lines, masked }: { lines: WireLine[]; masked: string }) {
  return (
    <pre className="mf-wire__code">
      <code>
        {lines.map((line, i) => (
          <span key={i} className="mf-wire__line">
            {line.map((s, j) =>
              s.kind === "text" ? (
                s.text
              ) : s.kind === "mark" ? (
                <sup key={j} className="mf-mark" aria-label={`(${s.n})`}>
                  {s.n}
                </sup>
              ) : (
                <span key={j} className="mf-mask" title={masked}>
                  <span aria-hidden="true">••••••</span>
                  <span className="mf-sr">{masked}</span>
                </span>
              ),
            )}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** The "real request" layer: what crosses the highlighted edge in this step, field by field. */
export function Wire({ exchange, notes, from, to, ui }: WireProps) {
  const seen = new Set<string>();
  const req = annotate(exchange.request, exchange.marks, exchange.masked, seen);
  const res = exchange.response ? annotate(exchange.response, exchange.marks, exchange.masked, seen) : null;
  const marks = exchange.marks ?? [];

  return (
    <section className="mf-wire" aria-label={ui.title}>
      <header className="mf-wire__head">
        <h3>{ui.title}</h3>
        <span className="mf-wire__route">
          {from} → {to}
        </span>
      </header>
      <div className={`mf-wire__panes${res ? "" : " mf-wire__panes--one"}`}>
        <div className="mf-wire__pane">
          <p className="mf-wire__label">{ui.request}</p>
          <Lines lines={req} masked={ui.masked} />
        </div>
        {res && (
          <div className="mf-wire__pane">
            <p className="mf-wire__label">{ui.response}</p>
            <Lines lines={res} masked={ui.masked} />
          </div>
        )}
      </div>
      {marks.length > 0 && (
        <ol className="mf-wire__notes">
          {marks.map((name, i) => (
            <li key={name}>
              <span className="mf-mark" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <code>{name}</code>
                {exchange.masked?.includes(name) && <span className="mf-wire__lock"> · {ui.masked}</span>}
                {notes[name] ? <> — {inline(notes[name]!)}</> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
