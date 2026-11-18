import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Qidiruv takliflari (autocomplete) dizayni",
  summary:
    "Qidiruv maydonidagi har bosish o'nta taklif so'raydi va javob keyingi tugmadan oldin kelishi kerak. Tizimni qadamma-qadam quramiz: vaqt byudjeti, `LIKE 'pre%'` nega yiqiladi, har tugunda tayyor top-k saqlaydigan trie, prefiks bo'yicha shard'lar, debounce va CDN, atomik almashtiriladigan oflayn pipeline, trendlar uchun real vaqt qatlami, filtr va shaxsiylashtirish narxi.",
  learn: [
    "Tugma bosishlarini so'rov tezligi va kechikish byudjetiga qanday aylantirish",
    "Nega har tugunida top-k saqlangan prefiks daraxti baza so'rovidan yutadi",
    "Debounce, mijoz keshi va CDN so'rovlarning ko'pini backend'ga yetmasdan qanday olib qoladi",
    "Oflayn pipeline, atomik indeks almashtirish va kichik real vaqt qatlami takliflarni qanday yangi va toza saqlaydi",
  ],
  nodes: {
    user: "Qidiruv maydoni",
    api: "Suggest API",
    db: "So'rovlar bazasi",
    index: "Indeks shard 1",
    index2: "Indeks shard 2",
    cdn: "CDN edge",
    queue: "So'rovlar logi",
    agg: "Agregatsiya job",
    storage: "Snapshot'lar",
    trend: "Trend 5 daqiqa",
  },
  metrics: {
    p95: "Taklif p95",
    "backend-rps": "Backend'ga so'rov",
    staleness: "Yangilik kechikishi",
    bad: "Yomon takliflar",
  },
  steps: {
    estimate: {
      short: "Hisob",
      title: "Har bosishga o'nta taklif, keyingi tugmadan oldin",
      body: "Kuniga 25 million qidiruv, har birida o'rtacha 12 ta bosish deylik: kuniga 300 million suggest chaqiruvi, o'rtacha **3 500/s**, kechki cho'qqida to'rt baravar ko'p. Har chaqiruv `GET /suggest?q=<prefiks>` va o'ntagacha davomni qaytaradi.\n\nOdam taxminan har 150 ms da bitta harf yozadi. Bir zumda ko'rinishi uchun ro'yxat boshidan oxirigacha **100 ms p95** ichida chiqishi kerak. Mobil internetdagi telefon shundan 50-60 ms ni tarmoqqa sarflaydi, serverga 20 ms ga yaqin qoladi.",
      check: {
        q: "Birinchi versiya: so'rovlar jadvalida `query` ga indeks bilan `SELECT ... WHERE query LIKE 'ip%' ORDER BY hits DESC LIMIT 10`. 3 500/s da nima bo'ladi?",
        options: [
          "Hammasi joyida: indeks prefiksni bir necha millisekundda topadi",
          "Qisqa prefiksga millionlab qator mos keladi va hammasini saralash kerak; baza yiqiladi",
          "LIKE bilan indeksni umuman ishlatib bo'lmaydi",
        ],
        answer: 1,
        why: "Indeks `ip` bilan boshlanadigan qatorlarni topadi, lekin ular 1.8 million. Eng mashhur o'ntasini qaytarish uchun baza ularning hammasini o'qib saralaydi. Bir-ikki harfli prefiks esa odamlar birinchi yozadigan narsa.",
      },
      fields: {
        q: "Hozirgacha yozilgan prefiks. Har bosishda o'zgaradi.",
        suggestions: "Mashhurlik bo'yicha tartiblangan davomlar. Ko'pi bilan o'nta; UI beshdan sakkiztagacha ko'rsatadi.",
        took_ms: "Server vaqti. 100 ms byudjetga sig'ish uchun 20 ms atrofida qolishi kerak.",
      },
    },
    like: {
      short: "LIKE",
      title: "`LIKE 'ip%'` o'nta qaytarish uchun millionlab qator o'qiydi",
      body: "`query` dagi B-tree indeks `ip` oralig'i qayerdan boshlanishini topa oladi. Lekin natija matn bo'yicha emas, mashhurlik bo'yicha tartiblanishi kerak, shuning uchun baza butun oraliqni, 1.8 million qatorni o'qib chiqadi va top o'ntani olib qolish uchun saralaydi.\n\nHar chaqiruv bazaga 600 ms tushadi. 3 500/s da bu sekin so'rov emas, bu 97% CPU dagi baza va foydalanuvchi yozib bo'lgandan keyin keladigan takliflar.",
      watch: "Yana indeks qo'shish yordam bermaydi: hech bir B-tree tartibi bir vaqtda \"shu bilan boshlanadi\" va \"eng mashhur\" ga mos kelmaydi.",
      fields: {
        EXPLAIN: "Rejani ko'rsatadi, ANALYZE bilan esa haqiqiy vaqtni. Tarmoqni ayblashdan oldin doim shunga qarang.",
        LIKE: "Prefiks shablon. Indeksni ishlatadi, lekin faqat oraliqni topish uchun, tartib uchun emas.",
        "ORDER BY": "`hits` bo'yicha tartib. Aynan shu mos kelgan har qatorni o'qishga majbur qiladi.",
        rows: "Bitta bosish uchun 1.8 million qator. Qisqa prefiks eng yomon holat.",
        "Execution Time": "20 ms byudjetga qarshi har chaqiruvga 612 ms.",
      },
    },
    trie: {
      short: "Trie",
      title: "Har tugunda javobi tayyor turgan trie",
      body: "**Trie** (prefiks daraxti) da har prefiksga bitta tugun bor: `i`, keyin `ip`, keyin `iph`. Prefiksni topish yozilgan harflar soniga teng qadam, nechta so'rov borligiga bog'liq emas.\n\nAsosiy hiyla: har tugun o'zining **top-k** davomlarini saqlaydi, ular trie qurilayotganda oflayn hisoblanadi. So'rov ikki qadam yuradi va allaqachon tartiblangan ro'yxatni qaytaradi. Skan yo'q, saralash yo'q, 0.03 ms. Trie suggest serverlar xotirasida yashaydi va har tunda qayta quriladi, ya'ni bir kungacha eski bo'lishi mumkin.",
      watch: "Saqlangan top-k bo'lmasa, trie ham `i` ostidagi har so'rovni aylanib chiqib tartiblashi kerak. Tezlikni aynan oldindan hisoblangan ro'yxat beradi.",
      check: {
        q: "40 million noyob so'rov, har tugunda top-10 ro'yxat: trie ga 60 GB ga yaqin kerak. Endi nima qilamiz?",
        options: [
          "128 GB xotirali bitta mashina olish",
          "Trie ni prefiks oraliqlari bo'yicha serverlarga bo'lish, har oraliqni replika qilish",
          "Trie ni diskda saqlab, tugunlarni kerak bo'lganda o'qish",
        ],
        answer: 1,
        why: "Bitta katta mashina bitta nosozlik nuqtasi va kechki cho'qqiga bitta CPU. Diskdan o'qish 20 ms byudjetni buzadi. Prefiks bo'yicha bo'lish har qidiruvni bitta serverda qoldiradi, replikalar esa quvvat va zaxira beradi.",
      },
      fields: {
        walk: "Yozilgan har harfga bitta qadam. Narx ma'lumot hajmiga emas, prefiks uzunligiga bog'liq.",
        top_k: "Eng yaxshi o'nta davom, to'g'ridan-to'g'ri tugunda va tartiblangan holda.",
        time: "Xotiradan o'qish: byudjetdan uch daraja kam.",
      },
    },
    shard: {
      short: "Shard",
      title: "Indeksni prefiks oralig'i bo'yicha shard qilish",
      body: "To'liq trie ga 60 GB ga yaqin kerak, bu bitta jarayon va kechki cho'qqidagi bitta CPU uchun ko'p. Uni **prefiks oralig'i** bo'yicha bo'lamiz: `a` dan `ip` gacha boshlanadigan har so'rov shard 1 da, qolgani shard 2 da. Prefiks doim aynan bitta shard'ga tushadi, qidiruv hech qachon tarqalmaydi.\n\nOraliqlar alifbo bo'yicha emas, trafik bo'yicha kesiladi: `i` bilan boshlanadigan so'rov `x` bilan boshlanganidan ancha ko'p. Har oraliq uchta replikada ishlaydi, o'lgan server alifboning bir qismini emas, faqat quvvatni olib ketadi.",
      watch: "Bir harfli prefikslar eng issiq kalitlar va hamma uchun bir xil. Ular birinchi keshlanadi, keyingi qadamda.",
      fields: {
        "shard map": "Prefiks oraliqlaridan shard'larga xarita. API uni xotirada saqlaydi va o'zgarsa qayta yuklaydi.",
        heap: "Har shard 30 GB ga yaqin ushlaydi: trie ning yarmi va almashtirish paytida keyingi versiya uchun joy.",
        replicas: "Oraliq nusxalari. Router yukni taqsimlaydi va o'lganini o'tkazib yuboradi.",
      },
    },
    keystrokes: {
      short: "Bosishlar",
      title: "Har bosish bitta so'rov",
      body: "Kechki cho'qqida API **14 000 so'rov/s** oladi. `iphone` yozayotgan bitta foydalanuvchi 224 ms ichida oltita chaqiruv yuboradi va aynan bitta ro'yxatni o'qiydi. Trafikning yarmi hech kim qaramaydigan prefikslarga javob beradi.\n\nIkkinchi xato: javoblar tartibsiz keladi. `iph` javobi `iphone` javobidan keyin keladi va ro'yxat barmoq ostida eski natijalarga sakraydi.",
      check: {
        q: "Qaysi o'zgarish maydonni sekinlashtirmasdan backend so'rovlarini eng ko'p kamaytiradi?",
        options: [
          "Oxirgi tugmadan keyin 80 ms kutish, javoblarni sahifada keshlash va qisqa prefikslarni CDN ga berish",
          "Takliflarni faqat 4 harfdan keyin ko'rsatish",
          "Yana API serverlar qo'shish",
        ],
        answer: 0,
        why: "Debounce hech kim o'qimaydigan so'rovlarni tashlaydi, mijoz keshi backspace va qayta yozishga javob beradi, qisqa prefikslar esa hamma uchun bir xil, ularni edge kesh beradi. 4 harf kutish funksiyani eng kerakli paytda yashiradi. Ko'proq server faqat isrof uchun to'laydi.",
      },
      fields: {
        q: "Har 40-50 ms da yangi prefiks: bitta borib-kelishdan tezroq.",
        "6 requests": "Bitta foydali ro'yxat uchun oltita backend chaqiruvi.",
        "arrived after": "Tartibsiz javob. Mijoz maydonda endi yo'q prefikslar javobini tashlashi kerak.",
      },
    },
    edge: {
      short: "Debounce + CDN",
      title: "So'rovlarning ko'pi backend'ga yetib bormaydi",
      body: "Uch qatlam, eng arzonidan boshlab. Sahifa oxirgi tugmadan keyin **80 ms** kutib so'raydi (debounce) va maydonda endi yo'q prefikslar javobini tashlaydi. Bor javoblarni keshlaydi, shuning uchun backspace tekin. Qisqa prefikslar **CDN** orqali o'tadi: `ip` har ingliz tilli foydalanuvchi uchun bir xil, edge uni besh daqiqa saqlaydi.\n\nCho'qqidagi backend trafigi 14 000/s dan 3 200/s ga tushadi, CDN hit esa yaqin shahardan 10 ms ga yaqin vaqtda javob beradi.",
      watch: "Kesh kaliti javobni o'zgartiradigan hamma narsani o'z ichiga olishi kerak: prefiks, til, hudud. `lang` ni unutsangiz, rus tilli foydalanuvchilar inglizcha taklif oladi.",
      fields: {
        lang: "URL ning bir qismi, demak CDN kesh kalitining ham.",
        "Cache-Control": "`public, max-age=300`: umumiy keshlar buni besh daqiqa saqlashi mumkin.",
        Age: "Bu nusxa edge'da necha soniyadan beri turibdi.",
        "X-Cache": "HIT: CDN javob berdi, backend uni ko'rmadi ham.",
      },
    },
    pipeline: {
      short: "Pipeline",
      title: "So'rovlar logi keyingi indeksga aylanadi",
      body: "Foydalanuvchi haqiqatan yuborgan har qidiruv **so'rovlar logi** oqimiga ketadi, javob kutmasdan. Agregatsiya job oxirgi soatni o'qiydi, har so'rov uchun hit'lar va noyob foydalanuvchilarni sanaydi va tarix bilan aralashtiradi: yangi ball = eski ball × decay + hit'lar.\n\nKeyin job har shard uchun yangi trie quradi va ularni object storage'ga versiyali snapshot sifatida yozadi. Takliflar bazada nima borligidan emas, odamlar nima qidirganidan keladi.",
      watch: "Har bosish prefiksini emas, yuborilgan so'rovni loglang, aks holda indeks chala yozilgan so'zlarni o'rganadi.",
      fields: {
        query: "Yuborilgan qidiruv, kichik harfga o'tkazilgan va tozalangan.",
        users_1h: "Noyob foydalanuvchilar. Bir iborani takrorlagan bot bir marta sanaladi.",
        decay: "Eski mashhurlik qanchalik tez so'nadi. Soatiga 0.92 bir necha kunda unutadi.",
        score: "Trie shu bo'yicha tartiblaydi. Eski ball × decay plus yangi hit'lar.",
      },
    },
    swap: {
      short: "Almashtirish",
      title: "Yangi trie ni eskisi yoniga yuklab, bitta ko'rsatkichni almashtirish",
      body: "Har shard yangi snapshot'ni bo'sh xotiraga yuklaydi, eskisi bilan xizmat qilishda davom etadi. Checksum'ni tekshiradi, eng issiq prefikslarni isitadi, keyin bitta ko'rsatkichni almashtiradi. Allaqachon yo'lda bo'lgan so'rovlar eski trie da tugaydi, yangilari yangisini ko'radi.\n\nRestart yo'q, chala qurilgan indeks foydalanuvchiga ko'rinmaydi, orqaga qaytish esa oldingi snapshot'ga yana bitta ko'rsatkich almashtirish. Soatlik pipeline bilan takliflar haqiqatdan bir soatga yaqin orqada.",
      watch: "Almashtirish paytida shard ikkita trie ushlaydi. Xotirani ikkalasiga hisoblang, aks holda almashtirish yiqiladigan payt bo'ladi.",
      check: {
        q: "10:03 da bo'ron ogohlantirishi trendga chiqadi. Soatlik pipeline bilan u takliflarda qachon paydo bo'ladi?",
        options: [
          "Darhol: so'rovlar logi oqim",
          "Keyingi qurish va almashtirishdan keyin, bir soatgacha",
          "Faqat CDN yozuvlari muddati tugaganda",
        ],
        answer: 1,
        why: "Log oqim, lekin indeks batch: termin faqat keyingi soatlik qurish yetib kelgandan keyin chiqadi. So'nggi yangiliklar uchun bu juda kech, buni kichik real vaqt qatlami tuzatadi.",
      },
      fields: {
        snapshot: "O'zgarmas, versiyali trie fayli. Shard'lar faqat butun snapshot yuklaydi.",
        checksum: "Buzilgan yuklama bitta so'rovga xizmat qilmasdan rad etiladi.",
        atomic: "Bitta ko'rsatkich yozuvi: har so'rov yo eski, yo yangi trie ni ko'radi, hech qachon aralashini emas.",
        "in-flight": "Hali eski trie ni ishlatayotgan o'quvchilar. U faqat ular tugagach bo'shatiladi.",
      },
    },
    trending: {
      short: "Trend",
      title: "Hozir issiq narsalar uchun kichik real vaqt qatlami",
      body: "Ikkinchi iste'molchi o'sha so'rovlar logini o'qiydi va oxirgi besh daqiqa hisobini xotirada saqlaydi. U faqat odatdagi tezligidan keskin oshgan so'rovlarni kuzatadi, ko'pi bilan bir necha ming. API undan prefiksga mos trendlarni so'raydi va ularni shard'ning top-k iga qo'shadi.\n\nYangi termin endi bir daqiqa ichida chiqadi. Lekin tez qatlamda uni himoya qiladigan tarix yo'q: botlar guruhi spam iborani uch daqiqada takliflarga chiqardi, kuniga 140 ga yaqin yomon taklif ko'rsatiladi.",
      watch: "Tez qatlamni kichik va chegaralangan saqlang. U indeksga qo'shadi, hech qachon uning o'rnini egallamaydi.",
      fields: {
        window: "Sirpanuvchi besh daqiqalik oyna. Eski hisoblar chiqib ketadi.",
        x46: "Odatdagi darajaga nisbatan tezlik. Shunchaki mashhur so'rov emas, sakrash.",
        merge: "Trend elementlar oldindan hisoblangan ro'yxatga joylashadi; top-k ning qolgani qoladi.",
      },
    },
    filter: {
      short: "Filtr",
      title: "Hech narsa ko'rsatilishidan oldin filtrlash",
      body: "Takliflar foydalanuvchi oldiga biz qo'yadigan so'zlar, shuning uchun ular har qanday kontent kabi e'tibor talab qiladi. Agregatsiya job ham, trend qatlami ham **blocklist** ga mos (spam, nafrat, kattalar uchun kontent) yoki telefon raqami kabi shaxsiy ma'lumotga o'xshagan so'rovlarni tashlaydi.\n\nSo'rov paydo bo'lishi uchun kamida 50 ta noyob foydalanuvchidan kelishi ham kerak. Spam ibora uchta akkauntdan kelgan: u hech qachon o'tmaydi. Yomon takliflar kuniga 140 dan 3 ga yaqin tushadi, ular ham bir bosishda o'chirish bilan moderatorga boradi, o'chirish bir daqiqada hamma shard'ga yetadi.",
      fields: {
        blocklist: "Hech qachon chiqmaydigan so'z va shablonlar, indeksdan tashqarida saqlanadi, shuning uchun darhol ta'sir qiladi.",
        min_users: "Hit'larda emas, odamlarda sanalgan mashhurlik chegarasi.",
        distinct: "Kam akkauntdan ko'p hit qiziqish emas, suiiste'mol belgisi.",
        "personal data": "Telefon yoki manzilli ismlar begonalar uchun hech qachon to'ldirilmasligi kerak.",
      },
    },
    personal: {
      short: "Shaxsiy",
      title: "Shaxsiylashtirish keshga tushadi",
      body: "Mahsulot jamoasi foydalanuvchining o'z oldingi qidiruvlarini tepada ko'rmoqchi. Shaxsiy javob har kim uchun boshqa, shuning uchun u `private`: CDN uni bo'lisha olmaydi, har bosish yana backend'ga va foydalanuvchi tarixini qidirishga boradi. Buni hamma prefiks uchun qilish backend'ni 3 200/s dan yana 9 000/s ga yaqin ko'taradi.\n\nMurosa: qisqa prefikslar umumiy va keshda qoladi. Uch harfdan boshlab, baribir CDN hit kam bo'lgan joyda, API ro'yxatni foydalanuvchi tarixi bilan qayta tartiblaydi. Sahifa biladigan yaqindagi qidiruvlar qurilmaning o'zida aralashtiriladi. Backend 3 600/s da to'xtaydi.",
      watch: "Shaxsiy javobni hech qachon public sifatida keshlashga yo'l qo'ymang: bir foydalanuvchining qidiruvlari keyingisiga chiqib qoladi.",
      fields: {
        iph: "Uch harf: shu yerdan javob shaxsiy bo'lishi mumkin.",
        "Cache-Control": "`private`: faqat shu brauzer saqlashi mumkin, CDN hech qachon.",
        personal: "Mijozga ro'yxat shu foydalanuvchi uchun qayta tartiblanganini aytadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Autocomplete keyingi bosish bilan poyga: boshidan oxirigacha 100 ms ga yaqin, serverda 20 ms.\n\n1) Qidiruvlarni emas, bosishlarni sanang: o'rtacha 3 500/s, cho'qqida 14 000/s. 2) `LIKE 'pre%'` tartiblash uchun har mosni o'qiydi; har tugunida top-k saqlangan trie mikrosoniyalarda javob beradi. 3) Trafik bo'yicha kesilgan prefiks oraliqlari bilan shard qiling, replikalar bilan. 4) Debounce, mijoz keshi va qisqa prefikslar uchun CDN yukning ko'pini oladi. 5) Oflayn pipeline so'rovlar logini snapshot'larga aylantiradi, ular atomik almashtiriladi; kichik real vaqt qatlami trendlarni qo'shadi. 6) Blocklist va noyob foydalanuvchilar chegarasi bilan filtrlang; shaxsiylashtirishni faqat kesh baribir yordam bermaydigan joyda qiling.",
    },
  },
};

export default text;
