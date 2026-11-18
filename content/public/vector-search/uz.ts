import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Vektor qidiruv",
  summary:
    "Onlayn do'konning yordam markazida 2 million maqola bo'lagi bor, mijozlar esa o'z so'zlari bilan so'raydi: \"singan choynak uchun pulimni qaytarib olsam bo'ladimi\". Javob boshqa so'zlar bilan yozilgan bo'lsa, kalit so'z qidiruvi uni topa olmaydi. Embedding va kosinus o'xshashligini qo'shamiz, aniq kNN nega sekinligini ko'ramiz, HNSW bilan bir oz recall'ni millisekundlarga almashtiramiz, int8 bilan xotirani qisqartiramiz, filtrlarni hal qilamiz, BM25 bilan vektorlarni reciprocal rank fusion orqali birlashtiramiz va natijani LLM'ga beramiz.",
  learn: [
    "Embedding nima va kosinus o'xshashligi umumiy so'zi yo'q, lekin ma'nosi bir xil matnni qanday topadi",
    "Nega aniq kNN har so'rovga N x d turadi va HNSW recall, kechikish va xotira o'rtasida qanday murosa qiladi",
    "Taxminiy qidiruvda filtrlar va reciprocal rank fusion bilan gibrid BM25 + vektor reytingi",
    "Nega turli model versiyalari yasagan vektorlarni hech qachon solishtirib bo'lmaydi va qanday xavfsiz qayta embed qilinadi",
  ],
  nodes: {
    user: "Yordam chati",
    api: "Qidiruv API",
    text: "Kalit so'z indeksi",
    indexer: "Indekser",
    docs: "Maqolalar bazasi",
    model: "Embedding modeli",
    vdb: "Vektor indeksi",
    llm: "LLM",
  },
  metrics: {
    recall: "Recall@10 (golden set)",
    p95: "Qidiruv p95",
    mem: "Indeks xotirasi",
    empty: "Bo'sh natijalar",
  },
  steps: {
    ask: {
      short: "Kalit so'zlar",
      title: "Mijoz va maqola turli so'zlarni ishlatadi",
      body: "Yordam chati maqolalarni BM25 bilan qidiradi, xuddi matn qidiruvi darsidagidek. Mijoz yozadi: \"singan choynak uchun pulimni qaytarib olsam bo'ladimi\".\n\nTop 3 choynak tanlash va tozalash haqida. To'g'ri maqola \"Mablag'ni qaytarish: 14 kun ichida\" deb nomlangan va savol bilan birorta umumiy so'zi yo'q. 500 ta belgilangan savoldan iborat golden set'da kerakli maqolalarning faqat 41% i top 10 ga kiradi.",
      fields: {
        BM25: "Kalit so'z reytingi: faqat matnda haqiqatan bor so'zlarga ball bera oladi.",
        "top 3": "Chat ko'rsatadigani. Uchalasi ham choynak haqida, birortasi ham pul qaytarish haqida emas.",
        "no shared word": "\"pulimni\" va \"mablag'ni\" bir xil pulni anglatadi; indeks uchun esa ular bir-biriga aloqasiz tokenlar.",
      },
    },
    embed: {
      short: "Embedding",
      title: "Ma'noni 768 ta songa aylantir",
      body: "**Embedding modeli** matn bo'lagini vektorga aylantiradi: bu yerda 768 ta son. U ma'nosi o'xshash matnlar so'zlaridan qat'i nazar, hatto turli tillarda ham bir-biriga yaqin tushadigan qilib o'qitilgan.\n\nQidiruv API savolni modelga yuboradi va bitta vektor oladi. Har bir maqola bo'lagi o'z vektorini xuddi shu yo'l bilan, oldindan oladi.",
      watch: "Savol ham, maqolalar ham aynan bitta model va versiya bilan embed qilinishi shart. Ikki xil model yasagan vektorlar bir-biriga aloqasiz ikki fazoda yashaydi.",
      fields: {
        model: "Vektorni qaysi model va versiya yasagani. U vektor bilan birga saqlanishi shart.",
        input: "Embed qilinadigan matn: savol yoki maqolaning bitta bo'lagi.",
        normalize: "Vektor uzunligini 1 ga keltiradi, shunda kosinus oddiy skalyar ko'paytmaga aylanadi.",
        dim: "768 o'lcham: har bir matnga 768 ta kasr son.",
        embedding: "Vektorning o'zi. Har bir son alohida hech narsani anglatmaydi; faqat masofalar muhim.",
        Authorization: "Model API kaliti, hech qachon ko'rsatilmaydi.",
      },
    },
    cosine: {
      short: "Kosinus",
      title: "Ma'no o'xshash bo'lsa, burchak kichik",
      body: "**Kosinus o'xshashligi** ikki vektor orasidagi burchakni o'lchaydi: 1 bir xil yo'nalish, 0 aloqasiz degani. Normallashgan vektorlarda bu shunchaki 768 ta ko'paytmaning yig'indisi.\n\nPul qaytarish maqolasi 0.83, choynak kafolati 0.71, yetkazib berish muddatlari 0.12 oladi. Eng yaxshi javob birinchi chiqadi, birorta ham so'z mos kelmagan holda.",
      check: {
        q: "Savol o'zbekcha, pul qaytarish haqidagi yagona maqola esa faqat ruscha. Vektor qidiruv uni topa oladimi?",
        options: [
          "Yo'q: boshqa alifbodagi boshqa so'zlar mos kela olmaydi",
          "Faqat har bir maqola oldin o'zbekchaga tarjima qilinsa",
          "Ha, agar embedding modeli ikkala tilda o'qitilgan bo'lsa: bir xil ma'no bir xil hududga tushadi",
        ],
        answer: 2,
        why: "Ko'p tilli model \"pulni qaytarish\" va uning ruscha muqobilini yaqin vektorlarga joylaydi, chunki u imloni emas, ma'noni o'rgangan. Faqat inglizchada o'qitilgan model buni qila olmaydi; shuning uchun model tanlash dizaynning bir qismi.",
      },
      fields: {
        cos: "Ikki vektor orasidagi burchak kosinusi, -1 dan 1 gacha.",
        normalized: "Ikkala vektor uzunligi 1, shuning uchun bo'lish yo'qoladi.",
        "0.83": "Pul qaytarish maqolasi: ma'nosi eng yaqin.",
        "0.12": "Yetkazib berish muddatlari: deyarli aloqasiz.",
      },
    },
    brute: {
      short: "Aniq kNN",
      title: "Savolni 2 million vektorning hammasi bilan solishtir",
      body: "Vektorlar vektor indeksiga tushadi, indekser esa har bir yangi yoki o'zgargan bo'lakni embed qiladi. Eng oddiy qidiruv, **aniq kNN**, har bir vektor bilan o'xshashlikni hisoblaydi va eng yaxshi 10 tasini qoldiradi.\n\nGolden set'dagi recall 41% dan 89% ga sakraydi. Lekin har bir so'rov 6.1 GB o'qiydi va 1.54 milliard ko'paytirish-qo'shishni bajaradi: 16 yadroli node'da 340 ms, soniyasiga 50 ta savol uchun esa faqat xotira o'tkazuvchanligining o'ziga 15 ga yaqin shunday node kerak.",
      fields: {
        "exact kNN": "k ta eng yaqin qo'shni, aniq hisoblangan: eng yaxshi javob, to'liq narxda.",
        "multiply-adds": "Har savolga N x d = 2 000 000 x 768.",
        "6.1 GB": "2 million vektor x 3 072 bayt, har savolda hammasi o'qiladi.",
        p95: "Javobni ham generatsiya qilishi kerak bo'lgan chat uchun juda sekin.",
        "50 questions/s": "Narx har bir vektor va har bir savol bilan o'sadi.",
      },
    },
    hnsw: {
      short: "HNSW",
      title: "Hammasini o'qish o'rniga graf bo'ylab yur",
      body: "**HNSW** har bir vektorni qatlamli grafda eng yaqin qo'shnilari bilan bog'laydi. Qidiruv siyrak yuqori qatlamdan boshlanadi, savol tomon sakraydi va qatlamma-qatlam pastga tushadi, `ef_search` ta eng yaxshi nomzodni ushlab turadi. U 2 million o'rniga 2 900 ga yaqin masofani hisoblaydi.\n\nNarxi recall: haqiqiy eng yaqin 10 tadan 96% i topiladi, shuning uchun golden set'dagi recall 89% dan 86% ga tushadi. p95 340 ms dan 4 ms ga tushadi. Graf xotiraga 0.26 GB qo'shadi.",
      check: {
        q: "`ef_search` ni 64 dan 200 ga ko'tarding. Nima o'zgaradi?",
        options: [
          "Recall va kechikish oshadi; xotira va indeks o'zgarmaydi",
          "Xotira uch barobar oshadi, chunki grafda bog'lanishlar ko'payadi",
          "Indeks qayta qurilmaguncha hech narsa",
        ],
        answer: 0,
        why: "`ef_search` so'rov vaqtidagi sozlama: kengroq nomzodlar ro'yxati ko'proq node'ga kiradi, haqiqiy qo'shnilarning ko'prog'ini topadi va uzoqroq ishlaydi (bu yerda 0.99 va 11 ms). `M` va `ef_construction` qurish vaqtidagi sozlamalar: ular graf va uning xotirasini belgilaydi va o'zgartirish uchun qayta qurish kerak.",
      },
      fields: {
        "M=16": "Har node'dagi bog'lanishlar. Ko'proq bog'lanish: yaxshiroq recall, ko'proq xotira, sekinroq qurish.",
        ef_construction: "Qurish paytidagi nomzodlar ro'yxati hajmi: yaxshiroq graf, uzoqroq qurish.",
        ef_search: "Qidiruv paytidagi nomzodlar ro'yxati hajmi: recall va kechikish o'rtasidagi murvat.",
        "recall@10": "Aniq top 10 ning graf qidiruvi topadigan ulushi.",
        "graph links": "Graf uchun qo'shimcha xotira: har vektorga 128 baytga yaqin.",
      },
    },
    quantize: {
      short: "int8",
      title: "Har bir sonni 4 bayt o'rniga 1 baytda saqla",
      body: "Indeksga 6.4 GB RAM kerak, RAM esa eng qimmat qismi. **Skalyar kvantlash** 768 ta sonning har birini 8 bitli butun son sifatida saqlaydi: vektorga 3 072 o'rniga 768 bayt, jami 1.5 GB.\n\nYaxlitlash biroz recall'ga tushadi, 0.96 → 0.93. Tuzatish arzon: int8 da qidir, keyin top 50 ni SSD'dagi to'liq float32 vektorlar bilan qayta bahola. Recall 0.96 ga qaytadi, p95 6 ms, xotira 1.8 GB.",
      fields: {
        float32: "Har songa 4 bayt: aniq, lekin to'rt barobar xotira.",
        int8: "Har songa 1 bayt: har qiymat 256 pog'onadan biriga yaxlitlanadi.",
        rescore: "Eng yaxshi bir nechta nomzodni aniq vektorlar bilan qayta saralash.",
        SSD: "To'liq vektorlar diskda qoladi; har savolga faqat 50 tasi o'qiladi.",
      },
    },
    filter: {
      short: "Filtr",
      title: "Filtr graf topgan deyarli hamma narsani olib tashlaydi",
      body: "O'zbek tilida so'zlashuvchi mijozlar sotuvda bor mahsulotlar haqidagi o'zbekcha maqolalarni olishi kerak. Birinchi versiya HNSW top 10 ni oladi, keyin filtrni qo'llaydi. Bo'laklarning faqat 8% i filtrdan o'tadi, shuning uchun o'rtacha 10 tadan 0.8 tasi qoladi.\n\nO'zbekcha savollarning 62% i umuman natija olmaydi. `ef_search` ni 1 000 ga ko'tarish biroz yordam beradi va p95 ni sakkiz barobar sekinlashtiradi.",
      check: {
        q: "Do'kon filtri vektorlarning faqat 0.1% iga mos keladi. Top 10 dan keyin filtrlash nima beradi?",
        options: [
          "Deyarli har doim bo'sh natija: o'rtacha har so'rovga 10 x 0.001 = 0.01 ta natija",
          "O'sha 10 ta natija, faqat biroz sekinroq",
          "Xato, chunki indeks filtrlay olmaydi",
        ],
        answer: 0,
        why: "Graf qidiruvi filtr haqida bilmaydi, shuning uchun u barcha vektorlar ichidan eng yaqin 10 tasini qaytaradi, filtr esa tasodifan mos kelgan bir nechtasinigina qoldiradi. Filtr qanchalik tanlab olsa, natija shunchalik bo'sh; shuning uchun filtrlash qidiruvdan keyin emas, qidiruv paytida bo'lishi kerak.",
      },
      fields: {
        filter: "Har vektor yonida saqlangan metama'lumot: til, qoldiq, do'kon.",
        "8%": "Qancha bo'lak o'tadi. Qolgani bu mijoz uchun foydasiz.",
        "0.8 results": "Top 10 dan keyingi filtrdan o'rtacha omon qoladigani.",
        ef_search: "Kengroq qidirish sekin va chala chora.",
      },
    },
    prefilter: {
      short: "Oldindan filtr",
      title: "Rejani filtr qanchasini qoldirishiga qarab tanla",
      body: "Filtr qidiruvning ichiga ko'chadi. 8% mos kelganda **filtered HNSW** grafda avvalgidek yuradi, lekin natija sifatida faqat mos node'larni hisoblaydi: 9 ms, bo'sh natija yo'q.\n\nJuda tanlab oladigan filtr, masalan bitta do'konning 2 400 ta bo'lagi, grafni orollarga bo'lib yuboradi. U yerda faqat moslarni aniq skanerlash arzonroq: 1.8 M amal, 1 ms. Har bir so'rov ishlatadigan filtrga, masalan tilga, har til uchun alohida indeks eng yaxshi javob.",
      watch: "Vektor bazalar bu rejalar orasida o'zi almashadi, lekin faqat filtrlanadigan maydonlar metama'lumot sifatida indekslangan bo'lsa. Indeks bilmaydigan maydon bo'yicha filtr yana keyingi filtrlashga qaytadi.",
      fields: {
        "filtered HNSW": "Mos kelmagan node'lar orqali ham o'tiladi, lekin ular hech qachon qaytarilmaydi.",
        "exact scan": "Moslar kam: hammasi bilan o'xshashlikni hisobla, graf kerak emas.",
        "separate index": "Har so'rov ishlatadigan filtrning har bir qiymatiga bitta indeks.",
      },
    },
    hybrid: {
      short: "Gibrid",
      title: "Vektorlar aniq kodlarni o'tkazib yuboradi: BM25 ni qaytar",
      body: "\"KT-2041 choynak qopqog'i yopilmayapti\". Vektorlar qopqoq nimaligini biladi, lekin model raqami ular uchun shunchaki shovqin: KT-2041 kafolat maqolasi faqat 4-o'rinda. BM25 esa uni birinchi qo'yadi, chunki aniq token mos keladi.\n\nQidiruv API ikkalasidan so'raydi va ro'yxatlarni **reciprocal rank fusion** bilan birlashtiradi: har ro'yxat 1 / (60 + o'rin) qo'shadi. Ballarni bir masshtabga keltirish kerak emas, faqat o'rinlar. Golden set'dagi recall 85% dan 93% ga ko'tariladi.",
      fields: {
        "vector top": "Ma'noda kuchli, kodlar, nomlar va kam uchraydigan aniq so'zlarda zaif.",
        BM25: "Aniq tokenlarda kuchli, sinonimlarni ko'rmaydi.",
        RRF: "Reciprocal rank fusion: har ro'yxatdan 1 / (k + o'rin) ni qo'shib chiq.",
        "60": "Odatiy k: bitta ro'yxatning birinchi o'rni hamma narsani bosib ketmasligi uchun.",
        "vector only": "Faqat bitta ro'yxat topgan hujjat bitta qo'shiluvchi oladi, shuning uchun odatda pastroqda turadi.",
      },
    },
    rag: {
      short: "RAG",
      title: "Eng yaxshi 5 bo'lakni manbalari bilan LLM'ga ber",
      body: "Retrieval-augmented generation ustiga qo'yiladigan yana bitta qadam: gibrid qidiruvning top 5 bo'lagi, 2 100 tokenga yaqin, faqat ulardan javob berish va ularga havola qilish ko'rsatmasi bilan LLM prompt'iga tushadi.\n\nJavob qidiruv qanchalik yaxshi bo'lsa, shunchalik yaxshi: qidiruv topmagan maqolaga LLM havola qila olmaydi. Shuning uchun golden set qidiruvni javoblardan alohida o'lchaydi.",
      watch: "Topilgan matn buyruq emas, ma'lumot. \"Yuqoridagi qoidalarni e'tiborga olma\" deb yozilgan maqola yordamchining xulqini o'zgartirmasligi kerak.",
      fields: {
        "top 5": "Kontekstga sig'adigan darajada kam, savolni qamraydigan darajada ko'p.",
        context: "Prompt'ga raqamlari bilan qo'yilgan bo'laklar.",
        cite: "Har bir da'vo mijoz ochib ko'ra oladigan manbaga ishora qiladi.",
        "not found": "O'ylab topilgan qaytarish qoidasidan ko'ra halol \"topilmadi\" yaxshiroq.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Vektor qidiruvning oltita qoidasi.\n\n1) Embedding modeli matnni vektorga aylantiradi; kosinus o'xshashligi umumiy so'zsiz ham bir xil ma'noni topadi. 2) Aniq kNN har so'rovga N x d turadi; uni faqat kichik to'plamlarda ishlat. 3) HNSW bir necha foiz recall'ni millisekundlarga almashtiradi; `ef_search` so'rov vaqtidagi murvat, `M` qurish vaqtidagisi. 4) Recall'ni yo'qotmasdan xotirani qisqartirish uchun int8 ga kvantla va eng yaxshi nomzodlarni qayta bahola. 5) Qidiruv paytida filtrla, rejani filtrning tanlovchanligiga qarab tanla va vektorlarni BM25 bilan reciprocal rank fusion orqali birlashtir. 6) Vektorni faqat o'sha model versiyasi yasagan vektorlar bilan solishtirsa bo'ladi: versiyani saqla va almashtirishdan oldin yangi indeksga qayta embed qil.",
    },
  },
  scenarios: {
    "model-swap": {
      label: "Yangi model, eski vektorlar",
      steps: {
        "swap-drop": {
          short: "Model almashdi",
          title: "So'rov modeli o'zgardi, saqlangan vektorlar esa yo'q",
          body: "14:00 da konfiguratsiya o'zgarishi so'rov tomonini yangi emb-v2 embedding modeliga o'tkazadi. Unda ham o'sha 768 o'lcham, shuning uchun hech narsa shikoyat qilmaydi: xato yo'q, timeout yo'q, p95 hali ham 9 ms.\n\nLekin saqlangan 2 million vektorni emb-v1 yasagan. Savol va maqolalar endi ikki xil fazoda yashaydi: eng yaxshi maqola 0.83 o'rniga 0.09 oladi. Golden set'dagi recall 93% dan 38% ga tushadi; gibridning faqat BM25 yarmi ishlab turibdi.",
          check: {
            q: "Nega hech narsa baland ovozda sinmadi?",
            options: [
              "HNSW kechikishni past tutish uchun xatolarni yashiradi",
              "Ikki model orasidagi kosinus xato tashlaydi, lekin log'lar o'chirilgan edi",
              "O'lchamlar mos, shuning uchun har bir amal to'g'ri: indeks shunchaki bir-biriga aloqasiz ikki fazodagi vektorlarni solishtiryapti",
            ],
            answer: 2,
            why: "Vektor shunchaki 768 ta sondan iborat ro'yxat; unda uni qaysi model yasagani yozilmagan. Uzunlik bir xil bo'lsa, matematika ishlayveradi va ishonchli bema'nilik qaytaradi. Buni faqat sifat tekshiruvi, masalan golden set'dagi recall yoki har vektor bilan saqlanib tekshiriladigan model id'si ushlaydi.",
          },
          fields: {
            EMBED_MODEL: "So'rov tomonidagi bitta sozlama; indeksga tegilmagan.",
            "768 dims": "O'sha o'lcham: deploy'ni to'xtatadigan tur xatosi yo'q.",
            "no error": "Hamma dashboard yashil.",
            "0.09": "Pul qaytarish maqolasi endi pul qaytarish savoliga aloqasizdek ko'rinadi.",
            "golden set": "500 ta belgilangan savol: chalingan yagona signal.",
          },
        },
        "swap-fix": {
          short: "Qayta embed",
          title: "Yangi indeks qur, model va indeksni birga almashtir",
          body: "So'rov tomoni darhol emb-v1 ga qaytariladi. Keyin jonli indeks yonida yangi help_v2 indeksi quriladi: 2 million bo'lak taxminan 30 daqiqada emb-v2 bilan qayta embed qilinadi. Qurilayotganda yangi va tahrirlangan bo'laklar ikkala indeksga yoziladi.\n\nhelp_v2 avval golden set'da tekshiriladi: 94%. Keyin bitta reliz alias'ni ham, model sozlamasini ham birga ko'chiradi. Har bir vektor uni yasagan modelni saqlaydi, boshqa modeldan kelgan so'rov esa yomon javob olish o'rniga rad etiladi.",
          fields: {
            help_v2: "Yangi model uchun yangi indeks, eskisining yonida.",
            "re-embed": "Har bir bo'lak yangi model orqali: deploy'ning yon ta'siri emas, rejalashtirilgan ish.",
            "both indexes": "Almashtirishgacha yozuvlar eskisiga ham, yangisiga ham boradi, shuning uchun keyin hech narsa yetishmaydi.",
            alias: "API so'raydigan nom; uni almashtirish bir zumda va orqaga qaytarish oson.",
            refused: "Nomuvofiqlik jim axlat o'rniga baland ovozli xatoga aylanadi.",
          },
        },
      },
    },
  },
};

export default text;
