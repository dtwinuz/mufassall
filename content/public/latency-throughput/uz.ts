import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Kechikish va o'tkazuvchanlik",
  summary:
    "Bitta so'rov qancha davom etishi va bir soniyaga nechta so'rov sig'ishi — ikki xil son. Qidiruv API bir hovuch foydalanuvchidan kechki tig'iz soatgacha o'sadi: o'rtacha qiymat og'riqni qanday yashiradi va 90% band server nega allaqachon xavfda.",
  learn: [
    "Kechikish (latency) va o'tkazuvchanlik (throughput), ular ishlov berilayotgan so'rovlar soni orqali qanday bog'langan",
    "p50, p95 va p99 ni o'qish va o'rtacha qiymat nega aldaydi",
    "Server 100% ga yaqinlashganda kutish vaqti nega keskin oshadi",
    "Ortiqcha yukni erta rad etish va sekin ishni so'rov yo'lidan olib tashlash",
  ],
  nodes: {
    users: "Foydalanuvchilar",
    api: "Qidiruv API",
    db: "Baza",
    counter: "Hisoblagich keshi",
  },
  metrics: {
    rps: "O'tkazuvchanlik",
    p50: "Kechikish p50",
    p99: "Kechikish p99",
    errors: "Xatolar",
  },
  steps: {
    one: {
      short: "Kechikish",
      title: "Kechikish: bitta so'rov qancha davom etadi",
      body: "Foydalanuvchi «lamp» so'zini qidiradi. API bazadan so'raydi va 41 ms da javob beradi. Bu **kechikish** (latency): bitta so'rov yuborilganidan javobgacha ketgan vaqt.\n\nServer deyarli bo'sh. Trafik kam bo'lganda kechikish faqat ishning o'zi: app'da 29 ms va bazada 12 ms.",
      fields: {
        "X-Request-Id": "Bu so'rovni log qatorlariga bog'laydi, keyin uning vaqtini topish mumkin.",
        "Server-Timing": "Serverning o'z hisobi: 29 ms app kodi va 12 ms baza.",
      },
    },
    throughput: {
      short: "O'tkazuvchanlik",
      title: "O'tkazuvchanlik: soniyasiga nechta",
      body: "Endi har soniyada 200 ta so'rov keladi va API hammasiga javob beradi. Bu **o'tkazuvchanlik** (throughput). Har bir so'rov hali ham 41 ms oladi.\n\nIkkalasi bog'liq: soniyasiga 200 ta, har biri 0,041 s, demak har lahzada serverning ichida 8 ga yaqin so'rov bor. Bu Little qonuni.",
      watch: "Yuqori o'tkazuvchanlik past kechikish degani emas. Yuk mashinasi bir qatnovda ko'p olib ketadi, lekin baribir sekin.",
      fields: {
        throughput: "Soniyasiga tugallangan so'rovlar. Bu bitta so'rovning emas, butun tizimning xossasi.",
        "in flight": "Ayni damda ishlanayotgan so'rovlar: o'tkazuvchanlik × kechikish = 200 × 0,041 ≈ 8.",
      },
    },
    averages: {
      short: "O'rtacha",
      title: "O'rtacha qiymat «hammasi joyida» deydi",
      body: "Dashboard o'rtacha 62 ms ko'rsatadi. Lekin foydalanuvchilar qidiruv ba'zan ikki soniya qotib qolishidan shikoyat qiladi.\n\nBarcha so'rov vaqtlarini tartiblang va ro'yxatdagi nuqtalarga qarang: o'rtadagisi (**p50**) 41 ms, lekin har yuztadan bittasi (**p99**) 1,9 s. O'rtacha qiymat ikkalasini aralashtiradi va hech kimni tasvirlamaydi.",
      watch: "20 ta so'rovli sahifani ochgan foydalanuvchi kamida bitta p99 ga tushish ehtimoli 18%. Dum (tail) kamdan-kam emas, oddiy hol.",
      fields: {
        avg: "Bir nechta sekin so'rov uni biroz ko'taradi, lekin u baribir zararsiz ko'rinadi.",
        p50: "So'rovlarning yarmi bundan tez. Odatiy tajriba.",
        p95: "Har yigirmatadan bittasi bundan sekin.",
        p99: "Har yuztadan bittasi 1,9 s dan sekin. Soniyasiga 200 da bu har soniyada ikkita norozi so'rov.",
      },
    },
    "hot-row": {
      short: "Issiq qator",
      title: "Dum qayerdan keladi",
      body: "Sekin so'rovlarning umumiy jihati bor: har bir qidiruv o'z so'zining hisoblagichini ham oshiradi. «lamp» kabi mashhur so'z bazada bitta qator, va har bir so'rov uni yangilamoqchi.\n\nBir qatorni bir vaqtda faqat bitta tranzaksiya o'zgartira oladi, qolganlari lock'ni kutadi. Ko'pchilik so'rovlarga omad kulib boqadi, ba'zilari esa ikki soniyaga yaqin kutadi.",
      fields: {
        hits: "Har bir «lamp» qidiruvi uchun bitta umumiy qator. Soniyasiga yuzlab so'rov unga navbatga turadi.",
        "lock wait": "1,79 s boshqa tranzaksiyalarni kutish, 1 ms yangilashning o'zi.",
      },
    },
    rush: {
      short: "Tig'iz soat",
      title: "Tig'iz soat: server 93% band",
      body: "Kechqurun trafik ikki baravardan ko'proq oshib, soniyasiga 450 ga yetadi. API 440 tasini uddalaydi, yuki 93% ga chiqadi.\n\nHech bir so'rov og'irlashmadi, lekin mediana 41 dan 180 ms ga sakradi. So'rovlar endi ish boshlanishidan oldin bo'sh worker'ni navbatda kutadi.",
      fields: {
        "Server-Timing": "139 ms navbatda kutish, 41 ms haqiqiy ish. Ish o'zgarmadi, kutish o'zgardi.",
      },
    },
    knee: {
      short: "Burilish",
      title: "Nega 90% allaqachon ko'p",
      body: "Har bir mijozga 1 daqiqa sarflaydigan kassirni tasavvur qiling. U 50% band bo'lsa, taxminan 1 daqiqa kutasiz; 80% da 4 daqiqa; 90% da 9; 95% da 19. Kutish `yuk / (1 − yuk)` kabi o'sadi.\n\nShuning uchun egri chiziq uzoq vaqt tekis turadi, keyin keskin yuqoriga buriladi. 90% da ishlashga mo'ljallangan serverda to'satdan kelgan to'lqin, sekin so'rov yoki qo'shni serverning yo'qolishi uchun joy qolmaydi.",
      watch: "Quvvatni o'rtacha trafik uchun 90% da emas, eng yuqori trafik uchun taxminan 60–70% yukda rejalashtiring.",
      check: {
        q: "93% yukda ilova 3 s dan keyin voz kechib, darhol qayta urinadi. Foydali o'tkazuvchanlik nima bo'ladi?",
        options: [
          "Oshadi: urinish ko'p, muvaffaqiyat ham ko'p",
          "440 da turadi: server allaqachon to'la band",
          "Tushadi: qayta urinishlar o'sha tiqilgan navbatni to'ldiradi",
        ],
        answer: 2,
        why: "Har qayta urinish o'sha navbatdagi yangi so'rov, server esa allaqachon ketgan mijozlar uchun ham ishlayveradi. Foydali o'tkazuvchanlik soniyasiga 440 dan 380 ga tushadi, qidiruvlarning 7% i xato bilan tugaydi.",
      },
    },
    retries: {
      short: "Qayta urinish",
      title: "Mijozlar voz kechib, qayta urinadi",
      body: "Mobil ilova 3 s dan keyin kutishni to'xtatadi va o'sha qidiruvni darhol qayta yuboradi. Har bir qayta urinish — o'sha tiqilgan navbatdagi yangi so'rov.\n\nServer endi har qachongidan ko'p ishlaydi, lekin kamroq tugatadi: foydali o'tkazuvchanlik 380 ga tushadi, qidiruvlarning 7% i xato bilan tugaydi.",
      watch: "Pauzasiz qayta urinish sekin serverni o'lik serverga aylantiradi. Backoff va tasodifiy jitter qo'shing.",
      check: {
        q: "API tugata oladiganidan ko'p so'rov kelyapti. Ularning ko'pini nima tez saqlaydi?",
        options: [
          "Navbatni cheklab, ortig'iga tez `503` berish",
          "Klient timeout'ini 3 s dan 10 s ga oshirish",
          "Navbatni hammaga yetadigan qilib uzaytirish",
        ],
        answer: 0,
        why: "Ko'pi bilan 64 ta ishlanayotgan va 100 ta kutayotgan so'rovdan ortig'i darhol `Retry-After` bilan `503` oladi. Yuk 85% ga tushadi, p50 48 ms ga qaytadi, xatolar 7% dan 4% ga kamayadi.",
      },
      fields: {
        timeout: "Mijoz kutishni to'xtatdi, lekin server buni bilmaydi: ishni hech kim uchun bajarishda davom etadi.",
        "attempt 3": "Uchinchi nusxa nihoyat muvaffaqiyatli, server esa bitta ishni allaqachon uch marta qildi.",
      },
    },
    shed: {
      short: "Rad etish",
      title: "Tez «yo'q» deyish",
      body: "API endi navbatni cheklaydi: bir vaqtda ko'pi bilan 64 ta so'rov ishlanadi va 100 tasi kutadi. Undan ortig'i darhol `503` va qachon qaytish haqida ishora oladi.\n\nHamma sekin xato olgandan ko'ra, bir nechta foydalanuvchi tez «keyinroq urining» olgani yaxshi. Yuk 85% ga, mediana 48 ms ga qaytadi.",
      fields: {
        "503": "Bir millisekunddan kamroqda qaytadi. Erta rad etish arzon, kech timeout qimmat.",
        "Retry-After": "Mijoz serverni bombardimon qilish o'rniga qayta urinishdan oldin 2 s kutadi.",
      },
    },
    "off-path": {
      short: "Yo'ldan tashqari",
      title: "Sekin ishni so'rov yo'lidan olib tashlash",
      body: "Qidiruv hisoblagichi endi har bir so'rovda bazaga tegmaydi. API uni xotiradagi keshda oshiradi, daqiqada bir marta esa kichik topshiriq jami sonlarni bitta `UPDATE` bilan yozadi.\n\nLock kutish yo'q. Har bir so'rov qisqardi, shuning uchun o'sha server soniyasiga 450 tasining hammasini 48% yuk bilan ko'taradi, p99 esa 85 ms ga tushadi.",
      fields: {
        INCR: "Xotirada atomar oshirish. Soniyasiga minglab, qator lock'larisiz.",
        integer: "Yangi qiymat. Endi bu so'rov faqat sanaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Kechikish — bitta so'rovning vaqti, o'tkazuvchanlik — soniyasiga nechta so'rov tugashi. Ular ishlanayotgan so'rovlar soni orqali bog'lanadi.\n\n1) O'rtachaga emas, p95 va p99 ga qarang. 2) To'liq yukka yaqin kechikishni ish emas, kutish belgilaydi, shuning uchun zaxira qoldiring. 3) Qayta urinishga backoff, ortiqcha yukka tez `503` kerak. 4) So'rov yo'lini qisqartiring, dum ham u bilan qisqaradi.",
    },
  },
};

export default text;
