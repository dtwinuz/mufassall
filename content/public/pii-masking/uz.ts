import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Shaxsiy ma'lumotlarni niqoblash",
  summary:
    "Ism, telefon, pasport raqami, karta raqami, manzil, hatto IP: shaxsiy ma'lumot bitta formadan kiradi, keyin jimgina loglarga, xato trekeriga, analitikaga, support ekranlariga va staging bazasiga tarqaladi. Xom qiymatni bitta joyda saqlash, har bir o'quvchiga faqat keraklisini ko'rsatish va inson so'raganda uni baribir o'chira olish yo'llari.",
  learn: [
    "Nima shaxsiy ma'lumot hisoblanadi va nega asosiy bazadan tashqarida deyarli har doim id yetarli",
    "Niqoblash, tokenizatsiya, shifrlash va hash: qaysi biri kim tomonidan orqaga qaytariladi va nega telefonning oddiy hash'i bir soniyada brute force bilan ochiladi",
    "Har bir chiqish nuqtasida yashirish: strukturali loglar, xato trekerlari, analitika eksporti, support ekranlari va prod bo'lmagan nusxalar",
    "Qiymatni rol bo'yicha, sabab va audit yozuvi bilan ochish; o'zgarmas buxgalteriya oldida o'chirish so'rovlari va crypto-shredding",
  ],
  nodes: {
    app: "Mobil ilova",
    support: "Support paneli",
    api: "Mijozlar API",
    db: "Mijozlar bazasi",
    logs: "Loglar ombori",
    staging: "Staging bazasi",
    tracker: "Xato trekeri",
    analytics: "Analitika",
    keys: "Kalit servisi",
    masker: "Niqoblash ishi",
  },
  metrics: {
    logpii: "Loglardagi shaxsiy qiymatlar",
    copies: "Xom shaxsiy ma'lumotli joylar",
    crack: "Ochilgan telefon hash'lari",
    views: "Ekranda to'liq ko'rsatilgan qiymat",
    erase: "O'chirishdan keyin qolgan nusxalar",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Muddatli to'lov formasi va uning ma'lumotlari qayerga boradi",
      body: "Do'kon muddatli to'lovga sotadi. Shartnoma tuzish uchun ilova ism, telefon, pasport raqami, karta raqami va manzilni yuboradi. API ularni mijozlar bazasiga saqlaydi, log yozadi va har kecha butun bazani testerlar uchun staging'ga ko'chiradi.\n\nXom shaxsiy ma'lumot allaqachon ikki joyda yashaydi, support ekranlari esa kuniga 9 000 marta to'liq qiymatni ko'rsatadi. Darsdagi hamma narsa soxta: `+998 90 000 00 00`, `AA1234567`, `4111` test kartasi.",
      fields: {
        full_name: "Shaxsiy ma'lumot: insonni to'g'ridan-to'g'ri nomlaydi.",
        phone: "Shaxsiy ma'lumot va boshqa tizimlarda insonga kalit: messenjerlar, banklar, yetkazib berish.",
        passport: "Hujjat raqami: eng nozik maydonlardan biri, birovning nomidan ish ko'rishga yetadi.",
        card_number: "Karta raqami (PAN): u tegadigan har bir tizimga karta sanoati qoidalari (PCI DSS) amal qiladi.",
        address: "Shaxsiy ma'lumot: ism bilan birga insonning qayerdaligini ko'rsatadi.",
        "X-Forwarded-For": "Mijozning IP manzili. Ko'p qonunlarda u ham shaxsiy ma'lumot.",
        customer_id: "Ma'nosiz id. Bazadan tashqarida boshqa tizimlar aynan shuni olib yurishi kerak.",
      },
    },
    "log-leak": {
      short: "Loglar",
      title: "Mijoz butunlay logga tushadi",
      body: "Skoring chaqiruvi timeout bilan tugaydi va xato handler'i so'rovni mijoz obyekti bilan birga logga yozadi. Xato trekerining SDK'si esa so'rov tanasini hodisaga sukut bo'yicha qo'shib yuboradi.\n\nEndi har bir muvaffaqiyatsiz so'rov ism, telefon, pasport va manzilni 40 nafar muhandis 30 kun davomida qidira oladigan log omboriga va ularni 90 kun saqlaydigan tashqi trekerga ko'chiradi. Kuniga 18 000 ta shaxsiy qiymat, ikki joy o'rniga to'rt joyda.",
      watch: "Loglar hamma joyga ko'chiriladi: jo'natiladi, indekslanadi, arxivlanadi, eksport qilinadi. Logga yozilgan qiymatni endi bitta joyda o'chirib bo'lmaydi.",
      fields: {
        request_id: "So'rovni va u orqali mijozni topish uchun shuning o'zi yetarli.",
        customer: "Butun obyekt serializatsiya qilingan: keyin qo'shiladigan maydonlar ham sizib chiqadi.",
        phone: "Qidiruv indeksidagi xom telefon.",
        passport: "Logga kirish huquqi bor hammaga ko'rinadigan xom pasport raqami.",
        "error tracker": "Ikkinchi nusxa, tashqi kompaniyada, o'z saqlash muddati bilan.",
      },
    },
    redact: {
      short: "Yashirish",
      title: "Jarayondan chiqmasdan oldin maydon nomi bo'yicha yashir",
      body: "Strukturali logger yashirish ro'yxatini oladi: bu nomdagi maydonlar har qanday chuqurlikda, qator yozilishidan oldin `[redacted]` bilan almashtiriladi. Treker SDK'si so'rov tanasini yubormaydi, `beforeSend` hook'i esa sizib o'tgan narsani tozalaydi.\n\nLogda `request_id` va `customer_id` qoladi. Insonni rostdan topishi kerak bo'lgan muhandis uni kirish nazorat qilinadigan bazadan qidiradi. Yana ikki joy.",
      watch: "Nom bo'yicha yashirish faqat maydonlarni ko'radi. Xabar matniga yopishtirilgan telefon, `\"SMS failed for +998...\"`, o'tib ketadi. Qiymatni emas, id'ni logga yozing.",
      check: {
        q: "Dasturchi `passport` yoniga `passport_series` maydonini qo'shadi. Nomlarning taqiq ro'yxati bilan nima bo'ladi?",
        options: [
          "U ham yashiriladi: passport bilan boshlanadi",
          "Kimdir uni ro'yxatga qo'shmaguncha sizib chiqaveradi",
          "Logger ishga tushishdan bosh tortadi",
        ],
        answer: 1,
        why: "Taqiq ro'yxati faqat unga yozilgan nomlarni biladi. Shuning uchun kuchliroq qoida: xavfsiz maydonlarning kichik ruxsat ro'yxatini (id, status, davomiylik) logga yozish, qolgan hammasini sukut bo'yicha yashirilgan deb hisoblash.",
      },
      fields: {
        redact: "Almashtiriladigan maydon nomlari, obyektning istalgan chuqurligida.",
        sendRequestBody: "O'chirilgan: treker stack trace va id'larni oladi, tanani emas.",
        customer_id: "Tekshirish uchun yetarli; qiymat kirish nazorat qilinadigan joyda qoladi.",
        "[redacted]": "Logda qiymat o'rnida qoladigan narsa.",
      },
    },
    "four-ways": {
      short: "4 usul",
      title: "Niqoblash, shifrlash, tokenizatsiya, hash: to'rt xil va'da",
      body: "**Niqoblash** ko'z uchun bir necha belgini qoldiradi, `AA*****67`; qolganini hech narsa qaytarmaydi. **Shifrlash** kalit egasi uchun qaytariladi, shuning uchun biznes yana o'qishi kerak bo'lgan qiymatlarga, masalan shartnomadagi pasportga mos. **Tokenizatsiya** qiymatni tasodifiy token bilan almashtiradi va asl qiymatni alohida vault'da saqlaydi; token boshqa hech qayerda hech narsani anglatmaydi.\n\n**Hash** bir tomonlama va deterministik: bir xil kirish har doim bir xil natija beradi. Bu solishtirish uchun qulay, qisqa qiymatlar uchun esa xavfli, keyingi qadam buni ko'rsatadi. Karta raqami do'konga umuman kelmasligi kerak: provayder formasi uni tokenlaydi, do'kon token va oxirgi to'rt raqamni saqlaydi.",
      check: {
        q: "Support shartnoma bo'yicha nizoda pasportni o'qishi, analitika noyob mijozlarni sanashi kerak, loglarga esa hech narsa kerak emas. Har biriga qaysi usul?",
        options: [
          "Hamma joyda hash: u bir tomonlama, demak xavfsiz",
          "Support uchun bazada shifrlash, analitika uchun kalitli hash, loglarda hech narsa",
          "Hamma joyda niqoblash: uchalasiga ham oxirgi raqamlar yetadi",
        ],
        answer: 1,
        why: "Support'ga haqiqiy qiymat qaytib kelishi kerak, buni faqat shifrlash (yoki vault) beradi. Analitikaga qiymat emas, tenglik kerak, kalitli hash shunga mos. Loglarga ikkalasi ham kerak emas: id yetarli. Kirish qiymatini taxmin qilish mumkin bo'lsa, oddiy hash analitikada ham ish bermaydi.",
      },
      fields: {
        mask: "Qisman ko'rsatish. Qaytarib bo'lmaydi, ekran va cheklar uchun yaxshi.",
        encrypt: "Kalit bilan qaytariladi, kalit esa ma'lumot yonida emas, kalit servisida turadi.",
        tokenize: "Tasodifiy o'rinbosar; uni faqat vault asl qiymatga qaytaradi.",
        hash: "Bir tomonlama, lekin takrorlanadi: har kim taxminni hash qilib solishtira oladi.",
        last4: "Do'kon odatda kartadan saqlaydigan yagona qism.",
      },
    },
    hash: {
      short: "Hash",
      title: "Hash qilingan telefon anonim emas",
      body: "Analitika eksporti telefonlarni `sha256(phone)` bilan almashtiradi va buni anonim deb ataydi. Lekin O'zbekiston mobil raqami `998` va 9 ta raqam: ko'pi bilan 1 000 000 000 ta variant.\n\nBitta GPU soniyasiga taxminan 10 milliard SHA-256 hash hisoblaydi. Faylni qo'lga kiritgan odam barcha mumkin bo'lgan raqamlarni soniyaning o'ndan birida hash qilib chiqadi va 410 000 ta telefonning hammasini qaytarib oladi. Eksportda baribir xom shaxsiy ma'lumot bor ekan: endi uch joy.",
      watch: "Qiymatlar to'plami kichik yoki taxmin qilinadigan har qanday maydon shunday ochiladi: telefonlar, pasport raqamlari, tug'ilgan sanalar, karta raqamlari.",
      fields: {
        phone_sha256: "Deterministik va kalitsiz: har kim qayta hisoblay oladi.",
        candidates: "Barcha mumkin bo'lgan raqamlar. Har birini sinab ko'rishga yetadigan darajada kam.",
        "one GPU": "Klaster kerak emas: o'yin videokartasi yetadi.",
        "410 000": "Tanlab emas, har bir mijoz.",
      },
    },
    hmac: {
      short: "HMAC",
      title: "Kalitli hash: maxfiy kalitli HMAC",
      body: "API `phone_ref = HMAC-SHA256(key, phone)` ni kalit servisida turgan 32 baytlik kalit bilan hisoblaydi, eksportga faqat ref tushadi. Kalitsiz brute force qiladigan narsa yo'q: taxminni tekshirib bo'lmaydi.\n\nBir xil telefon baribir bir xil ref beradi, shuning uchun analitika o'z ma'lumotlari ichida sanay va birlashtira oladi. Har bir iste'molchi o'z kalitini oladi, shuning uchun ikki eksportni bir-biriga moslab bo'lmaydi, kalitni esa ref'larni qayta hisoblab almashtirish mumkin.",
      check: {
        q: "Nega parollardagidek har qatorga tasodifiy salt emas?",
        options: [
          "Har qatorga salt yaxshiroq: shuni ishlating",
          "Har qatorga salt bilan bir xil telefon har safar boshqacha ko'rinadi: qidirish ham, sanash ham, birlashtirish ham yo'q",
          "Salt hash'ni sekinlashtiradi",
        ],
        answer: 1,
        why: "Parol faqat o'z qatori bilan tekshiriladi, shuning uchun har qatorga salt hech narsaga xalaqit bermaydi. Shaxsiy ma'lumot ref'lari esa qiymat bo'yicha topilishi kerak. Ustiga salt hash yonida saqlanadi, demak har qatorga 1 000 000 000 ta taxmin baribir arzon. Fayli bor hujumchida yo'q narsa bu maxfiy kalit (pepper).",
      },
      fields: {
        version: "Kalitlar versiyalanadi, ref qaysi kalit bilan yasalganini aytadi.",
        value: "Kalitning o'zi: uni faqat kalit servisi va API ko'radi.",
        "HMAC-SHA256": "Maxfiy kalit aralashtirilgan hash: faqat kalit egasi takrorlay oladi.",
        "never sees the key": "Faylning o'zi brute force uchun hech narsa bermaydi.",
        "same ref": "Tenglik saqlanadi, noyob mijozlarni sanash ishlayveradi.",
        "own key": "Turli iste'molchilarga turli kalit o'zaro moslashtirishni to'xtatadi.",
      },
    },
    reveal: {
      short: "Ochish",
      title: "Support oxirgi raqamlarni ko'radi, to'liq qiymatga sabab kerak",
      body: "Support paneli sukut bo'yicha `AA*****67` va `+998 ** *** ** 00` ni ko'rsatadi. Ochish roli bor xodim bitta maydonni tiketga ishora qiluvchi sabab bilan ochishi mumkin. Qiymat 60 soniya ko'rinadi, audit yozuvi esa kim, qaysi maydon, qaysi mijoz va nega ekanini qayd qiladi, qiymatning o'zini emas.\n\nAnalitiklarda ochish roli umuman yo'q. Ekrandagi to'liq qiymatlar kuniga 9 000 tadan 35 taga tushadi, har biri asoslangan.",
      check: {
        q: "Xodim bir oqshomda 400 ta pasportni ochadi, har biriga sabab \"tekshiruv\". Buni nima ushlaydi?",
        options: [
          "Hech narsa: xodimda rol bor edi",
          "Xodim uchun kunlik limit va audit yozuvlari bo'yicha ogohlantirish; sabab haqiqiy tiketni ko'rsatishi shart",
          "Audit yozuvida pasportni niqoblash",
        ],
        answer: 1,
        why: "Rollar kim ocha olishini belgilaydi, suiiste'molni sezmaydi. Agar kimdir qarasa, audit yozuvlari sezadi: kuniga 20 ta ochish kabi limit, undan oshganda ogohlantirish va tiket tekshiruvi jimgina eksportni ko'rinadigan hodisaga aylantiradi.",
      },
      fields: {
        field: "Butun profil emas, bir vaqtda bitta maydon.",
        reason: "Tiketga bog'langan, keyin tekshiruvchi uni ko'ra oladi.",
        visible_for_s: "Qiymat bir daqiqadan keyin ekrandan yo'qoladi.",
        audit_id: "Ochish yozuvi. Uning o'zida shaxsiy qiymat yo'q.",
      },
    },
    staging: {
      short: "Staging",
      title: "Staging haqiqiy emas, niqoblangan nusxani oladi",
      body: "Kechki nusxa endi niqoblash ishi orqali o'tadi. Ismlar seed'li generatordan olinadi, telefonlar `+998 00` va mijoz id'sidan hosil qilingan raqamlarga aylanadi (`00` kodli operator yo'q), pasportlar formatini saqlaydi, lekin hech qachon berilmaydigan `XX` harflari bilan, kartalardan faqat test tokenlari qoladi.\n\nBir mijoz har bir jadvalda bir xil soxta qiymatlarni oladi, shuning uchun join'lar va testlar ishlayveradi. Testerlar va pudratchilar hech kimga tegishli bo'lmagan, lekin haqiqatga o'xshash ma'lumot bilan ishlaydi. Xom ma'lumotli bitta joy qoldi: prod bazasi.",
      check: {
        q: "Dasturchi `customers.email2` ni qo'shadi, lekin unga niqoblash qoidasi yozmaydi. Ish nima qilishi kerak?",
        options: [
          "Qanday bo'lsa shunday ko'chirish: bor-yo'g'i bitta ustun",
          "To'xtash va ustunga qoida yozilmaguncha dump'ni muvaffaqiyatsiz tugatish",
          "Ustunni jimgina tashlab yuborish",
        ],
        answer: 1,
        why: "Niqoblash ishi xavfsiz tomonga yiqilishi kerak. Noma'lum ustunni ko'chirish uni sizdiradi, jimgina tashlash staging'ni chalkash tarzda buzadi. Ishning yiqilishi kimnidir qaror qilishga majbur qiladi: niqoblash, generatsiya qilish yoki tashlash.",
      },
      fields: {
        seeded: "Generatsiya qilingan, takrorlanadigan soxta qiymatlar: bir xil ishga tushirish bir xil ismlarni beradi.",
        "same fake": "Id'dan hosil qilinadi, jadvallar orasidagi bog'lanish saqlanadi.",
        "valid format": "Ilovada tekshiruvdan o'tadi, lekin hech kimga tegishli bo'la olmaydi.",
        "pii.yaml": "Shaxsiy ustunlar va ularning qoidasi ro'yxati, kod kabi review qilinadi.",
        "stops the job": "Xavfsiz tomonga yiqilish: qoida yo'q, nusxa ham yo'q.",
      },
    },
    erase: {
      short: "O'chirish",
      title: "Mijoz o'zini o'chirishni so'raydi",
      body: "Ko'p davlatlarning shaxsiy ma'lumotlar qonunlari insonga o'z ma'lumotini o'chirishni so'rash huquqini beradi. Oddiy `DELETE` yiqiladi: mijozga oltita shartnoma ishora qiladi. Buxgalteriyadagi to'lovlar 5 yil saqlanishi kerak va u faqat qo'shishga ochiq. Audit log hash zanjiri bilan bog'langan, qatorni o'chirish zanjirni uzadi. 35 ta kechki zaxiraning har birida esa to'liq qator bor.\n\nInsonning ma'lumoti tizim hech qachon o'zgartirmaslik uchun qurilgan to'rt joyda omon qoladi.",
      watch: "O'chirish bitta DELETE emas. Har bir nusxa hisobga kiradi: qatorlar, loglar, eksportlar, zaxiralar.",
      fields: {
        ERROR: "Foreign key'lar mijozga hali muhtoj shartnomalarni himoya qiladi.",
        ledger: "Qonun saqlashni talab qiladigan va hech qachon tahrirlanmasligi kerak bo'lgan pul yozuvlari.",
        audit_log: "Faqat qo'shishga ochiq va zanjirlangan: uni tahrirlash aynan u oldini olishi kerak bo'lgan narsa.",
        backups: "Hech kim qatorma-qator tahrirlamaydigan eski nusxalar.",
      },
    },
    shred: {
      short: "Shredding",
      title: "Crypto-shredding: qatorlarni emas, kalitni o'chir",
      body: "Profil maydonlari (ism, telefon, manzil) boshidanoq har bir mijozga alohida kalit bilan shifrlangan, kalit esa bazada emas, kalit servisida turadi. O'chirish o'sha kalitni yo'q qiladi. Qatorlar qoladi, shartnomalar va jamilar baribir mos keladi, lekin maydonlar hamma joyda, 35 ta zaxiraning hammasida ham, ma'nosiz baytlarga aylanadi.\n\nPasport shartnomalar uchun qonuniy saqlash muddatida; uning kaliti muddat tugaganda o'chiriladi. Buxgalteriya va auditda hech qachon ism bo'lmagan, faqat `c_5120`. Loglar 14, treker 30 kun saqlaydi, ulardagi nusxalar o'z-o'zidan eskirib ketadi.",
      check: {
        q: "Nega har mijozning kaliti ma'lumot bilan bir bazada turmasligi kerak?",
        options: [
          "Hech gap emas: kalitlar jadvali kichik",
          "Baza zaxiralari har bir kalitning nusxasini shifrlangan ma'lumot yonida saqlab qoladi, demak uni o'chirish hech narsani o'chirmaydi",
          "Bazadagi kalitni o'qish sekinroq",
        ],
        answer: 1,
        why: "Crypto-shredding faqat kalitning barcha nusxalari yo'qolganda ishlaydi. Bir bazadagi kalitlar o'sha 35 ta zaxirada ham bor, zaxiradan tiklash insonni qaytarib olib keladi. Kalit servisida o'chirilgan kalitlar uchun o'zining qisqa saqlash muddati bor.",
      },
      fields: {
        "outside the DB backups": "Kalitni o'chirish rostdan o'chiradigan yagona joy.",
        erased: "Qator shartnomalar uchun qoladi, o'chirilgan deb belgilanadi.",
        "all 35 backups": "U yerdagi shifrlangan baytlar kalitsiz foydasiz.",
        "legal hold": "Ba'zi ma'lumot qonun bo'yicha saqlanishi shart; muddat tugaganda o'chiriladi.",
        "never a name": "Buxgalteriya va audit faqat id olib yuradi, ularni o'zgartirish kerak emas.",
        "14 days": "Qisqa saqlash muddati eski nusxalarni tozalash ishisiz yo'qotadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Shaxsiy ma'lumotning yetti qoidasi.\n\n1) Xom qiymatni bitta bazada saqlang, qolgan hamma joyda id olib yuring. 2) Har bir chiqish nuqtasida yashiring: logger, xato trekeri, analitika; xavfsiz maydonlarning ruxsat ro'yxatini afzal ko'ring. 3) Usulni qiymatni kim qaytarib o'qishi kerakligiga qarab tanlang: ekran uchun niqob, biznes uchun shifrlash, karta uchun token, solishtirish uchun kalitli hash (HMAC). 4) Telefon yoki pasportning oddiy hash'i anonim emas: brute force bir soniya oladi. 5) Oxirgi raqamlarni ko'rsating; to'liq qiymatni rol bo'yicha, sabab va audit yozuvi bilan oching va bu yozuvlarni kuzating. 6) Prod bo'lmagan nusxalar niqoblangan yoki sintetik, niqoblash ishi esa xavfsiz tomonga yiqiladi. 7) O'chirishni oldindan rejalang: bazadan tashqaridagi har inson kaliti, faqat qo'shishga ochiq omborlar va zaxiralar uchun crypto-shredding, loglar uchun qisqa saqlash muddati.",
    },
  },
  scenarios: {
    "debug-body": {
      label: "Debug tana logi",
      steps: {
        "debug-leak": {
          short: "Debug log",
          title: "Debug middleware so'rovning xom tanasini logga yozadi",
          body: "To'lovdagi xatoni qidirish uchun kimdir prod'da `DEBUG_HTTP` ni yoqadi. Middleware har bir so'rov tanasini bitta matn qatori sifatida logga yozadi, mijozlar karta bog'laydigan `POST /v1/cards` ni ham.\n\nYashirish ro'yxatida `card_number` bor, lekin u strukturali ma'lumotdagi maydon nomlariga qaraydi, bu yerda esa tana bitta qator. Uch kun davomida kuniga 1 300 ta karta bog'lash logga va trekerga tushadi: CVV bilan birga 3 900 ta to'liq karta raqami.",
          check: {
            q: "`card_number` uchun yashirish sozlangan. Raqam nega o'tib ketdi?",
            options: [
              "Yashirish ro'yxatida xato yozilgan edi",
              "Middleware tanani bitta qator qilib yozdi; maydon nomi bo'yicha yashirish uning ichiga qaramaydi",
              "Treker yashirishni e'tiborsiz qoldiradi",
            ],
            answer: 1,
            why: "Yashirish struktura bilan ishlaydi. Tana qatorga aylantirilgach, maydon nomi qiymat ichidagi oddiy matn bo'lib qoladi. Tanalar umuman logga yozilmasligi kerak, log yo'lidagi andoza skaneri esa matn uchun ehtiyot to'ri.",
          },
          fields: {
            DEBUG_HTTP: "Noutbuk uchun mo'ljallangan, prod'da yoqilgan kalit.",
            body: "Xom tana bitta qator sifatida: maydon nomi bo'yicha yashirishga ko'rinmaydi.",
            "field names": "Yashirish qaraydigan narsa: kalitlar, qiymat ichidagi matn emas.",
            "3 900": "O'sha uch kunda bog'langan har bir karta, xavfsizlik kodi bilan.",
          },
        },
        "debug-stop": {
          short: "To'xtatish",
          title: "So'rovning shaklini logga yoz, tanasini hech qachon",
          body: "HTTP log qatori endi qat'iy shaklga ega: metod, yo'l, status, hajm, davomiylik va so'rov id'si. Sarlavhalar va tanalar daraja qanday bo'lmasin, hech qachon yozilmaydi. Servis prod'da `DEBUG_HTTP` bilan ishga tushishni rad etadi.\n\nEhtiyot to'ri sifatida log pipeline matndan karta raqamining Luhn tekshiruvidan o'tadigan 13 tadan 19 tagacha raqamli ketma-ketliklarni qidiradi, ularni almashtiradi va xavfsizlik kanalini chaqiradi. Yangi sizishlar nolga tushadi.",
          fields: {
            Never: "Kimdir o'zgartira oladigan sozlama emas, koddagi qoida.",
            refused: "Xavfli kalit prod'ga umuman yeta olmaydi.",
            Luhn: "Karta nazorat yig'indisi: karta raqamini buyurtma raqamidan ajratadi.",
            paged: "Sizish dashboard'dagi qator emas, hodisa.",
          },
        },
        "debug-clean": {
          short: "Tozalash",
          title: "Allaqachon mavjud har bir nusxani o'chir",
          body: "Yangi sizishlarni to'xtatish allaqachon yozilgan 3 900 qatorni olib tashlamaydi. Jamoa ularni uchta kunlik indeksda so'rov bo'yicha o'chiradi, 212 ta treker hodisasini provayder API'si orqali o'chiradi va undan o'z nusxalarini tozalashni so'raydi, arxivdagi log obyektlarini qayta yozib, eski versiyalarini olib tashlaydi.\n\nLogdagi karta ma'lumoti PCI DSS hodisasi: to'lov provayderi va risk jamoasiga xabar beriladi, kartalar bo'yicha ular qaror qiladi. Xom ma'lumotli joylar soni yana ikkiga qaytdi.",
          fields: {
            "delete by query": "Butun kunlik loglarni emas, faqat mos qatorlarni o'chiradi.",
            "212 events": "Trekerdagi har bir hodisada kartali tana bor edi.",
            "old object versions": "Versiyali ombor versiyalar ham o'chirilmasa, eski faylni saqlab qoladi.",
            "PCI DSS": "Karta sanoati qoidalari: sizgan karta raqami shunchaki o'chirilmaydi, xabar qilinadi.",
          },
        },
      },
    },
  },
};

export default text;
