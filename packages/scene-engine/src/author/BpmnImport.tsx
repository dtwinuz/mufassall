import { useEffect, useRef, useState } from "react";
import { fill } from "../ui";
import type { AuthorStrings } from "./author-ui";
import { BPMN_MAX_CHARS, type BpmnError, importBpmn } from "./bpmn";
import type { AuthorLang, Draft } from "./model";

export interface BpmnImportProps {
  a: AuthorStrings;
  /** text language: names from the file land here */
  lang: AuthorLang;
  /** the current draft has nothing worth keeping, so no confirmation is asked */
  blank: boolean;
  onImport: (d: Draft) => void;
}

export function bpmnErrorText(a: AuthorStrings, e: BpmnError): string {
  return fill(a.bpmn.error[e.code], { line: e.line ?? "?", x: e.x ?? "" });
}

/** "Import BPMN" button and its dialog: pick a file or paste the XML, then read the notes. */
export function BpmnImport({ a, lang, blank, onImport }: BpmnImportProps) {
  const b = a.bpmn;
  const [open, setOpen] = useState(false);
  const [xml, setXml] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idp = "mf-author-bpmn";

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
  const run = (text: string) => {
    reset();
    const r = importBpmn(text, lang);
    if (!r.ok) return setError(bpmnErrorText(a, r.error));
    if (!blank && !window.confirm(b.replaceConfirm)) return;
    const { draft, warnings } = r.result;
    onImport(draft);
    setDone(fill(b.done, { nodes: Object.keys(draft.steps[0]?.nodes ?? {}).length, steps: draft.steps.length, cases: draft.cases.length }));
    setNotes(warnings.map((w) => fill(b.warning[w.code], { x: w.x ?? "" })));
  };
  const readFile = (f: File | undefined) => {
    if (!f || busy) return;
    reset();
    // UTF-8 can take up to 4 bytes a character; the exact limit is checked on the text
    if (f.size > BPMN_MAX_CHARS * 4) return setError(b.error.tooLarge);
    setBusy(true);
    f.text()
      .then(run)
      .catch(() => setError(b.error.notBpmn))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button type="button" className="mf-btn" aria-haspopup="dialog" onClick={() => (reset(), setOpen(true))}>
        {b.open}
      </button>
      <dialog
        ref={dialogRef}
        className="mf-lab__dialog mf-author__bpmn"
        aria-labelledby={`${idp}-title`}
        aria-describedby={`${idp}-lead`}
        onClose={() => setOpen(false)}
        // the editor's own shortcuts (undo, Escape, Delete) must not fire behind the dialog
        onKeyDown={(e) => e.stopPropagation()}
      >
        {open && (
          <div className="mf-panel__card">
            <h2 id={`${idp}-title`}>{b.title}</h2>
            <p id={`${idp}-lead`} className="mf-lab__muted">
              {fill(b.lead, { lang: a.langNames[lang] })}
            </p>
            <div className="mf-lab__form">
              <label>
                {b.file}
                <input
                  type="file"
                  accept=".bpmn,.xml,application/xml,text/xml"
                  aria-busy={busy}
                  onChange={(e) => {
                    readFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label>
                {b.paste}
                <textarea
                  className="mf-author__bpmn-xml"
                  rows={6}
                  spellCheck={false}
                  value={xml}
                  onChange={(e) => setXml(e.currentTarget.value)}
                />
              </label>
            </div>
            <div className="mf-lab__seg">
              <button type="button" className="mf-btn mf-btn--primary" disabled={busy || !xml.trim()} onClick={() => run(xml)}>
                {b.importText}
              </button>
              <button type="button" className="mf-btn" onClick={() => setOpen(false)}>
                {b.close}
              </button>
            </div>
            <div aria-live="polite">
              {busy && <p className="mf-author__status">{b.reading}</p>}
              {done && <p className="mf-author__bpmn-done">{done}</p>}
              {notes.length > 0 && (
                <>
                  <h3>{b.notes}</h3>
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
