import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bazani replikatsiya qilish",
  summary:
    "Profil servisi bitta bazaga sig'may qoladi. O'qish uchun replica qo'shamiz, replikatsiya kechikishi va «o'z yozganingni o'qi» muammosiga duch kelamiz, leader'ni yo'qotamiz, failover qilamiz va sinxron replikatsiya bunga arziydimi — hal qilamiz.",
  learn: [
    "Leader o'z logini follower'larga qanday uzatadi va replikatsiya kechikishi nima",
    "Nega foydalanuvchi o'z yozganini ko'rmay qoladi va buni tuzatishning ikki yo'li",
    "Failover nima qiladi va nega asinxron replikatsiya commit'larni yo'qotishi mumkin",
    "Sinxron replica'ning narxi",
  ],
  nodes: {
    app: "Profil ilovasi",
    api: "Profil API",
    "db-a": "Baza A",
    "db-b": "Baza B",
    "db-c": "Baza C",
    sentinel: "Failover menejeri",
  },
  metrics: {
    p95: "So'rov p95",
    lag: "Eng katta kechikish",
    stale: "Eskirgan o'qishlar",
    lost: "Failover'da yo'qolgan commit'lar",
  },
  steps: {
    "one-db": {
      short: "Bitta baza",
      title: "Bitta baza barcha o'qish va yozishni oladi",
      body: "Har profilni ko'rish va har tahrir bitta bazaga — Baza A ga boradi. O'ndan to'qqiz so'rov — o'qish.\n\nEng qizg'in paytda baza yuki 95%, oddiy profil o'qish 640 ms. O'qishlar yozishlarni siqib chiqarmoqda.",
      fields: {
        user_id: "Birlamchi kalit bo'yicha qidiruv. O'zi arzon, server to'lib qolganda sekin.",
        Time: "Bitta qator uchun 640 ms: vaqt so'rovga emas, CPU va diskni kutishga ketmoqda.",
      },
    },
    replicas: {
      short: "Replica'lar",
      title: "Ikki follower leader logini nusxalaydi",
      body: "Baza A leader bo'ladi: yozishni faqat u qabul qiladi. Baza B va Baza C — follower'lar. Har biri leader'ga ulanadi, write-ahead log'ni oqim sifatida oladi va o'sha ma'lumotni saqlash uchun uni qayta bajaradi.\n\nAPI yozishni leader'ga yuboradi, o'qishni ikki replica o'rtasida taqsimlaydi. Leader yuki 35% ga, p95 45 ms ga tushadi.",
      fields: {
        START_REPLICATION: "Follower log oqimini ma'lum joydan boshlab so'raydi.",
        SLOT: "Replikatsiya sloti: leader logni shu follower olmaguncha saqlab turadi.",
        lsn: "Log sequence number: leader logidagi joy. Follower'lar qayergacha bajarganini shu bilan aytadi.",
      },
    },
    stale: {
      short: "Eski o'qish",
      title: "Foydalanuvchi saqlaydi, yangilaydi va eski bio'ni ko'radi",
      body: "`u_42` foydalanuvchi bio'sini o'zgartiradi. Yozuv leader'da commit bo'ladi. Sahifa yangilanadi va o'qish Baza B ga boradi.\n\nBaza B backup bilan band va 900 ms ortda. U eski bio'ni qaytaradi, foydalanuvchi esa saqlanmadi deb o'ylab qayta tahrirlaydi.",
      watch: "Asinxron replica'lar doim biroz o'tmishda yashaydi. Savol faqat — qanchalik.",
      fields: {
        bio: "Hali ham `Backend dev`. Yangi matn leader'da bor, bu yerda hali yo'q.",
        updated_at: "09:10:55: replica 09:14 dagi yozuvni hali bajarmagan.",
      },
    },
    lag: {
      short: "Kechikish",
      title: "Replikatsiya kechikishini o'lchash",
      body: "Leader har follower qayergacha yetganini biladi. Baza C 40 ms ortda. Backup bilan band Baza B esa 2,4 soniya ortda.\n\nKechikish o'zgarmas emas: replica'dagi yuk, uzun so'rovlar va leader'dagi katta yozish to'lqinlari bilan o'sadi. Endi o'qishlarning 5% i eski ma'lumot qaytaradi.",
      fields: {
        replay_lag: "Leader'dagi commit va uning shu follower'da bajarilishi orasidagi vaqt.",
        db_b: "2,4 s ortda. Bu yerga ketgan har o'qish oxirgi 2,4 soniyadagi yozuvlarni ko'rmasligi mumkin.",
        db_c: "40 ms ortda: sog'lom, lekin baribir nol emas.",
      },
    },
    "read-your-writes": {
      short: "O'z yozganingni o'qi",
      title: "Read-your-writes: foydalanuvchining oxirgi yozuviga qarab yo'naltirish",
      body: "Yozuvdan keyin API shu foydalanuvchi sessiyasi uchun leader logidagi joyni eslab qoladi. Keyingi o'qishda replica'dan so'raydi: shu joygacha bajardingmi?\n\nHa bo'lsa, replica javob beradi. Yo'q bo'lsa, shu foydalanuvchining o'qishi leader'ga boradi. Boshqa foydalanuvchilar replica'dan o'qishda davom etadi. O'z ma'lumotini eski ko'rish nolga tushadi.",
      watch: "Soddaroq varianti: yozgandan keyin bir necha soniya foydalanuvchining o'qishini leader'ga yuborish.",
      fields: {
        pg_last_wal_replay_lsn: "Bu replica logni qayergacha bajargani.",
        caught_up: "`f` — replica shu foydalanuvchi yozuvidan ortda, o'qish leader'ga ketadi.",
      },
    },
    "leader-dies": {
      short: "Leader o'ldi",
      title: "Leader ishdan chiqadi",
      body: "Baza A ning diski buziladi. O'qish replica'larda ishlab turibdi, lekin har bir yozish xato beradi.\n\nReplica'lar log oqimini yarim yo'lda olmay qoldi. Ularning hech biri hali yozish qabul qilishga haqli emas.",
      fields: {
        UPDATE: "Yozish. Uni faqat leader qabul qiladi, leader esa yo'q.",
        "Connection refused": "API qayta urinishda davom etadi, foydalanuvchilar saqlashda xato ko'radi.",
      },
    },
    failover: {
      short: "Failover",
      title: "Failover: eng yangi replica'ni ko'tarish",
      body: "Failover menejeri Baza A ni 30 soniya kuzatdi, javob yo'q. U logni eng ko'p bajargan replica — Baza C ni tanlaydi va leader qilib ko'taradi. API yozishni Baza C ga yuboradi, Baza B endi Baza C ga ergashadi.\n\nLekin replikatsiya asinxron edi. Baza A hech bir replica'ga yetib bormagan 12 ta commit'ni tasdiqlab bo'lgan. O'sha foydalanuvchilarga «saqlandi» deyilgan, ma'lumoti esa yo'q.",
      watch: "Asinxron replikatsiyada failover allaqachon tasdiqlangan yozuvlarni yo'qotishi mumkin.",
      fields: {
        candidates: "Har replica oxirgi bajargan joyi. Eng yangisi eng kam yo'qotadi.",
        promote: "Baza C logni bajarishni to'xtatadi va yozish qabul qila boshlaydi.",
        timeline: "8 dan yangi tarix tarmog'i boshlanadi, eski leader logi aralashib keta olmaydi.",
        "commits lost": "O'lgan leader logi bilan yangi leader logi orasidagi farq.",
      },
    },
    rejoin: {
      short: "Qaytish",
      title: "Eski leader follower bo'lib qaytadi",
      body: "Baza A ga yangi disk qo'yiladi va u ishga tushadi. U yozish qabul qilmasligi shart: har xil yozuvlarni qabul qiladigan ikki leader — split brain, va bu ma'lumotni hech qachon birlashtirib bo'lmaydi.\n\nUni o'z tarixi va yangi leader tarixi ajralgan nuqtaga qaytaramiz, ortiqcha 12 commit'ini tashlaymiz va Baza C ning follower'i sifatida ishga tushiramiz.",
      watch: "Eski leader qaytishidan oldin uni izolyatsiya qiling (fencing): yozishini bloklang, aks holda u bajonidil qabul qiladi.",
      fields: {
        pg_rewind: "Yangi leader tarixiga moslash uchun faqat o'zgargan bloklarni qayta ko'chiradi.",
        timeline: "Eski leader 7-timeline'da, yangisi 8-da. Ajralish nuqtasi — ular kelishgan oxirgi joy.",
        rewinding: "Ajralish nuqtasidan keyingi hamma narsa Baza A da bekor qilinadi.",
        replica: "Baza A endi ergashadi. Klasterda yana bitta leader.",
      },
    },
    sync: {
      short: "Sinxron replica",
      title: "Bitta sinxron replica: tasdiqlangan yozuv yo'qolmaydi",
      body: "Leader'ni kutishga majbur qilamiz: commit faqat ikki follower'dan kamida bittasi logni diskka yozgandan keyin tasdiqlanadi. Leader endi o'lsa, qaysidir follower'da har bir tasdiqlangan commit bor.\n\nNarxi: har yozuv tarmoq bo'ylab borib-kelishni kutadi, bu yerda taxminan 3 ms. Ikkala follower ham ishlamasa, yozish yo'qotish xavfi o'rniga to'xtaydi.",
      fields: {
        synchronous_standby_names: "Qaysi follower'lar commit'ni tasdiqlashi mumkin.",
        "ANY 1": "Ikkovidan istalgan bittasi yetarli. Hammasini kutish har yozuvni eng sekin replica darajasiga tushirardi.",
        pg_reload_conf: "Sozlamani qayta ishga tushirmasdan qo'llaydi.",
        COMMIT: "Endi bitta follower'ni kutishni ham o'z ichiga oladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Replica'lar o'qish quvvatini va failover uchun zaxirani beradi. Yangi ma'lumotni bermaydi: asinxron replica'lar kechikadi va kechikish yuk bilan o'sadi.\n\n1) Yozish leader'ga, o'qish replica'larga. 2) Kechikishni o'lchang va yozuvdan so'ng foydalanuvchining o'qishini leader'ga yo'naltiring. 3) Failover eng yangi replica'ni ko'taradi va eski leader'ni izolyatsiya qilishi shart. 4) Asinxron rejim tasdiqlangan commit'larni yo'qotishi mumkin; bitta sinxron replica buni kechikish evaziga oldini oladi.",
    },
  },
};

export default text;
