import { useCallback, useEffect, useMemo, useState } from "react";
import { LessonPlayer } from "../LessonPlayer";
import { type UiStrings, fill } from "../ui";
import type { AuthorLang, Draft } from "./model";
import { decodeShare, shareCodeFromHash } from "./bundle";
import { createSystem, draftTitle, loadSystem, migrateLegacyDraft } from "./store";
import { systemLesson } from "./systemLesson";
import { VIEW_UI } from "./view-ui";

type EmptyReason = "none" | "notFound" | "broken" | "tooBig" | "unsupported";
type View =
  | { kind: "loading" }
  | { kind: "empty"; reason: EmptyReason }
  | { kind: "ready"; draft: Draft; slug: string; from: "id" | "link"; id?: string };

export interface SystemViewProps {
  ui: UiStrings;
  lang: AuthorLang;
}

async function readLocation(): Promise<View> {
  const s = shareCodeFromHash(window.location.hash);
  if (s) {
    const r = await decodeShare(s);
    return r.ok ? { kind: "ready", draft: r.draft, slug: "my-shared", from: "link" } : { kind: "empty", reason: r.reason };
  }
  const id = new URLSearchParams(window.location.search).get("id");
  if (id === null) return { kind: "empty", reason: "none" };
  // a bad id, blocked storage and a broken entry all read as nothing
  const draft = loadSystem(id);
  // the progress key is per system so its checks never mix with a built-in lesson of the same slug
  return draft ? { kind: "ready", draft, slug: `my-${id}`, from: "id", id } : { kind: "empty", reason: "notFound" };
}

/**
 * A person's own system played in the real lesson player. Everything happens in the browser:
 * the system comes from localStorage (`?id=`) or from the link hash (`#s=`), which never
 * reaches the server.
 */
export function SystemView({ ui, lang }: SystemViewProps) {
  const v = VIEW_UI[lang] ?? VIEW_UI.en;
  const [view, setView] = useState<View>({ kind: "loading" });
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "fail"; msg: string }>({ state: "idle", msg: "" });

  const load = useCallback(() => {
    let live = true;
    void readLocation().then((next) => {
      if (live) setView(next);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let stop = load();
    const onHash = () => {
      stop();
      setSave({ state: "idle", msg: "" });
      stop = load();
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      stop();
      window.removeEventListener("hashchange", onHash);
    };
  }, [load]);

  const draft = view.kind === "ready" ? view.draft : null;
  const slug = view.kind === "ready" ? view.slug : "";
  // keyed on the draft, not the view: saving a shared system must not restart the player
  const played = useMemo(() => (draft ? systemLesson(draft, lang, slug) : null), [draft, slug, lang]);

  useEffect(() => {
    if (view.kind === "ready") document.title = `${played?.ok ? played.text.title.slice(0, 120) : draftTitle(view.draft) || view.draft.slug} · mufassall`;
  }, [view, played]);

  const onSave = () => {
    if (view.kind !== "ready" || view.from !== "link") return;
    setSave({ state: "saving", msg: v.saving });
    // the old single draft joins the index first, the same way the library and the editor do it
    migrateLegacyDraft();
    const r = createSystem(view.draft, "link");
    if (r.ok) {
      const { id } = r.value;
      setView({ ...view, from: "id", id });
      setSave({ state: "saved", msg: v.saved });
      // the saved copy is the one to come back to: the address no longer carries the link
      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.set("id", id);
      window.history.replaceState(window.history.state, "", url);
    } else {
      setSave({ state: "fail", msg: r.error === "quota" ? v.quota : v.storageOff });
    }
  };

  const library = `/${lang}/my/`;
  const privacy = <p className="mf-sysview__privacy">{v.privacy}</p>;

  if (view.kind === "loading") {
    return (
      <div className="mf-sysview mf-sysview--loading" aria-busy="true">
        <p className="mf-sysview__loading" role="status">
          {v.loading}
        </p>
      </div>
    );
  }

  if (view.kind === "empty" || (played && !played.ok)) {
    const msg =
      view.kind === "empty" ? v.empty[view.reason] : fill(v.empty.unplayable, { x: played && !played.ok ? played.error.slice(0, 200) : "" });
    return (
      <div className="mf-sysview">
        <section className="mf-sysview__empty" aria-live="polite">
          <p>{msg}</p>
          <p className="mf-sysview__actions">
            <a className="mf-btn mf-btn--primary" href={library}>
              {v.library}
            </a>
            {view.kind === "ready" && view.id && (
              <a className="mf-btn" href={`/${lang}/author/?system=${encodeURIComponent(view.id)}`}>
                {v.edit}
              </a>
            )}
          </p>
        </section>
        {privacy}
      </div>
    );
  }

  if (!played?.ok) return null;
  return (
    <div className="mf-sysview">
      <div className="mf-sysview__bar">
        <a className="mf-btn" href={library}>
          ← {v.library}
        </a>
        {view.id && (
          <a className="mf-btn" href={`/${lang}/author/?system=${encodeURIComponent(view.id)}`}>
            {v.edit}
          </a>
        )}
        {view.from === "link" && (
          <button type="button" className="mf-btn mf-btn--primary" onClick={onSave} disabled={save.state === "saving"}>
            {v.save}
          </button>
        )}
      </div>
      {view.from === "link" && save.state !== "saved" && <p className="mf-sysview__note">{v.shared}</p>}
      {played.fallback && (
        <p className="mf-sysview__note">{fill(v.fallback, { want: v.langNames[lang], lang: v.langNames[played.lang] })}</p>
      )}
      <p className={`mf-sysview__status${save.state === "fail" ? " mf-sysview__status--bad" : ""}`} role="status">
        {save.msg}
        {save.state === "saved" && (
          <>
            {" "}
            <a href={library}>{v.openSaved}</a>
          </>
        )}
      </p>
      {privacy}
      <LessonPlayer lesson={played.lesson} text={played.text} ui={ui} lang={lang} privateContent />
    </div>
  );
}
