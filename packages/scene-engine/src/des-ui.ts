import type { TrafficProfile } from "./des";

/** Lab time-simulation strings, per language. `{x}` placeholders are filled by the panel. */
export interface DesStrings {
  heading: string;
  lead: string;
  profile: string;
  profiles: Record<TrafficProfile, string>;
  about: Record<TrafficProfile, string>;
  rps: string;
  factor: string;
  duration: string;
  seed: string;
  newSeed: string;
  /** "{n}": base rate at 60% of the bottleneck */
  fit: string;
  failure: string;
  failNone: string;
  failFrom: string;
  failTo: string;
  failAbout: string;
  watch: string;
  /** "{name}" */
  busiest: string;
  run: string;
  running: string;
  chartLabel: string;
  chartLoad: string;
  chartCap: string;
  chartQueue: string;
  chartLimit: string;
  chartP95: string;
  chartSpike: string;
  chartDown: string;
  /** "{at}", "{n}" */
  peak: string;
  /** "{s}" */
  drained: string;
  notDrained: string;
  /** "{n}" */
  dropped: string;
  calm: string;
  /** "{slow}", "{drop}" */
  slowThenDrop: string;
  /** "{slow}" */
  slowOnly: string;
  /** "{in}", "{ok}", "{lost}" */
  totals: string;
  /** "{k}" */
  scaled: string;
  /** "{s}" */
  truncated: string;
  noNodes: string;
  table: string;
  colSecond: string;
  colArrivals: string;
  colCompleted: string;
  colDropped: string;
  colQueue: string;
  colP95: string;
}

export const DES_UI: Record<"uz" | "ru" | "en", DesStrings> = {
  uz: {
    heading: "Vaqt bo'yicha simulyatsiya",
    lead: "Har so'rov alohida yuradi: navbat qanday to'lib, keyin qanday bo'shashini soniyama-soniya ko'ring.",
    profile: "Trafik",
    profiles: { constant: "Bir xil", spike: "Sakrash", ramp: "Asta o'sish" },
    about: {
      constant: "Butun vaqt davomida bir xil oqim.",
      spike: "Ikkinchi chorakda trafik ko'paytiruvchi marta oshadi, keyin joyiga qaytadi.",
      ramp: "Trafik boshidan oxirigacha bir tekis o'sib, oxirida ko'paytiruvchi marta bo'ladi.",
    },
    rps: "Bazaviy so'rov/s",
    factor: "Ko'paytiruvchi",
    duration: "Davomiyligi, s",
    seed: "Urug' (seed)",
    newSeed: "Yangi urug'",
    fit: "Sig'imning 60%: {n}",
    failure: "Blokni vaqtincha o'chirish",
    failNone: "Yo'q",
    failFrom: "Boshlanishi, s",
    failTo: "Tugashi, s",
    failAbout: "O'chgan blok so'rovlarni navbatga yig'adi (navbat to'lsa tashlaydi), ishlov berilayotganlari yo'qoladi; balanser uni aylanib o'tadi.",
    watch: "Kuzatiladigan blok",
    busiest: "Eng bandi: {name}",
    run: "Ishga tushirish",
    running: "Hisoblanmoqda…",
    chartLabel: "Tanlangan blok uchun soniyalar bo'yicha grafik",
    chartLoad: "Kelgan so'rov/s",
    chartCap: "sig'im",
    chartQueue: "Navbat",
    chartLimit: "chegara",
    chartP95: "p95, ms",
    chartSpike: "sakrash",
    chartDown: "o'chgan",
    peak: "Navbat {at} s da cho'qqiga chiqdi: {n}",
    drained: "{s} s da bo'shadi",
    notDrained: "oxirigacha bo'shamadi",
    dropped: "{n} so'rov tashlandi",
    calm: "Navbat deyarli bo'sh qoldi",
    slowThenDrop: "p95 {slow} s da o'sa boshladi, birinchi so'rov {drop} s da tashlandi: kechikish xatodan oldin keladi.",
    slowOnly: "p95 {slow} s da o'sa boshladi.",
    totals: "Kirdi {in}, javob oldi {ok}, tashlandi {lost}.",
    scaled: "Tezlik uchun bitta simulyatsiya so'rovi {k} ta haqiqiy so'rovga teng; egri chiziqlar shakli saqlanadi, raqamlar taxminiy.",
    truncated: "Hodisalar chegarasiga yetdi: faqat birinchi {s} s hisoblandi.",
    noNodes: "Sig'imi bor blok yo'q: servis, baza yoki kesh qo'shing.",
    table: "Jadval ko'rinishida",
    colSecond: "s",
    colArrivals: "Keldi",
    colCompleted: "Bajarildi",
    colDropped: "Tashlandi",
    colQueue: "Navbat",
    colP95: "p95, ms",
  },
  ru: {
    heading: "Симуляция во времени",
    lead: "Каждый запрос идёт отдельно: посмотрите посекундно, как очередь наполняется и как потом рассасывается.",
    profile: "Трафик",
    profiles: { constant: "Ровный", spike: "Всплеск", ramp: "Плавный рост" },
    about: {
      constant: "Одинаковый поток всё время.",
      spike: "Во второй четверти трафик вырастает в заданное число раз, потом возвращается.",
      ramp: "Трафик равномерно растёт от начала до конца и в конце становится больше в заданное число раз.",
    },
    rps: "Базовые запросы/с",
    factor: "Множитель",
    duration: "Длительность, с",
    seed: "Зерно (seed)",
    newSeed: "Новое зерно",
    fit: "60% мощности: {n}",
    failure: "Временно выключить блок",
    failNone: "Нет",
    failFrom: "Начало, с",
    failTo: "Конец, с",
    failAbout: "Выключенный блок копит запросы в очереди (если она полна, отбрасывает), обрабатываемые теряются; балансировщик обходит его.",
    watch: "Наблюдаемый блок",
    busiest: "Самый загруженный: {name}",
    run: "Запустить",
    running: "Считаем…",
    chartLabel: "Посекундный график для выбранного блока",
    chartLoad: "Входящие запросы/с",
    chartCap: "ёмкость",
    chartQueue: "Очередь",
    chartLimit: "предел",
    chartP95: "p95, мс",
    chartSpike: "всплеск",
    chartDown: "выключен",
    peak: "Очередь достигла пика на {at} с: {n}",
    drained: "рассосалась за {s} с",
    notDrained: "до конца не рассосалась",
    dropped: "отброшено запросов: {n}",
    calm: "Очередь почти пустая",
    slowThenDrop: "p95 начал расти на {slow} с, первый запрос отброшен на {drop} с: задержка приходит раньше ошибок.",
    slowOnly: "p95 начал расти на {slow} с.",
    totals: "Вошло {in}, получили ответ {ok}, отброшено {lost}.",
    scaled: "Для скорости один симулированный запрос равен {k} настоящим; форма кривых сохраняется, цифры приблизительные.",
    truncated: "Достигнут предел событий: посчитаны только первые {s} с.",
    noNodes: "Нет блоков с ёмкостью: добавьте сервис, базу или кэш.",
    table: "В виде таблицы",
    colSecond: "с",
    colArrivals: "Пришло",
    colCompleted: "Обработано",
    colDropped: "Отброшено",
    colQueue: "Очередь",
    colP95: "p95, мс",
  },
  en: {
    heading: "Simulation over time",
    lead: "Every request travels on its own: watch, second by second, a queue fill up and drain again.",
    profile: "Traffic",
    profiles: { constant: "Constant", spike: "Spike", ramp: "Ramp" },
    about: {
      constant: "The same flow the whole time.",
      spike: "In the second quarter traffic grows by the factor, then falls back.",
      ramp: "Traffic grows steadily from start to end, reaching base × factor at the end.",
    },
    rps: "Base requests/s",
    factor: "Factor",
    duration: "Duration, s",
    seed: "Seed",
    newSeed: "New seed",
    fit: "60% of capacity: {n}",
    failure: "Take a node down for a while",
    failNone: "None",
    failFrom: "From, s",
    failTo: "To, s",
    failAbout: "A downed node keeps queueing requests (drops them once the queue is full) and loses the ones in service; a balancer routes around it.",
    watch: "Node to watch",
    busiest: "Busiest: {name}",
    run: "Run",
    running: "Running…",
    chartLabel: "Per-second chart for the chosen node",
    chartLoad: "Arrivals/s",
    chartCap: "capacity",
    chartQueue: "Queue",
    chartLimit: "limit",
    chartP95: "p95, ms",
    chartSpike: "spike",
    chartDown: "down",
    peak: "The queue peaked at {at} s: {n}",
    drained: "drained in {s} s",
    notDrained: "never drained in the run",
    dropped: "{n} requests dropped",
    calm: "The queue stayed almost empty",
    slowThenDrop: "p95 started climbing at {slow} s, the first request was dropped at {drop} s: latency comes before errors.",
    slowOnly: "p95 started climbing at {slow} s.",
    totals: "In {in}, answered {ok}, dropped {lost}.",
    scaled: "For speed one simulated request stands for {k} real ones; the shape of the curves holds, the numbers are approximate.",
    truncated: "Hit the event limit: only the first {s} s were simulated.",
    noNodes: "No node has a capacity yet: add a service, database or cache.",
    table: "As a table",
    colSecond: "s",
    colArrivals: "Arrived",
    colCompleted: "Done",
    colDropped: "Dropped",
    colQueue: "Queue",
    colP95: "p95, ms",
  },
};

export function desStrings(lang: string): DesStrings {
  return lang === "uz" || lang === "ru" ? DES_UI[lang] : DES_UI.en;
}
