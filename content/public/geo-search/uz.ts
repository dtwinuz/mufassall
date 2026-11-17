import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Geo qidiruv: kim yaqinda",
  summary:
    "Taksi ilovasi yo'lovchi atrofidagi eng yaqin o'nta bo'sh haydovchini topishi kerak, 50 000 haydovchi esa har 4 soniyada joylashuvini yuboradi. Oddiy indeks nega yordam bermaydi va geohash, qo'shni katakchalar, quadtree hamda S2/H3 katakchalari \"2 km ichida kim bor\" savoliga millisoniyalarda qanday javob beradi.",
  learn: [
    "Kenglik va uzunlik bo'yicha B-tree nega baribir butun shahar bo'ylab tasmani o'qiydi",
    "Geohash: yaqin nuqtalarning prefiksi umumiy, shuning uchun katakcha bitta kalitga aylanadi",
    "Katakcha chetlari: doim qo'shnilarni ham o'qing, keyin aniq masofa bo'yicha saralang",
    "Zich markazdagi qizg'in katakchalar: quadtree bo'linishi, S2 va H3, katakcha bo'yicha sharding",
  ],
  nodes: {
    rider: "Yo'lovchi ilovasi",
    drivers: "Haydovchi ilovalari",
    api: "Moslash API",
    db: "Haydovchilar bazasi",
    geo: "Geo indeks",
    geo2: "Geo indeks 2",
  },
  metrics: {
    p95: "Qidiruv p95",
    scanned: "O'qilgan haydovchi",
    missed: "Eng yaqini o'tkazildi",
    ghosts: "Arvoh haydovchilar",
  },
  steps: {
    scan: {
      short: "To'liq skan",
      title: "Masofa har bir haydovchi uchun hisoblanadi",
      body: "Yo'lovchi ilovani ochib, mashina chaqiradi. Moslash API bazadan 2 km dan yaqin bo'sh haydovchilarni so'raydi va ularni masofa bo'yicha saralaydi.\n\nBaza formula uchun indeks ishlata olmaydi: har qidiruvda u 50 000 haydovchining hammasi uchun masofani hisoblaydi. Shu jadvalga esa soniyasiga 12 500 ta joylashuv yangilanishi ham yoziladi.",
      fields: {
        distance_km: "Qator qiymatlaridan hisoblanadigan funksiya. Oddiy indeks unga oldindan javob bera olmaydi.",
        "Seq Scan": "Reja butun jadvalni qatorma-qator o'qiydi.",
        examined: "10 ta qator qaytarish uchun 50 000 tasi o'qildi. Ishning deyarli hammasi behuda.",
      },
    },
    box: {
      short: "To'rtburchak",
      title: "Kenglik bo'yicha indeks tasmani o'qiydi",
      body: "Keyingi fikr: chegaralovchi to'rtburchak, ya'ni kenglik va uzunlik ±2 km ichida, `lat` ustida indeks bilan. Indeks kenglik oralig'idagi hamma haydovchini tez topadi.\n\nLekin kenglik oralig'i butun shahar bo'ylab g'arbdan sharqqa cho'zilgan 4 km lik tasma. Kvadrat ichidagi bir necha yuztasini olish uchun 9 000 haydovchi o'qiladi. B-tree bitta o'lchov bo'yicha saralaydi, xaritada esa ikkita o'lchov bor.",
      watch: "Ikkita alohida bir o'lchovli indeks ikki o'lchovli savolga samarali javob bera olmaydi.",
      fields: {
        drivers_lat: "Faqat bitta koordinata ustidagi B-tree.",
        BETWEEN: "To'rtburchak: kenglik ±0,018° va uzunlik ±0,024°, har tomonga taxminan 2 km.",
        stripe: "Kengligi mos bo'lgan hamma narsa, sharq yoki g'arbda qanchalik uzoq bo'lmasin.",
      },
    },
    geohash: {
      short: "Geohash",
      title: "Geohash: ikki koordinata bitta kalitga",
      body: "Geohash dunyoni qayta-qayta to'rga bo'ladi va yo'lni qisqa satr qilib yozadi. Yaqin nuqtalarning odatda uzun umumiy prefiksi bo'ladi: `tz6x9q` taxminan 1,2 × 0,6 km lik katakcha.\n\nHaydovchilar endi xotiradagi geo indeksda, katakcha kaliti bilan saqlanadi. Qidiruv 50 000 qator o'rniga bitta katakchani, taxminan 300 haydovchini o'qiydi.",
      fields: {
        tz6x9q: "Olti belgi: taxminan 1,2 × 0,6 km lik katakcha. Har qo'shimcha belgi uni 32 ga bo'ladi.",
        tz6x9: "Ota katakcha. Bitta belgini olib tashlasangiz, katakcha kattalashadi.",
        SCAN: "Faqat kaliti shu katakcha bilan boshlanadigan haydovchilarni o'qish.",
      },
    },
    "edge-cells": {
      short: "Katakcha cheti",
      title: "Eng yaqin haydovchi chegaraning narigi tomonida",
      body: "Yo'lovchi o'z katakchasining sharqiy chegarasidan 40 m narida turibdi. Qidiruv faqat uning katakchasini o'qiydi va 900 m dagi haydovchini taklif qiladi. Boshqa haydovchi 120 m da, lekin qo'shni `tz6x9w` katakchasida.\n\nXaritada yaqinlik har doim ham umumiy prefiks degani emas: bir-biridan bir necha metrdagi ikki nuqta chegaraning ikki tomonida qolishi mumkin, hatto katta chegaraning ham.",
      check: {
        q: "120 m dagi haydovchi albatta topilishi uchun nima qilish kerak?",
        options: [
          "Katakchalar kichikroq bo'lishi uchun uzunroq geohash olish",
          "Yo'lovchi katakchasi va 8 ta qo'shnisini o'qib, aniq masofa bo'yicha saralash",
          "Faqat `tz6x9` ota katakchasida qidirish",
        ],
        answer: 1,
        why: "Kichik katakchalar chegarani kamaytirmaydi, ko'paytiradi. Ota katakchaning ham chegarasi bor. Katakcha va uning sakkiz qo'shnisi bir katakcha kengligi ichidagi hamma nuqtani qamraydi, aniq masofa esa haqiqiy eng yaqinini tanlaydi.",
      },
      fields: {
        border: "Yo'lovchi katakchasining chetida turibdi. Har qanday katakchaning cheti bor.",
        "not searched": "Eng yaqin haydovchi hech kim o'qimagan katakchada.",
        prefix: "Ikki qo'shni katakchaning oltita belgidan faqat beshtasi umumiy.",
      },
    },
    neighbours: {
      short: "Qo'shnilar",
      title: "Katakcha va uning 8 qo'shnisini o'qish",
      body: "Geo indeks markaz va radiusni oladi. U yo'lovchi katakchasini va atrofidagi sakkizta katakchani o'qiydi, faqat shu haydovchilar uchun aniq masofani hisoblaydi, 2 km dan uzoqlarini tashlaydi va qolganini saralaydi.\n\n50 000 o'rniga 2 700 haydovchi o'qiladi va eng yaqini hech qachon tushib qolmaydi. Katakcha o'lchami qidiruv radiusiga taxminan teng qilib tanlanadi.",
      watch: "To'r faqat filtr. Yakuniy javobni doim aniq masofa beradi.",
      fields: {
        BYRADIUS: "Kvadrat emas, aylana ichidagi hamma narsa.",
        ASC: "Avval eng yaqinlari.",
        "9 cells": "Katakcha va 8 qo'shnisi: yo'lovchi atrofidagi 3 × 3 blok.",
        "exact distance": "Faqat 9 katakchadagi nomzodlar uchun hisoblanadi, uzoq burchaklar tashlanadi.",
      },
    },
    updates: {
      short: "Yangilanishlar",
      title: "Soniyasiga 12 500 joylashuv yangilanishi",
      body: "Har haydovchi ilovasi har 4 soniyada joylashuvini yuboradi: soniyasiga 12 500 yozuv. Joylashuvlar asosiy bazaga emas, xotiradagi geo indeksga boradi: eski joylashuv bir daqiqadan keyin hech narsaga arzimaydi, qayta ishga tushishda yo'qolsa ham zarari yo'q.\n\nLekin ba'zi haydovchilarning aloqasi uziladi yoki ilovani yopib qo'yishadi. Ularning oxirgi joylashuvi indeksda soatlab qoladi va yo'lovchilarga yo'q mashinalar taklif qilinadi.",
      check: {
        q: "Haydovchining telefoni tunnelda o'chib qoldi. Bir soatdan keyin indeks yo'lovchilarga nimani ko'rsatadi?",
        options: [
          "Haydovchini, hali ham bo'sh holda, tunnel kirishida",
          "Hech narsa: indeks harakatlanmayotgan haydovchilarni o'zi o'chiradi",
          "Haydovchini, lekin \"oflayn\" belgisi bilan",
        ],
        answer: 0,
        why: "Indeks unga berilgan oxirgi joylashuvni saqlaydi. Haydovchi ketganini hech kim aytmadi, shuning uchun muddat qoidasi bo'lmasa arvoh abadiy bo'sh turadi.",
      },
      fields: {
        lat: "Gradusdagi kenglik. `lng` bilan birga bu to'liq joylashuv.",
        status: "Qidiruvga faqat bo'sh haydovchilar kiradi.",
        sent_at: "Telefon uni qachon o'lchagan. Yangilikni serverning o'z soati hal qiladi.",
        GEOADD: "Haydovchini indeksga qo'yish yoki surish. Shu buyruq eski joylashuvni ustidan yozadi.",
      },
    },
    expiry: {
      short: "Muddat",
      title: "Jim bo'lib qolgan haydovchilarni olib tashlash",
      body: "Joylashuvlar yonida indeks har haydovchidan oxirgi marta qachon xabar kelganini saqlaydi. Har 10 soniyada bir aylanish 30 soniyadan ko'p jim turganlarni o'chiradi.\n\nQaytib kelgan haydovchi shunchaki navbatdagi yangilanishni yuboradi va yana paydo bo'ladi. 1 400 arvoh haydovchi qidiruvdan yo'qoladi.",
      fields: {
        "drivers:seen": "Haydovchi id va oxirgi yangilanish vaqti.",
        "now-30": "30 soniyadan beri xabar bermaganlar. Bu yettita o'tkazib yuborilgan yangilanish.",
        ZREM: "Ularni geo indeksdan o'chirish.",
      },
    },
    "hot-cell": {
      short: "Qizg'in katakcha",
      title: "Juma kechqurun shahar markazida",
      body: "Juma soat 18:30 da bitta markaziy katakchada 3 100 haydovchi kutadi, atrofida esa soniyasiga 900 yo'lovchi qidiradi. Chekka mahallada xuddi shu o'lchamdagi katakchada to'rtta haydovchi bor.\n\nMarkazdagi har qidiruv minglab haydovchini o'qiydi, markazni saqlaydigan tugun 100% band, qolganlari esa bo'sh turadi. Qat'iy to'r cho'lga ham, stadionga ham bir xil katak qo'yadi.",
      check: {
        q: "Markazdagi qizg'in katakchaga eng ko'p nima yordam beradi?",
        options: [
          "Hamma joyda kattaroq katakchalar, ular kamroq bo'lishi uchun",
          "Geo indeks oldida kesh",
          "Haydovchi zich joyda bo'linadigan, siyrak joyda katta qoladigan katakchalar",
        ],
        answer: 2,
        why: "Katta katakchalar markazni yomonlashtiradi. Kesh yordam bermaydi: haydovchilar har 4 soniyada harakatlanadi. Katakcha o'lchami zichlikka ergashsa yordam beradi: markazda kichik kvadratlar, chekkada kattalari. Bu quadtree.",
      },
      fields: {
        tz6x9q: "Xuddi o'sha 1,2 km lik katakcha, endi to'lib ketgan.",
        "900 searches": "Har biri katakcha va qo'shnilaridagi hamma haydovchini o'qiydi.",
        suburb: "Shu o'lchamdagi, deyarli bo'sh katakcha. Qat'iy to'r zichlikka qaramaydi.",
      },
    },
    quadtree: {
      short: "Quadtree",
      title: "Quadtree: katakchalar zichlikka ergashadi",
      body: "Quadtree butun shahar uchun bitta kvadratdan boshlanadi va kvadratda 200 dan ortiq haydovchi bo'lishi bilan uni to'rtga bo'ladi. Markazda kvadratlar taxminan 300 m bo'lib qoladi, chekkada esa 10 km lik bo'lib qoladi.\n\nQidiruv daraxt bo'ylab pastga tushadi va faqat 2 km lik aylanaga tegadigan kvadratlarni o'qiydi. Har kvadratda haydovchilar soni cheklangan, shuning uchun qidiruv narxi endi yo'lovchi qayerda turganiga bog'liq emas.",
      watch: "Haydovchilar harakatlanadi, shuning uchun kech davomida kvadratlar bo'linib va qo'shilib turishi kerak. Daraxtni har bir necha soniyada qaytadan qurish ko'pincha uni joyida yangilashdan oson.",
      fields: {
        split: "To'lib ketgan bitta kvadrat o'rniga to'rtta bola kvadrat.",
        "depth 9": "Markazda to'qqiz marta bo'linish: tor joyda kichik kvadratlar.",
        touch: "Butunlay aylanadan tashqaridagi kvadratlar o'qilmasdan o'tkazib yuboriladi.",
      },
    },
    "s2-h3": {
      short: "S2 va H3",
      title: "S2 va H3 katakchalari va katakcha bo'yicha sharding",
      body: "Kutubxonalar xuddi shuni sfera ustida qiladi. S2 Yerni kub yuzalariga proyeksiya qiladi va katakchalarni egri chiziq bo'ylab raqamlaydi, shuning uchun aylana 64 bitli id'larning bir necha oralig'i bilan qoplanadi. H3 olti burchaklardan foydalanadi: oltita qo'shnining hammasi bir xil masofada, shuning uchun \"navbatdagi halqa\" haqqoniy aylana bo'ladi.\n\nKatakchalar id bo'lgach, indeksni tugunlarga yirik ota katakcha bo'yicha bo'lish mumkin. Shard chegarasi yonidagi qidiruv ikkala shardni so'raydi, qizg'in markaz esa o'z shardini oladi.",
      fields: {
        H3: "16 o'lchamli olti burchakli to'r. 8-daraja taxminan 0,7 km² lik olti burchak.",
        "ring of 6": "Olti burchakning oltita qo'shnisi teng masofada, kvadratning 8 ta notekis qo'shnisidan farqli.",
        "res 5": "Yirik ota katakcha shardni tanlaydi. Yaqin haydovchilar bitta tugunda qoladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "\"Kim yaqinda\" uchun beshta qoida.\n\n1) lat yoki lng ustidagi oddiy indeks tasmani o'qiydi; joylashuvni katakcha kalitiga aylantiring (geohash, S2, H3). 2) Doim katakcha va qo'shnilarini o'qing, keyin aniq masofa bo'yicha saralang. 3) Tez o'zgaradigan joylashuvlarni xotirada saqlang va jim qolgan haydovchilarni muddati bilan o'chiring. 4) Katakchalar zichlikka ergashsin: quadtree yoki bir necha daraja. 5) Yirik katakcha bo'yicha sharding qiling va qizg'in hududlarga alohida shard bering.",
    },
  },
};

export default text;
