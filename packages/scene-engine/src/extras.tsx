import type { SceneState } from "@mufassall/scene-schema";
import { useEffect, useMemo, useState } from "react";
import { type LabDoc, fromScene, toScene } from "./lab";
import { type SimResult, simView, simulate } from "./sim";
import { type UiStrings, fill, formatNumber } from "./ui";

/* ---------- "break it": the lesson scene under live traffic ---------- */

export const toRps = (v: number) => Math.round(10 * 2000 ** (v / 100));
export const fromRps = (r: number) => Math.round((100 * Math.log(r / 10)) / Math.log(2000));

/** The step's scene with some nodes switched off and the traffic model applied. */
export function useTry(state: SceneState, labels: Record<string, string>, on: boolean, rps: number, down: ReadonlySet<string>) {
  return useMemo(() => {
    if (!on) return null;
    const doc: LabDoc = fromScene(state, labels);
    for (const id of down) if (doc.nodes[id]) doc.nodes[id] = { ...doc.nodes[id]!, state: "down" };
    const result = simulate(doc, rps);
    return { result, scene: { ...toScene(simView(doc, result)), metrics: state.metrics, focus: [] } as SceneState };
  }, [state, labels, on, rps, down]);
}

export function TryPanel({
  ui,
  lang,
  state,
  labels,
  result,
  rps,
  setRps,
  down,
  toggle,
}: {
  ui: UiStrings["tryIt"];
  lang: string;
  state: SceneState;
  labels: Record<string, string>;
  result: SimResult;
  rps: number;
  setRps: (n: number) => void;
  down: ReadonlySet<string>;
  toggle: (id: string) => void;
}) {
  const num = (v: number, d = 0) => formatNumber(v, lang, d);
  const nodes = Object.values(state.nodes).filter((n) => n.kind !== "client" && n.kind !== "actor");
  return (
    <div className="mf-try">
      <label className="mf-try__traffic">
        <span>{fill(ui.traffic, { n: num(rps) })}</span>
        <input name="try-traffic" type="range" min={0} max={100} step={1} value={fromRps(rps)} onChange={(e) => setRps(toRps(Number(e.currentTarget.value)))} />
      </label>
      <button type="button" className="mf-btn" onClick={() => setRps(Math.min(20000, rps * 10))}>
        {ui.spike}
      </button>
      <dl className="mf-lab__simstats" aria-live="polite">
        <div>
          <dt>{ui.ok}</dt>
          <dd>{num(result.ok)}/s</dd>
        </div>
        <div className={result.errorRate > 0.001 ? "is-bad" : undefined}>
          <dt>{ui.errors}</dt>
          <dd>{num(result.errorRate * 100, result.errorRate > 0 && result.errorRate < 0.1 ? 1 : 0)}%</dd>
        </div>
        <div className={result.ms > 500 ? "is-bad" : undefined}>
          <dt>{ui.latency}</dt>
          <dd>~{num(result.ms)} ms</dd>
        </div>
      </dl>
      {result.hot.length > 0 && <p className="mf-lab__simhot">{fill(ui.hot, { list: result.hot.map((id) => labels[id] ?? id).join(", ") })}</p>}
      {nodes.length > 0 && (
        <div className="mf-try__kill">
          <span>{ui.kill}</span>
          {nodes.map((n) => (
            <button key={n.id} type="button" className="mf-btn mf-btn--chip" aria-pressed={down.has(n.id)} onClick={() => toggle(n.id)}>
              {labels[n.id] ?? n.id}
            </button>
          ))}
        </div>
      )}
      <p className="mf-note">{ui.note}</p>
    </div>
  );
}

/* ---------- read aloud (Web Speech, nothing leaves the browser) ---------- */

const VOICE_LANG: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

export function useSpeech(lang: string) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;
    setSupported(true);
    const check = () => {
      const vs = synth.getVoices();
      if (vs.length) setHasVoice(vs.some((v) => v.lang.toLowerCase().startsWith(lang)));
    };
    check();
    synth.addEventListener?.("voiceschanged", check);
    return () => {
      synth.removeEventListener?.("voiceschanged", check);
      synth.cancel();
    };
  }, [lang]);
  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };
  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang] ?? lang;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };
  return { supported, speaking, hasVoice, speak, stop };
}

/* ---------- "was this step clear?" ---------- */

type Kind = "unclear" | "error" | "good";

export function Feedback({ ui, lesson, step, lang }: { ui: UiStrings["feedback"]; lesson: string; step: string; lang: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "fail">("idle");
  useEffect(() => {
    setKind(null);
    setText("");
    setStatus("idle");
  }, [lesson, step]);

  const send = async (k: Kind, note = "") => {
    setStatus("sending");
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson, step, lang, kind: k, ...(note.trim() ? { text: note.trim().slice(0, 500) } : {}) }),
      });
      setStatus(r.ok ? "sent" : "fail");
    } catch {
      setStatus("fail");
    }
  };

  if (status === "sent")
    return (
      <p className="mf-feedback mf-feedback--done" role="status">
        {ui.thanks}
      </p>
    );
  return (
    <div className="mf-feedback">
      <span className="mf-feedback__title">{ui.title}</span>
      <div className="mf-feedback__row">
        {(["unclear", "error", "good"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="mf-btn mf-btn--chip"
            aria-pressed={kind === k}
            disabled={status === "sending"}
            onClick={() => {
              if (k === "good") void send(k);
              else setKind(kind === k ? null : k);
            }}
          >
            {ui[k]}
          </button>
        ))}
      </div>
      {kind && kind !== "good" && (
        <form
          className="mf-feedback__form"
          onSubmit={(e) => {
            e.preventDefault();
            void send(kind, text);
          }}
        >
          <textarea
            name="feedback"
            rows={2}
            maxLength={500}
            value={text}
            placeholder={ui.placeholder}
            aria-label={ui.placeholder}
            onInput={(e) => setText(e.currentTarget.value)}
          />
          <button type="submit" className="mf-btn mf-btn--primary" disabled={status === "sending"}>
            {ui.send}
          </button>
        </form>
      )}
      {status === "fail" && (
        <p className="mf-feedback__fail" role="status">
          {ui.fail}
        </p>
      )}
    </div>
  );
}
