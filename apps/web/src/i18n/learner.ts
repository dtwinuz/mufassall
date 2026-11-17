/**
 * Shape of the learner-tool strings (site[lang].learner): estimate calculator, streak, cheat sheets,
 * compare, learning paths and share cards. Types only, so tools/check-i18n.mjs can load site.ts as is.
 */
export interface LearnerStrings {
  nav: { tools: string; paths: string };
  tools: { title: string; lead: string; open: string; items: Record<"estimate" | "compare" | "lab" | "paths", { title: string; text: string }> };
  estimate: {
    title: string;
    lead: string;
    noscript: string;
    presets: string;
    presetNames: Record<"url" | "feed" | "chat" | "video", string>;
    inputs: string;
    fields: Record<"dau" | "actions" | "ratio" | "payload" | "retention" | "peak" | "replicas" | "perServer", { label: string; hint: string }>;
    results: string;
    groups: Record<"traffic" | "bandwidth" | "storage" | "fleet", string>;
    rows: Record<
      "requests" | "avgReads" | "avgWrites" | "peakReads" | "peakWrites" | "bwIn" | "bwOut" | "storeDay" | "storeYear" | "storeKept" | "servers" | "cache",
      string
    >;
    /** unit suffixes inside formulas */
    perDay: string;
    perSec: string;
    days: string;
    servers: string;
    copy: string;
    copied: string;
    note: string;
  };
  streak: {
    title: string;
    current: string;
    best: string;
    daysN: string; // "{n} days"
    heat: string; // aria label of the 12-week grid
    active: string; // "{date}: active"
    idle: string; // "{date}: no activity"
    goal: string;
    goals: Record<"s5" | "c5" | "c10", string>;
    today: string; // "Today: {n} / {goal}"
    reached: string;
    paths: string;
  };
  sheet: {
    link: string;
    title: string;
    problem: string;
    learn: string;
    recap: string;
    metrics: string;
    metric: string;
    before: string;
    after: string;
    steps: string;
    terms: string;
    scene: string;
    print: string;
    open: string;
  };
  compare: { title: string; lead: string; a: string; b: string; swap: string; show: string; suggested: string; loading: string; fail: string; vs: string };
  paths: {
    title: string;
    lead: string;
    lessonsN: string; // "{n} lessons · {m} min"
    progress: string; // "{done} of {total} done"
    start: string;
    continue: string;
    done: string;
    items: Record<string, { title: string; text: string }>;
  };
  share: {
    button: string;
    course: string;
    courseText: string;
    title: string;
    sectionDone: string;
    courseDone: string;
    lessonsN: string;
    name: string;
    nameNote: string;
    preview: string;
    download: string;
    send: string;
    close: string;
    text: string;
  };
}
