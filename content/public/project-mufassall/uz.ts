import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: mufassall",
  summary:
    "mufassall (github.com/dtwinuz/mufassall, mufassall.dtwin.uz) siz o'qib turgan kursning o'zi: tizim dizayni harakatlanuvchi sahnalar, simdagi haqiqiy so'rov va har keyingi qadamdan oldin savol bilan, o'zbek, rus va ingliz tillarida o'rgatiladi. Repo 2026-yil 17-noyabrda boshlangan va ikki kunda 82 dars va 1 711 test bilan Round 11 ga yetgan. Bu dars uni boshqa tizimlarni ko'rsatgandek ko'rsatadi: o'quvchi nima oladi, dars qanday saqlanadi va o'ynaladi, statik sayt va bitta kichik API, va uni xavfsiz ushlab turadigan pipeline'lar: leak-guard'li CI, hash asosidagi CSP va faqat papkani almashtira oladigan, o'zini o'zi orqaga qaytaradigan deploy.",
  learn: [
    "O'quvchi tomoni: darslar, Lab, takrorlash, bo'lim testlari va o'z tizimlaringiz, hammasi akkauntsiz, brauzeringizda saqlanadi",
    "Dars bu ma'lumot: patch'lardan iborat TypeScript sahna, kompilyator tekshiradigan uchta matn fayli va istalganini o'ynaydigan dvigatel",
    "Statik Astro sayt va bog'liqliksiz bitta Node API, skript hash'lari qurishda hisoblanadigan qat'iy CSP ortida",
    "Sizib chiqishni rad etadigan CI va bitta ish qila oladigan deploy kaliti: relizni ochish, symlink'ni almashtirish, smoke test yiqilsa orqaga qaytarish",
  ],
  nodes: {
    reader: "O'quvchi",
    browser: "Brauzer",
    edge: "Edge proksi",
    site: "Statik sayt",
    local: "localStorage",
    repo: "GitHub repo",
    ci: "GitHub Actions",
    api: "mufassall-api",
    tg: "Telegram",
    agents: "Agentlar raundi",
  },
  metrics: {
    lessons: "Darslar",
    tests: "Testlar",
    js: "Dars sahifasidagi JavaScript (gzip)",
    alerts: "Ochiq CodeQL ogohlantirishlari",
    leaks: "Qurilmada topilgan sizib chiqishlar",
    cls: "Sahifa siljishi (CLS)",
  },
  steps: {
    setup: {
      short: "Bu nima",
      title: "Tizimlarni harakatda ko'rsatadigan kurs",
      body: "Tizim dizayni bo'yicha materiallarning ko'pi to'rtburchakli sxema va bir sahifa matn. Bu yerda har dars sahna: klient, servis, navbat va bazalar uchun bloklar, chiziqlar bo'ylab yuradigan paketlar, nimadir buzilganda qizaradigan metrika plitkalari va tanlangan chiziqdan o'tadigan aynan o'sha so'rov. Keyingi qadamdan oldin o'quvchi nima bo'lishini taxmin qiladi.\n\nKim uchun: real tizimlar o'zini qanday tutishini tushunmoqchi bo'lgan dasturchilar, testerlar, analitiklar va team lead'lar, birinchi navbatda o'zbek tilida, rus va ingliz tillari teng. Hammasi bepul va ochiq; ro'yxatdan o'tish yo'q. Kurs xaritasida 11 bo'limda 82 dars bor: asoslar va masshtablashdan biznes tizimlari va real holatlargacha.",
      watch: "Plitkalardagi raqamlar repo va uning pull request'laridan: Round 11 dagi darslar va testlar, Round 2 dan beri dars sahifasi og'irligi, oxirgi o'lchangan CodeQL ogohlantirishlari va sahifa siljishi.",
      fields: {
        "82 lessons": "Round 11 dan keyin main'dagi darslar (2026-yil 19-noyabr); Round 10 da 78 ta edi.",
        "/uz/l/callbacks/": "Har darsning har tilda o'z URL'i bor; ?step=N kerakli qadamni ochadi.",
        "/uz/lab/": "Yuk simulyatsiyali sxema muharriri: barqaror holat va seed'li vaqt bo'yicha yurgizish.",
        "/uz/review/": "O'quvchi ko'rgan savollar jadval bo'yicha qaytib keladi.",
        "70 %": "10 savolli bo'lim testidan o'tish chegarasi.",
        "/uz/me/": "Progress ko'rinishi, faylga eksport va boshqa qurilma uchun ko'chirish kodi.",
        "/uz/author/": "Dars muharriri va o'z tizimlaringiz kutubxonasi.",
      },
    },
    lesson: {
      short: "Dars",
      title: "Bitta qadam: sahna, metrikalar, sim va savol",
      body: "Qadamning turi bor: muammo paydo bo'ladi, tuzatish keladi, holat ko'rsatiladi yoki dars xulosalanadi. Player sahnani chizadi va oxirgi qadamdan beri nima o'zgarganini aytadi: yangi blok, qizargan chiziq, o'zgargan metrika. Uning ostida sim paneli tanlangan chiziqdagi haqiqiy xabarni chiqaradi, raqamlangan maydonlar oddiy so'z bilan tushuntiriladi.\n\nSavol javobdan oldin keladi. Ba'zi darslarda ssenariy almashtirgich (o'sha tizim, boshqa yakun: provayder kechikadi, navbat to'ladi) va natijani kichik modeldan qayta hisoblaydigan \"agar shunday bo'lsa-chi\" slayderlari bor.",
      fields: {
        isometric: "13 ga 13 to'rdagi bloklar, SVG'da chiziladi; canvas ham, WebGL ham yo'q.",
        "what changed": "Ikki qadam sahnasi orasidagi diff(), o'quvchi faqat yangi qismni ko'radi.",
        metrics: "Darsga oltitagacha plitka, har biri yuqorisi yoki pasti yaxshi ekanini biladi.",
        wire: "HTTP, JSON, XML yoki oddiy matn; belgilangan bo'laklar raqamli izoh oladi.",
        check: "Bashorat savoli; birinchi javob takrorlash uchun eslab qolinadi.",
        scenario: "Tanlangan qadamdan boshlanadigan muqobil tarmoq.",
        "what-if": "Bir nechta darsdagi slayderlar, brauzerda qayta hisoblanadi.",
      },
    },
    practice: {
      short: "Progress",
      title: "Akkauntsiz progress",
      body: "Kurs o'quvchi haqida serverda hech narsa saqlamaydi. Progress, har savolga birinchi javob, takrorlash jadvali, bo'lim testi natijalari va o'qigan kunlaringiz localStorage'da `mufassall:` prefiksi ostida turadi. Takrorlash FSRS-5 ni ishlatadi, bu ochiq spaced-repetition rejalashtiruvchisi: har kartada barqarorlik va qiyinlik bor, keyingi sana o'quvchi uni unutishi ehtimoli katta bo'lgan kun.\n\nAkkaunt yo'qligining narxi: brauzer yo'qolsa, progress ham yo'qoladi. /me buni yopadi: bitta faylga yoki qisqa ko'chirish kodiga eksport qiladi va har kalit bo'yicha qat'iy birlashtirish bilan import qiladi (keyin takrorlangan karta yutadi, yuqori test bali yutadi).",
      fields: {
        progress: "Har darsda yetilgan eng uzoq qadam.",
        checks: "Har bashorat savoliga birinchi javob: to'g'ri yoki xato.",
        "FSRS-5": "Free Spaced Repetition Scheduler, e'lon qilingan standart parametrlari bilan.",
        tests: "Eng yaxshi bo'lim testi bali va unga erishilgan sana.",
        streak: "Biror o'qish bo'lgan kunlar, ketma-ketlik va kunlik maqsad uchun.",
        "no account": "Sizib chiqadigan narsa ham, tiklanadigan parol ham yo'q; qurilma almashtirish bu fayl yoki kod.",
      },
    },
    author: {
      short: "Tizimlarim",
      title: "O'z tizimlaringiz, dars kabi o'ynaladi",
      body: "/author bu dars muharriri: qadamlar, bloklar, chiziqlar, uch tildagi matnlar, har qadamga so'rov, jonli ogohlantirishlar va preview. Round 11 dan beri u /my/ ostida kutubxona saqlaydi: ko'p tizim, har biri bo'sh holda, BPMN fayldan, GitLab CI yoki GitHub Actions YAML'dan, Mermaid'dan yoki mavjud darsdan yaratiladi. /my/view/ uni haqiqiy dars player'ida o'ynaydi.\n\nBu kompaniya tizimlari uchun mo'ljallangan, shuning uchun qoida qat'iy: hammasi brauzerda qoladi. Ulashish bu odam o'zi saqlaydigan `.mufassall.json` fayli (50 tizimgacha, 5 MB) yoki siqilgan mazmuni hash'dan keyin turadigan va serverga hech qachon bormaydigan `#s=` havolasi. Ko'rilgan tizimlar noindex bilan belgilanadi va fikr formasi ko'rsatilmaydi.",
      fields: {
        format: "Qat'iy belgi; boshqa format'li fayl rad etiladi.",
        v: "Format versiyasi, keyingi o'zgarish eski fayllarni ham o'qiy olishi uchun.",
        systems: "50 tagacha yozuv; ortig'i o'tkazib yuboriladi, buzuqlari tashlanadi va sanaladi.",
        source: "Qayerdan kelgani: blank, bpmn, gitlab-ci, github-actions, mermaid, file, lesson yoki link.",
        draft: "Tahrirlanadigan dars: qadamlar, sahna patch'lari, matnlar. Importda tozalanadi.",
      },
    },
    schema: {
      short: "Format",
      title: "Dars bu tipli sahna va uchta matn fayli",
      body: "Har dars papka: sahnali `lesson.ts` va so'zli `uz.ts`, `ru.ts`, `en.ts`. Qadam faqat o'zgaradigan narsani yozadi; `resolve()` patch'larni har qadam uchun to'liq sahnaga yig'adi, `diff()` esa player'ga nima yangi ekanini aytadi. Sahnada matn yo'q, matn fayllarida joylashuv yo'q, shuning uchun tarjimon va muallif bir-biriga xalaqit bermaydi.\n\nMatn tipi sahnadan chiqariladi: istalgan tilda tugun nomi, qadam sarlavhasi yoki maydon izohi yetishmasa, bu kompilyatsiya xatosi. zod bilan validatsiya alohida subpath'da, shuning uchun testlar va qurishda ishlaydi, lekin o'quvchiga yuborilmaydi. Keyin testlar joylashuvni tekshiradi: bir katakda ikki blok yo'q, boshqa blok yorlig'i ustidan chiziq o'tmaydi, har belgilangan bo'lak o'z xabarida bor.",
      fields: {
        defineLesson: "const generic'li identity funksiya: id'larni matnlar uchun literal tip sifatida saqlaydi.",
        "only what changes": "To'liq sahna emas, patch'lar; qadam blok va chiziq qo'sha, o'zgartira yoki olib tashlay oladi.",
        "resolve()": "Patch ro'yxatini har qadam uchun bitta to'liq sahnaga aylantiradi.",
        "diff()": "Ikki sahnani solishtiradi va player ajratib ko'rsatadigan o'zgarishlarni qaytaradi.",
        "./validate": "zod sxemasi shu yerda, brauzer bundle'idan tashqarida.",
        LessonText: "uz.ts, ru.ts va en.ts tipi, lesson.ts dan hisoblanadi.",
      },
    },
    engine: {
      short: "Dvigatel",
      title: "Player ataylab kichik",
      body: "`packages/scene-engine` React komponentlari sifatida yozilgan, lekin compat alias'lar orqali Preact bo'lib yuboriladi; Round 2 shu yo'l bilan dars sahifasini taxminan 135 KB JavaScript'dan taxminan 24 KB gzip ga tushirdi, harakat CSS'da. Sahna 2:1 izometrik to'rdagi SVG. Sim paneli belgilangan bo'laklarni regular expression bilan emas, qo'lda yozilgan chiziqli skanerlar bilan topadi: CodeQL backtracking pattern'ni belgilagandan keyin shunday qilindi.\n\nLab'da ikkita model bor: barqaror holat modeli (yuklanish = kelish tezligi / sig'im) va Round 10 dan beri spike paytida navbat to'lib, keyin bo'shashini ko'rsatadigan seed'li diskret-hodisa simulyatsiyasi. Og'ir narsalar faqat o'quvchi so'raganda yuklanadi: video yozuvchi, CI importi uchun YAML parser.",
      fields: {
        Preact: "React API, hajmi taxminan o'n barobar kichik; pnpm uni topishi uchun absolyut alias'lar kerak bo'ldi.",
        "no animation library": "CSS'dagi transition'lar va kichik tween; eski harakat kutubxonasi olib tashlandi.",
        "2:1 isometric": "Bitta to'r birligi ekranda 64 ga 32 piksel.",
        "linear scanners": "Matndan bir marta o'tish, hech qanday kirish uni sekinlashtira olmaydi (polynomial ReDoS).",
        "des.ts": "Seed'li diskret-hodisa simulyatsiyasi: bir xil kirish bir xil grafik beradi.",
        "dynamic import()": "Ko'pchilik o'quvchi ishlatmaydigan kod birinchi yuklashga kirmaydi.",
      },
    },
    site: {
      short: "Sayt",
      title: "Astro har sahifani oldindan quradi",
      body: "Sayt `output: static` dagi Astro. `pnpm gen` to'rttala fayli bor papkalardan dars registrini yozadi, keyin har dars va til uchun bitta sahifa quriladi, ulashish rasmi, qidiruv va takrorlash indekslari, bo'lim test banklari va oflayn ish uchun service worker bilan. So'rov paytida hech narsa render qilinmaydi.\n\nPostbuild qadami statik xosting qila olmaydigan ikki ishni bajaradi: sitemap yozadi va har inline skriptning sha256 ini hisoblab, Caddyfile'dagi Content-Security-Policy ga qo'yadi. Sahifaga qo'shilgan inline skriptga keyingi qurish o'zi ruxsat beradi, boshqa birov kiritgan skriptga esa yo'q.",
      fields: {
        "pnpm gen": "content/registry.ts ni yaratadi; chala yozilgan dars papkasi o'tkazib yuboriladi.",
        "astro build": "/uz/, /ru/ va /en/ ostidagi sahifalar, oxirida slash bilan.",
        "og images": "Har darsga 1200x630 ulashish kartasi, darsning o'z ma'lumotidan chiziladi.",
        "search.json": "Brauzer yuklab oladigan statik indekslar; qidiruv serveri yo'q.",
        "sw.js": "Service worker: darslar, Lab, lug'at va takrorlash oflayn ishlayveradi.",
        "564 pages": "Round 11 dagi sitemap hajmi.",
        "inline script hashes": "tools/postbuild.mjs Caddyfile'dagi CSP o'rnini to'ldiradi.",
      },
    },
    api: {
      short: "API",
      title: "Bog'liqliksiz bitta kichik API",
      body: "Kursga bir nechta dinamik narsa kerak: \"bu qadam tushunarsiz\" fikri, Lab sxemalarining ochiq galereyasi va obunachilarga kuniga bitta savol kartasini yuboradigan Telegram bot. Ular bitta Node 22 jarayonida, `mufassall-api`, nol npm bog'liqlik bilan. U JSON fayllar saqlaydi, IP manzillarni hech qachon saqlamaydi, faqat ma'lum maydonlarni qat'iy limitlar bilan qabul qiladi.\n\nU alohida konteynerda ishlaydi: faqat o'qiladigan fayl tizimi, barcha Linux capability'lari olib tashlangan, 128 MB xotira, root bo'lmagan foydalanuvchi va health check. Sayt Caddy'si unga faqat `/api/*` ni, 16 KB gacha tana bilan uzatadi. Xato deb belgilangan fikr maintainer Telegram'iga yuboriladi.",
      watch: "CI bu konteynerga tegmaydi: CI faqat statik fayllarni chiqaradi. API'ni maintainer alohida bootstrap buyrug'i bilan yangilaydi.",
      fields: {
        lesson: "Dars slug'i, id pattern'iga tekshiriladi.",
        step: "Dars ichidagi qadam id'si.",
        kind: "unclear, error yoki good; boshqasi rad etiladi.",
        text: "Ixtiyoriy, 500 belgigacha.",
        "204 No Content": "Qabul qilindi, qaytaradigan narsa yo'q. Bitta klientga 10 daqiqada 20 ta fikr.",
      },
    },
    security: {
      short: "Sarlavhalar",
      title: "unsafe-inline'siz qat'iy CSP",
      body: "Har javob sayt Caddyfile'idan bir xil sarlavhalarni oladi. Content-Security-Policy skriptlarga faqat saytning o'zidan va hash'ini qurish hisoblagan aynan o'sha inline skriptlardan ruxsat beradi; `unsafe-inline` yo'q, eval yo'q, uchinchi tomon skripti yo'q, frame'ga olish yo'q. Sahifalar har tashrifda qayta tekshiriladi, `/_astro/` ostidagi hash'li fayllar esa bir yilga immutable keshlanadi.\n\nBu qaror ortidagi saboq oddiy: statik saytda o'g'irlanadigan login yo'q, lekin undan ishonchli domenda birovning skriptini yurgizish uchun foydalanish mumkin. Hash'lar ruxsat ro'yxatini aniq va avtomatik qiladi.",
      check: {
        q: "Yangi sahifa kichik inline skript qo'shdi. Shu CSP bilan keyingi deployda nima bo'ladi?",
        options: [
          "Kimdir Caddyfile'ni qo'lda tahrirlamaguncha brauzer uni bloklaydi",
          "Qurish uni hash qiladi va hash'ni CSP ga qo'shadi, shuning uchun ishlaydi; keyin kiritilgan skriptning hash'i yo'q va bloklanadi",
          "Bir domendagi inline skriptlar uchun CSP e'tiborga olinmaydi",
        ],
        answer: 1,
        why: "postbuild qurilgan HTML'dagi har inline skriptning sha256 ini hisoblab, ro'yxatni script-src ga yozadi. Ruxsat ro'yxati kod ortidan avtomatik yuradi, repo qurmagan har narsa bloklangan qoladi.",
      },
      fields: {
        "Content-Security-Policy": "script-src 'self' va qurish vaqtidagi sha256 hash'lar; frame-ancestors 'none'.",
        "Cache-Control": "Sahifalar uchun no-cache; hash'li /_astro/ fayllar uchun immutable.",
        "X-Content-Type-Options": "nosniff: brauzer fayl turini taxmin qilmaydi.",
        "Cross-Origin-Opener-Policy": "same-origin: boshqa saytlar bu oynaga havola ushlab turolmaydi.",
      },
    },
    ci: {
      short: "CI",
      title: "Har o'zgarish nimadan o'tishi kerak",
      body: "Har pull request va main'ga har push bir xil pipeline'ni yurgizadi: lockfile'dan o'rnatish, har paketni typecheck (u har darsning matnlarini sahnasiga qarab ham tekshiradi), vitest to'plami, API'ning node testlari, i18n tekshiruvi, qurish va leak-guard. Action'lar commit SHA bilan qotirilgan, Dependabot oyiga bir marta 7 kunlik kutish bilan yangilanish taklif qiladi, CodeQL kodni skanerlaydi.\n\nleak-guard manbani emas, qurilgan saytni o'qiydi: xususiy IP diapazonlari, portli IP, connection string'lar, maxfiy kalitlar, tokenlar, bearer sarlavhalar va ichki daraja belgilari qurishni yiqitadi. Repo sirlaridan biri ochiq repoda yozib bo'lmaydigan xususiy pattern'larni (kompaniya nomlari, hostlar) qo'shadi.",
      fields: {
        "--frozen-lockfile": "Lockfile haqiqat; CI hech qachon yangi versiya tanlamaydi.",
        typecheck: "Barcha paketlar bo'yicha tsc; yetishmagan tarjima bu tip xatosi.",
        "1711": "Round 11 da main'dagi vitest testlari (Round 10 da 1 504).",
        "check:i18n": "Har UI kaliti uch tilda; uz va en da kirill bo'lmasligi kerak.",
        "check:leaks": "apps/web/dist bo'yicha tools/leak-guard.mjs.",
        CodeQL: "Standart sozlama; u ikki polynomial-ReDoS pattern'ni ushladi, ular oddiy sikl bilan almashtirildi.",
        "pinned by SHA": "Ko'chirilgan teg CI'da nima ishlashini o'zgartira olmaydi.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Faqat relizni qabul qila oladigan kalit",
      body: "main'dagi CI'dan keyin deploy.yml saytni quradi, commit'ni `version.txt` ga yozadi va SSH orqali bitta arxivni oqim bilan yuboradi. Serverda bu kalit `authorized_keys` orqali bitta dasturga, `receive` ga bog'langan: u shell ocholmaydi va boshqa hech narsa yurgizolmaydi. receive qulf oladi, arxivni 300 MB bilan cheklaydi, version.txt commit'ga mosligini tekshiradi, havola va maxsus fayllarni rad etadi, `releases/<sha>` ga ochadi va `current` symlink'ini atomik almashtiradi. O'zgargan Caddyfile avval tekshiriladi, reload yiqilsa qaytarib almashtiriladi.\n\nKeyin CI tashqaridan tekshiradi: ochiq `version.txt` yangi commit'ni ko'rsatishi, 64 URL 200 qaytarishi, noma'lum sahifa 404 berishi va CSP sarlavhasi bo'lishi kerak. Biror narsa yiqilsa, CI `rollback` ni chaqiradi va oldingi reliz yana jonli bo'ladi.",
      check: {
        q: "Nega deploy kaliti CI'ga oddiy SSH login berish o'rniga `restrict,command=` bilan receive ga bog'langan?",
        options: [
          "Yuklash tezroq bo'ladi",
          "O'g'irlangan CI siri shunda faqat bitta papkaga reliz yetkaza oladi; buyruq yurgiza olmaydi, boshqa servislarni o'qiy olmaydi, konteynerlarni o'zgartira olmaydi",
          "GitHub SSH deploy uchun buni talab qiladi",
        ],
        answer: 1,
        why: "Klient nima so'rasa ham SSH server receive ni yurgizadi. Sizib chiqqan kalit qila oladigan eng yomon ish baribir validatsiyadan o'tishi kerak bo'lgan statik saytni chiqarish, oldingi reliz esa bitta rollback uzoqlikda turadi.",
      },
      fields: {
        "restrict,command": "OpenSSH forced command: shell yo'q, forwarding yo'q, bitta dastur.",
        flock: "Bir vaqtda ikki deploy aralashib ketolmaydi.",
        "version.txt == sha": "Arxiv o'zi da'vo qilgan commit'ni o'z ichiga olishi shart.",
        "atomic swap": "Vaqtinchalik havolaga ln -sfn, keyin current ustiga mv -T: hech qachon yarim yozilgan sayt yo'q.",
        "caddy validate": "Buzuq config saytni yiqitishidan oldin rad etiladi.",
        "64 URLs": "Har tildagi bosh sahifa, bo'limlar, darslar, Lab va vositalar 200 qaytarishi kerak.",
        rollback: "current PREVIOUS ga qaytadi; beshta reliz saqlanadi.",
      },
    },
    rounds: {
      short: "Raundlar",
      title: "Boshqariladigan agentlar raundlarda qurgan",
      body: "Kurs raundlarda yozilgan. Bosh agent bitta topshiriq yozadi: maqsadlar, qoidalar, dars shakli, sizib chiqish qoidalari. Parallel agentlar har biri bir nechta dars yoki bitta funksiyani o'z papkasida oladi, tekshiruvlarni yurgizadi va hisobot beradi. Bosh agent birlashtiradi, to'liq tekshiruvni yurgizadi va overview, isbot va oldin/keyin jadvali bilan bitta squash pull request ochadi.\n\nBirinchi commit'dan Round 11 gacha uch kun ketdi: poydevor, hash asosidagi CSP bilan deploy, haqiqiy so'rov qatlami, 42 darsli to'liq kurs, keyin har katta qadam uchun raund: yengil player, takrorlash, testlar, muallif rejimi, PlantUML, BPMN va MCP server, video eksport, vaqt bo'yicha simulyatsiya va o'z tizimlaringiz.",
      fields: {
        Foundation: "Sahna formati, player, birinchi dars, uch tilli sayt (2026-yil 17-noyabr).",
        "hash-based CSP": "Xavfsizlik modeli hech qanday kontentdan oldin joyida edi.",
        "42 lessons": "10 bo'limli birinchi to'liq kurs, Lab muharriri bilan.",
        "Round 2": "Preact player, qidiruv, oflayn rejim, Lab simulyatsiyasi.",
        "MCP server": "Round 8: AI agentlar darslarni stdio orqali ro'yxatlay, o'qiy va tekshira oladi.",
        "Round 11": "Tizimlarim kutubxonasi, CI va Mermaid importi, yana 4 dars (2026-yil 19-noyabr).",
        "one squash PR": "Raundga bitta ko'rib chiqiladigan o'zgarish, main'da bitta commit.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) O'quvchi harakatlanuvchi sahnali, haqiqiy so'rovli va har qadamdan oldin savolli darslar, ustiga Lab, takrorlash, testlar va o'z tizimlarini oladi, akkauntsiz. 2) Shaxsiy hamma narsa brauzerda qoladi; qurilma almashtirish fayl yoki kod, tizimni ulashish fayl yoki hash havola. 3) Dars bu patch'lardan iborat tipli sahna va uchta matn fayli; yetishmagan tarjimani kompilyator topadi. 4) Player bu Preact, SVG va CSS, og'ir qismlar talab bo'yicha yuklanadi. 5) Astro har sahifani oldindan quradi; postbuild inline skriptlarni qat'iy CSP ga hash qiladi. 6) Qulflangan konteynerdagi bog'liqliksiz bitta API fikr, galereya va botni yuritadi. 7) CI typecheck qiladi, test qiladi, quradi va natijada leak-guard'ni yurgizadi. 8) Deploy kaliti faqat relizni qabul qila oladi; atomik almashtirish, tashqi smoke test va avtomatik rollback saytni tik ushlab turadi.",
    },
  },
  scenarios: {
    "layout-shift": {
      label: "Sakraydigan sahifa",
      steps: {
        shift: {
          short: "CLS 0.124",
          title: "Progress sahifasi yuklangandan keyin sakrardi",
          body: "Jonli saytda Lighthouse /uz/me/ ga 0.124 Cumulative Layout Shift berdi, 0.1 chegaradan yuqori, /en/author/ ga esa 0.08. /me da bo'sh holat kartasi ham, umumiy karta ham HTML'da yashirin edi; me.js birinchi chizishdan keyin bittasini tanlab, bo'limlarni pastga surardi. /author da 16:9 skeleton ancha baland muharrir bilan almashardi va footer sakrardi.",
          check: {
            q: "Qat'iy CSP'li statik saytda /me sakrashini eng toza tuzatish qaysi?",
            options: [
              "Kartani har tashrif buyuruvchi uchun serverda render qilish",
              "Birinchi chizishdan oldin to'g'ri kartani tanlaydigan kichik inline skript; qurish uning hash'ini CSP ga qo'shadi",
              "me.js yuklanguncha butun sahifani ko'rsatmaslik",
            ],
            answer: 1,
            why: "Ma'lumot localStorage'da, shuning uchun qaysi kartani ko'rsatishni faqat brauzer biladi. Birinchi chizishdan oldin tanlash siljishni yo'qotadi, postbuild inline skriptlarni hash qilgani uchun CSP qo'lda o'zgartirishsiz ruxsat beradi. Butun sahifani yashirish CLS'ni sekinroq birinchi chizishga almashtirardi.",
          },
          fields: {
            "CLS 0.124": "Lighthouse 12.8.2 bilan, mobil profilda o'lchangan.",
            "layout-shifts": "Audit siljigan elementni nomi bilan aytadi.",
            "footer.site-foot": "/author da muharrir mount bo'lganda footer siljirdi.",
            "after the first paint": "Qaror juda kech keldi: sahifa allaqachon chizilgan edi.",
          },
        },
        settle: {
          short: "CLS 0.001",
          title: "Birinchi chizishdan oldin qaror qilish, balandlikni band qilish",
          body: "Round 9 /me ga localStorage'ni o'qib, brauzer chizishidan oldin to'g'ri kartani ko'rsatadigan inline skript qo'shdi; me.js keyin aniqlashtiradi. Uning hash'i postbuild'da CSP ga o'zi tushdi. /author da skeleton endi ekran balandligining 110% ini band qiladi, shuning uchun footer ekran ostidan boshlanadi. Qayta o'lchandi: /uz/me/ CLS 0.001, Performance 98; /en/author/ CLS 0.002.",
          fields: {
            "inline script": "Birinchi chizishdan oldin ishlaydigan bir necha qator.",
            postbuild: "Yangi hash'ni hisoblaydi; CSP'ni qo'lda tahrirlash yo'q.",
            "min-height: 110vh": "O'rinbosar u turgan muharrirdan past emas.",
            "CLS 0.001": "Lokal qurilmada Lighthouse, avvalgi profil bilan.",
          },
        },
      },
    },
    "leak-caught": {
      label: "Ushlangan sizib chiqish",
      steps: {
        hit: {
          short: "Qizil qurish",
          title: "leak-guard darsni to'xtatadi",
          body: "Round 7 da sirlarni boshqarish haqidagi yangi dars namuna host sifatida xususiy 10.x manzilni ishlatdi. Manzil hech narsani bildirmasdi, lekin leak-guard namunani haqiqiy ichki hostdan ajrata olmaydi, ochiq kursda esa taxmin qilish joyi yo'q. U manzilni qurilgan HTML'da topdi, job yiqildi va hech narsa deploy qilinmadi.",
          check: {
            q: "Manzil faqat namuna edi. To'g'ri munosabat qaysi?",
            options: [
              "Shu dars uchun leak-guard'ga istisno qo'shish",
              "Uni hech qachon marshrutlanmaydigan hujjat diapazonidagi manzil bilan almashtirish va qoidani qat'iy qoldirish",
              "Kontent papkalari uchun leak-guard'ni o'chirish",
            ],
            answer: 1,
            why: "Istisno hammaga qizilni o'tkazib yuborsa bo'ladi deb o'rgatadi. RFC 5737 aynan shu holat uchun hujjatlarga uchta diapazon ajratgan; ular bilan dars tabiiy o'qiladi, qoida esa mutlaq qoladi.",
          },
          fields: {
            "private IPv4": "Qoida chiqishning istalgan joyidagi 10.x, 172.16-31.x va 192.168.x manzillarini topadi.",
            "exits 1": "Noldan farqli chiqish CI'ni yiqitadi; deploy yashil CI'ni kutadi.",
            "an example": "Qoidalar niyatni bilmaydi, shuning uchun kontent sizib chiqishga o'xshamasligi kerak.",
          },
        },
        "doc-range": {
          short: "Hujjat diapazoni",
          title: "Hech qachon haqiqiy bo'lmaydigan manzillarni ishlatish",
          body: "Namuna RFC 5737 hujjatlar uchun ajratgan diapazondan 198.51.100.17 bo'ldi. leak-guard bu uch diapazonga port bilan ham ruxsat beradi, shuning uchun darslar real ko'rinadigan manzillarni ko'rsata oladi. Qurish yashil bo'ldi, dars chiqdi. Round 11 da yangi darsdagi namuna manzillar bilan xuddi shu narsa yana bo'ldi; u safar ular host nomlari bilan almashtirildi.",
          fields: {
            "198.51.100.17": "TEST-NET-2: haqiqiy manzilga o'xshaydi va hech qayerga marshrutlanmaydi.",
            "RFC 5737": "192.0.2.0/24, 198.51.100.0/24 va 203.0.113.0/24 hujjatlar uchun ajratilgan.",
            "leak-guard ok": "Nol topilma; qurish deploy'ga davom etadi.",
          },
        },
      },
    },
    preact: {
      label: "Og'ir player",
      steps: {
        heavy: {
          short: "135 KB",
          title: "Dars sahifasi butun framework'ni ko'tarib yurardi",
          body: "Birinchi player React va harakat kutubxonasini ishlatardi. Dars sahifasi taxminan 135 KB gzip'langan JavaScript yuborardi, sekin tarmoqdagi telefon esa birinchi paket qimirlashidan oldin hammasini yuklab, tahlil qilishi kerak edi. Telefonda o'qilishi mo'ljallangan kurs uchun bu noto'g'ri standart edi.",
          check: {
            q: "Player'ni qayta yozmasdan og'irlikning ko'p qismini kesishning eng arzon yo'li qaysi?",
            options: [
              "Har qadamni serverda rasm qilib render qilish",
              "React manbasini qoldirib, qurishda React'ni Preact compat'ga alias qilish va harakatni CSS'da qilish",
              "Sahifani ko'proq skript fayllarga bo'lish",
            ],
            answer: 1,
            why: "Preact o'sha komponent API'sini hajmning bir qismida amalga oshiradi, shuning uchun manba qoladi. CSS'dagi harakat ikkinchi kutubxonani olib tashlaydi. Fayllarga bo'lish umumiy og'irlikni o'zgartirmaydi.",
          },
          fields: {
            "react-dom": "Faqat renderer'ning o'zi og'irlikning ko'p qismi.",
            "motion library": "Faqat kirish va chiqish animatsiyalari uchun ikkinchi bog'liqlik.",
            "135 KB": "Round 2 dan oldin dars sahifasidagi gzip'langan JavaScript.",
          },
        },
        aliases: {
          short: "Tuzoqlar",
          title: "Almashtirish paytida ikki narsa buzildi",
          body: "pnpm har paket bog'liqliklarini qat'iy ajratib saqlaydi, shuning uchun dvigatel paketi `preact/compat` ni nisbiy alias orqali topa olmadi; alias'lar Astro config'ida absolyut bo'lishi kerak edi. SVG tugunlari esa atributni kichik harf bilan `tabindex` deb yozishni talab qiladi, React buni jimgina o'girib berardi.",
          fields: {
            "pnpm strict": "Paket faqat o'zi e'lon qilgan bog'liqliklarni ko'radi.",
            "absolute aliases": "react va react-dom absolyut yo'l bilan preact/compat ga ko'rsatadi.",
            tabindex: "SVG atributlari DOM kutgandek yoziladi.",
          },
        },
        light: {
          short: "24 KB",
          title: "O'sha manba, taxminan 24 KB",
          body: "Ishlash vaqtida Preact va CSS'dagi harakat hamda kichik tween funksiyasi bilan dars sahifasi taxminan 24 KB gzip'langan JavaScript'ga tushdi. Komponent manbasi o'zgarmadi. Round 3 da Lighthouse dars sahifasiga accessibility, best practices va SEO bo'yicha 100 berdi.",
          fields: {
            "unchanged source": "Komponentlar hamon React API'siga qarab yozilgan.",
            "small tween": "Raqamli animatsiya uchun bir necha qator; qolgani CSS transition'lar.",
            "24 KB": "Round 2 dan keyin dars sahifasidagi gzip'langan JavaScript.",
            Lighthouse: "Mobil profil, dars sahifasi va takrorlash sahifasida o'lchangan.",
          },
        },
      },
    },
    redos: {
      label: "Sekin regex",
      steps: {
        flagged: {
          short: "Ogohlantirish",
          title: "CodeQL osilib qolishi mumkin bo'lgan regex'ni belgilaydi",
          body: "Haqiqiy so'rov qatlamining pull request'ini CodeQL to'xtatdi: xabardagi belgilarni topadigan regular expression backtracking qila olardi, shuning uchun uzun maxsus qator polinomial vaqt olib, tabni muzlatib qo'yishi mumkin edi. Round 11 da o'sha tekshiruv tizim nomidan oxirgi chiziqchalarni kesadigan kichkina `/-+$/` pattern'ni ushladi.",
          check: {
            q: "Regex bugun har darsda ishlaydi. Nega ogohlantirishni yopib qo'ymaslik kerak?",
            options: [
              "Chunki CodeQL ogohlantirishlarini yopib bo'lmaydi",
              "Chunki kirish faqat bizniki emas: import qilingan fayllar va ulashish havolalari har kimdan keladi, maxsus tuzilgani o'quvchi brauzerini osib qo'yishi mumkin",
              "Chunki regular expression'lar umuman sikllardan sekin",
            ],
            answer: 1,
            why: "Round 11 dan beri o'quvchilar YAML, Mermaid va ulashilgan havolalarni import qiladi. Bunday matnni skanerlaydigan har kod dushmanona kirishda ham tez qolishi kerak; chiziqli skan buni kafolatlaydi, backtracking pattern esa yo'q.",
          },
          fields: {
            "js/polynomial-redos": "CodeQL qoidasi: ba'zi kirishlarda ishlash vaqti portlashi mumkin bo'lgan pattern.",
            "wire.ts": "Xabardagi belgilangan bo'laklarni topib raqamlaydigan modul.",
            "/-+$/": "Zararsiz ko'rinadi, lekin uzun chiziqchalar qatorida backtracking qiladi.",
            hang: "Regular expression'lar asosiy oqimda ishlaydi; sahifa javob bermay qoladi.",
          },
        },
        scanner: {
          short: "Chiziqli",
          title: "Pattern'ni oddiy sikl bilan almashtirish",
          body: "annotate() endi har qatorni indexOf va kursor bilan aylanib chiqadi, nomni kesish esa satr oxiridan sikl (edfb2dc commit). Ikkalasi ham ichida nima bo'lishidan qat'i nazar, kirishga mutanosib vaqt oladi. CodeQL yashil bo'ldi va yashil qolmoqda.",
          fields: {
            indexOf: "Keyingi nomzodni topish, kursorni oldinga surish, hech qachon orqaga qaytmaslik.",
            edfb2dc: "store: trim trailing dashes without a regex (CodeQL polynomial-redos).",
            linearly: "Kirish ikki barobar, ish ikki barobar; hech qanday kirish yomonlashtira olmaydi.",
          },
        },
      },
    },
  },
};

export default text;
