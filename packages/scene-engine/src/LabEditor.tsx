import { FLOWS, NODE_KINDS, NODE_STATES, type NodeKind } from "@mufassall/scene-schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadPng, downloadSvg } from "./export";
import { gridBounds } from "./iso";
import { useReducedMotion } from "./motion";
import {
  GRID_MAX,
  GRID_MIN,
  type LabDoc,
  MAX_EDGES,
  MAX_LABEL,
  MAX_NODES,
  cellTaken,
  decodeDoc,
  emptyDoc,
  encodeDoc,
  freeCell,
  nextId,
  sanitize,
  toLessonCode,
  toScene,
} from "./lab";
import { Scene, type SceneEdit } from "./Scene";
import { simView, simulate } from "./sim";
import { CHALLENGES, type Rule, checkRule } from "./challenges";
import { type LabStrings, type UiStrings, fill, formatNumber } from "./ui";

const STORE_KEY = "mufassall:v1:lab";
const SOLVED_KEY = "mufassall:v1:lab:solved";
/** the reader's own diagram, kept when a shared link replaces it */
const PREV_KEY = "mufassall:v1:lab:prev";
const MAX_IMPORT = 256_000;
const BOX = gridBounds(GRID_MIN, GRID_MAX);
const CENTER: [number, number] = [6, 6];
/** traffic slider: 0..100 on a log scale from 10 to 20 000 requests per second */
const toRps = (v: number) => Math.round(10 * 2000 ** (v / 100));
const fromRps = (r: number) => Math.round((100 * Math.log(r / 10)) / Math.log(2000));

type Cell = [number, number];
type Tool = { mode: "select" } | { mode: "place"; kind: NodeKind } | { mode: "connect"; from?: string };
type Selection = { type: "node"; id: string } | { type: "edge"; id: string } | null;
/** undo history; `tag` lets consecutive edits of one control (a slider drag, typing a label) merge into one step */
interface History {
  past: LabDoc[];
  present: LabDoc;
  future: LabDoc[];
  tag?: string;
}
type Dialog = { kind: "code"; text: string } | { kind: "link"; text: string } | null;

const inArea = (c: Cell) => c[0] >= GRID_MIN && c[1] >= GRID_MIN && c[0] <= GRID_MAX && c[1] <= GRID_MAX;
const nodeCount = (d: LabDoc) => Object.keys(d.nodes).length;

function example(lab: LabStrings): LabDoc {
  const doc = emptyDoc();
  const add = (id: string, kind: NodeKind, at: Cell, label: string, load?: number) => {
    doc.nodes[id] = { id, kind, at, state: "ok", ...(load === undefined ? {} : { load }) };
    doc.labels[id] = label;
  };
  // screen right = (x+1, y-1), screen down = (x+1, y+1)
  add("client", "client", [3, 9], lab.kinds.client);
  add("lb", "lb", [5, 7], lab.kinds.lb);
  add("api-1", "service", [5, 3], `${lab.kinds.service} 1`, 48);
  add("api-2", "service", [9, 7], `${lab.kinds.service} 2`, 52);
  add("cache", "cache", [6, 0], lab.kinds.cache);
  add("db", "db", [10, 4], lab.kinds.db);
  const link = (id: string, from: string, to: string, rate = 2) => {
    doc.edges[id] = { id, from, to, flow: "request", rate, cut: false };
  };
  link("in", "client", "lb", 4);
  link("lb-1", "lb", "api-1");
  link("lb-2", "lb", "api-2");
  link("read", "api-1", "cache");
  link("write", "api-2", "db", 1);
  link("write-1", "api-1", "db", 1);
  return doc;
}

const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage may be blocked; the share link still works */
    }
  },
};

/**
 * What to show first. A shared link wins, but the reader's own diagram is backed up first
 * (and stays one undo away), so opening any link can never cost them their work.
 * The Lab island is client-only, so this runs once in the browser before the first paint.
 */
function initial(lab: LabStrings): { doc: LabDoc; before?: LabDoc; fromLink: boolean } {
  const raw = store.get(STORE_KEY);
  let saved: LabDoc | undefined;
  try {
    if (raw) saved = sanitize(JSON.parse(raw));
  } catch {
    /* corrupted entry: ignore */
  }
  const hash = new URLSearchParams(window.location.hash.slice(1)).get("d");
  if (hash) {
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);
    const linked = decodeDoc(hash);
    // a truncated or broken link decodes to nothing: keep what the reader had
    if (nodeCount(linked) > 0) {
      const own = saved && nodeCount(saved) > 0 ? saved : undefined;
      if (own && raw && encodeDoc(own) !== encodeDoc(linked)) store.set(PREV_KEY, raw);
      return { doc: linked, before: own, fromLink: true };
    }
  }
  return { doc: saved ?? example(lab), fromLink: false };
}

export interface LabEditorProps {
  ui: UiStrings;
  lab: LabStrings;
}

export function LabEditor({ ui, lab }: LabEditorProps) {
  const [first] = useState(() => initial(lab));
  const [hist, setHist] = useState<History>(() => ({ past: first.before ? [first.before] : [], present: first.doc, future: [] }));
  const doc = hist.present;
  const [tool, setTool] = useState<Tool>({ mode: "select" });
  const [sel, setSel] = useState<Selection>(null);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<{ text: string; restore?: boolean } | null>(
    first.fromLink && first.before ? { text: lab.linkLoaded, restore: true } : null,
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const drag = useRef<{ id: string; before: LabDoc; moved: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const reduced = useReducedMotion();
  const [sim, setSim] = useState(false);
  const [rps, setRps] = useState(800);
  const [spike, setSpike] = useState(false);
  const lang = (typeof document !== "undefined" && document.documentElement.lang) || "en";
  const [challengeId, setChallengeId] = useState("");
  const [solved, setSolved] = useState<string[]>(() => {
    try {
      const v = JSON.parse(store.get(SOLVED_KEY) ?? "[]");
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    store.set(STORE_KEY, JSON.stringify(doc));
  }, [doc]);

  // a node that vanished (undo, delete, import) can no longer start a connection
  useEffect(() => {
    if (tool.mode === "connect" && tool.from && !doc.nodes[tool.from]) setTool({ mode: "connect" });
    if (sel?.type === "node" && !doc.nodes[sel.id]) setSel(null);
    if (sel?.type === "edge" && !doc.edges[sel.id]) setSel(null);
  }, [doc, tool, sel]);

  const flash = useCallback((text: string, ms = 2400) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text });
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => {
    if (toast?.restore) toastTimer.current = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(toastTimer.current);
    // only the first (link) toast arms itself here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Record a change. `before` overrides the undo point (drags); `tag` merges repeats of one control. */
  const commit = useCallback((next: LabDoc, opts: { before?: LabDoc; tag?: string } = {}) => {
    setHist((h) => {
      if (opts.tag && h.tag === opts.tag) return { ...h, present: next };
      const past = [...h.past, opts.before ?? h.present].slice(-100);
      return { past, present: next, future: [], tag: opts.tag };
    });
  }, []);
  /** Show a change without recording it (live drag). */
  const preview = useCallback((next: LabDoc) => setHist((h) => ({ ...h, present: next })), []);

  const undo = useCallback(() => {
    setHist((h) => {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      return { past: h.past.slice(0, -1), present: prev, future: [...h.future, h.present] };
    });
  }, []);
  const redo = useCallback(() => {
    setHist((h) => {
      const next = h.future[h.future.length - 1];
      if (!next) return h;
      return { past: [...h.past, h.present], present: next, future: h.future.slice(0, -1) };
    });
  }, []);

  const restoreOwn = () => {
    const raw = store.get(PREV_KEY);
    try {
      if (raw) commit(sanitize(JSON.parse(raw)));
    } catch {
      /* nothing to restore */
    }
    setToast(null);
  };

  const removeSelected = useCallback(() => {
    if (!sel) return;
    const next: LabDoc = { nodes: { ...doc.nodes }, edges: { ...doc.edges }, labels: { ...doc.labels } };
    if (sel.type === "node") {
      delete next.nodes[sel.id];
      delete next.labels[sel.id];
      for (const e of Object.values(next.edges)) if (e.from === sel.id || e.to === sel.id) delete next.edges[e.id];
    } else delete next.edges[sel.id];
    commit(next);
    setSel(null);
  }, [sel, doc, commit]);

  const addNode = (kind: NodeKind, at: Cell) => {
    if (nodeCount(doc) >= MAX_NODES) return flash(lab.limit);
    if (!inArea(at) || cellTaken(doc, at)) return;
    const id = nextId(doc.nodes, kind);
    const count = Object.values(doc.nodes).filter((n) => n.kind === kind).length + 1;
    commit({
      nodes: { ...doc.nodes, [id]: { id, kind, at, state: "ok" } },
      edges: doc.edges,
      labels: { ...doc.labels, [id]: count > 1 ? `${lab.kinds[kind]} ${count}` : lab.kinds[kind] },
    });
    setSel({ type: "node", id });
    return id;
  };

  const hasEdge = (from: string, to: string, except?: string) =>
    Object.values(doc.edges).some((e) => e.id !== except && e.from === from && e.to === to);

  const addEdge = (from: string, to: string) => {
    if (from === to || !doc.nodes[from] || !doc.nodes[to]) return;
    if (Object.keys(doc.edges).length >= MAX_EDGES) return flash(lab.limit);
    if (hasEdge(from, to)) return;
    const id = nextId(doc.edges, "e");
    commit({ ...doc, edges: { ...doc.edges, [id]: { id, from, to, flow: "request", rate: 2, cut: false } } });
    setSel({ type: "edge", id });
  };

  /** Click or Enter on a node: finish a connection, or select it. */
  const activateNode = (id: string) => {
    if (tool.mode === "connect") {
      if (!tool.from || !doc.nodes[tool.from]) setTool({ mode: "connect", from: id });
      else {
        addEdge(tool.from, id);
        setTool({ mode: "connect" });
      }
      return true;
    }
    setTool({ mode: "select" });
    setSel({ type: "node", id });
    return false;
  };

  const moveNode = (id: string, at: Cell) => {
    const n = doc.nodes[id];
    if (!n || !inArea(at) || cellTaken(doc, at, id)) return;
    commit({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, at } } }, { tag: `move:${id}` });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the native modal dialog owns the keyboard while it is open
      if (dialogRef.current?.open) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Space and Delete keep their meaning on buttons and links
      const onControl = t?.closest?.("button, a, summary, [role=dialog], dialog");
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") redo();
      else if ((e.key === "Delete" || e.key === "Backspace") && !onControl) removeSelected();
      else if (e.key === "Escape") {
        setTool({ mode: "select" });
        setSel(null);
      } else if (!mod && !e.altKey && (e.key === "c" || e.key === "C")) setTool((t0) => (t0.mode === "connect" ? { mode: "select" } : { mode: "connect" }));
      else if (e.key === " " && !onControl && !t?.closest?.(".mf-node")) setPaused((p) => !p);
      else if (!mod && !e.altKey && (e.key === "s" || e.key === "S")) setSim((v) => !v);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeSelected]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (dialog && !d.open) d.showModal();
    else if (!dialog && d.open) d.close();
  }, [dialog]);

  const ARROWS: Record<string, Cell> = {
    // arrows follow the screen: right = (x+1, y-1), down = (x+1, y+1)
    ArrowRight: [1, -1],
    ArrowLeft: [-1, 1],
    ArrowDown: [1, 1],
    ArrowUp: [-1, -1],
  };

  const edit: SceneEdit = {
    selected: sel?.type === "node" ? sel.id : undefined,
    selectedEdge: sel?.type === "edge" ? sel.id : undefined,
    onNodeDown: (id, e) => {
      if (e.button !== 0) return;
      if (activateNode(id)) return;
      drag.current = { id, before: doc, moved: false };
      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    },
    onNodeKey: (id, e) => {
      const d = ARROWS[e.key];
      if (d) {
        const n = doc.nodes[id];
        if (n) moveNode(id, [n.at[0] + d[0], n.at[1] + d[1]]);
        setSel({ type: "node", id });
      } else if (e.key === "Enter" || e.key === " ") activateNode(id);
      else return;
      e.preventDefault();
      e.stopPropagation();
    },
    area: [GRID_MIN, GRID_MAX],
    hover: tool.mode === "place" ? hover : null,
    onStageDown: (cell, e) => {
      drag.current = null;
      if (e.button !== 0) return;
      if (tool.mode === "place") {
        // outside the area or on a taken cell: keep the tool, the outline shows where it fits
        if (inArea(cell) && !cellTaken(doc, cell)) {
          addNode(tool.kind, cell);
          setTool({ mode: "select" });
          setHover(null);
        }
        return;
      }
      if (tool.mode === "connect") setTool({ mode: "connect" });
      setSel(null);
    },
    onStageMove: (cell) => {
      if (tool.mode === "place") {
        const next = inArea(cell) && !cellTaken(doc, cell) ? cell : null;
        if (next?.[0] !== hover?.[0] || next?.[1] !== hover?.[1]) setHover(next);
      }
      const d = drag.current;
      if (!d) return;
      const n = doc.nodes[d.id];
      if (!n || (n.at[0] === cell[0] && n.at[1] === cell[1])) return;
      if (!inArea(cell) || cellTaken(doc, cell, d.id)) return;
      d.moved = true;
      preview({ ...doc, nodes: { ...doc.nodes, [d.id]: { ...n, at: cell } } });
    },
    onStageUp: () => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      // record the drag as one step, using the newest doc (not this render's copy)
      setHist((h) => ({ past: [...h.past, d.before].slice(-100), present: h.present, future: [] }));
    },
    onStageLeave: () => setHover(null),
    onEdgeDown: (id) => {
      setTool({ mode: "select" });
      setSel({ type: "edge", id });
    },
  };

  const patchNode = (id: string, patch: Partial<LabDoc["nodes"][string]>, tag?: string) => {
    const n = doc.nodes[id];
    if (!n) return;
    const node = { ...n, ...patch };
    if ("load" in patch && patch.load === undefined) delete node.load;
    commit({ ...doc, nodes: { ...doc.nodes, [id]: node } }, { tag });
  };
  const setLabel = (id: string, label: string) => {
    if (!doc.nodes[id]) return;
    commit({ ...doc, labels: { ...doc.labels, [id]: label.slice(0, MAX_LABEL) } }, { tag: `label:${id}` });
  };
  const patchEdge = (id: string, patch: Partial<LabDoc["edges"][string]>, tag?: string) => {
    const e = doc.edges[id];
    if (e) commit({ ...doc, edges: { ...doc.edges, [id]: { ...e, ...patch } } }, { tag });
  };

  const shareUrl = () => {
    // the address bar is left alone: a reload must show the newest edits, not this snapshot
    const url = new URL(window.location.href);
    url.hash = `d=${encodeDoc(doc)}`;
    return url.toString();
  };
  const share = async () => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      flash(lab.copied);
    } catch {
      setDialog({ kind: "link", text: url });
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mufassall-lab.json";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJson = async (file: File) => {
    if (file.size > MAX_IMPORT) return flash(lab.importBad);
    try {
      const next = sanitize(JSON.parse(await file.text()));
      if (nodeCount(next) === 0) return flash(lab.importBad);
      commit(next);
      setSel(null);
    } catch {
      flash(lab.importBad);
    }
  };

  const picture = (kind: "png" | "svg") => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) return;
    if (kind === "svg") downloadSvg(svg, "mufassall-lab");
    else void downloadPng(svg, "mufassall-lab").catch(() => flash(lab.importBad));
  };

  const copyText = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => flash(lab.copied))
      .catch(() => {
        /* the text stays selectable in the dialog */
      });
  };

  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  const checks = useMemo(() => (challenge ? challenge.rules.map((r) => checkRule(doc, r)) : []), [challenge, doc]);
  const allPass = checks.length > 0 && checks.every(Boolean);
  useEffect(() => {
    if (!allPass || !challenge || solved.includes(challenge.id)) return;
    const next = [...solved, challenge.id];
    setSolved(next);
    store.set(SOLVED_KEY, JSON.stringify(next));
  }, [allPass, challenge, solved]);
  const startChallenge = (id: string) => {
    setChallengeId(id);
    const c = CHALLENGES.find((x) => x.id === id);
    if (!c) return;
    const d = c.start();
    // labels in the reader's language
    for (const n of Object.values(d.nodes)) d.labels[n.id] = lab.kinds[n.kind];
    commit(d);
    setSel(null);
    setSim(true);
    setSpike(false);
    // the traffic slider starts at the load the challenge asks for
    const target = c.rules.find((r) => r.kind === "load" || r.kind === "survive");
    if (target && "rps" in target) setRps(target.rps);
  };
  const ruleText = (r: Rule) => {
    const pct = (v: number) => num(v * 100, Number.isInteger(Math.round(v * 1000) / 10) ? 0 : 1);
    switch (r.kind) {
      case "load":
        return fill(r.ms === undefined ? lab.ruleLoad : lab.ruleLoadMs, { rps: num(r.rps), err: pct(r.errors), ms: r.ms ?? 0 });
      case "count":
        return fill(lab.ruleCount, { n: r.min, kind: lab.kinds[r.node] });
      case "via":
        return fill(lab.ruleVia, { from: lab.kinds[r.from], to: lab.kinds[r.to], via: lab.kinds[r.via] });
      case "survive":
        return fill(lab.ruleSurvive, { kind: lab.kinds[r.node], rps: num(r.rps), err: pct(r.errors) });
    }
  };

  const result = useMemo(() => (sim ? simulate(doc, spike ? rps * 10 : rps) : null), [doc, sim, rps, spike]);
  const scene = useMemo(() => toScene(result ? simView(doc, result) : doc), [doc, result]);
  const num = (v: number, d = 0) => formatNumber(v, lang, d);
  const node = sel?.type === "node" ? doc.nodes[sel.id] : undefined;
  const edgeSel = sel?.type === "edge" ? doc.edges[sel.id] : undefined;
  const count = nodeCount(doc);

  const hint =
    tool.mode === "place"
      ? fill(lab.hintPlace, { kind: lab.kinds[tool.kind] })
      : tool.mode === "connect"
        ? tool.from && doc.nodes[tool.from]
          ? fill(lab.hintConnectTo, { from: doc.labels[tool.from] ?? tool.from })
          : lab.hintConnectFrom
        : lab.hintSelect;

  return (
    <div className="mf-lab">
      <aside className="mf-lab__palette" aria-label={lab.palette}>
        <h2>{lab.palette}</h2>
        <p className="mf-lab__muted">{lab.paletteHint}</p>
        <ul>
          {NODE_KINDS.map((k) => (
            <li key={k}>
              <button
                type="button"
                className={`mf-lab__kind mf-lab__kind--${k}`}
                aria-pressed={tool.mode === "place" && tool.kind === k}
                onClick={(e) => {
                  // keyboard (detail 0): drop it on the nearest free cell, ready to move with the arrows
                  if (e.detail === 0) {
                    const cell = freeCell(doc, CENTER);
                    if (cell) addNode(k, cell);
                    setTool({ mode: "select" });
                    return;
                  }
                  setTool(tool.mode === "place" && tool.kind === k ? { mode: "select" } : { mode: "place", kind: k });
                }}
              >
                <span className="mf-lab__swatch" aria-hidden="true" />
                {lab.kinds[k]}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="mf-lab__stage" aria-label={lab.stageLabel}>
        <div className="mf-lab__bar">
          <div className="mf-lab__group">
            <button type="button" className="mf-btn" aria-pressed={tool.mode === "select"} onClick={() => setTool({ mode: "select" })}>
              {lab.select}
            </button>
            <button
              type="button"
              className="mf-btn"
              aria-pressed={tool.mode === "connect"}
              aria-keyshortcuts="C"
              onClick={() => setTool(tool.mode === "connect" ? { mode: "select" } : { mode: "connect" })}
            >
              {lab.connect}
            </button>
          </div>
          <div className="mf-lab__group">
            <button type="button" className="mf-btn" onClick={undo} disabled={hist.past.length === 0} aria-keyshortcuts="Control+Z">
              {lab.undo}
            </button>
            <button type="button" className="mf-btn" onClick={redo} disabled={hist.future.length === 0} aria-keyshortcuts="Control+Y">
              {lab.redo}
            </button>
            <button type="button" className="mf-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? lab.play : lab.pause}
            </button>
          </div>
          <div className="mf-lab__group">
            <button type="button" className="mf-btn mf-btn--sim" aria-pressed={sim} aria-keyshortcuts="S" onClick={() => setSim((v) => !v)}>
              {lab.simulate}
            </button>
          </div>
        </div>
        {sim && result && (
          <div className="mf-lab__sim">
            <label className="mf-lab__traffic">
              <span>{fill(lab.traffic, { n: num(spike ? rps * 10 : rps) })}</span>
              <input name="traffic" type="range" min={0} max={100} step={1} value={fromRps(rps)} onChange={(e) => setRps(toRps(Number(e.currentTarget.value)))} />
            </label>
            <button type="button" className="mf-btn" aria-pressed={spike} onClick={() => setSpike((v) => !v)}>
              {lab.spike}
            </button>
            <dl className="mf-lab__simstats" aria-live="polite">
              <div>
                <dt>{lab.simOk}</dt>
                <dd>{num(result.ok)}/s</dd>
              </div>
              <div className={result.errorRate > 0.001 ? "is-bad" : undefined}>
                <dt>{lab.simErrors}</dt>
                <dd>{num(result.errorRate * 100, result.errorRate > 0 && result.errorRate < 0.1 ? 1 : 0)}%</dd>
              </div>
              <div className={result.ms > 500 ? "is-bad" : undefined}>
                <dt>{lab.simLatency}</dt>
                <dd>~{num(result.ms)} ms</dd>
              </div>
            </dl>
            {result.hot.length > 0 && <p className="mf-lab__simhot">{fill(lab.simHot, { list: result.hot.map((id) => doc.labels[id] ?? id).join(", ") })}</p>}
            <p className="mf-lab__muted mf-lab__simnote">{lab.simNote}</p>
          </div>
        )}
        <p className="mf-lab__hint" aria-live="polite">
          {hint}
        </p>
        <div ref={canvasRef} className={`mf-lab__canvas mf-lab__canvas--${tool.mode}`}>
          <Scene state={scene} box={BOX} labels={doc.labels} title={lab.stageLabel} paused={paused} reduced={reduced} runKey={0} edit={edit} />
          {count === 0 && <p className="mf-lab__empty">{lab.empty}</p>}
        </div>
        <p className="mf-keys">{lab.keys}</p>
      </section>

      <aside className="mf-lab__side">
        <div className="mf-panel__card mf-lab__challenge">
          <h2 id="mf-lab-challenges">{lab.challenges}</h2>
          <select name="challenge" aria-labelledby="mf-lab-challenges" value={challengeId} onChange={(e) => (e.currentTarget.value ? startChallenge(e.currentTarget.value) : setChallengeId(""))}>
              <option value="">{lab.challengeFree}</option>
              {CHALLENGES.map((c) => (
                <option key={c.id} value={c.id}>
                  {solved.includes(c.id) ? "✓ " : ""}
                  {lab.challengeText[c.id]?.title ?? c.id}
                </option>
              ))}
          </select>
          {challenge && (
            <>
              <p className="mf-lab__muted">{lab.challengeText[challenge.id]?.brief}</p>
              <ul className="mf-lab__rules">
                {challenge.rules.map((r, i) => (
                  <li key={i} className={checks[i] ? "is-ok" : undefined}>
                    <span aria-hidden="true">{checks[i] ? "✓" : "○"}</span> {ruleText(r)}
                  </li>
                ))}
              </ul>
              <p className="mf-lab__goal" role="status">
                {allPass ? lab.challengeDone : ""}
              </p>
              <button type="button" className="mf-btn" onClick={() => startChallenge(challenge.id)}>
                {lab.challengeRestart}
              </button>
            </>
          )}
        </div>
        <div className="mf-panel__card">
          {node ? (
            <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
              <h2>{lab.node}</h2>
              {result?.nodes[node.id] && result.nodes[node.id]!.rps > 0 && (
                <p className="mf-lab__simnode">
                  {fill(lab.simNode, {
                    rps: num(result.nodes[node.id]!.rps),
                    rho: num(Math.round(result.nodes[node.id]!.rho * 100)),
                    ms: num(result.nodes[node.id]!.ms),
                  })}
                </p>
              )}
              <label>
                {lab.label}
                <input name="label"
                  value={doc.labels[node.id] ?? ""}
                  maxLength={MAX_LABEL}
                  onChange={(e) => setLabel(node.id, e.currentTarget.value)}
                  onBlur={(e) => {
                    if (!e.currentTarget.value.trim()) setLabel(node.id, lab.kinds[node.kind]);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </label>
              <label>
                {lab.kind}
                <select name="kind" value={node.kind} onChange={(e) => patchNode(node.id, { kind: e.currentTarget.value as NodeKind })}>
                  {NODE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {lab.kinds[k]}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>{lab.state}</legend>
                <div className="mf-lab__seg">
                  {NODE_STATES.map((s) => (
                    <button key={s} type="button" className="mf-btn" aria-pressed={node.state === s} onClick={() => patchNode(node.id, { state: s })}>
                      {ui.states[s]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                {lab.load}: {node.load === undefined ? lab.noLoad : `${node.load}%`}
                <input name="load"
                  type="range"
                  min={-5}
                  max={100}
                  step={5}
                  value={node.load ?? -5}
                  onChange={(e) => {
                    const v = Number(e.currentTarget.value);
                    patchNode(node.id, { load: v < 0 ? undefined : v }, `load:${node.id}`);
                  }}
                />
              </label>
              <button type="button" className="mf-btn mf-btn--danger" onClick={removeSelected}>
                {lab.remove}
              </button>
            </form>
          ) : edgeSel ? (
            <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
              <h2>{lab.edge}</h2>
              <p className="mf-lab__muted">
                {doc.labels[edgeSel.from]} → {doc.labels[edgeSel.to]}
              </p>
              <label>
                {lab.flow}
                <select name="flow" value={edgeSel.flow} onChange={(e) => patchEdge(edgeSel.id, { flow: e.currentTarget.value as never })}>
                  {FLOWS.map((f) => (
                    <option key={f} value={f}>
                      {ui.flows[f]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {lab.rate}: {edgeSel.rate}
                <input name="rate"
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={edgeSel.rate}
                  onChange={(e) => patchEdge(edgeSel.id, { rate: Number(e.currentTarget.value) }, `rate:${edgeSel.id}`)}
                />
              </label>
              <label className="mf-lab__check">
                <input name="cut" type="checkbox" checked={edgeSel.cut} onChange={(e) => patchEdge(edgeSel.id, { cut: e.currentTarget.checked })} />
                {lab.cut}
              </label>
              <div className="mf-lab__seg">
                <button
                  type="button"
                  className="mf-btn"
                  disabled={hasEdge(edgeSel.to, edgeSel.from, edgeSel.id)}
                  onClick={() => patchEdge(edgeSel.id, { from: edgeSel.to, to: edgeSel.from })}
                >
                  {lab.reverse}
                </button>
                <button type="button" className="mf-btn mf-btn--danger" onClick={removeSelected}>
                  {lab.remove}
                </button>
              </div>
            </form>
          ) : (
            <p className="mf-lab__muted">{lab.nothing}</p>
          )}
        </div>

        <div className="mf-panel__card mf-lab__file">
          <button type="button" className="mf-btn mf-btn--primary" onClick={share}>
            {lab.share}
          </button>
          <button type="button" className="mf-btn" onClick={() => setDialog({ kind: "code", text: toLessonCode(doc) })}>
            {lab.code}
          </button>
          <div className="mf-lab__seg">
            <button type="button" className="mf-btn" onClick={() => picture("png")}>
              {lab.exportPng}
            </button>
            <button type="button" className="mf-btn" onClick={() => picture("svg")}>
              {lab.exportSvg}
            </button>
          </div>
          <button type="button" className="mf-btn" onClick={exportJson}>
            {lab.exportJson}
          </button>
          <button type="button" className="mf-btn" onClick={() => fileRef.current?.click()}>
            {lab.importJson}
          </button>
          <input name="import"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void importJson(f);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className="mf-btn"
            onClick={() => {
              commit(example(lab));
              setSel(null);
            }}
          >
            {lab.example}
          </button>
          <button
            type="button"
            className="mf-btn mf-btn--danger"
            onClick={() => {
              // undo brings it back, so no confirmation prompt
              commit(emptyDoc());
              setSel(null);
            }}
          >
            {lab.clear}
          </button>
        </div>
      </aside>

      <dialog ref={dialogRef} className="mf-lab__dialog" aria-label={dialog?.kind === "link" ? lab.shareTitle : lab.codeTitle} onClose={() => setDialog(null)}>
        {dialog && (
          <div className="mf-panel__card">
            <h2>{dialog.kind === "link" ? lab.shareTitle : lab.codeTitle}</h2>
            {dialog.kind === "link" ? (
              <textarea name="share" className="mf-lab__link" readOnly value={dialog.text} rows={4} onFocus={(e) => e.currentTarget.select()} />
            ) : (
              <pre className="mf-wire__code">
                <code>{dialog.text}</code>
              </pre>
            )}
            <div className="mf-lab__seg">
              <button type="button" className="mf-btn mf-btn--primary" onClick={() => copyText(dialog.text)}>
                {lab.copy}
              </button>
              <button type="button" className="mf-btn" onClick={() => setDialog(null)}>
                {lab.close}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <div className="mf-lab__toast" role="status" aria-live="polite" data-show={toast ? "" : undefined}>
        {toast?.text}
        {toast?.restore && (
          <button type="button" className="mf-btn" onClick={restoreOwn}>
            {lab.restore}
          </button>
        )}
      </div>
    </div>
  );
}
