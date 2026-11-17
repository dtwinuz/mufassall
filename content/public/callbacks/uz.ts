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
    },
    "false-ok": {
      short: "Yolg'on OK",
      title: "Xato bo'lsa ham `200 OK`",
      body: "Bazaga yozish yarim yo'lda yiqildi. Kod istisnoni ushlab qoldi va baribir muvaffaqiyat qaytardi.\n\nTashqi tizim xabar yetib bordi deb hisoblaydi va qayta yubormaydi. Ma'lumot jim yo'qoladi: na log'da, na ekranda ko'rinadi.",
      watch: "Muvaffaqiyat javobi — bu va'da: «men buni saqladim». Saqlamagan bo'lsangiz, xato qaytaring, shunda yuboruvchi qayta urinadi.",
    },
    "save-first": {
      short: "Avval saqla",
      title: "Avval saqla, keyin javob ber",
      body: "API endi bitta ish qiladi: kelgan xabarni o'zgartirmasdan bazadagi **inbox** jadvaliga yozadi va darhol `200` qaytaradi.\n\nOg'ir ish keyinga qoldi. Javob vaqti millisekundlarga tushdi, xabar esa yozilgan zahoti xavfsiz.",
      watch: "Inbox'ga yozish ham yiqilishi mumkin. Unda `5xx` qaytaring: yuboruvchi qayta yuboradi va hech narsa yo'qolmaydi.",
    },
    queue: {
      short: "Navbat",
      title: "Og'ir ish navbatga",
      body: "Xabar saqlangach, API navbatga qisqa topshiriq qo'yadi. Worker uni oladi, ishni bajaradi va natijani bazaga yozadi.\n\nAPI va worker endi bir-birini kutmaydi. Callback'lar ko'paysa navbat uzayadi, lekin javob vaqti o'zgarmaydi.",
    },
    "early-ack": {
      short: "Erta ack",
      title: "Ack juda erta berildi",
      body: "Worker xabarni olishi bilan navbatga «qabul qildim» (`ack`) deydi va keyin ishlay boshlaydi. Ish o'rtasida worker yiqildi.\n\nNavbat xabarni allaqachon o'chirgan, worker esa ishni tugatmagan. Xabar yo'qoldi.",
      watch: "`autoAck` qulay ko'rinadi, lekin u «yetkazildi» degani, «bajarildi» emas.",
    },
    "ack-after": {
      short: "Keyin ack",
      title: "Ack — faqat ish tugagach",
      body: "Worker ack'ni natija bazaga yozilgandan keyin beradi. Worker yiqilsa, navbat xabarni **qayta yetkazadi**.\n\nYo'qotish nolga tushdi. Lekin endi bitta xabar ba'zan ikki marta keladi.",
      watch: "Har qanday «kamida bir marta» (at-least-once) tizim takroriy xabar beradi. Takrorni yo'q qilib bo'lmaydi, uni faqat to'g'ri ishlash mumkin.",
    },
    duplicates: {
      short: "Takror",
      title: "Bitta xabar, ikki natija",
      body: "Takror ikki joydan keladi: tashqi tizim timeout'dan keyin qayta yuboradi, navbat esa worker yiqilgach qayta yetkazadi.\n\nIdempotent bo'lmagan ish ikki marta bajariladi: hujjat ikki marta yaratiladi, balans ikki marta to'ldiriladi.",
      watch: "Pul va hujjat bilan ishlaydigan har bir amal takrorlanganda ham bir xil natija berishi shart.",
    },
    idempotency: {
      short: "Idempotentlik",
      title: "Idempotentlik kaliti",
      body: "Har xabarning barqaror kaliti bor, masalan hujjat ID va holat. Worker ishlashdan oldin kalitni tekshiradi: ishlangan bo'lsa, faqat ack beradi.\n\nKalit bazada **unique** cheklov bilan saqlanadi. Ikki worker bir vaqtda ishlasa ham, faqat bittasi yozadi.",
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Ishonchli callback uchun to'rt qoida.\n\n1) `200` faqat xabar saqlangandan keyin. 2) Og'ir ish navbat va worker'da. 3) Ack — ish tugagach. 4) Har ish idempotent: takror kelsa ham natija bitta.",
    },
  },
};

export default text;
