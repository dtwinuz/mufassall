import type { ExperimentKind } from "./chaos";

/** Lab chaos, SLO and cost strings, per language. `{x}` placeholders are filled by the editor. */
export interface ChaosStrings {
  heading: string;
  lead: string;
  names: Record<ExperimentKind, string>;
  about: Record<ExperimentKind, string>;
  experiment: string;
  target: string;
  run: string;
  stop: string;
  /** "{name}" */
  active: string;
  activeNote: string;
  noTargets: string;
  /** "{err}", "{av}" are percentages */
  survived: string;
  broke: string;
  whatBroke: string;
  /** "{name}", "{lost}" */
  down: string;
  /** "{name}": a balancer sends the traffic around it */
  downRouted: string;
  /** "{name}", "{rps}" */
  cold: string;
  /** "{name}", "{x}", "{ms}" */
  slow: string;
  /** "{x}", "{rps}" */
  spike: string;
  /** "{from}", "{to}", "{lost}" */
  cut: string;
  /** "{name}", "{pct}" */
  overload: string;
  /** "{name}", "{lost}" */
  stranded: string;
  /** "{before}", "{after}" */
  latency: string;
  nothing: string;

  sloHeading: string;
  sloTarget: string;
  sloP95: string;
  sloAvail: string;
  sloLatency: string;
  sloPass: string;
  sloFail: string;
  /** "{min}" */
  sloBudget: string;
  /** "{min}" */
  sloBurn: string;
  /** "{path}" */
  sloFormula: string;
  sloUnderChaos: string;

  costHeading: string;
  costNote: string;
  costFormula: string;
  costKind: string;
  costCount: string;
  costMonth: string;
  /** "{n}" */
  costTotal: string;
  costPrices: string;
  /** "{n}" */
  priceNode: string;
  priceMillion: string;
  /** "{n}", "{kb}" */
  priceGb: string;
  /** "{n}", "{gb}" */
  priceStored: string;
  /** "{name}", "{cost}", "{a1}", "{a2}", "{p1}", "{p2}" */
  tradeoff: string;
  tradeoffAdd: string;
  tradeoffNone: string;
}

export const CHAOS_UI: Record<"uz" | "ru" | "en", ChaosStrings> = {
  uz: {
    heading: "Xaos tajribalari",
    lead: "Ataylab bitta narsani buzing va dizayn chidaydimi, ko'ring. Diagrammangiz o'zgarmaydi.",
    names: {
      killNode: "Bitta blokni o'chirish",
      killKind: "Butun turni o'chirish",
      slowNode: "Blok sekinlashadi",
      spike: "Trafik x10",
      cutLink: "Tarmoq ulanishi uziladi",
      slowExternal: "Tashqi xizmat sekinlashadi",
    },
    about: {
      killNode: "Tanlangan blok ishlamay qoladi.",
      killKind: "Shu turdagi hamma blok o'chadi. Kesh va CDN sovib qoladi: har so'rov keyingi bosqichga o'tadi.",
      slowNode: "Har so'rovga 10 barobar ko'p vaqt ketadi, demak sekundiga 10 barobar kam so'rov.",
      spike: "Kirayotgan so'rovlar 10 barobar ko'payadi.",
      cutLink: "Tanlangan ulanish orqali hech narsa o'tmaydi.",
      slowExternal: "Har bir tashqi xizmat 10 barobar sekin javob beradi.",
    },
    experiment: "Tajriba",
    target: "Nishon",
    run: "Tajribani boshlash",
    stop: "Tajribani to'xtatish",
    active: "Tajriba ketmoqda: {name}",
    activeNote: "Diagramma o'zgarmagan; to'xtatsangiz hammasi joyiga qaytadi.",
    noTargets: "Avval bir nechta blok qo'shing.",
    survived: "Chidadi: xatolar {err}%, mavjudlik {av}%",
    broke: "Buzildi: xatolar {err}%, mavjudlik {av}%",
    whatBroke: "Nima bo'ldi",
    down: "{name} ishlamayapti: sekundiga {lost} so'rov yo'qoladi",
    downRouted: "{name} ishlamayapti, lekin trafik uni aylanib o'tadi",
    cold: "{name} sovib qoldi: sekundiga {rps} so'rovning hammasi keyingi bosqichga o'tadi",
    slow: "{name} {x} barobar sekin: so'rovga ~{ms} ms",
    spike: "Trafik x{x}: sekundiga {rps} so'rov",
    cut: "{from} → {to} ulanishi uzildi: sekundiga {lost} so'rov yo'qoladi",
    overload: "{name} {pct}% yuklangan: so'rovlar vaqtida javob olmaydi",
    stranded: "{name} so'rovni jo'natadigan joyi yo'q: sekundiga {lost} so'rov yo'qoladi",
    latency: "p95 kechikish {before} → {after} ms",
    nothing: "Diagrammada bu tajriba uchun nishon yo'q.",

    sloHeading: "SLO: dizayn chidaydimi?",
    sloTarget: "Mavjudlik maqsadi",
    sloP95: "p95 kechikish maqsadi, ms",
    sloAvail: "Mavjudlik",
    sloLatency: "p95 kechikish",
    sloPass: "SLO bajariladi",
    sloFail: "SLO bajarilmaydi",
    sloBudget: "Xato byudjeti: oyiga {min} daqiqa",
    sloBurn: "Shu yuklamada dizayn oyiga {min} daqiqa ishlamaydi",
    sloFormula: "Mavjudlik: yo'lida o'chgan yoki 100%+ yuklangan blok bo'lmagan so'rovlar ulushi. p95 ≈ 3 × Σ asos/(1 − ρ) asosiy yo'l bo'yicha: {path}.",
    sloUnderChaos: "Raqamlar ketayotgan tajriba bilan hisoblangan.",

    costHeading: "Oylik narx",
    costNote: "Taxminiy narxlar, rasmiy taklif emas.",
    costFormula: "Narx = Σ bloklar × blok narxi + so'rovlar × million so'rov narxi + GB × GB narxi (30 kunlik oy).",
    costKind: "Tur",
    costCount: "Soni",
    costMonth: "$/oy",
    costTotal: "Jami ≈ ${n}/oy",
    costPrices: "Narxlar jadvali",
    priceNode: "${n} / blok / oy",
    priceMillion: "${n} / million so'rov",
    priceGb: "${n} / GB (so'rovga ~{kb} KB)",
    priceStored: "${n} / GB-oy (blokda {gb} GB)",
    tradeoff: "Yana bitta {name}: +${cost}/oy, mavjudlik {a1}% → {a2}%, p95 {p1} → {p2} ms",
    tradeoffAdd: "Qo'shish",
    tradeoffNone: "Hozircha nusxa ko'paytiradigan blok yo'q.",
  },
  ru: {
    heading: "Хаос-эксперименты",
    lead: "Сломайте одну вещь нарочно и посмотрите, выдержит ли схема. Ваша диаграмма не меняется.",
    names: {
      killNode: "Выключить один блок",
      killKind: "Выключить весь тип",
      slowNode: "Блок тормозит",
      spike: "Трафик x10",
      cutLink: "Обрыв сетевой связи",
      slowExternal: "Медленный внешний сервис",
    },
    about: {
      killNode: "Выбранный блок перестаёт работать.",
      killKind: "Выключаются все блоки этого типа. Кэш и CDN остывают: каждый запрос проходит дальше.",
      slowNode: "Каждый запрос занимает в 10 раз больше времени, значит, в секунду обслуживается в 10 раз меньше.",
      spike: "Входящих запросов становится в 10 раз больше.",
      cutLink: "Через выбранную связь ничего не проходит.",
      slowExternal: "Каждый внешний сервис отвечает в 10 раз медленнее.",
    },
    experiment: "Эксперимент",
    target: "Цель",
    run: "Запустить эксперимент",
    stop: "Остановить эксперимент",
    active: "Идёт эксперимент: {name}",
    activeNote: "Диаграмма не изменена; после остановки всё вернётся как было.",
    noTargets: "Сначала добавьте несколько блоков.",
    survived: "Выдержала: ошибки {err}%, доступность {av}%",
    broke: "Сломалась: ошибки {err}%, доступность {av}%",
    whatBroke: "Что произошло",
    down: "{name} не работает: теряется {lost} запросов в секунду",
    downRouted: "{name} не работает, но трафик идёт в обход",
    cold: "{name} остыл: все {rps} запросов в секунду проходят дальше",
    slow: "{name} в {x} раз медленнее: ~{ms} мс на запрос",
    spike: "Трафик x{x}: {rps} запросов в секунду",
    cut: "Связь {from} → {to} оборвана: теряется {lost} запросов в секунду",
    overload: "{name} загружен на {pct}%: запросы не дожидаются ответа",
    stranded: "{name} некуда отправить запрос: теряется {lost} в секунду",
    latency: "p95 задержка {before} → {after} мс",
    nothing: "На диаграмме нет цели для этого эксперимента.",

    sloHeading: "SLO: выдержит ли схема?",
    sloTarget: "Цель по доступности",
    sloP95: "Цель по p95 задержке, мс",
    sloAvail: "Доступность",
    sloLatency: "p95 задержка",
    sloPass: "SLO выполняется",
    sloFail: "SLO не выполняется",
    sloBudget: "Бюджет ошибок: {min} мин в месяц",
    sloBurn: "При такой нагрузке схема будет недоступна {min} мин в месяц",
    sloFormula: "Доступность: доля запросов, на пути которых нет выключенного или загруженного на 100%+ блока. p95 ≈ 3 × Σ база/(1 − ρ) по основному пути: {path}.",
    sloUnderChaos: "Цифры посчитаны с идущим экспериментом.",

    costHeading: "Стоимость в месяц",
    costNote: "Условные цены, не коммерческое предложение.",
    costFormula: "Стоимость = Σ блоки × цена блока + запросы × цена за миллион + ГБ × цена за ГБ (месяц = 30 дней).",
    costKind: "Тип",
    costCount: "Кол-во",
    costMonth: "$/мес",
    costTotal: "Итого ≈ ${n}/мес",
    costPrices: "Таблица цен",
    priceNode: "${n} / блок / мес",
    priceMillion: "${n} / миллион запросов",
    priceGb: "${n} / ГБ (~{kb} КБ на запрос)",
    priceStored: "${n} / ГБ в месяц ({gb} ГБ на блок)",
    tradeoff: "Ещё один {name}: +${cost}/мес, доступность {a1}% → {a2}%, p95 {p1} → {p2} мс",
    tradeoffAdd: "Добавить",
    tradeoffNone: "Пока нечего масштабировать.",
  },
  en: {
    heading: "Chaos experiments",
    lead: "Break one thing on purpose and see whether the design survives. Your diagram is not changed.",
    names: {
      killNode: "Kill one node",
      killKind: "Kill a whole kind",
      slowNode: "Latency spike on a node",
      spike: "Traffic x10",
      cutLink: "Lose a network link",
      slowExternal: "Slow external dependency",
    },
    about: {
      killNode: "The chosen node stops working.",
      killKind: "Every node of this kind goes down. Caches and CDNs go cold instead: every request falls through.",
      slowNode: "Each request takes 10 times longer, so the node serves 10 times fewer per second.",
      spike: "Incoming requests grow tenfold.",
      cutLink: "Nothing gets through the chosen link.",
      slowExternal: "Every external service answers 10 times slower.",
    },
    experiment: "Experiment",
    target: "Target",
    run: "Run experiment",
    stop: "Stop experiment",
    active: "Experiment running: {name}",
    activeNote: "Your diagram is unchanged; stopping puts everything back.",
    noTargets: "Add a few blocks first.",
    survived: "Survived: errors {err}%, availability {av}%",
    broke: "Broke: errors {err}%, availability {av}%",
    whatBroke: "What happened",
    down: "{name} is down: {lost} requests/s lost",
    downRouted: "{name} is down, but traffic goes around it",
    cold: "{name} is cold: all {rps} requests/s fall through to the next step",
    slow: "{name} is {x} times slower: ~{ms} ms per request",
    spike: "Traffic x{x}: {rps} requests/s",
    cut: "Link {from} → {to} is cut: {lost} requests/s lost",
    overload: "{name} at {pct}%: requests time out",
    stranded: "{name} has nowhere to send: {lost} requests/s lost",
    latency: "p95 latency {before} → {after} ms",
    nothing: "The diagram has nothing for this experiment to hit.",

    sloHeading: "SLO: will it hold?",
    sloTarget: "Availability target",
    sloP95: "p95 latency target, ms",
    sloAvail: "Availability",
    sloLatency: "p95 latency",
    sloPass: "Meets the SLO",
    sloFail: "Misses the SLO",
    sloBudget: "Error budget: {min} min/month",
    sloBurn: "At this load the design would be failing {min} min/month",
    sloFormula: "Availability: the share of requests whose whole path has no node down or at 100%+. p95 ≈ 3 × Σ base/(1 − ρ) along the main path: {path}.",
    sloUnderChaos: "Numbers include the running experiment.",

    costHeading: "Monthly cost",
    costNote: "Illustrative prices, not a quote.",
    costFormula: "Cost = Σ nodes × node price + requests × price per million + GB × price per GB (30-day month).",
    costKind: "Kind",
    costCount: "Count",
    costMonth: "$/month",
    costTotal: "Total ≈ ${n}/month",
    costPrices: "Unit prices",
    priceNode: "${n} / node / month",
    priceMillion: "${n} / million requests",
    priceGb: "${n} / GB (~{kb} KB per request)",
    priceStored: "${n} / GB-month ({gb} GB per node)",
    tradeoff: "One more {name}: +${cost}/month, availability {a1}% → {a2}%, p95 {p1} → {p2} ms",
    tradeoffAdd: "Add it",
    tradeoffNone: "Nothing to replicate yet.",
  },
};

/** "uz" | "ru" | "en" from a page language, English otherwise. */
export function chaosStrings(lang: string): ChaosStrings {
  return lang === "uz" || lang === "ru" ? CHAOS_UI[lang] : CHAOS_UI.en;
}
