import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fill } from "../ui";
import { AUTHOR_UI } from "./author-ui";
import { BpmnImport } from "./BpmnImport";
import { PipelineImport } from "./PipelineImport";
import { BUNDLE_MAX_CHARS, bundleFileName, canShare, encodeShare, makeBundle, parseBundle, shareUrl } from "./bundle";
import { type AuthorLang, type Draft, fromLesson, newDraft } from "./model";
import {
  type StoreError,
  type SystemMeta,
  type SystemSource,
  createSystem,
  deleteSystem,
  duplicateSystem,
  listSystems,
  loadSystem,
  migrateLegacyDraft,
  renameSystem,
} from "./store";
import type { AuthorLessonEntry } from "./AuthorEditor";

export interface LibraryProps {
  /** interface language, also the language imported names land in */
  lang: AuthorLang;
  lessons?: readonly { slug: string; title: string }[];
  loadLesson?: (slug: string) => Promise<AuthorLessonEntry | undefined>;
}

interface Row extends SystemMeta {
  steps: number;
  cases: number;
  draftTitle: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local date and time without `Intl` (the site bans it for SSR parity). */
export function formatStamp(ms: number): string {
  if (!ms) return "–";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const editorHref = (lang: string, id: string) => `/${lang}/author/?system=${encodeURIComponent(id)}`;
export const viewHref = (lang: string, id: string) => `/${lang}/my/view/?id=${encodeURIComponent(id)}`;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Status = { text: string; tone?: "bad"; link?: { href: string; label: string } };

/** `/<lang>/my/`: the person's own systems. Everything stays in this browser. */
export function Library({ lang, lessons = [], loadLesson }: LibraryProps) {
  const a = AUTHOR_UI[lang] ?? AUTHOR_UI.en;
  const l = a.library;
  const [items, setItems] = useState<SystemMeta[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>({ text: "" });
  const [blocked, setBlocked] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pick, setPick] = useState(lessons[0]?.slug ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const share = useMemo(() => canShare(), []);

  const refresh = useCallback(() => setItems(listSystems()), []);
  useEffect(() => {
    try {
      window.localStorage.getItem("mufassall:v1:systems");
    } catch {
      setBlocked(true);
    }
    migrateLegacyDraft();
    refresh();
    setReady(true);
  }, [refresh]);

  const rows: Row[] = useMemo(
    () =>
      items.map((m) => {
        const d = loadSystem(m.id);
        return { ...m, steps: d?.steps.length ?? 0, cases: d?.cases?.length ?? 0, draftTitle: d ? (d.title[lang].trim() || "") : "" };
      }),
    [items, lang],
  );
  const nameOf = (m: { title: string; draftTitle?: string }) => m.title || m.draftTitle || l.untitled;
  const errText = (e: StoreError) => (e === "quota" ? l.quota : e === "blocked" ? l.blocked : l.missing);
  const fail = (e: StoreError) => setStatus({ text: errText(e), tone: "bad" });

  /** A new system from an importer: stays on this page so the import notes can be read. */
  const add = (d: Draft, source: SystemSource, title?: string): boolean => {
    const r = createSystem(d, source, title !== undefined ? { title } : undefined);
    if (!r.ok) {
      fail(r.error);
      return false;
    }
    refresh();
    setStatus({ text: fill(l.created, { title: r.value.title || l.untitled }), link: { href: editorHref(lang, r.value.id), label: l.openIt } });
    return true;
  };

  const newBlank = () => {
    const r = createSystem(newDraft(), "blank");
    if (!r.ok) return fail(r.error);
    window.location.assign(editorHref(lang, r.value.id));
  };

  const fromLessonPick = async () => {
    if (!loadLesson || !pick) return;
    setBusy(true);
    setStatus({ text: l.loading });
    try {
      const entry = await loadLesson(pick);
      if (!entry) throw new Error("missing");
      const { draft } = fromLesson(entry.lesson, entry.text);
      add(draft, "lesson", draft.title[lang] || undefined);
    } catch {
      setStatus({ text: l.loadFail, tone: "bad" });
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () => {
    const systems = items.flatMap((m) => {
      const d = loadSystem(m.id);
      return d ? [{ title: m.title, ...(m.source ? { source: m.source } : {}), draft: d }] : [];
    });
    download(bundleFileName(), JSON.stringify(makeBundle(systems), null, 2));
  };

  const importFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > BUNDLE_MAX_CHARS) return setStatus({ text: l.importError.tooLarge, tone: "bad" });
    f.text()
      .then((text) => {
        const p = parseBundle(text);
        if (!p.ok) return setStatus({ text: l.importError[p.error], tone: "bad" });
        let n = 0;
        for (const s of p.systems) {
          const r = createSystem(s.draft, s.source ?? "file", { title: s.title });
          if (!r.ok) {
            refresh();
            return fail(r.error);
          }
          n++;
        }
        refresh();
        const parts = [fill(l.imported, { n })];
        if (p.dropped) parts.push(fill(l.importDropped, { n: p.dropped }));
        if (p.skipped) parts.push(fill(l.importSkipped, { n: p.skipped }));
        setStatus({ text: parts.join(" ") });
      })
      .catch(() => setStatus({ text: l.importError.notJson, tone: "bad" }));
  };

  const duplicate = (m: Row) => {
    const r = duplicateSystem(m.id, { suffix: l.copySuffix });
    if (!r.ok) return fail(r.error);
    refresh();
    setStatus({ text: fill(l.created, { title: r.value.title || l.untitled }) });
  };

  const commitRename = () => {
    if (!renaming) return;
    const r = renameSystem(renaming.id, renaming.text);
    if (!r.ok) return fail(r.error);
    const id = renaming.id;
    setRenaming(null);
    refresh();
    window.requestAnimationFrame(() => document.getElementById(`mf-lib-rename-${id}`)?.focus());
  };

  const remove = (m: Row) => {
    const r = deleteSystem(m.id);
    if (!r.ok) return fail(r.error);
    setConfirming(null);
    refresh();
    setStatus({ text: fill(l.deleted, { title: nameOf(m) }) });
    window.requestAnimationFrame(() => document.getElementById("mf-lib-new")?.focus());
  };

  const copyLink = async (m: Row) => {
    const d = loadSystem(m.id);
    if (!d) return fail("missing");
    const r = await encodeShare(d);
    if (!r.ok) return setStatus({ text: r.error === "tooLong" ? l.shareTooLong : l.shareFail, tone: "bad" });
    try {
      await navigator.clipboard.writeText(shareUrl(window.location.origin, lang, r.code));
      setStatus({ text: l.shareCopied });
    } catch {
      setStatus({ text: l.shareFail, tone: "bad" });
    }
  };

  return (
    <div className="mf-author mf-lib">
      <p className="mf-lib__privacy">{l.privacy}</p>
      {blocked && (
        <p className="mf-author__bad" role="alert">
          {l.blocked}
        </p>
      )}

      <section className="mf-panel__card mf-lib__new" aria-labelledby="mf-lib-new-h">
        <h2 id="mf-lib-new-h">{l.newTitle}</h2>
        <div className="mf-lab__seg">
          <button id="mf-lib-new" type="button" className="mf-btn mf-btn--primary" onClick={newBlank}>
            {l.newBlank}
          </button>
          <BpmnImport a={a} lang={lang} blank onImport={(d) => void add(d, "bpmn")} />
          <PipelineImport lang={lang} initial="gitlab-ci" label={l.newPipeline} onImport={(d, kind) => void add(d, kind)} />
          <PipelineImport lang={lang} initial="mermaid" label={l.newMermaid} onImport={(d, kind) => void add(d, kind)} />
        </div>
        {loadLesson && lessons.length > 0 && (
          <div className="mf-lib__lesson">
            <label>
              {l.fromLesson}
              <select value={pick} onChange={(e) => setPick(e.currentTarget.value)}>
                {lessons.map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="mf-btn" disabled={busy || !pick} onClick={() => void fromLessonPick()}>
              {l.create}
            </button>
          </div>
        )}
      </section>

      <section className="mf-lib__list" aria-labelledby="mf-lib-list-h">
        <div className="mf-lib__head">
          <h2 id="mf-lib-list-h">
            {l.heading} {ready && <small className="mf-lab__muted">{fill(l.countN, { n: items.length })}</small>}
          </h2>
          <div className="mf-lab__seg">
            <button type="button" className="mf-btn" disabled={!items.length} onClick={exportAll}>
              {l.exportAll}
            </button>
            <button type="button" className="mf-btn" onClick={() => fileRef.current?.click()}>
              {l.importFile}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label={l.importFile}
              onChange={(e) => {
                importFile(e.currentTarget.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        <p className={`mf-author__status${status.tone === "bad" ? " mf-author__bad" : ""}`} role="status">
          {status.text}
          {status.link && (
            <>
              {" "}
              <a href={status.link.href}>{status.link.label}</a>
            </>
          )}
        </p>
        {ready && rows.length === 0 && <p className="mf-panel__card mf-lib__empty">{l.empty}</p>}
        {rows.length > 0 && (
          <ul className="mf-lib__items">
            {rows.map((m) => {
              const name = nameOf(m);
              return (
                <li key={m.id} className="mf-panel__card mf-lib__item">
                  <div className="mf-lib__info">
                    <h3 className="mf-lib__title">
                      <a href={editorHref(lang, m.id)}>{name}</a>
                    </h3>
                    <p className="mf-lab__muted mf-lib__meta">
                      {fill(l.stepsN, { n: m.steps })} · {fill(l.casesN, { n: m.cases })} · {fill(l.updated, { date: formatStamp(m.updated) })}
                      {m.source && <> · {l.sources[m.source]}</>}
                    </p>
                  </div>
                  {renaming?.id === m.id ? (
                    <form
                      className="mf-lib__rename"
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitRename();
                      }}
                    >
                      <label>
                        {l.renameLabel}
                        <input
                          value={renaming.text}
                          maxLength={200}
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          onInput={(e) => setRenaming({ id: m.id, text: e.currentTarget.value })}
                          onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                        />
                      </label>
                      <div className="mf-lab__seg">
                        <button type="submit" className="mf-btn mf-btn--primary">
                          {l.save}
                        </button>
                        <button type="button" className="mf-btn" onClick={() => setRenaming(null)}>
                          {l.cancel}
                        </button>
                      </div>
                    </form>
                  ) : confirming === m.id ? (
                    <div className="mf-lib__confirm" role="group" aria-labelledby={`mf-lib-ask-${m.id}`}>
                      <p id={`mf-lib-ask-${m.id}`}>{fill(l.deleteAsk, { title: name })}</p>
                      <div className="mf-lab__seg">
                        <button type="button" className="mf-btn mf-btn--danger" onClick={() => remove(m)}>
                          {l.deleteYes}
                        </button>
                        <button
                          type="button"
                          className="mf-btn"
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          onClick={() => {
                            setConfirming(null);
                            window.requestAnimationFrame(() => document.getElementById(`mf-lib-del-${m.id}`)?.focus());
                          }}
                        >
                          {l.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mf-lib__actions" role="group" aria-label={fill(l.actionsFor, { title: name })}>
                      <a className="mf-btn mf-btn--primary" href={editorHref(lang, m.id)}>
                        {l.open}
                      </a>
                      <a className="mf-btn" href={viewHref(lang, m.id)}>
                        {l.view}
                      </a>
                      <button type="button" className="mf-btn" onClick={() => duplicate(m)}>
                        {l.duplicate}
                      </button>
                      <button id={`mf-lib-rename-${m.id}`} type="button" className="mf-btn" onClick={() => (setConfirming(null), setRenaming({ id: m.id, text: m.title || m.draftTitle }))}>
                        {l.rename}
                      </button>
                      {share && (
                        <button type="button" className="mf-btn" onClick={() => void copyLink(m)}>
                          {l.share}
                        </button>
                      )}
                      <button id={`mf-lib-del-${m.id}`} type="button" className="mf-btn mf-btn--danger" onClick={() => (setRenaming(null), setConfirming(m.id))}>
                        {l.delete}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
