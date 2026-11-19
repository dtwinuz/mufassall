import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Halvet, hammom va basseyn quruvchilar uchun premium sayt",
  summary:
    "Halvet bu shaxsiy turk hammomi, sauna va basseynlarni kalitgacha quradigan kichik jamoaning sayti: elektrika, santexnika, nasos va filtrlar, mozaika. Mijozlari talabchan, shuning uchun sayt premium ko'rinishi va telefonda ham tez ochilishi shart. Build bosqichisiz statik sayt, zaxira zinapoyasi bor GPU bug'i, xat yozadigan konsultatsiya formasi, o'zbekcha manbadan yig'iladigan ruscha va inglizcha sahifalar va deploy'ni to'xtatadigan tarjima to'sig'i, qattiq CSP va faqat toza main'ni chiqaradigan deploy.",
  learn: [
    "Mehmon yo'li: hero bug'i, makonlar bo'ylab 3D parvoz, muhandislik kesimlari va chizmalari, galereya, savollar va konsultatsiya formasi",
    "Bundler'siz sayt: bo'lim skriptlari, lazy yuklanadigan vendored three.js va GPU suyuqlik simulyatsiyasidan 2D sprite'largacha zaxira zinapoyasi",
    "Telefondagi baho 55 dan 100 ga qanday chiqdi: kanvas aniqligi, kadr tezligi, blend mode'siz, WebP srcset, o'zimizdagi shriftlar",
    "Bitta manbadan uch til va tarjima to'sig'i, deploy'da keshni yangilash, qattiq CSP va oldingi saytni saqlab rollback",
  ],
  nodes: {
    guest: "Mehmon brauzeri",
    edge: "dtwin.uz edge proksi",
    site: "halvet-site (Caddy)",
    mail: "Mehmonning pochta ilovasi",
    gpu: "Mehmonning GPU si",
    tool: "tools/i18n.mjs",
    owner: "Egasining noutbuki",
  },
  metrics: {
    weight: "Mobildagi sahifa hajmi",
    lh: "Lighthouse mobil performance",
    tbt: "Umumiy bloklanish vaqti",
    langs: "Tillar",
    broken: "Jonli saytdagi buzilgan bo'limlar",
    blocked: "Iflos daraxt to'xtatgan deploy'lar",
  },
  steps: {
    intro: {
      short: "Bu nima",
      title: "Eng yaxshi hammomlarni ko'rgan odamlar uchun sayt",
      body: "Halvet (turk hammomining eng issiq va eng xilvat xonasi) hammom, fin saunasi va basseynlarni birinchi chizmadan oxirgi mozaika toshigacha quradigan kichik jamoaning brendi. Mehmonlar badavlat, dunyoni ko'rgan va nozik didli: sayt dunyo darajasidagi studiyadek ko'rinishi va raqobatchilar yashiradigan muhandislikni tushuntirishi kerak.\n\nU halvet.dtwin.uz da dtwin.uz ning umumiy edge proksisi orqasidagi kichik Caddy konteyneridan beriladi. Javobda qattiq CSP bor: skript, stil, shrift va rasm faqat saytning o'zidan, forma esa faqat saytga yoki `mailto:` ga yuborilishi mumkin.",
      fields: {
        Host: "Hozircha dtwin.uz ning subdomeni; brendning o'z domeni hali sozlanmagan.",
        "Cache-Control": "HTML har safar qayta tekshiriladi; skript va stillar bir yilga keshlanadi (deploy qadamiga qarang).",
        "Content-Security-Policy": "Inline skript ham, stil ham, begona manba ham yo'q; form-action ariza formasi uchun mailto: ga ruxsat beradi.",
        "Permissions-Policy": "Sahifa kamera, mikrofon yoki joylashuv so'ramaydi.",
      },
    },
    journey: {
      short: "Yo'l",
      title: "Mehmonning sahifa bo'ylab yo'li",
      body: "Sahifa kurnalaridan jonli bug' ko'tarilayotgan hammom surati bilan ochiladi; sichqonchani qimirlatsangiz havo aylanadi. Pastda Halvet nima (3D gumbaz), makonlar (scroll qilganingiz sari kamera hammom, sauna va basseyn ichidan uchib o'tadi), keyin muhandislik: interaktiv 3D kesimlar, quvurlari rang bilan ajratilgan 3D texnik xona va filtratsiya, isitish, elektrika, santexnika, bug', suv kimyosi va avtomatikaning yettita chizmasi.\n\nKeyin hunar (shisha mozaika shaderi va o'zini o'zi chizadigan girih yulduzi), ilhom galereyasi, taqqoslash, loyihaning olti bosqichi, savollar va konsultatsiya formasi. Uning ortidagi tadqiqot bu sohadagi eng yaxshi saytlar haqida shuni aytgan: kino sifatidagi suratlar, sokin harakat, bitta imzo effekt va boshqa hech kim ko'rsatmaydigan muhandislik kesimi.",
      fields: {
        hero: "Imzo effekt: haqiqiy surat ustida haqiqiy bug'.",
        "#makonlar": "Makonlar: kamerani scroll boshqaradi, sur'atni mehmon belgilaydi.",
        "#muhandislik": "Ko'rinadigan muhandislik: mozaika ortida nima borligi, chizma va 3D da.",
        "#boshqaruv": "Aqlli boshqaruv konsepsiyasi, hali mavjud emas deb belgilangan.",
        "#ilhom": "Har bir suratning muallifi ko'rsatilgan ilhom galereyasi.",
        "#aloqa": "Sahifa tugaydigan joy: bitta forma, bitta harakat.",
      },
    },
    lead: {
      short: "Ariza",
      title: "Konsultatsiya formasi xat yozadi",
      body: "Forma ism, telefon raqami, qaysi makonlar kerakligi (hammom, sauna, basseyn, faqat muhandislik), joy, maydon va izohni so'raydi. Skript ismni va telefonda kamida to'qqizta raqam borligini tekshiradi, keyin javoblarni xat matniga qo'yib `mailto:` havola yasaydi. Mehmonning o'z pochta ilovasi tayyor xat bilan ochiladi.\n\nServer ham, baza ham yo'q, sayt hech qanday shaxsiy ma'lumot saqlamaydi. Manzil hali o'rinbosar: arizalar uchun Telegram bot va jamoaning haqiqiy kontaktlari keyingi qadam, README buni yashirmasdan aytadi.",
      check: {
        q: "Nega CSP da form-action ichida mailto: bor?",
        options: [
          "Brauzer formani pochta serveriga yuborishi uchun",
          "Forma mailto: ga o'tish bilan tugaydi, yolg'iz form-action 'self' uni bloklardi",
          "Telegram bot uchun kerak",
        ],
        answer: 1,
        why: "form-action forma qayerga o'ta olishini cheklaydi. Ariza oqimi mailto: havola bilan tugaydi, shuning uchun bu sxemaga aniq ruxsat berilgan; qolgan hammasi saytning o'zi bilan cheklangan.",
      },
      fields: {
        ism: "Ism: majburiy.",
        tel: "Telefon: kamida 9 raqam, xato xat yozilishidan oldin ushlanadi.",
        makon: "Loyiha qaysi makonlar haqida: jamoaga birinchi qo'ng'iroqqa tayyorlanishga yordam beradi.",
        mailto: "Xat brauzerda tuziladi va mehmonning pochta ilovasi orqali yuboriladi.",
        "stores nothing": "Backend yo'q, demak hozircha sizadigan ham, himoyalanadigan ham narsa yo'q.",
      },
    },
    trust: {
      short: "Halollik",
      title: "Hech narsani to'qimaydigan premium sahifa",
      body: "Premium mijoz soxtani darrov sezadi. Shuning uchun sahifa ehtiyotkor: suratlar jamoaning haqiqiy loyiha suratlari kelguncha AI o'rinbosarlar, to'qima loyiha, raqam yoki sharh yo'q. Aqlli boshqaruv bo'limida \"Tez kunda · konsepsiya\" belgisi bor: qiymatlar simulyatsiya, Halvet bu xizmatni hali sotmaydi.\n\nGalereyadagi 14 surat litsenziyali va lightbox'da muallifini ko'rsatadi; uchta kayfiyat videosi Pexels va Mixkit'dan, footerda kredit bilan.",
      fields: {
        "AI stand-ins": "Haqiqiy suratlar bo'lguncha o'rinbosar; hech narsa tayyor loyiha bo'lib ko'rinmaydi.",
        konsepsiya: "Aqlli boshqaruv panelidagi belgi.",
        licensed: "Galereyadagi har bir suratning litsenziyasi va muallifi bor.",
        credited: "Bepul stock videolar ham kredit qatorini oladi.",
      },
    },
    arch: {
      short: "Arxitektura",
      title: "Bundler yo'q: git'da nima bo'lsa, o'sha beriladi",
      body: "Sayt `v1/` dagi oddiy HTML, bitta stil fayli va har bo'limga bitta skript. Build bosqichi, freymvork va runtime'da npm bog'liqligi yo'q: three.js r170 va Lenis `vendor/` ga ko'chirilgan va saytning o'zidan beriladi. Og'ir 3D bo'limlar faqat o'z bo'limi yaqinlashganda yuklanadigan ES modullar.\n\nNega bunchalik oddiy: uni bir kishi yuritadi, har bir effekt qolganiga tegmasdan olib tashlash mumkin bo'lgan alohida fayl, deploy esa fayllarni borligicha ko'chira oladi.",
      fields: {
        "no build step": "Kompilyatsiya yo'q; generatsiya qilinadigani faqat ru va en nusxalar.",
        "vapor.js": "Har faylga bitta effekt: hero bug'ini sahifaga tegmasdan almashtirsa bo'ladi.",
        "lazy modules": "3D bo'limlargacha scroll qilmagan mehmon ularni yuklab ham olmaydi.",
        "vendor/": "Kutubxonalar o'sha manbadan beriladi, CSP baribir shuni talab qiladi.",
        "WebP srcset": "Brauzer o'ziga kerak kenglikni 640 dan 2000 px gacha tanlaydi.",
      },
    },
    vapor: {
      short: "Bug'",
      title: "GPU dagi bug' va zaxira zinapoyasi",
      body: "Hero bug'i GPU dagi stable fluids simulyatsiyasi: advection, girdob saqlash va bosim proyeksiyasi, manbalar suratdagi kurnalar ustiga qo'yilgan. Bug' qalin joyda u suratni issiq havodek sindiradi. Unga half-float render target'li WebGL kerak; ular bo'lmasa false qaytaradi va sahifa yengilroq tuman shaderiga, keyin 2D sprite bug'larga o'tadi.\n\nIshga tushayotganda sahifa javob berib turishi uchun shaderlar fonda kompilyatsiya qilinadi, simulyatsiya esa 6 ms li bo'laklarda isiydi; tayyor bo'lguncha CSS bug' qatlami ko'rinib turadi. Ma'lumot tejash rejimidagi ulanishda og'ir effektlar o'tkazib yuboriladi, reduced motion bo'lsa bug' qimirlamaydi.",
      check: {
        q: "Eski telefonda WebGL bor, half-float tekstura yo'q. Uning mehmoni nimani ko'radi?",
        options: [
          "Bo'sh hero",
          "Tuman shaderini, u ham ishlamasa sprite bug'larni",
          "Xato xabarini",
        ],
        answer: 1,
        why: "vapor.js ishlay olmasligini aytadi, startFog keyingi pog'onani sinaydi: tuman shaderi, keyin 2D sprite'lar. Surat va matn har doim joyida; bug' esa sifati pasayishi mumkin bo'lgan bezak.",
      },
      fields: {
        "stable fluids": "Real vaqtda suyuqlik simulyatsiyasining klassik, barqaror usuli.",
        "half-float": "16 bitli float teksturalar; ularsiz simulyatsiya yetarlicha aniq emas.",
        KHR_parallel_shader_compile: "Asosiy oqimni to'xtatmasdan kompilyatsiya holatini keyin so'rash.",
        "fog.js": "Ikkinchi pog'ona: arzonroq, lekin baribir WebGL.",
        saveData: "Mehmon ma'lumot tejashni so'ragan: og'ir effekt yo'q.",
        "prefers-reduced-motion": "Bug' bir marta chiziladi va qimirlamaydi.",
      },
    },
    slow: {
      short: "Sekin",
      title: "Birinchi versiya chiroyli, lekin sekin edi",
      body: "Telefondagi Lighthouse birinchi versiyaga 55 berdi, bloklanish vaqti 14.4 soniya. Sahifa 3.6 MB edi, asosan 0.8 MB gacha bo'lgan JPEG suratlar va Google'dan shriftlar. Eng yomoni hero edi: bug' kanvasi birinchi lahzadanoq har kadrda qurilmaning to'liq aniqligida chizilardi, ustiga `mix-blend-mode`, bu esa brauzerni har kadrda butun hero'ni qayta kompozitsiya qilishga majbur qiladi.",
      check: {
        q: "Bloklanish vaqtini nima bunchalik katta qildi?",
        options: [
          "Suratlar",
          "Sahifa yuklanganidan beri har kadrda qayta chiziladigan to'liq aniqlikdagi kanvas va to'liq kompozitsiyaga majbur qiladigan blend mode",
          "Shriftlar",
        ],
        answer: 1,
        why: "Suratlar trafik oladi, asosiy oqim vaqtini emas. Boshidanoq har kadrda chiziladigan, ostidagi bilan aralashtiriladigan to'liq aniqlikdagi kanvas sahifa ishlatishga yaroqli bo'lmasidan oldin asosiy oqim va kompozitorni band qiladi.",
      },
      fields: {
        "performance 55": "v1 ning mobil bahosi, 2026-11-09 da o'lchangan.",
        "14.4 s": "Umumiy bloklanish vaqti: sahifa bosishlarga javob bera olmasdi.",
        "3.6 MB": "Asosan har qanday telefon ekranidan katta suratlar.",
        "full device resolution": "Yumshoq bug' effektiga kerakligidan ancha ko'p piksel.",
        "mix-blend-mode": "Aralashtirish brauzerni kanvas ostidagi qatlamlarni qayta hisoblashga majbur qiladi.",
      },
    },
    fast: {
      short: "Tez",
      title: "O'sha ko'rinish, ishning bir qismi",
      body: "1.1 versiya bug'ni 35% aniqlikda va soniyasiga 30 kadrda chizdi, uni faqat sahifa yuklangandan keyin boshladi va ekrandan tashqarida yoki yashirin tabda pauza qildi. Bug' yumshoq, past aniqlikni hech kim sezmaydi. Blend mode olib tashlandi; tuman va nurlar faqat transform va opacity bilan harakatlanadi, kompozitor ularni qayta chizmasdan bajaradi.\n\nSuratlar 640 dan 2000 px gacha moslashuvchan WebP bo'ldi, ularni skript qayta yaratadi, shriftlar preload bilan saytning o'ziga ko'chdi. Natija: mobil performance 55 dan 100 ga, sahifa 3.6 dan 0.65 MB ga, SEO 92 dan 100 ga. Keyingi WebGL qatlamlar jonli mobil bahoni 92 ga tushirdi (v1.8), jamoa buni imzo effekt uchun qabul qildi.",
      fields: {
        "35%": "Har kadrda kamroq piksel; bug'ning xiraligi buni yashiradi.",
        "30 fps": "Yarim kadr, sekin harakatlanuvchi bug' uchun baribir silliq.",
        transform: "Kompozitor layout va paint'siz bajara oladigan harakatlar.",
        WebP: "Bir xil sifatda kichikroq fayl, har ekranga o'z o'lchami.",
        "self-hosted": "Begona shrift so'rovi yo'q, CSP esa qattiqroq.",
      },
    },
    i18n: {
      short: "Tillar",
      title: "O'zbekcha manbadan ruscha va inglizcha",
      body: "Sahifa bir marta, o'zbekcha yoziladi. `tools/i18n.mjs` uni bo'laklarga ajratadi: inline teglari bilan birga matn bloki, alt va aria-label kabi atribut matnlari va bo'lim skriptlari ichidagi matn satrlari (kod, shader va CSS satrlari tanib olinib o'tkazib yuboriladi). Har bir bo'lak `i18n/ru.json` va `i18n/en.json` da qidiriladi, har birida 609 bo'lak, va vosita `index.ru.html`, `app.ru.js` va qolganlarini yozadi.\n\nBirorta bo'lakning tarjimasi bo'lmasa, vosita xato bilan chiqadi va deploy to'xtaydi. Nega qattiq to'xtash: premium mijoz oldida yarim tarjima qilingan sahifa kechikkan yangilanishdan yomonroq. Yangi matn degani `extract` ni yurgizish, `*.missing.json` ni tarjima qilish, keyin deploy.",
      check: {
        q: "Savollarga o'zbekcha yangi javob qo'shildi va deploy uni tarjima qilmasdan boshlandi. Nima bo'ladi?",
        options: [
          "ru va en sahifalarda shu javob o'zbekcha chiqadi",
          "i18n build 1 bilan chiqadi va deploy hech narsa ko'chirilmasidan to'xtaydi",
          "Javob ru va en dan tushib qoladi",
        ],
        answer: 1,
        why: "deploy.sh avval i18n build'ni yurgizadi va uning xatosida to'xtaydi. Hech narsa chiqmaydi, yetishmagan bo'laklar tarjima qilinguncha jonli sayt to'liq tarjima qilinganicha qoladi.",
      },
      fields: {
        "inline tags": "Tarjimon bo'laklarni emas, urg'u va havolalari bilan butun gapni ko'radi.",
        "single-quoted": "Skriptlardagi matn ham olinadi: chizma yorliqlari, izohlar, tugmalar.",
        "609": "v1.8 dagi har bir lug'atdagi bo'laklar.",
        "not in git": "Generatsiya nusxalari har deploy'da qayta yig'iladi, manbadan hech qachon ajralib qolmaydi.",
        "exit 1": "Yetishmagan tarjima jim zaxira emas, yiqilgan build.",
      },
    },
    caddy: {
      short: "Berish",
      title: "Caddyfile'dagi til yo'llari va kesh qoidalari",
      body: "`/ru` va `/en` alohida statik sahifalar, rewrite bilan bog'langan; oxiridagi slash qisqa shaklga yo'naltiriladi. Skript, stil, shrift va vendor fayllar bir yilga immutable qilib keshlanadi, bu xavfsiz, chunki deploy har relizda ularning URL'ini o'zgartiradi. Surat va videolar bir haftaga keshlanadi, HTML va `version.txt` har safar qayta tekshiriladi. Noma'lum yo'l bosh sahifaga yo'naltiriladi.",
      fields: {
        rewrite: "Generatsiya fayllaridan beriladigan toza til URL'lari.",
        immutable: "Faqat har deploy havolalarga ?v=<sha> qo'shgani uchun xavfsiz.",
        "604800": "Kam o'zgaradigan surat va videolar uchun bir hafta.",
        "no-cache": "Sahifa va versiya fayli har doim tekshiriladi, deploy darhol ko'rinadi.",
        "404": "Bir sahifali sayt: noma'lum yo'l xato sahifasiga emas, boshiga boradi.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Serverga faqat toza main yetib boradi",
      body: "Deploy egasining noutbukidan bitta skript bilan qilinadi. Ishchi daraxtda biror o'zgarish bo'lsa yoki `HEAD` aynan `origin/main` bo'lmasa, u boshlashdan bosh tortadi, shuning uchun jonli sayt har doim hamma ko'ra oladigan commit. U tillarni yig'adi, `v1/` ni staging papkaga ko'chiradi, har bir skript va stil havolasiga `?v=<sha>` qo'shadi, `version.txt` ni yozadi va hammasini serverga oqizadi.\n\nU yerda joriy sayt `site.prev` ga ko'chiriladi, yangisi uning o'rnini egallaydi. Keyin skript ochiq `version.txt` yangi commit'ni ko'rsatmaguncha so'raydi; hech ko'rsatmasa, bir qatorlik rollback buyrug'ini chiqaradi.",
      check: {
        q: "Sayt kuniga bir necha marta deploy qilinsa, nega skriptlarni bir yilga keshlasa bo'ladi?",
        options: [
          "Brauzerlar skriptlar uchun uzun keshni e'tiborsiz qoldiradi",
          "Har deploy havolalarni ?v=<yangi sha> ga qayta yozadi, yangi reliz yangi URL",
          "Edge proksi keshni tozalaydi",
        ],
        answer: 1,
        why: "HTML har yuklanishda qayta tekshiriladi va `app.js?v=<sha>` ni ko'rsatadi. Yangi reliz shu query satrini o'zgartiradi, brauzer yangi faylni oladi; eski keshdagi nusxa esa boshqa hech qachon so'ralmaydi.",
      },
      fields: {
        "--porcelain": "Har qanday o'zgargan yoki kuzatilmagan fayl deploy'ni to'xtatadi.",
        "origin/main": "Hech qachon lokal branch yoki push qilinmagan commit emas.",
        "?v=": "Keshni yangilash: commit'ning birinchi 8 belgisi.",
        "site.prev": "Oldingi sayt bitta buyruqli rollback uchun diskda qoladi.",
        "version.txt": "Ochiq URL orqali tekshiriladi, edge ham, konteyner ham isbotlanadi.",
      },
    },
    demo: {
      short: "Demo",
      title: "Jonli demo va smoke test",
      body: "Keyingi pull request saytning istalgan pastki yo'lda ishlaydigan nusxasini qo'shdi, wonmor.io/demo/halvet/ dagi demo galereyasi uchun. Build faqat nusxaga kerak narsani o'zgartiradi: nisbiy til havolalari, kichik Demo belgisi va pochta ilovasini ochish o'rniga yuboriladigan xatni ko'rsatadigan forma.\n\nPlaywright o'sha nusxani uchala tilda ochadi va har bir bo'limni, kesim va chizmalar tablarini, galereya lightbox'ini, savollarni va formani aylanib chiqadi; o'sha vositalar README uchun 26 ta skrinshot yozadi. Reponing o'zida hali CI workflow yo'q: tekshiruvlar deploy skripti va shu smoke test.",
      fields: {
        "dist-demo": "Alohida chiqish papkasi; v1/ va deploy'ga tegilmaydi.",
        "Demo badge": "Demo mehmoni bu jonli studiya sayti emasligini biladi.",
        Playwright: "Yo'q bo'lim yoki konsol xatosida yiqiladigan brauzer testi.",
        "26 shots": "README uchun skrinshotlar, bitta buyruq bilan qayta yaratiladi.",
        "no CI workflow": "O'zgarishlarni CODEOWNERS ko'rib chiqadi; avtomatik tekshiruv keyingi qadam.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Auditoriyani bil: premium mehmonga sokin harakat, haqiqiy muhandislik va soxtasizlik kerak. 2) Build bosqichisiz statik sayt yetarli: bo'lim skriptlari, vendored kutubxonalar, lazy 3D modullar. 3) Har og'ir effektning zaxira zinapoyasi bor va u ma'lumot tejash hamda reduced motion'ni hurmat qiladi. 4) Performance dizayn chegarasi: yumshoq effekt 35% aniqlik va 30 fps da ishlay oladi, harakat transform va opacity bilan, suratlar har ekranga o'lchanadi. 5) Bir marta yoz, bo'laklab tarjima qil, birorta bo'lak yetishmasa deploy'ni to'xtat. 6) Qattiq CSP CSP yubormaydigan noutbuk serverida emas, jonli saytda tekshiriladi. 7) Faqat toza main'ni chiqar, keshni URL'dagi commit bilan yangila, rollback uchun oldingi saytni saqla va ochiq versiya faylini tekshir.",
    },
  },
  scenarios: {
    "csp-style": {
      label: "CSP stilni to'sdi",
      steps: {
        "style-blocked": {
          short: "To'sildi",
          title: "Lokal ishlagan bo'lim prodda sochilib ketadi",
          body: "1.3 versiya basseynning tuproqdan suvgacha sakkizta qatlami stekini qo'shdi. Har bir qatlam o'rnini inline `style=\"--i:3\"` atributidan olardi. Noutbukda mukammal edi. Jonli saytda qattiq CSP (`style-src 'self'`) har bir inline stilni rad etdi, hamma qatlam bir joyga tushdi, ro'yxat bandiga sichqoncha olib borilganda qatlam endi yonmasdi. Lokal Python server CSP yubormaydi, shuning uchun xato faqat prodda chiqishi mumkin edi.",
          check: {
            q: "Nega buni deploy'dan oldin hech kim ko'rmadi?",
            options: [
              "Brauzer keshi yashirdi",
              "Lokal server CSP sarlavhalarini yubormaydi; faqat prod Caddy yuboradi",
              "CSS fayl deploy qilinmagan edi",
            ],
            answer: 1,
            why: "CSP prod Caddyfile qo'shadigan javob sarlavhasi. Lokal statik server o'sha fayllarni usiz beradi, shuning uchun siyosat taqiqlagan har narsa lokal ishlayveradi.",
          },
          fields: {
            "style=": "Inline stil atributi: style-src 'self' aynan shuni taqiqlaydi.",
            "style-src": "Uni to'sgan direktiva; konsol uning nomini aytadi.",
            "same place": "--i siz har qatlamning siljishi bir xil.",
            "no CSP": "Test serveri va prod orasidagi farq.",
          },
        },
        "style-fix": {
          short: "nth-child",
          title: "Indeksni stil fayliga ko'chirish",
          body: "Tuzatish atributlarni HTML dan olib tashladi. Stil fayli har qatlamga `:nth-child` bilan indeks beradi, ro'yxat bandlarini qatlamlarga bog'laydigan skript esa `li.style` ni o'qish o'rniga indeksni ularning o'rnidan oladi. Skriptdan `style.setProperty` bilan xossa berish ham mumkin, chunki u atribut emas, CSSOM orqali o'tadi. Doimiy qoida: har deploy'dan keyin jonli saytni och va konsolni o'qi.",
          fields: {
            "nth-child": "O'ringa qarab stil: atribut yo'q, CSP to'sadigan narsa yo'q.",
            setProperty: "Ruxsat etilgan skriptdan CSSOM o'zgarishi inline stil hisoblanmaydi.",
            "live site": "Haqiqiy sarlavhalar ishlaydigan yagona joy.",
          },
        },
      },
    },
    "dirty-tree": {
      label: "Iflos daraxt",
      steps: {
        "tree-stop": {
          short: "To'xtadi",
          title: "Deploy rad etadi: papkada boshqa birovning fayllari",
          body: "Boshqa ish sessiyasi o'sha klonga tadqiqot papkalarini saqlab qo'ygan edi. Ular sayt qismi emas va hech kim ularni commit qilmoqchi emasdi, lekin `git status --porcelain` ularni ko'rsatdi va deploy skripti o'z o'zbekcha xabari bilan to'xtadi: commit qilinmagan o'zgarish bor. Serverga hech narsa yetmadi.",
          check: {
            q: "To'g'ri tuzatish qaysi?",
            options: [
              "deploy.sh dan porcelain tekshiruvini olib tashlash",
              "Tekshiruvni qoldirish va shu klonga o'sha papkalarni lokal e'tiborsiz qoldirishni aytish",
              "Tadqiqot papkalarini commit qilish",
            ],
            answer: 1,
            why: "Tekshiruv jonli sayt push qilingan commit'ga tengligini kafolatlaydi. Papkalar lokal shovqin, shuning uchun lokal chiqarib tashlanadi; commit qilish aloqasiz fayllarni nashr qilardi, tekshiruvni olib tashlash esa haqiqiy lokal tahrirlarni chiqarib yuborardi.",
          },
          fields: {
            "--porcelain": "Mashina o'qiydigan holat: har qanday qator to'xtash degani.",
            "sites/": "Boshqa sessiyadan qolgan kuzatilmagan papka.",
            "to'xtatildi": "Skriptning o'z xabari.",
            "nothing was shipped": "Xavfsizlik qoidasi kerakligidek yopiq tomonga yiqildi.",
          },
        },
        "tree-fix": {
          short: "Exclude",
          title: "Lokal e'tiborsiz qoldir, qoidani saqla",
          body: "Ikki papka `.git/info/exclude` ga qo'shildi: bu hech qachon commit qilinmaydigan, shu klonga xos ignore fayli. Boshqa sessiya o'z fayllarini saqlab qoladi, deploy yana toza daraxtni ko'radi, kuzatiladigan faylning har qanday o'zgarishi esa uni baribir to'xtatadi.",
          fields: {
            ".git/info/exclude": ".gitignore kabi, lekin bitta klonga xos va boshqalarga ko'rinmaydi.",
            "not weakened": "Faqat shu ikki kuzatilmagan papka e'tiborsiz; tekshiruvning o'zi o'zgarmagan.",
          },
        },
      },
    },
  },
};

export default text;
