import { useEffect, useState } from "react";

/**
 * Single-key shortcuts (R, S, C, Space, 1-3) can be switched off by the reader (WCAG 2.1.4):
 * speech input types letters that must not fire commands. The choice is per browser and is
 * shared by the lesson player, the checks and the Lab; review.js reads the same key.
 */
export const KEYS_KEY = "mufassall:v1:keys";
const EVENT = "mufassall:keys";

let pageChoice = true;

export function shortcutsOn(): boolean {
  try {
    return window.localStorage.getItem(KEYS_KEY) !== "off";
  } catch {
    return pageChoice;
  }
}

export function useShortcuts(): [boolean, () => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(shortcutsOn());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = () => {
    const next = !shortcutsOn();
    pageChoice = next;
    try {
      window.localStorage.setItem(KEYS_KEY, next ? "on" : "off");
    } catch {
      /* blocked storage: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, toggle];
}

/** The hint line under a player, with its on/off switch. */
export function KeyHint({ text, on, toggle, labels }: { text: string; on: boolean; toggle: () => void; labels: { on: string; off: string } }) {
  return (
    <p className="mf-keys">
      {on && <span>{text} · </span>}
      <button type="button" className="mf-keys__toggle" aria-pressed={!on} onClick={toggle}>
        {on ? labels.off : labels.on}
      </button>
    </p>
  );
}
