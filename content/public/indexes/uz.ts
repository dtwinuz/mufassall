import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bazadagi indekslar",
  summary:
    "Jadval 40 million qatorga yetgach, buyurtmalar tarixi sahifasi sekinlashadi. So'rov rejasini o'qiymiz, to'g'ri B-tree indekslarni qo'shamiz va har indeks yozishga qancha tushishini ko'ramiz.",
  learn: [
    "`EXPLAIN`ni o'qish: `Seq Scan` va `Index Scan` farqi",
    "Nega composite indeksda ustunlar tartibi qaysi so'rovga yordam berishini hal qiladi",
    "Covering indeks jadvalga tegmasdan qanday javob beradi",
    "Nega har ortiqcha indeks har `INSERT`ni sekinlashtiradi",
  ],
  nodes: {
    app: "Do'kon ilovasi",
    api: "Buyurtmalar API",
    db: "Buyurtmalar bazasi",
    report: "Kunlik hisobot",
    import: "Ommaviy import",
  },
  metrics: {
    p95: "Sahifa p95",
    scanned: "So'rov o'qigan qatorlar",
    insert: "Bir qator yozish",
    indexes: "orders'dagi indekslar",
  },
  steps: {
    slow: {
      short: "Sekin sahifa",
      title: "Buyurtmalar tarixi 2,4 soniyada ochiladi",
      body: "Mijoz «Buyurtmalarim» sahifasini ochadi. API bazadan `42` mijozning eng yangi 20 ta buyurtmasini so'raydi.\n\n`orders` jadvalida endi 40 million qator bor, sahifa ikki soniyadan ko'p ochiladi. Baza yuki 95%, holbuki u bor-yo'g'i bitta sahifaga javob berdi.",
      fields: {
        customer_id: "Filtr. Bazada 42-mijozning qatorlari qayerdaligini ko'rsatadigan hech narsa yo'q.",
        LIMIT: "Bizga faqat 20 qator kerak. Lekin baza avval barcha nomzodlarni topishi kerak.",
        Time: "20 qator uchun 2,4 soniya. Bu butun jadvalni o'qish vaqti.",
      },
    },
    "seq-scan": {
      short: "Seq Scan",
      title: "EXPLAIN butun jadval o'qilganini ko'rsatadi",
      body: "`EXPLAIN ANALYZE` so'rovni bajaradi va baza tanlagan rejani chiqaradi. Uni ichkaridan tashqariga o'qing: eng ichki qator birinchi bajariladi.\n\nReja `orders`ning har bir qatorini o'qiydi, 1 800 tadan boshqasini tashlaydi, saralaydi va 20 tasini qoldiradi. Haqiqiy yuk ostida API kutib qoladi, ilovada timeout boshlanadi.",
      watch: "1 000 qatorda to'liq o'qish normal. 40 millionda esa bu jadval bilan birga o'sadigan nosozlik.",
      fields: {
        EXPLAIN: "Rejani ko'rsatadi. `ANALYZE` bilan so'rovni bajaradi ham va haqiqiy qator soni va vaqtni chiqaradi.",
        "Seq Scan": "Ketma-ket o'qish: jadval boshidan oxirigacha. Mos indeks yo'q edi.",
        "Rows Removed by Filter": "Qariyb 40 million qator bekorga o'qildi. Muammoning bitta raqamdagi ko'rinishi.",
        "Execution Time": "Baza ichidagi vaqt, tarmoqsiz.",
      },
    },
    btree: {
      short: "B-tree",
      title: "customer_id ustiga B-tree indeks",
      body: "Indeks — alohida saralangan tuzilma: `customer_id` qiymatlarining B-tree daraxti, har biri jadvaldagi o'z qatorlariga ishora qiladi. 42-mijozni topish uchun baza 40 million qator o'rniga daraxtning 3–4 darajasidan o'tadi.\n\n`CONCURRENTLY` uni yozishni bloklamasdan quradi. Sahifa 35 ms gacha tushadi: endi faqat shu mijozning 1 800 qatori o'qiladi.",
      fields: {
        CONCURRENTLY: "Jadvalga yozish davom etayotganda indeks quradi. Sekinroq, lekin ishlayotgan jadval bloklanmaydi.",
        customer_id: "Indekslangan ustun. U bo'yicha qidiruv daraxt bo'ylab yurishga aylanadi.",
        Time: "40 million qatorda qurish uch daqiqa. Uni eng qizg'in soatlardan tashqarida yurgizing.",
      },
    },
    "big-customer": {
      short: "Katta mijoz",
      title: "250 000 buyurtmali ulgurji mijoz",
      body: "`7` mijoz — 250 000 buyurtmasi bor ulgurji sotuvchi. Indeks uning qatorlarini tez topadi, lekin ular sana bo'yicha tartiblanmagan.\n\nShuning uchun baza eng yangi 20 tasini olish uchun jadvaldan 250 000 qatorni o'qib, saralaydi. Sahifa yana 900 ms, faqat katta mijozlarda.",
      fields: {
        "Index Cond": "Indeks ishlatilyapti, lekin faqat mijozni topish uchun.",
        "Sort Method": "Indeksdan keyin saralash: qatorlar noto'g'ri tartibda chiqdi.",
        "Execution Time": "Sahifa hajmiga emas, mijozning kattaligiga qarab o'sadi.",
      },
    },
    composite: {
      short: "Composite",
      title: "Ikki ustunli bitta indeks",
      body: "Composite indeks `(customer_id, created_at DESC)` avval mijoz bo'yicha, keyin har mijoz ichida sana bo'yicha saralangan. Baza 7-mijozga sakraydi va birinchi 20 yozuvni o'qiydi: ular allaqachon eng yangilari.\n\nSaralash yo'q, 20 qator o'qildi, 1 ms dan kam. Eski bir ustunli indeks endi bunisining boshlang'ich qismi bo'lib qoldi va foydasiz.",
      fields: {
        idx_orders_cust_created: "`customer_id` bo'yicha, keyin `created_at` bo'yicha yangisidan eskisiga saralangan.",
        "Index Cond": "O'sha filtr, lekin qatorlar to'g'ri tartibda chiqadi.",
        "Execution Time": "884 ms dan 0,9 ms ga, mijoz qanchalik katta bo'lishidan qat'i nazar.",
      },
    },
    "column-order": {
      short: "Ustun tartibi",
      title: "Yangi indeks kunlik hisobotga yordam bermaydi",
      body: "Kunlik hisobot kechadan beri barcha mijozlarning buyurtmalarini jamlaydi. U faqat `created_at` bo'yicha filtrlaydi va reja yana to'liq o'qish.\n\nComposite indeks familiya, keyin ism bo'yicha saralangan telefon kitobiga o'xshaydi. U barcha Anvarlarni topa olmaydi: birinchi ustun so'rovda bo'lishi shart. Bu o'qish bazani yuklaydi va buyurtmalar sahifasi ham sekinlashadi.",
      watch: "Composite indeks chapdan o'ngga, boshidagi ustunlar bo'yicha so'rovlarga xizmat qiladi. Faqat ikkinchi ustun bo'yicha filtr hech narsa olmaydi.",
      fields: {
        created_at: "Hisobot faqat composite indeksning ikkinchi ustuni bo'yicha filtrlaydi.",
        "Seq Scan": "Har hisobotda yana 40 million qatorni o'qish.",
      },
    },
    "report-index": {
      short: "Ikkinchi indeks",
      title: "Hisobot so'rovi uchun indeks",
      body: "Faqat `created_at` ustiga indeks qo'shamiz. Hisobot endi bir kunlik buyurtmani o'qiydi: 40 million o'rniga 95 000 ga yaqin qator.\n\nBuyurtmalar sahifasi yana tez. Lekin jadvalda endi to'rtta indeks bor va yozish vaqti sekin-asta oshmoqda.",
      fields: {
        idx_orders_created: "Faqat sana bo'yicha saralangan. Sana oralig'i endi daraxtning qisqa bo'lagi.",
        "Index Cond": "Sana filtriga indeks javob beradi.",
      },
    },
    covering: {
      short: "Covering",
      title: "Covering indeks jadvalga umuman tegmaydi",
      body: "Composite indeks bilan ham 20 qatorning har biri uchun `status` va `total`ni o'qish maqsadida jadvalga sakrash kerak. Bu 20 ta tasodifiy sahifa o'qish.\n\nIndeksni `(customer_id, created_at DESC) INCLUDE (status, total)` qilib qayta quramiz. Endi sahifaga kerak bo'lgan har ustun indeksning o'zida, jadval umuman o'qilmaydi.",
      fields: {
        "Index Only Scan": "Javob faqat indeksdan olinadi.",
        idx_orders_cust_cover: "Composite indeks va uning barglarida saqlanadigan ikki qo'shimcha ustun.",
        "Heap Fetches": "Jadvalning o'zidan nol o'qish. Bu son katta bo'lsa, visibility map eskirgan va `VACUUM` kerak.",
      },
    },
    "write-cost": {
      short: "Yozish narxi",
      title: "Yettita indeks va import sudraladi",
      body: "Bir yil davomida «har ehtimolga qarshi» yana uchta indeks qo'shildi: `status`, `total` va buyurtma izohi ustiga. Tungi import buyurtmalarni 500 tadan yuklaydi.\n\nHar yangi qator jadvalga va yettala indeksga yoziladi. Har indeks — yangilanadigan yana bitta daraxt va yana WAL: bir qatorni yozish 0,3 ms dan 2,4 ms ga oshdi.",
      watch: "Indeks o'zidan foydalanadigan o'qishni tezlashtiradi, lekin har yozishni sekinlashtiradi — ishlatilsa ham, ishlatilmasa ham.",
      fields: {
        "INSERT 0 500": "500 qator qo'shildi. Har biri yana yettita B-tree'ga ham yozildi.",
        Time: "500 qator uchun 1,2 soniya. Bitta indeks bilan shu paket 150 ms olardi.",
      },
    },
    trim: {
      short: "Keraksizini o'chir",
      title: "Hech kim o'qimaydigan indekslarni o'chirish",
      body: "Baza har indeks necha marta ishlatilganini sanaydi. Statistika oxirgi marta tozalangandan beri to'rttasida nol.\n\nO'sha to'rttasini o'chiramiz, composite almashtirgan eski `idx_orders_customer` ham shu jumladan. Uchta indeks qoladi, har biri o'z vazifasini bajaradi, yozish yana 0,5 ms.",
      fields: {
        idx_scan: "Shu indeks necha marta ishlatilgani. Haftalar davomida nol bo'lsa — faqat xarajat.",
        idx_orders_customer: "Birinchi ustuni bir xil bo'lgan composite indeks uni to'liq qoplaydi.",
        idx_orders_status: "Hech qachon yozilmagan so'rov uchun qo'shilgan. Sof yozish xarajati.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Rejadan boshlang: `EXPLAIN ANALYZE` va `Rows Removed by Filter` qatori baza aslida nima qilayotganini ko'rsatadi.\n\n1) B-tree indeks to'liq o'qishni daraxt bo'ylab yurishga aylantiradi. 2) Composite indeksda ustunlar tartibi muhim: avval filtrlar, keyin saralash ustuni. 3) `INCLUDE` uni covering qiladi va jadval o'qilmaydi. 4) Har indeks har yozishga tushadi: `idx_scan`ni tekshiring va hech kim ishlatmaydiganini o'chiring.",
    },
  },
};

export default text;
