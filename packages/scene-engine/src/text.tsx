import { Fragment, type ReactNode } from "react";

/** `code` and **bold** only; lesson text is authored, never user input. */
export function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((p, i) => <p key={i}>{inline(p)}</p>);
}

/** Strips inline markup for attributes (title, aria-label). */
export const plain = (s: string) => s.replace(/\*\*|`/g, "");
