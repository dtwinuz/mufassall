import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Vertikal va gorizontal masshtablash",
  summary:
    "Lenta API o'z serveriga sig'may qoladi. Avval kattaroq serverga ko'chadi — kattarog'i qolmaguncha va o'sha bitta server yiqilguncha. Keyin bir nechta kichik serverlarga tarqaladi va buning uchun nega load balancer hamda hech narsani eslab qolmaydigan app kerakligini o'rganadi.",
  learn: [
    "Vertikal masshtablash: nega oson va qayerda to'xtaydi",
    "Nega bitta server, qanchalik katta bo'lmasin, yagona nosozlik nuqtasi",
    "Gorizontal masshtablashga nima kerak: load balancer va stateless app serverlar",
    "Nega bitta server hajmida zaxira saqlanadi (N+1)",
  ],
  nodes: {
    users: "Foydalanuvchilar",
    app: "App server 1",
    app2: "App server 2",
    app3: "App server 3",
    db: "Baza",
    lb: "Load balancer",
    sessions: "Sessiyalar ombori",
  },
  metrics: {
    rps: "Xizmat ko'rsatildi",
    p95: "Kechikish p95",
    errors: "Xatolar",
    cost: "Oylik narx",
  },
  steps: {
    "one-box": {
      short: "Bitta server",
      title: "Hammasini bitta server qiladi",
      body: "Kichik lenta API 4 vCPU li bitta serverda ishlaydi. Soniyasiga 300 so'rov, 45% band, 80 ms da javob beradi.\n\nBu to'g'ri boshlanish. Bitta mashinani deploy qilish, debug qilish va to'lash oson.",
      fields: {
        "X-Served-By": "Qaysi server javob berdi. Hozircha faqat bittasi bor.",
        "Server-Timing": "38 ms app ishi. Qolgani tarmoq.",
      },
    },
    growth: {
      short: "O'sish",
      title: "Trafik ikki baravar, server to'ldi",
      body: "Reklama kampaniyasidan keyin foydalanuvchilar soniyasiga 700 so'rov yubormoqchi. Server taxminan 600 tasini tugata oladi, 97% band, so'rovlar navbatga yig'iladi.\n\np95 1,4 s ga sakraydi, so'rovlarning 4% i rad etiladi.",
      fields: {
        "503": "Server navbati to'la, shuning uchun so'rovni rad etadi.",
        "Server-Timing": "1,2 s navbatda kutish, 41 ms ish. Ish joyida, shunchaki server yetmaydi.",
      },
    },
    "scale-up": {
      short: "Kattalashtirish",
      title: "Vertikal masshtablash: kattaroq server",
      body: "Eng oson yechim: 16 vCPU li serverga o'tish. Kod o'zgarmaydi, bitta qayta ishga tushirish. Yuk 42% ga, p95 85 ms ga qaytadi.\n\nNarx hajm bilan birga o'sadi: to'rt baravar CPU — to'rt baravar hisob.",
      watch: "Kattalashtirish odatda qayta ishga tushirishni talab qiladi. Server bitta bo'lsa, bu qayta ishga tushirish — to'xtash vaqti.",
    },
    ceiling: {
      short: "Shift",
      title: "Bundan kattasi yo'q",
      body: "Bir yildan keyin: soniyasiga 2 400 so'rov. App endi provayder sotadigan eng katta mashinada, 64 vCPU da, 88% yuk bilan ishlaydi. Bitta jarayon 64 yadroni 4 tasidek samarali ishlata olmaydi: lock'lar va umumiy xotira yutuqning katta qismini yeydi. Keyingi yilgi o'sishga joy yo'q.\n\nEng katta o'lchamlar bir CPU hisobida eng qimmati ham: bu server oyiga 2 900 turadi.",
      watch: "Vertikal masshtablash qattiq shiftga uriladi, undan oldingi oxirgi pog'onalar esa eng qimmatlari.",
    },
    crash: {
      short: "Yiqilish",
      title: "Bitta server — bitta nosozlik",
      body: "Ishdan chiqqan disk serverni to'xtatadi. Hamma foydalanuvchi bir vaqtda xato oladi: javob beradigan boshqa hech narsa yo'q.\n\nQanchalik katta bo'lmasin, bitta mashina — **yagona nosozlik nuqtasi** (single point of failure). Har bir yadro yangilanishi, deploy yoki uskuna nosozligi to'xtashga aylanadi.",
      fields: {
        "Failed to connect": "Manzil hali ham o'sha bitta o'lik serverga qaraydi.",
        "Connection refused": "Hech kim tinglamayapti. Server qaytmaguncha so'rovlarning 100% i xato.",
      },
    },
    "scale-out": {
      short: "Kengaytirish",
      title: "Gorizontal masshtablash: ko'proq server",
      body: "Bitta 64 vCPU li gigant o'rniga uchta 8 vCPU li server. Ochiq manzilni **load balancer** oladi va so'rovlarni ular orasida taqsimlaydi; har biri 62% da ishlaydi.\n\nUchta o'rtacha server va balancer oyiga 2 900 emas, taxminan 1 000 turadi. O'sish endi to'rtinchisini qo'shish degani.",
      check: {
        q: "Sessiyalar hali ham foydalanuvchi kirgan server xotirasida. Endi foydalanuvchilar nimani ko'radi?",
        options: [
          "Yangilik yo'q: cookie butun sessiyani olib yuradi",
          "Ularni qayta-qayta login sahifasiga qaytaradi",
          "Faqat birinchi so'rov odatdagidan sekinroq",
        ],
        answer: 1,
        why: "Balancer har so'rovni istalgan serverga yuboradi, boshqalar esa bu sessiya haqida hech narsa bilmaydi. Uchta so'rovdan ikkitasi «noto'g'ri» serverga tushadi: foydalanuvchi login'ga qaytariladi, savat bo'sh ko'rinadi.",
      },
      fields: {
        "X-Forwarded-For": "Foydalanuvchining haqiqiy manzili, uni balancer qo'shadi. Aks holda app balancer IP'sini ko'radi.",
        "X-Request-Id": "Bu so'rovni qaysi server ishlagan bo'lsa ham, uning log'idan topish uchun bitta ID.",
        "X-Served-By": "Bu safar `app-2` javob berdi. Keyingi so'rov istalgan serverga tushishi mumkin.",
      },
    },
    "logged-out": {
      short: "Chiqib ketish",
      title: "Foydalanuvchilar tizimdan chiqib ketaveradi",
      body: "Sessiyalar foydalanuvchi kirgan serverning xotirasida saqlangan edi. Keyingi so'rov boshqa serverga tushadi, u esa bu sessiya haqida hech narsa bilmaydi.\n\nUchta so'rovdan ikkitasi «noto'g'ri» serverga boradi: foydalanuvchi login sahifasiga qaytariladi, savat bo'sh ko'rinadi.",
      watch: "Server so'rovlar orasida o'z xotirasida saqlaydigan har qanday narsa, server bittadan ko'p bo'lishi bilan ishlamay qoladi.",
      fields: {
        Cookie: "Sessiya ID'si, faqat `app-1` da amal qiladi. Bu sir, shuning uchun bu yerda yashirilgan.",
        Location: "`app-2` sessiyani bilmaydi va login'ga yo'naltiradi.",
      },
    },
    stateless: {
      short: "Stateless",
      title: "App serverlarni stateless qilish",
      body: "Sessiyalar umumiy, tez sessiyalar omboriga ko'chadi. Har bir app server har so'rovda sessiyani o'sha yerdan o'qiydi va so'rovlar orasida hech narsa saqlamaydi.\n\nEndi istalgan server istalgan so'rovga javob bera oladi. Serverlarni foydalanuvchilar sezmagan holda qo'shish, olib tashlash yoki qayta ishga tushirish mumkin.",
      check: {
        q: "`app-2` yiqiladi. U xizmat qilgan foydalanuvchilar bilan nima bo'ladi?",
        options: [
          "Deyarli sezishmaydi: u chiqariladi, qolganlar oladi",
          "Tizimdan chiqib ketadi: sessiyalari u bilan o'ldi",
          "`app-2` qaytmaguncha har so'rov xato bo'ladi",
        ],
        answer: 0,
        why: "Health check javob olmay qoladi va `app-2` bir necha soniyada aylanmadan chiqadi. Sessiyalar umumiy omborda, shuning uchun qolgan ikkitasi uning foydalanuvchilariga javob beradi; faqat o'sha soniyalardagi so'rovlar yiqiladi, lekin ikkalasi endi 92% da.",
      },
      fields: {
        session: "Kalit — cookie'ning o'zi emas, uning hash'i.",
        user_id: "Foydalanuvchi kim. Buni istalgan server o'qiy oladi.",
        cart_items: "Avval bitta serverning xotirasida yashagan holat. Endi u istalgan server yo'qolganda ham saqlanadi.",
      },
    },
    "lose-one": {
      short: "Bittasi yiqildi",
      title: "Bitta server o'ldi, foydalanuvchilar deyarli sezmadi",
      body: "`app-2` yiqiladi. Balancer'ning health check'i javob olmay qoladi va bir necha soniyada uni aylanmadan chiqaradi. Uning trafigi qolgan ikkitasiga o'tadi.\n\nFaqat o'sha bir necha soniyadagi so'rovlar xato bo'ladi. Lekin qolgan ikkitasi endi 92% da ishlaydi: yana bitta nosozlik — va ular to'ladi.",
      watch: "**N+1** saqlang: bitta server yo'qolganda ham qolganlari taxminan 70% dan past bo'lsin. Bu yerda bu to'rtinchi server degani.",
      fields: {
        healthz: "Balancer har bir necha soniyada «tirikmisan?» deb so'raydigan kichik endpoint.",
        "no response": "Ketma-ket uchta javobsiz tekshiruv — va server o'lik hisoblanadi.",
        removed: "`app-2` yana health check'larga javob bermaguncha unga yangi so'rov yuborilmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Avval kattalashtiring: bu oddiy. Server juda qimmat, juda katta yoki yagona bo'lishi juda xavfli bo'lib qolganda — kengaytiring.\n\n1) Bitta server, qanchalik katta bo'lmasin, yagona nosozlik nuqtasi. 2) Ko'p serverlar oldida load balancer kerak. 3) App serverlar stateless bo'lishi shart: sessiya va fayllar umumiy omborlarga. 4) N+1 saqlang. 5) Baza hali ham bitta server: keyingi masshtablanadigan narsa shu.",
    },
  },
};

export default text;
