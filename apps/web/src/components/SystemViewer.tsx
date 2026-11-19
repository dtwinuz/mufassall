import type { Lang } from "@mufassall/content";
// TODO(orchestrator): switch to "@mufassall/scene-engine/system-view" once that export exists
import { SystemView } from "../../../../packages/scene-engine/src/author/SystemView";
import { player } from "../i18n/ui";

/** Island wrapper: the system lives in the reader's browser, so nothing crosses as props but the language. */
export default function SystemViewer({ lang }: { lang: Lang }) {
  return <SystemView ui={player[lang]} lang={lang} />;
}
