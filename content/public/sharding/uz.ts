import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Sharding",
  summary:
    "Chat servisining xabarlar jadvali 6 TB ga yetadi va bitta server uni ko'tara olmaydi. Uni shard'larga bo'lamiz, shard kalitini tanlaymiz, qizib ketgan shard va qizib ketgan kalitga duch kelamiz va hamma narsani ko'chirmasdan to'rtinchi shard qo'shamiz.",
  learn: [
    "Oraliq (range) va hash bo'yicha sharding farqi, nega vaqt oralig'i qizigan shard yaratadi",
    "Shard kalitini qanday tanlash: eng ko'p ishlatiladigan so'rov hal qiladi",
    "Bir nechta shard'ga ketadigan so'rov narxi va qizigan kalitni qanday bo'lish",
    "Nega `hash % n` qayta shard'lashni og'riqli qiladi va qat'iy slotlar buni qanday tuzatadi",
  ],
  nodes: {
    app: "Chat ilovasi",
    api: "Chat API",
    db: "Xabarlar bazasi",
    "shard-0": "Shard 0",
    "shard-1": "Shard 1",
    "shard-2": "Shard 2",
    "shard-3": "Shard 3",
    mover: "Ma'lumot ko'chiruvchi",
  },
  metrics: {
    p95: "So'rov p95",
    hottest: "Eng qizigan shard yuki",
    fanout: "Bir so'rovdagi shard'lar",
    disk: "Eng katta shard",
  },
  steps: {
    "one-db": {
      short: "Bitta baza",
      title: "Bitta server, 6 TB xabar",
      body: "Har chat xabari bitta `messages` jadvaliga yoziladi. Unda endi 6 TB bor, server soniyasiga 20 000 yozuvni 98% yuk bilan qabul qilmoqda.\n\nKattaroq server yillar emas, oylar beradi. Indekslar xotiraga sig'maydi, backup bir kun oladi, eng qizg'in paytda bitta yozuv soniyadan oshadi.",
      fields: {
        chat_id: "Xabar tegishli chat. Deyarli har so'rov shu bo'yicha filtrlaydi.",
        Time: "Bitta xabarni yozish uchun 1,4 soniya. So'rov emas, server joyi tugagan.",
      },
    },
    range: {
      short: "Oraliq",
      title: "Sana oralig'i bo'yicha bo'lish",
      body: "Jadvalni uchta shard'ga — har biri alohida baza — bo'lamiz: 2024 shard 0 da, 2025 shard 1 da, 2026 shard 2 da. API kichik shard xaritasini o'qiydi va har so'rovni kerakli shard'ga yuboradi.\n\nHar shard'da taxminan 2 TB, tarix so'rovlari tez. Lekin yukka qarang: deyarli butun trafik allaqachon shard 2 ga ketmoqda.",
      fields: {
        created_at: "Shard kaliti: qator qaysi shard'da turishini hal qiladigan qiymat.",
        ranges: "Shard xaritasi: har kalit oralig'i bitta shard'ga tegishli.",
      },
    },
    hot: {
      short: "Qizigan shard",
      title: "Har yangi xabar bitta shard'ga uriladi",
      body: "Yangi xabarlarning hammasi bugungi, shuning uchun har yozuv shard 2 ga tushadi. Odamlar asosan yaqindagi chatlarni o'qiydi, o'qishlar ham o'sha yerga boradi.\n\nShard 2 100% da va timeout beradi, shard 0 va 1 esa deyarli bo'sh. Bizda uchta server, quvvati esa bittaniki.",
      watch: "Vaqt bilan o'sadigan shard kaliti (sana, auto-increment id) barcha yangi yozuvlarni oxirgi shard'ga yuboradi.",
      fields: {
        "statement timeout": "Yozuv juda uzoq kutdi va bekor qilindi. Foydalanuvchining xabari ketmadi.",
        cpu: "Bitta shard 100% da, qolganlari 10% dan past. Yuk umuman bo'linmagan.",
      },
    },
    hash: {
      short: "Hash",
      title: "chat_id hash'i bo'yicha shard'lash",
      body: "Yangi shard kaliti — `chat_id`, shard esa `hash(chat_id) % 3`. Yaxshi hash chatlarni teng sochadi, yangi va eski chatlar uchala shard'da aralash turadi.\n\nBitta chatning barcha xabarlari bitta shard'da, shuning uchun «c_8812 chatini och» bitta serverga tegadi. Yuk hamma joyda 33–35%, p95 22 ms.",
      fields: {
        chat_id: "Kalit eng ko'p uchraydigan so'rovga mos: bitta chatning xabarlari.",
        hash: "Bir-biriga yaqin id'larni uzoq sonlarga aylantiradi, qo'shnilar bitta shard'ga yig'ilmaydi.",
        "shard-2": "Qoldiq shard'ni tanlaydi. API buni har so'rovda hisoblaydi.",
      },
    },
    cross: {
      short: "Shard'lararo",
      title: "Shard kalitisiz so'rov hamma shard'dan so'raydi",
      body: "Yangi funksiya: «men yuborgan barcha xabarlar». So'rov `chat_id` emas, `sender_id` bo'yicha filtrlaydi, API ular qaysi shard'da ekanini bilmaydi. U uchalasidan so'raydi, hamma javobni kutadi va birlashtiradi.\n\nSo'rov eng sekin shard qadar sekin: 615 ms. 30 ta shard bo'lsa, har so'rov 30 ta serverga borardi.",
      watch: "Shard'lararo so'rov kam bo'lsa — normal. Ko'payib ketsa, unga mos kalitli alohida nusxa quring.",
      fields: {
        sender_id: "Shard kaliti emas. Bu foydalanuvchining xabarlari istalgan shard'da bo'lishi mumkin.",
        merge: "Uchta shard'dan 60 qator, eng yangi 20 tasini qoldirish uchun qayta saralanadi.",
        total: "Eng sekini — shard 2 belgilaydi. Fan-out barcha shard'lar ichidagi eng yomon kechikishni oladi.",
      },
    },
    celebrity: {
      short: "Qizigan kalit",
      title: "Bitta ulkan kanal bitta shard'ni qizdiradi",
      body: "2 million a'zoli ochiq `c_1` kanali mashhur bo'lib ketadi. Uning barcha xabarlari, reaksiyalari va o'qishlari `c_1` turgan shard'ga — shard 1 ga boradi.\n\nHash chatlarni sochadi, bitta chat ichidagi trafikni emas. Bitta kalit tufayli shard 1 yana 95% da.",
      fields: {
        "top keys": "Shard'ning eng band kalitlari. Taxmin qilishdan oldin buni o'lchang.",
        c_1: "Bu shard yozuvlarining 41% i bitta chatdan.",
      },
    },
    "split-key": {
      short: "Kalitni bo'lish",
      title: "Qizigan chatni bucket'larga bo'lish",
      body: "Qizigan deb belgilangan chatlar uchun kalit `(chat_id, bucket)` bo'ladi, bucket esa `msg_id % 8`. `c_1` ning sakkizta bucket'i turli shard'larga tushadi va uning yozuvlari hammasiga taqsimlanadi.\n\nNarxi: `c_1` ning oxirgi xabarlarini o'qish endi har shard'dan so'raydi va birlashtiradi. Bir nechta qizigan chat uchun bu maqbul, hammasi uchun emas.",
      fields: {
        "hot chat": "Bucket faqat bir nechta chatga beriladi. Oddiy chatlar bitta shard'da qoladi.",
        bucket: "Kalitning bir qismi. `c_1` ning 5-bucket'i shard 0 ga, qolganlari boshqa joyga tushadi.",
      },
    },
    "add-shard": {
      short: "Shard qo'shish",
      title: "To'rtinchi shard, `% 4` esa qatorlarning 75% ini ko'chiradi",
      body: "Shard'lar 2,6 TB gacha o'sdi, shard 3 ni qo'shamiz. Lekin yo'naltirish `hash % 3`. Uni `% 4` ga almashtirish har to'rt qatordan uchtasining javobini o'zgartiradi.\n\nKo'chiruvchi trafik to'xtamagan holda 5,2 milliard qatorni nusxalashi kerak. Band shard'lar sekinlashadi, ish esa to'qqiz kun davom etardi.",
      watch: "`hash % n` da `n` ning har o'zgarishi deyarli butun ma'lumotni ko'chiradi.",
      fields: {
        "rows that move": "Qator faqat `hash % 3` va `hash % 4` teng bo'lsa joyida qoladi: to'rttadan bittasi.",
        eta: "Yuk ostida to'qqiz kunlik nusxalash, bir vaqtda ikkita yo'naltirish xaritasi bilan.",
      },
    },
    slots: {
      short: "Slotlar",
      title: "Qat'iy slotlar: faqat yangi shard oladiganini ko'chir",
      body: "Ikki bosqichda yo'naltiramiz: `hash % 1024` slotni tanlaydi, kichik xarita esa har slotni shard'ga biriktiradi. Slotlar soni hech qachon o'zgarmaydi, faqat xarita o'zgaradi.\n\nShard 3 256 ta slotni — ma'lumotning choragini oladi. Har slot alohida ko'chadi: qatorlari nusxalanadi, yangi yozuvlar yetkaziladi, xaritada bitta yozuv almashtiriladi. Qatorlarning faqat 25% i ko'chadi, tizimning qolgan qismi buni sezmaydi.",
      fields: {
        slot: "Kalitlarning qat'iy bo'lagi. Shard'lar orasida ko'chadigan birlik.",
        "catch up": "Nusxalash paytida kelgan yozuvlar almashtirishdan oldin qo'llanadi.",
        switch: "Xarita versiyasi o'zgaradi va API shu slot so'rovlarini shard 3 ga yuboradi.",
        slots: "1024 dan 256 tasi: shard 3 o'z chorak ulushini oldi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Sharding bitta serverga sig'may qolgan jadvalni bir nechta serverga taqsimlaydi. Hammasi shard kalitiga bog'liq.\n\n1) Eng ko'p so'rov filtrlaydigan kalitni tanlang. 2) Vaqt bilan o'sadigan kalitlardan qoching: ularni hash qiling. 3) Kalitsiz so'rov hamma shard'ga tarqaladi; ularni kam saqlang. 4) Qizigan kalitlarni kuzating va bo'ling. 5) Qat'iy slotlar orqali yo'naltiring, shunda shard qo'shish faqat uning ulushini ko'chiradi.",
    },
  },
};

export default text;
