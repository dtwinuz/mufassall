import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Consistent hashing",
  summary:
    "Profil API tez-tez so'raladigan ma'lumotni uchta kesh serverda saqlaydi. To'rtinchisini qo'shish yordam berishi kerak edi, lekin `hash % N` bilan u deyarli butun keshni bo'shatadi. Hash ring qanday qilib kalitlarning faqat choragini ko'chiradi va unga nega virtual node'lar kerak.",
  learn: [
    "Nega `hash % N` da N o'zgarsa deyarli har bir kalit boshqa joyga ketadi",
    "Hash ring node'ni qanday tanlaydi: soat strelkasi bo'yicha keyingi nuqta",
    "Nega node qo'shilganda yoki chiqqanda kalitlarning faqat ~1/N qismi ko'chadi",
    "Virtual node'lar nimani tuzatadi: notekis yoylar va o'lgan node yuki",
  ],
  nodes: {
    client: "Ilova",
    api: "Profil API",
    "cache-a": "Kesh A",
    "cache-b": "Kesh B",
    "cache-c": "Kesh C",
    "cache-d": "Kesh D",
    db: "Foydalanuvchilar bazasi",
  },
  metrics: {
    hit: "Keshdan topildi (hit)",
    "db-reads": "Bazadan o'qish",
    moved: "Ko'chgan kalitlar",
  },
  steps: {
    modulo: {
      short: "hash % 3",
      title: "Uchta kesh, bitta qoida: `hash % 3`",
      body: "API soniyasiga 5 000 ga yaqin profil o'qiydi. Har bir kalit uchta keshdan biriga tushadi: kalitning hash'ini olamiz, 3 ga bo'lamiz, qoldiq kesh raqami bo'ladi.\n\nO'qishlarning 95% i keshdan topiladi (cache hit). Bazaga soniyasiga atigi 250 ta so'rov boradi.",
      check: {
        q: "To'rtinchi kesh qo'shildi va qoida `hash % 4` bo'ldi. Hit rate nima bo'ladi?",
        options: [
          "O'sadi: ko'proq xotira ko'proq kalit sig'diradi",
          "~24% gacha tushadi: kalitlarning ko'pi ko'chadi",
          "Chorakka kamayadi: faqat D kesh bo'sh",
        ],
        answer: 1,
        why: "3 → 4 node'da faqat to'rtta kalitdan bittasi qoldig'ini saqlaydi, shuning uchun o'qishlarning to'rtdan uch qismi endi noto'g'ri keshga qaraydi. Hit rate 95% dan 24% ga tushadi.",
      },
      fields: {
        GET: "`hash(\"user:u_42\") = 2718281827`, `2718281827 % 3 = 1`, demak kalit B keshda turadi.",
        u_42: "Kalit ichidagi foydalanuvchi ID'si. Har bir API server unga bir xil keshni hisoblaydi, jadvalga qaramasdan.",
      },
    },
    "add-node": {
      short: "+1 kesh",
      title: "To'rtinchi kesh qolgan uchtasini bo'shatadi",
      body: "Xotira yetmayapti, to'rtinchi kesh qo'shildi va qoida `hash % 4` bo'ldi. O'sha kalit endi `2718281827 % 4 = 3` beradi: D kesh, u esa bo'sh.\n\nBu deyarli har bir kalit bilan sodir bo'ladi: 3 → 4 node'da faqat to'rtta kalitdan bittasi qoldig'ini saqlaydi. Keshning to'rtdan uch qismi birdan noto'g'ri joyda qoladi.",
      watch: "Eski ma'lumot A, B va C da hali turibdi. Lekin uni u yerdan endi hech kim so'ramaydi.",
      fields: {
        GET: "O'sha kalit, o'sha hash, yangi bo'luvchi. Javob endi D keshni ko'rsatadi.",
        nil: "Miss: keshda yo'q. Endi API bu kalit uchun bazaga borishi kerak.",
      },
    },
    "db-flood": {
      short: "Baza to'ldi",
      title: "Har bir miss bazaga tushadi",
      body: "Hit rate 95% dan 24% ga tushdi. Baza soniyasiga 250 o'qishdan 3 800 ga chiqdi, vaholanki u bir necha yuz so'rovga mo'ljallangan.\n\nSo'rovlar navbatga tiziladi, oddiy o'qish 410 ms oladi, API timeout bo'ladi. Kesh qo'shish yangi keshlar to'lgunicha tizimni sekinlashtirdi.",
      watch: "Baza tayanadigan keshni birdaniga bo'shatib bo'lmaydi.",
      fields: {
        users: "Kesh ortidagi jadval. Uning odatiy yuki — 5% miss'lar.",
        "410 ms": "Odatda ~2 ms. Baza vaqtini o'qishga emas, navbatda kutishga sarflayapti.",
      },
    },
    ring: {
      short: "Hash ring",
      title: "Kalitlarni ham, node'larni ham bitta halqaga qo'yamiz",
      body: "Uchta keshga qaytamiz va qoidani o'zgartiramiz. Har bir kesh nomining hash'i 2³² pozitsiyali aylanadagi nuqta bo'ladi. Har bir kalitning hash'i ham shu aylanadagi nuqta.\n\nKalit o'zidan soat strelkasi bo'yicha birinchi uchragan keshga tegishli. N ga bo'lish yo'q: node'lar soni formulada umuman qatnashmaydi.",
      fields: {
        "0x5A3C11F0": "`user:u_42` halqada qayerda turadi: kalitning 32 bitli hash'i.",
        clockwise: "Kalitdan keyingi node nuqtasi. Bu yerda `0x66600000` dagi B kesh.",
      },
    },
    "add-on-ring": {
      short: "+1 halqada",
      title: "Endi yangi node faqat bitta yoyni oladi",
      body: "D kesh `0x4CC00000` nuqtaga qo'shildi. U oldingi nuqta (A kesh) bilan o'zi orasidagi kalitlarni oladi. Bu kalitlar avval B keshga tegishli edi. Qolgan hamma narsa joyida qoladi.\n\nKalitlarning faqat 25% i ko'chadi, N = 4 da taxminan 1/N. Hit rate 71% gacha tushadi va qulash o'rniga bir necha daqiqada tiklanadi.",
      fields: {
        takes: "Egasi o'zgaradigan yagona yoy: A nuqtasidan D nuqtasigacha. U avval B yoyining bir qismi edi.",
        "moved keys": "To'rtdan uch emas, to'rtdan bir. Umuman olganda yangi node taxminan 1/N oladi.",
        stays: "`u_42` kaliti D nuqtasidan keyin turadi, shuning uchun hali ham B keshga boradi va hit beradi.",
      },
    },
    uneven: {
      short: "Notekis",
      title: "To'rtta nuqta halqani teng bo'lmagan yoylarga bo'ladi",
      body: "Har bir keshda bitta nuqta bo'lsa, yoylar hash'lar kabi tasodifiy chiqadi. Bu yerda C kesh halqaning 45% iga, B esa atigi 10% iga ega.\n\nC 92% yuk bilan ishlaydi va sekinlasha boshlaydi, B esa deyarli bo'sh turadi. Bitta qizigan node butun klasterni cheklaydi.",
      watch: "Node'lar kam bo'lsa, \"har biriga bitta nuqta\" halqani hech qachon teng taqsimlamaydi.",
      fields: {
        keys: "C keshda 1,8 million kalit, B keshdagidan taxminan 4 barobar ko'p.",
      },
    },
    vnodes: {
      short: "Vnode'lar",
      title: "Virtual node'lar: har bir keshga ko'p kichik nuqta",
      body: "Endi har bir keshga halqada 128 ta nuqta beriladi (`cache-a#0` … `cache-a#127`), har biri o'z hash'idan. 512 ta kichik yoy o'rtachalashadi: har bir kesh 25% ga juda yaqin qismga ega bo'ladi.\n\nQidiruv o'sha-o'sha: soat strelkasi bo'yicha keyingi nuqta, keyin shu nuqta egasi bo'lgan kesh. Kuchliroq keshga shunchaki ko'proq nuqta berish mumkin.",
      check: {
        q: "Har keshda 128 ta nuqta bor va B kesh o'ldi. Uning kalitlari qayerga ketadi?",
        options: [
          "Hammasi B dan soat strelkasi bo'yicha keyingi keshga",
          "Hech qayerga: B qaytguncha miss bo'ladi",
          "A, C va D ga deyarli teng",
        ],
        answer: 2,
        why: "B ning 128 ta kichik yoyi soat strelkasi bo'yicha keyingi nuqtalarga o'tadi, bu nuqtalar esa A, C va D ga deyarli teng tegishli. Kalitlarning ~25% i ko'chadi, har tirik node B yukining uchdan birini oladi.",
      },
      fields: {
        vnodes: "Virtual node'lar: halqadagi, hammasi bitta haqiqiy serverga olib boradigan nuqtalar.",
        "cache-c#17": "C keshning 17-nuqtasi. Turli keshlarning nuqtalari butun halqa bo'ylab aralashib turadi.",
        share: "Har bir kesh halqaning qancha qismiga ega. Deyarli teng, demak yuk ham deyarli teng.",
      },
    },
    "node-dies": {
      short: "Node o'ldi",
      title: "Kesh o'lsa, uning kalitlari tarqaladi",
      body: "B kesh javob bermay qo'ydi va API uni halqadan olib tashladi. Uning 128 ta kichik yoyi soat strelkasi bo'yicha keyingi nuqtalarga o'tadi, bu nuqtalar esa A, C va D ga deyarli teng taqsimlangan.\n\nYana kalitlarning atigi ~25% i ko'chadi va ularning hammasini bitta tirik node olmaydi. Virtual node'larsiz butun yoy bitta qo'shniga tushardi.",
      watch: "Barcha API serverlar bir xil node ro'yxatini ko'rishi shart, aks holda bitta kalitni turli keshlarga yuborishadi.",
      fields: {
        unreachable: "API B keshdan javob olmay qoldi va uni o'zidagi halqa nusxasidan olib tashladi.",
        arcs: "B ning kichik yoylari tiriklar orasida bo'linadi, har biriga B yukining uchdan biri tushadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "`hash % N` N hech qachon o'zgarmaguncha yaxshi. N o'zgarsa, deyarli har bir kalit ko'chadi.\n\n1) Node'lar va kalitlarni bitta halqaga qo'ying; kalit soat strelkasi bo'yicha keyingi node'ga tegishli. 2) Node qo'shilsa yoki chiqsa, kalitlarning faqat ~1/N qismi ko'chadi. 3) Har bir node'ga ko'p virtual nuqta bering, shunda yoylar va yuk tenglashadi. 4) Barcha klientlar bir xil node ro'yxatini ishlatishi kerak.",
    },
  },
};

export default text;
