import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nodeTargets } from "./chaos";
import { DES_MAX_DURATION, type DesResult, TRAFFIC_PROFILES, type TrafficProfile, busiestNode, comfortableRps, mulberry32, queueStory, simulateDes, spikeWindow } from "./des";
import { desStrings } from "./des-ui";
import type { LabDoc } from "./lab";
import { fill, formatNumber } from "./ui";
import "./des.css";

interface Params {
  profile: TrafficProfile;
  rps: number;
  factor: number;
  duration: number;
  seed: number;
  failNode: string;
  failFrom: number;
  failTo: number;
}

const W = 360;
const PAD_L = 8;
const PAD_R = 8;
const TITLE = 16;
const PLOT = 64;
const GAP = 12;
const STRIP = TITLE + PLOT + GAP;
const AXIS = 18;
const H = STRIP * 3 + AXIS;
const PLOT_W = W - PAD_L - PAD_R;

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

/** Polyline path; a null value breaks the line. */
function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let open = false;
  values.forEach((v, i) => {
    if (v === null) {
      open = false;
      return;
    }
    d += `${open ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    open = true;
  });
  return d;
}

export function DesPanel({ doc, lang, rps }: { doc: LabDoc; lang: string; rps: number }) {
  const t = desStrings(lang);
  const num = (v: number, d = 0) => formatNumber(v, lang, d);
  const name = (id: string) => doc.labels[id] ?? id;

  // an overloaded start never drains and hides the point of the panel, so start at 60% of the bottleneck
  const startRps = (r: number) => {
    const fit = comfortableRps(doc, r);
    return clampInt(fit !== null && fit < r ? fit : r, 1, 20000);
  };
  const [p, setP] = useState<Params>(() => ({
    profile: "spike",
    rps: startRps(rps),
    factor: 3,
    duration: 60,
    seed: 1,
    failNode: "",
    failFrom: 20,
    failTo: 30,
  }));
  const [watch, setWatch] = useState("");
  const [result, setResult] = useState<DesResult | null>(null);
  const [pending, setPending] = useState(true);
  // the Lab's traffic slider sets the base rate; the reader can still type another one here
  const firstRps = useRef(true);
  useEffect(() => {
    if (firstRps.current) {
      firstRps.current = false;
      return;
    }
    setP((s) => ({ ...s, rps: clampInt(rps, 1, 20000) }));
  }, [rps]);
  const fitRps = comfortableRps(doc, p.rps);

  const targets = useMemo(() => nodeTargets(doc), [doc]);
  const failNode = targets.includes(p.failNode) ? p.failNode : "";
  const run = useCallback(() => {
      const failure = failNode ? { node: failNode, from: Math.min(p.failFrom, p.failTo), to: Math.max(p.failFrom, p.failTo) } : null;
      setResult(simulateDes(doc, { profile: p.profile, rps: p.rps, factor: p.factor, duration: p.duration, seed: p.seed, failure }));
      setPending(false);
  }, [doc, p, failNode]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setPending(true);
    timer.current = setTimeout(run, 300);
    return () => clearTimeout(timer.current);
  }, [run]);
  const runNow = () => {
    clearTimeout(timer.current);
    run();
  };
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setP((s) => ({ ...s, [k]: v }));
  const numberInput = (k: "rps" | "factor" | "duration" | "seed" | "failFrom" | "failTo", lo: number, hi: number, step = 1) => (
    <input
      name={`des-${k}`}
      type="number"
      inputMode="decimal"
      min={lo}
      max={hi}
      step={step}
      value={p[k]}
      onChange={(e) => {
        const v = Number(e.currentTarget.value);
        if (e.currentTarget.value !== "" && Number.isFinite(v) && v >= lo && v <= hi) set(k, step < 1 ? v : Math.round(v));
      }}
    />
  );

  const watched = result && (watch && result.nodes[watch] && result.ids.includes(watch) ? watch : busiestNode(result));
  const story = result && watched ? queueStory(result, watched) : null;
  const s = result && watched ? result.nodes[watched]! : null;
  const tot = result && watched ? result.node[watched]! : null;

  let summary = "";
  let latency = "";
  if (story && result) {
    const parts =
      story.peak <= Math.max(result.scale, 2)
        ? [t.calm]
        : [fill(t.peak, { at: story.peakAt, n: num(story.peak) }), story.drain !== null ? fill(t.drained, { s: story.drain }) : t.notDrained];
    parts.push(fill(t.dropped, { n: num(story.dropped) }));
    summary = `${parts.join("; ")}.`;
    if (story.slowAt !== null && story.dropAt !== null && story.slowAt <= story.dropAt) latency = fill(t.slowThenDrop, { slow: story.slowAt, drop: story.dropAt });
    else if (story.slowAt !== null) latency = fill(t.slowOnly, { slow: story.slowAt });
  }

  const bands: { from: number; to: number; cls: string; label: string }[] = [];
  if (p.profile === "spike") {
    const w = spikeWindow(p);
    if (w.length > 0) bands.push({ from: w.start, to: w.start + w.length, cls: "mf-des__band--spike", label: t.chartSpike });
  }
  if (failNode) bands.push({ from: Math.min(p.failFrom, p.failTo), to: Math.max(p.failFrom, p.failTo), cls: "mf-des__band--down", label: t.chartDown });

  const chart = (() => {
    if (!result || !s || !tot || result.seconds === 0) return null;
    const n = result.seconds;
    const x = (i: number) => PAD_L + ((i + 0.5) / n) * PLOT_W;
    const xEdge = (sec: number) => PAD_L + (Math.min(n, Math.max(0, sec)) / n) * PLOT_W;
    const top = (k: number) => k * STRIP + TITLE;
    const yOf = (k: number, max: number) => (v: number) => top(k) + PLOT - (Math.min(v, max) / max) * PLOT;

    const capOk = Number.isFinite(tot.capacity);
    const loadMax = Math.max(1, ...s.arrivals, capOk ? tot.capacity : 0) * 1.1;
    const peakQ = Math.max(0, ...s.queue);
    const showLimit = peakQ >= tot.queueLimit * 0.5 && tot.queueLimit > 0;
    const qMax = Math.max(1, peakQ, showLimit ? tot.queueLimit : 0) * 1.1;
    const p95s = s.p95.filter((v): v is number => v !== null);
    const pMax = Math.max(1, ...p95s) * 1.1;
    const yl = yOf(0, loadMax);
    const yq = yOf(1, qMax);
    const yp = yOf(2, pMax);
    const qArea = s.queue.length
      ? `M${x(0).toFixed(1)} ${(top(1) + PLOT).toFixed(1)}${s.queue.map((v, i) => `L${x(i).toFixed(1)} ${yq(v).toFixed(1)}`).join("")}L${x(n - 1).toFixed(1)} ${(top(1) + PLOT).toFixed(1)}Z`
      : "";
    const ticks = [0, Math.round(n / 2), n];

    return (
      <svg className="mf-des__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.chartLabel}: ${name(watched!)}. ${summary}`} focusable="false">
        {bands.map((b, i) => (
          <g key={i} className={`mf-des__band ${b.cls}`}>
            <rect x={xEdge(b.from)} y={TITLE - 2} width={Math.max(1, xEdge(b.to) - xEdge(b.from))} height={STRIP * 3 - TITLE - GAP + 4} />
          </g>
        ))}
        {[0, 1, 2].map((k) => (
          <line key={k} className="mf-des__base" x1={PAD_L} x2={W - PAD_R} y1={top(k) + PLOT} y2={top(k) + PLOT} />
        ))}

        <text x={PAD_L} y={12} className="mf-des__title">
          {t.chartLoad} · max {num(Math.max(0, ...s.arrivals))}
          {capOk ? ` · - - ${t.chartCap} ${num(tot.capacity)}` : ""}
        </text>
        {capOk && <line className="mf-des__cap" x1={PAD_L} x2={W - PAD_R} y1={yl(tot.capacity)} y2={yl(tot.capacity)} />}
        <path className="mf-des__line mf-des__line--load" d={linePath(s.arrivals, x, yl)} />

        <text x={PAD_L} y={STRIP + 12} className="mf-des__title">
          {t.chartQueue} · max {num(peakQ)}
          {showLimit ? ` · - - ${t.chartLimit} ${num(tot.queueLimit)}` : ""}
        </text>
        {showLimit && <line className="mf-des__cap mf-des__cap--bad" x1={PAD_L} x2={W - PAD_R} y1={yq(tot.queueLimit)} y2={yq(tot.queueLimit)} />}
        <path className="mf-des__area" d={qArea} />
        <path className="mf-des__line mf-des__line--queue" d={linePath(s.queue, x, yq)} />

        <text x={PAD_L} y={STRIP * 2 + 12} className="mf-des__title">
          {t.chartP95} · max {num(p95s.length ? Math.max(...p95s) : 0)}
        </text>
        <path className="mf-des__line mf-des__line--p95" d={linePath(s.p95, x, yp)} />

        {ticks.map((sec, i) => (
          <text key={i} x={xEdge(sec)} y={H - 4} className="mf-des__tick" textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
            {sec} s
          </text>
        ))}
      </svg>
    );
  })();

  const nodeChoices = result?.ids ?? [];
  return (
    <section className="mf-panel__card mf-chaos mf-des" aria-labelledby="mf-des-h">
      <h2 id="mf-des-h">{t.heading}</h2>
      <p className="mf-lab__muted">{t.lead}</p>
      <div className="mf-lab__form mf-des__form">
        <label>
          <span>{t.profile}</span>
          <select name="des-profile" value={p.profile} onChange={(e) => set("profile", e.currentTarget.value as TrafficProfile)}>
            {TRAFFIC_PROFILES.map((k) => (
              <option key={k} value={k}>
                {t.profiles[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.rps}</span>
          {numberInput("rps", 1, 20000)}
        </label>
        {fitRps !== null && fitRps !== p.rps && (
          <button type="button" className="mf-btn mf-des__fit" onClick={() => set("rps", clampInt(fitRps, 1, 20000))}>
            {fill(t.fit, { n: num(fitRps) })}
          </button>
        )}
        {p.profile !== "constant" && (
          <label>
            <span>{t.factor}</span>
            {numberInput("factor", 0.5, 20, 0.5)}
          </label>
        )}
        <label>
          <span>{t.duration}</span>
          {numberInput("duration", 10, DES_MAX_DURATION)}
        </label>
        <div className="mf-des__seed">
          <label>
            <span>{t.seed}</span>
            {numberInput("seed", 0, 999999)}
          </label>
          <button type="button" className="mf-btn" onClick={() => set("seed", Math.floor(mulberry32(p.seed + 1)() * 999999) + 1)}>
            {t.newSeed}
          </button>
        </div>
      </div>
      <p className="mf-lab__muted mf-chaos__about">{t.about[p.profile]}</p>
      <div className="mf-lab__form mf-des__form">
        <label>
          <span>{t.failure}</span>
          <select name="des-fail" value={failNode} onChange={(e) => set("failNode", e.currentTarget.value)}>
            <option value="">{t.failNone}</option>
            {targets.map((id) => (
              <option key={id} value={id}>
                {name(id)}
              </option>
            ))}
          </select>
        </label>
        {failNode && (
          <>
            <label>
              <span>{t.failFrom}</span>
              {numberInput("failFrom", 0, DES_MAX_DURATION)}
            </label>
            <label>
              <span>{t.failTo}</span>
              {numberInput("failTo", 0, DES_MAX_DURATION)}
            </label>
          </>
        )}
      </div>
      {failNode && <p className="mf-lab__muted mf-chaos__about">{t.failAbout}</p>}
      <div className="mf-lab__seg">
        <button type="button" className="mf-btn mf-btn--primary" onClick={runNow}>
          {t.run}
        </button>
        <span className="mf-des__status" role="status">
          {pending ? t.running : ""}
        </span>
      </div>

      {result && nodeChoices.length === 0 && <p className="mf-lab__muted">{t.noNodes}</p>}
      {result && watched && s && (
        <div className="mf-des__result">
          <label className="mf-des__watch">
            <span>{t.watch}</span>
            <select name="des-watch" value={watch && nodeChoices.includes(watch) ? watch : ""} onChange={(e) => setWatch(e.currentTarget.value)}>
              <option value="">{fill(t.busiest, { name: name(busiestNode(result) ?? watched) })}</option>
              {nodeChoices.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </label>
          {chart}
          {bands.length > 0 && (
            <ul className="mf-des__legend">
              {bands.map((b, i) => (
                <li key={i} className={b.cls}>
                  {b.label}: {b.from}–{Math.min(b.to, p.duration)} s
                </li>
              ))}
            </ul>
          )}
          <div aria-live="polite">
            <p className="mf-des__summary">{summary}</p>
            {latency && <p className="mf-des__latency">{latency}</p>}
          </div>
          <p className="mf-lab__muted">{fill(t.totals, { in: num(result.totals.input), ok: num(result.totals.ok), lost: num(result.totals.dropped) })}</p>
          {result.scale > 1 && <p className="mf-lab__muted mf-chaos__formula">{fill(t.scaled, { k: num(result.scale) })}</p>}
          {result.truncated && <p className="mf-lab__muted mf-chaos__bad">{fill(t.truncated, { s: result.seconds })}</p>}
          <details className="mf-des__data">
            <summary>{t.table}</summary>
            <div className="mf-des__scroll" tabIndex={0} role="region" aria-label={`${t.table}: ${name(watched)}`}>
              <table className="mf-cost__table">
                <thead>
                  <tr>
                    <th scope="col">{t.colSecond}</th>
                    <th scope="col">{t.colArrivals}</th>
                    <th scope="col">{t.colCompleted}</th>
                    <th scope="col">{t.colDropped}</th>
                    <th scope="col">{t.colQueue}</th>
                    <th scope="col">{t.colP95}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.queue.map((q, i) => (
                    <tr key={i}>
                      <th scope="row">{i}</th>
                      <td>{num(s.arrivals[i]!)}</td>
                      <td>{num(s.completed[i]!)}</td>
                      <td>{num(s.dropped[i]!)}</td>
                      <td>{num(q)}</td>
                      <td>{s.p95[i] === null ? "–" : num(s.p95[i]!, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
