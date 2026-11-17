import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Batch va stream",
  summary:
    "Reklama tarmog'i reklama beruvchiga hisob chiqarish va byudjet tugaganda reklamani to'xtatish uchun kliklarni sanaydi. Tungi job oddiy, lekin bir kun kechikadi; stream yangi, lekin vaqt, kech kelgan hodisalar va takrorlar bilan kurashishi kerak.",
  learn: [
    "Tungi batch job nima beradi va uning kechikishi nimaga tushadi",
    "Tumbling va sliding oynalar, har biri nima uchun",
    "Kech kelgan hodisalar, event time va watermark",
    "At-least-once yetkazish va idempotent yozuv aynan bir martalik natija beradi",
  ],
  nodes: {
    app: "Ilovalar",
    collector: "Klik yig'uvchi",
    files: "Xom klik fayllari",
    nightly: "Tungi job",
    stats: "Statistika bazasi",
    ads: "Reklama serveri",
    topic: "Klik topic'i",
    stream: "Stream protsessor",
  },
  metrics: {
    lag: "Sanoq kechikishi",
    overspend: "Byudjetdan oshish",
    miscount: "Noto'g'ri sanalgan",
  },
  steps: {
    nightly: {
      short: "Tungi",
      title: "Tungi job kechagi kunni sanaydi",
      body: "Ilovalar kliklarni yig'uvchiga yuboradi, u ularni fayllarga qo'shib boradi. Soat 02:00 da job kechagi barcha fayllarni o'qiydi, reklama bo'yicha guruhlaydi va jamini yozadi.\n\nBu oddiy va tuzatish oson: kodda xato bo'lsa, qayta ishga tushirasiz va kun qayta yoziladi. Narxi — yangilik: raqamlar bir kungacha kechikadi.",
      check: {
        q: "Reklama serveri kunlik $50 byudjet tugagach reklamani to'xtatadi. Reklama 10:00 da mashhur bo'lib ketdi. Nima bo'ladi?",
        options: [
          "Byudjet tugashi bilan daqiqalar ichida to'xtaydi",
          "Kun bo'yi ko'rsatiladi: sarf hamon $0 ko'rinadi",
          "Tungi job qayta sanaguncha to'xtatib turiladi",
        ],
        answer: 1,
        why: "Byudjet tekshiruvi kechagi tungi ishga tushirish statistikasini o'qiydi, bugungi sarf 0.00 ko'rinadi. Reklama byudjetini bir soatda yoqib, kun bo'yi ko'rsatildi: tarmoq hisob chiqara olmaydigan $340.",
      },
      fields: {
        OVERWRITE: "Job butun kunni almashtiradi. Ikki marta ishga tushirsa ham natija bir xil, ikki barobar emas.",
        PARTITION: "Har kunga bitta partition. Qayta ishga tushirish faqat shu kunga tegadi.",
        "GROUP BY": "Har reklama uchun to'liq kun bo'yicha bitta jami. Barcha ma'lumot allaqachon bor, hech narsa kechikmaydi.",
      },
    },
    overspend: {
      short: "Oshib ketish",
      title: "Byudjet tekshiruvi kechagi raqamni o'qiydi",
      body: "Reklama serveri kunlik $50 byudjet tugaganda reklamani to'xtatadi. U statistika bazasini tekshiradi, lekin statistika kechagi tundan.\n\n`ad_7` reklamasi soat 10:00 da mashhur bo'lib ketdi va byudjetini bir soatda yoqib yubordi. Server uni kun bo'yi ko'rsatdi, tarmoq esa hisob chiqara olmaydigan $340 ni yo'qotdi.",
      watch: "Batch hisobotlar uchun yaxshi. Daqiqalar ichida javob berishi kerak bo'lgan qarorlar uchun noto'g'ri.",
      fields: {
        spent: "Nol. Bugungi kliklar faqat bugun tunda sanaladi.",
        budget: "Reklama serveri ushlab turishi kerak bo'lgan kunlik chegara.",
        "as of": "Raqamning haqiqiy yoshi: oxirgi tungi ishga tushirish.",
      },
    },
    stream: {
      short: "Stream",
      title: "Stream: kliklarni kelishi bilan sanash",
      body: "Yig'uvchi endi har klikni topic'ga ham yozadi. Stream protsessor uni to'xtovsiz o'qiydi va statistika bazasida har daqiqalik sanoqni yangilaydi.\n\nReklama serveri sarfni haqiqatdan taxminan bir daqiqa orqada ko'radi. Oshib ketish bir necha dollargacha tushdi — bu o'sha bir daqiqaning narxi.",
      fields: {
        key: "Reklama ID'si. Bitta reklamaning barcha kliklari bitta partition'ga tushadi va bitta protsessor nusxasi ularni sanaydi.",
        click_id: "Klikning noyob ID'si, ilova qo'yadi. Takrorlarni topish uchun kerak.",
        event_time: "Klik telefonda qachon bo'lgani. Bizga qachon yetib kelgani emas.",
      },
    },
    tumbling: {
      short: "Tumbling",
      title: "Tumbling oynalar: qat'iy bir daqiqalik bo'laklar",
      body: "Protsessor kliklarni **tumbling** oynalarga ajratadi: 10:00-10:01, 10:01-10:02, ketma-ket, ustma-ust tushmaydi. Har klik aynan bitta oynaga tushadi.\n\nYangi bo'lib turish uchun u har 10 soniyada qisman sanoqni yuboradi va qatorga qo'shadi. Shu `+` ni eslab qoling: u keyin qaytadi.",
      fields: {
        window_start: "Oyna boshlanishi. Reklama ID'si bilan birga qator kalitini tashkil qiladi.",
        "ON CONFLICT": "Shu daqiqa uchun qator allaqachon bor, shuning uchun insert o'rniga update bo'ladi.",
        EXCLUDED: "Yangi qisman sanoq. U saqlangan qiymatga **qo'shiladi**.",
      },
    },
    sliding: {
      short: "Sliding",
      title: "Sliding oynalar: klik firibgarligini ushlash",
      body: "Firibgarlik qoidasi: istalgan 60 soniya ichida bitta qurilmadan 20 dan ortiq klik. Qat'iy daqiqalar 10:00:50-10:01:20 ga bo'lingan portlashni o'tkazib yuboradi, shuning uchun protsessor har 10 soniyada siljiydigan 60 soniyalik **sliding** oynalarni ishlatadi.\n\nOynalar ustma-ust tushadi, har klik oltitasida sanaladi. Protsessor yuki 45% dan 70% ga sakraydi.",
      watch: "Sliding oynalar holat va ishni o'lcham/qadam marta ko'paytiradi. Faqat portlash muhim bo'lgan joyda ishlating.",
      fields: {
        device_id: "Juda ko'p klik qilgan qurilma. Reklama serveri uning kliklarini sanashni to'xtatadi.",
        window_start: "Bu oyna oldingisidan 10 soniya keyin ochilgan.",
        window_end: "Boshlanishdan 60 soniya keyin: har bir oynaning o'lchami.",
        rule: "Ishlagan shart, keyin odam tekshirishi uchun.",
      },
    },
    late: {
      short: "Kechikkan",
      title: "Daqiqalab kechikib keladigan kliklar",
      body: "Metroda telefonda tarmoq yo'q. Uning kliklari navbatda turadi va signal qaytganda, uch daqiqadan keyin yuboriladi.\n\n10:00 oynasi allaqachon tugagan va yozilgan. Kech kelgan klik tashlab yuboriladi, sanoq haqiqatdan 3% kam bo'lib qoladi.",
      watch: "Processing time — siz ko'rgan vaqt, event time — hodisa bo'lgan vaqt. Oynalar event time bo'yicha bo'lishi kerak.",
      check: {
        q: "Protsessor endi oynani yopishdan oldin kechikkan kliklarni 5 daqiqa kutadi. Buning narxi nima?",
        options: [
          "Yakuniy sanoq bir emas, taxminan olti daqiqada keladi",
          "Hech narsa: kechikkanlar sanaladi, qolgani o'zgarmaydi",
          "5 daqiqadan kech kelgan kliklar ikki marta sanaladi",
        ],
        answer: 0,
        why: "Oyna faqat watermark — eng yangi event time minus 5 daqiqa — uning oxiridan o'tganda yakuniy bo'ladi. Noto'g'ri sanoq 0,2% ga tushadi, lekin yakuniy raqamlar bir emas, olti daqiqadan keyin keladi.",
      },
      fields: {
        event_time: "10:00:52: klik 10:00 oynasiga tegishli.",
        received_at: "10:03:40: deyarli uch daqiqa keyin. U oyna allaqachon yopilgan.",
      },
    },
    watermark: {
      short: "Watermark",
      title: "Watermark: kechikkanlarni qancha kutish kerak",
      body: "Protsessor **watermark** yuritadi: ko'rilgan eng yangi event time minus 5 daqiqa ruxsat etilgan kechikish. Oyna faqat watermark uning oxiridan o'tganda yakuniy bo'ladi.\n\nKech kelgan kliklar endi sanaladi. Undan ham kechroqlari side output'ga, tuzatish uchun saqlanadi. Narxi: yakuniy raqamlar bir daqiqa emas, olti daqiqadan keyin keladi.",
      watch: "Watermark — bu taxmin. Uzoqroq kutish to'liqroq, lekin kamroq yangi; ikkalasini beradigan sozlama yo'q.",
      fields: {
        watermark: "«10:05:40 dan eskisi endi kelmaydi deb hisoblayman.»",
        final: "10:00 oynasi yopildi, uning sanog'i endi o'zgarmaydi.",
        "side output": "Watermark'dan kech kelgan hodisalar. Ular jim tashlanmaydi, tungi tuzatish uchun fayllarga ketadi.",
      },
    },
    crash: {
      short: "Yiqilish",
      title: "Yiqilish va qayta o'qish: kliklar ikki marta sanaldi",
      body: "Protsessor sanoqlarni 89320 offset'gacha yozdi va o'z joyini saqlashdan oldin yiqildi. Qayta ishga tushganda oxirgi saqlangan offset'dan, 88120 dan davom etadi.\n\nYetkazish **kamida bir marta** — bu to'g'ri: hech narsa yo'qolmaydi. Lekin yozuv qisman sanoqlarni qo'shadi, shuning uchun 1200 klik ikkinchi marta qo'shiladi va reklama beruvchilardan ortiqcha pul olinadi.",
      check: {
        q: "Yetkazish kamida bir marta bo'lib qoladi. Qayta o'qish o'sha kliklarni ikki marta qo'shishini nima to'xtatadi?",
        options: [
          "Bazaga yozishdan oldin offset'ni commit qilish",
          "Tez-tez yozish, yiqilishdan keyin kamroq qayta o'qilsin",
          "Oynaning to'liq sanog'ini offset bilan yozish, eskisini o'tkazish",
        ],
        answer: 2,
        why: "Yozuv endi to'liq sanoqni `last_offset` bilan yozadi, qator faqat offset yangiroq bo'lsa o'zgaradi. Takror eski offset bilan yoziladi va e'tiborsiz qoladi: sanoq hamon 219.",
      },
      fields: {
        "committed offset": "Protsessor saqlagan oxirgi o'rin. Undan keyingi hammasi qayta o'qiladi.",
        "second time": "Yozuvlar allaqachon bo'lgan. `+` bilan ular ikki marta qo'llanadi.",
      },
    },
    idempotent: {
      short: "Idempotent",
      title: "Idempotent yozuv: takror hech narsani o'zgartirmaydi",
      body: "Protsessor endi delta emas, oynaning **to'liq** sanog'ini va yetib kelgan offset'ni yozadi. Qator faqat offset yangiroq bo'lsa o'zgaradi.\n\nTakror eski offset bilan o'sha qiymatni yozadi va e'tiborsiz qoladi. At-least-once yetkazish va idempotent yozuv taqsimlangan tranzaksiyasiz aynan bir martalik **natija** beradi.",
      fields: {
        last_offset: "Bu qator topic'ning qaysi joyigacha hisobga olgan.",
        EXCLUDED: "To'liq sanoq. Ikki marta yozilsa ham qator bir xil.",
        WHERE: "Himoya: eski yoki teng offset qatorga tegmaydi.",
        "replay ignored": "Takroriy yozuv hech narsaga tegmadi. Sanoq hamon 219.",
      },
    },
    both: {
      short: "Ikkalasi",
      title: "Oxirgi so'z uchun batch job'ni qoldiring",
      body: "Stream tez va deyarli to'g'ri; u byudjetlar va firibgarlik bloklarini boshqaradi. Tungi job hamon xom fayllar, jumladan side output ustida ishlaydi va hisob-kitob uchun kechagi kunni aniq jami bilan qayta yozadi.\n\nIkki yo'l, har biri o'z ehtiyoji uchun. Ular farq qilsa, batch natijasi yutadi, chunki u har bir klikni ko'rgan.",
      watch: "Bitta raqam uchun ikki kod yo'lini bir xil saqlash kerak. Ko'p jamoalar sanash kodini ular orasida bo'lishadi.",
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Batch va stream uchun to'rt qoida.\n\n1) Batch oddiy, qayta ishga tushiriladi va kechikadi; stream yangi va murakkabroq. 2) Oynani event time bo'yicha tuzing: sanoq uchun tumbling, portlash uchun sliding. 3) Watermark kech hodisalarni qancha kutishni hal qiladi; undan kechroqlari side output'ga ketadi. 4) Yetkazish kamida bir marta, shuning uchun yozuvni idempotent qiling: oyna va offset bo'yicha to'liq qiymat yozing.",
    },
  },
};

export default text;
