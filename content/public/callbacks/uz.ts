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
      body: "Tashqi tizim callback yuboradi. API hujjatni tekshiradi, bazaga yozadi va faqat shundan keyin javob beradi.\n\nIsh og'ir bo'lsa, javob sekundlab kechikadi. Yuboruvchi tomonning esa o'z timeout'i bor.",
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
};

export default text;
