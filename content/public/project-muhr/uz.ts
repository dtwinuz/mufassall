import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Muhr, ochiq vaqt isboti",
  summary:
    "Muhr Wonmor'ning ochiq kodli loyihasi. U fayl ma'lum kunda mavjud bo'lganini va o'shandan beri o'zgarmaganini isbotlaydi: SHA-256 qurilmangizda hisoblanadi, hash ochiq RFC 9162 Merkle jurnaliga tushadi, jurnal OpenTimestamps orqali Bitcoin'ga bog'lanadi. Tanga yo'q, birovning kalit yoki pulini saqlash yo'q. Loyiha reja bosqichida: bugun bosh sahifa, hash va Merkle matematikasi haqiqiy bo'lgan konsept demo hamda test, rollback va imzolangan relizli to'liq pipeline ishlaydi. Dars hammasini foydalanuvchi ekranidan deploy kalitigacha ko'rsatadi.",
  learn: [
    "Muhr nimani va'da qiladi va nimani hech qachon va'da qilmaydi: \"qachon\"ni, lekin \"kim\" yoki \"rost\"ni emas",
    "Kvitansiya: hash, jurnal indeksi, inclusion proof, daraxt ildizi va OpenTimestamps langari, uni Muhr'siz tekshirish",
    "RFC 9162 Merkle matematikasi: leaf va node prefikslari, bo'linish qoidasi, inclusion va consistency isbotlari",
    "Mahsulotdek qurilgan statik sayt pipeline'i: qattiq CSP, coverage darvozalari, forced-command deploy va atomar rollback, Sigstore provenance'li takrorlanuvchi relizlar, OpenSSF dalillari",
  ],
  nodes: {
    device: "Qurilmangiz",
    api: "Muhr API (reja)",
    log: "Merkle jurnal",
    ots: "OTS kalendarlar",
    btc: "Bitcoin",
    verifier: "Tekshiruvchi",
    site: "muhr-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    sent: "Fayldan qurilmani tark etgan bayt",
    proof: "Inclusion proof'dagi hashlar",
    trust: "Tekshirish uchun ishonish kerak bo'lganlar",
    rolled: "Orqaga qaytarilgan sog' relizlar",
    wrong: "Ekranda noto'g'ri hash",
    stuck: "\"o'qilmoqda...\" da qotib qolgan o'qishlar",
  },
  steps: {
    what: {
      short: "Nima",
      title: "Muhr: fayl uchun muhr va halol holat",
      body: "O'zbekistonda EIMZO imzosi hujjatni kim imzolaganini aytadi, lekin qachon imzolanganini ishonchli aytmaydi; soxta \"tekshiruv saytlari\" ham ma'lum muammo. Muhr Muhr'ga ishonmasdan ham tekshirsa bo'ladigan sana qo'shmoqchi: faylni hashlash, hashni ochiq jurnalga yozish, jurnalni Bitcoin'ga bog'lash. Rejadagi foydalanuvchilar: imzolangan shartnoma egalari, maqola mualliflari, relizlarini muhrlaydigan ochiq loyihalar.\n\n2026-11-19 holati: **reja bosqichi**. API, jurnal, CLI va bot hali yo'q. Jonli narsa muhr.wonmor.io, o'zbek, ingliz va rus tilida. U yerga fayl tashlasangiz, sahifa SHA-256 ni joyida hisoblaydi va kvitansiya qoralamasini chizadi; jurnal va langar maydonlarida `soon` turadi.",
      fields: {
        WebCrypto: "Brauzerning o'z kriptografiyasi. Toza JS zaxira varianti ham bor, ikkalasi node:crypto bilan solishtirib test qilingan.",
        muhr: "Kvitansiya format versiyasi. `0-draft` format hali o'zgarishi mumkinligini bildiradi.",
        hash: "Algoritm va qiymat. Serverga faqat shu 32 bayt yetib boradi.",
        log: "Hashning Merkle jurnaldagi o'rni. Hali qurilmagan, shuning uchun `soon`.",
        anchors: "Jurnal ildizi vaqtga bog'lanadigan joy. Keyinroq OpenTimestamps.",
        created_local: "Brauzerning o'z soati. Sahifa buni isbot emas deb belgilaydi.",
      },
    },
    stamp: {
      short: "Muhrlash",
      title: "Faylni muhrlash: 32 baytli so'rov va kvitansiya",
      body: "Konsept demo (wonmor.io/demo/muhr/) rejadagi oqimni to'qima ma'lumotda ko'rsatadi. Fayl tanlaysiz, u qurilmangizda hashlanadi va rejadagi `POST /stamp` ga faqat hash ketadi. API uni jurnal oxiriga qo'shadi va darhol kvitansiya qaytaradi: yozuv indeksi, daraxt o'lchami, daraxt ildizi (root) va hashingizni shu ildizga bog'laydigan inclusion proof.\n\nBu yerdagi kvitansiya haqiqiy matematika: repo'ning `demo/merkle.js` kodi bilan qurilgan 7 yozuvli jurnal, namuna shartnoma 5-indeksda, uchta qo'shni hash. Ildiz langarga yetmaguncha siz hali jurnal operatoriga ishonasiz: bitta tomon.",
      check: {
        q: "48 MB lik reliz o'rnatuvchisini muhrlaysiz. Muhr serveri nimani oladi?",
        options: [
          "Faylning o'zini, shifrlangan holda",
          "Faqat faylning 32 baytli SHA-256 hashini",
          "Avval fayl nomi va hajmini, keyin hashni",
        ],
        answer: 1,
        why: "Fayl qurilmadan chiqmaydi: yuklash xarajati yo'q, sizib chiqadigan va saqlanadigan narsa yo'q. Fayl nomi kvitansiyaga faqat foydalanuvchi xohlasa yoziladi. API aynan 32 bayt qabul qiladigan qilib rejalashtirilgan, bu suiiste'molni ham cheklaydi.",
      },
      fields: {
        hash: "So'rov olib boradigan yagona narsa.",
        origin: "Qaysi jurnal ekani. Tekshiruvchi kimning daraxt ildizlariga ishonishini bilishi kerak.",
        index: "Yozuvning faqat qo'shiladigan jurnaldagi o'rni.",
        tree_size: "Isbot qaysi o'lchamdagi daraxt ildiziga nisbatan ekani.",
        root: "Daraxt ildizi: 7 ta yozuvning hammasiga bog'langan bitta hash.",
        inclusion_proof: "Leaf'dan ildizgacha qo'shni hashlar. log2(7) yuqoriga yaxlitlansa 3.",
        ots: "OpenTimestamps isboti, base64. Bitcoin tasdiqlaganda kattalashadi.",
      },
    },
    states: {
      short: "Holatlar",
      title: "Kvitansiya yetiladi: navbatdan Bitcoin'gacha",
      body: "Kvitansiya darhol foydali, lekin Muhr'ga bog'liq bo'lmay qolishi uchun jurnal ildizi Bitcoin'ga yetishi kerak. Demo'dagi \"Kvitansiyalarim\" sahifasi buni har kvitansiya uchun kuzatadi: navbatda (soatlik paketni kutyapti), yuborildi, kalendarda, bitta kalendar javob bermasa qayta yuborildi, Bitcoin'da, va \"yangilash mumkin\": Bitcoin tasdiqlagan, lekin shu qurilmadagi `.ots` fayl hali faqat kalendar va'dasini saqlaydi.\n\nDemo'da kalendar va bloklar simulyatsiya; holatlar va ularning matni esa rejadagi mahsulotning o'zi.",
      fields: {
        queued: "Yozuv jurnalda; keyingi soatlik paket ildizi uni o'z ichiga oladi.",
        calendar: "Kalendar ildizni Bitcoin tranzaksiyasiga qo'yishni va'da qildi.",
        retry: "Uch kalendardan biri javob bermadi. Ikkitasi yetarli, uchinchisiga qayta yuboriladi.",
        bitcoin: "Ildiz blokda: sana endi Muhr'ga bog'liq emas.",
        upgrade: "To'liq .ots ni olib keling, kvitansiyada blokgacha butun yo'l bo'lsin.",
      },
    },
    verify: {
      short: "Tekshirish",
      title: "Muhr yo'qolsa ham istalgan odam tekshira oladi",
      body: "Tekshiruvchiga uch narsa kerak: fayl, kvitansiya va Bitcoin blok sarlavhalari. U hashni, leaf hashni qayta hisoblaydi, inclusion yo'li bo'ylab ildizgacha chiqadi va `.ots` dagi yo'lni ildizdan blok sarlavhasigacha tekshiradi. Muhr serveri ishtirok etmaydi, shuning uchun ishonish kerak bo'lgan tomonlar soni nolga tushadi: sana Bitcoin'ning proof of work'iga tayanadi.\n\nNamuna shartnomadagi bitta raqamni o'zgartiring (6 500 000 o'rniga 6 500 001 so'm), tekshiruv 1-qadamdayoq to'xtaydi: boshqa fayl, boshqa hash. Tekshiruvchi brauzerda, CLI va Telegram botda rejalashtirilgan.",
      check: {
        q: "Besh yildan keyin Muhr serverlari yo'q. Sud eksperti kvitansiyangizni tekshira oladimi?",
        options: [
          "Yo'q, jurnal so'rovga javob berishi shart",
          "Ha: fayl, kvitansiya, ochiq ots klienti va Bitcoin blok sarlavhalari bilan",
          "Faqat butun jurnal nusxasi saqlangan bo'lsa",
        ],
        answer: 1,
        why: "PLAN.md dagi asosiy maqsad aynan shu: \"bizsiz tekshirish\". Kvitansiyada inclusion proof va .ots yo'li bor, Bitcoin sarlavhalari ochiq. Jurnalning vazifasi muhrlashni arzon va tekshiriladigan qilish, abadiy so'roqqa javob berish emas.",
      },
      fields: {
        leaf: "0x00 prefiksi buni ichki node emas, leaf deb belgilaydi.",
        path: "Uchta qo'shni hash, indeks belgilagan tartibda qo'shiladi.",
        FAIL: "Bitta bayt o'zgardi, butunlay boshqa hash: tekshiruv shu yerda tugaydi.",
      },
    },
    tree: {
      short: "Merkle",
      title: "RFC 9162 matematikasi: bitta prefiks bayt va bo'linish qoidasi",
      body: "Jurnal Certificate Transparency v2 (RFC 9162) qoidasiga amal qiladi. Leaf `SHA-256(0x00 || entry)`, ichki node `SHA-256(0x01 || left || right)`. n ta leaf'li daraxt n dan kichik eng katta ikkining darajasida bo'linadi: 7 = 4 + 3, hech bir leaf ikki marta takrorlanmaydi.\n\nBundan ikki isbot chiqadi. Inclusion proof \"bu yozuv shu ildiz ostida\" deydi. Consistency proof \"4 o'lchamli ildiz 7 o'lchamlisining boshlanishi\" deydi: operator faqat qo'shgan, hech narsani qayta yozmagan. Demo istalgan ikki e'lon qilingan ildiz uchun ikkalasini hisoblaydi.",
      check: {
        q: "Nega hamma joyda oddiy SHA-256 emas, leaf 0x00 bilan, node 0x01 bilan hashlanadi?",
        options: [
          "Hashlash tezroq bo'ladi",
          "Ichki node (ikki bola hashining 64 bayti) hech qachon leaf sifatida ko'rsatilib, isbotdan o'ta olmasin",
          "Bitcoin shuni talab qiladi",
        ],
        answer: 1,
        why: "Domen ajratilmasa, hujumchi ikki bola hashini olib, ularni birlashmasini \"yozuv\" deb atab, hech kim muhrlamagan ma'lumotga haqiqiydek isbot oladi (second preimage hiylasi). Turli prefikslar leaf va node hashlarini boshqa-boshqa dunyoga ajratadi.",
      },
      fields: {
        "0x00": "Leaf prefiksi (domen ajratish).",
        "0x01": "Ichki node prefiksi.",
        split: "RFC 9162 qoidasi; toq o'lchamli daraxt oxirgi leaf'ni nusxalamaydi.",
        consistency: "Eski ildiz yangisining ichida ekanining isboti: faqat qo'shilgani tekshiriladi.",
      },
    },
    anchor: {
      short: "Langar",
      title: "Langar: ochiq kalendarlar, hech qachon o'z tangamiz emas",
      body: "Rejaga ko'ra har soatda jurnal ildizi kamida uchta ochiq OpenTimestamps kalendariga yuboriladi. Kalendar ko'p ildizni yig'ib, bitta Bitcoin tranzaksiyasiga bog'laydi va komissiyani o'zi to'laydi; bir necha soatdan keyin `.ots` faylni blok sarlavhasigacha yo'l bilan yangilash mumkin.\n\nO'z kalendarini yuritish BTC sotib olib saqlashni anglatadi, buni esa \"maqsad emas\" ro'yxati taqiqlaydi: token yo'q, custody yo'q, kripto to'lov yo'q. v1 da ildizlar ikkinchi, mustaqil jurnalga ham (Sigstore Rekor yoki boshqasi) yozilishi rejalashtirilgan, shunda bitta kalendar yoki zanjir yagona nosozlik nuqtasi bo'lmaydi.",
      check: {
        q: "Nega Muhr o'zining OpenTimestamps kalendarini yuritmaydi?",
        options: [
          "Kalendarlar yopiq kodli",
          "Komissiya to'lash uchun BTC sotib olib saqlash kerak bo'lardi, loyiha esa kripto-aktivlarni saqlashni butunlay rad etadi",
          "Bitcoin yangi kalendarga ruxsat bermaydi",
        ],
        answer: 1,
        why: "Kalendar Bitcoin komissiyasini to'laydi. Uchta ochiq kalendar xuddi shu isbotni Muhr tomonida bitta ham tangasiz beradi. Bu loyihani kripto-aktiv faoliyatidan uzoqda tutadi: PLAN.md da chizilgan huquqiy va obro' chizig'i.",
      },
      fields: {
        calendar: "Ildizlarni Bitcoin tranzaksiyalariga yig'adigan ochiq server.",
        upgrade: "Kalendar va'dasini blokgacha to'liq yo'l bilan almashtirish.",
        "no own calendar": "Kod yozilishidan oldin yozib qo'yilgan \"maqsad emas\".",
        Rekor: "Sigstore'ning ochiq shaffoflik jurnali: ildizlar uchun ikkinchi guvoh.",
      },
    },
    limits: {
      short: "Chegaralar",
      title: "Qachon, kim emas: chegaralar mahsulotning bir qismi",
      body: "Kvitansiya aynan shu baytlar blok vaqtidan kechikmay mavjud bo'lganini isbotlaydi. Uni kim yozgani, mazmuni rostligi yoki notarial sana isbotlanmaydi, va har kvitansiya hamda sahifa buni aytadi. Bu halollik talab sifatida yozilgan (assurance case'da R6), chunki ortiqcha talqin qilingan muhr zarar keltiradi.\n\nIkki alohida holat. Qisqa maxfiy matnni (g'oya, parolga o'xshash matn) hashidan taxmin qilish mumkin, shuning uchun rejadagi tuzli rejim `salt || data` ni hashlaydi va tuz foydalanuvchida qoladi. EIMZO bilan imzolangan `.p7s` imzochisi bilan ko'rsatiladi, lekin o'sha algoritmlar uchun ochiq tekshiruvchi topilmaguncha \"kriptografik tekshirilmadi\" deb belgilanadi.",
      fields: {
        proves: "Vaqtdan kechikmay mavjud bo'lganini. Muallif yoki rostlik haqida hech narsa.",
        not: "Har kvitansiyada yozilgan, hech kim uni ortiqcha qilib ko'rsatmasin.",
        salted: "Tasodifiy tuz qo'shiladi: hash endi taxmin qilinadigan matnni oshkor qilmaydi.",
        p7s: "PKCS#7 imzo fayli. MVP da ko'rsatiladi, lekin tekshirilgan deb da'vo qilinmaydi.",
      },
    },
    stack: {
      short: "Stek",
      title: "Rejadagi stek va har bo'lak sababi",
      body: "CLI Rust'da rejalashtirilgan va mavjud `ots` klientini alohida jarayon sifatida chaqiradi: LGPL kodi Apache-2.0 kodga hech qachon bog'lanmaydi. API .NET 10 va PostgreSQL; jurnalning DB roli UPDATE va DELETE huquqlaridan mahrum, ya'ni \"faqat qo'shish\" ilovadan pastda majburlanadi. Jurnal RFC 9162 formatida, kutubxona nomzodi Tessera (ochiq savol: Go'dagi Tessera yoki .NET'da o'z implementatsiyasi).\n\nTekshiruvchi oflayn ishlaydigan WebCrypto'li statik sahifa; bot oddiy Telegram bot, Mini App emas; kvitansiya formati CC BY 4.0 ostidagi alohida spetsifikatsiya, relizlarni GitHub Action (MIT) muhrlaydi. 8 haftalik MVP rejasi dogfooding'dan boshlanadi: bitg relizlari va wonmor.io maqolalarini muhrlash.",
      fields: {
        Rust: "Kichik va tez CLI; litsenziya tozaligi uchun ots alohida jarayonda.",
        PostgreSQL: "Jurnal; UPDATE va DELETE huquqi olib qo'yilib, faqat qo'shish majburlanadi.",
        Tessera: "Shaffoflik jurnali kutubxonasi nomzodi, hali ochiq savol.",
        WebCrypto: "Brauzerda hashlash: fayl qurilmadan chiqmaydi.",
        spec: "Ochiq, versiyalangan format: boshqa vositalar ham kvitansiyani o'qiy olsin.",
      },
    },
    site: {
      short: "Sayt",
      title: "Jonli sayt: qattiq CSP ostidagi statik fayllar",
      body: "Mahsulot hali qurilmagan, lekin bosh sahifa mahsulotdek muhandislik qilingan. `site/` oddiy HTML, CSS va uchta kichik skript, shriftlar o'zimizda: build qadami yo'q, cookie yo'q, analitika yo'q, uchinchi tomon so'rovi yo'q. Uni `muhr-site` konteyneridagi Caddy beradi, oldida TLS'ni tugatadigan dtwin.uz umumiy edge proksisi turadi.\n\nCSP `default-src 'self'`, `unsafe-inline` umuman yo'q, shuning uchun inyeksiya muvaffaqiyatli bo'lsa ham skript ishga tushmaydi. Fayl nomlari kontent hashi bilan yozilmagani uchun fayllar har safar qayta tekshiriladi (`no-cache`, arzon 304); shriftlar 30 kun keshlanadi.",
      fields: {
        "Content-Security-Policy": "Faqat saytning o'z skript, uslub, shrift va rasmlari; ramkaga olish taqiqlangan.",
        "Permissions-Policy": "Sahifa uchun kamera, mikrofon va joylashuv o'chirilgan.",
        "Cache-Control": "Har safar qayta tekshirish: yangi deploy darhol ko'rinadi.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: har pull request bir xil darvozalardan o'tadi",
      body: "`main` ga pull request'siz hech narsa tushmaydi; ruleset `build` va `dco` tekshiruvlarini, bitta approve va code owner'ni talab qiladi, bypass yo'q. `build` job Node 24 dagi bitta Ubuntu runner, har action commit SHA bilan qotirilgan.\n\nU `check-site` (singan havolalar, inline skript yoki uslub, uchinchi tomon manbalari, IP manzillar, tokenlar, maxfiy kalitlar), REUSE litsenziya tekshiruvi, nol ogohlantirishli ESLint, production CSP ostida unit va Chromium end-to-end testlar, birlashgan coverage darvozasi (har sayt skripti bo'yicha 90 % qator, 80 % tarmoq) va har demo ekranining smoke testini yurgizadi.",
      fields: {
        "check-site": "Bog'liqliksiz Node skript: CSP nimani bloklashi va nima hech qachon e'lon qilinmasligi kerakligi.",
        REUSE: "Har faylda mualliflik va litsenziya (SPDX) yozilgan, reuse lint tekshiradi.",
        lint: "ESLint; bitta ogohlantirish ham job'ni yiqitadi.",
        coverage: "Brauzer coverage'i unit coverage bilan birlashtirilib, CI'da darvoza qilingan.",
        dco: "Alohida workflow: har commit'da Signed-off-by qatori bo'lishi shart.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: faqat e'lon qila oladigan kalit va atomar almashtirish",
      body: "Saytga tegadigan `main` push'i `deploy.yml` ni ishga tushiradi: saytni tekshirish, commit SHA'sini `version.txt` ga yozish, `site/` va Caddyfile tarball'ini SSH orqali oqizish. Host kaliti qotirilgan. Serverda kalit `restrict,command=` bilan bitta skriptga bog'langan, shell ocholmaydi.\n\n`receive` `version.txt` SHA'ga mosligini tekshiradi, havola va maxsus fayllarni rad etadi, o'zgargan Caddyfile'ni validatsiya qiladi, relizni `releases/<sha>` ga ko'chiradi va `current` symlink'ini atomar almashtiradi: birorta so'rov tushib qolmaydi. Keyin CI `/version.txt` SHA'ni qaytarguncha kutadi, sahifalar, 404 va CSP sarlavhasini smoke-test qiladi, xato bo'lsa `rollback` chaqiradi.",
      check: {
        q: "CI deploy kaliti sizib chiqdi. Hujumchi u bilan nima qila oladi?",
        options: [
          "Serverda root shell oladi",
          "Shu saytning statik relizini e'lon qiladi yoki orqaga qaytaradi, boshqa hech narsa",
          "Docker konteynerlarini o'zgartiradi",
        ],
        answer: 1,
        why: "Forced command faqat `receive` ni yurgizadi, u esa deploy, rollback va status'ni qabul qiladi. docker-compose.yml va receiver'ning o'zi serverda boshqariladi (bootstrap admin ishi), ya'ni CI fayl e'lon qila oladi, konteynerni o'zgartira olmaydi. Saytni buzib ko'rsatish baribir mumkin, assurance case uni qoldiq xavf deb yozgan.",
      },
      fields: {
        DEPLOY_HOST: "Repo secret'i; hech qachon chop etilmaydi.",
        DEPLOY_SSH_KEY: "Repo secret'i; job'dan keyin runner'dan o'chiriladi.",
        restrict: "authorized_keys opsiyasi: shell yo'q, forwarding yo'q, faqat forced command.",
        receive: "Server tomonidagi skript: deploy <sha>, rollback, status. flock bilan qulflanadi.",
        "atomic swap": "ln + mv -T symlink'ni bir qadamda almashtiradi; Caddy berishda davom etadi.",
        verify: "Job muvaffaqiyatli bo'lishidan oldin jonli sayt push qilingan SHA'ni aytishi kerak.",
        smoke: "Almashtirishdan keyin ochiq domenga haqiqiy HTTP so'rovlar.",
        rollback: "current yana PREVIOUS ga qaraydi; diskda 5 ta reliz saqlanadi.",
      },
    },
    release: {
      short: "Reliz",
      title: "Relizlar: baytma-bayt bir xil, imzolangan provenance bilan",
      body: "`v*` tegi sayt arxivini ikki marta yig'adi: qat'iy tartib, mtime sifatida commit vaqti, raqamli egalar va `gzip -n`. Keyin ikkalasini baytma-bayt solishtiradi: build takrorlanmasa, reliz yiqiladi. Job `SHA256SUMS` yozadi va build provenance'ni GitHub attestations orqali Sigstore bilan imzolaydi.\n\nShundan keyin istalgan odam `muhr-site-0.1.0.tar.gz` ni aynan shu repo workflow'i qaysi commit'dan yig'ganini, yuklagan odamga ishonmasdan tekshira oladi. Reliz izohi CHANGELOG.md dan (Keep a Changelog formati) kesib olinadi.",
      fields: {
        "byte-identical": "Ikki build, bitta cmp: arxiv faqat commit'ga bog'liq.",
        SHA256SUMS: "Oddiy yuklab olish tekshiruvi uchun checksum'lar.",
        Sigstore: "Workflow kimligiga bog'langan kalitsiz imzo.",
        attestation: "gh attestation verify faylni kim va nimadan yig'ganini tekshiradi.",
      },
    },
    openssf: {
      short: "OpenSSF",
      title: "Koddan tashqaridagi dalillar: OpenSSF va boshqalar",
      body: "OpenSSF Scorecard har dushanba va `main` da ishlaydi va natijani README nishoni uchun e'lon qiladi. Loyiha OpenSSF Best Practices nishoniga ega (16668-loyiha): avval passing, GOVERNANCE.md ikki mustaqil egani (asoschi va texnik maintainer) nomlagach silver. Gold uchun bittadan katta bus factor va haqiqiy tashqi hissa qo'shuvchilar kerak, loyiha buni hali da'vo qilmaydi.\n\nAtrofida: CodeQL va secret scanning, oylik guruhlangan Dependabot yangilanishlari, qatorma-qator ko'rikli xavfsizlik assurance case'i, Mozilla Observatory A+ va SSL Labs A+, yangi kelganlar uchun good first issue'lar.",
      fields: {
        scorecard: "Avtomatik ta'minot zanjiri tekshiruvlari: qotirilgan action'lar, branch himoyasi, token huquqlari.",
        bestpractices: "O'zi to'ldiradigan, lekin ochiq so'rovnoma; silver uchun kirish uzluksizligi kerak.",
        dependabot: "Faqat dev bog'liqliklar: saytning o'zida bog'liqlik yo'q.",
        headers: "HTTP sarlavhalari va TLS sozlamasini baholovchi tashqi xizmatlar.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Muhr fayl qachon mavjud bo'lganini isbotlaydi, kim yozgani yoki rostligini emas, va buni har kvitansiyada aytadi. 2) Qurilmadan faqat 32 baytli hash chiqadi. 3) RFC 9162 jurnali inclusion va consistency isbotlarini beradi; 0x00 va 0x01 prefikslari node'ning leaf bo'lib ko'rinishiga yo'l qo'ymaydi. 4) Ildizlar uchta ochiq OpenTimestamps kalendari orqali Bitcoin'ga tushadi: tanga yo'q, custody yo'q. 5) Kvitansiya fayl, kvitansiya va blok sarlavhalari bilan Muhr'siz tekshiriladi. 6) Jonli sayt allaqachon mahsulotdek chiqariladi: qattiq CSP, coverage darvozali CI, forced-command deploy, atomar almashtirish, tekshiruv va rollback, Sigstore provenance'li takrorlanuvchi relizlar, OpenSSF silver. 7) Holat halol aytiladi: reja bosqichi, matematikasi haqiqiy konsept demo bilan.",
    },
  },
  scenarios: {
    "smoke-flake": {
      label: "Beqaror smoke",
      steps: {
        "flake-hit": {
          short: "Rollback",
          title: "Sog' reliz ikki marta orqaga qaytarildi",
          body: "2026-11-14 da ketma-ket ikki deploy smoke testdan yiqildi. Birinchi sahifa 200 qaytardi, keyingi so'rov runner tomonida uzildi: curl exit 35 (TLS handshake), keyin exit 56 (ulanish uzildi). Smoke testda qayta urinish ham, timeout ham yo'q edi, shuning uchun workflow bitta uzilishni buzilgan sayt deb tushundi va avtomatik rollback qildi.\n\nSayt sog' edi: o'sha paytda serverga to'g'ridan-to'g'ri so'rovlar besh martadan besh marta taxminan 0.02 s da 200 qaytargan.",
          check: {
            q: "Rollback aynan loyihalangandek ishladi. Aslida nima noto'g'ri edi?",
            options: [
              "Yangi reliz buzuq edi",
              "Tekshiruv: runner'dagi bitta vaqtinchalik tarmoq xatosi sayt nosozligi deb o'qildi",
              "Atomar almashtirish",
            ],
            answer: 1,
            why: "Deploy'dan keyingi tekshiruv \"sayt buzildi\" ni \"mening tarmog'im qaltiradi\" dan ajrata olishi kerak. Qayta urinishsiz har bir runner uzilishi rollback va qayta yurgizishga tushadi.",
          },
          fields: {
            "exit 35": "curl TLS handshake'ni tugata olmadi.",
            "exit 56": "curl ma'lumot qabul qilayotganda xato berdi.",
            rollback: "Muvaffaqiyatli ship'dan keyin smoke qadami yiqilgani uchun ishga tushdi.",
            "5 of 5": "Server sog' ekanining isboti: nosozlik yo'lda edi, saytda emas.",
          },
        },
        "flake-fix": {
          short: "Retry",
          title: "Vaqtinchalik xatoni qayta urin, haqiqiy javobni saqla",
          body: "PR #10 har smoke va versiya so'roviga `--retry 4 --retry-all-errors --retry-delay 3`, 10 s ulanish timeout'i va har urinishga 30 s chegara berdi. Haqiqiy uzilish qayta urinishlardan keyin baribir yiqiladi, bir lahzalik qaltirash esa endi yiqitmaydi.\n\n404 tekshiruvi `-f` siz qoldi: u yerda 404 kutilgan javob, qayta urinadigan xato emas. Xuddi shu tuzatish pipeline'ni bo'lishadigan Sanad va Shaffof'ga ham ketdi. Agar run baribir tarmoqdan yiqilsa, `gh run rerun` yetarli.",
          fields: {
            "--retry-all-errors": "Faqat HTTP 5xx emas, ulanish xatolarida ham qayta urinish.",
            "--max-time": "Har urinish chegaralangan, osilib qolish job'ni to'xtatmaydi.",
            "404": "Kutilgan status natija: qayta urinilmaydi va e'tiborsiz qolmaydi.",
          },
        },
      },
    },
    "stale-read": {
      label: "Ikki fayl tez",
      steps: {
        race: {
          short: "Poyga",
          title: "Sahifa boshqa faylning hashini ko'rsatadi",
          body: "2026-11-14 dagi qatorma-qator xavfsizlik ko'rigi F5 topilmasini topdi. Katta faylni, keyin darhol kichigini tanlang: kichigi birinchi hashlanib ko'rsatiladi, keyin kattasi tugab ekranni ustidan yozadi. Sahifa endi foydalanuvchi tanlamagan faylning hashini ko'rsatadi.\n\nButun va'dasi \"bu hash shu fayl\" bo'lgan vosita uchun ekrandagi noto'g'ri hash yaxlitlik xatosi (R2 talabi), hujumchi bo'lmasa ham.",
          fields: {
            F5: "Jiddiyligi past, lekin mahsulotning asosiy da'vosiga tegadi.",
            overwrites: "Sekinroq, eskiroq o'qish oxirida tugaydi va yutadi.",
          },
        },
        "race-fix": {
          short: "Ketma-ketlik",
          title: "Har o'qishga raqam ber, eskisini tashla",
          body: "Har hashlash hisoblagichdan raqam oladi. Tugaganda o'z raqamini joriy raqam bilan solishtiradi; yangiroq hisob boshlangan bo'lsa, natija tashlab yuboriladi. Ekranga faqat oxirgi tanlov chiqadi.\n\nEndi end-to-end test ikki faylni tez tanlaydi va ikkinchi hash yutishini tasdiqlaydi. O'sha ko'rik sayt skriptlaridagi har `innerHTML` ni ham `textContent` ga almashtirdi.",
          fields: {
            "sequence number": "Barcha o'qishlar uchun umumiy hisoblagich: eng yangisi yutadi.",
            stale: "Foydalanuvchi allaqachon almashtirgan kirish uchun natija.",
          },
        },
      },
    },
    "read-fail": {
      label: "O'qib bo'lmaydigan fayl",
      steps: {
        "stuck-hit": {
          short: "Qotish",
          title: "O'qib bo'lmaydigan fayl sahifani abadiy kuttirib qo'yardi",
          body: "O'sha ko'rikning F4 topilmasi: sahifa tanlangan faylni `arrayBuffer()` bilan o'qir va faqat muvaffaqiyatni qayta ishlardi. Brauzer uni o'qiy olmasa, masalan fayl tanlangandan keyin ko'chirilgan yoki ruxsat yo'qolgan bo'lsa, promise ishlovchisiz rad etilardi.\n\nKonsolga ushlanmagan rad etish tushardi, yorliq esa hech qanday xato belgisisiz \"o'qilmoqda...\" da qolardi. Foydalanuvchi kutaverishi yoki oldingi kirishdan qolgan hashga ishonishi mumkin edi.",
          fields: {
            "F4": "Past daraja, mustahkamlik: noto'g'ri natija yo'q, lekin jim xato.",
            "unhandled promise rejection": "Hech kim ushlamagan xato: faqat dasturchi vositalarida ko'rinadi.",
            "forever": "Taymaut ham, xato xabari ham yo'q.",
          },
        },
        "stuck-fix": {
          short: "Tuzatish",
          title: "Xato yo'li nima bo'lganini sahifa tilida aytadi",
          body: "O'qish endi rad etish ishlovchisiga ega. U poyga tuzatishidagi o'sha tartib raqamini tekshiradi, shuning uchun eski o'qishning xatosi yangisini bosib keta olmaydi, keyin o'zbek, rus yoki ingliz tilida \"faylni o'qib bo'lmadi\" deb ko'rsatadi.\n\nEnd-to-end test `arrayBuffer()` ni ataylab rad ettiradi va uch narsani tasdiqlaydi: xabar chiqadi, oldingi matn hashi qoladi, konsolda xato yo'q.",
          fields: {
            "readFail": "UI satri kaliti; har tilning o'z matni bor.",
            "could not read the file": "Foydalanuvchi cheksiz \"o'qilmoqda...\" o'rniga ko'radigan narsa (inglizcha sahifada).",
            "console errors": "e2e test faqat noto'g'ri matnda emas, konsoldagi har xatoda yiqiladi.",
          },
        },
      },
    },
  },
};

export default text;
