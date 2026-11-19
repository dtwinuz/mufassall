import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EDGE_MODES,
  type EdgeMode,
  type EdgeState,
  FLOWS,
  type Flow,
  LEVELS,
  type LessonInput,
  type LessonText,
  type Level,
  NODE_KINDS,
  NODE_STATES,
  type NodeKind,
  type NodeState,
  STEP_KINDS,
  type StepKind,
  WIRE_FORMATS,
  type WireFormat,
  resolve,
} from "@mufassall/scene-schema";
import { LessonPlayer } from "../LessonPlayer";
import { Scene, type SceneEdit } from "../Scene";
import { gridBounds } from "../iso";
import { freeCell } from "../lab";
import { useReducedMotion } from "../motion";
import { type LabStrings, type UiStrings, fill } from "../ui";
import { AUTHOR_UI, type AuthorStrings } from "./author-ui";
import { BpmnImport } from "./BpmnImport";
import { isBlankDraft } from "./bpmn";
import {
  ALLOWED_UNITS,
  AUTHOR_LANGS,
  type AuthorLang,
  type Draft,
  type DraftExchange,
  type DraftMessage,
  type DraftStep,
  type DraftStepText,
  GRID_MAX,
  addStep,
  allEdgeIds,
  allNodeIds,
  deleteStep,
  duplicateStep,
  editStep,
  emptyMessage,
  fromLesson,
  moveStep,
  newDraft,
  normalize,
  renameEdge,
  renameMetric,
  renameNode,
  sanitizeDraft,
  snapshotOf,
  toLessonInput,
  toLessonText,
  uniqueId,
} from "./model";
import { type StoreError, type SystemMeta, createSystem, draftTitle, listSystems, loadSystem, migrateLegacyDraft, saveSystem } from "./store";
import { LESSON_FILES, type LessonFile, toLessonSource } from "./toLessonSource";
import { type Issue, checkDraft, checkWire } from "./validation";

export { AUTHOR_PAGE, AUTHOR_UI, LIBRARY_PAGE, LIBRARY_UI, type AuthorStrings, type LibraryStrings } from "./author-ui";
export { Library, type LibraryProps } from "./Library";
export {
  SYSTEMS_KEY,
  SYSTEM_KEY_PREFIX,
  SYSTEM_SOURCES,
  type SystemMeta,
  type SystemSource,
  type StoreError,
  type StoreResult,
  type StorageLike,
  listSystems,
  getSystem,
  loadSystem,
  saveSystem,
  createSystem,
  duplicateSystem,
  deleteSystem,
  renameSystem,
  migrateLegacyDraft,
  draftTitle,
} from "./store";
export {
  BUNDLE_FORMAT,
  SHARE_MAX_CHARS,
  type Bundle,
  type BundleSystem,
  makeBundle,
  parseBundle,
  canShare,
  encodeShare,
  type ShareDecoded,
  decodeShare,
  shareCodeFromHash,
  shareUrl,
} from "./bundle";
export * from "./model";
export { toLessonSource, printTs, LESSON_FILES, type LessonFile, type LessonSource } from "./toLessonSource";
export { checkDraft, checkWire, type Issue, type IssueCode } from "./validation";

type Cell = [number, number];
type Tool = { mode: "select" } | { mode: "place"; kind: NodeKind } | { mode: "connect"; from?: string };
type Selection = { type: "node"; id: string } | { type: "edge"; id: string } | null;
type Tab = "edit" | "preview" | "export";
interface History {
  past: Draft[];
  present: Draft;
  future: Draft[];
  tag?: string;
}

export interface AuthorLessonEntry {
  lesson: LessonInput;
  text: Partial<Record<AuthorLang, LessonText<LessonInput>>>;
}

export interface AuthorEditorProps {
  ui: UiStrings;
  lab: LabStrings;
  /** interface language; the text language is chosen inside */
  lang: AuthorLang;
  /** lessons a draft can start from */
  lessons?: readonly { slug: string; title: string }[];
  /** loads one lesson on demand, so the page never ships the whole course */
  loadLesson?: (slug: string) => Promise<AuthorLessonEntry | undefined>;
  /** the system to edit; by default `?system=` of the page URL */
  system?: string | null;
}

const MAX_FILE = 1_000_000;
const BOX = gridBounds(0, GRID_MAX);
const ARROWS: Record<string, Cell> = { ArrowRight: [1, -1], ArrowLeft: [-1, 1], ArrowDown: [1, 1], ArrowUp: [-1, -1] };
const inArea = (c: Cell) => c[0] >= 0 && c[1] >= 0 && c[0] <= GRID_MAX && c[1] <= GRID_MAX;
const taken = (s: DraftStep, at: Cell, except?: string) => Object.values(s.nodes).some((n) => n.id !== except && n.at[0] === at[0] && n.at[1] === at[1]);
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

interface Opened {
  /** `null` when storage is blocked: the editor still works, the file is the only copy */
  id: string | null;
  meta?: SystemMeta;
  draft: Draft;
  notFound: boolean;
  error?: StoreError;
}

/** The asked-for system, else the most recent one, else a new blank one. */
function openSystem(asked: string | null | undefined): Opened {
  migrateLegacyDraft();
  const wanted = asked ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("system") : null);
  const list = listSystems();
  if (wanted) {
    const d = loadSystem(wanted);
    if (d) return { id: wanted, meta: list.find((m) => m.id === wanted), draft: d, notFound: false };
  }
  for (const m of list) {
    const d = loadSystem(m.id);
    if (d) return { id: m.id, meta: m, draft: d, notFound: !!wanted };
  }
  const draft = newDraft();
  const r = createSystem(draft, "blank");
  return r.ok ? { id: r.value.id, meta: r.value, draft, notFound: !!wanted } : { id: null, draft, notFound: !!wanted, error: r.error };
}

function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A text box over structured data (headers, comma lists, lines). It keeps what the author is
 * typing and only takes the outside value when that value really differs, so the cursor never jumps.
 */
function ParsedField<T>({
  value,
  parse,
  print,
  onChange,
  multiline,
  label,
  hint,
  rows = 3,
}: {
  value: T;
  parse: (s: string) => T;
  print: (v: T) => string;
  onChange: (v: T) => void;
  multiline?: boolean;
  label: string;
  hint?: string;
  rows?: number;
}) {
  const [text, setText] = useState(() => print(value));
  const outside = print(value);
  useEffect(() => {
    if (print(parse(text)) !== outside) setText(outside);
    // only an outside change resets the box
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outside]);
  const change = (s: string) => {
    setText(s);
    onChange(parse(s));
  };
  return (
    <label>
      {label}
      {hint && <small className="mf-author__hint">{hint}</small>}
      {multiline ? (
        <textarea rows={rows} value={text} spellCheck={false} onInput={(e) => change(e.currentTarget.value)} />
      ) : (
        <input value={text} spellCheck={false} onInput={(e) => change(e.currentTarget.value)} />
      )}
    </label>
  );
}

const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const printList = (v: string[]) => v.join(", ");
const parseLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const printLines = (v: string[]) => v.join("\n");
const parseHeaders = (s: string): [string, string][] =>
  s
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const at = l.indexOf(":");
      return at < 0 ? [l.trim(), ""] : [l.slice(0, at).trim(), l.slice(at + 1).trim()];
    });
const printHeaders = (v: [string, string][]) => v.map(([k, x]) => `${k}: ${x}`).join("\n");

/** An ID box that renames on Enter or blur and says why when it cannot. */
function IdField({ label, value, onRename, error }: { label: string; value: string; onRename: (next: string) => boolean; error: string }) {
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(value);
    setBad(false);
  }, [value]);
  const apply = () => {
    if (text === value) return setBad(false);
    setBad(!onRename(text.trim()));
  };
  return (
    <label>
      {label}
      <input
        value={text}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={bad || undefined}
        onInput={(e) => setText(e.currentTarget.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
      />
      {bad && (
        <small className="mf-author__bad" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function MessageEditor({ a, msg, onChange }: { a: AuthorStrings; msg: DraftMessage; onChange: (m: DraftMessage) => void }) {
  return (
    <>
      <label>
        {a.format}
        <select value={msg.format} onChange={(e) => onChange({ ...msg, format: e.currentTarget.value as WireFormat })}>
          {WIRE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        {a.head}
        <input value={msg.head} spellCheck={false} onInput={(e) => onChange({ ...msg, head: e.currentTarget.value })} />
      </label>
      <ParsedField label={a.headers} hint={a.headersHint} multiline rows={2} value={msg.headers} parse={parseHeaders} print={printHeaders} onChange={(headers) => onChange({ ...msg, headers })} />
      <label>
        {a.wireBody}
        <textarea rows={4} value={msg.body} spellCheck={false} onInput={(e) => onChange({ ...msg, body: e.currentTarget.value })} />
      </label>
    </>
  );
}

function issueText(a: AuthorStrings, i: Issue): string {
  const msg = fill(a.issue[i.code], { x: i.x ?? "" });
  const where = [i.step !== undefined ? fill(a.stepN, { n: i.step + 1 }) : "", i.lang ? a.langNames[i.lang] : ""].filter(Boolean).join(", ");
  return where ? `${where}: ${msg}` : msg;
}

function previewText(d: Draft, lang: AuthorLang): LessonText<LessonInput> {
  const t = toLessonText(d, lang);
  const steps = t.steps as Record<string, { short: string; title: string; body: string }>;
  for (const s of d.steps) {
    const st = steps[s.id]!;
    if (!st.short.trim()) st.short = s.id;
    if (!st.title.trim()) st.title = s.id;
  }
  const nodes = t.nodes as Record<string, string>;
  for (const id of Object.keys(nodes)) if (!nodes[id]?.trim()) nodes[id] = id;
  const metrics = t.metrics as Record<string, string>;
  for (const id of Object.keys(metrics)) if (!metrics[id]?.trim()) metrics[id] = id;
  if (!t.title.trim()) t.title = d.slug;
  return t;
}

export function AuthorEditor({ ui, lab, lang, lessons = [], loadLesson, system }: AuthorEditorProps) {
  const a = AUTHOR_UI[lang] ?? AUTHOR_UI.en;
  const [opened] = useState(() => openSystem(system));
  const [meta, setMeta] = useState<SystemMeta | undefined>(opened.meta);
  const [storeErr, setStoreErr] = useState<StoreError | undefined>(opened.error);
  const [hist, setHist] = useState<History>(() => ({ past: [], present: opened.draft, future: [] }));
  const draft = hist.present;
  const saved = useRef<Draft>(opened.draft);
  const [cur, setCur] = useState(0);
  const at = Math.min(cur, draft.steps.length - 1);
  const step = draft.steps[at]!;
  const [tab, setTab] = useState<Tab>("edit");
  const [tl, setTl] = useState<AuthorLang>(lang);
  const [tool, setTool] = useState<Tool>({ mode: "select" });
  const [sel, setSel] = useState<Selection>(null);
  const [forward, setForward] = useState(true);
  const [hover, setHover] = useState<Cell | null>(null);
  const [status, setStatus] = useState(opened.notFound ? a.library.notFound : "");
  const storageOk = !storeErr;
  const [pick, setPick] = useState(lessons[0]?.slug ?? "");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<LessonFile>("lesson.ts");
  const drag = useRef<{ id: string; before: Draft; moved: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();
  const idp = "mf-author";

  /** Record a change; repeats with the same `tag` (typing in one box) merge into one undo point. */
  const update = useCallback((fn: (d: Draft) => Draft, tag?: string) => {
    setHist((h) => {
      const next = fn(h.present);
      if (next === h.present) return h;
      if (tag && h.tag === tag) return { ...h, present: next };
      return { past: [...h.past, h.present].slice(-80), present: next, future: [], tag };
    });
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [...h.future, h.present] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future.at(-1)!, future: h.future.slice(0, -1) } : h)), []);
  const replace = (d: Draft) => {
    update(() => d);
    setCur(0);
    setSel(null);
    setTool({ mode: "select" });
  };

  // the address names the system being edited, so reload and "back" land on it
  useEffect(() => {
    if (!opened.id) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("system") === opened.id) return;
    url.searchParams.set("system", opened.id);
    window.history.replaceState(window.history.state, "", url);
  }, [opened.id]);

  // autosave into the system, debounced; a full or blocked storage keeps the editor state as it is
  useEffect(() => {
    if (!opened.id || draft === saved.current) return;
    const id = opened.id;
    const t = window.setTimeout(() => {
      const r = saveSystem(id, draft);
      if (r.ok) {
        saved.current = draft;
        setMeta(r.value);
        setStoreErr(undefined);
      } else setStoreErr(r.error);
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft, opened.id]);
  const systemName = meta?.title || draftTitle(draft) || a.library.untitled;

  // a node or edge that vanished (undo, other step) cannot stay selected
  useEffect(() => {
    if (sel?.type === "node" && !step.nodes[sel.id]) setSel(null);
    if (sel?.type === "edge" && !step.edges[sel.id]) setSel(null);
    if (tool.mode === "connect" && tool.from && !step.nodes[tool.from]) setTool({ mode: "connect" });
  }, [step, sel, tool]);

  const editCur = useCallback((fn: (s: DraftStep) => DraftStep, tag?: string) => update((d) => editStep(d, at, fn, forward), tag), [update, at, forward]);
  const setText = (patch: Partial<DraftStepText>, key: string) =>
    update(
      (d) => ({ ...d, steps: d.steps.map((s, j) => (j === at ? { ...s, text: { ...s.text, [tl]: { ...s.text[tl], ...patch } } } : s)) }),
      `text:${at}:${tl}:${key}`,
    );
  const setExchange = (x: DraftExchange | undefined, tag?: string) =>
    update((d) => ({ ...d, steps: d.steps.map((s, j) => (j === at ? { ...s, exchange: x } : s)) }), tag);
  const setLabel = (id: string, v: string) => update((d) => ({ ...d, labels: { ...d.labels, [tl]: { ...d.labels[tl], [id]: v } } }), `label:${tl}:${id}`);

  const issues = useMemo(() => checkDraft(draft), [draft]);
  const errors = issues.filter((i) => i.level === "error").length;
  const warns = issues.length - errors;

  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of allNodeIds(draft)) out[id] = draft.labels[tl][id]?.trim() || id;
    return out;
  }, [draft, tl]);

  /* ---------- diagram ---------- */

  const addNode = (kind: NodeKind, cell: Cell) => {
    if (!inArea(cell) || taken(step, cell)) return;
    const id = uniqueId(kind === "service" ? "api" : kind, allNodeIds(draft));
    const name = tl === lang ? lab.kinds[kind] : "";
    update((d) => {
      const next = editStep(d, at, (s) => ({ ...s, nodes: { ...s.nodes, [id]: { id, kind, at: cell, state: "ok" } } }), forward);
      return name ? { ...next, labels: { ...next.labels, [tl]: { ...next.labels[tl], [id]: name } } } : next;
    });
    setSel({ type: "node", id });
  };
  const addEdge = (from: string, to: string) => {
    if (from === to || !step.nodes[from] || !step.nodes[to]) return;
    if (Object.values(step.edges).some((e) => e.from === from && e.to === to)) return;
    const id = uniqueId(`${from}-${to}`.slice(0, 24), allEdgeIds(draft));
    editCur((s) => ({ ...s, edges: { ...s.edges, [id]: { id, from, to, flow: "request", rate: 2, cut: false } } }));
    setSel({ type: "edge", id });
  };
  const patchNode = (id: string, p: Partial<NodeState>, tag?: string) =>
    editCur((s) => {
      const n = s.nodes[id];
      if (!n) return s;
      const next: NodeState = { ...n, ...p };
      if (p.load === undefined && "load" in p) delete next.load;
      return { ...s, nodes: { ...s.nodes, [id]: next } };
    }, tag);
  const patchEdge = (id: string, p: Partial<EdgeState>, tag?: string) =>
    editCur((s) => {
      const e = s.edges[id];
      if (!e) return s;
      const next: EdgeState = { ...e, ...p };
      if ("mode" in p && p.mode === undefined) delete next.mode;
      return { ...s, edges: { ...s.edges, [id]: next } };
    }, tag);
  const removeSelected = () => {
    if (!sel) return;
    editCur((s) => {
      const nodes = { ...s.nodes };
      const edges = { ...s.edges };
      if (sel.type === "node") delete nodes[sel.id];
      else delete edges[sel.id];
      return { ...s, nodes, edges };
    });
    setSel(null);
  };
  const moveNode = (id: string, cell: Cell) => {
    if (!step.nodes[id] || !inArea(cell) || taken(step, cell, id)) return;
    patchNode(id, { at: cell }, `move:${at}:${id}`);
  };
  const activateNode = (id: string) => {
    if (tool.mode === "connect") {
      if (!tool.from || !step.nodes[tool.from]) setTool({ mode: "connect", from: id });
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

  const edit: SceneEdit = {
    selected: sel?.type === "node" ? sel.id : undefined,
    selectedEdge: sel?.type === "edge" ? sel.id : undefined,
    area: [0, GRID_MAX],
    hover: tool.mode === "place" ? hover : null,
    onNodeDown: (id, e) => {
      if (e.button !== 0 || activateNode(id)) return;
      drag.current = { id, before: draft, moved: false };
      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    },
    onNodeKey: (id, e) => {
      const d = ARROWS[e.key];
      if (d) {
        const n = step.nodes[id];
        if (n) moveNode(id, [n.at[0] + d[0], n.at[1] + d[1]]);
        setSel({ type: "node", id });
      } else if (e.key === "Enter" || e.key === " ") activateNode(id);
      else return;
      e.preventDefault();
      e.stopPropagation();
    },
    onEdgeDown: (id) => {
      setTool({ mode: "select" });
      setSel({ type: "edge", id });
    },
    onStageDown: (cell, e) => {
      drag.current = null;
      if (e.button !== 0) return;
      if (tool.mode === "place") {
        if (inArea(cell) && !taken(step, cell)) {
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
        const next = inArea(cell) && !taken(step, cell) ? cell : null;
        if (next?.[0] !== hover?.[0] || next?.[1] !== hover?.[1]) setHover(next);
      }
      const d = drag.current;
      const n = d && step.nodes[d.id];
      if (!d || !n || (n.at[0] === cell[0] && n.at[1] === cell[1])) return;
      if (!inArea(cell) || taken(step, cell, d.id)) return;
      d.moved = true;
      // live drag: shown at once, recorded as one undo point on release
      setHist((h) => ({ ...h, present: editStep(h.present, at, (s) => ({ ...s, nodes: { ...s.nodes, [d.id]: { ...n, at: cell } } }), forward) }));
    },
    onStageUp: () => {
      const d = drag.current;
      drag.current = null;
      if (d?.moved) setHist((h) => ({ past: [...h.past, d.before].slice(-80), present: h.present, future: [] }));
    },
    onStageLeave: () => setHover(null),
  };

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // a modal dialog (BPMN import) owns the keyboard, Escape must close it
      if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const mod = e.ctrlKey || e.metaKey;
      const onControl = (e.target as HTMLElement | null)?.closest?.("button, a, summary, dialog");
      if (mod && e.key.toLowerCase() === "z") e.shiftKey ? redo() : undo();
      else if (mod && e.key.toLowerCase() === "y") redo();
      else if ((e.key === "Delete" || e.key === "Backspace") && !onControl && sel && tab === "edit") removeSelected();
      else if (e.key === "Escape" && tab === "edit") {
        setTool({ mode: "select" });
        setSel(null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const focusStep = (i: number) => window.requestAnimationFrame(() => stepRefs.current[i]?.focus());
  const onStepKey = (i: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = draft.steps.length - 1;
    let to: number | null = null;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      const delta = e.key === "ArrowUp" ? -1 : 1;
      if (i + delta < 0 || i + delta > last) return;
      update((d) => moveStep(d, i, delta));
      to = i + delta;
    } else if (e.key === "ArrowUp") to = Math.max(0, i - 1);
    else if (e.key === "ArrowDown") to = Math.min(last, i + 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = last;
    if (to === null) return;
    e.preventDefault();
    setCur(to);
    setSel(null);
    focusStep(to);
  };

  /* ---------- files ---------- */

  const startFrom = async () => {
    if (!loadLesson || !pick || !window.confirm(a.replaceConfirm)) return;
    setBusy(true);
    setStatus(a.loading);
    try {
      const entry = await loadLesson(pick);
      if (!entry) throw new Error("missing");
      const { draft: d, droppedScenarios } = fromLesson(entry.lesson, entry.text);
      replace(d);
      setStatus(droppedScenarios ? fill(a.scenariosDropped, { n: droppedScenarios }) : "");
    } catch {
      setStatus(a.loadFail);
    } finally {
      setBusy(false);
    }
  };
  const openFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) return setStatus(a.openBad);
    f.text()
      .then((s) => {
        const d = sanitizeDraft(JSON.parse(s));
        if (!d) throw new Error("bad");
        replace(d);
        setStatus("");
      })
      .catch(() => setStatus(a.openBad));
  };

  /* ---------- derived views ---------- */

  const prev = at > 0 ? draft.steps[at - 1] : undefined;
  const node = sel?.type === "node" ? step.nodes[sel.id] : undefined;
  const edgeSel = sel?.type === "edge" ? step.edges[sel.id] : undefined;
  const text = step.text[tl];
  const nodeList = Object.values(step.nodes);
  const edgeList = Object.values(step.edges);
  const ex = step.exchange;
  const wire = ex ? checkWire(ex) : null;

  const preview = useMemo(() => {
    if (tab !== "preview") return null;
    try {
      const lesson = { ...toLessonInput(draft, { dropBadExchange: true }), slug: "author-preview" };
      resolve(lesson);
      return { lesson, text: previewText(draft, tl), error: "" };
    } catch (e) {
      return { lesson: null, text: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [tab, draft, tl]);
  const source = useMemo(() => (tab === "export" ? toLessonSource(draft) : null), [tab, draft]);

  const copy = async () => {
    const t = source?.[file] ?? "";
    try {
      await navigator.clipboard.writeText(t);
      setStatus(a.copied);
    } catch {
      sourceRef.current?.select();
      setStatus(a.copyFail);
    }
  };

  const hint =
    tool.mode === "place"
      ? fill(lab.hintPlace, { kind: lab.kinds[tool.kind] })
      : tool.mode === "connect"
        ? tool.from && step.nodes[tool.from]
          ? fill(lab.hintConnectTo, { from: labels[tool.from] ?? tool.from })
          : lab.hintConnectFrom
        : lab.hintSelect;

  const TABS: Tab[] = ["edit", "preview", "export"];
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const to = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : -1;
    if (to < 0) return;
    e.preventDefault();
    setTab(TABS[to]!);
    window.requestAnimationFrame(() => document.getElementById(`${idp}-tab-${TABS[to]}`)?.focus());
  };

  const issueList = (
    <section className="mf-panel__card mf-author__checks" aria-labelledby={`${idp}-checks`}>
      <h2 id={`${idp}-checks`}>{a.checks}</h2>
      <p className="mf-lab__muted" aria-live="polite">
        {issues.length === 0 ? a.checksNone : `${fill(a.errorsN, { n: errors })} · ${fill(a.warnsN, { n: warns })}`}
      </p>
      {issues.length > 0 && (
        <ul className="mf-author__issues">
          {issues.map((i, k) => (
            <li key={k} className={`mf-author__issue mf-author__issue--${i.level}`}>
              <span className="mf-author__tag">{i.level === "error" ? a.error : a.warn}</span>
              <span>{issueText(a, i)}</span>
              {i.step !== undefined && i.step !== at && (
                <button
                  type="button"
                  className="mf-author__link"
                  onClick={() => {
                    setTab("edit");
                    setCur(i.step!);
                    setSel(null);
                    focusStep(i.step!);
                  }}
                >
                  {fill(a.goTo, { n: i.step + 1 })}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="mf-author">
      <div className="mf-author__system">
        <a className="mf-author__back" href={`/${lang}/my/`}>
          <span aria-hidden="true">←</span> {a.library.back}
        </a>
        <p className="mf-author__sysname">{fill(a.library.editing, { title: systemName })}</p>
      </div>
      <div className="mf-author__top">
        <div className="mf-author__tabs" role="tablist" aria-label={a.tabsLabel} onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t}
              id={`${idp}-tab-${t}`}
              type="button"
              role="tab"
              className="mf-btn"
              aria-selected={tab === t}
              aria-controls={`${idp}-panel`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
            >
              {a.tabs[t]}
            </button>
          ))}
        </div>
        <fieldset className="mf-author__langs">
          <legend>{a.contentLang}</legend>
          <div className="mf-lab__seg">
            {AUTHOR_LANGS.map((l) => (
              <button key={l} type="button" className="mf-btn" aria-pressed={tl === l} lang={l} onClick={() => setTl(l)}>
                {a.langNames[l]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mf-lab__seg">
          <button type="button" className="mf-btn" onClick={undo} disabled={!hist.past.length} aria-keyshortcuts="Control+Z">
            {a.undo}
          </button>
          <button type="button" className="mf-btn" onClick={redo} disabled={!hist.future.length} aria-keyshortcuts="Control+Y">
            {a.redo}
          </button>
        </div>
      </div>
      <p className="mf-author__status" role="status">
        {status || (storeErr === "quota" ? a.library.quota : storageOk ? "" : a.storageOff)}
      </p>

      <div id={`${idp}-panel`} role="tabpanel" aria-labelledby={`${idp}-tab-${tab}`}>
        {tab === "edit" && (
          <div className="mf-author__grid">
            <div className="mf-author__left">
              <details className="mf-panel__card mf-author__lesson">
                <summary>
                  <h2>{a.lesson}</h2>
                </summary>
                <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                  <label>
                    {a.slug}
                    <input value={draft.slug} spellCheck={false} autoComplete="off" onInput={(e) => update((d) => ({ ...d, slug: e.currentTarget.value.trim() }), "slug")} />
                  </label>
                  <div className="mf-author__pair">
                    <label>
                      {a.level}
                      <select value={draft.level} onChange={(e) => update((d) => ({ ...d, level: e.currentTarget.value as Level }))}>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {ui.levels[l]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {a.minutes}
                      <input type="number" min={1} max={30} step={1} value={draft.minutes} onInput={(e) => update((d) => ({ ...d, minutes: Math.round(Number(e.currentTarget.value)) || 1 }), "minutes")} />
                    </label>
                  </div>
                  <label lang={tl}>
                    {a.title} ({a.langNames[tl]})
                    <input value={draft.title[tl]} onInput={(e) => update((d) => ({ ...d, title: { ...d.title, [tl]: e.currentTarget.value } }), `title:${tl}`)} />
                  </label>
                  <label lang={tl}>
                    {a.summary} ({a.langNames[tl]})
                    <textarea rows={3} value={draft.summary[tl]} onInput={(e) => update((d) => ({ ...d, summary: { ...d.summary, [tl]: e.currentTarget.value } }), `summary:${tl}`)} />
                  </label>
                  <ParsedField
                    key={`learn-${tl}`}
                    label={`${a.learn} (${a.langNames[tl]})`}
                    multiline
                    rows={4}
                    value={draft.learn[tl]}
                    parse={parseLines}
                    print={printLines}
                    onChange={(v) => update((d) => ({ ...d, learn: { ...d.learn, [tl]: v } }), `learn:${tl}`)}
                  />
                  <fieldset>
                    <legend>{a.metrics}</legend>
                    {!draft.metrics.length && <p className="mf-lab__muted">{a.metricsNone}</p>}
                    {draft.metrics.map((m, k) => (
                      <div key={k} className="mf-author__metric">
                        <IdField label={a.metricId} value={m.id} error={a.idTaken} onRename={(to) => {
                          const next = renameMetric(draft, m.id, to);
                          if (next === draft) return false;
                          update(() => next);
                          return true;
                        }} />
                        <div className="mf-author__pair">
                          <label>
                            {a.unit}
                            <select value={m.unit} onChange={(e) => update((d) => ({ ...d, metrics: d.metrics.map((x, j) => (j === k ? { ...x, unit: e.currentTarget.value } : x)) }))}>
                              {!(ALLOWED_UNITS as readonly string[]).includes(m.unit) && <option value={m.unit}>{m.unit}</option>}
                              {ALLOWED_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u || a.unitNone}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {a.better}
                            <select value={m.better} onChange={(e) => update((d) => ({ ...d, metrics: d.metrics.map((x, j) => (j === k ? { ...x, better: e.currentTarget.value as "up" | "down" } : x)) }))}>
                              <option value="up">{a.betterUp}</option>
                              <option value="down">{a.betterDown}</option>
                            </select>
                          </label>
                        </div>
                        <label lang={tl}>
                          {fill(a.name, { lang: a.langNames[tl] })}
                          <input
                            value={m.label[tl]}
                            onInput={(e) => update((d) => ({ ...d, metrics: d.metrics.map((x, j) => (j === k ? { ...x, label: { ...x.label, [tl]: e.currentTarget.value } } : x)) }), `mlabel:${k}:${tl}`)}
                          />
                        </label>
                        <button type="button" className="mf-btn mf-btn--danger" onClick={() => update((d) => normalize({ ...d, metrics: d.metrics.filter((_, j) => j !== k) }))}>
                          {a.removeMetric} {m.id}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mf-btn"
                      disabled={draft.metrics.length >= 6}
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          metrics: [...d.metrics, { id: uniqueId("metric", d.metrics.map((m) => m.id)), unit: "ms", better: "down", label: { uz: "", ru: "", en: "" } }],
                        }))
                      }
                    >
                      {a.addMetric}
                    </button>
                  </fieldset>
                </form>
              </details>

              <nav className="mf-panel__card mf-author__steps" aria-labelledby={`${idp}-steps`}>
                <h2 id={`${idp}-steps`}>{a.steps}</h2>
                <p className="mf-lab__muted" id={`${idp}-steps-hint`}>
                  {a.stepsHint}
                </p>
                <ol>
                  {draft.steps.map((s, i) => (
                    <li key={`${s.id}-${i}`}>
                      <button
                        ref={(el) => {
                          stepRefs.current[i] = el;
                        }}
                        type="button"
                        className={`mf-author__step mf-author__step--${s.kind}`}
                        aria-current={i === at ? "step" : undefined}
                        aria-describedby={`${idp}-steps-hint`}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        tabIndex={i === at ? 0 : -1}
                        onClick={() => {
                          setCur(i);
                          setSel(null);
                        }}
                        onKeyDown={(e) => onStepKey(i, e)}
                      >
                        <span className="mf-author__num">{i + 1}</span>
                        <span className="mf-author__steptitle">{s.text[tl].short.trim() || s.id}</span>
                        <small>{ui.kinds[s.kind]}</small>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="mf-lab__seg">
                  <button type="button" className="mf-btn" onClick={() => (update((d) => addStep(d, at)), setCur(at + 1), focusStep(at + 1))}>
                    {a.add}
                  </button>
                  <button type="button" className="mf-btn" onClick={() => (update((d) => duplicateStep(d, at)), setCur(at + 1), focusStep(at + 1))}>
                    {a.duplicate}
                  </button>
                  <button type="button" className="mf-btn" disabled={at === 0} onClick={() => (update((d) => moveStep(d, at, -1)), setCur(at - 1))}>
                    {a.up}
                  </button>
                  <button type="button" className="mf-btn" disabled={at === draft.steps.length - 1} onClick={() => (update((d) => moveStep(d, at, 1)), setCur(at + 1))}>
                    {a.down}
                  </button>
                  <button
                    type="button"
                    className="mf-btn mf-btn--danger"
                    disabled={draft.steps.length <= 1}
                    onClick={() => {
                      if (!window.confirm(fill(a.removeConfirm, { id: step.id }))) return;
                      update((d) => deleteStep(d, at));
                      setCur(Math.max(0, at - 1));
                    }}
                  >
                    {a.remove}
                  </button>
                </div>
              </nav>

              <section className="mf-panel__card mf-author__file" aria-labelledby={`${idp}-file`}>
                <h2 id={`${idp}-file`}>{a.file}</h2>
                {loadLesson && lessons.length > 0 && (
                  <div className="mf-lab__form">
                    <label>
                      {a.fromLesson}
                      <select value={pick} onChange={(e) => setPick(e.currentTarget.value)}>
                        {lessons.map((l) => (
                          <option key={l.slug} value={l.slug}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="mf-btn" disabled={busy || !pick} onClick={() => void startFrom()}>
                      {a.start}
                    </button>
                  </div>
                )}
                <div className="mf-lab__seg">
                  <button type="button" className="mf-btn" onClick={() => download(`${draft.slug || "draft"}.author.json`, JSON.stringify(draft, null, 2), "application/json")}>
                    {a.saveJson}
                  </button>
                  <button type="button" className="mf-btn" onClick={() => fileRef.current?.click()}>
                    {a.openJson}
                  </button>
                  <BpmnImport a={a} lang={tl} blank={isBlankDraft(draft)} onImport={replace} />
                  <button type="button" className="mf-btn mf-btn--danger" onClick={() => window.confirm(a.newConfirm) && replace(newDraft())}>
                    {a.newDraft}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  aria-label={a.openJson}
                  onChange={(e) => {
                    openFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
                {storageOk && <p className="mf-lab__muted">{a.saved}</p>}
              </section>
            </div>

            <section className="mf-author__stage" aria-labelledby={`${idp}-diagram`}>
              <h2 id={`${idp}-diagram`}>{fill(a.diagram, { n: at + 1 })}</h2>
              <div className="mf-author__steprow">
                <IdField label={a.stepId} value={step.id} error={a.idTaken} onRename={(to) => {
                  if (!/^[a-z][a-z0-9-]*$/.test(to) || draft.steps.some((s, j) => j !== at && s.id === to)) return false;
                  update((d) => ({ ...d, steps: d.steps.map((s, j) => (j === at ? { ...s, id: to } : s)) }));
                  return true;
                }} />
                <label>
                  {a.stepKind}
                  <select value={step.kind} onChange={(e) => update((d) => ({ ...d, steps: d.steps.map((s, j) => (j === at ? { ...s, kind: e.currentTarget.value as StepKind } : s)) }))}>
                    {STEP_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {ui.kinds[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mf-author__palette" role="group" aria-label={a.palette}>
                {NODE_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`mf-lab__kind mf-lab__kind--${k}`}
                    aria-pressed={tool.mode === "place" && tool.kind === k}
                    onClick={(e) => {
                      // keyboard (detail 0): drop on the nearest free cell, ready to move with the arrows
                      if (e.detail === 0) {
                        const cell = freeCell({ nodes: step.nodes, edges: step.edges, labels: {} }, [6, 6]);
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
                ))}
              </div>
              <div className="mf-lab__bar">
                <div className="mf-lab__group">
                  <button type="button" className="mf-btn" aria-pressed={tool.mode === "select"} onClick={() => setTool({ mode: "select" })}>
                    {lab.select}
                  </button>
                  <button type="button" className="mf-btn" aria-pressed={tool.mode === "connect"} onClick={() => setTool(tool.mode === "connect" ? { mode: "select" } : { mode: "connect" })}>
                    {lab.connect}
                  </button>
                </div>
                <label className="mf-author__check" title={a.forwardHint}>
                  <input type="checkbox" checked={forward} onChange={(e) => setForward(e.currentTarget.checked)} aria-describedby={`${idp}-fwd`} />
                  {a.forward}
                </label>
              </div>
              <p className="mf-lab__muted mf-author__fwd" id={`${idp}-fwd`}>
                {a.forwardHint}
              </p>
              <p className="mf-lab__hint" aria-live="polite">
                {hint}
              </p>
              <div className={`mf-lab__canvas mf-author__canvas mf-lab__canvas--${tool.mode}`}>
                <Scene
                  state={snapshotOf(step)}
                  box={BOX}
                  labels={labels}
                  title={fill(a.diagram, { n: at + 1 })}
                  paused={reduced}
                  reduced={reduced}
                  runKey={at}
                  active={ex?.edge}
                  edit={edit}
                />
              </div>
              {issueList}
            </section>

            <aside className="mf-author__side">
              <div className="mf-panel__card">
                {node ? (
                  <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                    <h2>{lab.node}</h2>
                    <IdField label={a.nodeId} value={node.id} error={a.idTaken} onRename={(to) => {
                      const next = renameNode(draft, node.id, to);
                      if (next === draft) return false;
                      update(() => next);
                      setSel({ type: "node", id: to });
                      return true;
                    }} />
                    <label lang={tl}>
                      {fill(a.name, { lang: a.langNames[tl] })}
                      <input value={draft.labels[tl][node.id] ?? ""} maxLength={40} onInput={(e) => setLabel(node.id, e.currentTarget.value)} />
                    </label>
                    <label>
                      {lab.kind}
                      <select value={node.kind} onChange={(e) => patchNode(node.id, { kind: e.currentTarget.value as NodeKind })}>
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
                    {(() => {
                      const locked = prev?.nodes[node.id]?.load !== undefined;
                      return (
                        <label>
                          {lab.load}: {node.load === undefined ? lab.noLoad : `${node.load}%`}
                          <input
                            type="range"
                            min={locked ? 0 : -5}
                            max={100}
                            step={5}
                            value={node.load ?? -5}
                            aria-describedby={locked ? `${idp}-loadlock` : undefined}
                            onInput={(e) => {
                              const v = Number(e.currentTarget.value);
                              patchNode(node.id, { load: v < 0 ? undefined : v }, `load:${at}:${node.id}`);
                            }}
                          />
                          {locked && (
                            <small className="mf-author__hint" id={`${idp}-loadlock`}>
                              {a.noLoadLocked}
                            </small>
                          )}
                        </label>
                      );
                    })()}
                    <label className="mf-author__check">
                      <input
                        type="checkbox"
                        checked={step.focus.includes(node.id)}
                        onChange={(e) => {
                          const on = e.currentTarget.checked;
                          update((d) => ({
                            ...d,
                            steps: d.steps.map((s, j) => (j === at ? { ...s, focus: on ? [...s.focus, node.id] : s.focus.filter((f) => f !== node.id) } : s)),
                          }));
                        }}
                      />
                      {a.focus}
                    </label>
                    <button type="button" className="mf-btn mf-btn--danger" onClick={removeSelected}>
                      {lab.remove}
                    </button>
                  </form>
                ) : edgeSel ? (
                  <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                    <h2>{lab.edge}</h2>
                    <p className="mf-lab__muted">
                      {labels[edgeSel.from]} → {labels[edgeSel.to]}
                    </p>
                    <IdField label={a.edgeId} value={edgeSel.id} error={a.idTaken} onRename={(to) => {
                      const next = renameEdge(draft, edgeSel.id, to);
                      if (next === draft) return false;
                      update(() => next);
                      setSel({ type: "edge", id: to });
                      return true;
                    }} />
                    <label>
                      {lab.flow}
                      <select value={edgeSel.flow} onChange={(e) => patchEdge(edgeSel.id, { flow: e.currentTarget.value as Flow })}>
                        {FLOWS.map((f) => (
                          <option key={f} value={f}>
                            {ui.flows[f]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {lab.rate}: {edgeSel.rate}
                      <input type="range" min={0} max={12} step={1} value={edgeSel.rate} onInput={(e) => patchEdge(edgeSel.id, { rate: Number(e.currentTarget.value) }, `rate:${at}:${edgeSel.id}`)} />
                    </label>
                    <label className="mf-author__check">
                      <input type="checkbox" checked={edgeSel.cut} onChange={(e) => patchEdge(edgeSel.id, { cut: e.currentTarget.checked })} />
                      {lab.cut}
                    </label>
                    <label>
                      {a.mode}
                      <select
                        value={edgeSel.mode ?? ""}
                        onChange={(e) => patchEdge(edgeSel.id, { mode: (e.currentTarget.value || undefined) as EdgeMode | undefined })}
                      >
                        {(prev?.edges[edgeSel.id]?.mode === undefined || edgeSel.mode === undefined) && <option value="">{a.modeNone}</option>}
                        {EDGE_MODES.map((m) => (
                          <option key={m} value={m}>
                            {a.modes[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mf-lab__seg">
                      <button
                        type="button"
                        className="mf-btn"
                        disabled={edgeList.some((e) => e.id !== edgeSel.id && e.from === edgeSel.to && e.to === edgeSel.from)}
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
                <div className="mf-author__lists">
                  <div>
                    <h3 id={`${idp}-blocks`}>{a.blocks}</h3>
                    <ul aria-labelledby={`${idp}-blocks`}>
                      {nodeList.map((n) => (
                        <li key={n.id}>
                          <button type="button" className="mf-author__link" aria-pressed={sel?.type === "node" && sel.id === n.id} onClick={() => activateNode(n.id)}>
                            {labels[n.id]} <code>{n.id}</code>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 id={`${idp}-lines`}>{a.lines}</h3>
                    <ul aria-labelledby={`${idp}-lines`}>
                      {edgeList.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className="mf-author__link"
                            aria-pressed={sel?.type === "edge" && sel.id === e.id}
                            onClick={() => (setTool({ mode: "select" }), setSel({ type: "edge", id: e.id }))}
                          >
                            {labels[e.from]} → {labels[e.to]} <code>{e.id}</code>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <form className="mf-panel__card mf-lab__form" lang={tl} onSubmit={(e) => e.preventDefault()}>
                <h2>{fill(a.stepText, { lang: a.langNames[tl] })}</h2>
                <label>
                  {a.short}
                  <input value={text.short} maxLength={40} onInput={(e) => setText({ short: e.currentTarget.value }, "short")} />
                </label>
                <label>
                  {a.stepTitle}
                  <input value={text.title} onInput={(e) => setText({ title: e.currentTarget.value }, "title")} />
                </label>
                <label>
                  {a.body}
                  <textarea rows={6} value={text.body} onInput={(e) => setText({ body: e.currentTarget.value }, "body")} />
                </label>
                <label>
                  {a.watch}
                  <textarea rows={2} value={text.watch} onInput={(e) => setText({ watch: e.currentTarget.value }, "watch")} />
                </label>
                {text.check && <p className="mf-lab__muted">{a.keptCheck}</p>}
              </form>

              {draft.metrics.length > 0 && (
                <form className="mf-panel__card mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                  <h2>{a.metrics}</h2>
                  {draft.metrics.map((m) => {
                    const v = step.metrics[m.id];
                    return (
                      <label key={m.id}>
                        {(m.label[tl] || m.id) + (m.unit ? `, ${m.unit}` : "")} · {a.value}
                        <input
                          type="number"
                          step="any"
                          value={v ?? ""}
                          placeholder={a.noValue}
                          onInput={(e) => {
                            const raw = e.currentTarget.value;
                            const n = Number(raw);
                            editCur((s) => {
                              const metrics = { ...s.metrics };
                              if (raw === "" || !Number.isFinite(n)) delete metrics[m.id];
                              else metrics[m.id] = n;
                              return { ...s, metrics };
                            }, `metric:${at}:${m.id}`);
                          }}
                        />
                      </label>
                    );
                  })}
                </form>
              )}

              <form className="mf-panel__card mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                <h2>{a.exchange}</h2>
                <label className="mf-author__check">
                  <input
                    type="checkbox"
                    checked={!!ex}
                    disabled={!ex && edgeList.length === 0}
                    onChange={(e) =>
                      setExchange(
                        e.currentTarget.checked
                          ? { edge: edgeSel?.id ?? edgeList[0]!.id, request: emptyMessage("http"), marks: [], masked: [] }
                          : undefined,
                      )
                    }
                  />
                  {a.exchangeOn}
                </label>
                {!ex && edgeList.length === 0 && <p className="mf-lab__muted">{a.exchangeNoEdge}</p>}
                {ex && (
                  <>
                    <label>
                      {a.line}
                      <select value={ex.edge} onChange={(e) => setExchange({ ...ex, edge: e.currentTarget.value })}>
                        {!step.edges[ex.edge] && <option value={ex.edge}>{ex.edge}</option>}
                        {edgeList.map((e) => (
                          <option key={e.id} value={e.id}>
                            {labels[e.from]} → {labels[e.to]} ({e.id})
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="mf-author__msg">
                      <legend>{a.request}</legend>
                      <MessageEditor a={a} msg={ex.request} onChange={(request) => setExchange({ ...ex, request }, `req:${at}`)} />
                    </fieldset>
                    <label className="mf-author__check">
                      <input type="checkbox" checked={!!ex.response} onChange={(e) => setExchange({ ...ex, response: e.currentTarget.checked ? emptyMessage("http") : undefined })} />
                      {a.hasResponse}
                    </label>
                    {ex.response && (
                      <fieldset className="mf-author__msg">
                        <legend>{a.response}</legend>
                        <MessageEditor a={a} msg={ex.response} onChange={(response) => setExchange({ ...ex, response }, `res:${at}`)} />
                      </fieldset>
                    )}
                    <ParsedField label={a.marks} hint={a.listHint} value={ex.marks} parse={parseList} print={printList} onChange={(marks) => setExchange({ ...ex, marks }, `marks:${at}`)} />
                    <ParsedField label={a.masked} hint={a.listHint} value={ex.masked} parse={parseList} print={printList} onChange={(masked) => setExchange({ ...ex, masked }, `masked:${at}`)} />
                    <div aria-live="polite">
                      {wire && (wire.missingMarks.length || wire.badMasks.length || wire.missingMasked.length) ? (
                        <ul className="mf-author__issues">
                          {wire.missingMarks.map((m) => (
                            <li key={`m${m}`} className="mf-author__issue mf-author__issue--error">{fill(a.issue.markMissing, { x: m })}</li>
                          ))}
                          {wire.badMasks.map((m) => (
                            <li key={`b${m}`} className="mf-author__issue mf-author__issue--error">{fill(a.issue.maskValue, { x: m })}</li>
                          ))}
                          {wire.missingMasked.map((m) => (
                            <li key={`x${m}`} className="mf-author__issue mf-author__issue--error">{fill(a.issue.maskMissing, { x: m })}</li>
                          ))}
                        </ul>
                      ) : ex.marks.length ? (
                        <p className="mf-lab__muted">{a.markOk}</p>
                      ) : null}
                    </div>
                    {ex.marks.map((m) => (
                      <label key={m} lang={tl}>
                        {fill(a.note, { name: m, lang: a.langNames[tl] })}
                        <textarea rows={2} value={text.fields[m] ?? ""} onInput={(e) => setText({ fields: { ...text.fields, [m]: e.currentTarget.value } }, `field:${m}`)} />
                      </label>
                    ))}
                  </>
                )}
              </form>
            </aside>
          </div>
        )}

        {tab === "preview" && preview && (
          <div className="mf-author__preview">
            <p className="mf-lab__muted">{a.previewNote}</p>
            {preview.lesson && preview.text ? (
              <LessonPlayer lesson={preview.lesson} text={preview.text} ui={ui} lang={tl} privateContent />
            ) : (
              <p className="mf-author__bad" role="alert">
                {fill(a.previewBroken, { x: preview.error })}
              </p>
            )}
          </div>
        )}

        {tab === "export" && source && (
          <div className="mf-author__export">
            <p>{fill(a.exportLead, { slug: draft.slug })}</p>
            {errors > 0 && (
              <p className="mf-author__bad" role="alert">
                {fill(a.exportErrors, { n: errors })}
              </p>
            )}
            <div className="mf-lab__seg" role="group" aria-label={a.fileTabs}>
              {LESSON_FILES.map((f) => (
                <button key={f} type="button" className="mf-btn" aria-pressed={file === f} onClick={() => setFile(f)}>
                  {f}
                </button>
              ))}
            </div>
            <label className="mf-author__source">
              <span className="mf-author__sr">{file}</span>
              <textarea ref={sourceRef} readOnly rows={22} spellCheck={false} value={source[file]} />
            </label>
            <div className="mf-lab__seg">
              <button type="button" className="mf-btn" onClick={() => void copy()}>
                {a.copy}
              </button>
              <button type="button" className="mf-btn" onClick={() => download(file, source[file])}>
                {fill(a.download, { file })}
              </button>
              <button type="button" className="mf-btn" onClick={() => LESSON_FILES.forEach((f, k) => window.setTimeout(() => download(f, source[f]), k * 250))}>
                {fill(a.download, { file: LESSON_FILES.join(", ") })}
              </button>
            </div>
            {issueList}
          </div>
        )}
      </div>
    </div>
  );
}
