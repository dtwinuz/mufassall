import { useEffect, useRef, useState } from "react";
import { type HistoryEntry, type HistoryStrings, addedEntries, formatOffset } from "./history";
import { fill } from "./ui";

interface HistoryPanelProps {
  entries: readonly HistoryEntry[];
  /** current step index */
  current: number;
  /** scenario id or "" for the base story: a new path is not "stepping forward" */
  path: string;
  ui: HistoryStrings;
  onJump: (step: number) => void;
}

/** Wide enough that the log is open by default; on phones it starts closed. */
const WIDE = "(min-width: 641px)";
/** Longest announcement: a screen reader should hear the new events, not the whole log. */
const SAY_MAX = 6;

export function HistoryPanel({ entries, current, path, ui, onJump }: HistoryPanelProps) {
  // closed in the server render; opened after mount on wide screens, so hydration matches
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.(WIDE).matches) setOpen(true);
  }, []);

  const [said, setSaid] = useState("");
  const seen = useRef({ current, path });
  useEffect(() => {
    const was = seen.current;
    seen.current = { current, path };
    if (was.path !== path) return setSaid("");
    const fresh = addedEntries(entries, was.current, current).slice(-SAY_MAX);
    setSaid(fresh.length ? fill(ui.added, { list: fresh.map((e) => `${formatOffset(e.t)} ${e.label}`).join("; ") }) : "");
    // entries follow current and path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, path]);

  // the log scrolls inside itself to the newest entry, never the page
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list && open) list.scrollTop = list.scrollHeight;
  }, [current, path, open, entries.length]);

  return (
    <div className="mf-hist">
      <p className="mf-sr" aria-live="polite" aria-atomic="true">
        {said}
      </p>
      {/* the player's panel is a live region; this log speaks only through the line above */}
      <details className="mf-hist__box" open={open} aria-live="off" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="mf-hist__sum">
          <h3>{ui.title}</h3>
          <span className="mf-hist__count">{entries.length}</span>
        </summary>
        {entries.length === 0 ? (
          <p className="mf-changes__none">{ui.empty}</p>
        ) : (
          <ol className="mf-hist__list" ref={listRef}>
            {entries.map((e, i) => {
              const now = e.step === current;
              const newest = i === entries.length - 1;
              return (
                <li
                  key={`${e.step}-${i}-${e.kind}`}
                  className={`mf-hist__item mf-hist__item--${e.tone}${now ? " mf-hist__item--now" : ""}${newest ? " mf-hist__item--newest" : ""}`}
                >
                  <button type="button" onClick={() => onJump(e.step)} title={fill(ui.jump, { n: e.step + 1, label: e.label })}>
                    <span className="mf-hist__t">{formatOffset(e.t)}</span>
                    <span className="mf-hist__what">
                      <span className={`mf-hist__kind mf-hist__kind--${e.kind}`}>{ui.kinds[e.kind]}</span>{" "}
                      <span className={e.kind === "request" || e.kind === "response" ? "mf-hist__head" : "mf-hist__label"}>{e.label}</span>
                    </span>
                    <span className="mf-hist__meta">
                      {e.target && (e.kind === "request" || e.kind === "response" || e.kind === "lost") ? `${e.actor} → ${e.target}` : ""}
                      <span className="mf-hist__step">{fill(ui.step, { n: e.step + 1 })}</span>
                      {now && <span className="mf-sr">, {ui.now}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </details>
    </div>
  );
}
