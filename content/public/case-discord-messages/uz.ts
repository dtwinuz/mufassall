import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Tajriba: Discord xabarlarni qanday saqlaydi",
  summary:
    "Bitta MongoDB kolleksiyasidan Cassandra'ga, keyin ScyllaDB'ga: Discord trillionlab chat xabarlarini qanday o'qiladigan holda saqladi. Partition kaliti, tombstone, issiq partitionlar, so'rovlarni birlashtiradigan data servislar va soniyasiga 3,2 million xabar tezlikdagi migratsiya. Manbalar: https://discord.com/blog/how-discord-stores-billions-of-messages va https://discord.com/blog/how-discord-stores-trillions-of-messages",
  learn: [
    "Nega (kanal, vaqt bucket'i) partition kaliti partitionlarni kichik saqlaydi",
    "O'chirish qanday tombstone'ga aylanadi va o'qishda u nimaga tushadi",
    "Issiq partition: bitta band kanal butun node'ni sekinlatadi",
    "Data servislar: so'rovlarni birlashtirish va kanalning consistent hash'i bo'yicha yo'naltirish",
    "Katta jonli migratsiya qanday tez qilindi, tekshirildi va oxiriga yetkazildi",
  ],
  nodes: {
    users: "Foydalanuvchilar",
    api: "API monolit",
    mongo: "MongoDB",
    n1: "Cassandra node 1",
    n2: "Cassandra node 2",
    n3: "Cassandra node 3",
    ds: "Data servis A",
    ds2: "Data servis B",
    mig: "Rust migrator",
    scylla: "ScyllaDB",
  },
  metrics: {
    read: "O'qish p99",
    insert: "Yozish p99",
    nodes: "Baza node'lari",
  },
  steps: {
    mongo: {
      short: "MongoDB",
      title: "2015: bitta kolleksiya, bitta indeks",
      body: "Discord avval hamma xabarni bitta MongoDB kolleksiyasida, `channel_id` va `created_at` bo'yicha qo'shma indeks bilan saqlagan. Tarix abadiy saqlanadi, o'qish va yozish taxminan 50/50, o'qishlar esa juda tasodifiy edi.\n\n2015-yil noyabriga kelib 100 millionga yaqin xabar yig'ildi. Ma'lumot va indeks RAM'ga sig'may qoldi, kechikish oldindan aytib bo'lmaydigan bo'ldi. Bu yerdagi so'rov soddalashtirilgan.",
      watch: "Faqat ishchi to'plam xotiraga sig'guncha tez bo'lgan ombor qiyalikdan emas, jarlikdan tushadi.",
      fields: {
        channel_id: "Har chat o'qishi — \"bitta kanalning oxirgi xabarlari\".",
        created_at: "Saralash tartibi. Keyin Snowflake id bilan almashtirildi: ikki xabar bir vaqtda bo'lishi mumkin.",
        RAM: "Indeks xotiradan chiqib ketgach, har o'qish diskka borishi mumkin.",
      },
    },
    "partition-key": {
      short: "Partition kaliti",
      title: "Cassandra: kanal vaqt bucket'lariga bo'lingan",
      body: "Discord xabarlarni Cassandra'ga ko'chirdi. Asosiy kalit — `((channel_id, bucket), message_id)`: bitta kanalning bitta vaqt oynasidagi hamma xabarlari bitta partitionda birga turadi va uchta node'ga nusxalanadi.\n\nBucket taxminan 10 kun, shunda eng katta kanallar ham har partitionda 100 MB dan kichik qoladi. `message_id` — Snowflake, u vaqt bo'yicha saralanadi. 2017-yilda klaster 12 node edi, o'qishlar 5 ms dan kam olardi.",
      watch: "Partition chegaralangan bo'lishi kerak. \"Faqat kanal\" degan kalit bitta band kanalga cheksiz o'sishga yo'l beradi.",
      check: {
        q: "Nega partition kaliti qilib faqat `channel_id` olinmaydi?",
        options: [
          "Cassandra raqamli partition kalitiga ruxsat bermaydi",
          "Band kanal o'sha bir necha node'da bitta ulkan partitionga aylanadi",
          "Bitta kanal xabarlari klaster bo'ylab tasodifiy sochilib ketadi",
        ],
        answer: 1,
        why: "Partition kaliti ma'lumotni qaysi node'lar saqlashini belgilaydi. Faqat kanal bo'lsa, eng band kanallar 100 MB dan ancha oshib ketadi va hech qachon tarqalmaydi. Vaqt bucket'i partitionni taxminan 10 kunlik xabar bilan cheklaydi.",
      },
      fields: {
        channel_id: "Partition kalitining birinchi yarmi: qaysi kanal.",
        bucket: "Ikkinchi yarmi: taxminan 10 kunlik qaysi oyna. Partition hajmini cheklaydi.",
        message_id: "Clustering kalit: Snowflake id, partition ichida xabarlar vaqt bo'yicha saralangan.",
        "PRIMARY KEY": "Ichki qavslar — partition kaliti, qolgani uning ichidagi qatorlar tartibi.",
      },
    },
    tombstones: {
      short: "Tombstone",
      title: "O'chirilgan xabarlar ham o'qishga tushadi",
      body: "Cassandra'da o'chirish ham yozuv: eski qiymatni compaction ikkalasini tozalaguncha yashirib turadigan tombstone. Bitta ommaviy serverda millionlab xabar o'chirilib, bittasi qoldirilgan.\n\nO'sha kanal taxminan 20 soniyada ochilardi: node bitta qatorni qaytarish uchun millionlab tombstone'ni varaqlardi va 10 soniyalik stop-the-world GC pauzalarini ko'rsatardi. Discord tombstone umrini 10 kundan 2 kunga qisqartirdi va so'rovlarni bo'shligi ma'lum bucket'larni o'tkazib yuboradigan qildi.",
      fields: {
        bucket: "So'rov bitta bucket'ni o'qiydi. Bu yerda u tombstone'ga to'la.",
        tombstones: "O'chirish belgilari. Compaction tozalaguncha o'qish ulardan hatlab o'tadi.",
        GC: "JVM axlat yig'uvchisi ishlayotganda butun node to'xtaydi.",
      },
    },
    growth: {
      short: "O'sish",
      title: "12 node'dan 177 tagacha",
      body: "2022-yil boshiga kelib xabarlar klasterida 177 node va trillionlab xabar bor edi. Bir necha do'stdan iborat kichik serverlar yuz minglab a'zoli serverlarga qaraganda bir necha tartib kam xabar yuboradi, shuning uchun partitionlar bo'yicha yuk juda notekis.\n\nNavbatchi jamoa shu baza sababli tez-tez uyg'otilardi.",
      fields: {
        "177": "Klasterdagi node'lar. Har birini sozlash, tuzatish va kuzatish kerak.",
        "replication factor": "Har partition uchta node'da turadi.",
        trillions: "Xabarlar tashlab yuborilmaydi: tarix doim o'qiladi.",
      },
    },
    "hot-partition": {
      short: "Issiq partition",
      title: "Bitta band kanal butun node'ni sekinlatadi",
      body: "Katta server e'lon joylaydi va juda ko'p odam bir vaqtda bitta kanalni ochadi. Bu o'qishlarning hammasi bitta partitionga, ya'ni o'sha uchta replikaga uriladi.\n\nO'qish va yozish kvorum bilan ishlaydi, shuning uchun sekin replika o'ziga kerak bo'lgan har so'rovni ushlab turadi, hatto o'sha node'dagi butunlay boshqa, jim kanallar so'rovlarini ham. Kechikish klaster bo'ylab tarqaladi.",
      watch: "Notekis kalitlar bitta node'ning yomon daqiqasini hammaning yomon daqiqasiga aylantiradi.",
      check: {
        q: "Minglab foydalanuvchi bir paytda bitta kanalni o'qiyapti. Partitioni o'sha node'larda turgan jim kanal bilan nima bo'ladi?",
        options: [
          "Hech narsa: har partitionga alohida xizmat qilinadi",
          "Uning o'qishlari ham sekinlashadi, chunki node'ning o'zi to'lib qolgan",
          "Uning ma'lumoti avtomatik boshqa node'ga ko'chadi",
        ],
        answer: 1,
        why: "Partition alohida mashina emas. Issiq partition node'ning CPU va diskini yeydi, kvorum o'qishlar esa shu node'ni kutadi, shuning uchun u yerda saqlangan har kanal sekinlashadi.",
      },
      fields: {
        QUORUM: "Uchta replikadan ikkitasi javob berishi kerak. Bitta sekin replika so'rovni sekinlatadi.",
        channel_id: "Hamma uchun bitta kanal: bitta partition, o'sha node'lar.",
        "every other query": "Shu node'lardagi boshqa kanallar issiq kanal uchun to'laydi.",
      },
    },
    compaction: {
      short: "Compaction",
      title: "Compaction ortda qoladi, GC pauzalari o'sadi",
      body: "Cassandra fon rejimida o'z fayllarini birlashtiradi (compaction). U ortda qolsa, har o'qish ko'proq faylni tekshiradi va sekinlashadi, sekin o'qishlar esa boshqalarini ham tortib ketadi.\n\nOperatorlar maqola \"gossip dance\" deb atagan ishni qilishardi: node'ni rotatsiyadan chiqarish, compaction qilishiga qo'yish, hint'larni olish uchun qaytarish, takrorlash. JVM axlat yig'ish pauzalari kechikish sakrashlarini berardi, ba'zilari shunchalik uzun ediki, node'ni qo'lda qayta yoqishga to'g'ri kelardi.",
      fields: {
        compactions: "Ma'lumot fayllarini fonda birlashtirish. Ortda qolish har o'qishni qimmatlashtiradi.",
        GC: "JVM'da axlat yig'ish: pauza paytida node javob bermaydi.",
        hints: "Node chiqarilgan paytda o'tkazib yuborgan yozuvlar, qaytganda qayta qo'llanadi.",
      },
    },
    "data-service": {
      short: "Data servis",
      title: "API va baza orasida data servis",
      body: "Discord API monolit va baza klasterlari orasiga data servislar qo'ydi. Ular Rust'da yozilgan va gRPC endpoint'lar ochadi, taxminan har baza so'roviga bittadan, ataylab hech qanday biznes mantiqsiz.\n\nShunda trafik bazaga qanday yetishini boshqaradigan bitta joy paydo bo'ldi. Bu yerdagi xabar soddalashtirilgan namuna.",
      fields: {
        gRPC: "API va data servis orasidagi tiplangan RPC.",
        channel_id: "So'rov kanalni aytadi. Bu keyingi ikki qadamda muhim.",
        "business logic": "Bu yerda yo'q: servis faqat bazaga kirishni shakllaydi va himoya qiladi.",
      },
    },
    coalescing: {
      short: "Birlashtirish",
      title: "So'rovlarni birlashtirish: ko'p o'quvchiga bitta so'rov",
      body: "Ko'p foydalanuvchi bir vaqtda bitta qatorni so'rasa, data servis bazaga faqat bir marta boradi. Birinchi so'rov worker task'ni boshlaydi, u ishlab turganda kelgan so'rovlar o'sha task'ga obuna bo'ladi va uning natijasini oladi.\n\nIssiq kanaldagi bir xil o'qishlar to'lqini baza uchun bitta o'qishga aylanadi.",
      watch: "Birlashtirish faqat bir xil so'rovlar bitta jarayonda uchrashganda yordam beradi.",
      check: {
        q: "Data servis nusxalari ko'p, API esa tasodifiy birini tanlaydi. Birlashtirish issiq kanalga qanchalik yordam beradi?",
        options: [
          "Kam: bir xil o'qishlar nusxalarga sochilgan, har biri o'z so'rovini yuboradi",
          "To'liq: nusxalar worker task'larni tarmoq orqali bo'lishadi",
          "Umuman yo'q: birlashtirish faqat yozuvlar uchun ishlaydi",
        ],
        answer: 0,
        why: "Birlashtirish bitta nusxa ichidagi so'rovlarni qo'shadi. Tasodifiy yo'naltirishda har nusxa o'quvchilarning bir qismini ko'radi va baribir o'z so'rovini yuboradi, natijada baza hammaga bitta emas, har nusxaga bitta so'rov oladi.",
      },
      fields: {
        "worker task": "Uni birinchi so'rov boshlaydi; bazadan aynan u o'qiydi.",
        subscribe: "Keyingi so'rovlar bazaga bormaydi, o'sha javobni kutadi.",
        "same rows": "Hamma bitta o'qishning bir xil natijasini oladi.",
      },
    },
    routing: {
      short: "Yo'naltirish",
      title: "Kanal bo'yicha consistent hash bilan yo'naltirish",
      body: "So'rovlar kalit bo'yicha yo'naltiriladi; xabarlar uchun kalit — kanal id'si. Consistent hash har kanalni bitta data servis nusxasiga bog'laydi, shuning uchun bitta kanalning hamma so'rovi bir joyga tushadi va birlashtirish to'liq ishlaydi.\n\nDiscord yozishicha, bu o'zgarishlar vaqt yutib berdi va trafik sakrashlarini tekisladi, lekin issiq partitionlarni butunlay yo'qotmadi.",
      fields: {
        channel_id: "Yo'naltirish kaliti. Bir xil kanal — bir xil nusxa.",
        "consistent hash": "Nusxa qo'shilsa yoki olinsa, kanallarning faqat kichik qismi ko'chadi.",
        "same instance": "Bir xil so'rovlar aynan shu yerda uchrashib birlashadi.",
      },
    },
    migrate: {
      short: "Migratsiya",
      title: "Trillionlab xabarni ScyllaDB'ga ko'chirish",
      body: "ScyllaDB Cassandra bilan mos, C++'da yozilgan, axlat yig'uvchisi yo'q va ishni CPU yadrolari bo'yicha bo'ladi. 2020-yilga kelib Discord'ning qolgan hamma bazasi unga ko'chgan edi.\n\nBirinchi reja — yangi ma'lumotni ikkala bazaga yozish va tarixni ScyllaDB'ning Spark migratori bilan nusxalash — uch oyga baholandi. Jamoa Rust'da o'z migratorini yozdi: u token oraliqlarini o'qiydi, checkpoint'larni SQLite'da saqlaydi va ScyllaDB'ga yozadi. Yangi baho — to'qqiz kun, cho'qqida soniyasiga 3,2 million xabar. Migratsiya 99,9999% da to'xtab qoldi: oxirgi oraliqlar tombstone'ga to'la edi va compaction qilinmaguncha timeout bo'lardi. Tekshirish uchun o'qishlarning kichik qismi ikkala bazaga yuborilib, javoblar solishtirildi.",
      fields: {
        "token range": "Hash halqasining bir bo'lagi. Ish va progress birligi.",
        SQLite: "Lokal checkpoint fayli: qayta ishga tushganda nusxalash boshidan emas, davomidan boshlanadi.",
        estimate: "Tezroq nusxalovchi tufayli uch oy o'rniga to'qqiz kun.",
        "99.9999%": "Oxirgi oraliqlar eski tombstone'larda yiqildi — avvalgi muammoning o'zi.",
      },
    },
    results: {
      short: "Natija",
      title: "Kamroq node, tekis kechikish",
      body: "Discord 2022-yil mayida ScyllaDB'ga o'tdi. 177 ta Cassandra node'i 72 ta ScyllaDB node'iga aylandi, har birida o'rtacha taxminan 4 TB o'rniga 9 TB.\n\nTarixni o'qish p99'i 40-125 ms dan 15 ms ga, yozish p99'i 5-70 ms dan barqaror 5 ms ga tushdi. 2022-yilgi jahon chempionati finalida har goldan keyin xabar yuborish sakradi va tizim bardosh berdi.",
      fields: {
        p99: "Sekin dum. Kunga qarab o'zgaradigan oraliq edi, bitta tekis raqamga aylandi.",
        "72": "Ko'chishdan keyingi node'lar, avval 177 edi.",
        "9 TB": "Har node'dagi disk: node kamroq, lekin kattaroq.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Discord tarixidan nimani olish kerak.\n\n1) Partition kalitini qanday o'qishingizga qarab tanlang va uni chegaralang: kanal va vaqt bucket'i. 2) O'chirish ham yozuv; tombstone va compaction o'qish narxiga kiradi. 3) Notekis kalitlar issiq partition beradi; bazani oldidagi qatlam bilan himoya qiling. 4) Bir xil o'qishlarni birlashtiring va ular uchrashishi uchun o'sha kalit bo'yicha yo'naltiring. 5) Katta migratsiyada nusxalovchini tez va davom ettiriladigan qiling, almashtirishdan oldin ikkala ombordan o'qishni solishtiring.\n\nManbalar: https://discord.com/blog/how-discord-stores-billions-of-messages va https://discord.com/blog/how-discord-stores-trillions-of-messages",
    },
  },
};

export default text;
