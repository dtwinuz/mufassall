import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "To'xtovsiz migratsiyalar",
  summary:
    "Do'kon mijozlarning telefon raqamlarini 40 million qatorli jadvalning yangi ustunida bitta formatda saqlamoqchi, checkout'ni to'xtatmasdan. Oddiy rename hali eski kodda ishlayotgan pod'larni sindiradi, 5 ms lik ALTER esa uzun hisobot ortida qulf kutib, hamma so'rovni to'xtatib qo'yadi. Xavfsiz yo'l expand va contract: NULL bo'la oladigan ustun qo'shish, ikkalasiga yozish, kichik bo'laklarda backfill, tekshirib o'qishni o'tkazish, eskisiga yozishni to'xtatish va eski ustunni eng oxirida o'chirish. Har bosqichda orqaga qaytish yo'li bor.",
  learn: [
    "Nega rolling deploy bitta sxemada ilovaning ikki versiyasi degani va nega rename eskisini sindiradi",
    "Katta jadvaldagi qulflar: uzun so'rov ortidagi qulf navbati, lock_timeout, concurrent indeks",
    "Expand va contract: NULL bo'la oladigan ustun, ikki tomonga yozish, bo'laklab backfill, tekshiruv, o'qishni o'tkazish, oxirida drop",
    "NOT NULL'ni uzun qulfsiz qo'shish va qaysi bosqichni hali orqaga qaytarish mumkinligi",
  ],
  nodes: {
    users: "Xaridorlar",
    old: "Ilova (eski)",
    new: "Ilova (yangi)",
    db: "Mijozlar bazasi",
    ci: "Migratsiyalar",
    report: "Tungi hisobot",
    filler: "Backfill job",
  },
  metrics: {
    errors: "Checkout xatolari",
    blocked: "Eng uzun bloklangan so'rov",
    backfill: "To'ldirilgan qatorlar",
    rollback: "Orqaga qaytish vaqti",
  },
  steps: {
    naive: {
      short: "Reja",
      title: "Bitta migratsiya, keyin deploy",
      body: "Telefon raqamlari qo'lda kiritilgan: `90 123-45-67`, `+998 (90) 1234567`. Jamoa ularni bitta formatda, E.164 da (`+998901234567`), `phone_e164` degan ustunda ko'rmoqchi. Reja: migratsiya ustun nomini o'zgartiradi, keyin `phone_e164` ni o'qiydigan v2 versiya chiqariladi.\n\n`customers` jadvalida 40 million qator bor, checkout unga soniyasiga 900 marta yozadi. Rename'ning o'zi 12 ms oladi.",
      fields: {
        "0042": "Migratsiya pipeline'da, yangi koddan sal oldin ishlaydi.",
        "RENAME COLUMN": "Bir zumda: faqat katalogdagi nom o'zgaradi.",
        phone_e164: "Yangi kod kutadigan nom.",
        "40 M rows": "Katta va qizg'in jadval: undagi har qulf checkout'da seziladi.",
      },
    },
    rename: {
      short: "Rename",
      title: "Eski pod'lar yo'q bo'lgan ustunni so'raydi",
      body: "Migratsiya 14:00:03 da tugaydi. Rollout pod'larni birma-bir almashtiradi va keyingi daqiqalarda ularning ko'pchiligi hali eski kodda: u `phone` ni so'raydi. Bu ustun endi yo'q, eski pod'dagi har checkout `500` bilan yiqiladi.\n\n12 pod'dan 9 tasi eski bo'lgani uchun checkout'larning to'rtdan uchi xato beradi. Kodni orqaga qaytarish yordam bermaydi, chunki eski kodga eski nom kerak: orqaga yo'l yana bitta migratsiya.",
      watch: "Rolling deploy paytida ilovaning ikki versiyasi bitta sxemada ishlaydi. Sxemadagi har o'zgarish ikkalasi bilan ham ishlashi shart.",
      check: {
        q: "Qaysi tartibda eski va yangi kod har lahzada yonma-yon ishlay oladi?",
        options: [
          "Avval rename, keyin iloji boricha tez deploy",
          "Yangi ustunni qo'shish, ikkalasiga yozish, backfill, yangisidan o'qish, eskisiga yozishni to'xtatish, uni o'chirish",
          "Avval yangi kodni deploy qilish, keyin rename",
        ],
        answer: 1,
        why: "Rename bor har tartibda bir versiya mavjud bo'lmagan ustunni so'raydigan payt bo'ladi: rename'dan keyin eski kod yoki undan oldin yangi kod. Expand va contract faqat eski kod e'tibor bermaydigan narsalarni qo'shadi, olib tashlashni esa ishlayotgan hech bir kod ishlatmay qo'yganidan keyingina qiladi.",
      },
      fields: {
        "does not exist": "Eski kod o'zgarmagan: u hamon `phone` ga yozadi.",
        "500": "Baza xatosi xaridorgacha yetib boradi.",
        "3/12": "Rollout daqiqalar oladi. Shu vaqt davomida ikkala versiya ham jonli.",
        "old code": "Rollback esa aynan shu kodni qaytarib olib keladi.",
      },
    },
    lock: {
      short: "Qulf",
      title: "5 ms lik ALTER butun jadvalni to'xtatadi",
      body: "Ikkinchi urinish, rename'siz: `ADD COLUMN phone_e164`. Unga bir necha millisekundga jadvalning eksklyuziv qulfi kerak. Lekin tungi hisobot 13:42 dan beri `customers` ni o'qiyapti va umumiy qulfni ushlab turibdi. ALTER uni kutadi.\n\nYomoni shundaki, endi `customers` dagi har yangi so'rov, hatto oddiy o'qish ham, kutayotgan ALTER ortidan navbatga turadi. 38 soniyada 1 240 ta so'rov to'planadi va checkout'larning uchdan biri timeout bo'ladi. O'zicha hech narsa sekin emas: hamma bitta navbatda kutyapti.",
      check: {
        q: "ALTER'ning o'zi 5 ms oladi. Nega checkout to'xtaydi?",
        options: [
          "Ustun qo'shish 40 million qatorning hammasini qayta yozadi",
          "ALTER uzun so'rov ortida qulf kutadi, har yangi so'rov esa ALTER ortida kutadi",
          "Hisobot bazadagi hamma ulanishlarni egallab oladi",
        ],
        answer: 1,
        why: "Standart qiymatsiz, NULL bo'la oladigan ustun faqat katalogni o'zgartiradi: qayta yozish yo'q. Lekin eksklyuziv qulf so'rovi qulf navbatiga tushadi va keyingi so'rovlar undan o'zib keta olmaydi, hatto hisobot bilan bemalol sig'ishadiganlari ham. Bitta uzun o'quvchi va bitta kichkina ALTER jadvalni to'sib qo'yadi.",
      },
      fields: {
        AccessShareLock: "Har SELECT ushlaydigan qulf. Hisobot uni 38 daqiqadan beri ushlab turibdi.",
        "waiting AccessExclusiveLock": "ALTER'ga jadval yolg'iz o'ziga kerak, shuning uchun hisobotni kutadi.",
        "waiting behind 902": "Yangi so'rovlarga kutayotgan ALTER'dan o'tib ketishga ruxsat yo'q.",
        "5 ms": "Ishning o'zi arzimas. Uzilish kutishning o'zida.",
      },
    },
    expand: {
      short: "Expand",
      title: "Expand: NULL bo'la oladigan ustun, qulf timeout'i, concurrent indeks",
      body: "Endi migratsiya `lock_timeout = 2s` qo'yadi: qulf 2 soniyada bo'shamasa, ALTER navbatni to'sish o'rniga voz kechadi va pipeline 30 soniyadan keyin qayta urinadi. Ustun NULL bo'la oladi va standart qiymati yo'q, shuning uchun qo'shish 4 ms oladi.\n\nIndeks `CONCURRENTLY` bilan quriladi: sekinroq, 11 daqiqa, lekin yozuvlar butun vaqt davom etadi. Eski kod yangi ustunga e'tibor bermaydi, demak orqaga qaytish shunchaki oldingi versiyani deploy qilish: 3 daqiqa.",
      watch: "NOT NULL'ni oxiriga qoldiring. 40 M qatorda u og'ir qulf ostida to'liq skan degani, agar NOT VALID qilib qo'shilib, alohida tekshirilmasa.",
      fields: {
        lock_timeout: "Bu migratsiya boshqalarni eng ko'pi bilan qancha to'sishi mumkin: 2 s, keyin qayta urinadi.",
        "ADD COLUMN": "NULL bo'la oladi, standart qiymat yo'q: faqat katalog o'zgaradi, qatorlar qayta yozilmaydi.",
        CONCURRENTLY: "Indeksni yozuvlarni to'smasdan quradi. Tranzaksiya ichida ishlay olmaydi.",
        "try again": "Qulfni ololmaslik oddiy hol. Tinchroq paytda qayta urinib ko'ring.",
      },
    },
    dual: {
      short: "Ikki yozuv",
      title: "Yangi versiya ikkala ustunga yozadi",
      body: "v2 versiya chiqariladi. U telefonni ikkala ustunga yozadi, lekin hamon eskisidan o'qiydi. Bir muddat eski va yangi pod'lar yonma-yon ishlaydi va ikkalasi ham to'g'ri: eskilari faqat `phone` ga, yangilari ikkalasiga yozadi.\n\nOrqaga qaytish hali ham oson: eski versiya `phone_e164` ga shunchaki e'tibor bermaydi.",
      watch: "Har bosqich o'zidan oldingi va keyingi versiya bilan ishlashi kerak, chunki rollout paytida ikkalasi ham jonli.",
      fields: {
        phone: "Hamon yoziladi va o'qiladi: hozircha haqiqat manbai shu.",
        phone_e164: "U ham yoziladi, shuning uchun yangi va o'zgargan qatorlar allaqachon to'g'ri.",
        "reads still": "O'qish faqat backfill va tekshiruvdan keyin o'tadi.",
      },
    },
    backfill: {
      short: "Backfill",
      title: "Kichik bo'laklarda backfill",
      body: "12 pod'ning hammasi v2 da ishlay boshlagach, job eski qatorlar uchun `phone_e164` ni to'ldiradi: id oralig'i bo'yicha har bo'lakda 5 000 qator, har biri 140 ms, keyin 50 ms pauza. Replika bir soniyadan ko'p orqada qolsa, job kutadi. 8 000 bo'lak 25 daqiqaga yaqin oladi va hech bir qator bitta bo'lakdan uzoq qulflanmaydi.\n\n`IS NULL` job'ni qayta ishga tushirishga xavfsiz qiladi: yiqilgandan keyin tayyorini o'tkazib yuboradi va ilova hozirgina yozgan qiymatni hech qachon ustidan yozmaydi.",
      check: {
        q: "Backfill 12 pod'dan 4 tasi hali eski versiyada turganda boshlanadi. Nima buziladi?",
        options: [
          "Hech narsa: backfill har qatorni tuzatadi",
          "Eski pod'lar o'z bo'lagi o'tib ketgandan keyin o'zgartirgan qatorlarda phone_e164 eskicha qoladi",
          "Eski pod'lar yangi ustun sabab yiqiladi",
        ],
        answer: 1,
        why: "Eski kod faqat `phone` ga yozadi. Mijoz raqamini backfill o'sha id'dan o'tib bo'lgach eski pod orqali o'zgartirsa, `phone_e164` da oldingi raqam qoladi, job esa unga qaytmaydi. Backfill'ni pod'larning 100 foizi ikkalasiga yoza boshlagandan keyin boshlang yoki ikkalasini trigger bilan sinxron ushlang.",
      },
      fields: {
        BETWEEN: "Primary key bo'yicha oraliq: har bo'lak ma'lum va kichik qatorlar to'plamiga tegadi.",
        "IS NULL": "To'ldirilgan qatorlarni o'tkazib yuborish: qayta yurgizsa bo'ladi, ilovaning yozganini bosmaydi.",
        "sleep 50 ms": "Bo'laklar orasida checkout'ga joy qoldiradi.",
        "replica lag": "Katta yozuvlar replikalarda ham takrorlanishi kerak. Job ular uchun sekinlashadi.",
        "UPDATE 4987": "Oraliqdagi 13 qatorni v2 allaqachon to'ldirib qo'ygan.",
      },
    },
    switch: {
      short: "O'qishni o'tkazish",
      title: "Tekshirish, keyin o'qishni o'tkazish",
      body: "Yangi ustundan biror narsa o'qishidan oldin so'rov har qator eskisiga mos kelishini tekshiradi: 0 ta farq. v3 versiya `phone_e164` ni flag ortida o'qiydi: ikki kun ichida avval so'rovlarning 5 foizi, keyin yarmi, keyin hammasi. U hamon ikkala ustunga yozadi.\n\nBiror narsa noto'g'ri bo'lsa, flag qaytariladi, v2 esa hamon yaroqli versiya: ikkala ustun ham to'la va dolzarb.",
      fields: {
        "IS DISTINCT FROM": "`<>` ga o'xshaydi, lekin NULL'ni ham qiymat deb biladi, shuning uchun to'ldirilmagan qatorlar ham sanaladi.",
        "count = 0": "Har qator mos. Yangi ustunga faqat endi ishonsa bo'ladi.",
        "still writes both": "Shunda `phone` dan o'qishga qaytish yo'li ochiq qoladi.",
        "read-e164": "Flag o'qishni asta-sekin o'tkazadi va soniyalarda qaytaradi.",
      },
    },
    contract: {
      short: "Contract",
      title: "Contract: eski ustun ixtiyoriy, yangisi majburiy bo'ladi",
      body: "Keyingi versiya, v4, `phone` ga yozishni to'xtatadi. Agar `phone` hali `NOT NULL` bo'lsa, v4 ning har insert'i yiqiladi, shuning uchun avval shu cheklov olib tashlanadi. Bu bir zumda bo'ladi.\n\nYangi ustun majburiy bo'lishi kerak, lekin oddiy `SET NOT NULL` 40 million qatorni eksklyuziv qulf ostida skan qiladi. Uning o'rniga CHECK cheklovi `NOT VALID` bilan qo'shiladi: u faqat yangi yozuvlarga qo'llanadi va millisekundlar oladi. Keyin `VALIDATE` eski qatorlarni yengil qulf bilan tekshiradi: 3 daqiqa 40 soniya, o'qish va yozish davom etadi.",
      fields: {
        "DROP NOT NULL": "v4 ga `phone` siz qator qo'shishga ruxsat beradi. Bir zumda.",
        "NOT VALID": "Endi yangi va o'zgargan qatorlarga majburiy, eskilari hali tekshirilmagan.",
        "VALIDATE CONSTRAINT": "Eski qatorlarni o'qish va yozishni to'smaydigan qulf ostida tekshiradi.",
        "not blocked": "Uzun qism checkout'ni to'xtatmasdan o'tadi.",
      },
    },
    drop: {
      short: "Drop",
      title: "Eski ustun eng oxirida o'chiriladi",
      body: "v4 7 kundan beri ishlayapti, so'rov loglarida `phone` ni o'qiydigan hech kim yo'q, v3 ga qaytishni hech kim rejalashtirmagan. Faqat endi ustun o'chiriladi, yana `lock_timeout` bilan. Bu 3 ms oladi: ustun faqat o'chirilgan deb belgilanadi, joy esa qatorlar qayta yozilgan sari qaytadi.\n\nBu orqaga yo'li faqat zaxiradan tiklash bo'lgan yagona qadam. U eng oxirida, alohida, rollback oynasi o'tgandan keyin qilinadi.",
      watch: "`SELECT *` yoki keshlangan prepared statement ishlatadigan kod o'chirilgan ustunda sinishi mumkin: ustunlarni aniq sanang va ORM'ga bu ustunga e'tibor bermaslikni bir reliz oldin ayting.",
      fields: {
        "7 days": "Rollback oynasi: u o'tmaguncha v3 qaytishi mumkin, unga esa `phone` kerak.",
        lock_timeout: "Drop'ga ham eksklyuziv qulf kerak, o'sha qulf navbati bu yerda ham amal qiladi.",
        "DROP COLUMN": "Eski kodni deploy qilib bekor qilib bo'lmaydigan yagona qadam.",
        "metadata only": "Tez, chunki hozir hech narsa qayta yozilmaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "To'xtovsiz migratsiyalar uchun olti qoida.\n\n1) Rollout paytida eski va yangi versiya bitta sxemada ishlaydi: har o'zgarish ikkalasiga ham mos bo'lsin, shuning uchun joyida rename qilmang. 2) Qizg'in jadvaldagi har DDL `lock_timeout` va qayta urinish bilan ishlasin; indekslarni concurrent quring. 3) Expand: standart qiymatsiz, NULL bo'la oladigan ustun qo'shing, keyin ikkalasiga yozing. 4) Backfill'ni kichik, qayta yurgizsa bo'ladigan bo'laklarda, faqat hamma pod ikkalasiga yozgandan keyin qiling va replika kechikishini kuzating. 5) Tekshiring, o'qishni asta-sekin o'tkazing, keyin eskisiga yozishni to'xtating; NOT NULL'ni NOT VALID va VALIDATE bilan qo'shing. 6) Drop eng oxirida, rollback oynasidan keyin: unga qadar har bosqichni oldingi versiyani deploy qilib bekor qilsa bo'ladi.",
    },
  },
  scenarios: {
    "one-update": {
      label: "Backfill qulflaydi",
      steps: {
        "big-update": {
          short: "Bitta UPDATE",
          title: "Backfill bitta katta UPDATE sifatida",
          body: "Kimdir backfill'ni butun jadval bo'yicha bitta so'rov qilib yurgizadi, eski va yangi pod'lar hali jonli paytda. 18 daqiqada u 26 million qatorni yangilaydi va ularning har biri so'rov commit bo'lguncha qulflangan qoladi.\n\nShunday mijozni o'zgartiradigan har checkout qator qulfini 30 soniyalik statement timeout'gacha kutadi. Checkout'larning 18 foizi yiqiladi. Replikalar 9 daqiqa orqada qoladi, 31 GB WAL to'planadi.",
          check: {
            q: "UPDATE hozir bekor qilinadi. Yangilangan 26 million qator nima bo'ladi?",
            options: [
              "Ular yangi qiymatni saqlab qoladi, faqat qolgani yetishmaydi",
              "Butun so'rov orqaga qaytadi: birorta qatorda yangi qiymat qolmaydi, qulflar ketadi, vacuum o'lik qator versiyalarini tozalaydi",
              "Faqat qulflangan qatorlar orqaga qaytadi",
            ],
            answer: 1,
            why: "Bitta so'rov bitta tranzaksiya: yo hammasi, yo hech narsa. PostgreSQL'da bekor qilishning o'zi tez, qulflar darhol bo'shaydi, 26 million yangi qator versiyasi esa autovacuum uchun o'lik tuple'ga aylanadi. 18 daqiqalik ish yo'qoladi, lekin jadval izchil.",
          },
          fields: {
            "until COMMIT": "Tranzaksiya olgan har qator qulfini u tugaguncha ushlab turadi.",
            "waiting for row lock": "Ikkala ilova versiyasi UPDATE tekkan mijozlarni o'zgartirish uchun kutadi.",
            "replica lag": "Replikalar o'sha ulkan tranzaksiyani takrorlab, orqada qoladi.",
            WAL: "Har o'zgargan qator logga yoziladi: buning narxini disk va replikalar to'laydi.",
          },
        },
        cancel: {
          short: "Bekor qilish",
          title: "Uni bekor qilish",
          body: "Navbatchi muhandis so'rovni bekor qiladi. PostgreSQL uni to'xtatadi, qator qulflari darhol bo'shaydi va checkout bir necha soniyada tiklanadi. Ustun avvalgidek bo'sh: backfill noldan boshlanadi.\n\nEndi autovacuum fonda 26 million o'lik qator versiyasini tozalaydi.",
          fields: {
            pg_cancel_backend: "O'sha bitta backend'dan joriy so'rovini to'xtatishni so'raydi.",
            "canceling statement": "Tranzaksiya bekor bo'ladi: yo hammasi, yo hech narsa.",
            "released at once": "Kutib turgan checkout'lar o'tib ketadi.",
            "dead row versions": "Bekor qilingan update egallagan joy, keyinroq vacuum qaytarib oladi.",
          },
        },
        batched: {
          short: "Bo'laklar",
          title: "Yana, rollout'dan keyin, bo'laklarda",
          body: "Jamoa 12 pod'ning hammasi ikkala ustunga yoza boshlashini kutadi va keyin bo'lakli job'ni yurgizadi. Hech bir qator 140 ms dan uzoq qulflanmaydi, replikalar 0,6 soniyadan ko'p orqada qolmaydi va 26 daqiqadan keyin har qator to'ldirilgan.\n\nCheckout buni sezmaydi ham. O'sha ish 8 000 ta kichik tranzaksiyaga bo'linsa, ishlash vaqtiga hech qanday zarar yetmaydi.",
          fields: {
            "12/12 pods": "Faqat `phone` ga yozadigan eski pod qolmagan.",
            "longest row lock": "Ko'pi bilan bitta bo'lak.",
            "replica lag max": "Pauzalar uni bir soniyadan past ushlaydi.",
            total: "Bitta UPDATE'dan sal uzoqroq, lekin hech kim kutmadi.",
          },
        },
      },
    },
  },
};

export default text;
