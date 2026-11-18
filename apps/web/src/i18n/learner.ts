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
/** Test mode: a short exam per section from the lessons' checks. Checked by pages/[lang]/test/_core.test.ts. */
export interface TestStrings {
  nav: string;
  title: string;
  lead: string;
  questionsN: string; // "{n} questions"
  best: string; // "Best: {p}%"
  notTaken: string;
  open: string;
  sectionTitle: string; // "Test: {section}"
  sectionLead: string; // {n} questions, {pass} percent
  progress: string; // "{i} / {n}"
  seed: string; // "Test #{seed}"
  next: string;
  finish: string;
  keys: string;
  result: string; // {right} {n} {p}
  passed: string;
  failed: string; // {pass}
  bestNow: string; // {p}
  yours: string;
  none: string; // no answer given
  correct: string;
  why: string;
  right: string;
  wrong: string;
  back: string;
  retake: string;
  fresh: string;
  all: string;
  empty: string;
  fail: string;
  noscript: string;
}

export const test: Record<"uz" | "ru" | "en", TestStrings> = {
  uz: {
    nav: "Test",
    title: "Bo'lim testlari",
    lead: "Darslardagi savollardan tuzilgan qisqa imtihon: maslahatsiz, javoblar oxirida ko'rsatiladi. O'tish bali 70%. Natijalar faqat shu brauzerda saqlanadi.",
    questionsN: "{n} ta savol",
    best: "Eng yaxshi: {p}%",
    notTaken: "Hali topshirilmagan",
    open: "Testni boshlash",
    sectionTitle: "Test: {section}",
    sectionLead: "Bo'lim darslaridan {n} ta savol, maslahatsiz. To'g'ri javoblar va izohlar oxirida chiqadi. O'tish bali {pass}%.",
    progress: "{i} / {n}",
    seed: "Test #{seed}",
    next: "Keyingisi",
    finish: "Yakunlash",
    keys: "Klavishlar: 1-4 tanlash, Enter keyingisi",
    result: "{right} / {n} to'g'ri · {p}%",
    passed: "O'tdingiz",
    failed: "Hali o'tilmadi: {pass}% kerak",
    bestNow: "Eng yaxshi natija: {p}%",
    yours: "Sizning javobingiz",
    none: "javob berilmagan",
    correct: "To'g'ri javob",
    why: "Nega",
    right: "to'g'ri",
    wrong: "xato",
    back: "Qadamga qaytish",
    retake: "Shu testni qayta topshirish",
    fresh: "Yangi savollar to'plami",
    all: "Barcha testlar",
    empty: "Bu bo'limda hali savollar yo'q.",
    fail: "Savollar yuklanmadi. Internetni tekshirib, sahifani yangilang.",
    noscript: "Test JavaScript bilan ishlaydi.",
  },
  ru: {
    nav: "Тест",
    title: "Тесты по разделам",
    lead: "Короткий экзамен из вопросов уроков: без подсказок, ответы показываются в конце. Проходной балл 70%. Результаты хранятся только в этом браузере.",
    questionsN: "Вопросов: {n}",
    best: "Лучший: {p}%",
    notTaken: "Ещё не пройден",
    open: "Пройти тест",
    sectionTitle: "Тест: {section}",
    sectionLead: "Вопросы из уроков раздела, без подсказок (всего: {n}). Правильные ответы и пояснения появятся в конце. Проходной балл {pass}%.",
    progress: "{i} / {n}",
    seed: "Тест #{seed}",
    next: "Дальше",
    finish: "Завершить",
    keys: "Клавиши: 1-4 выбор, Enter дальше",
    result: "Верно {right} из {n} · {p}%",
    passed: "Тест пройден",
    failed: "Пока не пройден: нужно {pass}%",
    bestNow: "Лучший результат: {p}%",
    yours: "Ваш ответ",
    none: "нет ответа",
    correct: "Правильный ответ",
    why: "Почему",
    right: "верно",
    wrong: "неверно",
    back: "Вернуться к шагу",
    retake: "Пройти этот же тест снова",
    fresh: "Новый набор вопросов",
    all: "Все тесты",
    empty: "В этом разделе пока нет вопросов.",
    fail: "Не удалось загрузить вопросы. Проверьте соединение и обновите страницу.",
    noscript: "Тест работает с JavaScript.",
  },
  en: {
    nav: "Test",
    title: "Section tests",
    lead: "A short exam built from the lessons' questions: no hints, answers at the end. Pass mark 70%. Results stay in this browser only.",
    questionsN: "{n} questions",
    best: "Best: {p}%",
    notTaken: "Not taken yet",
    open: "Take the test",
    sectionTitle: "Test: {section}",
    sectionLead: "{n} questions from this section's lessons, no hints. Right answers and explanations come at the end. Pass mark {pass}%.",
    progress: "{i} / {n}",
    seed: "Test #{seed}",
    next: "Next",
    finish: "Finish",
    keys: "Keys: 1-4 choose, Enter next",
    result: "{right} of {n} right · {p}%",
    passed: "Passed",
    failed: "Not passed yet: {pass}% needed",
    bestNow: "Best result: {p}%",
    yours: "Your answer",
    none: "no answer",
    correct: "Right answer",
    why: "Why",
    right: "right",
    wrong: "wrong",
    back: "Back to the step",
    retake: "Retake the same test",
    fresh: "New set of questions",
    all: "All tests",
    empty: "This section has no questions yet.",
    fail: "Could not load the questions. Check the connection and reload the page.",
    noscript: "The test needs JavaScript.",
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
