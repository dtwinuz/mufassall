import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Keshlash",
  summary:
    "Mahsulot sahifasi bazadan bir xil qatorni soniyasiga minglab marta o'qiydi. Oldiga qo'yilgan kesh o'qishni tezlashtiradi, keyin o'z muammolarini olib keladi: eskirgan ma'lumot, issiq kalitga yopirilish va yozuvlar qayerga ketishi.",
  learn: [
    "Cache-aside o'qish yo'li: keshga qara, bo'lmasa bazadan o'qi, keshni to'ldir",
    "TTL va invalidatsiya: nega yozuv keshdagi nusxani o'chirishi kerak",
    "Issiq kalitga yopirilish (stampede) nima va uni coalescing hamda tasodifiy TTL qanday to'xtatadi",
    "Write-through va write-back: har biri nimani xavf ostiga qo'yadi",
  ],
  nodes: {
    client: "Do'kon ilovasi",
    api: "Mahsulot API",
    db: "Baza",
    cache: "Kesh (Redis)",
    admin: "Do'kon menejeri",
    worker: "Flush worker",
  },
  metrics: {
    "hit-ratio": "Keshga tushish ulushi",
    p95: "Javob p95",
    "db-reads": "Bazadan o'qishlar",
    stale: "Eski narx ko'rinadi",
  },
  steps: {
    "no-cache": {
      short: "Keshsiz",
      title: "Har sahifa ochilishi bazaga boradi",
      body: "Kimdir `1042` mahsulotni ochganda API ikki jadvalni JOIN qiladi va o'sha qatorni qaytadan o'qiydi. Ma'lumot kuniga bir necha marta o'zgaradi, o'qilishi esa soniyasiga 2400 marta.\n\nBaza 90% dan ortiq yuklangan, har sahifa uni kutadi.",
      fields: {
        JOIN: "Har so'rovda ikki jadval birlashtiriladi: narx `products` dan, miqdor `stock` dan.",
        "38 ms": "O'zi arzon. Lekin bitta bazada soniyasiga 2400 marta emas.",
      },
    },
    "cache-aside": {
      short: "Cache-aside",
      title: "Avval keshga qara",
      body: "API yoniga kesh qo'yiladi. API endi avval keshdan kalit bo'yicha so'raydi. Kalit bo'lsa, bazaga tegilmaydi.\n\nKesh bo'sh boshlanadi, shuning uchun birinchi javob «bu yerda hech narsa yo'q». Bu **miss**: API avvalgidek bazaga boradi.",
      fields: {
        "product:1042": "Har mahsulotga bitta kalit. Kalit nomi uni o'qiydigan va yozadigan hamma uchun kelishuv.",
        "(nil)": "Miss. Keshda bu kalit hali yo'q.",
      },
    },
    fill: {
      short: "To'ldirish",
      title: "Miss'dan keyin javobni keshga qo'y",
      body: "Bazadan o'qigach, API natijani keshga yashash muddati (TTL) bilan yozadi. Keyingi o'quvchi uni xotiradan oladi.\n\nBu **cache-aside**: nimani va qachon yuklashni kesh emas, ilova hal qiladi. Bazadan o'qish deyarli o'n baravar kamayadi.",
      fields: {
        SET: "Qatorni keshga yoz, sahifaga kerakli ko'rinishda.",
        EX: "TTL 300 soniya. Keyin kalit yo'qoladi va keyingi o'quvchi uni qayta yuklaydi.",
      },
    },
    hit: {
      short: "Hit",
      title: "Hit: javob xotiradan",
      body: "Endi ko'p so'rovlar kalitni topadi. Hit o'nlab millisekund o'rniga bir millisekund atrofida.\n\n**Hit ratio** — o'qishlarning kesh javob bergan ulushi. 94% da 100 o'qishdan faqat 6 tasi bazaga yetadi.",
      fields: {
        GET: "Kalit bo'yicha bitta qidiruv. So'rov ham, JOIN ham yo'q.",
        price: "Kalit yozilgan paytdagi narx. Buni eslab qoling.",
      },
    },
    stale: {
      short: "Eskirgan",
      title: "Narx o'zgardi, kesh esa yo'q",
      body: "Menejer narxni tushiradi. Bazada yangi narx, lekin kesh TTL tugaguncha eskisini berishda davom etadi.\n\nBesh daqiqagacha xaridor sahifada bir narxni, to'lovda boshqasini ko'radi.",
      watch: "TTL to'g'rilik vositasi emas. U faqat ma'lumot qancha vaqt noto'g'ri bo'lishini cheklaydi.",
      fields: {
        price: "Yangi narx, endi bazada.",
        COMMIT: "Yozuv tugadi. Keshga hech kim aytmadi.",
      },
    },
    invalidate: {
      short: "Invalidatsiya",
      title: "Yozuv keshdagi nusxani o'chiradi",
      body: "Yangilash commit bo'lgach, API kalitni o'chiradi. Keyingi o'quvchi miss oladi va yangi qatorni yuklaydi.\n\nUstidan yozmang, o'chiring: ikki yozuvchi poyga qilsa, keshda eskirog'i qolib ketishi mumkin. O'chirish yo'qolgan kamdan-kam holat uchun TTL zaxira bo'lib qoladi.",
      watch: "Baza commit'idan keyin o'chiring, oldin emas. Aks holda oradagi o'quvchi keshni eski qator bilan qayta to'ldiradi.",
      fields: {
        DEL: "Kalitni o'chir. Yangi qiymatni yozishdan arzonroq va xavfsizroq.",
        "(integer) 1": "Bitta kalit o'chdi. Eski narx keshda yo'q.",
      },
    },
    stampede: {
      short: "Yopirilish",
      title: "Aksiya paytida issiq kalit tugaydi",
      body: "Soat 08:00 da aksiya boshlanadi va minglab odam bitta mahsulotni ochadi. Aynan shu payt uning kaliti tugaydi.\n\nHammasi bir lahzada miss oladi va hammasi bir xil so'rov bilan bazaga boradi. Baza 2814 ta bir xil o'qishda bo'g'iladi.",
      watch: "Kalit qancha issiq bo'lsa, uning tugashi shuncha xavfli.",
      fields: {
        expired: "TTL tugadi: oddiy xatti-harakat, yomon vaqt.",
        MISS: "Bir necha millisekundda bitta kalitga 2814 ta miss.",
      },
    },
    coalesce: {
      short: "Coalescing",
      title: "Kalitni faqat bitta so'rov tiklaydi",
      body: "Miss bo'lganda API avval qisqa qulf olishga urinadi. Qulfni olgan yagona so'rov bazadan o'qiydi va keshni to'ldiradi.\n\nQolganlar bir necha millisekund kutadi va yangi kalitni o'qiydi. 2814 ta bir xil so'rov bittaga aylanadi. Bu **request coalescing**.",
      fields: {
        NX: "Kalit yo'q bo'lsagina yoz: aynan bitta chaqiruvchi yutadi.",
        PX: "Qulf 2000 ms dan keyin o'zi o'chadi, yutgan so'rov yiqilsa ham.",
        "(nil)": "Qolganlar poygada yutqazdi. Ular bazaga tegmaydi.",
      },
    },
    jitter: {
      short: "Jitter",
      title: "Kalitlar birga tugamasin",
      body: "Deploy'dan keyin minglab kalit bir daqiqa ichida bir xil TTL bilan to'ldirildi, shuning uchun ularning hammasi ham bir daqiqada tugaydi.\n\nHar TTL'ga tasodifiy qism qo'shilsa, tugashlar yoyiladi. Baza to'lqin o'rniga bir tekis oqim ko'radi.",
      fields: {
        EX: "Bu safar 347 soniya, keyingi safar boshqa son.",
        random: "Bir daqiqagacha tasodifiy qo'shimcha. To'lqinni buzishga yetarli.",
      },
    },
    "write-modes": {
      short: "Yozish usuli",
      title: "Yozuvlar: kesh orqali yoki keshdan keyin",
      body: "Hozirgacha yozuvlar to'g'ri bazaga ketardi. **Write-through** bitta so'rovda ham keshga, ham bazaga yozadi: kesh doim yangi, lekin har yozuv ikki marta to'lanadi.\n\n**Write-back** faqat keshga yozadi, bazaga keyinroq worker o'tkazadi. Ko'rishlar hisoblagichiga mos: juda tez, lekin kesh yiqilsa, o'tkazilmagan qism yo'qoladi.",
      watch: "Write-back faqat bir necha soniyasini yo'qotish mumkin bo'lgan ma'lumot uchun. Pul yoki buyurtma uchun hech qachon.",
      fields: {
        INCR: "Xotirada birga oshir. Har ko'rishga bazaga yozuv yo'q.",
        "views:1042": "Worker bu hisoblagichni har 10 soniyada bazaga o'tkazadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Kesh uchun besh qoida.\n\n1) Cache-aside: keshni o'qi, miss bo'lsa bazani o'qi va to'ldir. 2) Har kalitda zaxira sifatida TTL bor. 3) Yozuv kalitni commit'dan keyin o'chiradi. 4) Issiq kalitlarga coalescing va tasodifiy TTL kerak. 5) Write-back faqat yo'qotsa bo'ladigan ma'lumot uchun.",
    },
  },
};

export default text;
