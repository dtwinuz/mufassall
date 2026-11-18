import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Matn bo'yicha qidiruv (full-text search)",
  summary:
    "Marketpleys katalogni `LIKE '%so'z%'` bilan qidiradi. 4 million mahsulotda har bir qidiruv jadvalning har bir qatorini o'qiydi, shunga qaramay boshqa apostrof bilan, kirillda yoki o'zbekcha qo'shimcha bilan yozilgan mahsulotlarni topa olmaydi. Haqiqiy matn qidiruvini bosqichma-bosqich quramiz: tahlil qilingan tokenlar ustidagi teskari indeks, BM25 reytingi, bazaning o'zgarishlar log'iga ergashadigan indeks, scatter-gather bilan shard'lar va xatoga chidamli qidiruv.",
  learn: [
    "Nega `LIKE '%x%'` indeksdan foydalana olmaydi va butun jadvalni o'qiydi",
    "Tahlil (analyzer): kichik harf, kirilldan lotinga, o'zbekcha apostroflar va qo'shimchalar, indekslashda ham, so'rovda ham bitta analyzer",
    "Postings ro'yxatli teskari indeks va BM25 reytingi aniq raqamlarda",
    "Indeksni o'zgarishlar log'i orqali yangi saqlash, hujjat bo'yicha sharding, scatter-gather va xatolarga chidamlilik",
  ],
  nodes: {
    user: "Do'kon ilovasi",
    api: "Qidiruv API",
    db: "Mahsulotlar bazasi",
    catalog: "Katalog servisi",
    index: "Qidiruv indeksi",
    indexer: "Indekser",
    log: "O'zgarishlar log'i",
    shard1: "Indeks shard 1",
    shard2: "Indeks shard 2",
  },
  metrics: {
    p95: "Qidiruv p95",
    scanned: "Har qidiruvda o'qilgan qatorlar",
    missed: "Topilmagan kerakli mahsulotlar",
    zero: "Natijasiz qidiruvlar",
    lag: "Yozuvdan qidiruvgacha",
  },
  steps: {
    like: {
      short: "LIKE",
      title: "Katalog kichikligida LIKE bilan qidirish",
      body: "Sotuvchilar mahsulotni katalog servisi orqali qo'shadi, xaridorlar qidiruv qatoriga so'z yozadi. Birinchi versiya bitta so'rovdan iborat: nom va tavsif ustidan `LIKE '%choynak%'`, sotuvlar soni bo'yicha saralangan.\n\n50 000 mahsulotda u 45 ms da javob beradi. Hech kim bu haqda boshqa o'ylamaydi.",
      fields: {
        LIKE: "Matnni har bir qatorda belgima-belgi solishtiradi.",
        "%choynak%": "Ikki tomonda ham wildcard: so'z matnning istalgan joyida bo'lishi mumkin.",
        sold_count: "Yagona reyting: matnda nima yozilganidan qat'i nazar, ommabopi birinchi.",
        "50 000 products": "Hamma narsani o'qish hali tez bo'ladigan darajada kichik.",
      },
    },
    scan: {
      short: "To'liq skan",
      title: "4 million mahsulot: har qidiruv jadvalni o'qiydi",
      body: "Uch yildan keyin katalogda 4 million mahsulot va 1.2 GB matn bor. Har bir qidiruv bularning hammasini o'qiydi: 2.8 soniya, eng gavjum paytda esa baza CPU'si 100% da.\n\nFaqat 1 840 qator mos keladi. Qolgan 3 998 160 tasi o'qiladi-yu tashlab yuboriladi.",
      check: {
        q: "`title` ustida B-tree indeks bor. Nega baza undan foydalanmaydi?",
        options: [
          "Statistika eskirgan, ANALYZE buni tuzatadi",
          "B-tree birinchi belgidan boshlab saralangan; boshida `%` bo'lsa, qidirishni boshlaydigan joy yo'q",
          "ORDER BY bilan birga indeks hech qachon ishlatilmaydi",
        ],
        answer: 1,
        why: "B-tree `choynak%` ni \"choynak\" bilan boshlanadigan so'zlar saralangan joyga sakrab topadi. `%choynak%` istalgan nomning istalgan joyidan boshlanishi mumkin, shuning uchun saralash tartibi yordam bermaydi va qoladigan yagona reja har bir qatorni o'qish.",
      },
      fields: {
        "Seq Scan": "Ketma-ket skanerlash: butun jadval, qatorma-qator.",
        "rows read": "1 840 tasini topish uchun hamma 4 million qator.",
        "Execution Time": "Har qidiruvga 2.8 s, soniyasiga yuzlab qidiruvda.",
        "leading %": "Boshidagi wildcard: qidirib topiladigan prefiks yo'q degani.",
      },
    },
    inverted: {
      short: "Teskari indeks",
      title: "Teskarisiga o'gir: so'zdan mahsulotlarga",
      body: "**Teskari indeks** (inverted index) har bir so'z uchun shu so'z uchraydigan mahsulotlar ro'yxatini saqlaydi: uning **postings**'ini. Qidiruv endi mahsulotlarni o'qimaydi, o'z so'zlarining ro'yxatlarini o'qib, ularni kesishtiradi.\n\n\"elektr choynak\" uchun u kamroq uchraydigan so'zning 21 000 ta id'sini aylanib chiqadi va uzunroq ro'yxatda oldinga sakraydi. 2.8 s o'rniga 18 ms. Hozircha indekser indeksni har kecha bazadan qaytadan quradi.",
      watch: "Indeks o'qish uchun qurilgan ma'lumotning ikkinchi nusxasi. Haqiqat manbai baza bo'lib qoladi, indeksni esa undan har doim qaytadan qurish mumkin.",
      fields: {
        df: "Document frequency: so'z nechta mahsulotda uchraydi.",
        postings: "Shu so'z uchun mahsulot id'larining saralangan ro'yxati.",
        positions: "So'z matnning qayerida turgani: \"elektr choynak\" kabi aynan shu tartibdagi ibora uchun kerak.",
        "jump ahead": "Ro'yxatlar saralangan, shuning uchun kerak bo'lmagan id bloklari butunlay o'tkazib yuboriladi.",
      },
    },
    spelling: {
      short: "Imlo",
      title: "Bitta so'z, to'rt xil yozilgan",
      body: "Tez, lekin kerakli mahsulotlarning uchdan biri hali ham topilmaydi. Sotuvchilar \"g'ilof\" ni ASCII apostrof bilan, rasmiy U+02BB belgisi bilan, umuman apostrofsiz yoki kirillda yozadi. Bir shaklni yozgan xaridor faqat shu shaklni topadi.\n\nO'zbekcha qo'shimchalar vaziyatni yanada og'irlashtiradi: indeks uchun \"telefon g'iloflari\" \"g'ilof\" dan boshqa so'z va hech narsa qaytarmaydi.",
      fields: {
        "ASCII apostrophe": "Har klaviaturadagi `'`. Eng ko'p uchraydi, lekin yagona shakl emas.",
        "U+02BB": "O'zbek alifbosidagi rasmiy apostrof harfi. Ko'rinishi bir xil, lekin boshqa belgi.",
        Cyrillic: "Ko'p sotuvchilar hali ham o'zbek kirillida yozadi. So'z o'sha, harflar boshqa.",
        suffix: "-lar, -i, -ni, -ning: bitta o'zak, o'nlab so'z shakli.",
      },
    },
    analyze: {
      short: "Analyzer",
      title: "So'z nima ekanini bir marta, ikkala tomon uchun hal qil",
      body: "So'z indeksga tushishidan oldin **analyzer** uni bir xil ko'rinishga keltiradi: kichik harf, kirilldan lotinga, apostrofning hamma variantlari olib tashlanadi, tokenlarga bo'linadi, qisqa ro'yxatdagi qo'shimchalar kesiladi. U+02BB apostrofli \"Telefon G'ILOFLARI\" ham, \"telefon g'ilof\" ham `telefon gilof` ga aylanadi.\n\nAsosiy qoida: aynan o'sha analyzer so'rovga ham qo'llanadi. Uni o'zgartirish hamma narsani qayta indekslash degani, chunki saqlangan tokenlarni eskisi yasagan.",
      watch: "Stemming'ni ehtiyotkorlik bilan qil. Qo'shimchalarni haddan tashqari kesish turli so'zlarni birlashtirib yuboradi; ko'plik va kelishik qo'shimchalarining qisqa ro'yxati va o'zakning kamida 3 harfi xavfsiz boshlanish.",
      fields: {
        lowercase: "\"Choynak\", \"CHOYNAK\" va \"choynak\" bitta tokenga aylanadi.",
        transliterate: "O'zbek kirill harflari lotinga o'giriladi: indeksda bitta alifbo.",
        apostrophes: "O'xshash beshala belgi olib tashlanadi, shunda \"g'ilof\" va \"gilof\" uchrashadi.",
        stem: "Qo'shimcha kesiladi: \"giloflari\" \"gilof\" orqali topiladi.",
        "index time": "Mahsulotga ham, so'rovga ham bir xil qadamlar, aks holda ular hech qachon mos kelmaydi.",
      },
    },
    bm25: {
      short: "BM25",
      title: "Sotuv bo'yicha emas, mosligi bo'yicha sarala",
      body: "Endi \"elektr choynak\" ga 1 840 ta mahsulot mos keladi va tartib muhim. **BM25** har biriga ball beradi: kam uchraydigan so'zlar og'irroq (`idf`), ko'p takrorlanish yordam beradi, lekin tobora kamroq, uzun matnlar esa chegirma oladi.\n\nA choynak 11.29 ball oladi. B filtr uzun tavsifda \"choynak\" ni to'rt marta takrorlaydi, baribir faqat 8.65 oladi. Moslarni sanaganda B yutgan bo'lardi.",
      check: {
        q: "Sotuvchi tavsifga \"choynak\" ni 40 marta tiqib qo'ydi. BM25 bunga nima qiladi?",
        options: [
          "Ball 40 barobar o'sadi, mahsulot eng tepaga chiqadi",
          "Ball biroz o'sadi va to'yinadi, uzun matn esa chegirma oladi",
          "BM25 spamni sezib, mahsulotni olib tashlaydi",
        ],
        answer: 1,
        why: "Termin qismi tf x (k1 + 1) / (tf + k1 x uzunlik koeffitsiyenti): tf qanchalik katta bo'lmasin, u k1 + 1 = 2.2 dan oshmaydi. Uzun tavsif uzunlik koeffitsiyentini oshiradi va ballni yana pasaytiradi. Spamga baribir alohida filtr kerak, lekin u endi takrorlash bilan yutmaydi.",
      },
      fields: {
        idf: "Kamyoblik: \"choynak\" (21 000 mahsulot) \"elektr\" (96 000) dan og'irroq.",
        k1: "Takrorlar qanchalik tez foydasiz bo'lib qolishi. Odatiy qiymat 1.2.",
        b: "Uzun matnga qancha chegirma beriladi. Odatiy qiymat 0.75.",
        tf: "So'z shu mahsulotda necha marta uchraydi.",
        len: "Shu mahsulotdagi tokenlar soni, o'rtacha 12 bilan solishtiriladi.",
      },
    },
    stale: {
      short: "Eski indeks",
      title: "Yangi mahsulot ertagacha ko'rinmaydi",
      body: "Indeks har kecha qaytadan quriladi. 10:12 da qo'shilgan choynak ertasi kuni 05:40 da, 2 soat 40 daqiqalik qayta qurishdan keyin qidiruvda chiqadi. Narx va qoldiq o'zgarishlari ham shuncha kutadi.\n\nKun bo'yi 3 800 ta tugagan mahsulot hali ham \"sotuvda bor\" bo'lib ko'rinadi. O'rtacha har bir o'zgarish qidiruvga yetib borguncha 12 soat kutadi.",
      fields: {
        "seller adds": "Yozuv bazaga darhol yetadi.",
        "nightly rebuild": "Bir necha ming o'zgarish uchun 4 million qatorni yana o'qish.",
        "19 h 28 min": "Shu bitta mahsulot uchun kutish.",
        "sold-out": "Xaridor bosadi, mahsulot sahifasi esa u tugaganini aytadi.",
      },
    },
    cdc: {
      short: "O'zgarishlar log'i",
      title: "Indeksni bazaning o'zgarishlar log'idan ozuqlantir",
      body: "Mahsulotlar jadvalidagi har bir commit bo'lgan o'zgarish CDC yoki outbox orqali o'zgarishlar log'iga tushadi. Indekser uni o'qiydi, 500 ta o'zgarishni bitta bulk so'rovga yig'adi va faqat o'zgarganini yuboradi.\n\nIndeks yangi yozuvlarni har **refresh** da qidiruvga ochadi, bu yerda soniyada bir marta. Bu **near-real-time**: o'zgarish commit'dan taxminan 1.6 s keyin topiladi, darhol emas, lekin ertaga ham emas.",
      check: {
        q: "Nega katalog servisi bazaga commit qilgandan keyin darhol indeksga ham yozmasin?",
        options: [
          "Indeks alohida yozuvlarni qabul qila olmaydi",
          "Bu o'zgarishlar log'idan sekinroq bo'lardi",
          "Bu ikki yozuv (dual write): servis ikki yozuv orasida yiqilsa, indeks o'zgarishni jimgina o'tkazib yuboradi",
        ],
        answer: 2,
        why: "Umumiy tranzaksiyasiz ikki tizimga ikki yozuv: ba'zida commit o'tadi, indeksga yozish esa o'tmaydi. O'zgarishlar log'ini commit'ning bir qismi sifatida bazaning o'zi yozadi, shuning uchun commit bo'lgan hech narsa tushib qolmaydi, yiqilgan indekser esa log'dagi o'z joyidan davom etadi.",
      },
      fields: {
        lsn: "Baza log'idagi joy. Qayta ishga tushgach indekser shu yerdan davom etadi.",
        bulk: "Bitta so'rovda ko'p o'zgarish: har mahsulotga alohida so'rovdan ancha arzon.",
        refresh_interval: "Yangi yozuvlar qanchalik tez-tez qidiruvga ochiladi. Qisqaroq bo'lsa, birlashtirish kerak bo'lgan mayda segmentlar ko'payadi.",
        "1.6 s": "Commit'dan qidiruvda topilguncha, boshidan oxirigacha.",
      },
    },
    shard: {
      short: "Shard'lar",
      title: "Hujjat bo'yicha bo'l, har bir shard'dan so'ra",
      body: "Tavsiflar va pozitsiyalar bilan indeks 38 GB ga yetadi va bitta node xotirasiga sig'maydi: gavjum paytda p95 sekin-asta o'sadi. U mahsulot id'si bo'yicha ikki **shard**'ga bo'linadi, har birida 2 million mahsulot.\n\nQidiruv API so'rovni ikkala shard'ga yuboradi (**scatter**), har biri o'zining top 10 tasini qaytaradi, API esa 20 ta natijani ball bo'yicha birlashtiradi (**gather**). Javob sekinroq shard qancha ishlasa, shuncha vaqt oladi: 24 ms.",
      watch: "Har bir shard idf'ni o'z hujjatlaridan hisoblaydi. Tasodifiy id'larda bu hamma joyda deyarli bir xil; kichik yoki notekis shard'larda esa turli shard'lardan kelgan ballarni solishtirib bo'lmay qoladi.",
      fields: {
        "top 10": "Har bir shard hamma moslarni emas, faqat eng yaxshi 10 tasini qaytaradi.",
        merge: "API 2 x 10 nomzoddan umumiy top 10 ni tanlaydi.",
        "by document": "Yozuv bitta shard'ga boradi, har bir o'qish esa hamma shard'lardan so'raydi.",
        "by term": "Har shard ba'zi so'zlarga egalik qiladi: o'qish arzonlashadi, lekin yozuv ko'p shard'ga tegadi va ommabop so'z bitta node'ni yuklab tashlaydi.",
      },
    },
    typo: {
      short: "Xatolar",
      title: "Xaridor \"choyank\" yozsa ham \"choynak\" ni top",
      body: "Qidiruvlarning 2% i hali ham hech narsa topmaydi, asosan yozuv xatolari tufayli. **Fuzzy** so'rov tahrir masofasi ichidagi so'zlarni ham qabul qiladi: \"choyank\" \"choynak\" dan bitta o'rin almashish narida.\n\nCheklovlar uni arzon tutadi: ko'pi bilan 2 ta tahrir, birinchi harf mos kelishi shart, qisqa so'zlarga kamroq tahrir. Indeks 21 ms da 1 840 ta natija qaytaradi va tuzatilgan so'rovni taklif qiladi.",
      fields: {
        q: "Xaridor xato bilan yozgani.",
        max_edits: "Ko'pi bilan 2 ta o'zgargan, tushib qolgan yoki ortiqcha harf. Ko'prog'i deyarli hamma narsaga mos keladi.",
        prefix_length: "Birinchi harf mos kelishi shart: nomzodlarni bir necha barobar qisqartiradi.",
        transpositions: "Joyi almashgan ikki qo'shni harf bitta tahrir hisoblanadi, eng ko'p uchraydigan xato.",
        corrected: "Xaridorga \"balki shuni nazarda tutgandirsiz\" deb ko'rsatiladi.",
        Authorization: "Ilova tokeni, bu yerda yashirilgan.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Matn qidiruvining oltita qoidasi.\n\n1) `LIKE '%x%'` har bir qatorni o'qiydi; kichik jadvaldan kattasiga yaramaydi. 2) So'z nima ekanini mahsulot ham, so'rov ham uchun bitta analyzer bilan hal qil: kichik harf, bitta alifbo, apostrof variantlarisiz, ehtiyotkor stemmer. 3) Teskari indeks so'zlarni saralangan postings'ga bog'laydi; qidiruv faqat shu ro'yxatlarni o'qiydi. 4) BM25 bilan sarala: kamyoblik hisobga olinadi, takrorlar to'yinadi, uzun matnlar chegirma oladi. 5) Indeksni bazaning o'zgarishlar log'idan ozuqlantir va near-real-time'ni qabul qil; narx va qoldiq bazadan qayta o'qiladi. 6) Hujjat bo'yicha shard qil, scatter-gather ishlat va xatolarga qat'iy cheklovlar bilan chidamli bo'l.",
    },
  },
  scenarios: {
    "indexer-lag": {
      label: "Indekser 5 daqiqa ortda",
      steps: {
        "lag-pile": {
          short: "Kechikish",
          title: "Narxlar ro'yxati yuklandi, indeks 5 daqiqa ortda qoldi",
          body: "10:01 da yirik sotuvchi narxlar ro'yxatini yuklaydi: 4 daqiqada 2.4 million yangilanish. O'zgarishlar log'iga soniyasiga 10 000 ta o'zgarish keladi, indekser esa 4 000 tasini uddalaydi. Kechikish 1.8 million o'zgarishga, 300 soniyaga yetadi.\n\nQidiruv hali ham 24 ms da javob beradi, lekin 5 daqiqa oldingi suratdan: narx bo'yicha filtrlar kechagi narxlarni ishlatadi, sotuvchi esa hozirgina qo'shgan mahsulotini topa olmaydi.",
          check: {
            q: "Xaridor indeksda 299 000 bo'lib turgan choynakni bosdi, bazada esa narx allaqachon 329 000. Savatga nima tushadi?",
            options: [
              "299 000: xaridor ko'rgan narx",
              "Bazadagi 329 000, sahifa esa narx o'zgarganini ko'rsatadi",
              "Hech narsa: indeks yetib olguncha mahsulot bloklanadi",
            ],
            answer: 1,
            why: "Indeks topish uchun, haqiqat esa bazada. Mahsulot sahifasi va savat uchun narx va qoldiq bazadan o'qiladi, shuning uchun eskirgan indeks mahsulotni ro'yxatning noto'g'ri joyida ko'rsatishi mumkin, lekin uni hech qachon noto'g'ri narxda sotmaydi.",
          },
          fields: {
            incoming: "Soniyasiga keladigan o'zgarishlar, indekser qo'llay oladiganidan 2.5 barobar ko'p.",
            "consumer lag": "Indekser log'dan qanchalik ortda: o'zgarishlarda va soniyalarda.",
            "yesterday's price": "Filtr indeksdagi nusxada ishlaydi, u esa 5 daqiqa eski.",
            "4 minutes ago": "Yozuv bazada bor; hali bilmayotgani indeks.",
          },
        },
        "lag-catchup": {
          short: "Yetib olish",
          title: "Birlashtir, paketla va haqiqatni bazadan o'qi",
          body: "2.4 million yangilanishning ko'pchiligi bir mahsulotga bir necha marta tegadi. Indekser har bir mahsulot id'si uchun faqat oxirgi o'zgarishni qoldiradi: 600 000 hujjat. Log'dagi joy versiya vazifasini bajaradi, shuning uchun eskiroq o'zgarish yangisini hech qachon ustidan yozmaydi.\n\nYetib olish paytida kattaroq bulk'lar va 30 s lik refresh indeksni minglab mayda segment yaratishdan saqlaydi. To'rtta iste'molchi mahsulot id'si bo'yicha bo'linadi. 10:11 ga kelib kechikish yana 2 s.",
          fields: {
            coalesce: "Bitta mahsulotning o'nta narx o'zgarishi indeksga bitta yozuv bo'ladi.",
            "version = lsn": "Indeks o'zida borigidan eskiroq yozuvni rad etadi.",
            refresh_interval: "Yetib olish paytida uzunroq, keyin yana 1 s.",
            "re-read from the DB": "Ko'rsatilayotgan sahifa uchun o'nta primary key so'rovi: to'g'ri narx, 3 ms.",
          },
        },
      },
    },
  },
};

export default text;
