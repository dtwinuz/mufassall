import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Callback'lar ishonchliligi",
  summary:
    "Tashqi tizim sizga xabar yuboradi. Xabar yo'qolmasligi, ikki marta ishlanmasligi va tizimni sekinlashtirmasligi uchun nima qilish kerak.",
  learn: [
    "Nega `200 OK` faqat saqlagandan keyin qaytariladi",
    "Navbat va worker javobni og'ir ishdan qanday ajratadi",
    "Ack qachon beriladi: ishdan oldin yoki keyin",
    "Takroriy yetkazish va idempotentlik kaliti",
  ],
  nodes: {
    provider: "Tashqi tizim",
    api: "API",
    store: "Baza",
    queue: "Navbat",
    worker: "Worker",
  },
  metrics: {
    incoming: "Kiruvchi",
    p95: "Javob p95",
    lost: "Yo'qolgan",
    dupes: "Ikki marta",
  },
  steps: {
    sync: {
      short: "Sinxron",
      title: "Hamma ish javobdan oldin",
      body: "Tashqi tizim callback yuboradi. API hujjatni tekshiradi, bazaga yozadi va faqat shundan keyin javob beradi.\n\nIsh og'ir bo'lsa, javob soniyalab kechikadi. Yuboruvchi tomonning esa o'z timeout'i bor.",
      watch: "Callback yuboruvchi sizning ishingiz tugashini cheksiz kutmaydi. Timeout bo'lsa, u qayta yuboradi yoki voz kechadi.",
      fields: {
        "X-Signature": "Yuboruvchi tanani imzolaydi: haqiqiy callback'ni soxtasidan ajratish uchun. Bu sir, shuning uchun bu yerda yashirilgan.",
        event_id: "Yuboruvchining shu hodisa uchun o'z ID'si. Har qayta yuborishda bir xil qoladi, bu keyin kerak bo'ladi.",
        "X-Response-Time": "Deyarli to'rt soniya. Yuboruvchi uch soniyada voz kechsa, u callback'ni allaqachon qayta yuborgan.",
      },
    },
    "false-ok": {
      short: "Yolg'on OK",
      title: "Xato bo'lsa ham `200 OK`",
      body: "Bazaga yozish yarim yo'lda yiqildi. Kod istisnoni ushlab qoldi va baribir muvaffaqiyat qaytardi.\n\nTashqi tizim xabar yetib bordi deb hisoblaydi va qayta yubormaydi. Ma'lumot jim yo'qoladi: na log'da, na ekranda ko'rinadi.",
      watch: "Muvaffaqiyat javobi — bu va'da: «men buni saqladim». Saqlamagan bo'lsangiz, xato qaytaring, shunda yuboruvchi qayta urinadi.",
      check: {
        q: "`200` «saqlandi» degani bo'lishi kerak, lekin to'liq ish 4 s ga yaqin. Javobni ham halol, ham tez nima qiladi?",
        options: [
          "Yuboruvchidan timeout'ni 10 s ga oshirishni so'rash",
          "Darhol `200` qaytarib, fonda saqlash",
          "Xom xabarni inbox jadvaliga yozib, keyin javob berish",
        ],
        answer: 2,
        why: "API xabarni kelgan holicha `inbox` jadvaliga yozadi va shundan keyin `200` qaytaradi. Javob soniyalardan 45 ms atrofiga tushadi, hech narsa yo'qolmaydi: xabar javobdan oldin saqlangan.",
      },
      fields: {
        ERROR: "Baza yozuvni rad etdi. Bu `5xx` javobiga aylanishi kerak edi.",
        ROLLBACK: "Hech narsa saqlanmadi. Yuboruvchi esa baribir `200 OK` oldi.",
      },
    },
    "save-first": {
      short: "Avval saqla",
      title: "Avval saqla, keyin javob ber",
      body: "API endi bitta ish qiladi: kelgan xabarni o'zgartirmasdan bazadagi **inbox** jadvaliga yozadi va darhol `200` qaytaradi.\n\nOg'ir ish keyinga qoldi. Javob vaqti millisekundlarga tushdi, xabar esa yozilgan zahoti xavfsiz.",
      watch: "Inbox'ga yozish ham yiqilishi mumkin. Unda `5xx` qaytaring: yuboruvchi qayta yuboradi va hech narsa yo'qolmaydi.",
      fields: {
        inbox: "Kelgan xabarlarning oddiy jadvali. Tekshiruv ham, join ham yo'q: yozish tez va kam yiqiladi.",
        payload: "Tana qanday kelgan bo'lsa shunday. Ishni keyin yuboruvchidan so'ramasdan qayta bajarish mumkin.",
        "INSERT 0 1": "Bitta qator yozildi. API faqat endi `200` qaytaradi.",
      },
    },
    queue: {
      short: "Navbat",
      title: "Og'ir ish navbatga",
      body: "Xabar saqlangach, API navbatga qisqa topshiriq qo'yadi. Worker uni oladi, ishni bajaradi va natijani bazaga yozadi.\n\nAPI va worker endi bir-birini kutmaydi. Callback'lar ko'paysa navbat uzayadi, lekin javob vaqti o'zgarmaydi.",
      fields: {
        delivery_mode: "`2` — doimiy: navbat topshiriqni diskda saqlaydi, qayta ishga tushganda ham yo'qolmaydi.",
        event_id: "Topshiriqda faqat kalit bor. To'liq xabar allaqachon inbox'da.",
      },
    },
    "early-ack": {
      short: "Erta ack",
      title: "Ack juda erta berildi",
      body: "Worker xabarni olishi bilan navbatga «qabul qildim» (`ack`) deydi va keyin ishlay boshlaydi. Ish o'rtasida worker yiqildi.\n\nNavbat xabarni allaqachon o'chirgan, worker esa ishni tugatmagan. Xabar yo'qoldi.",
      watch: "`autoAck` qulay ko'rinadi, lekin u «yetkazildi» degani, «bajarildi» emas.",
      check: {
        q: "Worker endi ack'ni faqat natija yozilgandan keyin beradi. Nima o'zgaradi?",
        options: [
          "Hech narsa yo'qolmaydi va ikki marta ishlanmaydi",
          "Hech narsa yo'qolmaydi, lekin ba'zi xabarlar ikki marta keladi",
          "Navbat sekin ack'larni kutib qotib qoladi",
        ],
        answer: 1,
        why: "Worker yiqilsa, navbat xabarni qayta yetkazadi, yo'qotish nolga tushadi. Lekin qisman ishlangan xabar yana keladi: daqiqasiga 4 ga yaqin takror.",
      },
      fields: {
        auto_ack: "Navbat xabarni jo'natgan zahoti uni ishlangan deb hisoblaydi, worker hali hech narsa qilmagan.",
      },
    },
    "ack-after": {
      short: "Keyin ack",
      title: "Ack — faqat ish tugagach",
      body: "Worker ack'ni natija bazaga yozilgandan keyin beradi. Worker yiqilsa, navbat xabarni **qayta yetkazadi**.\n\nYo'qotish nolga tushdi. Lekin endi bitta xabar ba'zan ikki marta keladi.",
      watch: "Har qanday «kamida bir marta» (at-least-once) tizim takroriy xabar beradi. Takrorni yo'q qilib bo'lmaydi, uni faqat to'g'ri ishlash mumkin.",
      fields: {
        redelivered: "Navbat bu xabarni oldin ham yuborganini aytadi. Ishning bir qismi allaqachon bajarilgan bo'lishi mumkin.",
        ACK: "Natija bazaga yozilgandan keyingina yuboriladi. Ungacha navbat xabarni saqlab turadi.",
      },
    },
    duplicates: {
      short: "Takror",
      title: "Bitta xabar, ikki natija",
      body: "Takror ikki joydan keladi: tashqi tizim timeout'dan keyin qayta yuboradi, navbat esa worker yiqilgach qayta yetkazadi.\n\nIdempotent bo'lmagan ish ikki marta bajariladi: hujjat ikki marta yaratiladi, balans ikki marta to'ldiriladi.",
      watch: "Pul va hujjat bilan ishlaydigan har bir amal takrorlanganda ham bir xil natija berishi shart.",
      fields: {
        "X-Retry-Count": "Yuboruvchining ikkinchi urinishi: u birinchi javobni ko'rmagan.",
        event_id: "Birinchi safardagi ID'ning o'zi. Takrorni shu orqali tanib olish mumkin.",
      },
    },
    idempotency: {
      short: "Idempotentlik",
      title: "Idempotentlik kaliti",
      body: "Har xabarning barqaror kaliti bor, masalan hujjat ID va holat. Worker ishlashdan oldin kalitni tekshiradi: ishlangan bo'lsa, faqat ack beradi.\n\nKalit bazada **unique** cheklov bilan saqlanadi. Ikki worker bir vaqtda ishlasa ham, faqat bittasi yozadi.",
      fields: {
        "ON CONFLICT": "Kalit allaqachon bor bo'lsa, baza xato bermaydi, yozuvni shunchaki o'tkazib yuboradi.",
        "INSERT 0 0": "Nol qator: bu hodisa avval ishlangan. Worker ack beradi va keyingisiga o'tadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Ishonchli callback uchun to'rt qoida.\n\n1) `200` faqat xabar saqlangandan keyin. 2) Og'ir ish navbat va worker'da. 3) Ack — ish tugagach. 4) Har ish idempotent: takror kelsa ham natija bitta.",
    },
  },
  scenarios: {
    slow: {
      label: "Javob 30 s",
      steps: {
        "slow-db": {
          short: "Sekin baza",
          title: "Inbox'ga yozish 30 soniya oladi",
          body: "Bazada og'ir hisobot ishlayapti, har yozuv qulfni kutadi. Odatda bir necha millisekund oladigan inbox yozuvi endi 30 soniya davom etadi.\n\nCallback — sinxron chaqiruv: yuboruvchi ulanishni ushlab, `200` ni shu chiziqda kutadi. U allaqachon voz kechgan.",
          watch: "Javob baribir keladi. Faqat uni endi hech kim kutmayapti.",
          fields: {
            "X-Response-Time": "30 soniya. Yuboruvchining timeout'i 3 soniya, uning uchun bu yetkazish muvaffaqiyatsiz.",
          },
        },
        "slow-retry": {
          short: "Qayta urinish",
          title: "Timeout'lar qayta yuborishga aylanadi",
          body: "Yuboruvchi uchun har timeout — yetkazilmagan xabar, shuning uchun u o'sha callback'ni qayta yuboradi. Har urinish ham 30 soniya kutadi va yana timeout bo'ladi.\n\nBitta hodisa endi uch marta keladi, ortiqcha trafik esa sekin bazani yanada sekinlashtiradi.",
          fields: {
            "X-Retry-Count": "Uchinchi urinish. Oldingi ikkitasi saqlangan, lekin ularning `200` javobi kech qolgan.",
            event_id: "Har safar bir xil ID. Idempotentlik bo'lmasa, har nusxa alohida topshiriqqa aylanadi.",
          },
        },
        "slow-end": {
          short: "Natija",
          title: "Natija: hech narsa yo'qolmadi, ish uch barobar",
          body: "Hech narsa yo'qolmadi: har nusxa saqlangan. Lekin navbat nusxalar bilan to'ladi, worker bitta ishni uch martagacha bajaradi — daqiqasiga 36 ga yaqin.\n\nOdatdagi yo'l bilan solishtiring: tez `200` faqat tezlik uchun emas. Aynan u yuboruvchini qayta yuborishdan to'xtatadi.",
        },
      },
    },
    lost: {
      label: "Callback yo'qoldi",
      steps: {
        gone: {
          short: "Yo'qoldi",
          title: "Callback yetib kelmaydi",
          body: "Yuboruvchi bilan sizning orangizdagi tarmoq nosozligi ba'zi callback'larni yo'lda yo'qotadi. Yuboruvchi javob olmadi va bir necha urinishdan keyin voz kechdi.\n\nSizning tomonda hech narsa bo'lmadi: na xato, na log qatori. `doc_5521` hujjati abadiy kutish holatida qoladi.",
          watch: "Kelmagan callback'ni ko'rib bo'lmaydi. Uni faqat manba bilan muntazam solishtirish topadi.",
          fields: {
            event_id: "Bu hodisa API'ga yetmadi. Sizning tomonda uning ID'sini hech kim bilmaydi.",
          },
        },
        "gone-poll": {
          short: "Solishtirish",
          title: "Solishtirish: kutayotganlar haqida o'zing so'ra",
          body: "Har bir necha daqiqada API uzoq kutib qolgan hujjatlarni oladi va ularning holatini yuboruvchidan o'zi so'raydi.\n\nBu teskari yo'nalishdagi sinxron chaqiruv: API kutadi, holat shu chiziqda qaytadi. Yo'qolgan callback'lar endi yo'qolmaydi, faqat kechikadi.",
          fields: {
            Authorization: "Yuboruvchi API'si uchun sizning kalitingiz. Bu sir, shuning uchun yashirilgan.",
            status: "Haqiqiy holat. API uni callback kelgandek yozib qo'yadi.",
            updated_at: "Holat yuboruvchida qachon o'zgargani. Yo'qolgan callback ham shuni aytgan bo'lardi.",
          },
        },
        "gone-end": {
          short: "Natija",
          title: "Natija: kech va ba'zan ikki marta",
          body: "Tarmoq tiklanadi va kechikkan callback nihoyat keladi — solishtirish holatni allaqachon yozib bo'lgach. Bitta hodisa endi ikki tomondan keladi, daqiqasiga 2 martaga yaqin.\n\nSolishtirishning narxi: yuboruvchiga qo'shimcha so'rovlar va takrorlar. Shuning uchun ishlov idempotent bo'lishi shart.",
        },
      },
    },
  },
};

export default text;
