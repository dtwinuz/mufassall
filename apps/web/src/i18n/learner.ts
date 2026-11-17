/**
 * Shape of the learner-tool strings (site[lang].learner): estimate calculator, streak, cheat sheets,
 * compare, learning paths and share cards. site.ts only imports types from here, so
 * tools/check-i18n.mjs can load it as is.
 */

/** "Diagram as code" on the cheat sheet. Checked by learner.test.ts (all languages, no Cyrillic in uz/en). */
export interface DiagramStrings {
  title: string;
  lead: string;
  tabs: string; // aria label of the tab list
  flow: string;
  seq: string;
  d2: string;
  copy: string;
  copied: string;
  failed: string;
  /** words on edges inside the generated code */
  words: { retry: string; dup: string; lost: string; call: string; async: string };
}

export const diagram: Record<"uz" | "ru" | "en", DiagramStrings> = {
  uz: {
    title: "Diagramma kod sifatida",
    lead: "Darsdagi yakuniy sxemani matn ko'rinishida oling va Jira, GitLab, GitHub, Notion yoki hujjatga qo'ying: Mermaid u yerlarda o'zi chiziladi. D2 uchun alohida variant bor.",
    tabs: "Diagramma formati",
    flow: "Mermaid: sxema",
    seq: "Mermaid: so'rovlar ketma-ketligi",
    d2: "D2",
    copy: "Nusxa olish",
    copied: "Nusxa olindi",
    failed: "Nusxa olinmadi: matn belgilandi, Ctrl+C bosing",
    words: { retry: "qayta urinish", dup: "dublikat", lost: "yo'qoldi", call: "chaqiruv", async: "asinxron" },
  },
  ru: {
    title: "Диаграмма как код",
    lead: "Итоговая схема урока в виде текста: вставьте её в Jira, GitLab, GitHub, Notion или документацию, там Mermaid рисуется сам. Есть и вариант для D2.",
    tabs: "Формат диаграммы",
    flow: "Mermaid: схема",
    seq: "Mermaid: последовательность запросов",
    d2: "D2",
    copy: "Копировать",
    copied: "Скопировано",
    failed: "Не удалось скопировать: текст выделен, нажмите Ctrl+C",
    words: { retry: "повтор", dup: "дубль", lost: "потеряно", call: "вызов", async: "асинхронно" },
  },
  en: {
    title: "Diagram as code",
    lead: "The lesson's final design as text: paste it into Jira, GitLab, GitHub, Notion or your docs, where Mermaid renders by itself. There is a D2 version too.",
    tabs: "Diagram format",
    flow: "Mermaid: flowchart",
    seq: "Mermaid: request sequence",
    d2: "D2",
    copy: "Copy",
    copied: "Copied",
    failed: "Could not copy: the text is selected, press Ctrl+C",
    words: { retry: "retry", dup: "duplicate", lost: "lost", call: "call", async: "async" },
  },
};
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
