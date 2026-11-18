import type { BpmnErrorCode, BpmnWarningCode } from "./bpmn";
import type { AuthorLang } from "./model";
import type { IssueCode } from "./validation";

/** Author mode strings. `{x}` placeholders are filled with `fill`. */
export interface AuthorStrings {
  langNames: Record<AuthorLang, string>;
  contentLang: string;
  contentLangHint: string;
  tabs: { edit: string; preview: string; export: string };
  tabsLabel: string;
  lesson: string;
  slug: string;
  level: string;
  minutes: string;
  title: string;
  summary: string;
  learn: string;
  undo: string;
  redo: string;
  /* step list */
  steps: string;
  stepsHint: string;
  stepN: string;
  add: string;
  duplicate: string;
  remove: string;
  removeConfirm: string;
  up: string;
  down: string;
  stepId: string;
  stepKind: string;
  /* diagram */
  diagram: string;
  palette: string;
  forward: string;
  forwardHint: string;
  nodeId: string;
  edgeId: string;
  idTaken: string;
  name: string;
  focus: string;
  mode: string;
  modeNone: string;
  modes: { call: string; async: string };
  blocks: string;
  lines: string;
  noLoadLocked: string;
  /* step text */
  stepText: string;
  short: string;
  stepTitle: string;
  body: string;
  watch: string;
  keptCheck: string;
  /* metrics */
  metrics: string;
  metricsNone: string;
  metricId: string;
  unit: string;
  unitNone: string;
  better: string;
  betterUp: string;
  betterDown: string;
  addMetric: string;
  removeMetric: string;
  value: string;
  noValue: string;
  /* exchange */
  exchange: string;
  exchangeOn: string;
  exchangeNoEdge: string;
  line: string;
  request: string;
  response: string;
  hasResponse: string;
  format: string;
  head: string;
  headers: string;
  headersHint: string;
  wireBody: string;
  marks: string;
  masked: string;
  listHint: string;
  note: string;
  markOk: string;
  /* checks */
  checks: string;
  checksNone: string;
  errorsN: string;
  warnsN: string;
  error: string;
  warn: string;
  goTo: string;
  issue: Record<IssueCode, string>;
  /* files */
  file: string;
  newDraft: string;
  newConfirm: string;
  fromLesson: string;
  fromPick: string;
  start: string;
  replaceConfirm: string;
  loading: string;
  loadFail: string;
  scenariosDropped: string;
  saveJson: string;
  openJson: string;
  openBad: string;
  saved: string;
  storageOff: string;
  /* export */
  exportLead: string;
  exportErrors: string;
  copy: string;
  copied: string;
  copyFail: string;
  download: string;
  fileTabs: string;
  /* preview */
  previewBroken: string;
  previewNote: string;
  /* BPMN import */
  bpmn: {
    open: string;
    title: string;
    lead: string;
    file: string;
    paste: string;
    importText: string;
    close: string;
    replaceConfirm: string;
    reading: string;
    done: string;
    notes: string;
    error: Record<BpmnErrorCode, string>;
    warning: Record<BpmnWarningCode, string>;
  };
}

/** Page head and nav label for the host page (the site strings are not edited from here). */
export const AUTHOR_PAGE: Record<AuthorLang, { title: string; lead: string; nav: string; noscript: string }> = {
  uz: {
    title: "Muallif rejimi",
    lead: "Darsni qadamma-qadam chizing va yozing: sxema, matn uch tilda, haqiqiy so'rov. Tekshiruvlar shu yerning o'zida, oxirida lesson.ts va til fayllarini eksport qilasiz.",
    nav: "Muallif",
    noscript: "Muallif rejimi uchun JavaScript kerak.",
  },
  ru: {
    title: "Режим автора",
    lead: "Нарисуйте и напишите урок по шагам: схема, текст на трёх языках, реальный запрос. Проверки сразу здесь, в конце выгрузите lesson.ts и файлы языков.",
    nav: "Автору",
    noscript: "Для режима автора нужен JavaScript.",
  },
  en: {
    title: "Author mode",
    lead: "Draw and write a lesson step by step: the diagram, the text in three languages, the real request. Checks run as you type; at the end you export lesson.ts and the language files.",
    nav: "Author",
    noscript: "The author mode needs JavaScript.",
  },
};

export const AUTHOR_UI: Record<AuthorLang, AuthorStrings> = {
  en: {
    langNames: { uz: "Uzbek", ru: "Russian", en: "English" },
    contentLang: "Text language",
    contentLangHint: "Names and texts below are edited in this language. The diagram is the same in all three.",
    tabs: { edit: "Edit", preview: "Preview", export: "Export" },
    tabsLabel: "Author mode",
    lesson: "Lesson",
    slug: "Lesson ID (folder name)",
    level: "Level",
    minutes: "Minutes",
    title: "Title",
    summary: "Summary",
    learn: "What the reader learns, one per line",
    undo: "Undo",
    redo: "Redo",
    steps: "Steps",
    stepsHint: "↑ ↓ choose · Alt + ↑ ↓ move",
    stepN: "Step {n}",
    add: "Add step",
    duplicate: "Duplicate",
    remove: "Delete",
    removeConfirm: "Delete step “{id}”?",
    up: "Move up",
    down: "Move down",
    stepId: "Step ID",
    stepKind: "Kind",
    diagram: "Diagram of step {n}",
    palette: "Add a block",
    forward: "Also change the following steps",
    forwardHint: "A change carries on to later steps that still had the old value.",
    nodeId: "Block ID",
    edgeId: "Line ID",
    idTaken: "This ID is taken or invalid: lowercase latin, digits, dashes.",
    name: "Name ({lang})",
    focus: "In focus in this step",
    mode: "Mode",
    modeNone: "plain line",
    modes: { call: "call (waits for the reply)", async: "async (fire and forget)" },
    blocks: "Blocks",
    lines: "Lines",
    noLoadLocked: "An earlier step shows a gauge, so it stays (a step can only change it).",
    stepText: "Step text ({lang})",
    short: "Timeline label (1-2 words)",
    stepTitle: "Title",
    body: "Text (a blank line starts a paragraph; **bold**, `code`)",
    watch: "Watch out (optional)",
    keptCheck: "This step has a prediction question from the original lesson; it is exported unchanged.",
    metrics: "Metrics",
    metricsNone: "No metrics yet.",
    metricId: "Metric ID",
    unit: "Unit",
    unitNone: "none",
    better: "Better when",
    betterUp: "higher",
    betterDown: "lower",
    addMetric: "Add metric",
    removeMetric: "Remove metric",
    value: "Value in this step",
    noValue: "not shown yet",
    exchange: "Real request",
    exchangeOn: "Show a message on a line in this step",
    exchangeNoEdge: "Draw a line first: a message travels on a line.",
    line: "Line",
    request: "Request",
    response: "Response",
    hasResponse: "With a response",
    format: "Format",
    head: "Start line",
    headers: "Headers",
    headersHint: "One per line: Name: value",
    wireBody: "Body",
    marks: "Numbered fields",
    masked: "Hidden fields (value must be ***)",
    listHint: "Comma separated",
    note: "Note for {name} ({lang})",
    markOk: "All numbered fields are found in the message.",
    checks: "Checks",
    checksNone: "No problems: the files should pass the course tests.",
    errorsN: "{n} errors",
    warnsN: "{n} warnings",
    error: "Error",
    warn: "Advice",
    goTo: "Go to step {n}",
    issue: {
      slug: "Lesson ID: lowercase latin letters, digits and dashes.",
      minutes: "Minutes: a whole number from 1 to 30.",
      stepId: "Step ID: lowercase latin letters, digits and dashes.",
      stepDup: "Step ID “{x}” is used twice.",
      recapLast: "The last step must be a recap.",
      fewSteps: "A lesson has at least 7 steps (now {x}).",
      manySteps: "A lesson has at most 16 steps.",
      unit: "Metric {x}: the unit is not in the list.",
      metricId: "Metric ID “{x}” is invalid or used twice.",
      manyMetrics: "At most 6 metrics.",
      manyNodes: "{x} blocks: more than 8 is hard to read.",
      close: "{x} stand closer than 2 cells.",
      sameCell: "{x} stand on one cell.",
      offGrid: "{x} is off the 0..12 grid.",
      wireShare: "At least half of the steps (recap aside) should show a real request.",
      exEdge: "The message is on line “{x}”, which is not in this step.",
      emptyHead: "The start line of a message is empty.",
      markMissing: "Numbered field {x} is not found in the message.",
      maskValue: "Hidden field {x} must hold *** in a public lesson.",
      maskMissing: "Hidden field {x} is not found in the message.",
      manyMarks: "At most 9 numbered fields.",
      cyrillic: "Cyrillic letters in {x}.",
      text: "Title, timeline label and text are required.",
      label: "Block {x} has no name.",
      metricLabel: "Metric {x} has no name.",
      learn: "List what the reader learns.",
      fieldNote: "No note for {x}.",
      title: "Lesson title and summary are required.",
      resolve: "The scene cannot be built: {x}",
      loadSpot: "The load gauge of {x} hits a name or a block.",
      crossing: "Line crosses a name: {x}.",
    },
    file: "Draft",
    newDraft: "New draft",
    newConfirm: "Start a new draft? The current one is replaced (save it first if you need it).",
    fromLesson: "Start from a lesson",
    fromPick: "Lesson",
    start: "Open",
    replaceConfirm: "Replace the current draft with this lesson?",
    loading: "Loading…",
    loadFail: "Could not load the lesson.",
    scenariosDropped: "This lesson has {n} alternative endings; the author mode keeps only the main story.",
    saveJson: "Save draft (.json)",
    openJson: "Open draft (.json)",
    openBad: "This file is not an author draft.",
    saved: "Kept in this browser.",
    storageOff: "This browser does not keep drafts: save the file before leaving.",
    exportLead: "Put the four files into content/public/{slug}/, add the lesson to content/sections.ts, then run pnpm gen.",
    exportErrors: "{n} errors still open: the files are exported, but the course tests will fail until they are fixed.",
    copy: "Copy",
    copied: "Copied",
    copyFail: "Copy failed: select the text and copy it by hand.",
    download: "Download {file}",
    fileTabs: "Files",
    previewBroken: "The draft cannot be shown yet: {x}",
    previewNote: "Preview of the main story in the selected text language.",
    bpmn: {
      open: "Import BPMN",
      title: "Import a BPMN diagram",
      lead: "A .bpmn file from Camunda Modeler or bpmn.io becomes a draft: blocks, lines and one step per element in process order. Names go into the {lang} text; the other languages get a copy to translate. Step texts and real requests are yours to write.",
      file: "BPMN file (.bpmn, .xml)",
      paste: "Or paste the XML",
      importText: "Import the pasted XML",
      close: "Close",
      replaceConfirm: "Replace the current draft with the imported diagram?",
      reading: "Reading…",
      done: "Imported: {nodes} blocks, {steps} steps.",
      notes: "Notes on the import",
      error: {
        empty: "The file is empty.",
        tooLarge: "The file is too large (more than 5 MB).",
        malformed: "The XML is broken at line {line}: {x}",
        notBpmn: "This is not a BPMN 2.0 file (no bpmn:definitions).",
        tooDeep: "The XML is nested too deeply.",
        tooMany: "The XML has too many elements.",
        noElements: "The diagram has no events, tasks or gateways.",
      },
      warning: {
        boundary: "Boundary events are not imported: {x}.",
        subprocess: "An expanded subprocess is one block; its inner elements are skipped: {x}.",
        eventSubprocess: "Event subprocesses are not imported: {x}.",
        unsupported: "Not supported, skipped: {x}.",
        danglingFlow: "Lines to elements that were not imported are dropped: {x}.",
        selfLoop: "A line from an element to itself is dropped: {x}.",
        loop: "The process loops back to {x}; steps follow the first pass.",
        unreachable: "Not reachable from a start event, placed at the end: {x}.",
        noStart: "No start event: the walk starts from elements without incoming lines.",
        maxElements: "The file is too big: {x} elements were not read.",
        maxNodes: "At most 30 blocks: {x} elements were left out.",
        maxSteps: "A lesson has at most 16 steps: {x} elements have no step of their own.",
        partialLayout: "Only some elements have diagram coordinates, so blocks are laid out by order.",
        translate: "Names were copied into all three languages: translate them.",
      },
    },
  },
  ru: {
    langNames: { uz: "Узбекский", ru: "Русский", en: "Английский" },
    contentLang: "Язык текста",
    contentLangHint: "Названия и тексты ниже правятся на этом языке. Схема одна для всех трёх.",
    tabs: { edit: "Правка", preview: "Просмотр", export: "Экспорт" },
    tabsLabel: "Режим автора",
    lesson: "Урок",
    slug: "ID урока (имя папки)",
    level: "Уровень",
    minutes: "Минут",
    title: "Заголовок",
    summary: "Кратко",
    learn: "Чему научится читатель, по одному в строке",
    undo: "Отменить",
    redo: "Вернуть",
    steps: "Шаги",
    stepsHint: "↑ ↓ выбрать · Alt + ↑ ↓ переместить",
    stepN: "Шаг {n}",
    add: "Добавить шаг",
    duplicate: "Дублировать",
    remove: "Удалить",
    removeConfirm: "Удалить шаг «{id}»?",
    up: "Выше",
    down: "Ниже",
    stepId: "ID шага",
    stepKind: "Тип",
    diagram: "Схема шага {n}",
    palette: "Добавить блок",
    forward: "Менять и следующие шаги",
    forwardHint: "Изменение переходит в следующие шаги, где было прежнее значение.",
    nodeId: "ID блока",
    edgeId: "ID линии",
    idTaken: "ID занят или неверен: латиница в нижнем регистре, цифры, дефисы.",
    name: "Название ({lang})",
    focus: "В фокусе на этом шаге",
    mode: "Режим",
    modeNone: "простая линия",
    modes: { call: "вызов (ждёт ответа)", async: "асинхронно (без ожидания)" },
    blocks: "Блоки",
    lines: "Линии",
    noLoadLocked: "Шкала уже показана на прошлом шаге и остаётся (шаг может только изменить её).",
    stepText: "Текст шага ({lang})",
    short: "Метка на шкале (1-2 слова)",
    stepTitle: "Заголовок",
    body: "Текст (пустая строка начинает абзац; **жирный**, `код`)",
    watch: "Обратите внимание (необязательно)",
    keptCheck: "У шага есть вопрос-прогноз из исходного урока; он экспортируется без изменений.",
    metrics: "Метрики",
    metricsNone: "Метрик пока нет.",
    metricId: "ID метрики",
    unit: "Единица",
    unitNone: "нет",
    better: "Лучше, когда",
    betterUp: "больше",
    betterDown: "меньше",
    addMetric: "Добавить метрику",
    removeMetric: "Удалить метрику",
    value: "Значение на этом шаге",
    noValue: "пока не показана",
    exchange: "Реальный запрос",
    exchangeOn: "Показать сообщение на линии в этом шаге",
    exchangeNoEdge: "Сначала нарисуйте линию: сообщение идёт по линии.",
    line: "Линия",
    request: "Запрос",
    response: "Ответ",
    hasResponse: "С ответом",
    format: "Формат",
    head: "Первая строка",
    headers: "Заголовки",
    headersHint: "По одному в строке: Имя: значение",
    wireBody: "Тело",
    marks: "Пронумерованные поля",
    masked: "Скрытые поля (значение должно быть ***)",
    listHint: "Через запятую",
    note: "Пояснение к {name} ({lang})",
    markOk: "Все пронумерованные поля найдены в сообщении.",
    checks: "Проверки",
    checksNone: "Проблем нет: файлы должны пройти тесты курса.",
    errorsN: "Ошибок: {n}",
    warnsN: "Советов: {n}",
    error: "Ошибка",
    warn: "Совет",
    goTo: "К шагу {n}",
    issue: {
      slug: "ID урока: латиница в нижнем регистре, цифры и дефисы.",
      minutes: "Минуты: целое число от 1 до 30.",
      stepId: "ID шага: латиница в нижнем регистре, цифры и дефисы.",
      stepDup: "ID шага «{x}» повторяется.",
      recapLast: "Последний шаг должен быть итогом.",
      fewSteps: "В уроке не меньше 7 шагов (сейчас {x}).",
      manySteps: "В уроке не больше 16 шагов.",
      unit: "Метрика {x}: единицы нет в списке.",
      metricId: "ID метрики «{x}» неверен или повторяется.",
      manyMetrics: "Не больше 6 метрик.",
      manyNodes: "Блоков: {x}. Больше 8 читается с трудом.",
      close: "{x} стоят ближе 2 клеток.",
      sameCell: "{x} стоят на одной клетке.",
      offGrid: "{x} вне сетки 0..12.",
      wireShare: "Хотя бы половина шагов (кроме итога) должна показывать реальный запрос.",
      exEdge: "Сообщение на линии «{x}», которой нет в этом шаге.",
      emptyHead: "Первая строка сообщения пуста.",
      markMissing: "Поле {x} не найдено в сообщении.",
      maskValue: "Скрытое поле {x} в открытом уроке должно содержать ***.",
      maskMissing: "Скрытое поле {x} не найдено в сообщении.",
      manyMarks: "Не больше 9 пронумерованных полей.",
      cyrillic: "Кириллица в {x}.",
      text: "Нужны заголовок, метка на шкале и текст.",
      label: "У блока {x} нет названия.",
      metricLabel: "У метрики {x} нет названия.",
      learn: "Перечислите, чему научится читатель.",
      fieldNote: "Нет пояснения к {x}.",
      title: "Нужны заголовок и описание урока.",
      resolve: "Сцену нельзя построить: {x}",
      loadSpot: "Шкала нагрузки {x} задевает название или блок.",
      crossing: "Линия пересекает название: {x}.",
    },
    file: "Черновик",
    newDraft: "Новый черновик",
    newConfirm: "Начать новый черновик? Текущий будет заменён (сохраните его, если нужен).",
    fromLesson: "Начать с урока",
    fromPick: "Урок",
    start: "Открыть",
    replaceConfirm: "Заменить текущий черновик этим уроком?",
    loading: "Загрузка…",
    loadFail: "Не удалось загрузить урок.",
    scenariosDropped: "У урока есть альтернативные концовки ({n}); режим автора сохраняет только основную историю.",
    saveJson: "Сохранить черновик (.json)",
    openJson: "Открыть черновик (.json)",
    openBad: "Это не черновик режима автора.",
    saved: "Сохранено в этом браузере.",
    storageOff: "Этот браузер не хранит черновики: сохраните файл перед уходом.",
    exportLead: "Положите четыре файла в content/public/{slug}/, добавьте урок в content/sections.ts и запустите pnpm gen.",
    exportErrors: "Открытых ошибок: {n}. Файлы выгружаются, но тесты курса не пройдут, пока ошибки не исправлены.",
    copy: "Копировать",
    copied: "Скопировано",
    copyFail: "Не удалось скопировать: выделите текст и скопируйте вручную.",
    download: "Скачать {file}",
    fileTabs: "Файлы",
    previewBroken: "Черновик пока нельзя показать: {x}",
    previewNote: "Просмотр основной истории на выбранном языке текста.",
    bpmn: {
      open: "Импорт BPMN",
      title: "Импорт диаграммы BPMN",
      lead: "Файл .bpmn из Camunda Modeler или bpmn.io становится черновиком: блоки, линии и по шагу на каждый элемент в порядке процесса. Названия попадают в текст на языке «{lang}», остальные языки получают копию для перевода. Тексты шагов и реальные запросы пишете вы.",
      file: "Файл BPMN (.bpmn, .xml)",
      paste: "Или вставьте XML",
      importText: "Импортировать вставленный XML",
      close: "Закрыть",
      replaceConfirm: "Заменить текущий черновик импортированной диаграммой?",
      reading: "Чтение…",
      done: "Импортировано: блоков {nodes}, шагов {steps}.",
      notes: "Заметки об импорте",
      error: {
        empty: "Файл пуст.",
        tooLarge: "Файл слишком большой (больше 5 МБ).",
        malformed: "XML повреждён в строке {line}: {x}",
        notBpmn: "Это не файл BPMN 2.0 (нет bpmn:definitions).",
        tooDeep: "В XML слишком глубокая вложенность.",
        tooMany: "В XML слишком много элементов.",
        noElements: "В диаграмме нет событий, задач или шлюзов.",
      },
      warning: {
        boundary: "Граничные события не импортируются: {x}.",
        subprocess: "Развёрнутый подпроцесс стал одним блоком, его внутренние элементы пропущены: {x}.",
        eventSubprocess: "Событийные подпроцессы не импортируются: {x}.",
        unsupported: "Не поддерживается, пропущено: {x}.",
        danglingFlow: "Линии к неимпортированным элементам убраны: {x}.",
        selfLoop: "Линия элемента в самого себя убрана: {x}.",
        loop: "Процесс возвращается к {x}; шаги идут по первому проходу.",
        unreachable: "Недостижимо от стартового события, поставлено в конец: {x}.",
        noStart: "Нет стартового события: обход начат с элементов без входящих линий.",
        maxElements: "Файл слишком большой: не прочитано элементов: {x}.",
        maxNodes: "Не больше 30 блоков: не вошло элементов: {x}.",
        maxSteps: "В уроке не больше 16 шагов: без своего шага осталось элементов: {x}.",
        partialLayout: "Координаты есть только у части элементов, поэтому блоки расставлены по порядку.",
        translate: "Названия скопированы во все три языка: переведите их.",
      },
    },
  },
  uz: {
    langNames: { uz: "O'zbekcha", ru: "Ruscha", en: "Inglizcha" },
    contentLang: "Matn tili",
    contentLangHint: "Quyidagi nomlar va matnlar shu tilda tahrirlanadi. Sxema uchala tilda bir xil.",
    tabs: { edit: "Tahrir", preview: "Ko'rish", export: "Eksport" },
    tabsLabel: "Muallif rejimi",
    lesson: "Dars",
    slug: "Dars ID (papka nomi)",
    level: "Daraja",
    minutes: "Daqiqa",
    title: "Sarlavha",
    summary: "Qisqacha",
    learn: "O'quvchi nimani o'rganadi, har qatorda bittadan",
    undo: "Bekor qilish",
    redo: "Qaytarish",
    steps: "Qadamlar",
    stepsHint: "↑ ↓ tanlash · Alt + ↑ ↓ ko'chirish",
    stepN: "{n}-qadam",
    add: "Qadam qo'shish",
    duplicate: "Nusxalash",
    remove: "O'chirish",
    removeConfirm: "“{id}” qadami o'chirilsinmi?",
    up: "Yuqoriga",
    down: "Pastga",
    stepId: "Qadam ID",
    stepKind: "Turi",
    diagram: "{n}-qadam sxemasi",
    palette: "Blok qo'shish",
    forward: "Keyingi qadamlarni ham o'zgartirish",
    forwardHint: "O'zgarish eski qiymat turgan keyingi qadamlarga ham o'tadi.",
    nodeId: "Blok ID",
    edgeId: "Chiziq ID",
    idTaken: "Bu ID band yoki noto'g'ri: kichik lotin harflari, raqamlar, chiziqcha.",
    name: "Nomi ({lang})",
    focus: "Shu qadamda diqqat markazida",
    mode: "Rejim",
    modeNone: "oddiy chiziq",
    modes: { call: "chaqiruv (javobni kutadi)", async: "asinxron (kutmaydi)" },
    blocks: "Bloklar",
    lines: "Chiziqlar",
    noLoadLocked: "Yuklama shkalasi oldingi qadamda ko'rsatilgan, u qoladi (qadam faqat qiymatini o'zgartira oladi).",
    stepText: "Qadam matni ({lang})",
    short: "Shkaladagi belgi (1-2 so'z)",
    stepTitle: "Sarlavha",
    body: "Matn (bo'sh qator yangi xatboshi; **qalin**, `kod`)",
    watch: "E'tibor bering (ixtiyoriy)",
    keptCheck: "Bu qadamda asl darsdan bashorat savoli bor; u o'zgarishsiz eksport qilinadi.",
    metrics: "Metrikalar",
    metricsNone: "Hali metrika yo'q.",
    metricId: "Metrika ID",
    unit: "Birlik",
    unitNone: "yo'q",
    better: "Yaxshi, qachonki",
    betterUp: "ko'proq",
    betterDown: "kamroq",
    addMetric: "Metrika qo'shish",
    removeMetric: "Metrikani olib tashlash",
    value: "Shu qadamdagi qiymat",
    noValue: "hali ko'rsatilmagan",
    exchange: "Haqiqiy so'rov",
    exchangeOn: "Shu qadamda chiziqdagi xabarni ko'rsatish",
    exchangeNoEdge: "Avval chiziq chizing: xabar chiziq bo'ylab yuradi.",
    line: "Chiziq",
    request: "So'rov",
    response: "Javob",
    hasResponse: "Javob bilan",
    format: "Format",
    head: "Birinchi qator",
    headers: "Sarlavhalar (headers)",
    headersHint: "Har qatorda bittadan: Nom: qiymat",
    wireBody: "Tana (body)",
    marks: "Raqamlangan maydonlar",
    masked: "Yashirin maydonlar (qiymati *** bo'lishi shart)",
    listHint: "Vergul bilan ajrating",
    note: "{name} uchun izoh ({lang})",
    markOk: "Barcha raqamlangan maydonlar xabarda topildi.",
    checks: "Tekshiruvlar",
    checksNone: "Muammo yo'q: fayllar kurs testlaridan o'tishi kerak.",
    errorsN: "{n} ta xato",
    warnsN: "{n} ta maslahat",
    error: "Xato",
    warn: "Maslahat",
    goTo: "{n}-qadamga o'tish",
    issue: {
      slug: "Dars ID: kichik lotin harflari, raqamlar va chiziqcha.",
      minutes: "Daqiqa: 1 dan 30 gacha butun son.",
      stepId: "Qadam ID: kichik lotin harflari, raqamlar va chiziqcha.",
      stepDup: "“{x}” qadam ID ikki marta ishlatilgan.",
      recapLast: "Oxirgi qadam xulosa bo'lishi shart.",
      fewSteps: "Darsda kamida 7 qadam bo'ladi (hozir {x}).",
      manySteps: "Darsda ko'pi bilan 16 qadam bo'ladi.",
      unit: "{x} metrikasi: birlik ro'yxatda yo'q.",
      metricId: "“{x}” metrika ID noto'g'ri yoki takrorlangan.",
      manyMetrics: "Ko'pi bilan 6 ta metrika.",
      manyNodes: "{x} ta blok: 8 tadan ko'pini o'qish qiyin.",
      close: "{x} bir-biriga 2 katakdan yaqin turibdi.",
      sameCell: "{x} bitta katakda turibdi.",
      offGrid: "{x} 0..12 to'ridan tashqarida.",
      wireShare: "Qadamlarning kamida yarmi (xulosadan tashqari) haqiqiy so'rovni ko'rsatishi kerak.",
      exEdge: "Xabar “{x}” chizig'ida, bu qadamda esa bunday chiziq yo'q.",
      emptyHead: "Xabarning birinchi qatori bo'sh.",
      markMissing: "{x} maydoni xabarda topilmadi.",
      maskValue: "Ochiq darsda {x} yashirin maydonining qiymati *** bo'lishi shart.",
      maskMissing: "{x} yashirin maydoni xabarda topilmadi.",
      manyMarks: "Ko'pi bilan 9 ta raqamlangan maydon.",
      cyrillic: "{x} ichida kirill harflari bor.",
      text: "Sarlavha, shkaladagi belgi va matn shart.",
      label: "{x} blokining nomi yo'q.",
      metricLabel: "{x} metrikasining nomi yo'q.",
      learn: "O'quvchi nimani o'rganishini yozing.",
      fieldNote: "{x} uchun izoh yo'q.",
      title: "Dars sarlavhasi va qisqacha mazmuni shart.",
      resolve: "Sahnani qurib bo'lmadi: {x}",
      loadSpot: "{x} yuklama shkalasi nom yoki blokka tegib turibdi.",
      crossing: "Chiziq nomni kesib o'tadi: {x}.",
    },
    file: "Qoralama",
    newDraft: "Yangi qoralama",
    newConfirm: "Yangi qoralama boshlansinmi? Joriysi almashtiriladi (kerak bo'lsa, avval saqlang).",
    fromLesson: "Darsdan boshlash",
    fromPick: "Dars",
    start: "Ochish",
    replaceConfirm: "Joriy qoralama shu dars bilan almashtirilsinmi?",
    loading: "Yuklanmoqda…",
    loadFail: "Darsni yuklab bo'lmadi.",
    scenariosDropped: "Bu darsda {n} ta muqobil yakun bor; muallif rejimi faqat asosiy hikoyani oladi.",
    saveJson: "Qoralamani saqlash (.json)",
    openJson: "Qoralamani ochish (.json)",
    openBad: "Bu fayl muallif qoralamasi emas.",
    saved: "Shu brauzerda saqlandi.",
    storageOff: "Bu brauzer qoralamani saqlamaydi: chiqishdan oldin faylni saqlang.",
    exportLead: "To'rt faylni content/public/{slug}/ papkasiga qo'ying, darsni content/sections.ts ga qo'shing va pnpm gen ni ishga tushiring.",
    exportErrors: "{n} ta xato ochiq: fayllar eksport qilinadi, lekin tuzatilmaguncha kurs testlari o'tmaydi.",
    copy: "Nusxa olish",
    copied: "Nusxa olindi",
    copyFail: "Nusxa olinmadi: matnni belgilab, qo'lda nusxa oling.",
    download: "{file} ni yuklab olish",
    fileTabs: "Fayllar",
    previewBroken: "Qoralamani hozircha ko'rsatib bo'lmaydi: {x}",
    previewNote: "Tanlangan matn tilida asosiy hikoyaning ko'rinishi.",
    bpmn: {
      open: "BPMN import",
      title: "BPMN diagrammasini import qilish",
      lead: "Camunda Modeler yoki bpmn.io dan olingan .bpmn fayl qoralamaga aylanadi: bloklar, chiziqlar va jarayon tartibida har bir element uchun bitta qadam. Nomlar \u201c{lang}\u201d matniga tushadi, qolgan tillar tarjima uchun nusxa oladi. Qadam matnlari va haqiqiy so'rovlarni o'zingiz yozasiz.",
      file: "BPMN fayl (.bpmn, .xml)",
      paste: "Yoki XML ni qo'ying",
      importText: "Qo'yilgan XML ni import qilish",
      close: "Yopish",
      replaceConfirm: "Joriy qoralama import qilingan diagramma bilan almashtirilsinmi?",
      reading: "O'qilmoqda…",
      done: "Import qilindi: {nodes} ta blok, {steps} ta qadam.",
      notes: "Import bo'yicha izohlar",
      error: {
        empty: "Fayl bo'sh.",
        tooLarge: "Fayl juda katta (5 MB dan ortiq).",
        malformed: "XML {line}-qatorda buzilgan: {x}",
        notBpmn: "Bu BPMN 2.0 fayli emas (bpmn:definitions yo'q).",
        tooDeep: "XML juda chuqur joylashgan.",
        tooMany: "XML da elementlar juda ko'p.",
        noElements: "Diagrammada hodisa, vazifa yoki shlyuz yo'q.",
      },
      warning: {
        boundary: "Chegaraviy hodisalar import qilinmaydi: {x}.",
        subprocess: "Ochilgan ichki jarayon bitta blok bo'ldi, ichidagi elementlar o'tkazib yuborildi: {x}.",
        eventSubprocess: "Hodisaviy ichki jarayonlar import qilinmaydi: {x}.",
        unsupported: "Qo'llab-quvvatlanmaydi, o'tkazib yuborildi: {x}.",
        danglingFlow: "Import qilinmagan elementlarga boradigan chiziqlar olib tashlandi: {x}.",
        selfLoop: "Element o'ziga boradigan chiziq olib tashlandi: {x}.",
        loop: "Jarayon {x} ga qaytadi; qadamlar birinchi o'tish bo'yicha.",
        unreachable: "Boshlanish hodisasidan yetib bo'lmaydi, oxiriga qo'yildi: {x}.",
        noStart: "Boshlanish hodisasi yo'q: aylanish kiruvchi chizig'i yo'q elementlardan boshlandi.",
        maxElements: "Fayl juda katta: {x} ta element o'qilmadi.",
        maxNodes: "Ko'pi bilan 30 ta blok: {x} ta element kirmadi.",
        maxSteps: "Darsda ko'pi bilan 16 qadam: {x} ta elementga alohida qadam yetmadi.",
        partialLayout: "Koordinatalar faqat ayrim elementlarda bor, shuning uchun bloklar tartib bo'yicha joylashtirildi.",
        translate: "Nomlar uchala tilga ham nusxalandi: ularni tarjima qiling.",
      },
    },
  },
};
