import { FLOWS, NODE_KINDS, NODE_STATES, type NodeKind } from "@mufassall/scene-schema";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gridBounds } from "./iso";
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
  nextId,
  sanitize,
  toLessonCode,
  toScene,
} from "./lab";
import { Scene, type SceneEdit } from "./Scene";
import { type LabStrings, type UiStrings, fill } from "./ui";

const STORE_KEY = "mufassall:v1:lab";
const BOX = gridBounds(GRID_MIN, GRID_MAX);

type Tool = { mode: "select" } | { mode: "place"; kind: NodeKind } | { mode: "connect"; from?: string };
const inArea = (c: [number, number]) => c[0] >= GRID_MIN && c[1] >= GRID_MIN && c[0] <= GRID_MAX && c[1] <= GRID_MAX;

type Selection ={ type: "node"; id: string } | { type: "edge"; id: string } | null;

function example(lab: LabStrings): LabDoc {
  const doc = emptyDoc();
  const add = (id: string, kind: NodeKind, at: [number, number], label: string, load?: number) => {
    doc.nodes[id] = { id, kind, at, state: "ok", ...(load === undefined ? {} : { load }) };
    doc.labels[id] = label;
  };
  // screen right = (x+1, y-1), screen down = (x+1, y+1)
  add("client", "client", [3, 9], lab.kinds.client);
  add("lb", "lb", [5, 7], lab.kinds.lb);
  add("api-1", "service", [5, 3], `${lab.kinds.service} 1`, 48);
  add("api-2", "service", [9, 7], `${lab.kinds.service} 2`, 52);
  add("cache", "cache", [7, 1], lab.kinds.cache);
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

/** What to show first: a shared link wins; the reader's own saved diagram stays one undo away. */
function initial(lab: LabStrings): { doc: LabDoc; before?: LabDoc } {
  let saved: LabDoc | undefined;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) saved = sanitize(JSON.parse(raw));
  } catch {
    /* storage may be blocked */
  }
  const hash = new URLSearchParams(window.location.hash.slice(1)).get("d");
  if (hash) {
    // drop the hash so a reload keeps the reader's edits instead of the original link
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);
    return { doc: decodeDoc(hash), before: saved };
  }
  return { doc: saved ?? example(lab) };
}

export interface LabEditorProps {
  ui: UiStrings;
  lab: LabStrings;
}

export function LabEditor({ ui, lab }: LabEditorProps) {
  // first render matches the server (example); the saved or linked diagram loads after hydration
  const [doc, setDoc] = useState<LabDoc>(() => example(lab));
  const past = useRef<LabDoc[]>([]);
  const future = useRef<LabDoc[]>([]);
  const [, bump] = useState(0);
  const [tool, setTool] = useState<Tool>({ mode: "select" });
  const [sel, setSel] = useState<Selection>(null);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const drag = useRef<{ id: string; before: LabDoc; moved: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion() ?? false;

  // `ready` flips in the same render as the loaded doc, so the placeholder example is never saved
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const first = initial(lab);
    if (first.before && Object.keys(first.before.nodes).length > 0) past.current = [first.before];
    setDoc(first.doc);
    setReady(true);
  }, [lab]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(doc));
    } catch {
      /* storage may be blocked; the share link still works */
    }
  }, [doc, ready]);

  const commit = useCallback(
    (next: LabDoc, before: LabDoc = doc) => {
      past.current.push(before);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      setDoc(next);
      bump((n) => n + 1);
    },
    [doc],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(doc);
    setDoc(prev);
    setSel(null);
    bump((n) => n + 1);
  }, [doc]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(doc);
    setDoc(next);
    setSel(null);
    bump((n) => n + 1);
  }, [doc]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === "y") redo();
      else if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      else if (e.key === "Escape") {
        setTool({ mode: "select" });
        setSel(null);
      } else if (!mod && (e.key === "c" || e.key === "C")) setTool((t0) => (t0.mode === "connect" ? { mode: "select" } : { mode: "connect" }));
      else if (e.key === " ") setPaused((p) => !p);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeSelected]);

  const addNode = (kind: NodeKind, at: [number, number]) => {
    if (Object.keys(doc.nodes).length >= MAX_NODES) return flash(lab.limit);
    if (cellTaken(doc, at)) return;
    const id = nextId(doc.nodes, kind);
    const count = Object.values(doc.nodes).filter((n) => n.kind === kind).length + 1;
    commit({
      nodes: { ...doc.nodes, [id]: { id, kind, at, state: "ok" } },
      edges: doc.edges,
      labels: { ...doc.labels, [id]: count > 1 ? `${lab.kinds[kind]} ${count}` : lab.kinds[kind] },
    });
    setSel({ type: "node", id });
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    if (Object.keys(doc.edges).length >= MAX_EDGES) return flash(lab.limit);
    if (Object.values(doc.edges).some((e) => e.from === from && e.to === to)) return;
    const id = nextId(doc.edges, "e");
    commit({ ...doc, edges: { ...doc.edges, [id]: { id, from, to, flow: "request", rate: 2, cut: false } } });
    setSel({ type: "edge", id });
  };

  const edit: SceneEdit = {
    selected: sel?.type === "node" ? sel.id : undefined,
    selectedEdge: sel?.type === "edge" ? sel.id : undefined,
    onNodeDown: (id, e) => {
      if (tool.mode === "connect") {
        if (!tool.from) setTool({ mode: "connect", from: id });
        else {
          addEdge(tool.from, id);
          setTool({ mode: "connect" });
        }
        return;
      }
      setTool({ mode: "select" });
      setSel({ type: "node", id });
      drag.current = { id, before: doc, moved: false };
      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    },
    area: [GRID_MIN, GRID_MAX],
    hover: tool.mode === "place" ? hover : null,
    onStageDown: (cell) => {
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
      setDoc({ ...doc, nodes: { ...doc.nodes, [d.id]: { ...n, at: cell } } });
    },
    onStageUp: () => {
      const d = drag.current;
      drag.current = null;
      if (d?.moved) commit(doc, d.before);
    },
    onEdgeDown: (id) => {
      setTool({ mode: "select" });
      setSel({ type: "edge", id });
    },
  };

  const patchNode = (id: string, patch: Partial<LabDoc["nodes"][string]>, label?: string) => {
    const n = doc.nodes[id];
    if (!n) return;
    const node = { ...n, ...patch };
    if (patch.load === undefined && "load" in patch) delete node.load;
    commit({ ...doc, nodes: { ...doc.nodes, [id]: node }, labels: label === undefined ? doc.labels : { ...doc.labels, [id]: label } });
  };
  const patchEdge = (id: string, patch: Partial<LabDoc["edges"][string]>) => {
    const e = doc.edges[id];
    if (e) commit({ ...doc, edges: { ...doc.edges, [id]: { ...e, ...patch } } });
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = `d=${encodeDoc(doc)}`;
    window.history.replaceState(window.history.state, "", url);
    try {
      await navigator.clipboard.writeText(url.toString());
      flash(lab.copied);
    } catch {
      flash(url.toString());
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mufassall-lab.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      commit(sanitize(JSON.parse(await file.text())));
      setSel(null);
    } catch {
      /* not JSON: keep the current diagram */
    }
  };

  const scene = useMemo(() => toScene(doc), [doc]);
  const node = sel?.type === "node" ? doc.nodes[sel.id] : undefined;
  const edgeSel = sel?.type === "edge" ? doc.edges[sel.id] : undefined;
  const nodeCount = Object.keys(doc.nodes).length;

  const hint =
    tool.mode === "place"
      ? fill(lab.hintPlace, { kind: lab.kinds[tool.kind] })
      : tool.mode === "connect"
        ? tool.from
          ? fill(lab.hintConnectTo, { from: doc.labels[tool.from] ?? tool.from })
          : lab.hintConnectFrom
        : lab.hintSelect;

  return (
    <MotionConfig reducedMotion="user">
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
                  onClick={() => setTool(tool.mode === "place" && tool.kind === k ? { mode: "select" } : { mode: "place", kind: k })}
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
                onClick={() => setTool(tool.mode === "connect" ? { mode: "select" } : { mode: "connect" })}
              >
                {lab.connect}
              </button>
            </div>
            <div className="mf-lab__group">
              <button type="button" className="mf-btn" onClick={undo} disabled={past.current.length === 0}>
                {lab.undo}
              </button>
              <button type="button" className="mf-btn" onClick={redo} disabled={future.current.length === 0}>
                {lab.redo}
              </button>
              <button type="button" className="mf-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
                {paused ? lab.play : lab.pause}
              </button>
            </div>
          </div>
          <p className="mf-lab__hint" aria-live="polite">
            {hint}
          </p>
          <div className={`mf-lab__canvas mf-lab__canvas--${tool.mode}`}>
            <Scene state={scene} box={BOX} labels={doc.labels} title={lab.stageLabel} paused={paused} reduced={reduced} runKey={0} edit={edit} />
            {nodeCount === 0 && <p className="mf-lab__empty">{lab.empty}</p>}
          </div>
          <p className="mf-keys">{lab.keys}</p>
        </section>

        <aside className="mf-lab__side">
          <div className="mf-panel__card">
            {node ? (
              <form className="mf-lab__form" onSubmit={(e) => e.preventDefault()}>
                <h2>{lab.node}</h2>
                <label>
                  {lab.label}
                  <input
                    key={node.id}
                    defaultValue={doc.labels[node.id] ?? node.id}
                    maxLength={MAX_LABEL}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v && v !== doc.labels[node.id]) patchNode(node.id, {}, v);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
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
                <label>
                  {lab.load}: {node.load === undefined ? lab.noLoad : `${node.load}%`}
                  <input
                    type="range"
                    min={-5}
                    max={100}
                    step={5}
                    value={node.load ?? -5}
                    onChange={(e) => {
                      const v = Number(e.currentTarget.value);
                      patchNode(node.id, { load: v < 0 ? undefined : v });
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
                  <select value={edgeSel.flow} onChange={(e) => patchEdge(edgeSel.id, { flow: e.currentTarget.value as never })}>
                    {FLOWS.map((f) => (
                      <option key={f} value={f}>
                        {ui.flows[f]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {lab.rate}: {edgeSel.rate}
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={edgeSel.rate}
                    onChange={(e) => patchEdge(edgeSel.id, { rate: Number(e.currentTarget.value) })}
                  />
                </label>
                <label className="mf-lab__check">
                  <input type="checkbox" checked={edgeSel.cut} onChange={(e) => patchEdge(edgeSel.id, { cut: e.currentTarget.checked })} />
                  {lab.cut}
                </label>
                <div className="mf-lab__seg">
                  <button type="button" className="mf-btn" onClick={() => patchEdge(edgeSel.id, { from: edgeSel.to, to: edgeSel.from })}>
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
            <button type="button" className="mf-btn" onClick={() => setCode(toLessonCode(doc))}>
              {lab.code}
            </button>
            <button type="button" className="mf-btn" onClick={exportJson}>
              {lab.exportJson}
            </button>
            <button type="button" className="mf-btn" onClick={() => fileRef.current?.click()}>
              {lab.importJson}
            </button>
            <input
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
                if (nodeCount === 0 || window.confirm(lab.clearConfirm)) {
                  commit(emptyDoc());
                  setSel(null);
                }
              }}
            >
              {lab.clear}
            </button>
          </div>
        </aside>

        {code !== null && (
          <div className="mf-lab__dialog" role="dialog" aria-modal="true" aria-label={lab.codeTitle}>
            <div className="mf-panel__card">
              <h2>{lab.codeTitle}</h2>
              <pre className="mf-wire__code">
                <code>{code}</code>
              </pre>
              <div className="mf-lab__seg">
                <button
                  type="button"
                  className="mf-btn mf-btn--primary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(code).then(() => flash(lab.copied));
                  }}
                >
                  {lab.copy}
                </button>
                <button type="button" className="mf-btn" onClick={() => setCode(null)}>
                  {lab.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <p className="mf-lab__toast" role="status">
            {toast}
          </p>
        )}
      </div>
    </MotionConfig>
  );
}
