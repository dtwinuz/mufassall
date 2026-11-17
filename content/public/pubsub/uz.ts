import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Pub/sub va hodisalar jurnali",
  summary:
    "Bitta hodisa, uni kutayotgan ko'p jamoa. Topic ularni bir-biridan qanday ajratadi va offset, consumer group, kalit va sxema nima beradi.",
  learn: [
    "Nega bitta sekin obunachi checkout'ni hech qachon buzmasligi kerak",
    "Offset: o'chib qolgan consumer qanday yetib oladi va qayta o'qiydi",
    "Consumer group va partition'lar: bitta obunachini kengaytirish",
    "Kalit bo'yicha tartib va hodisani o'quvchilarni buzmasdan o'zgartirish",
  ],
  nodes: {
    shop: "Do'kon ilovasi",
    orders: "Buyurtmalar",
    email: "Email",
    stock: "Ombor",
    "stock-2": "Ombor 2",
    analytics: "Analitika",
    topic: "Topic",
  },
  metrics: {
    p95: "Checkout p95",
    failed: "Yiqilgan buyurtma",
    lag: "Lag (hodisa)",
    misordered: "Tartibsiz",
  },
  steps: {
    direct: {
      short: "To'g'ridan",
      title: "Buyurtmalar servisi hammani o'zi chaqiradi",
      body: "Buyurtma berilganda buyurtmalar servisi email, ombor va analitikani birma-bir chaqiradi va faqat shundan keyin do'konga javob beradi.\n\nBuyurtmalar kerak bo'lgan har yangi jamoa checkout ichida yana bitta chaqiruv degani. Har jamoa bilan javob sekinlashadi.",
      watch: "Buyurtmalar servisi endi har bir iste'molchini nomma-nom biladi. Yangisini qo'shish uchun buyurtmalarni o'zgartirib, qayta deploy qilish kerak.",
      fields: {
        order_id: "Bir xil maydonlar har servisga alohida so'rovda yuboriladi.",
        "X-Response-Time": "Faqat chekning o'zi 410 ms. Ketma-ket uchta chaqiruv deyarli bir soniya bo'ladi.",
      },
    },
    "one-down": {
      short: "Biri o'chdi",
      title: "Analitika o'chdi, checkout ham o'chdi",
      body: "Analitika servisi qotib qoldi. Buyurtmalar uni timeout'gacha kutadi va keyin butun checkout'ni xato bilan tugatadi.\n\nErtagacha hech kim o'qimaydigan hisobot bugun do'konning pul olishini to'xtatdi.",
      watch: "To'g'ridan chaqiruvda mavjudlik ko'paytiriladi: checkout faqat u chaqiradigan hamma servislar birga ishlaganda ishlaydi.",
      fields: {
        timeout: "Mijozga umuman kerak bo'lmagan servisni besh soniya kutish.",
        "checkout aborted": "Buyurtma o'zi tufayli emas, qo'shimcha ish tufayli yo'qoldi.",
      },
    },
    topic: {
      short: "Topic",
      title: "Bitta hodisani topic'ga yozish",
      body: "Buyurtmalar endi bitta hodisa, `order.placed`, ni topic'ga yozadi va do'konga javob beradi. Email, ombor va analitika har biri **obuna bo'ladi** va o'sha hodisani o'zi o'qiydi.\n\nTopic diskdagi faqat oxiriga yoziladigan jurnal (append-only log). Buyurtmalar uni kim o'qishini bilmaydi, yangi jamoa shunchaki obuna bo'ladi.",
      watch: "Endi checkout'dagi yagona chaqiruv yozish. U ishonchli bo'lishi shart, aks holda hodisa hamma uchun yo'qoladi.",
      check: {
        q: "Topic bor, analitika yana o'chdi. Checkout'ga nima bo'ladi?",
        options: [
          "Yana o'sha 5 soniyalik timeout'dan keyin yiqiladi",
          "Hech narsa: analitika jurnalda orqada qoladi, xolos",
          "Analitika qaytguncha buyurtmalar yozishni to'xtatadi",
        ],
        answer: 1,
        why: "Buyurtmalar yozishda, email va ombor o'qishda davom etadi. Analitika guruhi faqat offset'ini surmay qo'yadi, lag'i 12 300 hodisaga yetadi, hech biri yo'qolmaydi.",
      },
      fields: {
        acks: "`all` — yozuv barcha sinxron broker replikalariga ko'chirilgandan keyingina producer OK oladi.",
        event_type: "O'tgan zamondagi fakt: bajar degan buyruq emas, allaqachon bo'lgan hodisa.",
        offset: "Yozuvning partition ichidagi o'rni. Har o'quvchi shu jurnalda o'z offset'ini saqlaydi.",
      },
    },
    lagging: {
      short: "Lag",
      title: "O'lik obunachi faqat orqada qoladi",
      body: "Analitika yana o'chdi. Checkout buni sezmaydi: buyurtmalar yozishda, email va ombor o'qishda davom etadi.\n\nAnalitika guruhi shunchaki offset'ini surmay qo'yadi. Uning offset'i bilan jurnal oxiri orasidagi farq **lag** deyiladi.",
      watch: "Alert lag'ga qo'yiladi. O'sib borayotgan lag — consumer o'chgan yoki juda sekin degani.",
      fields: {
        "CURRENT-OFFSET": "Analitika guruhi saqlagan oxirgi o'rin: undan oldingi hamma narsa o'qilgan.",
        "LOG-END-OFFSET": "Producer hozir yozayotgan joy.",
        LAG: "Farq: 12 300 hodisa analitikani kutmoqda. Hech biri yo'qolmagan.",
      },
    },
    replay: {
      short: "Qayta o'qish",
      title: "Saqlangan offset'dan yetib olish",
      body: "Analitika qaytib keladi va oxirgi saqlangan offset'dan yozuvlarni so'raydi. U paketlab o'qiydi va har paketdan keyin yangi offset'ni commit qiladi.\n\nJurnal yozuvlarni kimdir o'qiguncha emas, kunlab saqlaydi. Shuning uchun consumer **qayta o'qishi** (replay) ham mumkin: bug tuzatilgach offset'ni orqaga surib, tarixni qaytadan ishlaydi.",
      watch: "Offset'ni ish tugagandan keyin commit qiling. Oldin commit qilinsa, yiqilish yozuvlarni tashlab ketadi.",
      fields: {
        offset: "Shu yerdan o'qi: analitika aynan to'xtagan joy.",
        group: "Offset bitta jarayonga emas, guruhga tegishli. Istalgan analitika nusxasi davom ettira oladi.",
        COMMIT: "Yangi o'rinni saqlaydi. Qayta ishga tushgandan keyin o'qish shu yerdan davom etadi.",
      },
    },
    "hot-consumer": {
      short: "Juda sekin",
      title: "Bitta obunachi ulgurmayapti",
      body: "Aksiya buyurtmalarni uch barobar oshirdi. Email va analitika ulguradi, ombor esa har hodisaga bazada update qiladi va 100% yuk bilan ishlaydi.\n\nUning lag'i daqiqasiga minglab o'sadi. Mijozlar allaqachon sotilgan tovarni omborda bor deb ko'radi.",
      watch: "Har obunachining o'z tezligi bor. Topic eng sekinini kutmaydi, butun g'oya shunda.",
      check: {
        q: "Ombor 100% yuk bilan ishlaydi, lag'i o'syapti. Boshqa obunachilarni sekinlatmasdan lag'ni nima tushiradi?",
        options: [
          "Topic ombor yetib olguncha kutib tursin",
          "Omborga topic'ning alohida nusxasini berish",
          "O'sha consumer group'ga ombor servisining ikkinchi nusxasini qo'shish",
        ],
        answer: 2,
        why: "Guruh 6 ta partition'ni ikki ombor nusxasiga uchtadan bo'lib beradi. Ish ikkiga bo'linadi, lag 0 ga tushadi, email va analitika esa alohida guruh bo'lgani uchun har bir hodisani olishda davom etadi.",
      },
    },
    group: {
      short: "Guruh",
      title: "Consumer group partition'larni bo'lishadi",
      body: "Topic'da 6 ta **partition** bor. Ombor servisining ikkinchi nusxasi o'sha consumer group'ga qo'shiladi va partition'lar ikkalasiga bo'linadi: har partition'ni aynan bitta a'zo o'qiydi.\n\nIsh ikkiga bo'linadi, lag tushadi. Email va analitika alohida guruhlar, ular baribir har bir hodisani oladi.",
      watch: "Partition sonidan ko'p band a'zo bo'lmaydi. Partition sonini o'sishni hisobga olib tanlang.",
      fields: {
        REBALANCE: "A'zolar o'zgardi, guruh partition'larni qayta taqsimlaydi. O'qish bir lahzaga to'xtaydi.",
        generation: "Har rebalance yangi raqam oladi, eski taqsimotli a'zo rad etiladi.",
        partitions: "Har biriga uchtadan. Har yozuv baribir aynan bitta ombor nusxasiga boradi.",
      },
    },
    misorder: {
      short: "Tartibsiz",
      title: "Bekor qilish buyurtmadan oldin keldi",
      body: "Mijoz buyurtma beradi va bir soniyadan keyin bekor qiladi. Ikki hodisada kalit yo'q, shuning uchun ular turli partition'larga tushadi va ularni ombor servisining turli nusxalari o'qiydi.\n\nBekor qilish birinchi ishlanadi: hali bekor qiladigan narsa yo'q. Keyin buyurtma hech qachon to'lanmaydigan tovarni band qiladi.",
      watch: "Topic tartibni faqat bitta partition ichida saqlaydi. Partition'lar orasida tartib umuman yo'q.",
      check: {
        q: "Buyurtma va bekor qilish turli partition'larga tushdi. Ombor ularni yozilgan tartibda ko'rishi uchun nima kerak?",
        options: [
          "Buyurtma ID'sini yozuv kaliti qilish",
          "Hamma partition'ni bitta ombor nusxasi o'qisin",
          "Consumer'da hodisalarni `occurred_at` bo'yicha saralash",
        ],
        answer: 0,
        why: "Partition kalitning hash'idan hisoblanadi, shuning uchun `ord_9051`'ning hamma hodisalari 2-partition'ga tushadi va tartibda o'qiladi. Turli buyurtmalar baribir hamma partition'larga tarqaladi, tartibsiz hodisalar 0 ga tushadi.",
      },
      fields: {
        event_type: "Oldinroq berilgan buyurtmani bekor qilish.",
        partition: "5-partition, `order.placed` esa 2-partition'ga tushgan. O'quvchilar har xil, tartib yo'q.",
      },
    },
    key: {
      short: "Kalit",
      title: "Bir xil kalit, bir xil partition",
      body: "Producer endi yozuvning **kalitini** buyurtma ID'si qiladi. Partition kalitning hash'idan hisoblanadi, shuning uchun bitta buyurtmaning hamma hodisalari bitta partition'ga tushadi va yozilgan tartibda o'qiladi.\n\nTurli buyurtmalar baribir hamma partition'larga tarqaladi, ish parallelligicha qoladi.",
      watch: "Juda faol bitta kalit bitta qizib ketgan partition beradi. Qiymatlari ko'p bo'lgan kalit tanlang.",
      fields: {
        key: "Buyurtma ID'si. `ord_9051` haqidagi hamma narsa endi bitta joyga boradi.",
        partition: "2-partition, o'zining `order.placed` hodisasi bilan bir xil. Ombor ularni tartibda ko'radi.",
      },
    },
    "schema-break": {
      short: "Buzuvchi o'zgarish",
      title: "Nomi o'zgargan maydon o'quvchini to'xtatadi",
      body: "Buyurtmalar jamoasi `total` ni `amount` deb qayta nomlab, deploy qiladi. Ularning o'z testlari o'tadi.\n\nAnalitika yangi yozuvni o'qiydi, `total` ni topmaydi va to'xtaydi. Yozuvlar jurnalda qoladi, lekin lag yana o'sadi.",
      watch: "Hodisa — ommaviy shartnoma. Producer barcha o'quvchilarini ko'rmaydi, demak hammasini test qila olmaydi.",
      fields: {
        amount: "Yangi nom. Eski o'quvchilar uni bilmaydi.",
        total: "Analitika kutgan maydon. U yo'q, shuning uchun consumer shu yozuvda to'xtaydi.",
      },
    },
    schema: {
      short: "Sxema",
      title: "Hodisaga versiya, o'zgarish faqat qo'shish orqali",
      body: "Hodisalar versiyali **sxema** oladi va yozilayotganda tekshiriladi. Ruxsat etilgan o'zgarish faqat qo'shish: yangi maydon qo'shiladi, eskisi hamma o'quvchi o'tmaguncha qoladi.\n\nAnalitika qayta ishga tushadi, ikkala versiyani o'qiydi va yetib oladi. `total` faqat keyingi versiyada, o'quvchilar tasdiqlagandan keyin olib tashlanadi.",
      fields: {
        schema_version: "O'quvchi qaysi shakl kelganini biladi va jurnalda qolgan eski yozuvlarni ham ishlay oladi.",
        total: "O'tish davrida eski o'quvchilar uchun saqlab turiladi.",
        amount: "Yangi o'quvchilar uchun qo'shildi. Ikkalasida bir xil qiymat.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Producer faktni bir marta yozadi; har obunachi guruhi uni o'z offset'i orqali o'z tezligida o'qiydi.\n\n1) Sekin obunachini xato emas, lag ko'rsatadi. 2) Offset ish tugagach commit qilinadi, kerak bo'lsa qayta o'qiladi. 3) Obunachi guruh orqali kengaytiriladi, partition sonigacha. 4) Tartib faqat kalit ichida bor. 5) Hodisa — shartnoma: versiyalang va faqat qo'shish orqali o'zgartiring.",
    },
  },
};

export default text;
