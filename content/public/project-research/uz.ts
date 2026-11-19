import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: research, qayta yurgizsa bo'ladigan postlar",
  summary:
    "wonmortech/research - wonmor.io dagi 15 post ortidagi takrorlanadigan buyruqlar va manbalar: har post uchun bitta papka, aniq buyruqlar, ular yuradigan commit va post keltirgan har manba. Butun ish oqimi: o'quvchi postni qanday tekshiradi, nega commit'lar mahkamlanadi va jonli xizmatlar siljishi kutiladi, repo yopiq kod haqida qanchalik halol, post turlangan Reproduce bloki bilan qanday yoziladi, build qilinadi, havolalari tekshiriladi va isbot hamda rollback bilan deploy qilinadi, va uchta haqiqiy holat: ataylab tushgan ball, siljigan son va hech qachon jimgina kichraymasligi kerak bo'lgan sonlar.",
  learn: [
    "O'quvchi tomoni: postni ochish, Reproduce qutisini topish, papkani klon qilish va buyruqlarni qayta yurgizish",
    "Nega har yurgiziladigan da'vo ommaviy repo va aniq commit'ni nomlaydi va nega jonli sonlarning siljishiga yo'l qo'yiladi",
    "Post qanday tayyorlanadi: manbalar va reproduce buyruqlari bilan turlangan frontmatter, manbasiz postni rad etadigan sxema",
    "Pipeline'lar: sayt, havola va rasm tekshiruvli build, version.txt bilan isbotlangan rollback'li deploy va CI hech qachon yurgizmaydigan qo'lda sanash",
  ],
  nodes: {
    reader: "O'quvchi",
    repo: "research repo",
    site: "wonmor.io",
    pub: "Mahkamlangan ommaviy repo",
    live: "Jonli xizmatlar",
    author: "Muallif",
    src: "wonmor.io manbasi",
    ci: "GitHub Actions",
  },
  metrics: {
    posts: "Reproduce papkasi bor postlar",
    inflation: "Sizish tufayli oshgan ball",
    unexplained: "Izohsiz farqlar",
    wrong: "Nashr qilingan noto'g'ri sonlar",
  },
  steps: {
    what: {
      short: "Bu nima",
      title: "Har post o'z buyruqlari bilan keladi",
      body: "Texnik post odatda \"biz X ni o'lchadik\" deydi va ishonishni so'raydi. wonmor.io tekshirish yo'li bilan keladigan tadqiqot va muhandislik postlarini nashr qiladi, `wonmortech/research` esa o'sha tekshiruvlar yashaydigan joy: har post uchun bitta papka, bugun 15 post.\n\nHar papkada sarlavha, postga havola, aynan nimani takrorlash mumkinligi, u yuradigan ommaviy repo va commit, buyruqlar va post keltirgan har manba bilan `README.md` bor. `commands.sh` - postning o'z Reproduce qutisi, o'z holicha ko'chirilgan. Post mosques postidagi Overpass so'rovi kabi to'liq so'rovdan foydalansa, fayl ham shu yerda. Post ortidagi kod yopiq bo'lsa, README buni oddiy so'zlar bilan aytadi.",
      fields: {
        "README.md": "Bitta post xaritasi: da'vo, kirishlar, buyruqlar, manbalar.",
        "commands.sh": "Saytdagi qatorlarning o'zi, qayta yozilgan versiya emas.",
        overpassql: "Natijani qayta qurish uchun bo'laklar emas, to'liq so'rovlar.",
        "private code": "Yashirilmaydi: aytiladi, ommaviy tekshirsa bo'ladigan narsa bilan birga.",
      },
    },
    read: {
      short: "O'qish",
      title: "O'quvchi Reproduce qutisini ko'radi",
      body: "wonmor.io da tekshirsa bo'ladigan har post **Reproduce this** qutisi bilan tugaydi: buyruqlar nima berishi kerakligi haqidagi izoh, `$` bilan boshlangan buyruqlarning o'zi va repo hamda aniq commit'ga havola.\n\nMisol - transliteratsiya posti. Uning izohi aniq sonlarni va'da qiladi: main'da uchta test to'plami uchun 3000 dan 2966, 2436 va 2992 to'g'ri gap, tuzatishdan oldingi lug'at qayta qurilganda esa 3000 dan 2975 (99.17%). O'quvchi sarlavhaga ishonishi shart emas; u o'sha to'rtta sonni o'zi olishi mumkin.",
      fields: {
        "2966/3000": "Izohdagi va'da: o'quvchi ko'rishi kerak bo'lgan son.",
        "99.17%": "Eski ball, ataylab takrorlanadigan qilib saqlangan.",
        "$ cargo": "Buyruqlar aynan yoziladigan ko'rinishda.",
        "2de5c94": "Commit havola bilan, kod da'vo ostida o'zgarib qolmasligi uchun.",
      },
    },
    run: {
      short: "Yurgizish",
      title: "Klon qilish, o'qish, qatorma-qator yurgizish",
      body: "README'dagi o'quvchi yo'li uch qator: reponi klon qilish, post papkasining README'sini o'qish, `commands.sh` ni yurgizish. README ba'zi qatorlar server ishga tushirishi yoki ma'lum checkout talab qilishini ogohlantiradi, shuning uchun butun skriptdan ko'ra qatorma-qator yurgizish ko'pincha yaxshiroq, papka README'si esa qaysi qatorga nima kerakligini aytadi.\n\n**Nega faqat sayt emas, alohida repo:** git repo versiyalanadi, diff qilinadi va klon qilinadi, issue qatorga ishora qila oladi, buyruqlar esa saytning ishlab turishiga bog'liq emas.",
      fields: {
        "git clone": "Butun to'plam bitta klonda.",
        cat: "Avval o'qing: README nima kutishni aytadi.",
        "one at a time": "Ba'zi qatorlar uzoq ishlaydi yoki sozlash talab qiladi.",
        "specific checkout": "Buyruq faqat mahkamlangan commit'da to'g'ri.",
      },
    },
    pinned: {
      short: "Mahkamlangan",
      title: "Kod haqidagi da'vo commit'ga mahkamlanadi",
      body: "Post nashr qilingandan keyin ham kod o'zgaraveradi. Buyruqlar `main` ga qarshi yursa, natija jimgina siljiydi va post mos kelmay qoladi. Shuning uchun har yurgiziladigan papka ommaviy repo va aniq commit'ni nomlaydi va uni checkout qilishdan boshlanadi. Indeks mahkamlashlarni ko'rsatadi: deploy posti uchun `592b4a4`, bir nechta til va ta'minot zanjiri postlari uchun `2de5c94`, Lighthouse posti uchun `f0739fe`.\n\nTransliteratsiya posti uchun: bitg'ni klon qilish, `2de5c94` ni checkout qilish, CLI'ni build qilish, baholashni yurgizish, va asosiy test to'plami izohdagi son - 2966/3000 ni beradi.",
      check: {
        q: "O'quvchi buyruqlarni mahkamlangan commit o'rniga eng so'nggi main'da yurgizib, boshqa son oladi. Bu nimani ko'rsatadi?",
        options: [
          "Post noto'g'ri",
          "Post haqida hech narsa: kod undan keyin o'zgargan; mahkamlangan commit'da postdagi son chiqishi kerak",
          "Test to'plami tasodifiy",
        ],
        answer: 1,
        why: "Mahkamlash da'voni abadiy tekshiriladigan qiladi: post bitta commit'ni tasvirlaydi. Boshqa commit'dagi boshqa son - yangi natija, rad etish emas.",
      },
      fields: {
        "git checkout": "Kodni post tasvirlagan holatda muzlatish.",
        "cargo build": "Yuklab olingan binary'dan emas, o'sha holatdan build qilish.",
        eval: "Ball o'lchanadigan qat'iy test to'plami.",
        "2966/3000": "Izoh va'da qilgan son.",
      },
    },
    drift: {
      short: "Siljish",
      title: "Jonli xizmatlarning siljishi kutiladi",
      body: "Ba'zi postlar repoda bo'lmagan narsalarni o'lchaydi: Overpass orqali OpenStreetMap, OpenSSF Best Practices nishonlari, OpenSSF Scorecard, Lighthouse. Bu buyruqlar yozilgan kundagi emas, bugungi qiymatlarni qaytaradi. README buni **Expect drift** ostida oldindan aytadi: mahkamlangan commit'lar repo tomonini barqaror qiladi, jonli tomon siljiydi, har post o'z sonlaridan qaysilari snapshot ekanini aytadi.\n\nBu takrorlanuvchanlik va qaytariluvchanlik orasidagi farq. Usul takrorlanadi; jonli son faqat o'sha kuni qaytariladi.",
      check: {
        q: "Nega jonli natijalarni ham, masalan kechagi Scorecard chiqishini saqlab, mahkamlamaslik kerak?",
        options: [
          "Mumkin, lekin postning maqsadi - usul; README bunday sonlarni qat'iy deb ko'rsatish o'rniga snapshot deb belgilaydi",
          "Chunki Scorecard natijalarni saqlashni taqiqlaydi",
          "Chunki jonli xizmatlar hech qachon o'zgarmaydi",
        ],
        answer: 0,
        why: "Saqlangan chiqish faqat kimdir faylni saqlaganini isbotlaydi. Halol yo'l - qaysi sonlar snapshot ekanini aytish va har kimga usulni bugun qayta yurgizishga imkon berish.",
      },
      fields: {
        "live services": "Har qanday repo tarixidan tashqaridagi ma'lumot.",
        "today's values": "Qayta yurgizish ko'rsatadigan narsa.",
        "pinned commits": "Muzlatsa bo'ladigan qism.",
        snapshots: "Sanaga tegishli sonlar.",
      },
    },
    private: {
      short: "Yopiq kod",
      title: "Nimani tekshirib bo'lmasligini aytish",
      body: "Har post ham ochiq kod haqida emas. Indeks har post uchun o'quvchi aniq nima qila olishini sanaydi: commit'dagi ommaviy repoga qarshi yurgizish, to'liq so'rovdan qayta qurish, nashr qilingan filmni ffprobe bilan ko'rish, yadro kod yopiq bo'lganda ommaviy buyruqlarni yurgizish yoki qaror yozuvi yopiq bo'lganda faqat manbalarga ergashish.\n\nYopiq loyiha uchun papka baribir ishlaydigan ommaviy asboblarni, masalan istalgan MCP server uchun umumiy inspektorni sanaydi va manba nashr qilinmaganini aytadi. **Nega:** noaniq \"kod so'rov bo'yicha mavjud\" tekshirib bo'lmaydigan ishonchga chaqiradi; ommaviy va yopiq orasidagi aniq chiziq reponing qolgan qismini ishonchli saqlaydi.",
      fields: {
        Runnable: "Eng kuchli daraja: commit'dagi ommaviy kod.",
        "Full Overpass query": "Asl so'rovdan qayta qurilgan ma'lumot.",
        ffprobe: "Har kim ko'ra oladigan nashr qilingan artefakt.",
        "core code private": "Indeksda ochiq aytilgan.",
        "Sources only": "Eng zaif daraja, u ham ochiq aytilgan.",
      },
    },
    write: {
      short: "Yozish",
      title: "Post tayyorlash: dalilni frontmatter olib yuradi",
      body: "Post ommaviy `wonmortech/wonmor.io` reposida Markdown sifatida uch tilda yoziladi: `src/content/research/<slug>/en.md`, `uz.md` va `ru.md`. Dalil matnda keyin qo'shilgan narsa emas; u frontmatter'dagi tuzilgan ma'lumot.\n\n`kind` post /research yoki /engineering ostida chiqishini hal qiladi, `area` uni yetti tadqiqot sohasidan biriga bog'laydi, `source` post keltirgan har manbani sanaydi, `reproduce` esa repo, commit, izoh va buyruqlarni saqlaydi - research reposiga tushadigan o'sha buyruqlar. Sahifadagi Reproduce qutisi shu blokdan chiziladi, shuning uchun sayt va repo jimgina kelishmay qola olmaydi.",
      fields: {
        kind: "research yoki engineering: URL undan olinadi.",
        area: "agents'dan digital-assets'gacha yetti sohadan biri.",
        source: "Har manba, build tekshira oladigan ro'yxat sifatida.",
        reproduce: "Repo, commit, izoh va buyruqlar ma'lumot sifatida.",
        commit: "O'sha aniq commit'ga havola sifatida chiziladi.",
      },
    },
    schema: {
      short: "Sxema",
      title: "Manbasiz postni rad etadigan sxema",
      body: "Research to'plami `src/content.config.ts` da Zod sxemasi bilan aniqlangan. `kind` va `area` - enum'lar, shuning uchun imlo xatosi adashgan sahifa yaratish o'rniga build'ni buzadi. `source` kamida bitta yozuvli ro'yxat bo'lishi shart: manbasiz post build qilinmaydi. `reproduce` ixtiyoriy, chunki faqat manbali post ham ruxsat etilgan, lekin bo'lsa, uning reposi URL bo'lishi kerak.\n\n**Nega uslub qo'llanmasi emas, sxema:** build majburlaydigan qoida kimningdir tungi 2 da eslashiga bog'liq emas.",
      check: {
        q: "Muallif tartiblash uchun source'dan oxirgi yozuvni o'chiradi. Nima bo'ladi?",
        options: [
          "Post manbalarsiz build bo'ladi",
          "astro build sxema tekshiruvida yiqiladi, CI qizil va hech narsa deploy bo'lmaydi",
          "Deploy keyin orqaga qaytadi",
        ],
        answer: 1,
        why: "`source: z.array(z.string()).min(1)` to'plam yuklanganda tekshiriladi; build birorta sahifa yozilishidan oldin yiqiladi.",
      },
      fields: {
        kind: "Enum: faqat ikki ruxsat etilgan qiymat.",
        area: "Yetti soha umumiy konstanta.",
        "min(1)": "Kamida bitta manba, aks holda build yo'q.",
        reproduce: "Ixtiyoriy, lekin bo'lsa turlangan.",
      },
    },
    mirror: {
      short: "Ko'zgu",
      title: "Research papkasi postni aks ettiradi",
      body: "Har post uchun research reposi papka oladi, uning `commands.sh` i postning reproduce buyruqlari, so'zma-so'z ko'chirilgan, postga havola beradigan va qatorma-qator yurgizib, kerakli checkout uchun README'ni ko'rishni aytadigan sarlavha bilan. Papka README'si izohni, mahkamlangan repo va commit'ni, frontmatter'dagi manbalarni va litsenziyani takrorlaydi.\n\nBarcha 15 papka 2026-11-13 da bitta commit'da kelgan; keyingi commit'lar OpenSSF Scorecard, CODEOWNERS va action'lar uchun Dependabot hamda jonli natijalarga havolali umumiy README qo'shgan.",
      fields: {
        Source: "Har skript o'zi olingan sahifaga ishora qiladi.",
        verbatim: "Sayt va repo orasida jimgina tahrir yo'q.",
        "line by line": "README'dagi ogohlantirishning o'zi.",
      },
    },
    build: {
      short: "Build",
      title: "Build: sayt o'zini tekshiradi",
      body: "wonmor.io ga har pull request'da CI `npm run build` ni yurgizadi, deploy ham o'sha buyruqni yurgizadi. Bu zanjir: `astro build` (har post sxemadan o'tishi kerak), qidiruv uchun Pagefind, `check-site.mjs` (CSP va maxfiylik skani), `check-links.mjs` va `check-art.mjs`.\n\nHavola tekshiruvi aynan research postlari uchun muhim: har ichki havola va har `#fragment` mavjud narsaga ishora qilishi kerak, tashqi havolalar esa aniq ro'yxatda saqlanadi, shuning uchun nomi o'zgargan sarlavha yoki ko'chgan sahifa o'quvchi ishonchini emas, build'ni buzadi. Rasm tekshiruvi bitta sahifadagi ikki post bir xil yaratilgan rasmga ega bo'lmasligini ta'minlaydi.",
      fields: {
        "astro build": "Sxema tekshiruvi shu yerda bo'ladi.",
        pagefind: "Statik qidiruv indeksi, qidiruv serverisiz.",
        "check-site": "Xavfsizlik sarlavhalari va nashr qilinmasligi kerak bo'lgan matnga skan.",
        "check-links": "O'lik ichki havolalar va yo'q langarlar build'ni yiqitadi.",
        "check-art": "Har post o'z rasmini saqlaydi.",
      },
    },
    numbers: {
      short: "Sonlar",
      title: "CI hisoblashiga ruxsat yo'q sonlar",
      body: "Bosh sahifada sonlar tasmasi bor: repolar, merge qilingan pull request'lar, relizlar. Repolarning bir qismi yopiq. Shuning uchun `tools/count-numbers.mjs` ni hammasini ko'ra oladigan GitHub CLI login'i bilan egasi yurgizadi, u `asOf` sanasi bilan `src/data/numbers.json` ni yozadi, keyin u commit qilinadi.\n\nCI uni hech qachon yurgizmaydi. Skriptdagi izoh sababini aytadi: kirish huquqisiz build jimgina kichikroq, faqat ommaviy sonlarni nashr qilardi. Birorta yopiq repo ko'rinmasa, skript biror narsa yozishdan oldin ogohlantiradi.",
      check: {
        q: "Nega bu yerda CI'dagi avtomatik qadamdan qo'lda qadam yaxshiroq?",
        options: [
          "Qo'lda qadamlar doim yaxshiroq",
          "CI tokeni faqat ommaviy repolarni ko'radi, shuning uchun avtomatika yashil holicha noto'g'ri, kichikroq sonlarni nashr qilardi",
          "Sanash CI uchun juda sekin",
        ],
        answer: 1,
        why: "Avtomatika faqat to'g'ri kirishlar bo'lsa yaxshi. Bu yerda to'g'ri kirish egasining huquqini talab qiladi, shuning uchun qadam qo'lda, sanali va ko'rib chiqiladigan bo'lib qoladi.",
      },
      fields: {
        "run by the owner": "Har bir repozitoriyni ko'ra oladigan yagona shaxs.",
        "CI never runs this": "Hammasini avtomatlashtirishdan ataylab istisno.",
        warns: "Nol yopiq repo ko'rinishi noto'g'ri login belgisi deb qabul qilinadi.",
        asOf: "Sonlar har qanday snapshot kabi o'z sanasini olib yuradi.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: bittadan, isbotlangan, qaytariladigan",
      body: "main'ga push deploy workflow'ini yurgizadi, hech qachon bir vaqtda ikkita emas va hech qachon yarmida bekor qilinmaydi. U build qiladi, commit SHA'ni `site/version.txt` ga yozadi va tarball'ni server `bin/receive` ga bog'lagan kalitga, mahkamlangan host kaliti bilan SSH orqali yuboradi.\n\nKeyin natijani isbotlaydi: `/version.txt` SHA'ni ko'rsatguncha so'raydi (3 soniya oraliq bilan 20 urinish), /research/, /engineering/ va RSS lentasi kabi asosiy sahifalarni smoke-test qiladi, mavjud bo'lmagan sahifa uchun 404 kutadi va ommaviy CSP hali ham `connect-src 'self'` ni o'z ichiga olishini tekshiradi. Yuborishdan keyin biror narsa yiqilsa, rollback qadami oldingi relizga qaytaradi.",
      check: {
        q: "O'zgarish tasodifan CSP'ni kengaytiradi. Yuklash muvaffaqiyatli. Nima bo'ladi?",
        options: [
          "Hech narsa, deploy'dan keyin CSP tekshirilmaydi",
          "Smoke qadami CSP tekshiruvida yiqiladi va rollback qadami oldingi relizni tiklaydi",
          "Build qadami uni har doim yuklashdan oldin ushlaydi",
        ],
        answer: 1,
        why: "Smoke test jonli sarlavhani o'qiydi; muvaffaqiyatli yuborishdan keyin yiqilishi rollback'ni ishga tushiradi. Build'dagi sayt tekshiruvi uni oldinroq ushlashi mumkin, lekin jonli tekshiruv - oxirgi chiziq.",
      },
      fields: {
        "version.txt": "Jonli sayt o'zi berayotgan commit'ni nomlaydi.",
        "bin/receive": "CI kaliti nashr qilishi yoki orqaga qaytarishi mumkin, boshqa hech narsa.",
        "20 tries": "Yangi reliz paydo bo'lishi uchun taxminan bir daqiqa.",
        smoke: "Jonli saytda tekshirilgan asosiy sahifalar, 404 va CSP.",
        rollback: "Oldingi reliz bitta almashtirish uzoqligida.",
      },
    },
    feedback: {
      short: "Fikr",
      title: "Buyruq buzilsa, issue oching",
      body: "Takrorlanuvchanlik faqat kimdir u yiqilganda xabar bera olsagina haqiqiy. README aynan shuni so'raydi: buyruq endi ishlamasa yoki post tushuntirmagan sabab bilan boshqa natija bersa, buyruq, chiqish va uni yurgizgan sana bilan issue oching. Sana siljish tufayli muhim.\n\nRepoga o'zi ishora qilgan kod bilan bir xil talab qo'yiladi: har hafta OpenSSF Scorecard, action'lar uchun Dependabot, ko'rib chiqish uchun CODEOWNERS. Kod (buyruqlar, skriptlar, so'rovlar) MIT, matn CC BY 4.0, tilga olingan repolar o'z litsenziyalarini saqlaydi.",
      fields: {
        "no longer works": "Buzilgan buyruq - o'quvchidagi emas, postdagi xato.",
        "open an issue": "Buyruq, chiqish, sana: xatoni takrorlash uchun yetarli.",
        Scorecard: "Dalil reposining o'zida ta'minot zanjiri tekshiruvlari.",
        "CC BY 4.0": "Matnni muallifni ko'rsatib qayta ishlatish mumkin.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "research bir ekranda",
      body: "**O'quvchi tomoni:** tekshirsa bo'ladigan har post Reproduce qutisi bilan tugaydi; research reposida har post uchun so'zma-so'z buyruqlar, mahkamlangan ommaviy repo va commit, har manba va litsenziyali papka bor; klon qiling va qatorma-qator yurgizing.\n\n**Halollik qoidalari:** kod haqidagi da'volar commit'ga mahkamlanadi; jonli xizmatlarning siljishi kutiladi va snapshot'lar belgilanadi; yopiq kod yopiq deb, hali nimani tekshirsa bo'lishi bilan nomlanadi.\n\n**Tayyorlash:** turlangan frontmatter'li uch tildagi postlar (`kind`, `area`, kamida bitta yozuvli `source`, `reproduce`); sahifa va repo bir xil ma'lumotdan yasaladi.\n\n**Pipeline'lar:** sxema, qidiruv, sayt, havola va rasm tekshiruvli build; bittadan, version.txt va jonli smoke test bilan isbotlangan, rollback'li deploy; CI yopiq repolarni ko'ra olmagani uchun bosh sahifa sonlarini egasi qo'lda sanaydi.",
    },
  },
  scenarios: {
    "score-down": {
      label: "Ball tushdi",
      steps: {
        "leak-bug": {
          short: "99.17%",
          title: "Haddan tashqari yaxshi ball",
          body: "O'zbek konvertori asosiy test to'plamida 99.17% olib turgan edi, toki uning lug'ati baholash gaplarini o'z ichiga olgan matndan qurilgani ma'lum bo'lguncha. Eski holat takrorlanadigan qoladi: `a7962ef` commit'idan lug'atni checkout qiling, qayta build qiling, asosiy to'plam 2975/3000 beradi.",
          fields: {
            a7962ef: "Tuzatishdan oldingi holat, bitta buyruq uzoqlikda.",
            "99.17%": "Mahoratni emas, xotirani o'lchagan son.",
            "counted the evaluation sentences": "Test ma'lumoti o'qitish ma'lumotiga sizgan.",
          },
        },
        "leak-fix": {
          short: "98.87%",
          title: "Pastroq, halol sonni nashr qilish",
          body: "Sizish olib tashlangach, o'sha gaplar 2966/3000, ya'ni 98.87% beradi. Post tushishni sarlavhaga chiqardi - \"nega ballimiz 99.17% dan 98.87% ga tushdi\" - va ikkala sonni har biri bitta buyruq bilan takrorlanadigan saqlaydi, shuning uchun har kim sizish bergan 0.30 ballni ko'ra oladi.",
          fields: {
            "98.87%": "Mahkamlangan commit'dagi ball.",
            "went down": "Tushish - natija, yashiradigan narsa emas.",
            reproducible: "Ikkala holatni har kim qayta qura oladi.",
          },
        },
      },
    },
    "live-moved": {
      label: "Son siljidi",
      steps: {
        "moved-bug": {
          short: "2 285 va 2 289",
          title: "Qayta yurgizish boshqa son beradi",
          body: "Masjidlar posti sarlavhasida o'z importidan 2 285 jamoat yozilgan. O'sha Overpass so'rovini keyinroq, 2026-11-13 da yurgizish 2 289 beradi. O'quvchi post noto'g'ri degan xulosaga kelishi mumkin.",
          fields: {
            "2,285": "Post sarlavhasidagi son.",
            "2,289": "O'sha so'rov, bir necha hafta keyin.",
            wrong: "Kontekstsiz tabiiy birinchi reaksiya.",
          },
        },
        "moved-fix": {
          short: "Izohlandi",
          title: "Oldindan e'lon qilingan siljish",
          body: "README'ning Expect drift bo'limi Overpass bugungi xaritani qaytarishini allaqachon aytadi. O'sha keyingi yurishdan qurilgan dataset so'rov vaqti va `timestamp_osm_base` ni yozadi, shuning uchun farqning sanasi bor. Farq hech qayerda tushuntirilmagan bo'lsa, README buyruq, chiqish va sana bilan issue so'raydi.",
          fields: {
            "Expect drift": "Hech kim so'ramasdan oldin yozilgan.",
            timestamp_osm_base: "Server javob bergan ma'lumotning yoshi.",
            "an issue": "Hali hech kim tushuntirmagan farqlar uchun kanal.",
          },
        },
      },
    },
    "small-numbers": {
      label: "Kichikroq sonlar",
      steps: {
        "small-bug": {
          short: "Yashil, noto'g'ri",
          title: "Skript qarshi yozilgan xato",
          body: "Agar bosh sahifa sonlari CI'da sanalsa, CI tokeni faqat ommaviy repolarni ko'rardi. Repolar, merge qilingan pull request'lar va relizlar hammasi pastroq chiqardi, build yashil qolardi va kichikroq sonlar hech kim sezmasdan jonli bo'lardi. Skriptning bosh izohi aynan shu xavfni nomlaydi.",
          fields: {
            "only public": "Egasi huquqisiz token rasmning bir qismini ko'radi.",
            "count lower": "Tasmadagi har son kichrayadi.",
            "still be green": "Hech bir tekshiruv yiqilmaydi: eng xavfli xato turi.",
          },
        },
        "small-fix": {
          short: "Himoyalangan",
          title: "Qo'lda, sanali, ko'rib chiqiladigan qadam",
          body: "Shuning uchun sanash build'ning qismi emas. Egasi uni to'liq huquq bilan yurgizadi; birorta yopiq repo ko'rinmasa, yozishdan oldin ogohlantiradi; u yozgan JSON `asOf` sanasini olib yuradi va har qanday o'zgarish kabi commit qilinib, ko'rib chiqiladi.",
          fields: {
            "manual step": "Hammasini ko'ra oladigan yagona shaxs tomonidan ataylab yurgiziladi.",
            warning: "Huquqi yetarli bo'lmagan login erta ushlanadi.",
            asOf: "Tasma jonli hisoblagich emas, sanali snapshot.",
          },
        },
      },
    },
  },
};

export default text;
