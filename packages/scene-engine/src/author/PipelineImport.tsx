import { useEffect, useRef, useState } from "react";
import { fill } from "../ui";
import { IMPORT_UI, type ImportSource } from "./import-ui";
import type { ImportWarning } from "./importkit";
import { MERMAID_MAX_CHARS, importMermaid } from "./mermaid";
import type { AuthorLang, Draft } from "./model";
import { PIPELINE_MAX_CHARS, importPipeline } from "./pipeline";

export interface PipelineImportProps {
  /** UI language of the dialog */
  lang: AuthorLang;
  /** format selected when the dialog opens (default GitLab CI) */
  initial?: ImportSource;
  /**
   * Called with the finished draft. `kind` is what was found in the text, which for YAML may differ
   * from the selected format (a GitHub workflow pasted under GitLab still imports as GitHub).
   */
  onImport: (draft: Draft, kind: ImportSource) => void;
  /** controlled mode: when set, no trigger button is drawn and the parent opens/closes the dialog */
  open?: boolean;
  onClose?: () => void;
  /** trigger button text; defaults to the dialog's own "Import pipeline or diagram" */
  label?: string;
}

const SOURCES: ImportSource[] = ["gitlab-ci", "github-actions", "mermaid"];

/** "Import pipeline or diagram" button and dialog: pick a format, paste or open a file, read the notes. */
export function PipelineImport({ lang, initial = "gitlab-ci", onImport, open: openProp, onClose, label }: PipelineImportProps) {
  const t = IMPORT_UI[lang];
  const controlled = openProp !== undefined;
  const [openSelf, setOpenSelf] = useState(false);
  const open = controlled ? openProp : openSelf;
  const [source, setSource] = useState<ImportSource>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idp = "mf-author-pipeline";

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  const reset = () => {
    setError("");
    setDone("");
    setNotes([]);
  };
  const close = () => (controlled ? onClose?.() : setOpenSelf(false));
  const report = (draft: Draft, warnings: ImportWarning[], detected: string, kind: ImportSource) => {
    onImport(draft, kind);
    const lines = [fill(t.detected, { x: detected }), ...warnings.map((w) => fill(t.warning[w.code], { x: w.x ?? "" }))];
    setDone(fill(t.done, { nodes: Object.keys(draft.steps[0]?.nodes ?? {}).length, steps: draft.steps.length }));
    setNotes(lines);
  };
  const run = async (input: string) => {
    reset();
    if (source === "mermaid") {
      const r = importMermaid(input, lang);
      if (!r.ok) return setError(t.mermaidError[r.error.code]);
      return report(r.result.draft, r.result.warnings, t.kinds[r.result.kind], "mermaid");
    }
    setBusy(true);
    try {
      const r = await importPipeline(input, lang);
      if (!r.ok) return setError(t.pipelineError[r.error.code]);
      report(r.result.draft, r.result.warnings, t.kinds[r.result.kind], r.result.kind);
    } catch {
      setError(t.pipelineError.notYaml);
    } finally {
      setBusy(false);
    }
  };
  const readFile = (f: File | undefined) => {
    if (!f || busy) return;
    reset();
    const max = source === "mermaid" ? MERMAID_MAX_CHARS : PIPELINE_MAX_CHARS;
    // UTF-8 can take up to 4 bytes a character; the exact limit is checked on the text
    if (f.size > max * 4) return setError(source === "mermaid" ? t.mermaidError.tooLarge : t.pipelineError.tooLarge);
    setBusy(true);
    f.text()
      .then((s) => {
        setText(s);
        setBusy(false);
        return run(s);
      })
      .catch(() => setError(source === "mermaid" ? t.mermaidError.notMermaid : t.pipelineError.notYaml))
      .finally(() => setBusy(false));
  };

  return (
    <>
      {!controlled && (
        <button type="button" className="mf-btn" aria-haspopup="dialog" onClick={() => (reset(), setOpenSelf(true))}>
          {label ?? t.open}
        </button>
      )}
      <dialog
        ref={dialogRef}
        className="mf-lab__dialog mf-author__bpmn mf-author__pipeline"
        aria-labelledby={`${idp}-title`}
        aria-describedby={`${idp}-lead`}
        onClose={close}
        // shortcuts of the page behind (undo, Escape, Delete) must not fire while typing here
        onKeyDown={(e) => e.stopPropagation()}
      >
        {open && (
          <div className="mf-panel__card">
            <h2 id={`${idp}-title`}>{t.title}</h2>
            <p id={`${idp}-lead`} className="mf-lab__muted">
              {t.lead} {t.privacy}
            </p>
            <div className="mf-lab__form">
              <label>
                {t.format}
                <select
                  value={source}
                  aria-describedby={`${idp}-hint`}
                  onChange={(e) => {
                    setSource(e.currentTarget.value as ImportSource);
                    reset();
                  }}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {t.formats[s]}
                    </option>
                  ))}
                </select>
              </label>
              <p id={`${idp}-hint`} className="mf-lab__muted">
                {t.hints[source]}
              </p>
              <label>
                {t.file}
                <input
                  type="file"
                  accept={source === "mermaid" ? ".mmd,.mermaid,.md,.txt,text/plain" : ".yml,.yaml,text/yaml,application/yaml,text/plain"}
                  aria-busy={busy}
                  onChange={(e) => {
                    readFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label>
                {t.paste}
                <textarea
                  className="mf-author__bpmn-xml"
                  rows={8}
                  spellCheck={false}
                  autoComplete="off"
                  value={text}
                  onChange={(e) => setText(e.currentTarget.value)}
                />
              </label>
            </div>
            <div className="mf-lab__seg">
              <button type="button" className="mf-btn mf-btn--primary" disabled={busy || !text.trim()} onClick={() => void run(text)}>
                {t.importText}
              </button>
              <button type="button" className="mf-btn" onClick={close}>
                {t.close}
              </button>
            </div>
            <div aria-live="polite">
              {busy && <p className="mf-author__status">{t.reading}</p>}
              {done && <p className="mf-author__bpmn-done">{done}</p>}
              {notes.length > 0 && (
                <>
                  <h3>{t.notes}</h3>
                  <ul className="mf-author__bpmn-notes">
                    {notes.map((n, k) => (
                      <li key={k}>{n}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            {error && (
              <p className="mf-author__bpmn-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
