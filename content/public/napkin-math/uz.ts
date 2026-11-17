import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Qog'oz ustida hisob",
  summary:
    "Kuryerlarni kuzatish servisini qurishdan oldin uni qog'oz ustida o'lchab chiqing: foydalanuvchilardan soniyasiga so'rovlarga, so'rovlardan kunlik baytlarga, baytlardan disk, tarmoq va serverlarga. Taxminiy sonlar, bir necha daqiqa — va qimmat xatolar birinchi kod qatoridan oldin ko'rinadi.",
  learn: [
    "«Nechta foydalanuvchi» ni soniyasiga so'rovlarga aylantirish: o'rtacha va eng yuqori",
    "Bitta qator hajmidan kunlik va yillik xotirani hisoblash",
    "Tarmoqni yeydigan narsani prod'ga chiqmasdan oldin topish",
    "Eslab qolishga arziydigan kechikish sonlari va serverlarni zaxira bilan sanash",
  ],
  nodes: {
    couriers: "Kuryer ilovasi",
    customers: "Mijoz ilovasi",
    api: "Kuzatuv API",
    db: "Baza",
    archive: "Arxiv",
    cdn: "CDN",
  },
  metrics: {
    rps: "Eng yuqori so'rovlar",
    disk: "Baza hajmi",
    egress: "API chiquvchi trafigi, soniyasiga",
    servers: "App serverlar",
  },
  steps: {
    pings: {
      short: "Yozuvlar",
      title: "Foydalanuvchilardan boshlang",
      body: "Eng band soatda 20 000 kuryer ishda. Ularning ilovasi har 10 soniyada joylashuv ping'ini yuboradi.\n\n20 000 ÷ 10 = **soniyasiga 2 000 yozuv**. Shu bitta bo'lishning o'zi bu tizim asosan yozadigan tizim ekanini aytadi.",
      watch: "Har doim sonning yoniga farazni yozing. «Har 10 s» — mahsulot qarori, uni 30 s ga o'zgartirish yukni uch baravar kamaytiradi.",
      fields: {
        Authorization: "Har bir kuryerning tokeni. Bu sir, shuning uchun bu yerda yashirilgan.",
        courier_id: "Kim yubordi. Ping'lar kuryer bo'yicha qidiriladi, shuning uchun bu indeksning birinchi ustuni bo'ladi.",
        lat: "Kenglik, `lon` bilan birga joylashuv. Ikki son, 16 bayt.",
        ts: "Server qabul qilgan emas, telefon o'lchagan vaqt. Telefon oflayn bo'lib, keyinroq yuborishi mumkin.",
      },
    },
    reads: {
      short: "O'qishlar",
      title: "O'quvchilarni qo'shing",
      body: "Kuniga 300 000 buyurtma, har bir mijoz kuzatuvni taxminan 20 marta ochadi: kuniga 6 million o'qish. Kunda 86 400 soniya bor, uni 100 000 deb oling: o'rtacha soniyasiga 60 ga yaqin.\n\nTrafik tekis emas: tushlik va kechki cho'qqilar o'rtachadan 5 baravar yuqori, shuning uchun 300 ga rejalashtiring. Ping'lar bilan birga: cho'qqida **soniyasiga 2 300 so'rov**.",
      fields: {
        status: "Buyurtma hozir qayerda. Kichkina, bitta buyurtmada bir necha marta o'zgaradi.",
        eta_min: "Yetkazishgacha daqiqalar. Butun javob 1 KB dan kichik, shuning uchun soniyasiga 300 ta atigi 0,3 MB/s.",
      },
    },
    "row-size": {
      short: "Qator hajmi",
      title: "Bitta ping qancha joy oladi?",
      body: "Qator hajmini taxmin qilmang, bazadan so'rang. Namuna jadvalda bitta ping 61 bayt ma'lumot va 38 bayt indeks: taxminan 100 bayt.\n\nSoniyasiga 2 000 × 86 400 soniya ≈ kuniga 173 million qator. × 100 bayt ≈ **kuniga 17 GB**.",
      fields: {
        row_bytes: "Bitta qatorning o'rtacha saqlangan hajmi, baza qo'shadigan qator sarlavhasi bilan.",
        TABLESAMPLE: "Butun jadval o'rniga 1% namunani o'qiydi. Taxmin uchun yetarli.",
        index_bytes: "Har bir indeks ham disk oladi. Indekslarni unutish — hajm hisobidagi eng ko'p uchraydigan xato.",
      },
    },
    year: {
      short: "Bir yil",
      title: "Hammasini bir yil saqlash",
      body: "Kuniga 17 GB × 365 ≈ **6,3 TB**, 63 milliard qator. Indekslar endi xotiraga sig'maydi, har bir so'rov diskka tegadi, zaxira nusxa olish esa deyarli bir kun davom etadi.\n\nBuni hech kim so'ramagan. Mijozlarga oxirgi bir necha soat, qo'llab-quvvatlashga bir hafta, analitikaga esa umumlashma kerak.",
      watch: "Bazani tanlashdan oldin ma'lumot qancha saqlanishi kerakligini so'rang. Javob ko'pincha muammoni yuz baravar kichraytiradi.",
      fields: {
        pg_total_relation_size: "Jadval va uning barcha indekslari, diskda qanday tursa shunday.",
        rows: "Kuniga 172,8 million × 365. Bunday katta bitta jadvalni so'rash, zaxiralash va o'zgartirish sekin.",
      },
    },
    retention: {
      short: "Saqlash muddati",
      title: "7 kun bazada, qolgani arxivda",
      body: "Baza faqat oxirgi 7 kunni saqlaydi: 7 × 17 ≈ **120 GB**, bu oddiy bitta serverga sig'adi. Har kecha eng eski kun siqilgan fayl sifatida arzon object storage'ga chiqariladi va bazadan o'chiriladi.\n\nSiqilgan bir kun taxminan 1,7 GB, bazadagidan o'n baravar kichik. Bir yillik arxiv taxminan 600 GB.",
      fields: {
        parquet: "Ustunli fayl formati. Koordinata va vaqtlar ustunlarda juda yaxshi siqiladi.",
        "Content-Length": "Bir kunlik barcha ping'lar uchun taxminan 1,7 GB.",
      },
    },
    bandwidth: {
      short: "Tarmoq",
      title: "Og'ir qism — xarita",
      body: "Kuzatuv ekrani xarita ko'rsatadi, xarita tile'larini esa API o'zi beradi. Bitta tile taxminan 200 KB. Soniyasiga 300 ko'rish × 200 KB = **60 MB/s**, taxminan 480 Mbit/s.\n\nTaqqoslash uchun ping'lar 2 000 × ~400 bayt ≈ 0,8 MB/s. Hech kim o'ylamagan funksiya mahsulot yadrosidan 75 baravar ko'p tarmoq ishlatadi.",
      watch: "Javobdagi baytlar × soniyasiga javoblar. Buni har bir endpoint uchun qiling, ayniqsa rasm qaytaradiganlari uchun.",
      fields: {
        tiles: "Xarita rasmlari, bir ko'chaga qaragan hamma uchun bir xil.",
        "Content-Length": "Har bir tile 204 800 bayt, API ning o'z tarmoq kanalidan beriladi.",
      },
    },
    cdn: {
      short: "CDN",
      title: "Tile'larni CDN'dan berish",
      body: "Tile'lar hamma uchun bir xil va kam o'zgaradi, shuning uchun CDN ularni foydalanuvchilarga yaqin joyda keshlay oladi. API yana faqat kichik JSON beradi.\n\nAPI chiquvchi trafigi 60 MB/s dan 0,3 MB/s ga tushadi. Shu baytlar uchun CDN hisobi kattaroq tarmoq kanali narxidan ancha past.",
      fields: {
        "Cache-Control": "Har qanday kesh bu tile'ni 7 kun saqlashi mumkin.",
        Age: "Tile CDN'da 85 daqiqadan beri turibdi. Buning uchun API'ni hech kim bezovta qilmadi.",
        "X-Cache": "`HIT`: API'ga bormasdan CDN'dan berildi.",
      },
    },
    numbers: {
      short: "Sonlar",
      title: "Eslab qolishga arziydigan kechikishlar",
      body: "Xotira: ~100 ns. SSD'dan o'qish: ~100 µs. Bitta data markaz ichida borib-kelish: ~0,5 ms. Diskda qidirish: ~10 ms. Qit'alar orasida borib-kelish: 70–150 ms.\n\nHar bir pog'ona oldingisidan taxminan yuz-ming baravar sekin. Demak bitta tarmoq chaqiruvi minglab xotira o'qishiga teng, boshqa mintaqaga bitta chaqiruv esa yonidagi yuzta chaqiruvga teng.",
      watch: "Aniq qiymatlar uskuna bilan o'zgaradi, ular orasidagi nisbat deyarli o'zgarmaydi. Nisbatlarni eslab qoling.",
    },
    servers: {
      short: "Serverlar",
      title: "Nechta app server kerak?",
      body: "Taxmin qilmang, o'lchang: yuklama testi 4 vCPU li bitta instance soniyasiga 800 so'rovni 61% CPU da va yaxshi p99 bilan ko'tarishini ko'rsatadi.\n\n2 300 ÷ 800 ≈ 3 instance, plyus deploy va nosozlik uchun bitta zaxira: **4 server**. Cho'qqida har biri taxminan 44% yukda ishlaydi.",
      watch: "Hech qachon aniq 100% ga hisoblamang. Deploy uchun o'chirilgan bitta server qolganlarini bo'g'ib qo'ymasligi kerak.",
      fields: {
        throughput: "Bitta instance kechikishi oshmasdan ushlab turgan tezlik.",
        cpu: "Band, lekin joy bor. Reja serverlarni bundan ancha pastda ushlaydi.",
        p99: "Bu tezlikda ham tez. Yanada ko'proq bersangiz, avval dum o'sadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Qog'oz ustidagi hisob — oddiy ko'paytirishlar zanjiri: foydalanuvchilar → soniyasiga so'rovlar → kunlik baytlar → disk, tarmoq va serverlar.\n\n1) Har bir farazni yozing va o'rtachaga emas, cho'qqiga rejalashtiring. 2) Bir kun ~100 000 soniya. 3) Ma'lumot qancha yashashi kerakligini so'rang. 4) Har bir endpoint uchun baytni tezlikka ko'paytiring. 5) Kechikish nisbatlarini yodda tuting: xotira, SSD, data markaz, qit'a.",
    },
  },
};

export default text;
