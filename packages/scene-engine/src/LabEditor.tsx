import { FLOWS, NODE_KINDS, NODE_STATES, type NodeKind } from "@mufassall/scene-schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadPng, downloadSvg } from "./export";
import { toMermaidFlowchart } from "./textexport";
import { type Box, gridBounds, rectBounds } from "./iso";
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
import { KeyHint, useShortcuts } from "./keys";
import { Scene, type SceneEdit } from "./Scene";
import { UNIT_PRICES, addReplica, checkSlo, monthlyCost, replicaTradeoff, simView, simulate } from "./sim";
import {
  EXPERIMENT_KINDS,
  type Experiment,
  type ExperimentKind,
  type Finding,
  SLOW_FACTOR,
  SPIKE_FACTOR,
  applyExperiment,
  chaosView,
  defaultExperiment,
  explain,
  isValid,
  kindTargets,
  linkTargets,
  nodeTargets,
} from "./chaos";
import { chaosStrings } from "./chaos-ui";
import { CHALLENGES, type Rule, checkRule } from "./challenges";
import { type LabStrings, type UiStrings, fill, formatNumber } from "./ui";
import { PRACTICE_KEY, parsePractice, practiceSlug, recordSolved, today } from "./practice";
import { practiceStrings } from "./practice-ui";
import { type PracticeLoad, PracticePanel } from "./PracticePanel";
import "./practice.css";
import "./chaos.css";

const STORE_KEY = "mufassall:v1:lab";
const SOLVED_KEY = "mufassall:v1:lab:solved";
/** the reader's own diagram, kept when a shared link replaces it */
const PREV_KEY = "mufassall:v1:lab:prev";
/** encoded copy of the last diagram that came from outside (link, example, challenge); anything else is the reader's own */
const LINKED_KEY = "mufassall:v1:lab:linked";
/** the reader's SLO targets, a per-viewer convenience */
const SLO_KEY = "mufassall:v1:lab:slo";
const SLO_TARGETS = [0.99, 0.995, 0.999, 0.9995, 0.9999];
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
type Dialog = { kind: "code"; text: string } | { kind: "link"; text: string } | { kind: "gallery"; text: string } | null;
const MAX_GALLERY_LINK = 8000;

/** Send the diagram to the moderated public gallery (POST /api/gallery). */
function GalleryForm({ lab, lang, link, onDone }: { lab: LabStrings; lang: string; link: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "fail" | "busy">("idle");
  if (status === "sent")
    return (
      <>
        <p role="status">{lab.gallerySent}</p>
        <div className="mf-lab__seg">
          <button type="button" className="mf-btn mf-btn--primary" onClick={onDone}>
            {lab.close}
          </button>
        </div>
      </>
    );
  return (
    <form
      className="mf-lab__form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setStatus("sending");
        try {
          const r = await fetch("/api/gallery", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: title.trim().slice(0, 80), lang, link, ...(author.trim() ? { author: author.trim().slice(0, 40) } : {}) }),
          });
          setStatus(r.ok ? "sent" : r.status === 429 ? "busy" : "fail");
        } catch {
          setStatus("fail");
        }
      }}
    >
      <p className="mf-lab__muted">{lab.galleryNote}</p>
      <label>
        <span>{lab.galleryName}</span>
        <input name="gallery-title" required maxLength={80} value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
      </label>
      <label>
        <span>{lab.galleryAuthor}</span>
        <input name="gallery-author" maxLength={40} value={author} onInput={(e) => setAuthor(e.currentTarget.value)} />
      </label>
      {(status === "fail" || status === "busy") && <p className="mf-lab__simhot" role="status">{status === "busy" ? lab.galleryBusy : lab.galleryFail}</p>}
      <div className="mf-lab__seg">
        <button type="submit" className="mf-btn mf-btn--primary" disabled={status === "sending" || !title.trim()}>
          {lab.gallerySend}
        </button>
        <button type="button" className="mf-btn" onClick={onDone}>
          {lab.close}
        </button>
      </div>
    </form>
  );
}

/** A phone shows the diagram, not the whole 13×13 area: nodes plus two free cells around them. */
function fitBox(d: LabDoc): Box {
  const ns = Object.values(d.nodes);
  if (ns.length === 0) return rectBounds(3, 3, 9, 9);
  const clamp = (v: number) => Math.max(GRID_MIN, Math.min(GRID_MAX, v));
  let [x0, x1] = [Math.min(...ns.map((n) => n.at[0])) - 2, Math.max(...ns.map((n) => n.at[0])) + 2];
  let [y0, y1] = [Math.min(...ns.map((n) => n.at[1])) - 2, Math.max(...ns.map((n) => n.at[1])) + 2];
  // at least 7 cells across, so a lone node is not blown up to fill the phone
  const grow = (a: number, b: number): [number, number] => {
    const need = Math.max(0, 6 - (b - a));
    return [a - Math.ceil(need / 2), b + Math.floor(need / 2)];
  };
  [x0, x1] = grow(x0, x1);
  [y0, y1] = grow(y0, y1);
  return rectBounds(clamp(x0), clamp(y0), clamp(x1), clamp(y1));
}

function useNarrow(query = "(max-width: 640px)") {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(query);
    const sync = () => setOn(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);
  return on;
}

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
/** The reader's own work: not empty and not an untouched copy of something loaded from outside. */
const isOwn = (d: LabDoc | undefined): d is LabDoc => !!d && nodeCount(d) > 0 && encodeDoc(d) !== store.get(LINKED_KEY);

/**
 * Put `next` (from a link, the example, a challenge, a file) in place of `current`. The reader's own
 * diagram is backed up first, and only theirs: a second link must not overwrite the backup with the first link.
 * Returns whether something was backed up.
 */
function backupFor(current: LabDoc | undefined, next: LabDoc): boolean {
  const own = isOwn(current) && encodeDoc(current) !== encodeDoc(next);
  if (own) store.set(PREV_KEY, JSON.stringify(current));
  store.set(LINKED_KEY, nodeCount(next) > 0 ? encodeDoc(next) : "");
  return own;
}

/** `#d=…` from the address bar, removed from it so a reload shows the newest edits. */
function takeLink(): LabDoc | null {
  const code = new URLSearchParams(window.location.hash.slice(1)).get("d");
  if (!code) return null;
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  const linked = decodeDoc(code);
  // a truncated or broken link decodes to nothing: keep what the reader had
  return nodeCount(linked) > 0 ? linked : null;
}

/** a practice keeps its own canvas per lesson, so it never touches the reader's free diagram */
const practiceDocKey = (slug: string) => `mufassall:v1:lab:practice:${slug}`;

function initial(lab: LabStrings, practice: string | null): { doc: LabDoc; before?: LabDoc; fromLink: boolean } {
  if (practice) {
    try {
      const raw = store.get(practiceDocKey(practice));
      return { doc: raw ? sanitize(JSON.parse(raw)) : emptyDoc(), fromLink: false };
    } catch {
      return { doc: emptyDoc(), fromLink: false };
    }
  }
  const raw = store.get(STORE_KEY);
  let saved: LabDoc | undefined;
  try {
    if (raw) saved = sanitize(JSON.parse(raw));
  } catch {
    /* corrupted entry: ignore */
  }
  const linked = takeLink();
  if (linked) {
    const backed = backupFor(saved, linked);
    return { doc: linked, before: backed ? saved : undefined, fromLink: true };
  }
  if (saved) return { doc: saved, fromLink: false };
  const ex = example(lab);
  store.set(LINKED_KEY, encodeDoc(ex));
  return { doc: ex, fromLink: false };
}

export interface LabEditorProps {
  ui: UiStrings;
  lab: LabStrings;
}

export function LabEditor({ ui, lab }: LabEditorProps) {
  const [practice] = useState(() => practiceSlug(window.location.search));
  const [first] = useState(() => initial(lab, practice));
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
  const [keysOn, toggleKeys] = useShortcuts();
  const narrow = useNarrow();
  const [whole, setWhole] = useState(false);
  const viewRef = useRef<Box>(BOX);
  const [sim, setSim] = useState(false);
  const [rps, setRps] = useState(800);
  /** the running chaos experiment: an overlay on the diagram, never part of it or of the undo history */
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [chaosKind, setChaosKind] = useState<ExperimentKind>("killNode");
  const [chaosTarget, setChaosTarget] = useState("");
  const [slo, setSlo] = useState<{ availability: number; p95: number }>(() => {
    try {
      const v = JSON.parse(store.get(SLO_KEY) ?? "null") as { availability?: unknown; p95?: unknown } | null;
      const a = SLO_TARGETS.includes(v?.availability as number) ? (v!.availability as number) : 0.999;
      const p = typeof v?.p95 === "number" && v.p95 >= 1 && v.p95 <= 60000 ? v.p95 : 300;
      return { availability: a, p95: p };
    } catch {
      return { availability: 0.999, p95: 300 };
    }
  });
  useEffect(() => store.set(SLO_KEY, JSON.stringify(slo)), [slo]);
  const lang = (typeof document !== "undefined" && document.documentElement.lang) || "en";
  const estimateHref = `/${lang}/tools/estimate/`;
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
    store.set(practice ? practiceDocKey(practice) : STORE_KEY, JSON.stringify(doc));
  }, [doc, practice]);

  const ps = practiceStrings(lang);
  const [pload, setPload] = useState<PracticeLoad>({ status: "loading" });
  useEffect(() => {
    if (!practice) return;
    let live = true;
    fetch(`/${lang}/practice/${practice}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: unknown) => {
        const file = parsePractice(raw, practice);
        if (live) setPload(file ? { status: "ok", file } : { status: "fail" });
      })
      .catch(() => live && setPload({ status: "fail" }));
    return () => {
      live = false;
    };
  }, [practice, lang]);
  const [practiceDone, setPracticeDone] = useState<string | undefined>(() => {
    if (!practice) return undefined;
    try {
      const v = JSON.parse(store.get(PRACTICE_KEY) ?? "{}") as Record<string, unknown>;
      return typeof v[practice] === "string" ? (v[practice] as string) : undefined;
    } catch {
      return undefined;
    }
  });
  /** after "show solution" a pass is not recorded as solved (until the next visit) */
  const [peeked, setPeeked] = useState(false);

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

  /** Swap in a diagram from outside; the reader's own one is backed up with a "restore" toast. */
  const replaceDoc = (next: LabDoc, note?: string) => {
    // a practice canvas is its own; undo brings it back, and the free diagram's backup stays untouched
    const backed = practice ? false : backupFor(doc, next);
    commit(next);
    setSel(null);
    window.clearTimeout(toastTimer.current);
    if (backed) {
      setToast({ text: note ?? lab.backedUp, restore: true });
      toastTimer.current = window.setTimeout(() => setToast(null), 9000);
    } else if (note) flash(note);
  };

  // a link pasted into an open Lab tab only changes the hash
  useEffect(() => {
    const onHash = () => {
      const linked = takeLink();
      if (linked) replaceDoc(linked, lab.linkLoaded);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  });

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
      } else if (!keysOn) return;
      else if (!mod && !e.altKey && (e.key === "c" || e.key === "C")) setTool((t0) => (t0.mode === "connect" ? { mode: "select" } : { mode: "connect" }));
      else if (e.key === " " && !onControl && !t?.closest?.(".mf-node")) setPaused((p) => !p);
      else if (!mod && !e.altKey && (e.key === "s" || e.key === "S")) setSim((v) => !v);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeSelected, keysOn]);

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
      replaceDoc(next);
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
    replaceDoc(d);
    setSim(true);
    setExperiment(null);
    // the traffic slider starts at the load the challenge asks for
    const target = c.rules.find((r) => r.kind === "load" || r.kind === "survive");
    if (target && "rps" in target) setRps(target.rps);
  };
  const pfile = pload.status === "ok" ? pload.file : null;
  const pchecks = useMemo(() => (pfile ? pfile.rules.map((r) => checkRule(doc, r)) : []), [pfile, doc]);
  const pAll = pchecks.length > 0 && pchecks.every(Boolean);
  useEffect(() => {
    if (!practice || !pAll || peeked) return;
    const day = today();
    if (practiceDone === day) return;
    store.set(PRACTICE_KEY, JSON.stringify(recordSolved(store.get(PRACTICE_KEY), practice, day)));
    setPracticeDone(day);
  }, [practice, pAll, peeked, practiceDone]);
  const showSolution = () => {
    if (!pfile) return;
    setPeeked(true);
    replaceDoc(sanitize(pfile.solution), ps.solutionShown);
  };

  const ruleText = (r: Rule) => {
    const pct = (v: number) => num(v * 100, Number.isInteger(Math.round(v * 1000) / 10) ? 0 : 1);
    switch (r.kind) {
      case "load":
        return fill(r.ms === undefined ? lab.ruleLoad : lab.ruleLoadMs, { rps: num(r.rps), err: pct(r.errors), ms: r.ms ?? 0 });
      case "count":
        return r.max === 0 ? fill(lab.ruleNone, { kind: lab.kinds[r.node] }) : fill(lab.ruleCount, { n: r.min, kind: lab.kinds[r.node] });
      case "via":
        return fill(lab.ruleVia, { from: lab.kinds[r.from], to: lab.kinds[r.to], via: lab.kinds[r.via] });
      case "survive":
        return fill(lab.ruleSurvive, { kind: lab.kinds[r.node], rps: num(r.rps), err: pct(r.errors) });
      case "path":
        return fill(ps.rulePath, { path: r.kinds.map((k) => lab.kinds[k]).join(" → ") });
      case "noEdge":
        return fill(ps.ruleNoEdge, { from: lab.kinds[r.from], to: lab.kinds[r.to] });
      case "link":
        return fill(ps.ruleLink, { from: lab.kinds[r.from], to: lab.kinds[r.to] });
    }
  };

  const cs = chaosStrings(lang);
  const running = sim && experiment && isValid(doc, experiment) ? experiment : null;
  const spike = running?.kind === "spike";
  // an edit or undo that removes the experiment's target, or switching the model off, ends it
  useEffect(() => {
    if (experiment && (!sim || !isValid(doc, experiment))) setExperiment(null);
  }, [experiment, sim, doc]);
  const calm = useMemo(() => (sim ? simulate(doc, rps) : null), [doc, sim, rps]);
  const applied = useMemo(() => (running ? applyExperiment(doc, running, rps) : null), [doc, running, rps]);
  const result = useMemo(() => (applied ? simulate(applied.doc, applied.rps, applied.opts) : calm), [applied, calm]);
  const report = useMemo(() => (applied && calm && result ? explain(applied, calm, result) : null), [applied, calm, result]);
  const scene = useMemo(
    () => toScene(result ? (applied ? chaosView(simView(applied.doc, result), applied) : simView(doc, result)) : doc),
    [doc, result, applied],
  );
  const verdict = result ? checkSlo(result, slo) : null;
  const cost = useMemo(() => (result ? monthlyCost(doc, result) : null), [doc, result]);
  // under an experiment the trade-off answers "would one more node have saved it?"
  const trade = useMemo(
    () => (sim ? replicaTradeoff(applied?.doc ?? doc, applied?.rps ?? rps, applied?.opts ?? {}) : null),
    [sim, applied, doc, rps],
  );
  const num = (v: number, d = 0) => formatNumber(v, lang, d);
  const pctOf = (v: number) => num(v * 100, v > 0 && v < 1 ? (v >= 0.99 ? 2 : 1) : 0);
  const money = (v: number) => num(v, v > 0 && v < 10 ? 2 : 0);
  const name = (id: string) => doc.labels[id] ?? id;

  /** what the picker would run now: the chosen target if it still exists, else the busiest one */
  const pick = useMemo((): Experiment | null => {
    const fallback = defaultExperiment(doc, chaosKind, calm ?? undefined);
    if (!fallback || !chaosTarget) return fallback;
    const exp: Experiment =
      chaosKind === "killKind"
        ? { kind: "killKind", node: chaosTarget as NodeKind }
        : chaosKind === "killNode" || chaosKind === "slowNode" || chaosKind === "cutLink"
          ? { kind: chaosKind, target: chaosTarget }
          : fallback;
    return isValid(doc, exp) ? exp : fallback;
  }, [doc, chaosKind, chaosTarget, calm]);
  const targetOf = (e: Experiment | null) => (!e ? "" : "target" in e ? e.target : e.kind === "killKind" ? e.node : "");
  const targetOptions: { value: string; text: string }[] =
    chaosKind === "killNode" || chaosKind === "slowNode"
      ? nodeTargets(doc).map((id) => ({ value: id, text: name(id) }))
      : chaosKind === "cutLink"
        ? linkTargets(doc).map((id) => ({ value: id, text: `${name(doc.edges[id]!.from)} → ${name(doc.edges[id]!.to)}` }))
        : chaosKind === "killKind"
          ? kindTargets(doc).map((k) => ({ value: k, text: lab.kinds[k] }))
          : [];
  const runPicked = () => {
    if (!pick) return;
    if (!sim) setSim(true);
    setExperiment(pick);
  };
  const toggleSpike = () => setExperiment(spike ? null : { kind: "spike" });
  const findingText = (f: Finding) => {
    switch (f.type) {
      case "down":
        return f.lost > 0 ? fill(cs.down, { name: name(f.id), lost: num(f.lost) }) : fill(cs.downRouted, { name: name(f.id) });
      case "cold":
        return fill(cs.cold, { name: name(f.id), rps: num(f.through) });
      case "slow":
        return fill(cs.slow, { name: name(f.id), x: SLOW_FACTOR, ms: num(f.ms) });
      case "spike":
        return fill(cs.spike, { x: SPIKE_FACTOR, rps: num(f.rps) });
      case "cut": {
        const e = doc.edges[f.edge];
        return fill(cs.cut, { from: e ? name(e.from) : "?", to: e ? name(e.to) : "?", lost: num(f.lost) });
      }
      case "overload":
        return fill(cs.overload, { name: name(f.id), pct: num(f.rho * 100) });
      case "stranded":
        return fill(cs.stranded, { name: name(f.id), lost: num(f.lost) });
      case "latency":
        return fill(cs.latency, { before: num(f.before), after: num(f.after) });
      case "nothing":
        return cs.nothing;
    }
  };
  /** a real edit (undoable), unlike the experiment overlay */
  const addTradeReplica = () => {
    const t = trade && doc.nodes[trade.target];
    if (!trade || !t) return;
    const n = Object.values(doc.nodes).filter((x) => x.kind === t.kind).length + 1;
    const copy = addReplica(doc, trade.target, `${lab.kinds[t.kind]} ${n}`);
    if (!copy) return flash(lab.limit);
    commit(copy.doc);
    setSel({ type: "node", id: copy.id });
  };

  const node = sel?.type === "node" ? doc.nodes[sel.id] : undefined;
  const edgeSel = sel?.type === "edge" ? doc.edges[sel.id] : undefined;
  const count = nodeCount(doc);
  // the camera follows the diagram on a phone, but never while a node is being dragged
  const fit = narrow && !whole;
  if (!drag.current?.moved && tool.mode !== "place") viewRef.current = fit ? fitBox(doc) : BOX;
  if (!fit) viewRef.current = BOX;
  const view = viewRef.current;

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
            {narrow && (
              <button type="button" className="mf-btn" aria-pressed={whole} onClick={() => setWhole((v) => !v)}>
                {lab.wholeGrid}
              </button>
            )}
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
              <span>{fill(lab.traffic, { n: num(applied?.rps ?? rps) })}</span>
              <input name="traffic" type="range" min={0} max={100} step={1} value={fromRps(rps)} onChange={(e) => setRps(toRps(Number(e.currentTarget.value)))} />
            </label>
            <button type="button" className="mf-btn" aria-pressed={spike} onClick={toggleSpike}>
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
              {verdict && (
                <div className={verdict.ok ? "is-ok" : "is-bad"}>
                  <dt>SLO</dt>
                  <dd>
                    {verdict.ok ? "✓" : "✗"} {pctOf(result.availability)}%
                  </dd>
                </div>
              )}
            </dl>
            {applied && running && (
              <div className="mf-chaos__active" role="status">
                <span>
                  <strong>{fill(cs.active, { name: cs.names[running.kind] })}</strong> {cs.activeNote}
                </span>
                <button type="button" className="mf-btn mf-btn--danger" onClick={() => setExperiment(null)}>
                  {cs.stop}
                </button>
              </div>
            )}
            {result.hot.length > 0 && <p className="mf-lab__simhot">{fill(lab.simHot, { list: result.hot.map((id) => doc.labels[id] ?? id).join(", ") })}</p>}
            <p className="mf-lab__muted mf-lab__simnote">{lab.simNote}</p>
          </div>
        )}
        <p className="mf-lab__hint" aria-live="polite">
          {hint}
        </p>
        <div ref={canvasRef} className={`mf-lab__canvas mf-lab__canvas--${tool.mode}`}>
          <Scene state={scene} box={view} labels={doc.labels} title={lab.stageLabel} paused={paused} reduced={reduced} runKey={0} edit={edit} />
          {count === 0 && <p className="mf-lab__empty">{lab.empty}</p>}
        </div>
        <KeyHint text={lab.keys} on={keysOn} toggle={toggleKeys} labels={{ on: ui.keysOn, off: ui.keysOff }} />
      </section>

      <aside className="mf-lab__side">
        {practice ? (
          <PracticePanel
            ps={ps}
            lab={lab}
            lang={lang}
            slug={practice}
            load={pload}
            checks={pchecks}
            ruleText={ruleText}
            solvedOn={practiceDone}
            onSolution={showSolution}
            onStartOver={() => replaceDoc(emptyDoc())}
          />
        ) : (
        <div className={`mf-panel__card mf-lab__challenge${challenge ? " mf-lab__challenge--on" : ""}`}>
          <h2 id="mf-lab-challenges">{lab.challenges}</h2>
          <select name="challenge" aria-labelledby="mf-lab-challenges" value={challengeId} onChange={(e) => (e.currentTarget.value ? startChallenge(e.currentTarget.value) : setChallengeId(""))}>
              <option value="">{lab.challengeFree}</option>
              {[false, true].map((iv) => (
                <optgroup key={String(iv)} label={iv ? lab.interviews : lab.challenges}>
                  {CHALLENGES.filter((c) => !!c.interview === iv).map((c) => (
                    <option key={c.id} value={c.id}>
                      {solved.includes(c.id) ? "✓ " : ""}
                      {lab.challengeText[c.id]?.title ?? c.id}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
          {challenge && (
            <>
              <p className="mf-lab__muted">{lab.challengeText[challenge.id]?.brief}</p>
              {challenge.interview && estimateHref && (
                <p className="mf-lab__muted">
                  <a href={estimateHref}>{lab.estimateLink}</a>
                </p>
              )}
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
        )}
        {sim && result && (
          <section className={`mf-panel__card mf-chaos${applied ? " mf-chaos--on" : ""}`} aria-labelledby="mf-chaos-h">
            <h2 id="mf-chaos-h">{cs.heading}</h2>
            <p className="mf-lab__muted">{cs.lead}</p>
            <div className="mf-lab__form">
              <label>
                <span>{cs.experiment}</span>
                <select
                  name="chaos-kind"
                  value={chaosKind}
                  onChange={(e) => {
                    setChaosKind(e.currentTarget.value as ExperimentKind);
                    setChaosTarget("");
                  }}
                >
                  {EXPERIMENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {cs.names[k]}
                    </option>
                  ))}
                </select>
              </label>
              {targetOptions.length > 0 && (
                <label>
                  <span>{cs.target}</span>
                  <select name="chaos-target" value={targetOf(pick)} onChange={(e) => setChaosTarget(e.currentTarget.value)}>
                    {targetOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.text}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <p className="mf-lab__muted mf-chaos__about">{cs.about[chaosKind]}</p>
            <div className="mf-lab__seg">
              <button type="button" className="mf-btn mf-btn--primary" disabled={!pick} onClick={runPicked}>
                {cs.run}
              </button>
              {applied && (
                <button type="button" className="mf-btn" onClick={() => setExperiment(null)}>
                  {cs.stop}
                </button>
              )}
            </div>
            {!pick && <p className="mf-lab__muted">{cs.noTargets}</p>}
            {report && (
              <div className="mf-chaos__report" aria-live="polite">
                <p className={`mf-chaos__verdict ${report.survived ? "is-ok" : "is-bad"}`}>
                  {fill(report.survived ? cs.survived : cs.broke, { err: pctOf(report.errorRate), av: pctOf(report.availability) })}
                </p>
                <h3>{cs.whatBroke}</h3>
                <ul className="mf-chaos__findings">
                  {report.findings.map((f, i) => (
                    <li key={i} className={`mf-chaos__finding mf-chaos__finding--${f.type}`}>
                      {findingText(f)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
        {sim && result && verdict && (
          <section className={`mf-panel__card mf-chaos mf-slo ${verdict.ok ? "mf-slo--ok" : "mf-slo--bad"}`} aria-labelledby="mf-slo-h">
            <h2 id="mf-slo-h">{cs.sloHeading}</h2>
            <div className="mf-lab__form mf-slo__targets">
              <label>
                <span>{cs.sloTarget}</span>
                <select
                  name="slo-availability"
                  value={String(slo.availability)}
                  onChange={(e) => setSlo((s) => ({ ...s, availability: Number(e.currentTarget.value) }))}
                >
                  {SLO_TARGETS.map((t) => (
                    <option key={t} value={String(t)}>
                      {pctOf(t)}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{cs.sloP95}</span>
                <input
                  name="slo-p95"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60000}
                  step={10}
                  value={slo.p95}
                  onChange={(e) => {
                    const v = Math.round(Number(e.currentTarget.value));
                    if (Number.isFinite(v) && v >= 1 && v <= 60000) setSlo((s) => ({ ...s, p95: v }));
                  }}
                />
              </label>
            </div>
            <dl className="mf-lab__simstats mf-slo__stats">
              <div className={verdict.availabilityOk ? "is-ok" : "is-bad"}>
                <dt>{cs.sloAvail}</dt>
                <dd>
                  {verdict.availabilityOk ? "✓" : "✗"} {pctOf(result.availability)}%
                </dd>
              </div>
              <div className={verdict.latencyOk ? "is-ok" : "is-bad"}>
                <dt>{cs.sloLatency}</dt>
                <dd>
                  {verdict.latencyOk ? "✓" : "✗"} {result.ok > 0 ? `~${num(result.p95)} ms` : "–"}
                </dd>
              </div>
            </dl>
            <p className="mf-slo__verdict" role="status">
              {verdict.ok ? cs.sloPass : cs.sloFail}
            </p>
            <p className="mf-lab__muted">
              {fill(cs.sloBudget, { min: num(verdict.budget, verdict.budget < 10 ? 1 : 0) })}
              {verdict.burn > 0 && (
                <>
                  <br />
                  <span className={verdict.burn > verdict.budget ? "mf-chaos__bad" : undefined}>
                    {fill(cs.sloBurn, { min: num(verdict.burn, verdict.burn < 10 ? 1 : 0) })}
                  </span>
                </>
              )}
            </p>
            <p className="mf-lab__muted mf-chaos__formula">
              {fill(cs.sloFormula, { path: result.path.map(name).join(" → ") || "–" })}
              {applied ? ` ${cs.sloUnderChaos}` : ""}
            </p>
          </section>
        )}
        {sim && result && cost && (
          <section className="mf-panel__card mf-chaos mf-cost" aria-labelledby="mf-cost-h">
            <h2 id="mf-cost-h">{cs.costHeading}</h2>
            <p className="mf-cost__note">{cs.costNote}</p>
            {cost.lines.length > 0 && (
              <table className="mf-cost__table">
                <thead>
                  <tr>
                    <th scope="col">{cs.costKind}</th>
                    <th scope="col">{cs.costCount}</th>
                    <th scope="col">{cs.costMonth}</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.lines.map((l) => (
                    <tr key={l.kind}>
                      <th scope="row">{lab.kinds[l.kind]}</th>
                      <td>{l.count}</td>
                      <td>${money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mf-cost__total">{fill(cs.costTotal, { n: money(cost.total) })}</p>
            {trade ? (
              <div className="mf-cost__trade">
                <p>
                  {fill(cs.tradeoff, {
                    name: lab.kinds[doc.nodes[trade.target]?.kind ?? "service"],
                    cost: money(trade.after.cost - trade.before.cost),
                    a1: pctOf(trade.before.availability),
                    a2: pctOf(trade.after.availability),
                    p1: num(trade.before.p95),
                    p2: num(trade.after.p95),
                  })}
                </p>
                <button type="button" className="mf-btn" onClick={addTradeReplica}>
                  {cs.tradeoffAdd}
                </button>
              </div>
            ) : (
              <p className="mf-lab__muted">{cs.tradeoffNone}</p>
            )}
            <p className="mf-lab__muted mf-chaos__formula">{cs.costFormula}</p>
            <details className="mf-cost__prices">
              <summary>{cs.costPrices}</summary>
              <ul>
                {NODE_KINDS.filter((k) => {
                  const p = UNIT_PRICES[k];
                  return p.node > 0 || !!p.perMillion || !!p.perGb || !!p.perGbStored;
                }).map((k) => {
                  const p = UNIT_PRICES[k];
                  const parts = [
                    p.node > 0 ? fill(cs.priceNode, { n: money(p.node) }) : "",
                    p.perMillion ? fill(cs.priceMillion, { n: money(p.perMillion) }) : "",
                    p.perGb ? fill(cs.priceGb, { n: money(p.perGb), kb: p.kbPerRequest ?? 0 }) : "",
                    p.perGbStored ? fill(cs.priceStored, { n: num(p.perGbStored, 3), gb: num(p.gbStored ?? 0) }) : "",
                  ].filter(Boolean);
                  return (
                    <li key={k}>
                      <strong>{lab.kinds[k]}</strong>: {parts.join(" + ")}
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        )}
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
          <button
            type="button"
            className="mf-btn"
            disabled={count === 0}
            onClick={() => {
              const link = `/${lang}/lab/#d=${encodeDoc(doc)}`;
              if (link.length > MAX_GALLERY_LINK) return flash(lab.galleryLong);
              setDialog({ kind: "gallery", text: link });
            }}
          >
            {lab.galleryShare}
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
            <button type="button" className="mf-btn" onClick={() => copyText(toMermaidFlowchart(toScene(doc), doc.labels))}>
              {lab.exportMermaid}
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
              replaceDoc(example(lab));
            }}
          >
            {lab.example}
          </button>
          <button
            type="button"
            className="mf-btn mf-btn--danger"
            onClick={() => {
              // undo and the backup bring it back, so no confirmation prompt
              replaceDoc(emptyDoc());
            }}
          >
            {lab.clear}
          </button>
        </div>
      </aside>

      <dialog ref={dialogRef} className="mf-lab__dialog" aria-label={dialog?.kind === "link" ? lab.shareTitle : dialog?.kind === "gallery" ? lab.galleryShare : lab.codeTitle} onClose={() => setDialog(null)}>
        {dialog && (
          <div className="mf-panel__card">
            <h2>{dialog.kind === "link" ? lab.shareTitle : dialog.kind === "gallery" ? lab.galleryShare : lab.codeTitle}</h2>
            {dialog.kind === "gallery" ? (
              <GalleryForm lab={lab} lang={lang} link={dialog.text} onDone={() => setDialog(null)} />
            ) : dialog.kind === "link" ? (
              <textarea name="share" className="mf-lab__link" readOnly value={dialog.text} rows={4} onFocus={(e) => e.currentTarget.select()} />
            ) : (
              <pre className="mf-wire__code">
                <code>{dialog.text}</code>
              </pre>
            )}
            {dialog.kind !== "gallery" && <div className="mf-lab__seg">
              <button type="button" className="mf-btn mf-btn--primary" onClick={() => copyText(dialog.text)}>
                {lab.copy}
              </button>
              <button type="button" className="mf-btn" onClick={() => setDialog(null)}>
                {lab.close}
              </button>
            </div>}
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
