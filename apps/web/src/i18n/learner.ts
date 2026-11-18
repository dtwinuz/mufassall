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
  pumlSeq: string;
  puml: string;
  copy: string;
  copied: string;
  failed: string;
  /** words on edges inside the generated code */
  words: { retry: string; dup: string; lost: string; call: string; async: string };
}

export const diagram: Record<"uz" | "ru" | "en", DiagramStrings> = {
  uz: {
    title: "Diagramma kod sifatida",
    lead: "Darsdagi yakuniy sxemani matn ko'rinishida oling va Jira, GitLab, GitHub, Notion yoki hujjatga qo'ying: Mermaid u yerlarda o'zi chiziladi. D2 va PlantUML (Confluence, IntelliJ) uchun alohida variantlar bor.",
    tabs: "Diagramma formati",
    flow: "Mermaid: sxema",
    seq: "Mermaid: so'rovlar ketma-ketligi",
    d2: "D2",
    pumlSeq: "PlantUML: so'rovlar ketma-ketligi",
    puml: "PlantUML: komponentlar",
    copy: "Nusxa olish",
    copied: "Nusxa olindi",
    failed: "Nusxa olinmadi: matn belgilandi, Ctrl+C bosing",
    words: { retry: "qayta urinish", dup: "dublikat", lost: "yo'qoldi", call: "chaqiruv", async: "asinxron" },
  },
  ru: {
    title: "Диаграмма как код",
    lead: "Итоговая схема урока в виде текста: вставьте её в Jira, GitLab, GitHub, Notion или документацию, там Mermaid рисуется сам. Есть варианты для D2 и PlantUML (Confluence, IntelliJ).",
    tabs: "Формат диаграммы",
    flow: "Mermaid: схема",
    seq: "Mermaid: последовательность запросов",
    d2: "D2",
    pumlSeq: "PlantUML: последовательность запросов",
    puml: "PlantUML: компоненты",
    copy: "Копировать",
    copied: "Скопировано",
    failed: "Не удалось скопировать: текст выделен, нажмите Ctrl+C",
    words: { retry: "повтор", dup: "дубль", lost: "потеряно", call: "вызов", async: "асинхронно" },
  },
  en: {
    title: "Diagram as code",
    lead: "The lesson's final design as text: paste it into Jira, GitLab, GitHub, Notion or your docs, where Mermaid renders by itself. There are D2 and PlantUML (Confluence, IntelliJ) versions too.",
    tabs: "Diagram format",
    flow: "Mermaid: flowchart",
    seq: "Mermaid: request sequence",
    d2: "D2",
    pumlSeq: "PlantUML: request sequence",
    puml: "PlantUML: components",
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

/** "My progress" page (/<lang>/me/): overview, export/import between devices, reset. Checked by pages/[lang]/_me.test.ts. */
export interface MeStrings {
  nav: string;
  title: string;
  lead: string;
  noscript: string;
  storage: string; // localStorage blocked
  empty: string;
  start: string;
  continue: string; // "Continue: {lesson}"
  statsTitle: string;
  lessons: string;
  of: string; // "{done} / {total}"
  streak: string;
  best: string;
  daysN: string; // "{n} days"
  goal: string;
  goalReached: string;
  review: string;
  reviewOf: string; // {due} {total}
  recall: string; // {r}
  reviewGo: string;
  sectionsTitle: string;
  sectionOf: string; // {done} {total}
  stateDone: string;
  stateStarted: string;
  stateNone: string;
  testsTitle: string;
  testBest: string; // {p}
  testLast: string; // {p} {date}
  testPass: string;
  testFail: string; // {pass}
  testNone: string;
  testsGo: string;
  certTitle: string;
  certYes: string;
  certNo: string; // {n}
  certGo: string;
  moveTitle: string;
  moveLead: string;
  exportTitle: string;
  download: string;
  copy: string;
  showCode: string;
  codeLabel: string;
  codeNote: string;
  copyCode: string;
  copied: string;
  copyFail: string;
  exportEmpty: string;
  importTitle: string;
  file: string;
  paste: string;
  check: string;
  previewTitle: string;
  previewFrom: string; // {date}
  changes: Record<"lessons" | "checks" | "cards" | "tests" | "days" | "other", string>; // {n}
  nothing: string;
  confirm: string;
  cancel: string;
  imported: string; // {n}
  writeFail: string;
  errors: Record<"empty" | "json" | "app" | "version" | "keys" | "values" | "size" | "read", string>;
  resetTitle: string;
  resetLead: string;
  reset: string;
  resetSure: string;
  resetYes: string;
  resetDone: string;
}

export const me: Record<"uz" | "ru" | "en", MeStrings> = {
  uz: {
    nav: "Natijalarim",
    title: "Mening natijalarim",
    lead: "Darslar, takrorlash, testlar va ketma-ket kunlar bir joyda. Hammasi faqat shu brauzerda saqlanadi: akkaunt yo'q, boshqa qurilmaga fayl yoki kod orqali o'tkazasiz.",
    noscript: "Natijalar brauzer xotirasidan o'qiladi, buning uchun JavaScript kerak. Quyida kurs darslari ro'yxati.",
    storage: "Bu brauzerda xotira yopiq: natijalarni o'qib ham, saqlab ham bo'lmaydi.",
    empty: "Hali natija yo'q: birinchi darsdan keyin shu yerda paydo bo'ladi.",
    start: "Birinchi darsni boshlash",
    continue: "Davom etish: {lesson}",
    statsTitle: "Umumiy holat",
    lessons: "Tugatilgan darslar",
    of: "{done} / {total}",
    streak: "Ketma-ket kunlar",
    best: "Eng uzun seriya",
    daysN: "{n} kun",
    goal: "Bugungi maqsad",
    goalReached: "Bajarildi",
    review: "Takrorlash kartalari",
    reviewOf: "Bugun {due} ta · jami {total} ta",
    recall: "Taxminiy eslab qolish: {r}%",
    reviewGo: "Takrorlashga o'tish",
    sectionsTitle: "Bo'limlar bo'yicha darslar",
    sectionOf: "{done} / {total} tugatildi",
    stateDone: "tugatilgan",
    stateStarted: "boshlangan",
    stateNone: "boshlanmagan",
    testsTitle: "Bo'lim testlari",
    testBest: "Eng yaxshi: {p}%",
    testLast: "oxirgisi {p}%, {date}",
    testPass: "o'tildi",
    testFail: "o'tilmadi, {pass}% kerak",
    testNone: "topshirilmagan",
    testsGo: "Testlarga o'tish",
    certTitle: "Kurs sertifikati",
    certYes: "Barcha darslar tugatildi: sertifikat bosh sahifada tayyor.",
    certNo: "Sertifikat uchun yana {n} ta darsni tugating.",
    certGo: "Sertifikatni ochish",
    moveTitle: "Boshqa qurilmaga o'tkazish",
    moveLead: "Shu yerda eksport qiling, ikkinchi qurilmada shu sahifani ochib import qiling. Import birlashtiradi: ikkala qurilmadagi yutuqlar saqlanadi, hech narsa ko'r-ko'rona ustidan yozilmaydi.",
    exportTitle: "Eksport",
    download: "Faylni yuklab olish",
    copy: "Matn sifatida nusxa olish",
    showCode: "O'tkazish kodini ko'rsatish",
    codeLabel: "O'tkazish kodi",
    codeNote: "Fayl ochib bo'lmaydigan telefon uchun: kodni nusxalab, o'zingizga xabar qilib yuboring va ikkinchi qurilmada qo'ying. Kod uzun bo'lishi mumkin.",
    copyCode: "Kodni nusxalash",
    copied: "Nusxa olindi",
    copyFail: "Nusxa olinmadi: matn belgilandi, Ctrl+C bosing",
    exportEmpty: "Hali eksport qiladigan narsa yo'q.",
    importTitle: "Import",
    file: "Faylni tanlash",
    paste: "Yoki matnni, yoki o'tkazish kodini shu yerga qo'ying",
    check: "Tekshirish",
    previewTitle: "Nima o'zgaradi",
    previewFrom: "Fayl sanasi: {date}",
    changes: {
      lessons: "Darslarda oldinga siljish: {n}",
      checks: "Yangi javoblar: {n}",
      cards: "Qo'shiladigan yoki yangilanadigan kartalar: {n}",
      tests: "Yaxshilanadigan test natijalari: {n}",
      days: "Qo'shiladigan o'qish kunlari: {n}",
      other: "Boshqa yozuvlar: {n}",
    },
    nothing: "Yangi narsa yo'q: bu qurilmada hammasi bor.",
    confirm: "Import qilib birlashtirish",
    cancel: "Bekor qilish",
    imported: "Import qilindi: {n} ta yozuv yangilandi.",
    writeFail: "Ba'zi yozuvlar saqlanmadi: brauzer xotirasi to'lgan yoki yopiq.",
    errors: {
      empty: "Bu yerda natija yo'q.",
      json: "Bu natijalar fayli ham, o'tkazish kodi ham emas.",
      app: "Fayl mufassall'dan emas.",
      version: "Fayl versiyasi qo'llab-quvvatlanmaydi.",
      keys: "Faylda mufassall'ga tegishli bo'lmagan yozuvlar bor.",
      values: "Fayl buzilgan: qiymatlar matn bo'lishi kerak.",
      size: "Fayl juda katta (chegara 1 MB).",
      read: "Faylni o'qib bo'lmadi.",
    },
    resetTitle: "Hammasini o'chirish",
    resetLead: "Darslardagi holat, javoblar, takrorlash kartalari, test natijalari, ketma-ket kunlar va Lab qoralamalari shu brauzerdan o'chadi. Mavzu va klavish sozlamalari qoladi.",
    reset: "Barcha natijalarni o'chirish",
    resetSure: "Buni qaytarib bo'lmaydi. Kerak bo'lishi mumkin bo'lsa, avval eksport qiling.",
    resetYes: "Ha, hammasini o'chirish",
    resetDone: "Natijalar o'chirildi.",
  },
  ru: {
    nav: "Мой прогресс",
    title: "Мой прогресс",
    lead: "Уроки, повторение, тесты и серия дней в одном месте. Всё хранится только в этом браузере: аккаунта нет, на другое устройство прогресс переносится файлом или кодом.",
    noscript: "Прогресс читается из памяти браузера, для этого нужен JavaScript. Ниже список уроков курса.",
    storage: "В этом браузере хранилище закрыто: прогресс нельзя ни прочитать, ни сохранить.",
    empty: "Пока пусто: прогресс появится после первого урока.",
    start: "Начать первый урок",
    continue: "Продолжить: {lesson}",
    statsTitle: "Сводка",
    lessons: "Пройдено уроков",
    of: "{done} / {total}",
    streak: "Серия дней",
    best: "Лучшая серия",
    daysN: "Дней: {n}",
    goal: "Цель на сегодня",
    goalReached: "Выполнена",
    review: "Карточки повторения",
    reviewOf: "Сегодня: {due} · всего: {total}",
    recall: "Оценка запоминания: {r}%",
    reviewGo: "Перейти к повторению",
    sectionsTitle: "Уроки по разделам",
    sectionOf: "Пройдено {done} из {total}",
    stateDone: "пройден",
    stateStarted: "начат",
    stateNone: "не начат",
    testsTitle: "Тесты по разделам",
    testBest: "Лучший: {p}%",
    testLast: "последний {p}%, {date}",
    testPass: "пройден",
    testFail: "не пройден, нужно {pass}%",
    testNone: "не сдавался",
    testsGo: "Перейти к тестам",
    certTitle: "Сертификат курса",
    certYes: "Все уроки пройдены: сертификат готов на главной странице.",
    certNo: "До сертификата осталось уроков: {n}.",
    certGo: "Открыть сертификат",
    moveTitle: "Перенос на другое устройство",
    moveLead: "Экспортируйте здесь, затем откройте эту страницу на втором устройстве и импортируйте. Импорт объединяет: прогресс с обоих устройств сохраняется, ничего не перезаписывается вслепую.",
    exportTitle: "Экспорт",
    download: "Скачать файл",
    copy: "Скопировать как текст",
    showCode: "Показать код переноса",
    codeLabel: "Код переноса",
    codeNote: "Для телефона без доступа к файлам: скопируйте код, отправьте его себе сообщением и вставьте на втором устройстве. Код может быть длинным.",
    copyCode: "Скопировать код",
    copied: "Скопировано",
    copyFail: "Не удалось скопировать: текст выделен, нажмите Ctrl+C",
    exportEmpty: "Пока нечего экспортировать.",
    importTitle: "Импорт",
    file: "Выбрать файл",
    paste: "Или вставьте сюда текст либо код переноса",
    check: "Проверить",
    previewTitle: "Что изменится",
    previewFrom: "Дата файла: {date}",
    changes: {
      lessons: "Уроки с продвижением: {n}",
      checks: "Новые ответы: {n}",
      cards: "Карточки добавятся или обновятся: {n}",
      tests: "Улучшатся результаты тестов: {n}",
      days: "Добавятся дни занятий: {n}",
      other: "Другие записи: {n}",
    },
    nothing: "Ничего нового: на этом устройстве уже всё есть.",
    confirm: "Импортировать и объединить",
    cancel: "Отмена",
    imported: "Импорт выполнен, обновлено записей: {n}.",
    writeFail: "Часть записей не сохранилась: память браузера заполнена или закрыта.",
    errors: {
      empty: "Здесь нет прогресса.",
      json: "Это не файл прогресса и не код переноса.",
      app: "Файл не от mufassall.",
      version: "Эта версия файла не поддерживается.",
      keys: "В файле есть записи, не относящиеся к mufassall.",
      values: "Файл повреждён: значения должны быть текстом.",
      size: "Файл слишком большой (предел 1 МБ).",
      read: "Не удалось прочитать файл.",
    },
    resetTitle: "Удалить всё",
    resetLead: "Из этого браузера удалятся прогресс уроков, ответы, карточки повторения, результаты тестов, серия дней и черновики Lab. Тема и настройки клавиш останутся.",
    reset: "Удалить весь прогресс",
    resetSure: "Это нельзя отменить. Если прогресс может понадобиться, сначала сделайте экспорт.",
    resetYes: "Да, удалить всё",
    resetDone: "Прогресс удалён.",
  },
  en: {
    nav: "My progress",
    title: "My progress",
    lead: "Lessons, review, tests and your streak in one place. Everything stays in this browser only: there is no account, so you move progress to another device with a file or a code.",
    noscript: "Progress is read from the browser's storage, which needs JavaScript. The course lessons are listed below.",
    storage: "Storage is blocked in this browser: progress can be neither read nor saved.",
    empty: "Nothing here yet: your progress shows up after the first lesson.",
    start: "Start the first lesson",
    continue: "Continue: {lesson}",
    statsTitle: "Overview",
    lessons: "Lessons done",
    of: "{done} / {total}",
    streak: "Streak",
    best: "Best streak",
    daysN: "{n} days",
    goal: "Today's goal",
    goalReached: "Reached",
    review: "Review cards",
    reviewOf: "{due} due today · {total} total",
    recall: "Estimated recall: {r}%",
    reviewGo: "Open review",
    sectionsTitle: "Lessons by section",
    sectionOf: "{done} of {total} done",
    stateDone: "done",
    stateStarted: "started",
    stateNone: "not started",
    testsTitle: "Section tests",
    testBest: "Best: {p}%",
    testLast: "last {p}% on {date}",
    testPass: "passed",
    testFail: "not passed, {pass}% needed",
    testNone: "not taken",
    testsGo: "Open the tests",
    certTitle: "Course certificate",
    certYes: "Every lesson is done: your certificate is ready on the home page.",
    certNo: "Finish {n} more lessons to get the certificate.",
    certGo: "Open the certificate",
    moveTitle: "Move to another device",
    moveLead: "Export here, then open this page on the other device and import. Import merges: progress from both devices is kept and nothing is overwritten blindly.",
    exportTitle: "Export",
    download: "Download the file",
    copy: "Copy as text",
    showCode: "Show the transfer code",
    codeLabel: "Transfer code",
    codeNote: "For a phone without file access: copy the code, send it to yourself in a message and paste it on the other device. The code can be long.",
    copyCode: "Copy the code",
    copied: "Copied",
    copyFail: "Could not copy: the text is selected, press Ctrl+C",
    exportEmpty: "Nothing to export yet.",
    importTitle: "Import",
    file: "Choose a file",
    paste: "Or paste the text or the transfer code here",
    check: "Check",
    previewTitle: "What will change",
    previewFrom: "File date: {date}",
    changes: {
      lessons: "Lessons moved forward: {n}",
      checks: "New answers: {n}",
      cards: "Review cards added or updated: {n}",
      tests: "Test results improved: {n}",
      days: "Learning days added: {n}",
      other: "Other entries: {n}",
    },
    nothing: "Nothing new: this device already has all of it.",
    confirm: "Import and merge",
    cancel: "Cancel",
    imported: "Imported: {n} entries updated.",
    writeFail: "Some entries were not saved: browser storage is full or blocked.",
    errors: {
      empty: "There is no progress in it.",
      json: "This is neither a progress file nor a transfer code.",
      app: "The file is not from mufassall.",
      version: "This file version is not supported.",
      keys: "The file has entries that do not belong to mufassall.",
      values: "The file is damaged: values must be text.",
      size: "The file is too big (limit 1 MB).",
      read: "Could not read the file.",
    },
    resetTitle: "Delete everything",
    resetLead: "Removes lesson progress, answers, review cards, test results, the streak and Lab drafts from this browser. Theme and keyboard settings stay.",
    reset: "Reset all progress",
    resetSure: "This cannot be undone. Export first if you might need it.",
    resetYes: "Yes, delete everything",
    resetDone: "Progress deleted.",
  },
};

export interface LearnerStrings {
  nav: { tools: string; paths: string };
  tools: { title: string; lead: string; open: string; items: Record<"estimate" | "compare" | "lab" | "paths" | "author", { title: string; text: string }> };
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
