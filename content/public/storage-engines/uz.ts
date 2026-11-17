import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Saqlash dvigatellari: B-tree va LSM",
  summary:
    "Sensorlar soniyasiga 50 000 ko'rsatkich yuboradi va B-tree jadval ulgurmaydi. Bir yozuvning LSM-tree dvigatel ichidagi yo'lini kuzatamiz: WAL, memtable, SSTable va compaction — va bu o'qishga qancha tushishini ko'ramiz.",
  learn: [
    "Nega B-tree butun sahifani qayta yozadi va kichik yozuvlarni diskdagi tasodifiy IO'ga aylantiradi",
    "LSM-tree yozuvni qanday qo'shib yozishga aylantiradi: WAL, memtable, SSTable'ga flush",
    "O'qish kuchayishi (read amplification), Bloom filtr va nega compaction yozishni to'xtatib qo'yishi mumkin",
    "Qachon B-tree yutadi, qachon LSM-tree",
  ],
  nodes: {
    sensors: "Sensorlar",
    ingest: "Qabul servisi",
    table: "B-tree jadval",
    wal: "WAL",
    memtable: "Memtable",
    l0: "SSTable L0",
    l1: "SSTable L1",
    compact: "Compaction",
    dash: "Dashboard API",
  },
  metrics: {
    writes: "Qabul qilingan yozuvlar",
    "write-amp": "Yozish kuchayishi",
    "read-files": "Bir o'qishda tekshirilgan joylar",
    "read-p99": "O'qish p99",
  },
  steps: {
    btree: {
      short: "B-tree",
      title: "Yozuv B-tree sahifasiga tushadi",
      body: "Har sensor bir necha soniyada ko'rsatkich yuboradi. Qabul servisi har birini B-tree birlamchi kaliti `(sensor_id, ts)` bo'lgan `readings` jadvaliga yozadi.\n\nBaza kalit tegishli barg sahifani topadi, uni xotirada o'zgartiradi va o'zgarishni WAL'ga yozadi. Keyinroq butun 8 KB sahifa diskka tushadi, holbuki qator 40 bayt edi.",
      check: {
        q: "Sensorlar soniyasiga 50 000 yozuvgacha ko'payadi, har biri boshqa sahifaga. Birinchi bo'lib nima taslim bo'ladi?",
        options: [
          "WAL: qo'shib yozish ulgurmaydi",
          "CPU: shuncha INSERT'ni tahlil qilish",
          "Disk: tasodifiy sahifa yozuvlari uni 100% band qiladi",
        ],
        answer: 2,
        why: "Har yozuv boshqa 8 KB sahifani o'zgartiradi, to'lgan sahifalar bo'linadi, shuning uchun disk jadval bo'ylab tasodifiy joylarga yozadi. Disk 100% band, jadval soniyasiga atigi 12 000 yozuv qabul qiladi; WAL'ga qo'shib yozish esa arzon qism.",
      },
      fields: {
        sensor_id: "Kalitning birinchi ustuni. 10 000 sensorning ko'rsatkichlari 10 000 xil sahifaga tushadi.",
        wal: "Write-ahead log yozuvi: kichik va ketma-ket. Bu qismi arzon.",
        dirty: "Sahifa xotirada o'zgardi. Ertami-kechmi butun 8 KB diskka qayta yoziladi.",
      },
    },
    "random-io": {
      short: "Tasodifiy IO",
      title: "Soniyasiga 50 000 yozuvda disk taslim bo'ladi",
      body: "Sensorlar soniyasiga 50 000 yozuvgacha ko'paydi. Har yozuv boshqa sahifaga tegadi, shuning uchun disk jadval bo'ylab tasodifiy joylarga yozadi. To'lgan sahifalar ikkiga bo'linadi va har bo'linish yana yoziladigan sahifalar demak.\n\nDisk 100% band, jadval soniyasiga atigi 12 000 yozuv qabul qiladi. Sensorlar xato oladi va ma'lumot yo'qoladi.",
      watch: "Yozish kuchayishi: 40 bayt ma'lumot diskda kilobaytlab yozuvga aylanadi.",
      fields: {
        checkpoint: "Baza barcha o'zgargan sahifalarni diskka tushiradi. Bu yerda qariyb 30 soniya.",
        buffers: "Bir necha yuz MB yangi qator uchun 3,2 GB lik 8 KB sahifalar yozildi.",
        "page splits": "To'lgan barg sahifa ikkiga bo'lindi: ikkala yarmi va ota sahifa yoziladi.",
        IOPS: "Soniyadagi tasodifiy IO amallari. Disk chegarasida.",
      },
    },
    lsm: {
      short: "LSM",
      title: "LSM-tree: logga qo'shib yoz, xotirada sarala",
      body: "LSM-tree dvigateliga o'tamiz. Yozuv ikki arzon ish qiladi: faqat oxiridan o'sadigan WAL fayliga qo'shiladi va memtable'ga — xotiradagi saralangan daraxtga — kalitni qo'yadi.\n\nDiskda hech qanday sahifa qidirilmaydi va qayta yozilmaydi. Disk bitta ketma-ket oqimni ko'radi va servis soniyasiga 50 000 yozuv qabul qiladi.",
      fields: {
        APPEND: "Log faylining oxiriga yozadi. Qidirish yo'q, yozishdan oldin o'qish yo'q.",
        offset: "Bu yozuv fayldagi qaysi joyda. U faqat oshib boradi.",
        "group commit": "312 yozuv bitta disk sinxronizatsiyasini bo'lishadi. Log soniyasiga o'n minglab yozuvni shunday ko'taradi.",
        fsync: "Yozuv tasdiqlanishidan oldin ma'lumot diskda. Jarayon o'lsa, WAL memtable'ni qayta tiklaydi.",
      },
    },
    flush: {
      short: "Flush",
      title: "To'lgan memtable SSTable'ga aylanadi",
      body: "Memtable 64 MB ga yetganda u muzlatiladi, yozuvlarni yangi bo'sh memtable oladi, muzlatilgani esa diskka SSTable sifatida yoziladi: boshqa hech qachon o'zgarmaydigan saralangan fayl.\n\nFlush'dan keyin uning WAL bo'lagi kerak emas va o'chiriladi. Yangi fayllar 0-darajaga tushadi.",
      check: {
        q: "Har L0 fayl deyarli barcha sensorlarni qamraydi. Bitta sensorning oxirgi ko'rsatkichini o'qish nechta joyni tekshiradi?",
        options: [
          "Ko'p: memtable va kalitni qamragan har L0 faylni",
          "Bitta: SSTable saralangan, kalit bitta faylda",
          "Diskda hech birini: oxirgi qiymat doim memtable'da",
        ],
        answer: 0,
        why: "L0 fayllarning kalit oraliqlari bir-birini qoplaydi, eng yangi qiymat istalgan faylda bo'lishi mumkin. Dvigatel memtable'ni, keyin 30 faylni yangisidan eskisiga tekshiradi: 31 joy, o'qish p99 85 ms ga chiqadi.",
      },
      fields: {
        flush: "Saralangan memtable'ni bitta ketma-ket o'tishda diskka yozish.",
        level: "`0` — flush'dan chiqqan yangi fayllar. Ularning kalit oraliqlari bir-birini qoplaydi.",
        range: "Fayldagi eng kichik va eng katta kalit. Har L0 fayl deyarli barcha sensorlarni qamraydi.",
        deleted: "Ma'lumot endi SSTable'da xavfsiz, shuning uchun log bo'lagini o'chirsa bo'ladi.",
      },
    },
    "read-amp": {
      short: "O'qish kuchayishi",
      title: "Bitta o'qish 31 joyni tekshiradi",
      body: "Dashboard `s_1093` sensorining oxirgi ko'rsatkichini so'raydi. Eng yangi qiymat istalgan joyda bo'lishi mumkin, shuning uchun dvigatel memtable'ni, keyin har L0 faylni yangisidan eskisiga tekshiradi.\n\nO'ttizta fayl kalitni qamraydi, topilgani esa oxirgisida. Bitta o'qish 31 qidiruvga aylandi va o'qish p99 85 ms ga chiqdi.",
      watch: "LSM'da yozish arzon, chunki ish o'qishga va compaction'ga ko'chirilgan.",
      fields: {
        miss: "Fayl kalit oralig'ini qamraydi, lekin kalit unda yo'q. Bekor disk o'qishi.",
        hit: "Eng eski faylda topildi. Dvigatel faqat endi javob bera oladi.",
        "files read": "O'qish kuchayishi: bitta kalit uchun 31 joy tekshirildi.",
      },
    },
    bloom: {
      short: "Bloom",
      title: "Bloom filtr noto'g'ri fayllarni o'tkazib yuboradi",
      body: "Har SSTable'ga Bloom filtr beriladi: har kalitga bir necha bit, xotirada saqlanadi. U «aniq bu yerda yo'q» yoki «bu yerda bo'lishi mumkin» deb javob beradi.\n\nDvigatel endi 29 faylni diskka tegmasdan o'tkazib yuboradi va faqat «balki» degan faylni o'qiydi. Bitta disk o'qishi, p99 yana 9 ms.",
      fields: {
        bloom: "Disk o'qishidan oldin xotirada tekshiruv. `no` doim to'g'ri.",
        maybe: "Ehtimol shu yerda; taxminan 1% holatda xato bo'ladi va o'qish bekorga ketadi.",
        "disk reads": "Bitta kalit uchun 31 dan 1 ga.",
      },
    },
    compaction: {
      short: "Compaction",
      title: "Compaction fayllarni 1-darajaga birlashtiradi",
      body: "L0 o'sishda davom etadi: har bir necha soniyada yangi fayl. Fonda ishlaydigan compaction L0 fayllarni L1 ga birlashtiradi: saralangan, bir-birini qoplamaydigan fayllar, har kalit faqat bitta L1 faylda yashaydi.\n\nEski versiyalar va o'chirilgan kalitlar tashlanadi. Narxi: o'sha ma'lumot diskka yana yoziladi — har darajada bir marta.",
      check: {
        q: "Bo'ron yozuvlarni soniyasiga 80 000 ga chiqaradi, compaction L0'ni birlashtirishga ulgurmaydi. Nima bo'ladi?",
        options: [
          "Yozish davom etadi, faqat disk joyi o'sadi",
          "Dvigatel yozishni ataylab sekinlashtiradi",
          "Compaction yetib olguncha o'qishlar yiqiladi",
        ],
        answer: 1,
        why: "Flush L0 fayllarni compaction birlashtirishga ulgurganidan tezroq yaratadi. L0 36 fayllik chegaraga yetganda dvigatel o'qishni himoya qilish uchun yozuvchilarni cheklaydi, qabul qilingan yozuvlar soniyasiga 16 000 ga tushadi.",
      },
      fields: {
        compact: "Bir necha saralangan faylni o'qish, birlashtirish, yangisini yozish. Katta ketma-ket ish.",
        "old versions": "Sensorlar bitta `latest` kalitini qayta-qayta yozadi. Faqat eng yangi versiya qoladi.",
        tombstones: "LSM'da o'chirish — keyin yoziladigan belgi. Compaction nihoyat ma'lumotni ham, belgini ham olib tashlaydi.",
      },
    },
    stall: {
      short: "To'xtash",
      title: "Compaction ortda qoladi va yozish to'xtaydi",
      body: "Bo'ron bo'ladi, hamma sensor bir vaqtda xabar beradi, yozuvlar soniyasiga 80 000 ga sakraydi. Flush L0 fayllarni compaction birlashtirishga ulgurganidan tezroq yaratadi.\n\nL0 chegaraga yetganda dvigatel yozishni ataylab sekinlashtiradi, toki o'qish yuzlab faylni tekshirmasin. Qabul qilingan yozuvlar 16 000 ga tushadi.",
      watch: "LSM-tree to'lqinni faqat compaction ulgurayotgan paytda ko'taradi. Compaction qarzi — haqiqiy qarz.",
      fields: {
        "write stall": "Dvigatel o'qish va disk joyini himoya qilish uchun yozuvchilarni cheklaydi.",
        limit: "L0 fayllar soniga qat'iy chegara. Undan oshsa, yozish to'xtaydi.",
        "pending compaction": "41 GB birlashtirishni kutmoqda. Bu son o'sishi emas, kamayishi kerak.",
      },
    },
    tune: {
      short: "Sozlash",
      title: "Compaction'ga joy ber, kirishni chegarala",
      body: "Compaction ikkita emas, oltita oqim oladi. Kattaroq memtable kamroq, lekin kattaroq L0 fayl yaratadi. Yozish 36 faylda to'xtash o'rniga 20 faylda yumshoq sekinlashadi.\n\nQabul servisi har node'ni soniyasiga 60 000 yozuv bilan cheklaydi va ortiqchasini qisqa vaqt buferda ushlaydi. Yozuvlar yana soniyasiga 50 000, L0 kichik qoladi.",
      fields: {
        threads: "Ko'proq parallel birlashtirish — CPU va disk o'tkazuvchanligi hisobiga.",
        "memtable size": "Kamroq flush, kamroq L0 fayl; xotira va uzunroq WAL tiklash evaziga.",
        slowdown: "Qattiq to'xtash o'rniga erta va yumshoq tormoz.",
        "ingest limit": "Dvigatel «yo'q» deyishidan oldin, eshik oldida backpressure.",
      },
    },
    "range-scan": {
      short: "Oraliq o'qish",
      title: "Oraliqni o'qish: bu yerda B-tree yutadi",
      body: "Dashboard bitta sensorning oxirgi bir soatini so'raydi. B-tree bir nechta qo'shni barg sahifani o'qiydi. LSM dvigatel esa memtable, har L0 fayl va L1 ustida iterator ochadi va ularni birlashtiradi.\n\nU compaction hali tashlamagan eski versiyalardan ham o'tadi. Oraliqni o'qish 45 ms oladi, B-tree esa bir necha millisekundda bajarardi.",
      fields: {
        SCAN: "Bitta kalit emas, kalitlar oralig'i.",
        "merge iterators": "Har daraja saralangan, lekin ular alohida. Dvigatel beshta oqimni birlashtiradi.",
        skipped: "Ko'rilgan kalitlarning uchdan biri o'sha kalitning eski versiyalari edi.",
        bloom: "Bloom filtr «bu kalit shu yerdami?» ga javob beradi, «A va B orasida nima bor?» ga emas.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "B-tree ma'lumotni joyida yangilaydi: tez va oldindan aytsa bo'ladigan o'qish va oraliq so'rovlar, lekin har kichik yozuv tasodifiy joydagi sahifani qayta yozadi. LSM-tree qo'shib yozadi va keyin saralaydi: juda tez yozish, evaziga o'qish kuchayishi va compaction.\n\nO'qish ko'p, tranzaksion va oraliq so'rovlari ko'p ma'lumot uchun B-tree tanlang. Yozish ko'p oqimlar uchun — hodisalar, metrikalar, loglar — LSM-tree. LSM'da uchta sonni kuzating: L0 fayllar soni, kutilayotgan compaction va write stall'lar.",
    },
  },
};

export default text;
