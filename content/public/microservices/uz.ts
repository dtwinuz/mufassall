import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Mikroservislar",
  summary:
    "Onlayn kitob do'koni bitta ilova va bitta bazadan boshlanadi. Servislarga bo'lish qachon yordam beradi, har bo'linish nimaga tushadi va API gateway qayerda turadi.",
  learn: [
    "Nega monolitdan boshlash kerak va bo'lish vaqti kelganini qaysi belgilar aytadi",
    "Bo'linish nima beradi: mustaqil deploy, jamoalar va masshtablash",
    "Narxi: tarmoq chaqiruvlari, qisman yiqilish, ma'lumotga egalik, taqsimlangan debugging",
    "API gateway kirishda nima qiladi",
  ],
  nodes: {
    client: "Xaridor",
    app: "Do'kon ilovasi",
    db: "Do'kon bazasi",
    gw: "API gateway",
    search: "Qidiruv servisi",
    pay: "To'lov servisi",
    paydb: "To'lov bazasi",
    queue: "Voqealar jurnali",
  },
  metrics: {
    deploys: "Deploylar",
    p95: "So'rov p95",
    hops: "Buyurtmadagi servislar",
    failed: "Yiqilgan so'rovlar",
  },
  steps: {
    monolith: {
      short: "Monolit",
      title: "Bitta ilova, bitta baza",
      body: "Do'kon bitta ilova va bitta bazadan iborat. Buyurtma berish bitta tranzaksiya: kitobni ombordan ayirish, buyurtma yaratish, to'lovni yozish. Yo uchalasi bo'ladi, yo hech biri.\n\nBesh dasturchi, haftada bir deploy, so'rovga 140 ms. Hozircha bu to'g'ri arxitektura: ishga tushirish oson, debug qilish oson.",
      fields: {
        BEGIN: "Bitta lokal tranzaksiya boshlanishi. «Hammasi yoki hech narsa»ni baza tekinga beradi.",
        payments: "To'lovlar o'sha bazadagi yana bitta jadval. Eslab qoling: bu doim shunday qolmaydi.",
        COMMIT: "Qoldiq, buyurtma va to'lov bir vaqtda, bir lahzada ko'rinadi.",
      },
    },
    crowded: {
      short: "Tiqilinch",
      title: "Bir jamoaning muammosi hammaning muammosi",
      body: "Ikki yildan keyin: beshta jamoada 40 dasturchi, bitta kod bazasi. Chegirma kuni qidiruv to'lqini keladi; qidiruv CPU'ni yeydi va buyurtma ham u bilan birga sekinlashadi, chunki ikkalasi bitta jarayonda.\n\nQidiruvning yiqilgan testi hamma uchun relizni to'xtatadi. Deploy o'n kunda bir martaga tushdi. Bo'lishning haqiqiy sabablari shular: jamoalar mustaqilligi va yuki butunlay boshqacha bo'lgan qism.",
      watch: "«Mikroservis zamonaviy» deb bo'lsangiz, hamma xarajatni olasiz, birorta foydani emas. Og'riqni nomlay olganda bo'ling.",
      fields: {
        "X-Response-Time": "Avval 140 ms'da ochilgan sahifa uchun 1,8 s.",
        "search 71%": "Bitta funksiya CPU'ning ko'p qismini yeydi. Qidiruvni alohida masshtablab bo'lmaydi, faqat butun ilovani nusxalash mumkin.",
        blocked: "Aloqasi yo'q jamoalar qidiruv jamoasi testlarini tuzatishini kutadi.",
      },
    },
    "split-search": {
      short: "Qidiruv alohida",
      title: "Og'riyotgan qismni ajratamiz",
      body: "Qidiruv o'z indeksi bilan alohida servisga aylanadi, egasi bitta jamoa. U asosan o'qiydi va uni kesib olish oson. Kirishdagi gateway `/search`'ni unga, qolganini ilovaga yuboradi.\n\nQidiruv endi o'zi masshtablanadi va jamoasi xohlaganda deploy qilinadi. Ilova yana tinch: p95 220 ms ga qaytdi.",
      fields: {
        Host: "Ichki manzil. Xaridor uni ko'rmaydi, u faqat gateway bilan gaplashadi.",
        hits: "Qidiruv o'z indeksidan javob beradi; indeksni ilova e'lon qilgan kitob ma'lumotlaridan quradi.",
        took_ms: "Qidiruv ichida 12 ms. Qolgan vaqt endi tarmoq.",
      },
    },
    gateway: {
      short: "Gateway",
      title: "API gateway: bitta kirish eshigi",
      body: "Client'lar bitta host'ni ko'radi. Gateway token'ni tekshiradi, rate limit qo'llaydi, request id qo'shadi va yo'l bo'yicha yo'naltiradi. Ortidagi servislar bu ishni takrorlamaydi.\n\nU ichki tuzilishni ham yashiradi: keyinroq servislarni bo'lish yoki birlashtirish mumkin, birorta client'ga tegmasdan.",
      watch: "Biznes mantiqni gateway'ga qo'ymang. U buyurtmalar haqida bila boshlasa, eski monolit oldida yangi monolitga aylanadi.",
      fields: {
        Host: "Yagona ommaviy manzil. Hamma servislar uning ortida.",
        Authorization: "Gateway token'ni bir marta tekshiradi. Servislar xom token emas, tekshirilgan foydalanuvchini oladi.",
        "X-RateLimit-Remaining": "Limitlar kirishda sanaladi, so'rov servislarga biror narsa turishidan oldin.",
        "X-Request-Id": "Shu yerda yaratiladi va har servisga uzatiladi: bitta so'rovni hammasi orqali kuzatish mumkin.",
      },
    },
    "split-pay": {
      short: "To'lov alohida",
      title: "To'lovning o'z servisi va bazasi",
      body: "To'lov jamoasi har kuni deploy qilishni va karta ma'lumotlarini qolgan hamma narsadan uzoq tutishni xohlaydi. To'lov o'z bazasi bilan servisga aylanadi. Ilova uni HTTP orqali chaqiradi.\n\nDeploylar kuniga oltitaga chiqdi. Lekin birinchi qadamdagi yagona tranzaksiya endi yo'q: buyurtma bir bazada, to'lov boshqasida.",
      fields: {
        order_id: "Buyurtma do'kon bazasida yashaydi. To'lov faqat uning raqamini biladi.",
        payment_id: "To'lov bazasida yaratildi. Ikki baza, ikki alohida commit.",
        status: "`pending`: to'lov endi jarayon, buyurtma tranzaksiyasi ichidagi qator emas.",
      },
    },
    partial: {
      short: "Qisman",
      title: "Qisman yiqilish",
      body: "To'lov servisi yiqildi. Ilova ishlayapti, do'kon bazasi ishlayapti, buyurtmalar kelishda davom etadi. Chaqiruv 2 soniyadan keyin timeout bo'ladi: buyurtma saqlandi, lekin to'langanmi, noma'lum.\n\nMonolitda bunday bo'lmasdi: yo hammasi ishlardi, yo hammasi yiqilardi. Endi har tarmoq chaqiruviga timeout va «narigi tomon o'lik» holati uchun reja kerak.",
      fields: {
        timeout: "2 s javob yo'q. To'lov o'lik, sekin yoki ishni bajarib bo'lgan bo'lishi mumkin.",
        "payment unknown": "Eng yomon holat: na xato, na muvaffaqiyat. Kimdir keyin hal qilishi kerak.",
      },
    },
    "shared-db": {
      short: "Umumiy baza",
      title: "Boshqa servisning jadvalini o'qish",
      body: "Buyurtma summasini ko'rsatish uchun to'lov jamoasi do'kon bazasini to'g'ridan o'qiydi. Do'kon jamoasi oddiy relizda ustun nomini o'zgartirguncha ishlaydi.\n\nTo'lov o'z tomonida hech narsa o'zgarmasdan buziladi. Umumiy baza ikki jamoani umumiy kod kabi qattiq bog'laydi.",
      watch: "Har servis o'z ma'lumotiga egalik qiladi. Boshqalar uning API'si orqali so'raydi yoki voqealarini tinglaydi, jadvallarini o'qimaydi.",
      fields: {
        ERROR: "To'lov kodi tayangan ustun endi yo'q.",
        HINT: "Boshqa jamoadagi oddiy qayta nomlash. Ularning testlari o'tdi, siznikilar buzildi.",
      },
    },
    events: {
      short: "Voqealar",
      title: "Ma'lumotga ega bo'ling, voqea e'lon qiling",
      body: "Begona o'qish ham, to'g'ridan chaqiruv ham olib tashlandi. Buyurtma yaratilganda ilova voqealar jurnaliga `OrderPlaced` voqeasini yozadi. To'lov uni o'qiydi va kerakli narsaning nusxasini o'zida saqlaydi.\n\nTo'lov o'lik bo'lsa, voqealar jurnalda kutadi va servis qaytganda qayta ishlanadi. Hech narsa yo'qolmaydi, buyurtmalar qabul qilinishda davom etadi.",
      fields: {
        key: "Bir xil kalitli voqealar bitta partition'ga tushadi: bitta buyurtmaning voqealari tartibda qoladi.",
        type: "So'rov emas, nomlangan fakt. U bilan nima qilishni to'lov o'zi hal qiladi.",
        amount: "Summa voqea ichida keladi, to'lovga do'kon bazasini o'qish kerak emas.",
      },
    },
    debugging: {
      short: "Debugging",
      title: "Hisob: bir necha servis bo'ylab debugging",
      body: "Bitta buyurtma endi gateway, ilova, voqealar jurnali va to'lovdan o'tadi. Bug haqida xabar degani: to'rt to'plam log, o'rtada navbat va birorta umumiy stack trace yo'q.\n\nHar chaqiruv va har voqea ichida trace id bo'lmasa, hech kim bitta buyurtmani boshidan oxirigacha kuzata olmaydi. Tracing, markaziy log va har servis uchun dashboard bo'lishning narxiga kiradi.",
      fields: {
        offset: "Voqeaning jurnaldagi o'rni. Uni qayta o'ynash yoki to'lov qanchalik orqada qolganini ko'rish mumkin.",
        traceparent: "Trace id voqea ichida ham yuradi, shuning uchun asinxron qadam o'sha trace'ga tushadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Toza modulli monolitdan boshlang. Faqat nomlay oladigan sabab bilan bo'ling.\n\n1) Yaxshi sabablar: jamoalar bir-birini to'sadi, bir qismning yuki butunlay boshqacha, qismga o'z reliz sur'ati yoki izolyatsiya kerak. 2) Har bo'linish funksiya chaqiruvini tarmoq chaqiruviga aylantiradi: timeout, qisman yiqilish, umumiy tranzaksiya yo'q. 3) Har servis o'z ma'lumotiga ega; boshqalar API yoki voqea orqali. 4) Kirishda autentifikatsiya, limit va yo'naltirish uchun gateway. 5) Tracing va markaziy log'ni bo'lishdan oldin rejalashtiring, keyin emas.",
    },
  },
};

export default text;
