import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Xabar navbatlari",
  summary:
    "Do'kon buyurtma xatini soniyasiga 100 ta xat qabul qiladigan provayder orqali yuboradi, aksiya esa soniyasiga 600 ta buyurtma olib keladi. Navbat to'lqinni qanday yutadi va unda nimalarni sozlash shart: lease, ack, backoff, dead-letter navbat va backpressure.",
  learn: [
    "Producer va worker'lar orasidagi navbat to'lqinni qanday tekislaydi",
    "Visibility timeout va ack: worker o'lsa yoki sekin bo'lsa nima bo'ladi",
    "Eksponensial backoff va jitter bilan qayta urinish, zaharli xabarlar uchun dead-letter navbat",
    "Iste'molchilarni backlog bo'yicha kengaytirish va producer'ni backpressure bilan sekinlatish",
  ],
  nodes: {
    buyers: "Xaridorlar",
    api: "Do'kon API",
    mail: "Pochta provayderi",
    queue: "Navbat",
    w1: "Worker 1",
    w2: "Worker 2",
    dlq: "Dead-letter navbat",
    campaign: "Rassilka job'i",
  },
  metrics: {
    p95: "Buyurtma p95",
    backlog: "Backlog",
    delay: "Xat kechikishi",
    lost: "Yo'qolgan xat",
  },
  steps: {
    direct: {
      short: "To'g'ridan",
      title: "Xat buyurtma so'rovi ichida yuboriladi",
      body: "Buyurtma to'langach, API pochta provayderini chaqiradi va xaridorga javob berishdan oldin uning javobini kutadi. Provayder 0,8 s oladi.\n\nSoniyasiga 40 buyurtmada bu ishlaydi. Xaridor biroz ko'proq kutadi va buyurtma endi begona serverga bog'liq ekanini hech kim sezmaydi.",
      fields: {
        Authorization: "Do'konning provayderdagi API kaliti. Bu yerda yashirilgan.",
        template: "Qaysi xat yuboriladi. Provayder uni buyurtma ma'lumoti bilan to'ldiradi.",
        "X-Response-Time": "Har buyurtma so'rovining 820 ms'i boshqa birovni kutishga ketadi.",
      },
    },
    spike: {
      short: "To'lqin",
      title: "Aksiya: soniyasiga 600 buyurtma",
      body: "Soat 10:00 da aksiya boshlanadi va buyurtmalar o'n besh barobar oshadi. Provayder soniyasiga 100 xat qabul qiladi, qolganini `429` bilan rad etadi.\n\nAPI thread'lari provayderda osilib qoladi, buyurtma so'rovlari timeout bo'ladi, `429` olgan xatlar esa shunchaki tashlab yuboriladi. Yilning eng qizg'in soati eng yomoniga aylanadi.",
      watch: "Sekin bog'liqlik so'rov yo'lida tursa, uning limiti sizning limitingizga aylanadi.",
      fields: {
        "429": "So'rov juda ko'p: provayder o'zini himoya qilyapti.",
        "Retry-After": "Bir soniyadan keyin urin. Lekin API'da xatni shu orada saqlaydigan joy yo'q.",
        limit_per_second: "Provayder shifti. API serverlari qancha bo'lmasin, uni ko'tarmaydi.",
      },
    },
    queue: {
      short: "Navbat",
      title: "Buyurtma va xat orasida navbat",
      body: "API endi navbatga kichik vazifa qo'yadi va xaridorga darhol javob beradi. Worker vazifalarni navbatdan oladi va provayder qabul qiladigan tezlikda yuboradi.\n\nTo'lqin yo'qolmaydi, vaqtga yoyiladi: navbatda 42 000 vazifa kutadi, oxirgi xat 8 daqiqa kechikib ketadi. Lekin hech bir buyurtma yiqilmaydi va hech bir xat yo'qolmaydi.",
      watch: "Navbat xatoni kechikishga almashtiradi. Faqat xatolarga emas, backlog va eng eski xabar yoshiga qarang.",
      fields: {
        persistent: "Navbat vazifani diskka yozadi. U broker qayta ishga tushsa ham saqlanadi.",
        order_id: "Faqat kalit. Qolganini worker xatni yig'ayotganda o'qiydi.",
        depth: "Nechta vazifa kutyapti. To'lqin endi xato sifatida emas, shu yerda ko'rinadi.",
      },
    },
    "scale-out": {
      short: "Kengaytirish",
      title: "Ko'proq worker, provayder shiftigacha",
      body: "Autoscaler backlog va eng eski xabar yoshini kuzatadi va ikkinchi worker'ni ishga tushiradi. Ikkalasi bitta navbatdan oladi: har vazifa faqat bittasiga tushadi.\n\nBacklog ikki barobar tez kamayadi, kechikish bir yarim daqiqaga tushadi. Uchinchi worker yordam bermaydi: ikkitasi allaqachon provayderning soniyasiga 100 tasiga yaqin.",
      watch: "Iste'molchilarni ular kutayotgan narsaga qarab kengaytiring. Quyi limitdan oshgach, ko'proq worker faqat xato qo'shadi.",
      fields: {
        backlog: "Kutayotgan vazifalar. Worker qo'shish uchun asosiy signal.",
        oldest_age: "Eng eski vazifa qancha kutgan: xaridor haqiqatda ko'radigan kechikish.",
        "provider cap": "Muhim shift. Undan ortiq worker'lar shunchaki `429` ga uriladi.",
      },
    },
    crash: {
      short: "Yiqilish",
      title: "Worker xabarni ushlab o'ldi",
      body: "Worker 2 `m_8812` xabarini oladi va yuborishga ulgurmay o'ladi. Navbat xabarni yetkazganda o'chirmagan: faqat 30 soniyaga yashirgan, bu **visibility timeout**.\n\nHech kim uni vaqtida o'chirmadi, shuning uchun u yana ko'rinadi va uni worker 1 oladi. Worker xabarni o'chiradi (bu uning ack'i) faqat xat ketgandan keyin.",
      fields: {
        receive_count: "Bu xabarning ikkinchi yetkazilishi. Navbat ularni sanaydi.",
        visibility_timeout: "Lease: xabar boshqa worker'lardan qancha vaqt yashirin turadi.",
        DELETE: "Ack. U kelguncha xabar worker'niki emas, navbatniki.",
      },
    },
    "lease-expired": {
      short: "Lease tugadi",
      title: "Sekin ish lease'dan uzoq davom etdi",
      body: "Ulgurji buyurtmaning cheki 212 sahifa, PDF 45 soniya yasaladi. Lease 30 soniya. 30-soniyada navbat worker 1 o'ldi deb o'ylaydi va xabarni worker 2 ga beradi.\n\nIkkalasi ham tugatadi va xaridor ikkita bir xil xat oladi. Hech narsa yiqilmadi: ish shunchaki navbatga aytilganidan uzoqroq davom etdi.",
      fields: {
        "212 pages": "Kam uchraydigan katta ish. Timeout odatdagilari uchun qo'yilgan edi.",
        "visible again": "Worker 1 hali ishlayotganda lease tugadi.",
        receive_count: "Ikkinchi olish. Endi bitta ish parallel ikki marta bajarilyapti.",
      },
    },
    heartbeat: {
      short: "Heartbeat",
      title: "Ishlayotganda lease'ni uzaytir",
      body: "Ish davom etayotganda worker har 20 soniyada lease'ni uzaytiradi. Xabar worker'i tirik ekan yashirin turadi, u o'lsa 60 soniyadan keyin qaytadi.\n\nIkkinchi himoya ham qoladi: worker provayderga xabar ID'sidan olingan idempotentlik kalitini yuboradi, shuning uchun kam uchraydigan takror ham bitta xat bo'ladi.",
      watch: "Yetkazish — kamida bir marta. Lease takrorni kamaytiradi, lekin hech qachon imkonsiz qilmaydi.",
      fields: {
        EXTEND: "«Hali ishlayapman.» Buni navbat emas, worker yuboradi.",
        visibility_timeout: "Yangi lease, hozirdan boshlab sanaladi.",
        "every 20 s": "Lease'dan qisqa, shuning uchun bitta o'tkazib yuborilgan heartbeat xabarni bo'shatmaydi.",
      },
    },
    "retry-storm": {
      short: "Retry bo'roni",
      title: "Provayder tushdi, worker'lar unga yopiriladi",
      body: "Pochta provayderi yigirma daqiqaga ishdan chiqadi. Worker'lar xatoni ushlaydi va xabarni darhol qaytaradi, bir lahzadan keyin uni yana oladi.\n\nHar xabar daqiqasiga o'nlab marta sinab ko'riladi. Worker'lar CPU'ni behuda yoqadi, provayder qayta ko'tarilmoqchi bo'lganda esa unga bir vaqtda minglab qayta urinish uriladi.",
      fields: {
        "503": "Provayder ishlamayapti. Vaqtinchalik nosozlik: qayta urinishga arziydi, lekin darhol emas.",
        "Retry-After": "Provayder 60 soniya tinchlik so'rayapti.",
        "attempt 38": "Bitta xabar bir daqiqada 38 marta. Qayta urinishlar faqat yuk qo'shadi.",
      },
    },
    backoff: {
      short: "Backoff",
      title: "Jitter bilan eksponensial backoff",
      body: "Xatodan keyin worker xabarni har safar ikki barobar oshadigan kechikish bilan qaytaradi: 10 s, 20 s, 40 s, 80 s, shifti 15 daqiqa. Minglab xabar bir soniyada qaytmasligi uchun tasodifiy jitter qo'shiladi.\n\nProvayder tiklanishga vaqt oladi, tiklanganda esa navbat bir zarbada emas, asta-sekin bo'shaydi.",
      watch: "Jitter bo'lmasa, birga yiqilgan barcha xabarlar birga qayta urinadi va bo'ron jadval bo'yicha qaytib keladi.",
      fields: {
        NACK: "«Bo'lmadi, qaytar.» Xabar yo'qolmaydi, navbatga qaytadi.",
        delay: "U faqat 86 s dan keyin yana ko'rinadi.",
        jitter: "Tasodifiy qo'shimcha. Qayta urinishlar to'lqin bo'lib emas, yoyilib keladi.",
      },
    },
    dlq: {
      short: "DLQ",
      title: "Zaharli xabar dead-letter navbatga",
      body: "Bitta xabar o'chirib yuborilgan xat shabloniga ishora qiladi. U har safar yiqiladi va hech qanday backoff uni tuzatmaydi. Limit bo'lmasa, u navbatda abadiy aylanadi.\n\n5 marta olingandan keyin navbat uni alohida dead-letter navbatga ko'chiradi. Boshqalar kutib qolmaydi, alert ishlaydi, shablon tuzatilgach esa xabarlar asosiy navbatga qaytariladi.",
      watch: "Hech kim kuzatmaydigan DLQ — xabarlarni yo'qotishning sekinroq usuli xolos. Uning hajmiga alert qo'ying.",
      fields: {
        max_receive_count: "5 ta muvaffaqiyatsiz olishdan keyin xabar zaharlangan hisoblanadi.",
        dead_letter_queue: "Zaharlangan xabarlar qayerga boradi. O'z alerti bor alohida navbat.",
        moved: "Xabar asosiy navbatni tark etdi. Worker'lar endi unga urinishni behuda sarflamaydi.",
        "last error": "Sabab xabar bilan birga boradi, nimani tuzatish kerakligi aniq.",
      },
    },
    backpressure: {
      short: "Backpressure",
      title: "Backpressure: producer sekinlashadi",
      body: "Marketing rassilka boshlaydi: 2 million xat birdaniga o'sha navbatga. Buyurtma xatlari ularning ortida soatlab kutardi.\n\nRassilka job'i endi e'lon qilishdan oldin navbat chuqurligini tekshiradi. 20 000 dan oshsa, to'xtaydi va worker'lar yetib olishini kutadi. Navbat cheksiz o'sish o'rniga producer'ga sekinlash deb aytadi.",
      watch: "Cheksiz navbat ortiqcha yukni faqat yashiradi. Uni cheklang va to'lganda producer nima qilishini hal qiling: kutadimi, tashlaydimi yoki xato beradimi.",
      fields: {
        depth: "Producer o'qiydigan signal. Limitdan oshsa, qo'shishni to'xtatadi.",
        pause: "Producer navbatni to'ldirish o'rniga kutadi.",
        resume: "Worker'lar yetib oldi. Rassilka tizim ko'tara oladigan tezlikda davom etadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Navbat uchun olti qoida.\n\n1) Sekin va cheklangan ish so'rov yo'lidan chiqib, navbat orqali boradi. 2) Worker'larni backlog va eng eski xabar yoshi bo'yicha, quyi limitgacha kengaytiring. 3) Ack ishdan keyin; uzun ishlarda lease'ni uzaytiring. 4) Eksponensial backoff va jitter bilan qayta urining. 5) Zaharli xabarlar kuzatiladigan dead-letter navbatga. 6) Navbatni cheklang va producer'larga sekinlashishga imkon bering.",
    },
  },
};

export default text;
