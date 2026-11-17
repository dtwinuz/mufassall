import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Unikal ID'lar",
  summary:
    "Buyurtmalar servisi ID'ni baza hisoblagichidan oladi. Keyin ma'lumot ikkita bazaga bo'linadi va hisoblagichlar bir xil raqamlarni bera boshlaydi. Hamma joyda unikal, indeksda yaxshi tartiblanadigan va soat orqaga sakrasa ham buzilmaydigan ID qanday yasaladi.",
  learn: [
    "Nega shard'lashdan keyin auto-increment unikal bo'lmay qoladi",
    "Nega tasodifiy UUIDv4 kalitlar B-tree indeksga zarar qiladi va UUIDv7 buni qanday tuzatadi",
    "64 bitli ID vaqt, mashina va ketma-ketlikdan qanday yig'iladi",
    "Soat orqaga ketsa nima qilish kerak",
  ],
  nodes: {
    client: "Ilova",
    api: "Buyurtmalar API",
    "api-2": "Buyurtmalar API #2",
    "db-1": "Shard 1",
    "db-2": "Shard 2",
    ntp: "Vaqt serveri",
  },
  metrics: {
    p95: "Yozish p95",
    dup: "Takroriy ID'lar",
    splits: "Indeks sahifa bo'linishi",
  },
  steps: {
    sequence: {
      short: "Hisoblagich",
      title: "Bitta baza, bitta hisoblagich",
      body: "Har bir yangi buyurtma ID'ni bazadan oladi: faqat o'sib boradigan sequence (ketma-ketlik). `48213`, keyin `48214` va hokazo.\n\nBu oddiy, qisqa, vaqt bo'yicha tartiblangan va unikal, chunki hisoblagich bitta.",
      fields: {
        RETURNING: "Baza API'ga hozirgina qaysi ID berganini aytadi. API raqamni o'zi tanlamaydi.",
        "48213": "Hisoblagichning keyingi qiymati. 8 baytli butun son, yozilish tartibida.",
      },
    },
    shards: {
      short: "Ikki hisoblagich",
      title: "Ikki shard, ikki hisoblagich, bir xil raqamlar",
      body: "Buyurtmalar foydalanuvchi bo'yicha ikkita bazaga bo'lindi. Ikkalasi bir xil sxemadan yaratilgan, har birida o'z hisoblagichi bor va ikkalasi ham hozir 48 000 atrofida.\n\nShard 2 `48214` ni beradi, shard 1 esa `48214` ni allaqachon boshqa odamga bergan. `/orders/48214` endi ikkita buyurtmani bildiradi va pulni qaytarish noto'g'ri buyurtmaga tushadi.",
      watch: "Bitta baza ichida unikal bo'lgan ID bazalar orasida unikal emas.",
      fields: {
        u_77: "Boshqa foydalanuvchi, shard 2 ga yo'naltirilgan.",
        "48214": "Shard 1 da ham `48214` buyurtma bor. Shard raqamini tashlab yuboradigan hisobot va havolalar ularni aralashtiradi.",
      },
    },
    offsets: {
      short: "Toq / juft",
      title: "Yamoq: bir shard'da toq, ikkinchisida juft ID",
      body: "Endi ikkala hisoblagich 2 qadam bilan yuradi va har xil joydan boshlaydi: shard 1 toq, shard 2 juft raqam beradi. Takrorlar to'xtaydi.\n\nLekin sxema \"ikkita shard\" ga mahkam bog'langan. Uchinchisini qo'shish uchun barcha hisoblagichlarni bir vaqtda qayta sozlash kerak, foydalanuvchini boshqa shard'ga ko'chirish esa yangi ID talab qiladi.",
      watch: "ID'ni hali ham baza beradi. ID qator qayerda saqlanishiga bog'liq.",
      fields: {
        "INCREMENT BY": "Qadam 2: shard 2 faqat juft ID beradi.",
        "RESTART WITH": "Ishlatilgan barcha ID'lardan yuqori, to'g'ri juftlikdagi yangi boshlanish nuqtasi.",
      },
    },
    uuid4: {
      short: "UUIDv4",
      title: "ID'ni servis yasasin: tasodifiy UUID",
      body: "Endi API ID'ni yozishdan oldin o'zi yaratadi: UUIDv4, 122 ta tasodifiy bit. Hisoblagich yo'q, kelishuv yo'q, istalgan server va istalgan shard.\n\nMilliardlab qatorda ham ikkita bir xil ID chiqish ehtimoli juda kichik. Qatorni boshqa shard'ga ko'chirganda ID o'zgarmaydi.",
      check: {
        q: "Endi tasodifiy UUIDv4 kalitlar B-tree primary key indeksiga yoziladi. Yozuvlar bilan nima bo'ladi?",
        options: [
          "Sekinlashadi: tasodifiy sahifalarga tushib, ularni bo'ladi",
          "Tezlashadi: kelishiladigan hisoblagich yo'q",
          "O'zgarmaydi: har qanday kalitni yozish bir xil",
        ],
        answer: 0,
        why: "Hisoblagich bilan har yozuv oxirgi sahifaga tushardi. Tasodifiy kalitlar butun indeks bo'ylab sahifalarga tushadi, ularni diskdan o'qish kerak, ular to'lib bo'linadi: bo'linish sekundiga 2 dan 900 ga, yozish p95 4 dan 38 ms ga chiqadi.",
      },
      fields: {
        id: "Bazada emas, API'da yaratilgan. Ikkinchi chiziqchadan keyingi `4` — 4-versiya: tasodifiy.",
      },
    },
    "random-index": {
      short: "Indeks buzildi",
      title: "Tasodifiy kalitlar indeksni titib tashlaydi",
      body: "Primary key indeksi kalit tartibida saqlanadigan B-tree. Hisoblagich bilan har bir yozuv oxirgi sahifaga tushardi. Tasodifiy UUID bilan esa har bir yozuv butun indeks bo'ylab tasodifiy sahifaga tushadi.\n\nBu sahifalarni diskdan o'qish kerak, ular to'lib, ikkiga bo'linadi va indeks yarim bo'sh holda o'sadi. Yozish p95 4 ms dan 38 ms ga chiqadi, ikkala shard qiziydi.",
      watch: "Tasodifiy kalit unikallik uchun yaxshi, lokallik uchun yomon.",
      fields: {
        avg_leaf_density: "Barg sahifalar atigi 61% to'la: har bo'linish ikkita yarim bo'sh sahifa qoldiradi.",
        leaf_fragmentation: "Barg sahifalarning deyarli yarmi fizik tartibda emas. Diapazon bo'yicha o'qish disk bo'ylab sakraydi.",
      },
    },
    uuid7: {
      short: "UUIDv7",
      title: "UUIDv7: avval vaqt, keyin tasodif",
      body: "UUIDv7 o'sha 128 bitli formatni saqlaydi, lekin uning birinchi 48 biti — millisekunddagi joriy vaqt. Qolgani tasodifiy.\n\nYangi ID'lar yana doim indeks oxiriga yaqin tushadi, yozuvlar bir nechta issiq sahifaga boradi. Bo'linish sekundiga 900 dan 3 ga tushadi, p95 yana 5 ms. ULID ham shu g'oya, faqat boshqa matn kodlashida.",
      fields: {
        id: "`01a205c0aef8` — ms'dagi yaratilish vaqti. Uchinchi guruh `7` bilan boshlanadi: 7-versiya.",
      },
    },
    snowflake: {
      short: "64 bitli ID",
      title: "Yanada kichik: 64 bitda vaqt + mashina + ketma-ketlik",
      body: "Ikkinchi API server qo'shildi. Ba'zi tizimlar oddiy `bigint` ga sig'adigan ID xohlaydi: har bir indeks va foreign key'da UUID'dan ikki baravar kichik.\n\nBitta 64 bitli son uch qismdan yig'iladi: tanlangan epoch'dan beri o'tgan millisekundlar, mashina raqami va shu millisekund ichidagi hisoblagich. Har bir server ID'ni mustaqil yasaydi; ular to'qnashmaydi, chunki mashina raqamlari har xil.",
      check: {
        q: "Vaqt serveri API #2 soatini 40 ms orqaga suradi. Uning 64 bitli ID generatori nima qiladi?",
        options: [
          "Hech narsa: mashina raqami ID'larni unikal saqlaydi",
          "Soat yetib olguncha xato bilan to'xtaydi",
          "Avval bergan o'sha ID'larni qayta chiqaradi",
        ],
        answer: 2,
        why: "40 ms davomida generator allaqachon ishlatgan millisekundlarni ko'radi, hisoblagich esa 0 dan boshlanadi. O'sha vaqt, o'sha mashina, o'sha ketma-ketlik: bitta 64 bitli ID ikki marta. Mashina raqami faqat serverlarni ajratadi.",
      },
      fields: {
        time: "Servisning o'z epoch'idan beri 41 bit millisekund. ID'lar hali ham vaqt bo'yicha tartiblanadi.",
        machine: "10 bit: 1 024 tagacha generator. Har bir serverga bir marta beriladigan o'z raqami kerak.",
        sequence: "12 bit: bir mashinada millisekundiga 4 096 tagacha ID. Har yangi millisekundda 0 ga qaytadi.",
      },
    },
    "clock-back": {
      short: "Soat sakradi",
      title: "Soat orqaga ketdi va ID takrorlandi",
      body: "Vaqt serveri API #2 ga uning soati 40 ms oldinda ekanini aytadi. Tizim soati orqaga suriladi.\n\nKeyingi 40 ms davomida generator allaqachon ishlatgan millisekundlarni ko'radi. Hisoblagich 0 dan boshlangan, shuning uchun u aynan o'sha ID'larni qayta chiqaradi. Ikki buyurtma, bitta ID.",
      watch: "Tizim vaqti faqat oldinga yurishiga kafolat yo'q.",
      fields: {
        "clock step": "Soat asta-sekin emas, sakrab to'g'rilandi.",
        seq: "O'sha vaqt, o'sha mashina, o'sha ketma-ketlik: bitta 64 bitli ID ikki marta berildi.",
      },
    },
    "wait-out": {
      short: "Kutib tur",
      title: "Hech qachon oxirgi vaqt belgisidan pastga tushma",
      body: "Generator oxirgi ID vaqtini eslab qoladi. Agar soat undan orqada bo'lsa, soat yetib olguncha kutadi. Kichik sakrash bir necha millisekund kechikishga tushadi, xolos.\n\nSoat juda orqada bo'lsa, generator ID berishni rad etadi va server aylanishdan chiqariladi. Jim takrorlardan qisqa uzilish yaxshiroq.",
      fields: {
        waiting: "Generator millisekundni qayta ishlatish o'rniga to'xtab turadi.",
        refuse: "Chegaradan oshsa, kutish juda uzoq bo'ladi. Server ID berishni to'xtatadi va ogohlantiradi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Baza hisoblagichi baza bittadan ko'p bo'lmaguncha a'lo ishlaydi.\n\n1) ID'ni har bir shard'da emas, servisda yarating. 2) Tasodifiy ID'dan ko'ra vaqt bo'yicha tartiblanganini tanlang (UUIDv7, ULID, vaqt + mashina + ketma-ketlik): indeks ixcham qoladi. 3) Har bir generatorga unikal mashina raqami bering. 4) Oxirgisidan kichik vaqt belgili ID'ni hech qachon bermang: kuting yoki rad eting.",
    },
  },
};

export default text;
