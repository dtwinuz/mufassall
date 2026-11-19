import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Cursor bilan sahifalash",
  summary:
    "To'lov ilovasi sotuvchining tranzaksiyalarini eng yangisidan boshlab, sahifasiga 50 tadan, OFFSET bilan ko'rsatadi. Ikki million qatorli sotuvchida chuqur sahifalar millionlab qatorni o'qib tashlab yuboradi, yangi to'lovlar har bir sahifani suradi, har bir birinchi sahifada esa aniq jami soni sanaladi. Mos indeksli keyset sahifalash, shaffof bo'lmagan imzolangan cursor, oldingi sahifa, jami son o'rniga \"yana bor\" va filtrlarga bog'langan cursor buni qadam-baqadam tuzatadi.",
  learn: [
    "Nega `OFFSET` har bir sahifa bilan sekinlashadi va ma'lumot o'zgarayotganda qatorlarni takrorlaydi yoki tashlab ketadi",
    "`(created_at, id)` bo'yicha keyset sahifalash: so'rov, unga kerak bo'lgan kompozit indeks va nega noyob `id` saralashda bo'lishi shart",
    "Shaffof bo'lmagan cursor: ichida nima bor, nega u imzolanadi yoki hech bo'lmasa tekshiriladi, keyingi va oldingi sahifa qanday ishlaydi",
    "Aniq jami son nimaga tushadi, uning o'rnini nima bosadi (\"yana bor\", taxminiy son) va sahifalar orasida filtr o'zgarsa nima qilish kerak",
  ],
  nodes: {
    app: "Sotuvchi ilovasi",
    api: "To'lovlar API",
    db: "Tranzaksiyalar bazasi",
    export: "Tungi eksport",
    cache: "Hisoblagich keshi",
  },
  metrics: {
    query: "Sahifa so'rovi vaqti",
    scanned: "Sahifaga o'qilgan qator",
    dup: "Ikki marta ko'ringan qator",
    lost: "Hech ko'rinmagan qator",
    count: "Birinchi sahifadagi sanash",
    dbcpu: "Baza CPU",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Tranzaksiyalar, eng yangisi birinchi, sahifasiga 50 ta",
      body: "Sotuvchilar ilovada tranzaksiyalar ro'yxatini ochadi: eng yangisi birinchi, sahifasiga 50 ta. API `page=N` ni `OFFSET (N-1) x 50` ga aylantiradi va jami sonni ham qaytaradi, shunda ilova \"40 827 dan 1-sahifa\" deb ko'rsata oladi.\n\nEng katta sotuvchida 2 041 337 ta tranzaksiya bor. Birinchi sahifa tez: 4 ms, 50 qator o'qiladi. Lekin jami sonni hisoblash har safar 1.3 s oladi.",
      fields: {
        page: "Sahifa raqami: client ma'lum sondagi qatorni o'tkazib yuborishni so'raydi.",
        limit: "Bir sahifadagi qatorlar soni.",
        total: "Sotuvchining barcha qatorlari aniq soni, shu javob uchun hisoblangan.",
        items: "50 ta tranzaksiya, eng yangisi birinchi.",
      },
    },
    "deep-offset": {
      short: "Chuqur sahifa",
      title: "OFFSET o'tkazib yuborgan har bir qatorni o'qiydi",
      body: "Har kecha eksport job sotuvchining barcha sahifalarini aylanib chiqadi. Baza to'g'ridan-to'g'ri 100 001-qatorga sakray olmaydi: u indeksni boshidan yuradi, 100 000 qatorni sanaydi, ularni tashlab yuboradi va keyingi 50 tasini qaytaradi.\n\n2 001-sahifa 212 ms oladi. 40 000-sahifa 50 ta qator uchun ikki million qatorni o'qiydi va 4.1 s oladi. Sahifa qancha chuqur bo'lsa, shuncha sekin, eksport esa tonggacha tugamaydi.",
      check: {
        q: "Eksport OFFSET bilan 40 827 sahifaning hammasini o'qiydi. Baza jami taxminan nechta qator o'qiydi?",
        options: [
          "2 million: har bir qatorni bir marta",
          "Taxminan 40 milliard: N-sahifa N x 50 qator o'qiydi, demak jami sahifalar soni kvadratiga qarab o'sadi",
          "4 million: har bir qatorni ikki marta, bir marta o'tkazib yuborish uchun, bir marta sahifa uchun",
        ],
        answer: 1,
        why: "Sahifalar 50, 100, 150 ... 2 million qator o'qiydi. Bu 50 x (1 + 2 + ... + 40 827) ≈ 50 x 40 827² / 2 ≈ 4 x 10^10. Tun aynan bir xil qatorlarni qayta-qayta o'qishga ketadi.",
      },
      fields: {
        OFFSET: "\"100 000 qatorni o'tkazib yubor\": baza baribir ularning har birini topishi kerak.",
        "actual rows=50": "Client oladigan narsa.",
        "actual rows=100050": "Bunga yetish uchun baza o'qigani: 2 000 barobar ko'p.",
        "Execution Time": "Bu yerda 212 ms va u sahifa raqami bilan chiziqli o'sadi.",
        "page 40 000": "50 tasini qaytarish uchun ikki million qator o'qilib, tashlab yuborildi.",
      },
    },
    shifting: {
      short: "Siljish",
      title: "Siz o'qiyotganda sahifalar suriladi",
      body: "OFFSET o'rinlarni birinchi sahifa paytida emas, har bir so'rov paytida sanaydi. Sotuvchi 1-sahifaga qarab turganda uchta yangi to'lov keladi, har bir qator uchtaga pastga suriladi va 2-sahifa ekranda allaqachon turgan uchta qator bilan boshlanadi.\n\nQator ro'yxatdan chiqqanda teskarisi bo'ladi: 1-sahifadagi to'lov bekor qilinib yashiriladi, har bir qator bittaga yuqoriga suriladi, 1-sahifaga o'tib qolgan qator esa hech qachon ko'rinmaydi. Odam uchun bu chalkash; tungi eksport uchun esa buxgalteriya faylida yetishmayotgan va ikkilangan qatorlar degani.",
      fields: {
        "page=1": "10:00:00 dagi holatdagi 1-50 qatorlar.",
        "3 new payments": "Tepaga qo'shildi: har bir o'rin uchtaga pastga suriladi.",
        "already shown": "Ekranda va eksportda takrorlar.",
        voided: "Qator ro'yxatdan chiqadi: undan keyingi har bir o'rin bittaga yuqoriga suriladi.",
        "never shown": "88073 51-o'rinda edi, 50-o'ringa o'tdi, 2-sahifa esa 51 dan boshlanadi.",
      },
    },
    keyset: {
      short: "Keyset",
      title: "N ta qatordan keyin emas, oxirgi qatordan keyin davom et",
      body: "**Keyset sahifalash** \"men ko'rgan oxirgi qatordan keyingi 50 ta qator\"ni so'raydi. 1-sahifaning oxirgi qatori `(09:02:51.004, 88074)` edi, demak 2-sahifa `(created_at, id)` qiymati undan kichik bo'lgan barcha qatorlar, xuddi shu tartibda.\n\nBaza indeksda to'g'ridan-to'g'ri o'sha joyga o'tadi va 51 qator o'qiydi, 2-sahifa bo'ladimi, 40 000-sahifami: 0.4 ms. Tepadagi yangi qatorlar va yuqoridagi yashirilgan qatorlar o'rinni surmaydi, shuning uchun hech narsa takrorlanmaydi va tashlab ketilmaydi.",
      watch: "`(a, b) < (x, y)` qator taqqoslashi `a < x OR (a = x AND b < y)` degani. Qator qiymatlarini bilmaydigan bazalarda uni shunday ochib yozish kerak, indeks baribir ishlatilishi lozim.",
      check: {
        q: "Keyset sahifalashda 40 000-sahifa uchun baza nechta qator o'qiydi?",
        options: [
          "51: indeksda cursor o'rniga o'tadi va bir sahifa plyus bitta qator o'qiydi",
          "OFFSET kabi 2 million, faqat tezroq",
          "1-sahifadan beri nechta yangi qator qo'shilganiga bog'liq",
        ],
        answer: 0,
        why: "Cursor o'tkazib yuboriladigan qatorlar soni emas, indeksdagi o'rin. B-tree'da istalgan chuqurlikka o'tish bir nechta sahifa o'qishga tushadi, shuning uchun har bir sahifa bir xil turadi.",
      },
      fields: {
        "(created_at, id)": "Ko'rilgan oxirgi qatorning o'rni: uning vaqti va tenglikni ajratish uchun noyob id.",
        "ORDER BY": "Taqqoslashdagi ustunlar va yo'nalishlar aynan o'zi, aks holda sahifalar ustma-ust tushadi.",
        "LIMIT 51": "Sahifadan bitta ko'p qator: agar u qaytsa, keyingi sahifa bor.",
        "actual rows=51": "Istalgan chuqurlikda o'qilgan qatorlar kerakli qatorlarga teng.",
      },
    },
    index: {
      short: "Indeks",
      title: "Indeks filtr va saralashga mos bo'lishi kerak",
      body: "Keyset faqat qatorlar indeksda aynan so'rov xohlagan tartibda tursa tez ishlaydi. Qoida: avval tenglik filtrlari (`merchant_id`), keyin saralash ustunlari `ORDER BY` dagi tartib va yo'nalishda (`created_at DESC, id DESC`).\n\nUstunlar yetishmasa yoki tartibi noto'g'ri bo'lsa, so'rov baribir to'g'ri qatorlarni qaytaradi, faqat sekin. `CONCURRENTLY` indeksni band jadvalga yozishni to'xtatmasdan quradi.",
      check: {
        q: "Indeks `merchant_id` siz `(created_at, id)`. 7-sotuvchiga barcha qatorlarning 5% i tegishli. 2-sahifa nimaga tushadi?",
        options: [
          "Xuddi o'sha 51 qatorga: indeksda tartib baribir to'g'ri",
          "Baza barcha sotuvchilarning qatorlarini sana bo'yicha yuradi va boshqalarnikini tashlaydi: 50 ta uchun 1 000 ga yaqin qator o'qiladi",
          "Indeks filtrni qamramagani uchun so'rov xato beradi",
        ],
        answer: 1,
        why: "Tartib to'g'ri, lekin qatorlar boshqalarniki bilan aralash. Har 20 qatordan 1 tasi tegishli sotuvchining 51 ta qatorini topish uchun baza 1 020 ga yaqin qator o'qiydi va 970 ga yaqinini tashlaydi. Kichik sotuvchida bu ancha yomonroq.",
      },
      fields: {
        CONCURRENTLY: "Indeksni jadvalni yozishga qulflamasdan quradi; sekinroq, lekin prodda xavfsiz.",
        merchant_id: "Avval tenglik: 7-sotuvchining barcha qatorlari indeksda yonma-yon turadi.",
        "equality column first": "Keyin saralash ustunlari, ORDER BY dagi tartib va yo'nalishda.",
        "Rows Removed by Filter": "Yetishmayotgan bosh ustun narxi: o'qilib tashlangan qatorlar.",
        "Incremental Sort": "Indeksda id bo'lmasa, created_at bir xil bo'lgan qatorlarni o'qigandan keyin saralash kerak.",
      },
    },
    cursor: {
      short: "Cursor",
      title: "Shaffof bo'lmagan, imzolangan cursor",
      body: "Client kalitning o'zini yubormaydi. API uni **cursor** ga joylaydi: `{\"v\":1, \"t\":\"2026-11-18T09:02:51.004Z\", \"id\":88074, \"f\":\"9c1e\"}` ning base64url ko'rinishi va qisqa imzo. Client uni shunchaki qaytarib yuboradi.\n\nShaffof emasligi API ichidagini (ustun qo'shish, saralashni o'zgartirish) ilovalarni buzmasdan o'zgartira olishini anglatadi. Imzo (server kaliti bilan HMAC) qo'lda yasalgan cursor SQL'ga yetmasdan 400 bilan rad etilishini anglatadi; imzo bo'lmasa, hech bo'lmasa har bir maydonni decode qilib, turini tekshir. Sotuvchi filtri har doim cursor'dan emas, login'dan olinadi.",
      check: {
        q: "Nega shunchaki `?after_id=88074&after_time=...` ni ochiq matnda yubormaslik kerak?",
        options: [
          "Ishlaydi, lekin client'lar bu qiymatlarni yasash va o'qishni boshlaydi, API esa saralash kalitlarini endi hech qachon o'zgartira olmaydi; har qanday qiymat esa so'rovga tekshiruvsiz yetadi",
          "Ochiq parametrlarni o'qish sekinroq",
          "Base64 qiymatlarni shifrlaydi, shuning uchun ularni hech kim o'qiy olmaydi",
        ],
        answer: 0,
        why: "Client ko'ra oladigan narsaga kimdir albatta bog'lanib qoladi. Shaffof bo'lmagan token formatni serverning shaxsiy ishi qilib qoldiradi. Base64 shifrlash emas: uni istalgan odam decode qila oladi. Shuning uchun imzo yoki qat'iy tekshiruv muhim.",
      },
      fields: {
        cursor: "Qayerdan davom etish, oldingi javobda qanday kelgan bo'lsa shunday.",
        Hk3f9Qx2: "Mazmun ustidan imzo. O'zgartirilgan cursor unga endi mos kelmaydi.",
        next_cursor: "Shu sahifaning oxirgi qatori, joylangan holda. Boshqa hech narsa bo'lmasa yo'q.",
        has_more: "51-qator bormidi? Ilova hech qanday sanashsiz \"yana yuklash\"ni ko'rsatadi.",
      },
    },
    prev: {
      short: "Oldingi",
      title: "Oldingi sahifa: taqqoslash va tartibni almashtir",
      body: "Orqaga qaytish ekrandagi birinchi qatordan oldingi 50 ta qator degani. Taqqoslashni `>` ga, tartibni `ASC` ga almashtir, 51 qator ol va javob berishdan oldin ularni teskari aylantir, shunda sahifa yana eng yangisidan boshlanadi.\n\nBitta indeks ikkala yo'nalishga ham xizmat qiladi: baza uni teskari o'qiydi. Javobda `prev_cursor` (birinchi qator) va `next_cursor` (oxirgi qator) bo'ladi. Keyset 17 000-sahifaga sakray olmaydi; odamlar aylantiradigan ro'yxat va uni yurib chiqadigan eksport uchun bu hech kimga kerak emas.",
      fields: {
        "prev page": "Ekrandagi oxirgi emas, birinchi qatordan quriladi.",
        "> (": "O'sish tartibida shu o'rindan keyingi qatorlar: ekranda aynan tepada turganlari.",
        ASC: "Avval eng yaqin qatorlar; aks holda LIMIT butun jadvalning eng yangi qatorlarini olardi.",
        reverses: "Qaysi tomonga aylantirmasin, ilova har doim eng yangisini birinchi oladi.",
      },
    },
    count: {
      short: "Sanash",
      title: "Aniq jami son sahifaning o'zidan qimmat",
      body: "Har bir birinchi sahifa hali ham `total` qaytaradi. Ikki million qatorni sanash ikki million indeks yozuvini o'qish degani: sotuvchi ro'yxatni har ochganida 1.3 s. Soniyasiga to'qqizta birinchi sahifa bazani faqat sanash bilan band qilib qo'yadi.\n\nBundan tashqari son bir lahzadan keyin noto'g'ri bo'ladi, chunki to'lovlar kelishda davom etadi, uning \"ikki millionga yaqin\" emas, aynan 2 041 337 ekanini esa hech kim bilishi shart emas.",
      fields: {
        "count(*)": "Qisqa yo'l yo'q: aniq sanash har bir mos qator yoki indeks yozuvini o'qiydi.",
        "actual rows=2041337": "Bitta sonni aytish uchun ikki million yozuv.",
        "Execution Time": "Sahifaning o'zi uchun 0.4 ms ga qarshi 1.3 s.",
        "most of the db's CPU": "9 x 1.3 s, ya'ni 12 ga yaqin yadro faqat sanash bilan band.",
      },
    },
    "count-alt": {
      short: "Yana bor",
      title: "O'rniga \"yana bor\" va taxminiy son",
      body: "Ro'yxatga jami son kerak emas. `has_more` 51-qatordan tekinga keladi. Son foydali bo'lgan joyda API taxminiy sonni ko'rsatadi: har sotuvchi uchun asinxron yangilanadigan va hisoblagich keshida 60 s saqlanadigan hisoblagich, \"2 040 000 ga yaqin\" deb ko'rsatiladi.\n\nAniq sanash hali ham bor, lekin faqat haqiqatan kerak bo'lgan joyda, masalan eksport xulosasida, har sahifada emas, bir marta. Baza CPU 70% dan 15% ga tushadi.",
      check: {
        q: "API bazadan `LIMIT 51` so'raydi va 50 qator qaytaradi. 51-qator unga nima aytadi?",
        options: [
          "Hech narsa, bu zaxira",
          "Kamida yana bitta sahifa borligini, ya'ni `has_more` true ekanini, hech narsa sanamasdan",
          "Nechta sahifa qolganini",
        ],
        answer: 1,
        why: "51 qator qaytsa, shu sahifadan keyin kamida bitta qator bor; 50 yoki kam bo'lsa, bu oxirgi sahifa. Bitta ortiqcha qator ikki millionni sanashning o'rnini bosadi.",
      },
      fields: {
        has_more: "51-qatordan olinadi: sanash emas, bitta qator turadi.",
        total_estimate: "Ataylab taxminiy, har daqiqada yangilanadi, hech qachon sahifaning asosiy yo'lida emas.",
      },
    },
    filters: {
      short: "Filtrlar",
      title: "Cursor o'z filtrlariga tegishli",
      body: "Sotuvchi to'liq ro'yxatni aylantiradi, keyin filtrni qaytarilgan to'lovlarga almashtiradi, ilova esa eski cursor'ni yangi filtr bilan yuboradi. O'rin boshqa ro'yxatdan kelgan: API 09:02 dan eski qaytarishlarni qaytarib, har bir yangiroq qaytarishni jimgina tashlab ketardi.\n\nShuning uchun cursor filtrlar va saralashning qisqa hash'ini olib yuradi (`\"f\":\"9c1e\"`). U so'rovga mos kelmasa, API yangi ro'yxatning birinchi sahifasiga havola bilan 400 qaytaradi va ilova boshidan boshlaydi.",
      watch: "Bir ro'yxatdagi filtrlar ma'lumotda ham o'zgarishi mumkin: qaytarilgan bo'lib qolgan to'lov ro'yxatlar orasida ko'chadi. Keyset buni yaxshi ko'taradi, qator shunchaki o'z joyida paydo bo'ladi yoki yo'qoladi.",
      fields: {
        status: "Eski filtr uchun yasalgan cursor bilan birga yangi filtr.",
        error: "Ilova javob bera oladigan aniq kod: cursor'ni tashla va qayta yukla.",
        detail: "Cursor qaysi filtr va saralash uchun yasalgan.",
        restart: "Yangi ro'yxatning birinchi sahifasi: cursor kerak emas.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Sahifalash uchun olti qoida.\n\n1) `OFFSET` o'tkazib yuborgan hamma narsani o'qiydi va qatorlar qo'shilsa yoki o'chsa suriladi: chuqur yoki o'zgaruvchan ro'yxatlarda undan qoching. 2) Keyset ishlating: `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n+1`. 3) Unga mos indeks bering: avval tenglik ustunlari, keyin saralash ustunlari xuddi shu tartib va yo'nalishda. 4) Saralashni har doim noyob ustun bilan tugating. 5) Imzolangan yoki qat'iy tekshiriladigan, filtr va saralashga bog'langan shaffof bo'lmagan cursor bering; tenant'ni login'dan oling. 6) `has_more` ni ortiqcha qatordan qaytaring; son foydali bo'lsa taxminiysini ko'rsating, aniq sanashni faqat haqiqatan kerak bo'lgan joyda qiling.",
    },
  },
  scenarios: {
    "no-tiebreak": {
      label: "Tie-breaker'siz",
      steps: {
        "tie-lost": {
          short: "Tengliklar",
          title: "Summa bo'yicha saralash teng qatorlarni yo'qotadi",
          body: "Yangi imkoniyat summa bo'yicha saralaydi. Dasturchi naqshni ko'chiradi, lekin cursor'da faqat `amount` ni qoldiradi. Sotuvchining 180 ta to'lovi aynan 50 000, bitta tarif narxi, 1-sahifa esa ularning 12-sida tugaydi.\n\n2-sahifa `amount < 50000` ni so'raydi va 50 000 lik qolgan 168 ta to'lov hech qachon ko'rinmaydi. `<=` ga o'tilsa, o'rniga o'sha 12 ta qator qaytadi, summasi teng qatorlarning aniq tartibi yo'qligi uchun esa ular ham boshqacha qaytishi mumkin.",
          check: {
            q: "Tartibni qanday barqaror qilish mumkin?",
            options: [
              "`<` o'rniga `<=` ishlatish",
              "Noyob `id` ni saralashga, cursor'ga va indeksga qo'shish: `(amount, id)`",
              "Tengliklar bitta sahifaga sig'ishi uchun kattaroq sahifalar",
            ],
            answer: 1,
            why: "Noyob bo'lmagan saralash kaliti o'rinni aniqlamaydi. Oxiriga id qo'shilsa, har bir qatorning tartibda aynan bitta joyi bo'ladi, shuning uchun cursor teng qatorlar guruhining ichiga emas, ikki qator orasiga ishora qiladi.",
          },
          fields: {
            "sort=amount": "Teng qiymatlari ko'p bo'lgan saralash ustuni.",
            "amount < 50000": "Yana 50 000 bo'lgan qolgan har bir qatorni tashlab ketadi.",
            "exactly 50000": "Saralash kaliti bir xil bo'lgan 180 qatorlik guruh.",
            "168 payments": "Hech bir sahifada ko'rinmaydi va eksportda ham yo'q.",
            "<=": "Teskari xato: allaqachon ko'rsatilgan 12 qator yana keladi.",
          },
        },
        "tie-fix": {
          short: "Tie-breaker",
          title: "Har bir saralash id bilan tugaydi",
          body: "Endi cursor `(amount, id)` ni saqlaydi, so'rov ikkalasi bo'yicha taqqoslaydi va saralaydi, mos `(merchant_id, amount DESC, id DESC)` indeksi esa uni tez saqlaydi. 2-sahifa 50 000 lik 13-to'lov bilan boshlanadi va hech narsa yo'qolmaydi.\n\nQoida umumiy: foydalanuvchi nima bo'yicha saralamasin, API cursor'da ham, indeksda ham oxirgi saralash ustuni sifatida primary key'ni qo'shadi.",
          fields: {
            "(amount, id)": "Foydalanuvchi so'ragan tartib uchun summa, tenglikni ajratish uchun id.",
            "id DESC": "Tie-breaker ORDER BY ning bir qismi, xuddi shu yo'nalishda.",
            tx_merchant_amount_id: "Yana bitta saralash imkoniyati uchun yana bitta indeks: uni taklif qilish narxi.",
            "13th payment": "Aynan 1-sahifa to'xtagan joy.",
          },
        },
      },
    },
  },
};

export default text;
