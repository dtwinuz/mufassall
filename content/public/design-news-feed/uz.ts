import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Yangiliklar lentasi loyihasi",
  summary:
    "Odamlar post yozadi, ularga obuna bo'lganlarning hammasi uni bir necha soniyada lentasida ko'rishi kerak. Lentani qadamma-qadam quramiz: o'qishda yig'ish, yozishda tarqatish, mashhurlar muammosi va gibrid, ranking, CDN'dagi media va lenta keshi o'lganda nima bo'ladi.",
  learn: [
    "Fan-out on read va fan-out on write, har birining narxi",
    "Nega bir nechta ulkan akkaunt push'ni buzadi va gibrid uni qanday tuzatadi",
    "Postlarni emas, id'larni saqlaydigan har foydalanuvchi lenta keshi",
    "Cursor bilan sahifalash, ranking va CDN'dagi media",
  ],
  nodes: {
    author: "Muallif ilovasi",
    reader: "O'quvchi ilovasi",
    api: "Lenta API",
    db: "Postlar va obunalar bazasi",
    queue: "Postlar navbati",
    fanout: "Fan-out worker",
    feeds: "Lenta keshi",
    cdn: "CDN",
    media: "Media ombori",
  },
  metrics: {
    "feed-p99": "Lenta yuklash p99",
    fanout: "Lentaga yozishlar",
    "post-delay": "Obunachilarga yetish vaqti",
  },
  steps: {
    post: {
      short: "Post",
      title: "Post yozish: bitta qator, bitta id",
      body: "Muallif matn va oldinroq yuklangan rasmlar id'larini yuboradi. API `posts` ga bitta qator yozadi va uning id'sini qaytaradi. Id vaqt bo'yicha saralanadi (noyob id darsidagidek, avval vaqt bitlari), shuning uchun yangi postning id'si doim kattaroq.\n\nModel hajmi: kuniga 20 million o'quvchi, kuniga 500 000 post (~6/s), o'rtacha 300 obunachi. Yozish arzimas; qiyini lentani o'qish.",
      fields: {
        Authorization: "Kim yozyapti. Sessiya tokeni, bu yerda yashirilgan.",
        media_ids: "Rasmlar avval alohida yuklanadi. Post faqat ularga ishora qiladi.",
        post_id: "Vaqtdan boshlanadigan 64 bitli id: id bo'yicha saralash = vaqt bo'yicha saralash.",
      },
    },
    pull: {
      short: "Pull",
      title: "Fan-out on read: lenta ochilganda yig'iladi",
      body: "Eng oddiy lenta: o'quvchi ilovani ochganda u obuna bo'lgan hammani topamiz, ularning yangi postlarini olamiz, vaqt bo'yicha saralab 50 tasini qaytaramiz. Bu **fan-out on read**: ish o'qish paytida bajariladi.\n\n200 kishiga obuna foydalanuvchi uchun bu 38 ms. Post yozish tekin: kimdir o'qimaguncha hech narsa bo'lmaydi.",
      fields: {
        JOIN: "Har obuna bo'lingan muallifni postlari bilan bog'laydi: obuna qancha ko'p bo'lsa, shuncha ko'p qator.",
        "ORDER BY": "Eng yaxshi 50 ta ma'lum bo'lishidan oldin hammasi saralanishi kerak.",
        LIMIT: "Faqat 50 qator qaytadi, lekin ularni tanlash uchun minglab qator o'qildi.",
      },
    },
    "pull-slow": {
      short: "Pull sekin",
      title: "Katta hajmda pull: har safar hamma ishni baza qiladi",
      body: "20 million o'quvchi lentani kuniga ~10 marta ochadi: o'rtacha 2 300 lenta/s, kechki cho'qqida ~10 000. Har biri 50 tasini qoldirish uchun o'n minglab qator o'qiydi. Baza 97% da, lenta p99 1,8 s ga yetdi.\n\nO'tgan safardan beri deyarli hech narsa o'zgarmagan bo'lsa ham, har ochishda bir xil lenta noldan quriladi.",
      fields: {
        EXPLAIN: "So'rov aslida nima qilganini vaqtlari bilan ko'rsatadi.",
        "Rows Removed": "O'qilib, keyin saralashda tashlab yuborilgan qatorlar: behuda ish.",
        "Execution Time": "Bitta lenta uchun 1,7 s. Cho'qqida bunday so'rovlar mingtalab bir vaqtda.",
      },
    },
    push: {
      short: "Push",
      title: "Fan-out on write: post yozilganda tarqatamiz",
      body: "Teskarisi: kimdir post yozsa, navbat uni fan-out worker'ga beradi. Worker muallif obunachilarini o'qiydi va post id'sini har obunachining lenta keshidagi ro'yxatiga qo'shadi. Lentani o'qish bitta kesh o'qishiga aylanadi.\n\nNarx yozishga ko'chdi: 6 post/s × 300 obunachi ≈ 1 800 qo'shish/s. Post darhol qaytadi; obunachilar uni ~2 s dan keyin ko'radi.",
      watch: "Postni emas, post id'sini saqlang. Tahrir yoki o'chirish 300 ta nusxaga emas, bitta qatorga tegadi; to'ldirishda o'chirilgan id'lar tashlab ketiladi.",
      fields: {
        LPUSH: "Yangi post id'sini shu obunachi ro'yxatining boshiga qo'yadi.",
        LTRIM: "Faqat eng yangi 800 id qoladi. Eskiroq sahifalar bazadan keladi.",
        feed: "Har foydalanuvchiga bitta ro'yxat: `feed:<user>`.",
      },
    },
    "read-fast": {
      short: "Tez o'qish",
      title: "Lentani o'qish endi bitta oraliq o'qishi",
      body: "API `feed:u_42` ning birinchi 50 id'sini o'qiydi, keyin shu postlarni id bo'yicha post keshidan oladi (ko'pi issiq) va qaytaradi. JOIN yo'q, saralash yo'q.\n\nLenta p99 1,8 s dan 25 ms ga tushdi, baza esa faqat yozish va kesh miss'larini ko'radi.",
      fields: {
        LRANGE: "Ro'yxat bo'lagini o'rni bo'yicha o'qiydi: obunachi soni qancha bo'lmasin, O(50).",
        "49": "0 dan 49 gacha o'rinlar: birinchi sahifa.",
      },
    },
    celebrity: {
      short: "Mashhur",
      title: "Mashhur odam post yozdi: 30 million yozish",
      body: "30 million obunachisi bor akkaunt post yozdi. Fan-out worker 30 million ro'yxatga yozishi kerak. 200 000 yozish/s tezlikda bu daqiqalab ish, uning orqasida navbatda turgan oddiy postlar ham kutadi.\n\nPostlar endi obunachilarga 10 daqiqagacha yetib boradi. Bu 30 million obunachining ko'pi bugun ilovani ochmaydi ham.",
      watch: "Push narxi postlar soni bilan emas, obunachilar soni bilan o'sadi. Bitta akkaunt butun quvurni to'xtatib qo'yishi mumkin.",
      fields: {
        followers: "Bitta post uchun yangilanadigan 30 million lenta.",
        eta: "Faqat shu post uchun yana 37 daqiqa. Orqasidagilarning hammasi kutadi.",
      },
    },
    hybrid: {
      short: "Gibrid",
      title: "Gibrid: ko'pchilikka push, mashhurlarga pull",
      body: "100 000 dan ortiq obunachili akkauntlar fan-out qilinmaydi. O'qishda API keshdan push qilingan ro'yxatni oladi, o'quvchi obuna bo'lgan bir nechta katta akkauntning yangi postlarini qo'shadi va id bo'yicha birlashtiradi.\n\nBu pull arzon: o'quvchi bunday akkauntlardan bir nechtasigagina obuna, ularning yangi postlari esa o'zi keshda va millionlab o'qiladi. Fan-out yana 1 800/s, postlar obunachilarga 2 s da yetadi.",
      watch: "30 kundan beri kirmagan foydalanuvchilarga ham fan-out qilmang. Ular qaytganda lentasini pull bilan yig'ing.",
      fields: {
        author_id: "Faqat shu o'quvchi obuna bo'lgan katta akkauntlar: odatda o'ntadan kam.",
        interval: "Faqat yangi postlar qo'shiladi. Eskilari allaqachon ko'rilgan yoki keyingi sahifalarda.",
      },
    },
    rank: {
      short: "Ranking",
      title: "Ranking va cursor",
      body: "Qat'iy vaqt tartibi yaqin do'stlarning postlarini shovqin ostida ko'mib yuboradi. API bir necha yuz nomzod oladi, har biriga ball beradi (muallif bilan qanchalik tez-tez muloqot, yangilik, dastlabki layklar) va eng yaxshi 20 tasini qaytaradi.\n\nSahifalar offset bilan emas, **cursor** bilan: siz aylantirayotganda tepaga yangi postlar keladi, offset esa takror ko'rsatadi yoki postlarni o'tkazib yuboradi. Cursor oxirgi sahifa qayerda tugaganini eslaydi.",
      fields: {
        cursor: "Oldingi sahifadan kelgan noaniq o'rin. Klient uni shunchaki qaytarib yuboradi.",
        score: "Shu o'quvchi uchun ranking bali. Kattasi birinchi.",
        next_cursor: "Keyingi sahifa qayerdan boshlanadi. Bo'lmasa, oxiri.",
      },
    },
    media: {
      short: "CDN",
      title: "Rasmlar API'dan emas, CDN'dan",
      body: "Baytlarning ko'pi rasmlar. Ular object storage'da bir necha o'lchamda bir marta saqlanadi va o'quvchiga yaqin CDN orqali beriladi. API faqat URL qaytaradi.\n\nFayl nomida media id va o'lcham bor, shuning uchun fayl hech qachon o'zgarmaydi va bir yil keshlanishi mumkin. Origin rasm trafigining juda kichik qismini ko'radi.",
      fields: {
        "720": "Telefon ekrani uchun kichraytirilgan nusxa. Ilova kerakli o'lchamni tanlaydi.",
        "Cache-Control": "Bir yil keshlash: `immutable`, chunki yangi rasm yangi nom oladi.",
        "X-Cache": "Chekkadan berildi; omborga tegilmadi.",
      },
    },
    "cache-loss": {
      short: "Kesh o'ldi",
      title: "Lenta keshining bitta node'i o'ldi",
      body: "Lenta keshining bitta node'i ishdan chiqdi. Har sakkiz foydalanuvchidan birining lenta ro'yxati birdan yo'q, yangi postlarni ularga push qilib bo'lmaydi.\n\nKesh lentalar uchun haqiqat manbai deb qaralgan edi, lekin u faqat nusxa: har ro'yxatni bazadan qayta qurish mumkin.",
      fields: {
        "connection refused": "`feed:u_42` turgan node yo'q. Uning ro'yxatlari ham u bilan yo'qoldi.",
      },
    },
    rebuild: {
      short: "Qayta qurish",
      title: "Pull'ga qaytish, fonda qayta qurish",
      body: "Ro'yxati yo'q foydalanuvchilar uchun API pull'ga qaytadi: obuna bo'lingan mualliflarning faqat oxirgi ikki kunlik postlari. Bunday lenta 25 emas, ~40 ms; foydalanuvchilarning kichik qismi uchun baza buni ko'taradi.\n\nShu orada ro'yxatlar tiklangan node'da qayta quriladi: faol foydalanuvchilarga keyingi ochishda, nofaollarga hech qachon. Har kesh node'ining replica'si ham bor, keyingi safar almashish soniyalarda bo'ladi.",
      watch: "Chegaralangan zaxira yo'li bo'lmasa, butun o'qish yuki birdan bazaga tushadi.",
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Lenta bu yozishdagi ish va o'qishdagi ish orasidagi savdo.\n\n1) Pull oddiy, lekin har ochishda har lentani qayta quradi. 2) Push o'qishni bitta kesh oralig'iga aylantiradi, narxi yozishda har obunachiga. 3) Katta akkauntlar o'qishda pull qilinib birlashtiriladi. 4) Lenta ro'yxatlari id saqlaydi, cheklangan va doim qayta qurilishi mumkin. 5) Bir necha yuz nomzodni rank qiling, cursor bilan sahifalang, mediani CDN'dan bering.",
    },
  },
};

export default text;
