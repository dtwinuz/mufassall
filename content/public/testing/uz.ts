import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Testlash",
  summary:
    "Kichik do'kon har o'zgarishni to'g'ridan-to'g'ri xaridorlarga chiqaradi, xatolarni esa xaridorlar topadi. Testlarni qatlamma-qatlam qo'shamiz, har biri nimani ushlashini va nimani o'tkazib yuborishini ko'ramiz, va CI'ni deploy oldidagi darvozaga aylantiramiz.",
  learn: [
    "Test piramidasi: ko'p tez unit testlar, kamroq integration testlar, bir nechta end-to-end testlar",
    "Nega mock baza haqiqiy xatoni yashiradi va container'dagi haqiqiy baza uni qanday topadi",
    "Contract testlar: ikki jamoa orasidagi buzilgan API'ni deploy'dan oldin ushlash",
    "Test nega flaky bo'ladi va CI testlarni qanday qilib deploy darvozasiga aylantiradi",
  ],
  nodes: {
    dev: "Dasturchi",
    shopper: "Xaridor",
    orders: "Buyurtmalar servisi",
    pricing: "Narxlar servisi",
    db: "Baza",
    ci: "CI runner",
    testdb: "Test bazasi",
    browser: "Test brauzeri",
  },
  metrics: {
    escaped: "Xaridorga yetgan xatolar",
    "ci-time": "CI vaqti",
    flaky: "Flaky ishga tushishlar",
  },
  steps: {
    "no-tests": {
      short: "Testsiz",
      title: "Test vazifasini xaridorlar bajaryapti",
      body: "Dasturchi chegirma kodini o'zgartiradi va uni to'g'ridan-to'g'ri noutbukidan deploy qiladi. Deploy'dan oldin hech narsa ishga tushmaydi.\n\nPromo kodli birinchi xaridor 23 220 o'rniga 2 580 to'laydi. Support buni bir soatdan keyin biladi. O'tgan oy to'qqizta xato xaridorga yetgan, hammasi shu yo'l bilan topilgan.",
      fields: {
        promo: "10% chegirma kodi. O'zgargan kod yo'li shu.",
        subtotal: "Ikki dona, 12 900 dan. To'g'ri.",
        discount: "Subtotal'ning 10% i. Bu ham to'g'ri.",
        total: "Subtotal minus chegirma bo'lishi kerak edi. Kod chegirmaning o'zini qaytardi.",
      },
    },
    unit: {
      short: "Unit",
      title: "Unit testlar: bitta funksiya, millisekundlar",
      body: "Narx hisobiga endi unit testlar bor: oddiy kirish qiymatlari, kutilgan son. Tarmoq ham, baza ham yo'q. O'n to'rtta test har push'da bir soniyadan kamroqda o'tadi.\n\nChegirma xatosi hech kim deploy qilmasdan shu yerda qizil bo'lardi. Unit testlar piramidaning keng asosi: arzon, tez, ko'p.",
      fields: {
        FAIL: "Faylda yiqilgan test bor. Push qizil deb belgilanadi.",
        expected: "Test aytgan to'g'ri javob, kod qaytargan javob yonida.",
        Tests: "O'n to'rttadan bitta xato o'zgarishni to'xtatish uchun yetarli.",
        Time: "Bir soniyadan kam. Tez testlar ishga tushiriladi, sekinlari tashlab ketiladi.",
      },
    },
    "mock-lies": {
      short: "Mock aldadi",
      title: "Testlar yashil, bazaga chaqiruv buzuq",
      body: "Buyurtmalar kodi `ON CONFLICT` bilan saqlaydi, takroriy buyurtma e'tiborsiz qolsin deb. Unit testlarda baza xotiradagi soxta obyekt edi va hamma narsani qabul qilardi.\n\nHaqiqiy bazada `order_no` ustida unique indeks yo'q, shuning uchun u so'rovni rad etadi. Har bir buyurtma yiqiladi, testlarning hammasi esa yashil.",
      watch: "Mock faqat siz unga aytgan narsani biladi. U haqiqiy tizim haqida adashganingizni ayta olmaydi.",
      fields: {
        "ON CONFLICT": "Ko'rsatilgan ustunda unique indeks talab qiladi. Soxta baza buni hech qachon tekshirmagan.",
        ERROR: "Haqiqiy baza butun so'rovni rad etadi. Buyurtma saqlanmaydi.",
      },
    },
    integration: {
      short: "Integration",
      title: "Container'dagi haqiqiy baza bilan integration testlar",
      body: "CI endi bir martalik container'da haqiqiy bazani ishga tushiradi, production'dagi migratsiyalarni qo'llaydi va repository kodini unga qarshi yurgizadi.\n\nYetishmagan indeks birinchi yurishdayoq chiqadi, tuzatish migratsiya bo'lib ketadi. Narxi: CI 20 soniyadan bir yarim daqiqadan oshiqqa o'sadi. Shuning uchun bunday testlar kamroq.",
      fields: {
        container: "Production'dagi baza dvigateli va versiyasi, shu yurish uchun yangidan yaratilgan.",
        migrations: "Haqiqiy sxema, production qanday qursa, xuddi shunday qurilgan.",
        FAIL: "Deploy'dan oldin topildi: so'rov va sxema mos emas.",
        PASS: "Haqiqiy bazaga qarshi 36 ta test. Unit'dan sekin, lekin soatlar emas, daqiqalar.",
      },
    },
    "contract-break": {
      short: "API sindi",
      title: "Boshqa jamoa maydon nomini o'zgartirdi",
      body: "Narxlar jamoasi `price`'ni `unit_amount` deb qayta nomladi. Ularning testlari o'tadi: ular o'z kodini tekshiradi. Buyurtmalar testlari ham o'tadi: ular narxlar javobining eski stub'idan foydalanadi.\n\nProduction'da buyurtmalar servisi yo'q maydonni o'qiydi va har checkout yiqiladi. Ikkala jamoa ham yashil edi, xato esa ularning orasida yashadi.",
      fields: {
        unit_amount: "Yangi nom. Buyurtmalar hali ham `price`'ni o'qiydi, u esa endi yo'q.",
        currency: "O'zgarmagan. Faqat bitta maydon ko'chdi, shu yetarli bo'ldi.",
      },
    },
    contract: {
      short: "Contract",
      title: "Servislar orasida contract testlar",
      body: "Buyurtmalar jamoasi narxlardan nima kerakligini yozib qo'yadi: shu so'rov, butun son bo'lgan `price` maydoni. Shu fayl — contract.\n\nNarxlar CI'si har build'ni o'z iste'molchilarining hamma contract'lariga qarshi tekshiradi. Buyurtmalarni buzadigan qayta nomlash endi narxlar pipeline'ida, deploy'dan oldin yiqiladi va ikki jamoa avval gaplashadi.",
      fields: {
        consumer: "API'ni chaqiradigan va ehtiyojini yozib qo'ygan servis.",
        provider: "Tekshirilayotgan servis: aynan deploy qilmoqchi bo'lgan build.",
        FAILED: "Yangi build iste'molchi tayanadigan narsani bermayapti.",
        blocked: "Buzilish production'da emas, CI'da to'xtaydi.",
      },
    },
    e2e: {
      short: "End-to-end",
      title: "Bir nechta end-to-end test haqiqiy brauzerni boshqaradi",
      body: "CI brauzerni ochadi va checkout'dan odamdek o'tadi: savatni ochadi, Pay'ni bosadi, tasdiqni kutadi. Bu barcha servislardan birdaniga o'tadi.\n\nBu piramidaning cho'qqisi. Bitta test ko'p narsani tekshiradi, lekin sekin va qismlari ko'p, shuning uchun faqat asosiy foydalanuvchi yo'llari test oladi. CI endi deyarli to'rt daqiqa.",
      fields: {
        open: "Brauzer do'konning test nusxasidan haqiqiy sahifani yuklaydi.",
        click: "Xaridor bosadigan o'sha tugma.",
        see: "Test faqat xaridor ko'radigan matn chiqqanda o'tadi.",
        PASS: "Bitta yo'lga olti soniya. Mingtasi soatlab cho'ziladi.",
      },
    },
    flaky: {
      short: "Flaky",
      title: "O'n ikki yurishdan birida yiqiladigan test",
      body: "Checkout testi ba'zan yiqiladi va qayta urinishda o'tadi. Ikki test bitta test foydalanuvchisini ishlatadi, biri ikkinchisi qoldirgan savatni topadi. Ba'zan esa sahifa qat'iy 5 soniyalik kutishdan biroz sekinroq.\n\nOdamlar xatoni o'qimasdan retry bosishni boshlaydi. Tez orada haqiqiy xato ham retry bilan yo'qotib yuboriladi.",
      watch: "Flaky test testsizlikdan yomonroq: u jamoani qizilga e'tibor bermaslikka o'rgatadi.",
      fields: {
        TimeoutError: "Test qat'iy vaqt kutdi. Sahifa xato emas, shunchaki sekin edi.",
        "another test": "Umumiy ma'lumot: natija qaysi test birinchi yurganiga bog'liq.",
        retry: "Ikkinchi urinishda o'tdi. Sababi esa joyida qoldi.",
      },
    },
    isolate: {
      short: "Ajratish",
      title: "Har testga o'z ma'lumoti, shartni kutish",
      body: "Har test endi o'z foydalanuvchisi va bo'sh savatini yaratadi va keyin o'chiradi. Hech bir test boshqasining ma'lumotini ko'rmaydi.\n\nQat'iy vaqt uxlash o'rniga test tasdiq chiqquncha, chegaragacha kutadi. Baribir flaky bo'lgan test egasi va sanasi bilan karantin ro'yxatiga tushadi, qolgan testlarga esa ishonch saqlanadi.",
      fields: {
        user: "Faqat shu test yurishi uchun yangi foydalanuvchi.",
        cart: "Bo'sh boshlanadi, natija tartibga bog'liq bo'lmaydi.",
        expires_in: "Test ma'lumoti o'n daqiqadan keyin o'zi o'chadi, test qulab tushsa ham.",
      },
    },
    gate: {
      short: "Darvoza",
      title: "CI deploy oldidagi darvoza",
      body: "Har push qatlamlarni tartib bilan yurgizadi: avval unit, keyin integration, contract va end-to-end. Tez qatlamdagi xato yurishni erta to'xtatadi, dasturchi javobni soniyalarda oladi.\n\nDeploy faqat hamma qatlam yashil bo'lsa ruxsat etiladi. Endi hech kim noutbukdan deploy qilmaydi, raqamlar ham buni ko'rsatadi: oyiga to'qqizta o'rniga bitta xato xaridorga yetadi.",
      fields: {
        unit: "18 soniyada 412 ta test: tekshiruvning asosiy qismi shu yerda.",
        integration: "Haqiqiy baza, haqiqiy migratsiyalar.",
        contract: "Bu servisning har iste'molchisi kerakli narsani hali ham oladi.",
        e2e: "Faqat oltita asosiy foydalanuvchi yo'li.",
        allowed: "Faqat hamma narsadan o'tgan aynan shu build production'ga chiqishi mumkin.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Har test qatlami pastdagisi ushlay olmaganini ushlaydi.\n\n1) Mantiq uchun ko'p unit testlar, millisekundlarda. 2) Mock emas, container'dagi haqiqiy baza bilan integration testlar. 3) Servislar orasida contract testlar, provider CI'sida tekshiriladi. 4) Asosiy yo'llar uchun bir nechta end-to-end test. 5) Flaky testlarni ajratilgan ma'lumot va shartni kutish bilan tuzating. 6) Hammasini CI yurgizadi, tez qatlamlar birinchi, faqat yashil build deploy bo'ladi.",
    },
  },
};

export default text;
