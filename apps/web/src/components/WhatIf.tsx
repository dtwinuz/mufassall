import type { Lang } from "@mufassall/content";
import { WhatIf as Panel } from "@mufassall/scene-engine/whatif";

/**
 * Island wrapper for the "What happens if…" panel. Only the slug and language cross the island
 * boundary; the page renders it just for lessons that have a model, so other lessons ship none of it.
 */
export default function WhatIf({ slug, lang }: { slug: string; lang: Lang }) {
  return <Panel slug={slug} lang={lang} />;
}
