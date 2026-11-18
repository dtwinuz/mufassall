import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Pulni qaytarish va chargeback",
  summary:
    "Do'kon pulni ikki yo'l bilan qaytaradi: o'zi to'liq yoki qisman refund qiladi, yoki karta egasining banki pulni chargeback orqali majburan qaytarib oladi. Ikkalasi ham \"qandaydir summani ayirish\"dek ko'rinadi va ikkalasi bir xil joylarda sinadi: tahrirlangan to'lov qatori, ikki marta yuborilgan bosish, bir vaqtda qaytarayotgan ikki xodim, faqat keyinroq webhook bilan keladigan status va hech kim kuzatmagan dispute muddati.",
  learn: [
    "Nega refund alohida yozuv va alohida buxgalteriya provodkasi bo'ladi, asl to'lov esa hech qachon tahrirlanmaydi",
    "Idempotency kaliti va shartli update refund'ni ikki marta yoki olingan summadan ortiq to'lanishidan qanday saqlaydi",
    "Asinxron tugaydigan refund statuslari: pending, succeeded, failed va ikki marta yoki noto'g'ri tartibda keladigan webhook'lar",
    "Chargeback hayot sikli: dispute ochilishi, pulni ushlab turish, muddatgacha dalil yuborish, yutish yoki yutqazish va provayder hisoboti bilan kunlik solishtirish",
  ],
  nodes: {
    support: "Support xodimi",
    support2: "Ikkinchi xodim",
    api: "Refund servisi",
    db: "To'lovlar bazasi",
    provider: "Karta provayderi",
    issuer: "Emitent bank",
    recon: "Kunlik solishtirish",
  },
  metrics: {
    dups: "Ikki marta to'langan refund",
    over: "Olingandan ortiq refund",
    stuck: "Statusi noto'g'ri refund",
    cblost: "Yutqazilgan chargeback",
    drift: "Mos kelmagan hisobot qatorlari",
  },
  steps: {
    captured: {
      short: "To'langan",
      title: "To'langan buyurtma va qaytarilgan tovar",
      body: "`ord_5120` buyurtmasi karta bilan to'langan: 4 500.00, bazada `450000` minor birlik. Pul yechib olingan, tovar jo'natilgan.\n\nMijoz 1 500.00 lik bitta tovarni qaytaradi. Support xodimi to'lovni ochib, \"Refund\" tugmasini bosadi. Savol shuki, bu tugma bazaga aynan nima yozadi.",
      fields: {
        captured_minor: "Provayder kartadan haqiqatan qancha yechgani, tiyinlarda.",
        captured: "To'lov yakunlangan: pul o'tgan, uni faqat qaytarish mumkin, bekor qilib bo'lmaydi.",
        "**** 4417": "Faqat oxirgi to'rt raqam saqlanadi va ko'rsatiladi; to'liq karta raqami do'konga umuman kelmaydi.",
        "1 500.00": "Qisman refund: uchta tovardan bittasi.",
      },
    },
    edit: {
      short: "Tahrir",
      title: "Refund to'lovning ustidan yoziladi",
      body: "Birinchi versiya shunchaki yechilgan summani kamaytiradi va statusni o'zgartiradi. Ko'rinishi tartibli: bitta qator, bugungi jami to'g'ri.\n\nLekin 4 500.00 yechilgani haqidagi fakt yo'qoldi. O'tgan oyning tushum hisoboti buxgalterga yuborilgan raqamdan boshqacha chiqadi, ikkinchi qisman refund avval qancha qaytarilganini bilolmaydi, provayder hisobotida esa do'kondagi bitta qator o'rniga ikkita qator bor. Oyiga 38 ta hisobot qatori mos kelmay qoladi.",
      watch: "Refund ikkinchi pul harakati, ko'pincha boshqa kunda va boshqa oyda. Unga alohida qator kerak.",
      fields: {
        captured_minor: "Tarixiy fakt ustidan yozib yuborildi.",
        status: "Bitta status \"4 500 yechildi, shundan 1 500 qaytarildi\" ni tasvirlay olmaydi.",
        "revenue report": "Yopilgan davr hisobot topshirilgandan keyin o'zgaradi.",
        "-1 500.00": "Provayder ikkala harakatni saqlaydi; do'konda esa faqat farqi qoldi.",
      },
    },
    entry: {
      short: "Refund qatori",
      title: "Refund yangi yozuv va yangi provodka",
      body: "Refund o'z id'si, summasi, sababi va statusi bilan alohida qator oladi, unga ishora qiluvchi teskari ishorali provodka ham yoziladi. To'lov qatori qanday bo'lsa, shunday qoladi.\n\nTo'liq yoki qisman endi faqat summa masalasi: 450000 lik bitta refund yoki bir nechta kichigi. Yana qancha qaytarish mumkinligi = yechilgan summa minus muvaffaqiyatli yoki hali pending refund'lar.",
      check: {
        q: "Ertaga mijoz ikkinchi tovarni ham qaytaradi. Do'kon yana qancha qaytarish mumkinligini qanday biladi?",
        options: [
          "To'lovning hozirgi summasini o'qiydi",
          "Yechilgan summa minus pending yoki succeeded refund'lar yig'indisi",
          "Yechilgan summa minus faqat succeeded refund'lar",
        ],
        answer: 1,
        why: "Pending refund'lar provayderga allaqachon va'da qilingan va hali muvaffaqiyatli tugashi mumkin. Ular hisobga olinmasa, baribir chiqib ketadigan pul hisobidan ikkinchi refund tasdiqlanib ketadi. Failed refund esa summani qaytarib beradi.",
      },
      fields: {
        refunds: "Har refund urinishiga bitta qator, qaysi to'lovga tegishli ekani bilan.",
        amount_minor: "Qisman yoki to'liq ekani faqat shu raqam.",
        pending: "Provayderga yuborildi, yakuniy javob keyin keladi.",
        journal: "Yig'indisi nolga teng teskari provodkalar, refund'ga ishora bilan.",
        "never touched": "Asl to'lov nima bo'lganining yozuvi bo'lib qoladi.",
      },
    },
    twice: {
      short: "Ikki marta",
      title: "Timeout va ikkinchi bosish",
      body: "Provayder sekin, so'rov 10 s dan keyin timeout bilan tugaydi. Xodim xatoni ko'radi va \"Refund\" ni yana bosadi. Ikkala so'rov ham provayderga yetib borgan va ikkala refund ham bajarilgan.\n\nMijoz 1 500.00 lik tovar uchun 3 000.00 oladi. Xodimlar, qayta urinishlar va mobil ilova hisobiga bu oyiga 14 marta bo'ladi.",
      watch: "Timeout \"bajarilmadi\" degani emas. U \"noma'lum\" degani.",
      fields: {
        timeout: "Do'kon kutishni to'xtatdi; provayder ishlashni to'xtatmadi.",
        again: "O'sha refund uchun ikkinchi, mustaqil so'rov.",
        re_51A: "Provayderda ikkita refund id'si: ikkita haqiqiy pul harakati.",
        "3 000.00": "Qaytarilishi kerak bo'lganning ikki barobari.",
      },
    },
    idem: {
      short: "Kalit",
      title: "Refund id'si idempotency kaliti bo'ladi",
      body: "Servis avval `rf_2208` refund qatorini saqlaydi, keyin provayderni `Idempotency-Key: rf_2208` bilan chaqiradi. Shu refund'ning har bir qayta urinishi, xodimdanmi, fon ishidanmi yoki tarmoqdanmi, bir xil kalitni yuboradi.\n\nProvayder kalitni taniydi va yangisini qilish o'rniga allaqachon qilgan refund'ini qaytaradi. Do'kon har doim qaysi provayder refund'i o'zining qaysi refund'iga tegishli ekanini biladi.",
      check: {
        q: "Yiqilishdan keyingi qayta urinish ham o'sha kalitni yuborishi uchun kalit qayerdan olinadi?",
        options: [
          "Har HTTP so'rov uchun yangi tasodifiy qiymat",
          "Provayder chaqirilishidan oldin saqlangan refund qatorining id'si",
          "To'lov id'si",
        ],
        answer: 1,
        why: "Har so'rov uchun yasalgan kalit har urinishda boshqacha bo'ladi, demak hech narsani himoya qilmaydi. To'lov id'si esa o'sha to'lovning har ikkinchi qisman refund'ini to'sib qo'yadi. Refund qatori chaqiruvdan oldin mavjud va yiqilishdan omon qoladi, shuning uchun har qayta urinish uni topib, qayta ishlatadi.",
      },
      fields: {
        "Idempotency-Key": "Bitta refund'ning hamma urinishlari uchun bir xil qiymat.",
        "Idempotent-Replayed": "Provayder xotirasidan javob berdi: yangi refund qilinmadi.",
        id: "Provayderning refund id'si, rf_2208 yonida saqlanadi.",
        status: "Hali yakuniy emas: refund'lar asinxron tugaydi.",
      },
    },
    race: {
      short: "Poyga",
      title: "Ikki xodim bir vaqtda qaytaradi",
      body: "Birinchi refund'dan keyin 300000 qoldi. Ikki xodim bitta buyurtma bo'yicha ikkita shikoyatni ko'rib chiqadi. Har biri refund'lar yig'indisini o'qiydi, 150000 ni ko'radi, 200000 sig'adi deb qaror qiladi va commit qiladi.\n\nBirgalikda ular 450000 lik to'lovdan 550000 qaytarishadi. Provayder ham buni qabul qilishi mumkin: ko'plari limitni jami emas, har bir refund bo'yicha tekshiradi. Oyiga 6 marta farq do'konning o'z cho'ntagidan chiqadi.",
      fields: {
        "left 300000": "Keyingi barcha refund'lar uchun birgalikdagi haqiqiy limit.",
        "SELECT sum": "Avval o'qib, keyin qaror qiladigan tekshiruv: oraga boshqa yozuvchi kirib olishi mumkin.",
        COMMIT: "Ikkala tranzaksiya ham alohida olganda to'g'ri.",
        "550000": "Umuman olinganidan ko'proq pul qaytarildi.",
      },
    },
    guard: {
      short: "Himoya",
      title: "Tekshirish va band qilish bitta buyruqda",
      body: "To'lov `refunded_minor` hisoblagichini saqlaydi. Refund uni `WHERE` ida limit bo'lgan `UPDATE` bilan oshiradi, refund qatorini qo'shadigan o'sha tranzaksiyaning ichida. Summa provayder chaqirilishidan oldin band qilinadi.\n\nBaza qatorga lock qo'yadi: B xodim A ni kutadi, shartni A ning yangi qiymati bilan qayta tekshiradi va 0 ta qatorni yangilaydi. B \"faqat 100000 qoldi\" degan javob oladi. Tekshiruvdan oldingi `SELECT ... FOR UPDATE` ham xuddi shu ishni qiladi.",
      watch: "Agar provayder keyin `failed` desa, summani yana ayiring: band qilingan pul bo'shatiladi.",
      check: {
        q: "Nega limitni ilova kodida mutex ostida tekshirmaslik kerak?",
        options: [
          "Server bitta bo'lsa, bu bemalol ishlaydi",
          "Refund'larni bir nechta server va fon ishlari yozadi; ularning hammasini faqat baza ko'radi",
          "Mutex qator lock'idan sekinroq",
        ],
        answer: 1,
        why: "Refund'lar paneldan, fon ishlaridan va servisning bir nechta replikasidan keladi. Bitta jarayondagi lock boshqalarni ko'rmaydi. Bazadagi qator har bir yozuvchi o'tadigan yagona joy.",
      },
      fields: {
        refunded_minor: "Pending va succeeded refund'lar jami, to'lovning o'zida.",
        "<= captured_minor": "Limit, yozish paytida baza tomonidan tekshiriladi.",
        "UPDATE 1": "Summa sig'di va endi band qilindi.",
        "row lock": "B, A commit qilguncha kutadi, keyin A ning qiymatini ko'radi.",
        "UPDATE 0": "Hech narsa o'zgarmadi: refund pul harakatlanishidan oldin rad etildi.",
      },
    },
    async: {
      short: "Webhook",
      title: "Provayder keyinroq javob beradi",
      body: "Provayder `re_51A` ni `pending` sifatida qabul qildi. Pul karta tarmoqlari orqali qaytadi, bu bir necha daqiqadan bir necha kungacha cho'ziladi. Yakuniy javob imzolangan webhook bo'lib keladi: `refund.succeeded` yoki `refund.failed`.\n\nBu safar karta yopilgan ekan. Servis refund'ni failed deb belgilaydi, 150000 ni `refunded_minor` dan qaytarib ayiradi va mijozga pulni boshqa yo'l bilan to'lash uchun vazifa ochadi. Webhook umuman kelmay qolsa, fon ishi 3 kundan ortiq pending turgan refund'larni provayderdan so'raydi.",
      fields: {
        event_id: "Har hodisada noyob: takrorlarni tashlash uchun kalit.",
        type: "Provayder xabar qilayotgan yangi status.",
        refund: "Qaysi refund haqida: rf_2208 bilan birga saqlangan id.",
        failure_reason: "Pul nega qaytmadi: keyingi qadam shunga bog'liq.",
      },
    },
    dispute: {
      short: "Dispute",
      title: "Mijozning banki pulni qaytarib oladi",
      body: "Boshqa mijoz bankiga tovar kelmadi deb yozadi. Bank chargeback ochadi: provayder do'kondan darhol 4 500.00 ni yechadi va 15.00 jarima qo'shadi. Do'konda dalil yuborish uchun 25-sanagacha vaqt bor.\n\nHodisa hech kim o'qimaydigan pochta qutisiga tushadi. Muddat o'tadi, dispute javobsiz yutqaziladi. Chargeback'larning 71% i yutqaziladi, ko'pchiligi birorta javobsiz.",
      watch: "Chargeback do'kon o'zi tanlagan refund emas: pul allaqachon chiqib ketgan, sukut esa rozilik hisoblanadi.",
      check: {
        q: "Dispute ochiq turganda mijoz support'ga yozib, refund so'raydi. Support nima qilishi kerak?",
        options: [
          "Mijoz xursand bo'lishi uchun darhol refund qilish",
          "Refund qilmaslik: dispute'ga javob berish yoki uni qabul qilish, shunda pul faqat bir marta qaytadi",
          "Refund qilib, dispute'ni ham yopish",
        ],
        answer: 1,
        why: "Bank mijoz uchun pulni allaqachon olib bo'lgan. Ustiga refund qilinsa, pul ikkinchi marta qaytadi va do'kon uni qaytarib ololmaydi. Ochiq dispute'li to'lovda refund'ni bloklang; do'kon mijozga qo'shilsa, uning o'rniga dispute'ni qabul qiladi.",
      },
      fields: {
        reason: "Bankning sabab kodi qaysi dalil inobatga olinishini belgilaydi.",
        amount: "Do'kondan oxirida emas, darhol yechiladi.",
        fee: "Do'kon yutsa ham olinadi.",
        evidence_due_by: "Shu paytdan keyin provayder do'konsiz qaror qiladi.",
        pan: "Karta raqami yashirilgan; buyurtmani topish uchun to'lov id'si yetarli.",
      },
    },
    evidence: {
      short: "Dalil",
      title: "Pulni ushlab tur, muddatgacha javob ber",
      body: "Dispute o'z qatori va statusini oladi: `needs_response`, `under_review`, keyin `won` yoki `lost`. Buxgalteriya 4 515.00 ni `disputes_held` hisobiga o'tkazadi, shunda do'kon balansi o'zida qolmasligi mumkin bo'lgan pulni alohida ko'rsatadi.\n\n1-kuni jamoaga muddat ko'rsatilgan vazifa boradi: trek raqami, yetkazib berish surati, mijoz bilan yozishmalar. 5-kuni bo'sh qolgan vazifa ogohlantirish beradi. Yutqazilgan chargeback'lar 71% dan 24% ga tushadi.",
      fields: {
        needs_response: "Soat yurib turibdi, do'kon harakat qilishi kerak.",
        due_by: "Dispute bilan birga saqlanadi, ogohlantirishlar undan foydalanadi.",
        disputes_held: "Olingan, lekin hali butunlay yo'qotilmagan pul: erkin balansdan alohida.",
        "day 5": "Muddatdan ikki kun oldin, hujjat yig'ishga yetarli.",
        won: "Pul qaytadi: teskari provodka ushlab turishni bekor qiladi.",
        lost: "Ushlab turilgan summa zararga aylanadi, jarima ham.",
      },
    },
    report: {
      short: "Hisobot",
      title: "Har kuni provayder hisoboti bilan solishtir",
      body: "Har tong fon ishi provayderning refund va dispute'lar hisobotini yuklaydi va har bir qatorni provayder id'si bo'yicha moslaydi. Ko'p qatorlar mos keladi.\n\nIkkitasi mos kelmaydi: webhook yo'qolgani uchun do'kon hali pending deb hisoblayotgan refund, va kimdir provayder panelida qo'lda qilgan, do'konda umuman qatori yo'q refund. Birinchisi avtomatik tuzatiladi, ikkinchisi odamga beriladi.",
      fields: {
        "provider report": "Provayderning haqiqatan nima harakatlangani haqidagi o'z ro'yxati.",
        "missed webhook": "Tuzatish xavfsiz: provayderdagi status yakuniy.",
        "provider panel": "Tizimdan tashqarida qilingan refund: qatorini yarating, sababini aniqlang.",
        "421": "Tanlab emas, har bir qator tekshiriladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Pulni qaytarishning olti qoidasi.\n\n1) Refund yangi qator va yangi provodka; bo'lib o'tgan to'lov hech qachon tahrirlanmaydi. 2) Refund qatorining id'si provayderga har bir chaqiruv uchun idempotency kaliti. 3) Limitni tekshirish va summani band qilish bitta shartli update'da yoki qator lock'i ostida: pending va succeeded jami hech qachon yechilgan summadan oshmasin. 4) Refund'lar asinxron tugaydi; yakuniy statusni imzolangan webhook'lardan, faqat oldinga qarab oling, pending'da qolib ketganlarini provayderdan so'rang. 5) Chargeback'ning muddati bor: pulni ushlab turing, vaqtida dalil bilan javob bering va dispute'dagi to'lovni refund qilmang. 6) Refund va dispute'larni har kuni provayder hisoboti bilan solishtiring.",
    },
  },
  scenarios: {
    "hook-twice": {
      label: "Ikki webhook",
      steps: {
        "hook-mess": {
          short: "Tartibsiz",
          title: "Bir webhook ikki marta, eskisi esa kechikib",
          body: "Provayder `re_70D` uchun `refund.succeeded` yuboradi. Ikki soniyadan keyin undan oldingi `refund.pending` keladi: provayder navbatida kutib qolgan 10:00 dagi qayta urinish. Keyin `succeeded` yana keladi, chunki birinchi yetkazishga javob yo'qolgan.\n\nHandler shunchaki hodisadagi statusni ko'chiradi va har safar provodka yozadi. Refund endi abadiy `pending` ko'rinadi, uning provodkasi esa buxgalteriyada ikki marta turibdi.",
          check: {
            q: "`refund.succeeded` dan keyin kelgan `refund.pending` bilan handler nima qilishi kerak?",
            options: [
              "Qo'llash: eng oxirgi kelgani haqiqat",
              "E'tiborsiz qoldirish: status faqat oldinga yuradi, succeeded esa yakuniy",
              "Provayderdan yana so'rab, uchinchi webhook'ni kutish",
            ],
            answer: 1,
            why: "Kelish tartibi hodisalar tartibi emas. Refund statuslari kichik holat mashinasi: pending succeeded yoki failed ga o'tadi, bular esa yakuniy. Faqat kutilgan holatdan ruxsat berilgan update kechikkan hodisalarni zararsiz qiladi.",
          },
          fields: {
            "refund.succeeded": "Yakuniy javob, birinchi bo'lib keldi.",
            "a retry": "Kechikib yetkazilgan eski hodisa: kelish tartibi hodisalar tartibi emas.",
            "the same event": "Hodisa id'si bir xil: at-least-once yetkazish.",
            "posted twice": "Har nusxada yon ta'sir takrorlandi.",
          },
        },
        "hook-order": {
          short: "Faqat oldinga",
          title: "Nusxalarni tashla, faqat oldinga yur",
          body: "Bitta tranzaksiyada handler avval hodisa id'sini yozadi; nusxa unique kalitga urilib, to'xtaydi. Keyin refund'ni faqat `pending` holatidan yangilaydi. Provodkani esa faqat shu update haqiqatan qatorni o'zgartirganda yozadi.\n\nIkkinchi `succeeded` nusxa sifatida tashlanadi, kechikkan `pending` 0 ta qatorni yangilaydi. Refund succeeded, provodka bir marta yozilgan.",
          fields: {
            processed_events: "Qo'llangan har bir hodisa id'si, ta'siri bilan birga commit qilinadi.",
            "ON CONFLICT": "Nusxa hech narsani o'zgartirmaydi.",
            "status = 'pending'": "Update faqat oldingi holatdan ruxsat etiladi.",
            "1 row": "O'tish haqiqatan bo'ldi: endi provodkani yoz.",
            "UPDATE 0": "Kechikkan yoki takroriy hodisa, zararsiz.",
          },
        },
      },
    },
  },
};

export default text;
