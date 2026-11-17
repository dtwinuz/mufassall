/** Strings for the "What happens if…" panel, in every language. Kept out of the web app's
 * i18n tables so the panel's text ships only with the panel's island. */

export type WhatIfLang = "uz" | "ru" | "en";

interface Labelled {
  label: string;
  hint: string;
}

export interface WhatIfLesson {
  params: Record<string, Labelled>;
  results: Record<string, string>;
  /** shown when a result is in the "bad" state (overload, unbounded queue, retry storm) */
  warn: string;
}

export interface WhatIfUi {
  title: string;
  intro: string;
  results: string;
  formula: string;
  reset: string;
  copy: string;
  copied: string;
  copyFail: string;
  note: string;
  /** read out instead of "∞" */
  unbounded: string;
  units: Record<string, string>;
  /** words inside the formula lines */
  words: Record<"avg" | "miss" | "hit" | "tries" | "load" | "success" | "worst" | "burst" | "steady", string>;
  lessons: Record<string, WhatIfLesson>;
}

export const WHATIF_UI: Record<WhatIfLang, WhatIfUi> = {
  uz: {
    title: "Agar shunday bo'lsa-chi?",
    intro: "O'z raqamlaringizni qo'ying: natija va formula darhol qayta hisoblanadi.",
    results: "Natija",
    formula: "Hisob",
    reset: "Dars qiymatlariga qaytarish",
    copy: "Havolani nusxalash",
    copied: "Havola nusxalandi: u aynan shu holatni ochadi.",
    copyFail: "Nusxalab bo'lmadi. Havolani brauzerning manzil qatoridan oling.",
    note: "Soddalashtirilgan darslik modeli: yo'nalish va miqyosni ko'rsatadi, benchmark emas.",
    unbounded: "cheksiz o'sadi",
    units: { "/s": "/s", ms: "ms", s: "s", "%": "%", "": "" },
    words: {
      avg: "o'rtacha",
      miss: "keshda yo'q",
      hit: "keshda bor",
      tries: "urinishlar",
      load: "yuk",
      success: "muvaffaqiyat",
      worst: "eng yomoni",
      burst: "to'lqin",
      steady: "barqaror",
    },
    lessons: {
      caching: {
        params: {
          rps: { label: "O'qishlar soniyasiga", hint: "Mahsulot sahifasiga keladigan barcha o'qishlar." },
          hit: { label: "Hit ratio", hint: "Keshdan javob topilgan o'qishlar ulushi." },
          dbCap: { label: "Baza quvvati", hint: "Baza soniyasiga ko'tara oladigan o'qishlar." },
          cacheMs: { label: "Kesh kechikishi", hint: "Keshdan bitta GET qancha vaqt oladi." },
          dbMs: { label: "Baza kechikishi", hint: "Bo'sh bazada bitta JOIN so'rovi." },
        },
        results: {
          dbRps: "Bazaga o'qishlar",
          dbLoad: "Baza yuklamasi",
          avg: "O'rtacha javob",
          p95: "Javob p95 (taxminan)",
        },
        warn: "Baza ortiqcha yuklangan: unga kelayotgan o'qishlar quvvatidan ko'p, navbat va kechikish cheksiz o'sadi.",
      },
      queues: {
        params: {
          lambda: { label: "Kelish tezligi λ", hint: "Navbatga soniyasiga tushadigan ishlar." },
          c: { label: "Workerlar c", hint: "Navbatdan parallel ish oladigan workerlar soni." },
          serviceMs: { label: "Bitta ishga vaqt", hint: "Bitta workerga bitta xatni yuborish uchun kerak bo'lgan vaqt." },
        },
        results: {
          rho: "Bandlik ρ",
          pWait: "Kutib qolish ehtimoli",
          wq: "Navbatda o'rtacha kutish",
          w: "Jami vaqt (kutish + ish)",
          lq: "Navbatda o'rtacha ishlar",
        },
        warn: "ρ ≥ 1: ishlar bajarilishidan tezroq kelyapti, navbat cheksiz o'sadi. Worker qo'shing yoki ishni qisqartiring.",
      },
      "timeouts-retries": {
        params: {
          p: { label: "Urinish xatosi ehtimoli", hint: "Bitta chaqiruv timeout yoki xato bilan tugashi ehtimoli." },
          retries: { label: "Qayta urinishlar", hint: "Birinchi urinishdan keyin nechta qayta urinish." },
          timeoutMs: { label: "Timeout", hint: "Har bir urinish shuncha kutadi, keyin voz kechadi." },
          backoffMs: { label: "Backoff asosi", hint: "Birinchi pauza oynasi; har urinishda ikki barobar o'sadi." },
          rps: { label: "Chaqiruvlar soniyasiga", hint: "Qayta urinishlarsiz servisga keladigan chaqiruvlar." },
        },
        results: {
          attempts: "So'rovga o'rtacha urinish",
          calls: "Servisga tushadigan yuk",
          success: "Muvaffaqiyat ehtimoli",
          worst: "Eng yomon kechikish",
        },
        warn: "Qayta urinishlar yukni kamida ikki barobar oshiryapti: shundoq ham kasal servis butunlay yiqilishi mumkin.",
      },
      "rate-limiting": {
        params: {
          rate: { label: "To'ldirish tezligi", hint: "Chelakka soniyasiga qaytadigan tokenlar: uzoq muddatli limit." },
          capacity: { label: "Chelak sig'imi", hint: "Bir martada o'tkazish mumkin bo'lgan eng katta burst." },
          incoming: { label: "Mijozning doimiy tezligi", hint: "Bitta mijoz soniyasiga yuboradigan so'rovlar." },
          burst: { label: "Burst hajmi", hint: "To'la chelakka bir vaqtda kelgan so'rovlar to'plami." },
        },
        results: {
          burstOk: "Burstdan o'tdi",
          burstRejected: "Burstdan rad etildi",
          ok: "Soniyasiga o'tadi",
          rejected: "Soniyasiga rad (429)",
          pct: "Rad etilgan ulush",
        },
        warn: "Burstning bir qismi rad etildi: halol mijoz so'rovlarini yo'qotadi. Chelak sig'imini oshiring.",
      },
      "latency-throughput": {
        params: {
          lambda: { label: "Throughput λ", hint: "Soniyasiga tugaydigan so'rovlar." },
          latencyMs: { label: "Kechikish W", hint: "Bitta so'rov serverda qancha vaqt turadi." },
          perServer: { label: "Bitta serverda bir vaqtda", hint: "Bitta server parallel bajaradigan eng ko'p so'rov." },
          target: { label: "Rejadagi yuklama", hint: "Serverlarni qancha band qilib rejalashtirasiz." },
        },
        results: {
          inFlight: "Bir vaqtda ichkarida L",
          servers: "Kerakli serverlar",
          load: "Har server yuklamasi",
        },
        warn: "Rejadagi yuklama juda yuqori: burst yoki sekin so'rov uchun joy qolmaydi.",
      },
    },
  },
  ru: {
    title: "А что, если…?",
    intro: "Подставьте свои числа: результат и формула пересчитываются сразу.",
    results: "Результат",
    formula: "Расчёт",
    reset: "Вернуть значения урока",
    copy: "Скопировать ссылку",
    copied: "Ссылка скопирована: она откроет ровно этот случай.",
    copyFail: "Не удалось скопировать. Возьмите ссылку из адресной строки браузера.",
    note: "Упрощённая учебная модель: показывает направление и масштаб, а не бенчмарк.",
    unbounded: "растёт без предела",
    units: { "/s": "/с", ms: "мс", s: "с", "%": "%", "": "" },
    words: {
      avg: "среднее",
      miss: "промах",
      hit: "попадание",
      tries: "попытки",
      load: "нагрузка",
      success: "успех",
      worst: "худший",
      burst: "всплеск",
      steady: "стабильно",
    },
    lessons: {
      caching: {
        params: {
          rps: { label: "Чтений в секунду", hint: "Все чтения страницы товара." },
          hit: { label: "Hit ratio", hint: "Доля чтений, на которые ответил кеш." },
          dbCap: { label: "Ёмкость базы", hint: "Сколько чтений в секунду выдерживает база." },
          cacheMs: { label: "Задержка кеша", hint: "Один GET из кеша." },
          dbMs: { label: "Задержка базы", hint: "Один запрос с JOIN на ненагруженной базе." },
        },
        results: {
          dbRps: "Чтений в базу",
          dbLoad: "Нагрузка базы",
          avg: "Средний ответ",
          p95: "Ответ p95 (грубо)",
        },
        warn: "База перегружена: чтений приходит больше, чем она успевает, очередь и задержка растут без предела.",
      },
      queues: {
        params: {
          lambda: { label: "Поток задач λ", hint: "Сколько задач в секунду попадает в очередь." },
          c: { label: "Воркеры c", hint: "Сколько воркеров параллельно берут задачи." },
          serviceMs: { label: "Время на задачу", hint: "Сколько одному воркеру нужно, чтобы отправить одно письмо." },
        },
        results: {
          rho: "Загрузка ρ",
          pWait: "Вероятность ждать",
          wq: "Среднее ожидание в очереди",
          w: "Всего (ожидание + работа)",
          lq: "Задач в очереди в среднем",
        },
        warn: "ρ ≥ 1: задачи приходят быстрее, чем выполняются, и очередь растёт без предела. Добавьте воркеров или ускорьте работу.",
      },
      "timeouts-retries": {
        params: {
          p: { label: "Вероятность сбоя попытки", hint: "Шанс, что один вызов закончится таймаутом или ошибкой." },
          retries: { label: "Повторы", hint: "Сколько повторов после первой попытки." },
          timeoutMs: { label: "Таймаут", hint: "Столько ждёт каждая попытка, потом сдаётся." },
          backoffMs: { label: "База backoff", hint: "Первое окно паузы; с каждой попыткой удваивается." },
          rps: { label: "Вызовов в секунду", hint: "Вызовы к сервису без учёта повторов." },
        },
        results: {
          attempts: "Попыток на запрос в среднем",
          calls: "Нагрузка на сервис",
          success: "Вероятность успеха",
          worst: "Худшая задержка",
        },
        warn: "Повторы как минимум удваивают нагрузку: и без того больной сервис может упасть совсем.",
      },
      "rate-limiting": {
        params: {
          rate: { label: "Скорость пополнения", hint: "Сколько токенов в секунду возвращается в корзину: долгосрочный лимит." },
          capacity: { label: "Ёмкость корзины", hint: "Самый большой всплеск, который пройдёт за раз." },
          incoming: { label: "Постоянный поток клиента", hint: "Сколько запросов в секунду шлёт один клиент." },
          burst: { label: "Размер всплеска", hint: "Пачка запросов, пришедшая разом в полную корзину." },
        },
        results: {
          burstOk: "Из всплеска прошло",
          burstRejected: "Из всплеска отклонено",
          ok: "Проходит в секунду",
          rejected: "Отклоняется в секунду (429)",
          pct: "Доля отклонённых",
        },
        warn: "Часть всплеска отклонена: честный клиент теряет запросы. Увеличьте ёмкость корзины.",
      },
      "latency-throughput": {
        params: {
          lambda: { label: "Пропускная способность λ", hint: "Сколько запросов в секунду завершается." },
          latencyMs: { label: "Задержка W", hint: "Сколько один запрос проводит на сервере." },
          perServer: { label: "Одновременно на сервер", hint: "Сколько запросов один сервер ведёт параллельно." },
          target: { label: "Плановая загрузка", hint: "На какую загрузку серверов вы закладываетесь." },
        },
        results: {
          inFlight: "Одновременно внутри L",
          servers: "Нужно серверов",
          load: "Загрузка каждого",
        },
        warn: "Плановая загрузка слишком высокая: на всплеск или медленный запрос места не останется.",
      },
    },
  },
  en: {
    title: "What happens if…?",
    intro: "Put in your own numbers: the result and the formula update at once.",
    results: "Result",
    formula: "Working",
    reset: "Back to the lesson's values",
    copy: "Copy link",
    copied: "Link copied: it opens exactly this case.",
    copyFail: "Could not copy. Take the link from the browser's address bar.",
    note: "A simplified teaching model: it shows direction and scale, not a benchmark.",
    unbounded: "grows without bound",
    units: { "/s": "/s", ms: "ms", s: "s", "%": "%", "": "" },
    words: {
      avg: "avg",
      miss: "miss",
      hit: "hit",
      tries: "tries",
      load: "load",
      success: "success",
      worst: "worst",
      burst: "burst",
      steady: "steady",
    },
    lessons: {
      caching: {
        params: {
          rps: { label: "Reads per second", hint: "Every read of the product page." },
          hit: { label: "Hit ratio", hint: "Share of reads the cache answers." },
          dbCap: { label: "Database capacity", hint: "Reads per second the database can serve." },
          cacheMs: { label: "Cache latency", hint: "One GET from the cache." },
          dbMs: { label: "Database latency", hint: "One JOIN query on an idle database." },
        },
        results: {
          dbRps: "Database reads",
          dbLoad: "Database load",
          avg: "Average reply",
          p95: "Reply p95 (rough)",
        },
        warn: "Database overloaded: more reads arrive than it can serve, so its queue and latency grow without bound.",
      },
      queues: {
        params: {
          lambda: { label: "Arrival rate λ", hint: "Jobs per second put into the queue." },
          c: { label: "Workers c", hint: "Workers taking jobs from the queue in parallel." },
          serviceMs: { label: "Time per job", hint: "How long one worker needs to send one email." },
        },
        results: {
          rho: "Utilisation ρ",
          pWait: "Chance to wait",
          wq: "Mean wait in queue",
          w: "Total (wait + work)",
          lq: "Mean jobs waiting",
        },
        warn: "ρ ≥ 1: jobs arrive faster than they finish, so the queue grows without bound. Add workers or shorten the work.",
      },
      "timeouts-retries": {
        params: {
          p: { label: "Failure chance per try", hint: "Chance that one call ends in a timeout or an error." },
          retries: { label: "Retries", hint: "How many retries after the first try." },
          timeoutMs: { label: "Timeout", hint: "Each try waits this long, then gives up." },
          backoffMs: { label: "Backoff base", hint: "First pause window; it doubles with every retry." },
          rps: { label: "Calls per second", hint: "Calls to the service before any retries." },
        },
        results: {
          attempts: "Mean tries per request",
          calls: "Load on the service",
          success: "Chance of success",
          worst: "Worst-case latency",
        },
        warn: "Retries at least double the load: a service that is already sick can go fully down.",
      },
      "rate-limiting": {
        params: {
          rate: { label: "Refill rate", hint: "Tokens returned to the bucket per second: the long-term limit." },
          capacity: { label: "Bucket capacity", hint: "The largest burst that passes at once." },
          incoming: { label: "Client's steady rate", hint: "Requests per second one client sends." },
          burst: { label: "Burst size", hint: "A batch of requests arriving at once at a full bucket." },
        },
        results: {
          burstOk: "Burst passed",
          burstRejected: "Burst rejected",
          ok: "Passed per second",
          rejected: "Rejected per second (429)",
          pct: "Share rejected",
        },
        warn: "Part of the burst is rejected: an honest client loses requests. Raise the bucket capacity.",
      },
      "latency-throughput": {
        params: {
          lambda: { label: "Throughput λ", hint: "Requests finished per second." },
          latencyMs: { label: "Latency W", hint: "How long one request spends in the server." },
          perServer: { label: "In flight per server", hint: "Most requests one server works on at once." },
          target: { label: "Planned load", hint: "How busy you plan to run the servers." },
        },
        results: {
          inFlight: "In flight L",
          servers: "Servers needed",
          load: "Load per server",
        },
        warn: "The planned load is too high: no room is left for a burst or a slow query.",
      },
    },
  },
};

export function whatIfUi(lang: string): WhatIfUi {
  return WHATIF_UI[lang as WhatIfLang] ?? WHATIF_UI.en;
}
