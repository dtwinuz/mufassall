import type { Lang } from "@mufassall/content";
import { LabEditor } from "@mufassall/scene-engine/lab-editor";
import { player } from "../i18n/ui";
import { lab } from "../i18n/site";

/** Island wrapper for the Lab editor; only the language crosses the island boundary. */
export default function Lab({ lang }: { lang: Lang }) {
  return <LabEditor ui={player[lang]} lab={lab[lang]} />;
}
