import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bazani replikatsiya qilish",
  summary:
    "Profil servisi bitta bazaga sig'may qoladi. O'qish uchun replika qo'shamiz, replikatsiya kechikishi va «o'z yozganingni o'qi» muammosiga duch kelamiz, liderni yo'qotamiz, failover qilamiz va sinxron replikatsiya bunga arziydimi — hal qilamiz.",
  learn: [
    "Lider o'z logini follower'larga qanday uzatadi va replikatsiya kechikishi nima",
    "Nega foydalanuvchi o'z yozganini ko'rmay qoladi va buni tuzatishning ikki yo'li",
    "Failover nima qiladi va nega asinxron replikatsiya commit'larni yo'qotishi mumkin",
    "Sinxron replikaning narxi",
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
      short: "Replikalar",
      title: "Ikki follower lider logini nusxalaydi",
      body: "Baza A lider bo'ladi: yozishni faqat u qabul qiladi. Baza B va Baza C — follower'lar. Har biri liderga ulanadi, write-ahead log'ni oqim sifatida oladi va o'sha ma'lumotni saqlash uchun uni qayta bajaradi.\n\nAPI yozishni liderga yuboradi, o'qishni ikki replika o'rtasida taqsimlaydi. Lider yuki 35% ga, p95 45 ms ga tushadi.",
      check: {
        q: "Endi o'qish replikalarga boradi. Foydalanuvchi yangi bio'ni saqlab, sahifani darhol yangilaydi. U nimani ko'rishi mumkin?",
        options: [
          "Yangi bio'ni: commit allaqachon o'tgan",
          "Replikalar yetib olguncha xatoni",
          "Eski bio'ni, chunki replika ortda",
        ],
        answer: 2,
        why: "Yozuv liderda commit bo'ladi, lekin yangilangan sahifa Baza B dan o'qiydi. Baza B 900 ms ortda, shuning uchun eski bio'ni qaytaradi.",
      },
      fields: {
        START_REPLICATION: "Follower log oqimini ma'lum joydan boshlab so'raydi.",
        SLOT: "Replikatsiya sloti: lider logni shu follower olmaguncha saqlab turadi.",
        lsn: "Log sequence number: lider logidagi joy. Follower'lar qayergacha bajarganini shu bilan aytadi.",
      },
    },
    stale: {
      short: "Eski o'qish",
      title: "Foydalanuvchi saqlaydi, yangilaydi va eski bio'ni ko'radi",
      body: "`u_42` foydalanuvchi bio'sini o'zgartiradi. Yozuv liderda commit bo'ladi. Sahifa yangilanadi va o'qish Baza B ga boradi.\n\nBaza B backup bilan band va 900 ms ortda. U eski bio'ni qaytaradi, foydalanuvchi esa saqlanmadi deb o'ylab qayta tahrirlaydi.",
      watch: "Asinxron replikalar doim biroz o'tmishda yashaydi. Savol faqat — qanchalik.",
      fields: {
        bio: "Hali ham `Backend dev`. Yangi matn liderda bor, bu yerda hali yo'q.",
        updated_at: "09:10:55: replika 09:14 dagi yozuvni hali bajarmagan.",
      },
    },
    lag: {
      short: "Kechikish",
      title: "Replikatsiya kechikishini o'lchash",
      body: "Lider har follower qayergacha yetganini biladi. Baza C 40 ms ortda. Backup bilan band Baza B esa 2,4 soniya ortda.\n\nKechikish o'zgarmas emas: replikadagi yuk, uzun so'rovlar va liderdagi katta yozish to'lqinlari bilan o'sadi. Endi o'qishlarning 5% i eski ma'lumot qaytaradi.",
      fields: {
        replay_lag: "Liderdagi commit va uning shu follower'da bajarilishi orasidagi vaqt.",
        db_b: "2,4 s ortda. Bu yerga ketgan har o'qish oxirgi 2,4 soniyadagi yozuvlarni ko'rmasligi mumkin.",
        db_c: "40 ms ortda: sog'lom, lekin baribir nol emas.",
      },
    },
    "read-your-writes": {
      short: "O'z yozganingni o'qi",
      title: "Read-your-writes: foydalanuvchining oxirgi yozuviga qarab yo'naltirish",
      body: "Yozuvdan keyin API shu foydalanuvchi sessiyasi uchun lider logidagi joyni eslab qoladi. Keyingi o'qishda replikadan so'raydi: shu joygacha bajardingmi?\n\nHa bo'lsa, replika javob beradi. Yo'q bo'lsa, shu foydalanuvchining o'qishi liderga boradi. Boshqa foydalanuvchilar replikadan o'qishda davom etadi. O'z ma'lumotini eski ko'rish nolga tushadi.",
      watch: "Soddaroq varianti: yozgandan keyin bir necha soniya foydalanuvchining o'qishini liderga yuborish.",
      fields: {
        pg_last_wal_replay_lsn: "Bu replika logni qayergacha bajargani.",
        caught_up: "`f` — replika shu foydalanuvchi yozuvidan ortda, o'qish liderga ketadi.",
      },
    },
    "leader-dies": {
      short: "Lider o'ldi",
      title: "Lider ishdan chiqadi",
      body: "Baza A ning diski buziladi. O'qish replikalarda ishlab turibdi, lekin har bir yozish xato beradi.\n\nReplikalar log oqimini yarim yo'lda olmay qoldi. Ularning hech biri hali yozish qabul qilishga haqli emas.",
      check: {
        q: "Eng yangi replikani lider qilamiz. Replikatsiya asinxron edi. Liderning oxirgi tasdiqlangan commit'lari nima bo'ladi?",
        options: [
          "Hammasi saqlanadi: eng yangi replikada bor",
          "Bir qismi yo'qoladi: replikaga yetmagan",
          "Yangi lider ularni Baza A diskidan qayta bajaradi",
        ],
        answer: 1,
        why: "Baza C lider bo'ladi, lekin Baza A hech bir replika olmagan 12 ta commit'ni tasdiqlab bo'lgan. O'sha foydalanuvchilarga «saqlandi» deyilgan, ma'lumoti esa yo'q.",
      },
      fields: {
        UPDATE: "Yozish. Uni faqat lider qabul qiladi, lider esa yo'q.",
        "Connection refused": "API qayta urinishda davom etadi, foydalanuvchilar saqlashda xato ko'radi.",
      },
    },
    failover: {
      short: "Failover",
      title: "Failover: eng yangi replikani ko'tarish",
      body: "Failover menejeri Baza A ni 30 soniya kuzatdi, javob yo'q. U logni eng ko'p bajargan replika — Baza C ni tanlaydi va lider qilib ko'taradi. API yozishni Baza C ga yuboradi, Baza B endi Baza C ga ergashadi.\n\nLekin replikatsiya asinxron edi. Baza A hech bir replikaga yetib bormagan 12 ta commit'ni tasdiqlab bo'lgan. O'sha foydalanuvchilarga «saqlandi» deyilgan, ma'lumoti esa yo'q.",
      watch: "Asinxron replikatsiyada failover allaqachon tasdiqlangan yozuvlarni yo'qotishi mumkin.",
      fields: {
        candidates: "Har replika oxirgi bajargan joyi. Eng yangisi eng kam yo'qotadi.",
        promote: "Baza C logni bajarishni to'xtatadi va yozish qabul qila boshlaydi.",
        timeline: "8 dan yangi tarix tarmog'i boshlanadi, eski lider logi aralashib keta olmaydi.",
        "commits lost": "O'lgan lider logi bilan yangi lider logi orasidagi farq.",
      },
    },
    rejoin: {
      short: "Qaytish",
      title: "Eski lider follower bo'lib qaytadi",
      body: "Baza A ga yangi disk qo'yiladi va u ishga tushadi. U yozish qabul qilmasligi shart: har xil yozuvlarni qabul qiladigan ikki lider — split brain, va bu ma'lumotni hech qachon birlashtirib bo'lmaydi.\n\nUni o'z tarixi va yangi lider tarixi ajralgan nuqtaga qaytaramiz, ortiqcha 12 commit'ini tashlaymiz va Baza C ning follower'i sifatida ishga tushiramiz.",
      watch: "Eski lider qaytishidan oldin uni izolyatsiya qiling (fencing): yozishini bloklang, aks holda u bajonidil qabul qiladi.",
      fields: {
        pg_rewind: "Yangi lider tarixiga moslash uchun faqat o'zgargan bloklarni qayta ko'chiradi.",
        timeline: "Eski lider 7-timeline'da, yangisi 8-da. Ajralish nuqtasi — ular kelishgan oxirgi joy.",
        rewinding: "Ajralish nuqtasidan keyingi hamma narsa Baza A da bekor qilinadi.",
        replica: "Baza A endi ergashadi. Klasterda yana bitta lider.",
      },
    },
    sync: {
      short: "Sinxron replika",
      title: "Bitta sinxron replika: tasdiqlangan yozuv yo'qolmaydi",
      body: "Liderni kutishga majbur qilamiz: commit faqat ikki follower'dan kamida bittasi logni diskka yozgandan keyin tasdiqlanadi. Lider endi o'lsa, qaysidir follower'da har bir tasdiqlangan commit bor.\n\nNarxi: har yozuv tarmoq bo'ylab borib-kelishni kutadi, bu yerda taxminan 3 ms. Ikkala follower ham ishlamasa, yozish yo'qotish xavfi o'rniga to'xtaydi.",
      fields: {
        synchronous_standby_names: "Qaysi follower'lar commit'ni tasdiqlashi mumkin.",
        "ANY 1": "Ikkovidan istalgan bittasi yetarli. Hammasini kutish har yozuvni eng sekin replika darajasiga tushirardi.",
        pg_reload_conf: "Sozlamani qayta ishga tushirmasdan qo'llaydi.",
        COMMIT: "Endi bitta follower'ni kutishni ham o'z ichiga oladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Replikalar o'qish quvvatini va failover uchun zaxirani beradi. Yangi ma'lumotni bermaydi: asinxron replikalar kechikadi va kechikish yuk bilan o'sadi.\n\n1) Yozish liderga, o'qish replikalarga. 2) Kechikishni o'lchang va yozuvdan so'ng foydalanuvchining o'qishini liderga yo'naltiring. 3) Failover eng yangi replikani ko'taradi va eski liderni izolyatsiya qilishi shart. 4) Asinxron rejim tasdiqlangan commit'larni yo'qotishi mumkin; bitta sinxron replika buni kechikish evaziga oldini oladi.",
    },
  },
  scenarios: {
    "split-brain": {
      label: "Fencing'siz",
      steps: {
        "sb-return": {
          short: "Eski leader",
          title: "Eski leader ishga tushib, yozuvlarni qabul qiladi",
          body: "DB A yangi disk oladi va kimdir uni fence qilishidan oldin ishga tushadi. U hali ham o'zini leader deb biladi va yozuvlarni qabul qiladi.\n\nBitta API serverning connection pool'i hali ham DB A ga qaragan. `u_42` foydalanuvchi bio'sini o'zgartiradi, yozuv DB A ga tushadi va API \"saqlandi\" deb javob beradi.",
          check: {
            q: "Bir necha daqiqa DB A ham, DB C ham yozuv qabul qiladi. Keyin ikki tarixni birlashtirib bo'ladimi?",
            options: [
              "Ha: baza ularni vaqt bo'yicha birlashtiradi",
              "Ha: replica'lar ikkala log'ni tartib bilan qayta ijro etadi",
              "Yo'q: bir tomonning yozuvlarini tashlab yuborishga to'g'ri keladi",
            ],
            answer: 2,
            why: "Har leader bir xil ayrilish nuqtasidan o'z log'ini qurdi. Baza qaysi `bio` to'g'ri ekanini bila olmaydi, shuning uchun qayta qo'shilish uchun bir tomon orqaga qaytariladi va u ayrilishdan keyin olgan har yozuv yo'qoladi.",
          },
          fields: {
            "UPDATE 1": "Yozuv muvaffaqiyatli, lekin noto'g'ri leader'da.",
            leader: "DB A failover haqida eshitmagan. Fence bo'lmasa, u yana leader bo'lib ishga tushadi.",
            pool: "Eski ulanishlar DNS yoki config o'zgarishiga o'zi ergashmaydi.",
          },
        },
        "sb-diverge": {
          short: "Split brain",
          title: "Ikki leader, ikki haqiqat",
          body: "Endi ikkita leader bor. Qaysi API serverga tushishiga qarab, ba'zi foydalanuvchilar DB C ga, ba'zilari DB A ga yozadi.\n\nBitta profilning ikki tomonda turli ma'lumoti bor. O'qishlarning 18% i foydalanuvchi oxirgi yozmagan narsani yoki yozgan, lekin boshqa tomonda qolgan narsani qaytaradi.",
          watch: "Split brain avariyadan yomonroq: ma'lumot ikkiga ayrilayotganda ikkala tomon ham sog'lom ko'rinadi.",
          fields: {
            bio: "Bitta foydalanuvchi uchun ikki xil qiymat, ikkalasi ham commit qilingan va tasdiqlangan.",
            updated_at: "DB A dagi yozuv yangiroq, lekin haqiqiy leader DB C. Vaqt hal qilmaydi.",
          },
        },
        "sb-end": {
          short: "Natija",
          title: "Natija: olti daqiqalik yozuvlar tashlab yuborildi",
          body: "Olti daqiqadan keyin kimdir sezadi, DB A ni to'xtatadi va DB C tarixiga qaytaradi. DB A ayrilish nuqtasidan keyin qabul qilgan hamma narsa o'chiriladi.\n\nOddiy yo'l bilan solishtiring: u yerda eski leader fence qilindi va follower bo'lib qaytdi, faqat yiqilishdagi 12 commit yo'qoldi. Bu yerda 322 ta tasdiqlangan yozuv yo'q bo'ldi.",
          watch: "Avval fence: eski leader ishga tushishidan oldin uning yozuvlarini bloklang, keyin follower qilib qo'shing.",
          fields: {
            pg_rewind: "DB A ni yangi leader tarixiga qaytaradi.",
            removed: "Faqat DB A da bor har commit bekor qilinadi.",
            "310 after": "Split brain paytida foydalanuvchilar qilgan yozuvlar. Ularga \"saqlandi\" deyilgan edi.",
          },
        },
      },
    },
  },
};

export default text;
