/** Lesson practice strings ("build it yourself" in the Lab), per language. */
export interface PracticeStrings {
  heading: string;
  /** "{title}" is the lesson title */
  task: string;
  lead: string;
  loading: string;
  loadFail: string;
  /** "{path}" is "Client → Service → Database" */
  rulePath: string;
  ruleNoEdge: string;
  ruleLink: string;
  /** "{n} of {total} checks pass" */
  progress: string;
  /** screen-reader prefix of a checklist row */
  passed: string;
  notYet: string;
  hint: string;
  hintNext: string;
  /** "Hint {n} of {total}" */
  hintLevel: string;
  hintKinds: string;
  hintLinks: string;
  hintPaths: string;
  showSolution: string;
  solutionAsk: string;
  solutionYes: string;
  solutionNo: string;
  solutionShown: string;
  back: string;
  done: string;
  /** "{date}" is YYYY-MM-DD */
  solvedOn: string;
  startOver: string;
  exit: string;
}

export const PRACTICE_UI: Record<"uz" | "ru" | "en", PracticeStrings> = {
  uz: {
    heading: "O'zingiz quring",
    task: "Mashq: {title}",
    lead: "Darsdagi yakuniy dizaynni bo'sh kanvasda qayta quring. Tekshiruvlar har o'zgarishda yangilanadi.",
    loading: "Mashq yuklanmoqda…",
    loadFail: "Mashqni yuklab bo'lmadi. Internetni tekshiring yoki darsga qayting.",
    rulePath: "So'rov yo'li bor: {path}",
    ruleNoEdge: "{from} {to} bilan to'g'ridan-to'g'ri ulanmagan",
    ruleLink: "{from} {to} ga javob (ack) chizig'i bilan ulangan",
    progress: "{total} ta tekshiruvdan {n} tasi o'tdi",
    passed: "O'tdi",
    notYet: "Hali yo'q",
    hint: "Maslahat",
    hintNext: "Keyingi maslahat",
    hintLevel: "Maslahat {n} / {total}",
    hintKinds: "Kerakli bloklar: {list}",
    hintLinks: "Ulanishlar: {list}",
    hintPaths: "So'rov yo'llari:",
    showSolution: "Yechimni ko'rsatish",
    solutionAsk: "Kanvas darsdagi dizayn bilan almashtiriladi. Bekor qilish (Ctrl+Z) sizning variantingizni qaytaradi.",
    solutionYes: "Ha, ko'rsatish",
    solutionNo: "Yo'q",
    solutionShown: "Yechim yuklandi. Uni o'zgartirib ko'ring yoki tozalab, qaytadan quring.",
    back: "Darsga qaytish",
    done: "Zo'r! Diagramma barcha tekshiruvlardan o'tdi.",
    solvedOn: "Bajarilgan: {date}",
    startOver: "Boshidan boshlash",
    exit: "Erkin Labga o'tish",
  },
  ru: {
    heading: "Соберите сами",
    task: "Практика: {title}",
    lead: "Соберите итоговую схему урока на пустом холсте. Проверки обновляются при каждом изменении.",
    loading: "Загружаем практику…",
    loadFail: "Не удалось загрузить практику. Проверьте интернет или вернитесь к уроку.",
    rulePath: "Есть путь запроса: {path}",
    ruleNoEdge: "{from} не связан с {to} напрямую",
    ruleLink: "{from} отвечает {to} линией подтверждения (ack)",
    progress: "Пройдено проверок: {n} из {total}",
    passed: "Выполнено",
    notYet: "Ещё нет",
    hint: "Подсказка",
    hintNext: "Следующая подсказка",
    hintLevel: "Подсказка {n} из {total}",
    hintKinds: "Нужные блоки: {list}",
    hintLinks: "Связи: {list}",
    hintPaths: "Пути запросов:",
    showSolution: "Показать решение",
    solutionAsk: "Холст заменится схемой из урока. Отмена (Ctrl+Z) вернёт ваш вариант.",
    solutionYes: "Да, показать",
    solutionNo: "Нет",
    solutionShown: "Решение загружено. Поменяйте его или очистите холст и соберите заново.",
    back: "Назад к уроку",
    done: "Отлично! Схема проходит все проверки.",
    solvedOn: "Решено: {date}",
    startOver: "Начать заново",
    exit: "Перейти в свободную лабораторию",
  },
  en: {
    heading: "Build it yourself",
    task: "Practice: {title}",
    lead: "Rebuild the lesson's final design on an empty canvas. The checks update with every edit.",
    loading: "Loading the practice…",
    loadFail: "Could not load the practice. Check your connection or go back to the lesson.",
    rulePath: "A request path: {path}",
    ruleNoEdge: "{from} is not wired straight to {to}",
    ruleLink: "{from} replies to {to} with an ack line",
    progress: "{n} of {total} checks pass",
    passed: "Passed",
    notYet: "Not yet",
    hint: "Hint",
    hintNext: "Next hint",
    hintLevel: "Hint {n} of {total}",
    hintKinds: "Blocks you need: {list}",
    hintLinks: "Connections: {list}",
    hintPaths: "Request paths:",
    showSolution: "Show solution",
    solutionAsk: "The canvas is replaced with the lesson's design. Undo (Ctrl+Z) brings yours back.",
    solutionYes: "Yes, show it",
    solutionNo: "No",
    solutionShown: "Solution loaded. Change it, or clear the canvas and build it again.",
    back: "Back to lesson",
    done: "Well done! The diagram passes every check.",
    solvedOn: "Solved: {date}",
    startOver: "Start over",
    exit: "Go to the free Lab",
  },
};

/** "uz" | "ru" | "en" from a page language, English otherwise. */
export function practiceStrings(lang: string): PracticeStrings {
  return lang === "uz" || lang === "ru" ? PRACTICE_UI[lang] : PRACTICE_UI.en;
}
