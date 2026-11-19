import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Mijozni tekshirish (KYC)",
  summary:
    "Hamyon ilovasi mijozlari pul o'tkazishidan oldin ular kimligini bilishi shart: pasport, selfi, tashqi provayder tekshiruvi, ba'zan esa odam ko'rib chiqishi. Statuslarni qanday modellashtirish, pasport rasmlarini sizib chiqishdan saqlash, sekin yoki ikki marta javob beradigan provayderga chidash, tekshiruv navbatini vaqtida yuritish, dublikat va sanksiyadagi ismlarni ushlash, tekshirilmagan hisob imkoniyatini cheklash va har bir qarorni yillar davomida izi bilan saqlash.",
  learn: [
    "Ariza statuslari: draft dan approved, rejected yoki needs_more_info gacha, ruxsat etilgan o'tishlar bitta jadvalda",
    "Hujjatlar yopiq, shifrlangan omborda, yuklash va ko'rish uchun qisqa umrli imzolangan havolalar",
    "Provayderni idempotency key bilan chaqirish; avval callback, zaxira sifatida polling; SLA li qo'lda tekshiruv navbati",
    "Sanksiya/PEP tekshiruvi va kalitli hash bo'yicha dublikatlar; serverda qo'llanadigan bosqichli limitlar; qayta tekshirish, audit izi va saqlash muddati",
  ],
  nodes: {
    app: "Mobil ilova",
    api: "KYC servisi",
    db: "KYC bazasi",
    docs: "Hujjatlar ombori",
    idp: "KYC provayderi",
    jobs: "Fon ishlari",
    reviewer: "Tekshiruv paneli",
    lists: "Sanksiya ro'yxatlari",
    pay: "To'lovlar",
  },
  metrics: {
    exposed: "Hammaga ochiq hujjatlar",
    doubles: "Ikki marta haq olingan tekshiruvlar",
    late: "SLA dan o'tgan tekshiruvlar",
    dups: "Dublikat hisoblar",
    cashout: "Tekshirilmagan hisoblardan pul yechish",
    orphan: "Arizasini topmagan callback'lar",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Yangi mijoz tekshiruvdan o'tishni so'raydi",
      body: "Hamyon ilovasida pul to'ldirish, to'lash va yechib olish mumkin. Qonun avval mijozni bilishni talab qiladi: ilova ism, pasport raqami, JShShIR (14 xonali shaxsiy raqam) va tug'ilgan sanani yuboradi, KYC servisi esa `draft` holatida ariza yaratadi. Bu yerdagi barcha ma'lumot soxta: `AA1234567`, `12345678901234`.\n\nBirinchi oydan keyingi raqamlar yaxshi emas: qo'lda tekshiruvlarning uchdan biri o'z muddatidan o'tib ketadi, 40 kishi ikkinchi xush kelibsiz bonusi uchun ikkinchi hisob ochgan, kuniga 120 ta pul yechish hech kim tekshirmagan hisoblardan bo'ladi.",
      fields: {
        type: "Jismoniy yoki yuridik shaxs: kompaniyaga ro'yxatdan o'tgani va egalari ham kerak.",
        passport: "Hujjat raqami: bu yerda soxta, hayotda esa nozik shaxsiy ma'lumot.",
        pinfl: "Shaxsiy raqam pasportdan farqli o'laroq umrbod o'zgarmaydi, shuning uchun dublikat uchun yaxshiroq kalit.",
        birth_date: "Bir xil ismli ikki odamni ajratish uchun kerak, sanksiya tekshiruvida ham.",
        application_id: "Bu tekshiruvning bizdagi id'si, provayderga reference sifatida yuboriladi.",
        status: "Har bir ariza faqat mijozning o'zi o'zgartira oladigan qoralamadan boshlanadi.",
      },
    },
    states: {
      short: "Holatlar",
      title: "Ariza bu holatlar mashinasi",
      body: "Oltita status va ruxsat etilgan o'tishlar jadvali. Provayder o'zi tasdiqlashi yoki rad etishi, yoki odamni so'rashi mumkin (`in_review`). Tekshiruvchi tasdiqlaydi, rad etadi yoki qo'shimcha so'raydi (`needs_more_info`, masalan xira rasm); mijoz qayta yuklaydi va ariza yana `submitted` ga qaytadi.\n\nHar bir o'zgarish jadvalni va `version` ustunini tekshiradigan bitta funksiya orqali o'tadi, shuning uchun kechikkan callback yoki ikkinchi tekshiruvchi arizani borishi mumkin bo'lmagan joyga surolmaydi.",
      check: {
        q: "Tekshiruvchi kyc_3391 ni o'n daqiqa oldin rad etdi. Endi provayderning kechikkan callback'i \"approved\" deydi. Nima bo'ladi?",
        options: [
          "Ariza approved bo'ladi: oxirgi so'z provayderniki",
          "Hech narsa o'zgarmaydi: rejected -> approved jadvalda yo'q; callback logga yoziladi va belgilanadi",
          "Eng yangi hodisa yutadi, demak approved",
        ],
        answer: 1,
        why: "Yakuniy statuslar qimirlamaydi. Jadvalda `rejected` dan chiqadigan o'tish yo'q, shuning uchun callback uni o'zgartirolmaydi; u dalil sifatida saqlanadi va kimdir kelishmovchilikni ko'rib chiqishi mumkin. Jadvalsiz oxirgi kelgan xabar hal qiladi, bu esa poyga.",
      },
      fields: {
        status: "Bitta ustun, qiymatlari yopiq ro'yxatdan.",
        version: "Har o'zgarishda oshadi; eski versiya uchun update 0 qatorni o'zgartiradi.",
        draft: "Faqat mijoz tahrirlaydi; hali hech qayerga hech narsa yuborilmagan.",
        in_review: "Provayder ishonch hosil qilmadi: odam hal qiladi.",
        needs_more_info: "Rad etish emas: mijoz tuzatib, qayta yuborishi mumkin.",
      },
    },
    "docs-leak": {
      short: "Sizish",
      title: "Pasport rasmlari ochiq havolalar ortida",
      body: "Ilova rasmlarni mijozga qaytarib ko'rsata olishi uchun ularni to'g'ridan-to'g'ri public read li bucket'ga yuklaydi. Obyekt nomlari ariza id'lari, id'lar esa birma-bir oshib boradi. Havolalarning muddati yo'q va login talab qilmaydi.\n\nQo'llab-quvvatlash xodimi bitta havolani chatga tashlaydi, chat esa ochiq guruhga tushib qoladi. URL dagi raqamni o'zgartirgan har kim 18 000 ta pasport va selfini yuklab oladi.",
      watch: "Pasport rasmi va selfi boshqa birov nomidan hisob ochish uchun kerak bo'lgan hamma narsa.",
      fields: {
        "public read": "URL bilgan har kim faylni yuklab oladi: hisobsiz, tekshiruvsiz.",
        sequential: "Taxmin qilinadigan nomlar: bitta havola qolganlarining hammasini ochib beradi.",
        "no expiry": "Bir marta sizgan havola abadiy sizgan bo'ladi.",
        "18 000": "Qachondir hujjat yuklagan har bir mijoz.",
      },
    },
    "docs-secure": {
      short: "Yopiq",
      title: "Yopiq shifrlangan ombor va muddati tugaydigan havolalar",
      body: "Bucket yopiq bo'ladi va kalitlar servisidagi kalit bilan shifrlanadi. Yuklash uchun ilova KYC servisidan imzolangan URL so'raydi: bitta obyekt, tasodifiy nom, 5 daqiqa, ko'pi bilan 10 MB, faqat JPEG. Fayl API orqali umuman o'tmaydi.\n\nTekshiruvchilar rasmlarni 60 s yashaydigan va faqat tekshiruvchi roliga beriladigan imzolangan havolalar orqali ko'radi; har biri audit yozuvi. Hammaga ochiq hujjatlar: nol.",
      check: {
        q: "Tekshiruvchi ko'rish havolasini chatga tashlaydi. Zararni nima cheklaydi?",
        options: [
          "Bucket'ning shifrlangani",
          "60 soniyalik umr va havolani kim olganini yozib qo'ygan audit yozuvi",
          "Tasodifiy obyekt nomi",
        ],
        answer: 1,
        why: "Saqlashdagi shifrlash disk va zaxira nusxalarni himoya qiladi; haqiqiy imzolangan havola esa uni ushlagan har kim uchun ochiladi. Tasodifiy nom taxmin qilishni to'xtatadi, ulashishni emas. Sizgan havolani u qanchalik tez o'lishi cheklaydi, audit esa kimning odatini tuzatish kerakligini aytadi.",
      },
      fields: {
        kind: "Qaysi hujjat: birinchi sahifa, selfi video, kompaniya guvohnomasi.",
        size_bytes: "E'lon qilingan hajm; imzolangan URL kattaroq yuklashni rad etadi.",
        upload_url: "Tasodifiy, bitta obyektga: uni bilish boshqa fayllar haqida hech narsa aytmaydi.",
        signature: "Servis imzolagan: URL faqat berilganidek va muddati tugaguncha ishlaydi.",
        expires_in_s: "Yuklashni boshlash uchun besh daqiqa, keyin havola yaroqsiz.",
        max_bytes: "Chegarani ilova emas, ombor qo'llaydi.",
      },
    },
    double: {
      short: "Ikki marta",
      title: "Provayder timeout'i ikkita tekshiruvga pul to'latadi",
      body: "KYC servisi hujjatlarni provayderga 10 s timeout bilan yuboradi. Provayder band va 12 s dan keyin javob beradi. Worker buni muvaffaqiyatsizlik deb hisoblab qayta urinadi; provayder ikkinchi tekshiruvni boshlaydi.\n\nIkkita tekshiruv uchun haq olinadi. Biri approved deydi, ikkinchisi in_review, chunki ikkinchi yuklashda selfi xira chiqqan, yakuniy status esa qaysi callback oxirida kelishiga bog'liq. Kuniga 11 ta ariza.",
      watch: "Javob yo'qligi muvaffaqiyatsizlik emas. Birinchi so'rov ishlagan bo'lishi mumkin.",
      fields: {
        "timeout 10 s": "Bizniki, provayderniki emas: biz voz kechgandan keyin ham u ishlayveradi.",
        "no answer": "Natija noma'lum, lekin muvaffaqiyatsiz deb qabul qilingan.",
        "new check": "Provayder qayta urinishni yangi so'rovdan ajrata olmaydi.",
        chk_B: "O'sha odam uchun ikkinchi, pullik va boshqacha natija.",
        "which callback lands last": "Mijozning statusini poyga hal qiladi.",
      },
    },
    idem: {
      short: "Bir marta",
      title: "Idempotency key, callback va zaxira sifatida polling",
      body: "Har bir urinish ariza va urinish raqamidan tuzilgan `Idempotency-Key` oladi. O'sha kalit bilan qayta urinish o'sha tekshiruvni replay deb belgilangan holda qaytarib oladi va qayta haq olinmaydi. Provayder darhol `202` javob beradi, natijani esa keyinroq imzolangan holda bizning callback URL ga yuboradi.\n\n15 daqiqada callback kelmasa, fon ishi `GET /v1/checks/chk_A` ni so'raydi. Callback'lar tez, polling esa yo'qolganlarini ushlaydi. Ikki marta tekshiruv: nol.",
      check: {
        q: "Mijoz needs_more_info oladi, yangi selfi yuklaydi va ilova qayta yuboradi. Qaysi kalit?",
        options: [
          "O'sha kyc_3391-attempt-1, ariza o'sha-ku",
          "Yangisi, kyc_3391-attempt-2: bu yangi hujjatlar bilan yangi tekshiruv",
          "Kalitsiz: qayta urinishlar kam bo'ladi",
        ],
        answer: 1,
        why: "Kalit \"bu o'sha so'rov\" degani. Eski kalit bilan provayder xira selfiga asoslangan eski natijani qaytaradi. Yangi urinish yangi hujjatlar va yangi kalit degani; bitta urinishning qayta yuborilishi esa o'z kalitini ishlatadi.",
      },
      fields: {
        "Idempotency-Key": "O'sha urinish, o'sha kalit: provayder birinchi tekshiruvni qaytaradi.",
        reference: "Bizning ariza id'imiz: callback'lar shu bo'yicha moslanadi.",
        callback_url: "Provayder natijani shu yerga yuboradi; u imzo bilan tekshiriladi.",
        "Idempotent-Replayed": "Bu javob birinchi so'rovning takrori, yangi tekshiruv emas.",
        check_id: "Provayderning id'si, polling va qo'llab-quvvatlash uchun saqlanadi.",
      },
    },
    review: {
      short: "Ko'rib chiqish",
      title: "Muddat bo'yicha tartiblangan tekshiruv navbati",
      body: "Tekshiruvlarning 18% iga odam kerak: past liveness bali, hujjatga mos kelmaydigan ism. Avval tekshiruvchilar eng yangisini ochishardi, eskilari kutib qolardi va 31% i va'da qilingan 4 ish soatidan o'tib ketardi.\n\nEndi navbat `due_at` bo'yicha tartiblangan. Ishni olish `assigned_to` ni 15 daqiqalik lease bilan qo'yadi, shuning uchun ikki tekshiruvchi hech qachon bitta ish ustida ishlamaydi; muddati o'tgan lease ishni navbatga qaytaradi. SLA ning 75% ida ogohlantirish chiqadi. Kechikkan tekshiruvlar 4% ga tushadi.",
      check: {
        q: "Ikki tekshiruvchi navbatni bir soniyada ochadi va ikkalasi ham kyc_3391 ni bosadi. Faqat bittasi olishi uchun nima qilish kerak?",
        options: [
          "Navbatni tez-tez yangilash",
          "Bitta shartli UPDATE bilan egallash: assigned_to faqat bo'sh yoki lease muddati o'tgan bo'lsa qo'yiladi; 0 qator boshqa birov olib bo'lganini bildiradi",
          "Ikkalasi ham ko'rib chiqsin, birinchi qaror qoladi",
        ],
        answer: 1,
        why: "Baza bitta buyruq ichida hal qiladi, shuning uchun qatorni aynan bitta egallash o'zgartiradi. Yangilash poygani qisqartiradi, imkonsiz qilmaydi. Bitta ishni ikki odam ko'rishi behuda vaqt va kelishtirish kerak bo'lgan ikkita qaror.",
      },
      fields: {
        reason: "Nega odam kerak: tekshiruvchi shundan boshlaydi.",
        due_at: "SLA vaqt belgisi sifatida: navbat shu bo'yicha saralanadi.",
        assigned_to: "Hozir kim ishlayapti; keyinchalik kim qaror qilgani ham.",
        lease_until: "Tekshiruvchi tashlab ketsa, ish navbatga qaytadi.",
        over_sla: "Allaqachon kechikkan: tepada ko'rsatiladi va dashboard'da sanaladi.",
      },
    },
    risk: {
      short: "Xavf",
      title: "Kalitli hash bo'yicha dublikatlar, sanksiya va PEP ro'yxatlari",
      body: "Tasdiqlashdan oldin ikki tekshiruv. Dublikatlar: servis JShShIR va pasport raqamining kalitli hash'larini (HMAC) saqlaydi va mavjud mijozni qidiradi. JShShIR yangi pasport bilan qaytgan odamni ham ushlaydi. Moslik avtomatik tasdiqqa emas, tekshiruvchiga ketadi.\n\nSkrining: ism va tug'ilgan sana sanksiya ro'yxatlari va siyosiy ta'sirga ega shaxslar (PEP) bilan solishtiriladi. 0,93 lik noaniq moslik arizani odam uchun to'xtatadi. Ro'yxatlar har kuni o'zgaradi, shuning uchun tasdiqlangan mijozlar har tun qayta tekshiriladi. Dublikat hisoblar: nol.",
      check: {
        q: "Skrining juda keng tarqalgan ism uchun 0,93 moslik qaytaradi. Servis nima qilishi kerak?",
        options: [
          "Darhol rad etish: sanksiya jiddiy narsa",
          "Arizani topilgan yozuv bilan tekshiruvchiga to'xtatish; faqat odam haqiqatan ro'yxatda bo'lsa rad etish",
          "Tasdiqlash: bu 100% moslik emas",
        ],
        answer: 1,
        why: "Ismlar bo'yicha noaniq moslik ko'p soxta signal beradi; hammasini rad etish halol mijozlarni yo'qotadi, e'tiborsiz qoldirish esa haqiqiylarini o'tkazib yuboradi. Odam tug'ilgan sana, fuqarolik va hujjatni ro'yxat yozuvi bilan solishtiradi va sababini yozib qo'yadi.",
      },
      fields: {
        pinfl_ref: "Shaxsiy raqamning kalitli hash'i: tenglik bo'yicha qidiruv, indeksda xom JShShIR yo'q.",
        doc_ref: "Pasport raqami uchun ham xuddi shunday.",
        "HMAC-SHA256": "Maxfiy kalit bilan, shuning uchun o'g'irlangan jadvalni brute force bilan raqamlarga qaytarib bo'lmaydi.",
        duplicate: "O'sha odam, ikkinchi hisob: tekshiruvchi hal qiladi, ikkinchi bonus yo'q.",
        PEP: "Siyosiy ta'sirga ega shaxs: ruxsat, lekin kuchaytirilgan tekshiruv bilan.",
        "re-screened": "Mijoz tasdiqlangandan keyin ham ro'yxatga tushishi mumkin.",
      },
    },
    limits: {
      short: "Bosqichlar",
      title: "Tekshiruvdan oldin va keyin limitlar, serverda qo'llanadi",
      body: "Ilova tekshirilmagan foydalanuvchilardan \"Yechib olish\" tugmasini yashirgan edi, lekin ilovaning eski versiyasi va bir nechta skript API ni to'g'ridan-to'g'ri chaqirardi: kuniga 120 ta yechib olish. Endi To'lovlar servisi har bir pul harakatida KYC servisidan limitlarni so'raydi.\n\nTekshirilmagan: balans 1 000 000 so'mgacha, do'konlarga to'lov, yechib olish va odamlarga o'tkazma yo'q. Tekshirilgan: 100 000 000 so'mgacha va oyiga 20 000 000 chiqim. Rad etilgan yechib olish keyingi qadam ko'rsatilgan `403 kyc_required` oladi. Tekshirilmaganlardan yechib olish: nol.",
      check: {
        q: "Ilova tekshirilmaganlar uchun \"Yechib olish\" ni allaqachon yashiradi. Nega serverda ham tekshirish kerak?",
        options: [
          "Ilova yangi bo'lsa, kerak emas",
          "Eski ilova versiyalari va API ga to'g'ridan-to'g'ri chaqiruvlar ilova qoidalarini chetlab o'tadi; har bir so'rovni faqat server ko'radi",
          "Chiroyliroq xato xabarini ko'rsatish uchun",
        ],
        answer: 1,
        why: "Klient sizning nazoratingizda emas: odamlar eski versiyalar, skriptlar va o'zgartirilgan ilovalardan foydalanadi. Pulni himoya qiladigan qoida har bir so'rov o'tadigan joyda turishi kerak: pulni harakatlantiradigan servisda.",
      },
      fields: {
        tier: "Har bir pul servisi tushunadigan bitta so'z.",
        balance_max_uzs: "Tekshirilmagan hamyonda qancha turishi mumkin.",
        withdraw_month_uzs: "Nol: kim olayotganini bilmagunimizcha pul chiqib ketolmaydi.",
        p2p: "Boshqa odamlarga o'tkazmalar ham yopiq: bu ham chiqish yo'li.",
      },
    },
    reverify: {
      short: "Muddat",
      title: "Pasport muddati tugaydi: qayta tekshir",
      body: "Tekshiruv uning ortidagi hujjat qanchalik yaroqli bo'lsa, shunchalik yaroqli. Har tun fon ishi pasporti 30 kun ichida tugaydigan tasdiqlangan mijozlarni topadi: 1 140 kishi. Ularga 30, 14 va 3 kun oldin push va SMS boradi.\n\nMuddat tugagan kuni yangi hujjat bo'lmasa, bosqich tekshirilmaganga tushadi: balans qoladi, yechib olish to'xtaydi. Yangi pasport faqat hujjat qadamidan iborat qisqa ariza ochadi, eski qaror esa tarixda qoladi.",
      check: {
        q: "Nega muddat tugagan kuni butun hisobni bloklamaslik kerak?",
        options: [
          "Hammasini bloklash eng xavfsiz tanlov",
          "Pul mijozniki: xavfli amallarni to'xtating, hujjat yangilanguncha to'lovlar va balansni qoldiring",
          "Muddati o'tgan pasport ahamiyatsiz",
        ],
        answer: 1,
        why: "Muddati o'tgan hujjat pulning chiqib ketishini to'xtatish uchun sabab, uni tortib olish uchun emas. Tekshirilmagan bosqichga tushish allaqachon mavjud qoidalarni qayta ishlatadi va mijozga aniq qaytish yo'lini beradi.",
      },
      fields: {
        passport_expires: "Tasdiqlashda saqlanadi, shuning uchun fon ishi yaqinlashayotgan muddatlarni indeks bilan topadi.",
        "1 140": "Bu oy eslatma olishi kerak bo'lgan mijozlar.",
        "tier -> unverified": "Yangi mijoz bilan bir xil limitlar.",
        "balance stays": "Hech narsa olinmaydi; faqat chiqish yo'li yopiladi.",
        "only the document step": "Yangidan ro'yxatdan o'tish emas, yangilash.",
      },
    },
    audit: {
      short: "Audit",
      title: "Har bir qaror yozuvda, har bir hujjatning muddati bor",
      body: "Har bir status o'zgarishi faqat qo'shiladigan qator yozadi: qayerdan, qayerga, kim (tekshiruvchi id'si yoki `provider`), nega va qaysi tekshiruv hamda hujjatlarga asoslangani. Tekshiruvchilar bu qatorlarni tahrirlay yoki o'chira olmaydi, bitta tekshiruvchining rad etishini faqat boshqasi qayta ocha oladi.\n\nSaqlash muddati ham yozib qo'yilgan: tasdiqlangan mijozlarning hujjat va qarorlari hisob yopilgandan keyin 5 yil saqlanadi, odatda pul yuvishga qarshi qoidalar shuni talab qiladi. Rad etilgan va tashlab ketilgan arizalarning rasmlari 90 kundan keyin o'chiriladi. Provayder o'z nusxasini tekshiruvdan 30 kun o'tib o'chiradi.",
      check: {
        q: "2028 yilda auditor kyc_3391 nega tasdiqlanganini so'raydi. Nima mavjud bo'lishi shart?",
        options: [
          "Provayderning natijasi, agar u hali saqlayotgan bo'lsa",
          "Tekshiruvchi id'si, sabab va dalil id'lari bor qaror qatori hamda saqlash muddati davomida saqlangan hujjatlar",
          "O'sha kungi ilova loglari",
        ],
        answer: 1,
        why: "Loglar bir necha hafta yashaydi, provayder esa o'z nusxasini o'chiradi. Yillar o'tib faqat o'zingizning qarorlar izingiz va u ko'rsatadigan, saqlash muddati davomida saqlangan hujjatlar javob bera oladi.",
      },
      fields: {
        actor: "Kim qaror qildi: tekshiruvchi id'si yoki avtomatik qarorlar uchun provider.",
        reason: "Tekshiruvchi yozadi, keyingi o'quvchi tushunadigan so'zlar bilan.",
        evidence: "Qaror tayangan tekshiruvlar va hujjatlar.",
        "5 years": "Tekshiruvdan emas, hisob yopilgandan keyin.",
        "90 days": "Rad etilgandan keyin begona odamning pasportini saqlashga sabab yo'q.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Mijozni tekshirishning yetti qoidasi.\n\n1) Arizani holatlar mashinasi sifatida modellashtiring: draft, submitted, in_review, approved, rejected, needs_more_info, bitta o'tishlar jadvali, version ustuni. 2) Hujjatlar yopiq shifrlangan omborda yashaydi; yuklash va ko'rish daqiqalar yoki soniyalarda o'ladigan imzolangan havolalar orqali. 3) Provayderni har urinishga alohida idempotency key bilan chaqiring; callback'ni qabul qiling, hech qachon qaytmaganini polling bilan so'rang. 4) Qo'lda tekshiruvni muddat bo'yicha yuriting, faqat bitta tekshiruvchi yuta oladigan egallash bilan. 5) Sanksiya va PEP ro'yxatlarini ro'yxatdan o'tishda va har tun tekshiring; dublikatlarni JShShIR va hujjatning kalitli hash'i bo'yicha toping. 6) Limitlarni tekshiruv bosqichiga bog'lang va pulni harakatlantiradigan servisda qo'llang. 7) Hujjat muddati tugashidan oldin qayta tekshiring, har bir qarorni faqat qo'shiladigan izga yozing va saqlash muddati tugagan hujjatlarni o'chiring.",
    },
  },
  scenarios: {
    "early-callback": {
      label: "Erta callback",
      steps: {
        "cb-race": {
          short: "Juda erta",
          title: "Callback tranzaksiya commit bo'lishidan oldin keladi",
          body: "Yuborish handler'i tranzaksiya ochadi, `submitted` qo'yadi va commit qilishdan oldin provayderni chaqiradi. Provayder 190 ms da avtomatik qaror qiladi va callback yuboradi. Callback handler'i commit bo'lmagan qatorni ko'rmaydi: 0 qator.\n\nU 200 javob beradi va hodisani tashlab yuboradi. Tranzaksiya 190 ms dan keyin commit bo'ladi, ariza esa abadiy `submitted` da kutadi. Kuniga 140 ta, deyarli hammasi tez avtomatik tasdiqlar: eng baxtli mijozlar eng uzoq kutadi.",
          check: {
            q: "Nega yo'qolgan callback'larning deyarli hammasi tez tasdiqlar?",
            options: [
              "Provayder tasdiqlarni xato bilan yuboradi",
              "Faqat commit'dan tezroq javob qator ko'rinishidan oldin yetib kela oladi; sekin tekshiruvlar doim keyin keladi",
              "Tasdiq xabarlari kattaroq",
            ],
            answer: 1,
            why: "Read committed da boshqa tranzaksiya qatorni faqat COMMIT dan keyin ko'radi. Soatlab davom etadigan natija ancha keyin keladi; 190 ms lik natija esa 400 ms lik tranzaksiya ichiga tushadi. Provayder qancha tez bo'lsa, xato shuncha yomon.",
          },
          fields: {
            BEGIN: "Commit bo'lguncha qator faqat shu tranzaksiya ichida mavjud.",
            "inside the transaction": "Tranzaksiya ichidagi tarmoq chaqiruvi: sekin, tashqi dunyoga esa juda erta ko'rinadi.",
            "0 rows": "Callback handler'i commit bo'lmagan ma'lumotni ko'rmaydi.",
            "drops it": "200 provayderga hammasi joyida deydi, u qayta urinmaydi.",
            COMMIT: "Juda kech: natija bor yagona xabar yo'qolib bo'lgan.",
          },
        },
        "cb-fix": {
          short: "Avval commit",
          title: "Avval commit, o'z reference'imiz bo'yicha moslash, hech qachon tashlamaslik",
          body: "Handler endi `submitted` ni outbox qatori bilan birga commit qiladi va qaytadi. Worker outbox'ni o'qiydi va provayderni bizning `reference` bilan chaqiradi. Callback'lar arizani shu reference bo'yicha qidiradi, provayder u haqda eshitganda u allaqachon commit bo'lgan.\n\nNoma'lum reference ga 503 bilan javob beriladi, provayder unutib yubormay, keyinroq qayta urinadi. 15 daqiqadan keyin ham submitted bo'lib turganlarni tozalagich polling bilan so'raydi. Yetim callback'lar: nol.",
          fields: {
            COMMIT: "Ariza tashqarida kimdir u haqda bilishidan oldin ko'rinadi.",
            outbox: "Provayderga chaqiruv o'sha tranzaksiyada saqlangan ish: yo'qolmaydi va erta ishlamaydi.",
            reference: "Bizning id, chaqiruvdan oldin ma'lum; moslash uchun provayderning check id'si kerak emas.",
            "503": "\"Hozir emas, qayta urin\": provayder hodisani saqlaydi va qayta urinadi.",
            "never 200-and-drop": "200 natija saqlandi degani bo'lishi shart.",
            sweeper: "Umuman kelmaydigan callback'lar uchun xavfsizlik to'ri.",
          },
        },
      },
    },
  },
};

export default text;
