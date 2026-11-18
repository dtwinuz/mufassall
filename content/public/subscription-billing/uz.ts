import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Obuna to'lovlari",
  summary:
    "SaaS mahsulot oylik tariflar sotadi va har tun kartalardan pul yechadi. Job'ning ikki nusxasi bitta mijozdan ikki marta yechadi, kartalar rad etiladi, mijozlar oy o'rtasida tarifni almashtiradi, oylar uzunligi har xil, provayder esa natijani keyinroq webhook bilan aytadi. Har muammoning pulni to'g'ri va mijozni saqlab qoladigan aniq yechimi bor.",
  learn: [
    "Obuna, tarif, hisob davri va har yechish ortidagi hisob-faktura qatori",
    "Bir-birining ustiga tushgan billing yurishlari: hisob-faktura uchun idempotency kaliti va har qatorga lease",
    "Rad etishdan keyingi dunning va davr o'rtasida tarif almashganda proratsiya",
    "Oy oxiri va vaqt mintaqalari, provayder webhook'lari va davr oxirida bekor qilish",
  ],
  nodes: {
    customer: "Mijoz",
    api: "Billing API",
    invoices: "Hisob-fakturalar",
    job: "Billing job",
    job2: "Billing job #2",
    provider: "To'lov provayderi",
    mailer: "Email xizmati",
  },
  metrics: {
    dupes: "Ikki marta yechish",
    unpaid: "To'lanmagan fakturalar",
    recovered: "Raddan keyin tiklangan",
    churn: "Majburiy ketish",
  },
  steps: {
    subscribe: {
      short: "Obuna",
      title: "Obuna = tarif + hisob davri",
      body: "Mijoz oyiga $20.00 lik Basic tarifni tanlaydi. Billing API obunani saqlaydi va 1 noyabrdan 1 dekabrgacha bo'lgan davr uchun birinchi hisob-fakturani ochadi.\n\nBu darsdagi har yechish aynan bitta hisob-fakturaga tegishli. Hisob-faktura pul birligi: nima qarz, qaysi davr uchun va to'langanmi.",
      fields: {
        subscription_id: "Uzoq yashaydigan shartnoma. Fakturalar kelib-ketadi, obuna qoladi.",
        plan: "Nima va qanchaga sotiladi. Narx o'zgarsa, tahrir emas, tarifning yangi versiyasi.",
        amount_minor: "Butun sent: `2000` = $20.00.",
        period_start: "Davrlar yarim ochiq: boshi kiradi, oxiri kirmaydi.",
        period_end: "Keyingi davr aynan shu yerdan boshlanadi. Bo'shliq ham, ustma-ust tushish ham yo'q.",
        status: "To'languncha `open`, keyin `paid`; yoki `void`, `uncollectible`.",
      },
    },
    nightly: {
      short: "Tungi yurish",
      title: "Har tun job muddati kelganini yangilaydi",
      body: "Soat 02:00 UTC da billing job davri tugagan har faol obunani tanlaydi. Har biri uchun keyingi fakturani yaratadi, saqlangan kartadan to'lov provayderi orqali pul yechadi va davrni uzaytiradi.\n\nBu tun bu 18 412 obuna. Job taxminan ikki soat ishlaydi.",
      fields: {
        current_period_end: "Shu vaqt o'tgan bo'lsa, muddati kelgan.",
        active: "To'xtatilgan, bloklangan va bekor qilingan obunalar yangilanmaydi.",
        "18 412 rows": "Bir tunlik ish. Bu hajmda yurish uzoq davom etadi va yarmida yiqilishi mumkin.",
      },
    },
    overlap: {
      short: "Ustma-ust",
      title: "Job'ning ikki nusxasi o'sha mijozlardan pul yechadi",
      body: "Deploy eski nusxa hali ishlayotganda billing xizmatining yangi nusxasini ishga tushirdi. Ikkalasida ham cron trigger bor edi, ikkalasi ham o'sha obunalarni tanladi va ikkalasi ham pul yechdi.\n\nBu tun 41 mijoz ikki marta to'ladi. Har biri support'ga yozadi, ba'zilari bankida chargeback ochadi.",
      watch: "\"Cron bir marta ishlaydi\" bu umid. Deploy, takror va failover ikkinchi nusxani ishga tushiradi.",
      check: {
        q: "Job'ning ikkinchi nusxasini qanday zararsiz qilasiz?",
        options: [
          "Cron yozuvi faqat bitta serverda bo'lishini ta'minlash",
          "Yurishdan keyin ikki marta yechilganlarni topib, pulini qaytarish",
          "Har worker yechishdan oldin fakturaga lease oladi va har yechish fakturadan olingan idempotency kalitini olib boradi",
        ],
        answer: 2,
        why: "Bitta cron server baribir yiqiladigan va deploy'da ikkilanadigan yagona nuqta. Lease bir paytda fakturaga faqat bitta worker egalik qilishini bildiradi, idempotency kaliti esa takror chaqiruvga ham birinchi yechishni qaytaradi.",
      },
      fields: {
        "node-a": "Eski nusxa, yurishini hali tugatmoqda.",
        "node-b": "Deploy'dan chiqqan yangi nusxa, o'z yurishini boshlayapti.",
        ch_501: "`sub_42` uchun birinchi yechish.",
        ch_502: "O'sha davr uchun ikkinchi yechish.",
      },
    },
    lease: {
      short: "Lease",
      title: "Har fakturaga lease, har yechishga idempotency kaliti",
      body: "Worker muddati kelgan fakturalar to'plamini `FOR UPDATE SKIP LOCKED` bilan egallaydi va `lease_until = now() + 10 min` yozadi. Boshqa worker egallangan qatorlarni o'tkazib yuboradi. Worker o'lsa, lease muddati tugaydi va ishni boshqasi davom ettiradi.\n\nYechish so'rovi faktura va urinish raqamidan tuzilgan kalitni olib boradi. Baribir ikki chaqiruv o'tib ketsa, provayder ikkinchisiga birinchi yechishni qaytaradi.",
      watch: "Kalit har so'rovga tasodifiy emas, faktura urinishiga bog'liq. Tasodifiy kalit hech narsani himoya qilmaydi.",
      fields: {
        "Idempotency-Key": "`in_7001-attempt-1`: bir faktura va bir urinish doim bir xil kalit beradi.",
        invoice_id: "Yechish bilan saqlanadi, webhook va hisobotlar fakturani shu bo'yicha topadi.",
        "Idempotent-Replayed": "Provayder bu kalitni oldin ko'rgan va saqlangan natijani qaytardi.",
        status: "Birinchi yechish natijasi. Yangi pul olinmadi.",
      },
    },
    decline: {
      short: "Rad",
      title: "Karta rad etildi",
      body: "Har tun yangilanishlarning taxminan 4% i o'tmaydi. Ko'pchiligi firibgarlik emas: kartada maoshgacha pul yo'q, muddati tugagan yoki limitga yetgan. Bu tun to'lanmagan fakturalar $18 400.\n\nBirinchi versiya rad etilganda obunani shunchaki bekor qilardi. Har oy mijozlarning 2.9% i ketishga qaror qilmasdan turib shu sababdan yo'qolardi.",
      check: {
        q: "Provayder qayta urinsa bo'ladi deb belgilagan raddan keyin nima bo'lishi kerak?",
        options: [
          "Bir necha kun davomida jadval bo'yicha qayta urinish, mijozga xabar berish, imtiyozli davrda kirishni saqlash, keyin to'xtatish",
          "Ishlaguncha har soatda qayta urinish",
          "Darhol bekor qilish va mijozdan qaytadan ro'yxatdan o'tishni so'rash",
        ],
        answer: 0,
        why: "Yumshoq rad ko'pincha bir necha kundan keyin o'tadi, xabar olgan mijoz kartani yangilay oladi. Har soatlik urinish banklarga karta sinash kabi ko'rinadi va do'konni belgilab qo'yadi. Bekor qilish mahsulotni hali xohlagan mijozni yo'qotadi.",
      },
      fields: {
        "402": "Payment Required: yechish o'tmadi, hech narsa olinmadi.",
        decline_code: "Sababi: `insufficient_funds` vaqtinchalik; o'g'irlangan yoki yopilgan karta esa yo'q.",
        retryable: "Faqat yumshoq radda qayta urining. Qattiq radni qaytarish hech qachon ishlamaydi va bankni bezovta qiladi.",
      },
    },
    dunning: {
      short: "Dunning",
      title: "Dunning: kunlar davomida urinish, imtiyozli davr, keyin to'xtatish",
      body: "Har o'tmagan faktura dunning yozuvini oladi: 1, 3, 5 va 7-kunlarda qayta urinish, 02:00 da emas, maosh tushgan tushdan oldingi paytda. Har muvaffaqiyatsizlikdan keyin mijozga kartani yangilash havolasi bilan email boradi. Imtiyozli davr tugaguncha kirish saqlanadi.\n\nHamma urinish o'tmasa, obuna o'chirilmaydi, to'xtatiladi: keyin to'lash uni qaytaradi. Rad etilgan fakturalarning 64% i tiklanadi, majburiy ketish 1.0% ga tushadi.",
      fields: {
        attempt: "Hozirgacha nechta urinish. Keyingi idempotency kalitining bir qismi.",
        schedule_days: "Birinchi muvaffaqiyatsizlikdan keyin job qayta urinadigan kunlar.",
        next_retry_at: "Bu vaqt o'tgach job yozuvni oladi.",
        grace_until: "Shu vaqtgacha kirish yoniq, kech to'lov mijozga hech narsa yo'qotmaydi.",
        on_exhausted: "`suspend`: ma'lumot saqlanadi, xizmat to'xtaydi, to'lov kutiladi.",
      },
    },
    proration: {
      short: "Proratsiya",
      title: "Davr o'rtasida yangilash: ishlatilmaganini qaytarish, yangisini yechish",
      body: "16 noyabrda mijoz Basic ($20) dan Pro ($50) ga o'tadi. Davrning yarmi qolgan. Basic'ning ishlatilmagan yarmi $10.00 kredit; Pro'ning qolgan yarmi $25.00. Mijoz hozir $15.00 to'laydi, dekabr fakturasi to'liq $50.00.\n\nHisob faktura qatorlari sifatida saqlanadi, shuning uchun mijoz, support va moliya bir xil sonlarni ko'radi.",
      watch: "Yaxlitlash qoidasini bir marta tanlang (kun yoki soniya bo'yicha, sentgacha) va hamma joyda ishlating.",
      check: {
        q: "Mijoz 31 yanvarda obuna bo'ldi. Keyingi ikki yangilanish qachon bo'lishi kerak?",
        options: [
          "3 mart va 3 aprel: har safar 31 kun qo'shish",
          "28 fevral va 31 mart: 31-sanani saqlab, qisqa oylarda oxirgi kunni olish",
          "28 fevral va 28 mart: oldingi oxiriga bir oy qo'shish",
        ],
        answer: 1,
        why: "Obuna o'z tayanch kunini, 31 ni eslab qoladi. Har davr oxiri keyingi oydagi o'sha kun, oy oxiriga qisqartirilgan holda. Oldingi oxirdan sanash abadiy 28-sanaga siljiydi.",
      },
      fields: {
        "15 left": "O'zgarish paytida davrda qolgan kunlar.",
        credit: "Eski tarifning ishlatilmagan qismi, manfiy faktura qatori.",
        charge: "Davrning qolgan qismi uchun yangi tarif.",
        "due now": "`2500 - 1000`, darhol o'z idempotency kaliti bilan yechiladi.",
      },
    },
    monthend: {
      short: "Oy oxiri",
      title: "Oy oxiri va vaqt mintaqalari",
      body: "UTC+5 dagi mijoz 31 yanvarda o'z vaqti bilan yarim tunda obuna bo'ldi. Obuna tayanch kun va vaqt mintaqasini saqlaydi va har davr oxirini shulardan hisoblaydi: 28 fevral, 31 mart, 30 aprel.\n\nVaqt nuqtasining o'zi UTC da saqlanadi: UTC+5 dagi 28 fevral yarim tuni UTC da 27 fevral 19:00. Tungi yurish 28-31 sanalarda ko'p yangilanishni ko'radi, shuning uchun oy oxirida job biroz uzoqroq ishlaydi.",
      fields: {
        anchor_day: "Mijoz ro'yxatdan o'tgan oy kuni. Qisqa oy uni hech qachon ustidan yozmaydi.",
        "+05:00": "Mijozning siljishi. \"Oylik\" serverning emas, uning kalendari bo'yicha.",
        drift: "Oxiri + bir oy, takror-takror: 31, 28, 28, 28... Tayanch kun buni to'xtatadi.",
        UTC: "UTC da saqlanadi va solishtiriladi; mijozning vaqt mintaqasida ko'rsatiladi.",
      },
    },
    webhook: {
      short: "Webhook",
      title: "Provayder to'lovni keyinroq webhook bilan tasdiqlaydi",
      body: "Ba'zi yechishlar chaqiruv ichida tugamaydi: bank qo'shimcha tasdiq so'raydi yoki to'lovni keyinroq o'tkazadi. Provayder `pending` deb javob beradi va yakuniy natijani bir necha daqiqa yoki soatdan keyin imzolangan webhook bilan yuboradi.\n\nAPI imzoni tekshiradi, ko'rgan `event_id` ni o'tkazib yuboradi va fakturani faqat oldinga suradi (`open` dan `paid` ga, hech qachon orqaga emas). Tungi tekshiruv 24 soatdan keyin ham `pending` turgan har faktura haqida provayderdan so'raydi, webhook yo'qolgan bo'lishi mumkin.",
      watch: "Webhook'largacha pending yechishlar muvaffaqiyatsiz deb hisoblanardi va to'lagan mijozlar dunning email'larini olardi.",
      fields: {
        Signature: "Webhook provayderdan kelganini isbotlaydi. Umumiy sir, yashirilgan.",
        event_id: "Bir hodisa ikki marta kelishi mumkin. Bir marta qayta ishlang.",
        type: "`charge.succeeded` fakturani `paid` qiladi; `charge.failed` dunning'ni boshlaydi.",
        invoice_id: "Yechish bilan yuborilgan, webhook o'z fakturasini taxminsiz topadi.",
      },
    },
    cancel: {
      short: "Bekor",
      title: "Davr oxirida bekor qilish yoki hozir, pul qaytarib",
      body: "Bekor qilgan mijozlarning ko'pi shu oy uchun allaqachon to'lagan, shuning uchun davr tugaguncha kirish saqlanadi. Obuna `cancel_at_period_end` oladi, tungi job esa yangilanishlarni qidirishdan oldin ularni yopadi.\n\nBu tartibsiz har tun 312 bekor qilingan obuna yangilanar, o'chirilgan kartada o'tmay qolar va dunning'ga tushardi. Darhol bekor qilish boshqa yo'l: kirish hozir to'xtaydi, ishlatilmagan qism o'sha proratsiya qoidasi bilan qaytariladi.",
      fields: {
        cancel_at_period_end: "Mijoz qarori, u allaqachon to'lagan sanada qo'llanadi.",
        current_period_end: "Yangilanishdagi chegaraning o'zi: bir nuqta, ikki natija.",
        RETURNING: "ID'lar xayrlashuv email'i va kirishni yopishga ketadi.",
        "UPDATE 312": "Bu tungi bekor qilingan obunalar. Ularning hech biri yangi faktura olmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Takroriy to'lovlar uchun olti qoida.\n\n1) Har yechish bitta yarim ochiq davr uchun bitta fakturaga tegishli. 2) Billing job ikki marta ishlaydi deb hisoblang: har fakturaga lease, har yechishga faktura va urinishdan tuzilgan idempotency kaliti. 3) Yumshoq raddan keyin dunning: kunlar davomida urinish, email, imtiyozli davr, keyin to'xtatish. 4) Tarif almashishini bitta yaxlitlash qoidasi bilan faktura qatorlari sifatida proratsiya qiling. 5) Tayanch kun va mijoz vaqt mintaqasini saqlang; vaqt nuqtalarini UTC da saqlang. 6) To'lovni imzolangan, dublikatsiz webhook'lar yakunlasin, osilib qolgan fakturalarni provayderdan so'rang va mijoz hozir demasa, davr oxirida bekor qiling.",
    },
  },
};

export default text;
