import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Backpressure",
  summary:
    "Mobil ilova analitika hodisalarini ingest API'ga yuboradi, API ularni writer bazaga yozguncha o'z xotirasida saqlaydi. Baza sekinlashsa, hodisalar chiqib ketishidan tezroq keladi, buferda chegara yo'q, va API xotirasi tugab o'ladi: o'shanda 1,8 million hodisaga allaqachon \"qabul qildim\" deb javob berilgan bo'ladi. Backpressure tizimning zanjir bo'ylab orqaga \"sekinroq\" deyish usuli: chegarali bufer, to'lganda nima qilish qoidasi, Retry-After bilan 429, o'zi tortib oladigan consumer'lar, ustuvorlik bo'yicha rad etish va kirishdagi limit.",
  learn: [
    "Nega chegarasiz navbat ortiqcha yukni avval kechikishga, keyin yo'qolgan ma'lumotga aylantiradi va buni qanday hisoblash",
    "Chegarali bufer va to'lib qolganda to'rt yo'l: kutish (block), yangisini tashlash, eskisini tashlash, sampling",
    "429 va Retry-After bilan yukni rad etish, pull asosidagi oqim: consumer poll, TCP oynasi, request(n)",
    "Signalni ustuvorlik bo'yicha yuqoriga uzatish va navbat o'rniga tez rad etadigan concurrency limit",
  ],
  nodes: {
    apps: "Mobil ilovalar",
    api: "Ingest API",
    buffer: "Xotiradagi bufer",
    writer: "Writer'lar",
    db: "Analitika bazasi",
    log: "Hodisalar logi",
  },
  metrics: {
    mem: "API xotirasi",
    lag: "Hodisa kechikishi",
    lost: "Yo'qolgan hodisalar",
    shed: "Rad etilgan hodisalar",
  },
  steps: {
    pipeline: {
      short: "Zanjir",
      title: "Hodisalar xotiraga tushadi, writer ularni bo'shatadi",
      body: "Ilovaning SDK'si hodisalarni yig'ib, 50 tagacha bo'lgan paketlarda yuboradi. Kechki cho'qqida hamma telefonlar birgalikda soniyasiga 1 200 ta hodisa yuboradi. Ingest API har paketni o'z xotirasidagi buferga qo'yadi va darhol `202` qaytaradi. To'rtta writer buferdan hodisalarni olib, bazaga 500 qatordan yozadi: hammasi bo'lib soniyasiga 2 000 ga yaqin.\n\nYuk 1 200 / 2 000 = 0,6. Joy bor, hodisa bazaga yarim soniyada yetib boradi.",
      fields: {
        device: "Paketni qaysi telefon yuborgani.",
        events: "Bir so'rovda 50 tagacha hodisa: ilova har bosishda alohida ulanish ochmaydi.",
        "202 Accepted": "\"Oldim\" degani, \"saqladim\" emas. Hodisa hozircha faqat API xotirasida.",
        accepted: "Paketdagi nechta hodisani API qabul qilgani.",
      },
    },
    slow: {
      short: "Sekin baza",
      title: "Baza sekinlashadi, bufer o'sadi",
      body: "19:00 da tungi indeks qayta qurilishi boshlanadi va writer'lar soniyasiga 800 tagacha tushadi. Kelayotgani esa hamon 1 200. Farq, soniyasiga 400 ta, buferda qoladi: besh daqiqada 120 000, o'n daqiqada 240 000.\n\nYuqoridagilar buni sezmaydi. API hamon 3 ms da `202` qaytaradi, ilovalar to'liq tezlikda yuborishda davom etadi. Yagona belgi API xotirasi: u to'xtovsiz o'sib boryapti.",
      watch: "Yuk 1 dan oshsa, barqaror holat bo'lmaydi: navbat bu holat davom etgan har soniyada (kirish − chiqish) qadar o'sadi.",
      check: {
        q: "Indeks qayta qurilishi ikki soat davom etadi. Bufer nima bo'ladi?",
        options: [
          "Writer'lar yetib olgach, bir joyda to'xtaydi",
          "Har soniyada 400 taga, soatiga 1,44 millionga o'sadi, xotira tugaguncha",
          "API o'zi sekinlashadi va ilovalar kamroq yuboradi",
        ],
        answer: 1,
        why: "1 200 kirib, 800 chiqib tursa, qayta qurilish davomida writer'lar hech qachon yetib ololmaydi. Yuboruvchilarga hech narsa aytilmaydi, chunki xotiradagi bufer doim \"ha\" deydi. Navbat chiziqli o'sadi: 400 × 3 600 = soatiga 1,44 million.",
      },
      fields: {
        "out 800/s": "Indeks qayta qurilayotganda writer'lar uddalaydigan tezlik: odatdagining 40 foizi.",
        depth: "Kutayotgan hodisalar. Har soniya +400.",
        heap: "Xotirada har hodisaga 1 KB atrofida, ustiga API'ning o'zi.",
        "202": "Yuboruvchilar avvalgidek javob oladi: hech qanday signal yo'q.",
      },
    },
    oom: {
      short: "Xotira tugadi",
      title: "API 1,8 million tasdiqlangan hodisa bilan o'ladi",
      body: "20:16 da API konteyneri 2 GiB limitiga yetadi va o'chirib yuboriladi. Buferda 1 840 000 ta hodisa bor edi. Ularning har biriga `202` qaytarilgan, shuning uchun ilovalar ularni telefondan o'chirib bo'lgan. Qayta ishga tushgach bufer bo'sh: bu hodisalar yo'qoldi.\n\nLittle qonuni bo'yicha kechikish = navbat chuqurligi / chiqish tezligi = 1 840 000 / 800 = 2 300 s, ya'ni eng eski hodisa 38 daqiqa kutgan. Chegarasiz bufer ortiqcha yukni yutib yubormadi. Uni avval kechikishga, keyin yo'qotishga aylantirdi.",
      watch: "Chegarasiz navbat ortiqcha yukni yo'qotmaydi. U og'riq paytini faqat keyinga suradi va o'sha paytni kattaroq qiladi.",
      fields: {
        OOMKilled: "Konteyner ruxsat etilganidan ko'p xotira ishlatdi va tizim uni to'xtatdi.",
        "buffered events": "Kutayotgan hamma narsa, faqat RAM'da.",
        "answered 202": "Har biriga va'da berilgan edi. Ilovalar ularni telefondan olib tashlagan.",
        "buffer empty": "Xotira qayta ishga tushishdan omon chiqmaydi.",
      },
    },
    bounded: {
      short: "Chegara",
      title: "Buferga chegara qo'yiladi: to'lsa, kutish",
      body: "Endi buferda ko'pi bilan 50 000 ta hodisa turadi: 50 MB atrofida, hech qachon ko'p emas. To'lganda API'ning `put` i joy bo'shashini 200 ms gacha kutadi. Kutib turgan `put` so'rovni ushlab turadi, shuning uchun ilovalar javobni sekinroq oladi va keyingi paket kechroq jo'naydi.\n\nMana shu **backpressure**: sekin consumer navbatni o'stirish o'rniga producer'ni sekinlashtiradi. Eng uzun kechikish ham endi chegaralangan: 50 000 / 800 = 62 soniya. Bahosi: API'ning so'rov thread'lari kutib turadi va uning o'z yuki 95 foizga chiqadi.",
      fields: {
        capacity: "Chegara. Uni bor xotiraga qarab emas, qabul qila oladigan kechikishga qarab tanlang.",
        on_full: "Joy qolmaganda nima qilish. Bu yerda: kutish.",
        put_timeout: "Shu so'rovdan voz kechishdan oldin qancha kutish.",
        "worst wait": "Sig'im / chiqish tezligi: hodisa buferda turishi mumkin bo'lgan eng uzun vaqt.",
      },
    },
    strategies: {
      short: "Yo'llar",
      title: "To'lib qolganda: kutish, tashlash yoki sampling",
      body: "Kutish yagona javob emas. Tanlov ma'lumot qanchalik qimmatligiga bog'liq. **Block** hech narsani yo'qotmaydi, lekin kutishni producer'ga o'tkazadi. **Drop newest** navbatdagini saqlaydi va yangi kelganlarni rad etadi. **Drop oldest** navbat boshidagini chiqarib tashlaydi, shunda eng yangi ma'lumot qoladi. **Sample** har N tadan bittasini saqlaydi va sonlarni qaytadan N ga ko'paytiradi.\n\nTo'lov va buyurtmalar hech qachon tashlanmaydi: ular kutadi yoki aniq xato oladi. Har soniyada qayta yuboriladigan metrika esa bir-ikki nuqtasini yo'qotsa ham zarari yo'q.",
      watch: "Jimgina tashlash eng yomon yo'l: tashlasangiz, nechta tashlaganingizni sanang va shu sonni ko'rinadigan qiling.",
      check: {
        q: "Kuryer ilovasi har 2 soniyada GPS joylashuvini yuboradi. Bufer to'la. Qaysi yo'l mos?",
        options: ["Joy bo'shaguncha ilovani kuttirish", "Eng yangi joylashuvlarni tashlash", "Eng eski joylashuvlarni tashlash"],
        answer: 2,
        why: "Faqat oxirgi joylashuv muhim: bir daqiqa oldingi nuqta allaqachon noto'g'ri. Eskisini tashlash xaritani dolzarb ushlab turadi. Kuttirish kuryer ilovasini endi hech kimga kerak bo'lmagan ma'lumot uchun to'xtatadi, yangisini tashlash esa aynan eskirgan nuqtalarni qoldiradi.",
      },
      fields: {
        block: "Producer kutadi. Yo'qolmasligi shart bo'lgan ma'lumot uchun xavfsiz.",
        "drop newest": "Kirishda rad etish. Eski ma'lumot hali foydali bo'lsa yaxshi.",
        "drop oldest": "Boshidagini chiqarish. Faqat yangi ma'lumot muhim bo'lsa yaxshi.",
        sample: "N tadan 1 tasini saqlab, sonlarni N ga ko'paytirish. Statistika uchun bo'ladi, pul uchun emas.",
      },
    },
    shed: {
      short: "429",
      title: "Yukni rad etish: Retry-After bilan tez \"yo'q\"",
      body: "Kutib turgan so'rovlar baribir ulanish va thread'ni band qiladi. Endi bufer 80 foizdan ko'p to'lsa, API darhol javob beradi: `Retry-After: 2` bilan `429 Too Many Requests`. SDK paketni telefonda saqlab qoladi va keyinroq qayta yuboradi.\n\nAPI endi paketlarning uchdan birini qaytaradi: 1 200 keladi, 800 tasini saqlash mumkin. Uning o'z yuki 95 foizdan 70 foizga tushadi va hech narsa yo'qolmaydi: qabul qilinmagani qurilmada qoladi, qurilma buni biladi.",
      check: {
        q: "SDK `Retry-After: 2` bilan `429` oldi. U nima qilsin?",
        options: [
          "Shu paketni darhol qayta yuborsin",
          "Paketni telefonda saqlasin, 2 soniya va tasodifiy jitter kutib, keyin qayta yuborsin",
          "Paketni o'chirsin: server uni xohlamadi",
        ],
        answer: 1,
        why: "Darhol qayta urinish ortiqcha yukni ko'paytiradi. Aynan 2 soniya kutish esa hamma telefonni bir soniyada qaytaradi. Ko'rsatilgan vaqt ustiga jitter qo'shib kutish qayta urinishlarni yoyadi, paketni saqlash esa `429` da hech narsa yo'qolmasligini ta'minlaydi.",
      },
      fields: {
        "429 Too Many Requests": "\"Hozir emas, bu sizning aybingiz emas\". Hech narsa saqlanmadi.",
        "Retry-After": "Qachon qaytish, soniyalarda. Sur'atni server belgilaydi.",
        queue_fill: "Bufer qanchalik to'lgani. Rad etish to'lib bo'lmasdan, 0,8 da boshlanadi.",
        accepted: "0: butun paket mijozda qoladi.",
      },
    },
    pull: {
      short: "Pull",
      title: "Mustahkam log va o'zi tortib oladigan writer'lar",
      body: "Xotiradagi bufer o'rniga diskda, uchta replikali **hodisalar logi** keladi. API `202` ni faqat log paketni olganidan keyin qaytaradi, shuning uchun qayta ishga tushish hech narsani yo'qotmaydi. Log uch kunlik hodisalarni saqlaydi: endi chegara RAM emas, disk.\n\nWriter'lar **o'zi tortib oladi** (pull): har biri ko'pi bilan 500 ta yozuv so'raydi, ularni saqlaydi, offset'ini commit qiladi va faqat shundan keyin yana so'raydi. Writer'ga u olishga tayyor bo'lganidan ko'pini hech kim itarib bera olmaydi. TCP oynasi ham shu g'oya: qabul qiluvchi yana nechta bayt ola olishini e'lon qiladi. Reactive Streams'dagi `request(n)` ham.",
      watch: "Pull ishni yo'q qilmaydi: consumer lag soatlab o'ssa, consumer qo'shing yoki rad eting. Alertni CPU'ga emas, lag'ga qo'ying.",
      fields: {
        max_records: "Writer'ning krediti: bir martada uddalay oladiganidan ko'p emas.",
        "commit offset": "Shu yergacha bajarildi. Yiqilgandan keyin writer shu nuqtadan davom etadi.",
        "poll again only now": "Sur'atni producer emas, consumer belgilaydi.",
        "consumer lag": "Writer'lar qancha orqada: yozuvlarda va soniyalarda.",
      },
    },
    propagate: {
      short: "Yuqoriga",
      title: "Kechikish zanjir bo'ylab ustuvorlik bilan yuqoriga chiqadi",
      body: "API har 5 soniyada consumer lag'ni o'qiydi. 60 soniyadan past bo'lsa, hammasini qabul qiladi. Oshsa, ustuvorlik bo'yicha rad eta boshlaydi: xaridlar doim qabul qilinadi, ekran ko'rishlarining yarmi, debug loglar esa `Retry-After: 30` bilan `429` oladi.\n\nSekin baza endi uni hal qilish mumkin bo'lgan joyda seziladi: qurilmada, u kutadi va ma'lumotini saqlaydi. Zanjirning har bo'g'ini, writer'dan logga, logdan API'ga, API'dan ilovaga, signalni bir qadam orqaga uzatadi. Endi hodisalarning faqat beshdan biri rad etiladi, ular orasida birorta ham xarid yo'q.",
      fields: {
        consumer_lag: "Writer'lar kechikishi, API o'qiydi: pastdan kelgan signal.",
        priority: "Oldindan kelishilgan: biznes nimani eng oxirida yo'qotishi mumkin.",
        "accept 50%": "Ekran ko'rishlarining yarmi o'tadi, qolgan yarmi telefonda kutadi.",
        "Retry-After": "Past ustuvorlik uzoq pauza oladi, qayta urinish oynasini band qilmasin.",
      },
    },
    admission: {
      short: "Kirish",
      title: "Kirishda concurrency limit",
      body: "Oxirgi qo'riqchi API'ning o'zida. Little qonuniga ko'ra soniyasiga 2 000 so'rov, har biri 50 ms bo'lsa, bir vaqtda 100 ga yaqin so'rov ishlanadi. Limiter 200 taga ruxsat beradi. 201-so'rov thread pool'da timeout bo'lguncha kutish o'rniga bir millisekunddan kam vaqtda `503` oladi.\n\nLimit moslashadi: median kechikish o'ssa, limit tushadi; tiklansa, soniyasiga 10 tadan ko'tariladi. Indeks qayta qurilishi tugadi, writer'lar yana soniyasiga 2 000 tani yozmoqda, kechikish yana bir soniya.",
      watch: "Tez rad etish mikrosoniyalar turadi. Sekin rad etish esa xotira, thread va mijoz sabrini band qiladi, keyingi qayta urinishni ham og'irlashtiradi.",
      fields: {
        in_flight: "Ayni paytda ishlanayotgan so'rovlar. Limit soniyadagi so'rovlarni emas, shularni sanaydi.",
        "503": "Hech qanday ish qilinmasdan rad etildi, shuning uchun rad etishning o'zi arzon.",
        "limit 200 -> 140": "Kechikish o'sdi, demak server to'yingan: kamroq ol.",
        "+10 per s": "Sekin o'stir, tez kes, TCP tiqilinni boshqarishidagidek.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Backpressure uchun olti qoida.\n\n1) Yuk 1 dan oshsa, navbat har soniyada (kirish − chiqish) qadar o'sadi: umid qilmang, hisoblang. 2) Har buferning chegarasi bo'lsin, u qabul qilinadigan kechikishga qarab tanlanadi. 3) To'lganda nima bo'lishini hal qiling: block, drop newest, drop oldest yoki sample, va tashlanganini sanang. 4) Tez `429` va `Retry-After` bilan rad eting; mijozlar ma'lumotni saqlab, jitter bilan qayta urinadi. 5) Consumer'lar o'zi tortib olsin, ortiqcha yuk mustahkam logda tursin, alert consumer lag'ga qo'yilsin. 6) Signalni ustuvorlik bo'yicha yuqoriga uzating va kirishda concurrency'ni cheklang, shunda rad etish arzon bo'ladi.",
    },
  },
  scenarios: {
    spike: {
      label: "3 barobar to'lqin",
      steps: {
        "spike-hit": {
          short: "To'lqin",
          title: "Push kampaniya trafikni uch barobar oshiradi",
          body: "19:00 da marketing hamma foydalanuvchiga push xabar yuboradi. 20 daqiqa davomida soniyasiga 1 200 o'rniga 3 600 hodisa keladi. Writer'lar 2 000 tasini uddalaydi. Ortiqchasi soniyasiga 1 600: 20 daqiqada 1,92 million hodisa.\n\nAPI concurrency limitiga yetadi, uning yuki 100 foiz.",
          check: {
            q: "Shu 20 daqiqada bazani nima himoya qiladi?",
            options: [
              "Bir daqiqada yana 4 ta writer qo'shish",
              "API'da ustuvorlik bo'yicha qabul: xaridlar doim, qolgani qisman yoki Retry-After bilan 429, telefonlar paketlarini saqlaydi",
              "2 million hodisa ko'proq sig'ishi uchun log limitini oshirish",
            ],
            answer: 1,
            why: "Chegara soniyasiga 2 000 bo'lgan bazaning o'zi bo'lsa, ko'proq writer yordam bermaydi. Log hodisalarni saqlay olardi, lekin kechikish 16 daqiqaga o'sardi. Qabul qoidasi kechikishni qisqa ushlaydi, xaridlar o'tib turadi, qolgani esa telefonlarda xavfsiz kutadi.",
          },
          fields: {
            "3x traffic": "Odatdagi cho'qqidan uch barobar ko'p, kampaniya rejasidan oldindan ma'lum.",
            writers: "Hozir sog'lom, lekin soniyasiga 2 000 bazaning shifti.",
            excess: "Qayerdadir kutishi kerak bo'lgan qism: RAM'da, diskda yoki telefonda.",
            "nowhere to go": "Backpressure bo'lmasa, 1,92 million hodisa xotiraga tushadi.",
          },
        },
        "spike-hold": {
          short: "Ushlash",
          title: "Ortiqchasini telefonlar ushlab turadi",
          body: "API paketlarning 44 foizini `Retry-After: 20` bilan `429` qilib qaytaradi. Har telefon paketlarini 5 MB gacha saqlaydi va 20 soniya ustiga tasodifiy 0 dan 10 gacha soniya o'tib qayta urinadi. Xaridlar darhol yuboriladi va hech qachon rad etilmaydi.\n\nOrtiqcha yuk endi bitta jarayondagi 2 GB o'rniga o'n minglab telefonga, har biriga bir necha kilobaytdan bo'lib tarqalgan. Kechikish 30 soniyada turibdi.",
          fields: {
            "Retry-After": "To'lqin davomida server pauzani cho'zadi.",
            "kept on device": "Ortiqcha yuk joyi bor yerda yashaydi.",
            jitter: "Tasodifiy yoyish, telefonlar hammasi bir vaqtda qaytmasin.",
            purchases: "Eng yuqori ustuvorlik hozir ham o'tadi.",
          },
        },
        "spike-after": {
          short: "Keyin",
          title: "To'lqin tugaydi, ortiqcha yuk tarqaladi",
          body: "19:20 da kampaniya trafigi tugaydi. Telefonlar saqlab qo'yganini jitter bilan yoyib yuboradi: odatdagi 1 200 ustiga soniyasiga 700 ta qo'shimcha hodisa. Writer'lar 95 foizda ishlaydi va 19:31 ga kelib kechikish yana bir soniya.\n\nBirorta hodisa yo'qolmadi, baza ham limitidan oshmadi. To'lqinni bitta bufer emas, butun zanjir yutdi.",
          fields: {
            "backlog from devices": "Telefonlar saqlagan paketlar, server ruxsat bergan sur'atda qaytmoqda.",
            "consumer lag": "11 daqiqada odatdagi holatga qaytdi.",
            lost: "Hech narsa: har hodisa yo saqlandi, yo hali telefonda edi.",
          },
        },
      },
    },
  },
};

export default text;
