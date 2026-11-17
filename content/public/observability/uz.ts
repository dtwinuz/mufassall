import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Kuzatuvchanlik (observability)",
  summary:
    "Buyurtma 2,4 soniya oladi, har servis esa o'zida hammasi joyida deydi. Log, servislararo request id, RED va USE metrikalar, p95 bo'yicha alert va taqsimlangan trace sekin joyni qanday topadi.",
  learn: [
    "Log, metrika va trace har biri qaysi savolga javob beradi, qaysiga yo'q",
    "Nega bitta request id yoki trace id hamma servisdan o'tishi kerak",
    "Servislar uchun RED, resurslar uchun USE va p95 bo'yicha alert",
    "Trace'da sekin span'ni topish va sampling bilan narxni pasaytirish",
  ],
  nodes: {
    client: "Mijoz ilovasi",
    api: "API",
    orders: "Buyurtmalar servisi",
    stock: "Qoldiqlar servisi",
    db: "Buyurtmalar bazasi",
    logs: "Log ombori",
    tsdb: "Metrikalar bazasi",
    oncall: "Navbatchi muhandis",
    tracer: "Trace ombori",
  },
  metrics: {
    p95: "Buyurtma p95",
    detect: "Sababni topish vaqti",
    telemetry: "Kunlik telemetriya",
  },
  steps: {
    blind: {
      short: "Ko'r-ko'rona",
      title: "Sekin, lekin hech narsa buzilmagan",
      body: "Mijozlar buyurtma «osilib qoladi» deyishadi. Har so'rov muvaffaqiyatli, faqat 2,4 soniya oladi. Qidirsa bo'ladigan xato yo'q.\n\nHar servis matnli logni o'z diskiga yozadi. Bitta sekin buyurtmani tushunish uchun muhandis uchta serverni ochadi va qaysi qatorlar bir-biriga tegishli ekanini taxmin qiladi. Bir yarim soat ketadi.",
      fields: {
        "201 Created": "Muvaffaqiyat. Hech narsa yiqilmagan: na xato logi, na ilinsa bo'ladigan exception.",
        "X-Response-Time": "2,4 soniya. Yagona ishora, u ham vaqt qayerga ketganini aytmaydi.",
      },
    },
    logs: {
      short: "Log",
      title: "Strukturali log bitta joyda",
      body: "Endi har servis har hodisa uchun stdout'ga bitta JSON obyekt yozadi. Agent uni markaziy log omboriga yuboradi, u yerda matnni grep qilish o'rniga maydon bo'yicha filtrlash mumkin.\n\nSekin buyurtmalar endi topiladi: `duration_ms > 2000`. Lekin orders'dagi qaysi qator API'dagi qaysi qatorga mos, hali ham noma'lum.",
      fields: {
        level: "`info`, `warn`, `error`. Maydon bo'yicha filtrlang, gapning ichidan ajratib olmang.",
        service: "Qatorni kim yozgan. Bitta omborda o'nta servis bo'lsa, bu birinchi filtr.",
        duration_ms: "Matn emas, son: ombor uni saralay va solishtira oladi.",
      },
    },
    "request-id": {
      short: "Request ID",
      title: "Butun so'rov uchun bitta id",
      body: "So'rov kelganda API request id yaratadi va uni header'da keyingi servisga uzatadi. Har servis shu so'rov bo'yicha yozgan har log qatoriga shu id'ni qo'yadi.\n\n`req_7f3a91` bo'yicha bitta qidiruv butun yo'lni tartib bilan ko'rsatadi. Sababni topish bir soatdan 25 daqiqaga tushadi.",
      watch: "Header'ni uzatishni unutgan servis o'zidan keyingi barcha servislar uchun zanjirni uzadi.",
      fields: {
        "X-Request-Id": "Kirishda bir marta qo'yiladi va har chiquvchi chaqiruvga ko'chiriladi. Pastda yangisi yaratilmaydi.",
        request_id: "Log qatori ichidagi o'sha id: ombor servislarni bir-biriga bog'lay oladi.",
      },
    },
    red: {
      short: "RED",
      title: "RED metrikalar: rate, errors, duration",
      body: "Log alohida hodisalarni tasvirlaydi. Metrikalar arzon hisoblagichlar: metrikalar bazasi ularni har servisdan 15 soniyada bir oladi. Nechta so'rov, nechtasi yiqildi, qancha davom etdi.\n\nBu har servis uchun **RED**: Rate, Errors, Duration. Orders'da oqim normal, xato kam, lekin davomiylikning dumi qalin. Muammo orders ichida yoki undan pastda.",
      check: {
        q: "Orders'da davomiylik dumi qalin. USE metrikalar uning ostidagi baza haqida nima deydi?",
        options: [
          "To'yingan: so'rovlar ulanish kutyapti",
          "Ortiqcha yuklangan: CPU 100% ga yaqin",
          "Sog': CPU 41%, hech kim kutmayapti, xato yo'q",
        ],
        answer: 2,
        why: "Bazada CPU 41%, ulanish kutayotgan so'rov yo'q, xato ham yo'q. USE bazani gumondorlar ro'yxatidan chiqaradi, demak sekin joy boshqa yerda.",
      },
      fields: {
        http_requests_total: "Faqat o'sadigan hisoblagich. Baza uni soniyadagi so'rovlarga aylantiradi.",
        code: "Har javob kodi uchun alohida qator: xato ulushi = 500'lar / hammasi.",
        le: "Gistogramma savati: nechta so'rov 0,5 s gacha, 2,5 s gacha tugadi. Persentillar shulardan hisoblanadi.",
      },
    },
    use: {
      short: "USE",
      title: "USE metrikalar: baza aybdormi?",
      body: "Resurslar uchun (baza, disk, pool) **USE**'ga qaraladi: Utilisation, Saturation, Errors.\n\nBazada CPU 41%, hech kim ulanish kutmayapti, xato yo'q. Baza aybdor emas. Metrikalar gumondorlarni tez chiqarib tashlaydi, lekin aniq kod qatorini ko'rsatmaydi.",
      fields: {
        db_cpu_utilization: "Bandlik: 41%. Chegaradan uzoq.",
        db_connections_waiting: "To'yinish: birorta so'rov ulanish kutmayapti. Baza oldida navbat yo'q.",
        db_errors_total: "Xatolar: nol. Baza sog'.",
      },
    },
    alert: {
      short: "Alert",
      title: "O'rtacha emas, p95 bo'yicha alert",
      body: "Hozirgacha birinchi bo'lib mijozlar sezardi. Endi metrikalar bazasi har daqiqada qoidani tekshiradi: buyurtma p95'i 5 daqiqadan ko'p 800 ms dan yuqori tursa, navbatchini uyg'ot.\n\nO'rtacha qiymat buni yashirardi: buyurtmalarning ko'pi tez, sekin 5% uni deyarli qimirlatmaydi. p95 har yigirmanchi mijoz nimani his qilishini ko'rsatadi.",
      watch: "Foydalanuvchi sezadigan narsaga (kechikish, xato) alert qo'ying, har CPU sakrashiga emas. Shovqinli pager'ni o'chirib qo'yishadi.",
      fields: {
        histogram_quantile: "Oldingi qadamdagi gistogramma savatlaridan p95'ni hisoblaydi.",
        for: "Shart 5 daqiqa turishi kerak. Bitta sekin soniya hech kimni uyg'otmaydi.",
        value: "Hozir 2,31 s. 0,8 s chegarasidan ancha yuqori.",
      },
    },
    traces: {
      short: "Trace",
      title: "Trace: har qadamdagi vaqt",
      body: "Request id trace'ga aylanadi. Har servis **span** yozadi: nima qildi, qachon boshladi va qancha davom etdi. `traceparent` header'i har span'ni ota span'iga bog'laydi.\n\nSpan'lar trace omboriga ketadi, u ularni har so'rov uchun bitta daraxtga qaytadan yig'adi.",
      fields: {
        traceparent: "Standart header: versiya, 32-hex trace id (butun so'rov), 16-hex ota span id va sampling bayrog'i `01`.",
      },
    },
    "slow-span": {
      short: "Sekin span",
      title: "Sekin span'ni topamiz",
      body: "Bitta sekin trace'ni ochamiz. Orders 2,3 s oladi. Ichida bazaga yozish 38 ms. Keyin qoldiqlar servisiga 12 ta chaqiruv, birin-ketin, har biri taxminan 180 ms.\n\nBirorta chaqiruv sekin emas. Ular shunchaki juda ko'p va ketma-ket. Log va metrikalar buni ko'rsatmasdi, trace bir daqiqada ko'rsatadi.",
      check: {
        q: "Qoldiqlar servisiga 12 ta chaqiruv ketma-ket ketadi, har biri taxminan 180 ms. Buyurtma p95'ini nima tushiradi?",
        options: [
          "Butun savat uchun qoldiqlarni bir marta so'rash",
          "Qoldiqlar servisiga ko'proq CPU berish",
          "Buyurtmalar bazasiga indeks qo'shish",
        ],
        answer: 0,
        why: "Birorta chaqiruv sekin emas edi, ular shunchaki ko'p va ketma-ket edi. Bitta paket chaqiruv 46 ms oladi, buyurtma p95'i 2,4 s dan 0,42 s ga tushadi.",
      },
      fields: {
        create_order: "Ota span. Uning bolalari 2,3 soniya qayerga ketganini tushuntiradi.",
        sku_19: "Savatdagi har tovar uchun bitta chaqiruv. 12 tovar: 12 chaqiruv.",
        "10 more": "Ketma-ket: har biri oldingisini kutadi. Sekin joy shu.",
      },
    },
    batch: {
      short: "Paket",
      title: "Butun savat uchun bitta chaqiruv",
      body: "Endi orders qoldiqlarni savatdagi barcha tovarlar uchun bir marta so'raydi. Buyurtma p95'i 2,4 s dan 0,42 s ga tushadi.\n\nYangi trace buni tasdiqlaydi: o'n ikkita o'rniga 46 ms'lik bitta qoldiq span'i. Trace id o'sha, bu qadam uchun esa yangi ota span id.",
      check: {
        q: "Har so'rovning trace'i kuniga 12 GB oladi. Buni qanday kamaytirib, ochiladigan trace'larni saqlab qolasiz?",
        options: [
          "Faqat API'ni trace qilish, ortidagi servislarni emas",
          "Oddiy trace'larning 10% ini, sekin va xatolilarning hammasini saqlash",
          "Barcha trace'lardan tasodifiy 10% ni saqlash, boshqa hech narsani",
        ],
        answer: 1,
        why: "Tez va muvaffaqiyatli trace'lar asosan zerikarli, shuning uchun ularning 10% i saqlanadi, xatoli yoki 1 s dan sekin har trace esa qoladi. Ombor kuniga 2,5 GB ga tushadi.",
      },
      fields: {
        skus: "Har tovarga alohida so'rov o'rniga hammasi bitta so'rovda.",
        traceparent: "O'sha trace id, yangi ota span id. Ombor bu chaqiruvni o'sha daraxtga qo'shadi.",
        "X-Response-Time": "Butun savat uchun 46 ms.",
      },
    },
    sampling: {
      short: "Sampling",
      title: "Trace qimmat: sampling qilamiz",
      body: "Har so'rovning trace'i kuniga 12 GB beradi, asosan tez va zerikarli so'rovlar. Endi kollektor oddiy trace'larning 10% ini saqlaydi, lekin xatoli yoki 1 s dan sekin har trace'ni saqlaydi.\n\nOmbor kuniga 2,5 GB ga tushadi. Haqiqatan ochiladigan trace'lar baribir hammasi joyida.",
      watch: "Boshida qaror qilish (head sampling) arzon, lekin ko'r. Sekin va xatoli trace'larni saqlash uchun oxirida qaror qilish kerak (tail sampling).",
      fields: {
        "10%": "Oddiy trace'larning tasodifiy ulushi. Odatiy manzarani ko'rishga yetadi.",
        dropped: "Tez va muvaffaqiyatli: bu saqlanmaydi.",
        kept: "Sekin yoki xatoli: doim saqlanadi, aynan shularni tekshirishadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Log nima bo'lganini, metrika qancha va qanchalik tez-tez bo'lganini, trace vaqt qayerga ketganini aytadi.\n\n1) Strukturali JSON'ni bitta joyga yozing. 2) Kirishda bitta request id yoki trace id yarating va uni hamma joyga uzating. 3) Servislarga RED, resurslarga USE. 4) O'rtachaga emas, bir necha daqiqalik p95 va xatolarga alert. 5) Sekin span'ni trace'da toping va narxni ushlash uchun sampling qiling.",
    },
  },
};

export default text;
