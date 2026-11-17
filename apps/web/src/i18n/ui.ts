import type { Lang } from "@mufassall/content";
import type { UiStrings } from "@mufassall/scene-engine";

export interface SiteStrings {
  langName: string;
  tagline: string;
  description: string;
  nav: { learn: string; map: string; practice: string; lab: string; soon: string };
  theme: string;
  skip: string;
  home: {
    title: string;
    lead: string;
    tracks: Record<string, { title: string; text: string }>;
    start: string;
    continue: string;
    done: string;
    upcoming: string;
    upcomingList: string[];
  };
  footer: string;
}

export const site: Record<Lang, SiteStrings> = {
  uz: {
    langName: "O'zbekcha",
    tagline: "Jarayonlarni mufassal, qadamma-qadam",
    description:
      "Tizimlar va biznes jarayonlarini jonli sahnada qadamma-qadam o'rgatadigan platforma: xabar qayerga boradi, qayerda yo'qoladi va qanday tuzatiladi.",
    nav: { learn: "Darslar", map: "Xarita", practice: "Mashq", lab: "Lab", soon: "tez kunda" },
    theme: "Mavzuni almashtirish",
    skip: "Asosiy qismga o'tish",
    home: {
      title: "Tizim qanday ishlashini ko'ring, yodlamang",
      lead: "Har bir dars — bitta muammo va uning yechimi. Sahnada so'rovlar harakatlanadi, tugunlar yiqiladi, raqamlar o'zgaradi. Siz esa har qadamda nima o'zgarganini ko'rasiz.",
      tracks: {
        reliability: { title: "Ishonchlilik", text: "Xabarlar yo'qolmasligi va ikki marta ishlanmasligi uchun." },
        payments: { title: "To'lovlar", text: "Pul ikki marta yechilmasligi va mol to'lovsiz ketmasligi uchun." },
      },
      start: "Boshlash",
      continue: "Davom ettirish",
      done: "O'tildi",
      upcoming: "Navbatdagi darslar",
      upcomingList: [
        "Elektron imzo: hujjat qanday imzolanadi va tekshiriladi",
        "Hujjat holatlari: ko'p tomonli holat mashinasi",
        "Navbatlar va qayta urinishlar: backoff, DLQ",
      ],
    },
    footer: "dtwin loyihasi. Kod MIT, darslar CC BY-SA 4.0.",
  },
  ru: {
    langName: "Русский",
    tagline: "Процессы подробно, шаг за шагом",
    description:
      "Платформа, которая показывает системы и бизнес-процессы в живой сцене шаг за шагом: куда идёт сообщение, где оно теряется и как это исправить.",
    nav: { learn: "Уроки", map: "Карта", practice: "Практика", lab: "Лаборатория", soon: "скоро" },
    theme: "Сменить тему",
    skip: "Перейти к содержимому",
    home: {
      title: "Смотрите, как работает система, а не заучивайте",
      lead: "Каждый урок — одна проблема и её решение. В сцене движутся запросы, падают узлы, меняются цифры, а вы на каждом шаге видите, что изменилось.",
      tracks: {
        reliability: { title: "Надёжность", text: "Чтобы сообщения не терялись и не обрабатывались дважды." },
        payments: { title: "Платежи", text: "Чтобы деньги не списывались дважды, а товар не уходил без оплаты." },
      },
      start: "Начать",
      continue: "Продолжить",
      done: "Пройдено",
      upcoming: "Следующие уроки",
      upcomingList: [
        "Электронная подпись: как документ подписывается и проверяется",
        "Статусы документа: машина состояний с несколькими сторонами",
        "Очереди и повторы: backoff, DLQ",
      ],
    },
    footer: "Проект dtwin. Код MIT, уроки CC BY-SA 4.0.",
  },
  en: {
    langName: "English",
    tagline: "Processes, step by step, in detail",
    description:
      "A platform that shows systems and business processes in a live scene, step by step: where a message goes, where it gets lost and how to fix it.",
    nav: { learn: "Lessons", map: "Map", practice: "Practice", lab: "Lab", soon: "soon" },
    theme: "Switch theme",
    skip: "Skip to content",
    home: {
      title: "See how the system works instead of memorising it",
      lead: "Every lesson is one problem and its fix. Requests move across the scene, nodes fail, numbers change, and at every step you see exactly what changed.",
      tracks: {
        reliability: { title: "Reliability", text: "So messages are never lost and never handled twice." },
        payments: { title: "Payments", text: "So money is never charged twice and goods never leave unpaid." },
      },
      start: "Start",
      continue: "Continue",
      done: "Done",
      upcoming: "Coming next",
      upcomingList: [
        "Digital signatures: how a document is signed and verified",
        "Document statuses: a multi-party state machine",
        "Queues and retries: backoff, DLQ",
      ],
    },
    footer: "A dtwin project. Code MIT, lessons CC BY-SA 4.0.",
  },
};

export const player: Record<Lang, UiStrings> = {
  uz: {
    step: "Qadam {n} / {total}",
    steps: "{n} qadam",
    minutes: "{n} daq",
    levels: { beginner: "Boshlang'ich", intermediate: "O'rta", advanced: "Yuqori" },
    kinds: { problem: "Muammo", fix: "Yechim", case: "Holat", recap: "Xulosa" },
    watch: "Diqqat",
    changed: "Nima o'zgardi",
    firstStep: "Boshlang'ich holat.",
    noChange: "Sahna o'zgarmadi — matnga e'tibor bering.",
    back: "Orqaga",
    next: "Keyingi: {title}",
    finish: "Dars tugadi",
    replay: "Qayta",
    pause: "Pauza",
    play: "Davom",
    keys: "← → qadam · R qayta · Space pauza",
    inLesson: "Shu darsda",
    youLearn: "Nimani o'rganasiz",
    modelNote: "Raqamlar — model ssenariysi, o'lchov emas",
    sceneLabel: "Sahna: {title}",
    units: { "/min": "/daq", "/day": "/kun" },
    wire: { title: "Haqiqiy so'rov", request: "So'rov", response: "Javob", masked: "yashirilgan" },
    states: { ok: "ishlayapti", slow: "sekin", down: "ishdan chiqdi" },
    flows: { request: "so'rov", ack: "javob", fail: "xato", retry: "qayta yetkazish", dup: "takroriy" },
    legend: { request: "so'rov", ack: "javob", fail: "xato", retry: "qayta yetkazish", dup: "takroriy", lost: "yo'qolgan" },
    change: {
      nodeAdded: "{node} qo'shildi",
      nodeRemoved: "{node} olib tashlandi",
      nodeState: "{node}: {from} → {to}",
      edgeAdded: "{from} → {to} ulandi",
      edgeRemoved: "{from} → {to} uzildi",
      edgeFlow: "{from} → {to}: {was} → {now}",
      edgeLost: "{from} → {to}: xabarlar yo'qolmoqda",
      edgeRestored: "{from} → {to}: xabarlar yetib boryapti",
      metric: "{metric}: {was} → {now}",
    },
  },
  ru: {
    step: "Шаг {n} из {total}",
    steps: "{n} шагов",
    minutes: "{n} мин",
    levels: { beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый" },
    kinds: { problem: "Проблема", fix: "Решение", case: "Кейс", recap: "Итоги" },
    watch: "Осторожно",
    changed: "Что изменилось",
    firstStep: "Исходное состояние.",
    noChange: "Сцена не изменилась — обратите внимание на текст.",
    back: "Назад",
    next: "Далее: {title}",
    finish: "Урок пройден",
    replay: "Повторить",
    pause: "Пауза",
    play: "Продолжить",
    keys: "← → шаг · R повтор · Space пауза",
    inLesson: "В этом уроке",
    youLearn: "Вы узнаете",
    modelNote: "Цифры — модельный сценарий, не замеры",
    sceneLabel: "Сцена: {title}",
    units: { "/s": "/с", ms: "мс", "/min": "/мин", "/day": "/день" },
    wire: { title: "Настоящий запрос", request: "Запрос", response: "Ответ", masked: "скрыто" },
    states: { ok: "работает", slow: "медленно", down: "упал" },
    flows: { request: "запрос", ack: "ответ", fail: "ошибка", retry: "повторная доставка", dup: "дубликат" },
    legend: { request: "запрос", ack: "ответ", fail: "ошибка", retry: "повторная доставка", dup: "дубликат", lost: "потеряно" },
    change: {
      nodeAdded: "Добавлен узел «{node}»",
      nodeRemoved: "Удалён узел «{node}»",
      nodeState: "{node}: {from} → {to}",
      edgeAdded: "{from} → {to}: связь добавлена",
      edgeRemoved: "{from} → {to}: связь удалена",
      edgeFlow: "{from} → {to}: {was} → {now}",
      edgeLost: "{from} → {to}: сообщения теряются",
      edgeRestored: "{from} → {to}: сообщения доходят",
      metric: "{metric}: {was} → {now}",
    },
  },
  en: {
    step: "Step {n} of {total}",
    steps: "{n} steps",
    minutes: "{n} min",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    kinds: { problem: "Problem", fix: "Fix", case: "Case", recap: "Recap" },
    watch: "Watch out",
    changed: "What changed",
    firstStep: "Starting point.",
    noChange: "The scene is unchanged — read the text.",
    back: "Back",
    next: "Next: {title}",
    finish: "Lesson complete",
    replay: "Replay",
    pause: "Pause",
    play: "Resume",
    keys: "← → step · R replay · Space pause",
    inLesson: "In this lesson",
    youLearn: "You will learn",
    modelNote: "Numbers are a model scenario, not measurements",
    sceneLabel: "Scene: {title}",
    wire: { title: "The real request", request: "Request", response: "Response", masked: "hidden" },
    states: { ok: "healthy", slow: "slow", down: "down" },
    flows: { request: "request", ack: "reply", fail: "error", retry: "redelivery", dup: "duplicate" },
    legend: { request: "request", ack: "reply", fail: "error", retry: "redelivery", dup: "duplicate", lost: "lost" },
    change: {
      nodeAdded: "{node} added",
      nodeRemoved: "{node} removed",
      nodeState: "{node}: {from} → {to}",
      edgeAdded: "{from} → {to} connected",
      edgeRemoved: "{from} → {to} disconnected",
      edgeFlow: "{from} → {to}: {was} → {now}",
      edgeLost: "{from} → {to}: messages are being lost",
      edgeRestored: "{from} → {to}: messages arrive",
      metric: "{metric}: {was} → {now}",
    },
  },
};
