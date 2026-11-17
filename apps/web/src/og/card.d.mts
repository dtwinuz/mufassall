export declare const OG_WIDTH: 1200;
export declare const OG_HEIGHT: 630;

export interface CardText {
  /** small accent line above the title (section name, or the tagline) */
  kicker: string;
  title: string;
  /** bottom line, e.g. "Beginner · 8 min" */
  meta?: string;
}

/** 1200x630 PNG share card. */
export declare function renderCard(text: CardText): Promise<Uint8Array<ArrayBuffer>>;
