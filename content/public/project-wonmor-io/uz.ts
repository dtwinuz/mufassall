import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: wonmor.io va wonmortech tashkiloti",
  summary:
    "wonmor.io bu Wonmor'ning sayti: O'zbekistondagi mustaqil, o'z mablag'iga ishlaydigan brend haqida ingliz, o'zbek va rus tilida. Uning atrofida wonmortech tashkiloti turadi: dizayn tokenlari, brend fayllari, rejadagi open-source fond va umumiy profil hamda siyosatlar. O'quvchi va muharrir saytdan qanday foydalanadi, statik Astro build qanday tekshiriladi va GitHub Actions uni faqat reliz qabul qila oladigan, symlink almashtiradigan va orqaga qaytara oladigan serverga qanday yetkazadi.",
  learn: [
    "Repolar bir-biriga qanday bog'langan: sayt, @wonmor/tokens, brand, open-source-fund va .github; mahsulot kodi esa boshqa tashkilotda",
    "O'quvchi tomoni (tillar, mavzular, statik qidiruv) va muharrir tomoni (/admin dagi Sveltia CMS, har saqlash bitta commit)",
    "Build paytidagi to'siqlar: manbasi majburiy kontent sxemasi, CSP va maxfiylik skani, havola va illyustratsiya tekshiruvi, Lighthouse CI",
    "Forced-command SSH kalit bilan deploy: releases/<sha>, atomar symlink almashinuvi, versiya tekshiruvi, smoke test va avtomatik rollback",
  ],
  nodes: {
    visitor: "Mehmon brauzeri",
    edge: "dtwin.uz edge proksi",
    site: "wonmor-site (Caddy)",
    writer: "Muharrir",
    cms: "Sveltia CMS /admin",
    repo: "wonmor.io reposi",
    ci: "GitHub Actions",
    tokens: "design-system",
    brand: "brand",
    rel: "releases/",
    lh: "Lighthouse CI",
  },
  metrics: {
    committed: "Git'dagi build fayllari",
    pages: "Yig'ilgan sahifalar",
    demos: "Mahsulotlarning jonli demolari",
    prchecks: "PR dagi majburiy tekshiruvlar",
    stale: "Eskirgan boot skriptining umri",
    claims: "Hech kim qayta chiqara olmaydigan raqamlar",
  },
  steps: {
    intro: {
      short: "Bu nima",
      title: "Uch tildagi studiya sayti",
      body: "wonmor.io Wonmor'ni tanishtiradi: mahsulotlarni kim quradi, har bir mahsulot nima, manbali yangiliklar, tadqiqot maqolalari va siyosat sahifalari. Inglizcha `/` da, o'zbekcha `/uz/` da, ruscha `/ru/` da. Wonmor kompaniya emas, brend: bitta asoschi mahsulotlarni AI agentlar bilan quradi, har bir o'zgarish esa pull request orqali o'tadi.\n\nSayt to'liq statik. Kichik Caddy konteyneri yig'ilgan fayllarni beradi va dtwin.uz ning umumiy edge proksisi orqasida turadi, domen va TLS o'sha yerda. CSP boshqa manbalardan hech narsaga ruxsat bermaydi, shuning uchun sahifa begona skript, shrift yoki trekker yuklamaydi.",
      fields: {
        Host: "Bitta domen, wonmor.io; www edge'da shunga yo'naltiriladi.",
        "Accept-Language": "Faqat bosh sahifaga birinchi kirishda o'zbek yoki rus tilini taklif qilish uchun.",
        "Cache-Control": "Sahifalar har yuklanishda qayta tekshiriladi, shuning uchun deploy darhol ko'rinadi.",
        "Content-Security-Policy": "Skript faqat saytning o'zidan; wasm-unsafe-eval Pagefind qidiruv indeksi uchun.",
        "Referrer-Policy": "Boshqa saytlar o'quvchi qaysi sahifadan kelganini emas, faqat domenni biladi.",
      },
    },
    reader: {
      short: "O'quvchi",
      title: "O'quvchi: til, mavzu va qidiruv",
      body: "`<head>` dagi kichik skript birinchi chizishdan oldin ishlaydi. U saqlangan mavzuni qo'llaydi (oq va qoradan tortib yuqori kontrast va paper gacha to'qqizta), shuning uchun sahifa noto'g'ri rangda yalt etib ko'rinmaydi. Yalang `/` ga birinchi kirishda brauzer tilini ochadi; chuqur inglizcha sahifalar esa boshqa tilni faqat bannerda taklif qiladi, chunki qidiruv tizimlari ularni yo'naltirmaslikni maslahat beradi.\n\nQidiruv serversiz ishlaydi: Pagefind deploy paytida indeks quradi, brauzer uni WebAssembly bilan so'raydi. Har bir mahsulot sahifasi, yangilik va maqola JavaScript'siz ham ochiladigan oddiy HTML sahifa.",
      check: {
        q: "Brauzeri o'zbekcha bo'lgan toshkentlik mehmon chatdagi inglizcha tadqiqot maqolasi havolasini ochdi. Nima bo'ladi?",
        options: [
          "Sahifa avtomatik ravishda /uz/ ga yo'naltiriladi",
          "Inglizcha maqola ochiladi, banner o'zbekcha versiyani taklif qiladi",
          "Til tanlashni so'raydigan xato sahifasi chiqadi",
        ],
        answer: 1,
        why: "Brauzer tiliga faqat yalang bosh sahifa ergashadi. Chuqur havola bu aniq sahifani tanlash, uni jimgina yo'naltirish qidiruv tizimlarini ham chalg'itardi, shuning uchun sayt boshqa tilni majburlamaydi, taklif qiladi.",
      },
      fields: {
        "wm-theme": "Saqlangan mavzu; u bo'lmasa CSS tizimning oq yoki qora sozlamasiga ergashadi.",
        "wm-lang": "Mehmon tanlagan yoki oxirgi marta o'qigan til.",
        "wm-in": "Sayt ichidagi tashrifni belgilaydi, shuning uchun sahifadan sahifaga o'tish yo'naltirish qilmaydi.",
        "navigator.languages": "Hech narsa saqlanmagan birinchi tashrifda bir marta o'qiladi.",
        pagefind: "Statik qidiruv indeksi: hosting ham, ishlab turadigan servis ham kerak emas.",
      },
    },
    editor: {
      short: "Muharrir",
      title: "Muharrir: /admin dagi Sveltia CMS",
      body: "Yangilik va maqolalar kodga tegmasdan brauzerda, `/admin` da yoziladi. Sveltia CMS to'g'ridan-to'g'ri GitHub API bilan gaplashadi: muharrir faqat shu bitta repoga cheklangan fine-grained token bilan kiradi, har bir Saqlash `main` ga o'qilishi oson xabarli commit bo'ladi.\n\nHar bir til alohida kolleksiya, shuning uchun bitta maqolaning uchta fayli yonma-yon turadi: `<slug>/en.md`, `uz.md`, `ru.md`. CMS serveri ham, zaxiralanadigan baza ham yo'q: kontent ombori reponing o'zi, butun tarixi bilan. `/admin` ning CSP si alohida va kengroq (api.github.com ga chiqishi kerak), u hech qachon indekslanmaydi va keshlanmaydi.",
      fields: {
        backend: "Backend GitHub'ning o'zi: commit bu saqlash tugmasi.",
        branch: "Saqlashlar main ga tushadi; ruleset bu yo'lni o'tkazadi, build esa baribir qo'riqlaydi.",
        "commit_messages.update": "Kontentdagi har bir tahrir tarixda o'qiladigan commit.",
        collections: "Har til va tur uchun bitta kolleksiya, tarjimalar papka bo'yicha juft qoladi.",
        "sign-in": "OAuth ilova ham, server ham yo'q: muharrirda turadigan, shu repoga cheklangan token.",
      },
    },
    content: {
      short: "Kontent",
      title: "Sxemali kontent: manba yo'q bo'lsa, maqola ham yo'q",
      body: "Har bir kolleksiyaning `src/content.config.ts` da sxemasi bor. Yangilik bu sanasi bor fakt va kamida bitta manbani ko'rsatishi shart: bu yerda e'lon qilinayotgan mahsulotning reliz sahifasi. Tadqiqot maqolalarida `reproduce` bloki (repo, commit, buyruqlar) bo'lishi mumkin, o'quvchi natijani o'zi takrorlay olsin.\n\nSxemani buzgan CMS saqlashi saytga yetib bormaydi: build yiqiladi, deploy boshlanmaydi. Faqat rejadagi ish mahsulot sahifalarida Planned deb belgilanadi va hech qachon yangilik bo'lib chiqmaydi.",
      check: {
        q: "Muharrir /admin dan yangilikni saqladi, manbalarni esa unutdi. Nima bo'ladi?",
        options: [
          "Maqola manbasiz saytga chiqadi",
          "Commit main ga tushadi, build sxemada yiqiladi, hech narsa deploy qilinmaydi",
          "CMS maqolani o'chirib tashlaydi",
        ],
        answer: 1,
        why: "Commit'ni CMS yozadi, lekin Deploy workflow CI bilan bir xil build'ni yurgizadi, sxemada esa `source` `min(1)`. Build yiqilsa, jonli sayt oldingi relizda qoladi.",
      },
      fields: {
        category: "Beshtadan biri: announcements, product, research, engineering, company.",
        source: "Fakt qayerdan olingani: reliz, commit, ochiq sahifa.",
        "min(1)": "Kamida bitta manba: bo'sh ro'yxat build xatosi.",
        planned: "Rejalarning mahsulot sahifalarida o'z belgisi bor; yangilik faqat bo'lib o'tgan narsa.",
      },
    },
    build: {
      short: "Build",
      title: "Bitta build buyrug'i, bir nechta to'siq",
      body: "`npm run build` noutbukda ham, CI da ham, deploy job'ida ham bir xil. Astro har bir sahifani uch tilda `site/` ga chizadi. Qotirilgan versiyadagi Sveltia CMS bundle'i `site/admin/` ga ko'chiriladi, `/admin` uni saytning o'z manbasidan yuklasin. Pagefind natijani indekslaydi.\n\nKeyin uchta skript manbani emas, tayyor natijani o'qiydi: aynan nima chiqishini tekshiradi. Nega Astro: tiplangan sxemali kontent kolleksiyalari, sukut bo'yicha nol JavaScript va oddiy fayl serveri bera oladigan statik natija.",
      fields: {
        "astro build": "Faqat statik natija; server rendering ham, yamash kerak bo'lgan runtime ham yo'q.",
        "copy-cms.mjs": "CMS npm'dan qotirilgan versiyada keladi, hech qachon CDN'dan emas.",
        pagefind: "Astro'dan keyin, tayyor HTML ustida ishlaydi.",
        "check-site.mjs": "site/ dagi har bir faylni hech qachon chiqmasligi kerak bo'lgan narsalar uchun o'qiydi.",
        "check-art.mjs": "Har maqolaning o'z generatsiya qilingan rasmi bor; bitta sahifada takrorlansa yiqiladi.",
      },
    },
    gates: {
      short: "To'siqlar",
      title: "check-site: CSP va maxfiylik, natijadan o'qiladi",
      body: "Ochiq sayt `script-src 'self'` bilan chiqadi, shuning uchun har qanday inline skript brauzerda bloklanardi. Buni prodda bilib olish o'rniga check-site build'ni shu yerning o'zida yiqitadi. O'sha o'tish har bir HTML, JS, CSS, JSON va XML faylda ichki IP manzil, tokenga o'xshash satr va maxfiy kalitni qidiradi.\n\nEgasi qo'shimcha taqiqlangan satrlarni `WM_FORBIDDEN` muhit o'zgaruvchisi orqali beradi, ularni ochiq repoga yozmasdan.",
      fields: {
        "inline <script> blocked by CSP": "O'quvchi brauzeridagi jim xato emas, build paytida ushlanadi.",
        "private IP address": "Ichki tarmoq manzillari ochiq sahifaga tegishli emas.",
        "token-like string": "GitHub, GitLab va Slack token prefikslari.",
        WM_FORBIDDEN: "Tashqaridan beriladigan regex, maxfiy satrlar ro'yxatining o'zi ochiq bo'lmasin.",
      },
    },
    satellites: {
      short: "Yo'ldoshlar",
      title: "Brend va dizayn tokenlari o'z repolarida",
      body: "brand reposida belgi, lockup'lar, ranglar va 19.4 soniyalik brend filmi bor. Belgi ikkita V: chapdagisi 65% shaffoflikda, o'ngdagisi to'liq, shuning uchun u ham ikki V, ham bitta W bo'lib o'qiladi. Belgining o'zi w harfi bo'lgani uchun lockup = belgi + \"onmor\". Sayt logo va ikonlarini film chizilgan o'sha geometriya faylidan generatsiya qiladi.\n\ndesign-system reposi saytning tokenlarini `@wonmor/tokens` 0.1.0 sifatida qadoqlaydi: rang, shrift shkalasi, oraliqlar, radius, easing. U hali npm'da yo'q. Komponentlar faqat semantik `--theme-*` tokenlaridan foydalanadi, shuning uchun `.theme-slate` kabi qora band sahifaning istalgan qismida ishlaydi.",
      fields: {
        source: "Haqiqat manbai wonmor.io dagi sahifa; repo uning qisqa nusxasi.",
        hex: "Wonmor Blue faqat belgi uchun; saytning o'zi Paper atrofidagi iliq kulranglarda.",
        leftVOpacity: "Chapdagi och V belgini ham VV, ham W qilib o'qitadi.",
        "--theme-background-primary": "Semantik token: komponent hech qachon xom kulrang yoki hex ishlatmaydi.",
        ".theme-slate": "Semantik tokenlarni shoxchada almashtiradi, qora bo'lim uchun yangi CSS kerak emas.",
      },
    },
    "pr-ci": {
      short: "PR tekshiruvi",
      title: "Har o'zgarish majburiy tekshiruvli pull request",
      body: "CI har bir pull request'da saytni deploy bilan bir xil buyruqda yig'adi. `main` dagi ruleset pull request, squash merge, chiziqli tarix va `build` tekshiruvini talab qiladi. Uni faqat tashkilot adminlari chetlab o'ta oladi, CMS saqlashlari shu yo'ldan yuradi.\n\nWorkflow zerikarli, lekin to'g'ri yo'l bilan mustahkamlangan: faqat o'qish tokeni, commit SHA ga qotirilgan action'lar, checkout'da qoldirilmagan credential, har PR uchun bitta yurish, eskilari bekor qilinadi. Dependabot oyiga bir marta guruhlangan yangilanish taklif qiladi, CODEOWNERS core jamoasidan review so'raydi, OpenSSF Scorecard har hafta yuradi.",
      check: {
        q: "Nega actions/checkout @v7 emas, 40 belgili SHA ga qotiriladi?",
        options: [
          "Tezroq ishlaydi",
          "Tegni boshqa kodga surish mumkin, commit SHA ni emas; Dependabot uni baribir yangilab turadi",
          "GitHub buni talab qiladi",
        ],
        answer: 1,
        why: "Teg bu suriladigan ko'rsatkich. Action reposi egallab olinsa, @v7 ertaga zararli kodni ko'rsatishi mumkin. SHA o'zgarmaydi, `# v7.0.1` izohi va Dependabot esa uni o'qiladigan va yangi qilib turadi.",
      },
      fields: {
        permissions: "Job tokeni repoda faqat o'qiy oladi.",
        concurrency: "PR ga yangi push eski yurishni bekor qiladi.",
        "persist-credentials": "Token keyingi qadamlar topishi uchun .git/config da qoldirilmaydi.",
        ruleset: "main uchun branch himoyasi; majburiy build tekshiruvi, faqat squash.",
        Dependabot: "Oyiga bir marta, guruhlab (astro, shriftlar, qolgani, action'lar), yangilanishlar bir necha PR bo'lib keladi.",
      },
    },
    "old-deploy": {
      short: "Eski deploy",
      title: "Oldin: build fayllari git'da va root shell",
      body: "Birinchi deploy skripti lokal yig'ardi, butun `site/` papkani (851 fayl) commit qilardi va root SSH sessiyasi orqali ko'chirardi, keyin konteynerni qayta yaratardi. Har deploy qisqa javobsiz uzilish edi, har pull request minglab qator generatsiya qilingan HTML olib yurardi, PR ni esa hech narsa avtomatik tekshirmasdi.\n\nwonmortech tashkilotiga ko'chish (PR #15) bularning hammasini almashtirdi.",
      fields: {
        "851 files": "Git'dagi generatsiya natijasi: shovqinli diff va hech kim tahrirlamaydigan fayllarda konfliktlar.",
        root: "Har qanday deploy serverda hamma narsani qila olardi.",
        "--force-recreate": "To'xtat, keyin ishga tushir: restart paytidagi so'rovlar javobsiz qolardi.",
        "no automatic check": "Buzilgan sahifani CI emas, o'quvchilar topardi.",
      },
    },
    receive: {
      short: "Receive",
      title: "Faqat reliz chiqara oladigan kalit",
      body: "Merge'dan keyin Deploy job'i yig'adi, commit SHA ni `site/version.txt` ga yozadi va tarball'ni SSH orqali oqizadi. Serverda kalit `restrict,command=...` bilan bitta skriptga bog'langan: klient nima so'ramasin, faqat `receive` ishlaydi, u esa uchta so'zni tushunadi: deploy, rollback, status.\n\n`receive` arxivni tekshiradi, uni `releases/<sha>` ga ochadi va `releases/current` ni rename bilan almashtiradi, bu atomar: Caddy yo eski relizni, yo yangisini beradi, hech qachon ikkalasining yarmini emas. Yangi Caddyfile yuklashdan oldin tekshiriladi. Nega shunday: CI uchun root shell yo'q, konteyner restart yo'q, oldingi reliz esa bir zumda qaytish uchun diskda turibdi.",
      check: {
        q: "CI deploy kaliti sizib chiqdi. Hujumchi u bilan nima qila oladi?",
        options: [
          "Serverda root shell ochadi",
          "Faqat receive'ni chaqiradi: tekshiruvdan o'tadigan arxivni chiqaradi, orqaga qaytaradi yoki jonli revisiyani o'qiydi",
          "Serverdagi boshqa saytlarni o'qiydi",
        ],
        answer: 1,
        why: "Forced command klient so'ragan narsaning o'rnini egallaydi. Zarar sayt shaklidagi arxivni chiqarish bilan cheklanadi: jiddiy, lekin ko'rinadigan va qaytariladigan; kalitni esa boshqa hech narsaga tegmasdan almashtirish mumkin.",
      },
      fields: {
        "command=": "authorized_keys dagi forced command: bu kalit receive'ni ishlatadi va boshqa hech narsani.",
        "version.txt": "Arxiv o'zi da'vo qilgan SHA ni olib yurishi shart, eski build sirg'alib kirolmaydi.",
        "300 MB": "stdin dan o'qiladigan hajm chegarasi.",
        "mv -Tf": "Eski symlink ustiga rename(2): almashinuv atomar.",
        "caddy validate": "Buzilgan Caddyfile saytni yiqitishdan oldin rad etiladi.",
        "5 newest": "Eski relizlar tozalanadi, lekin jonlisi va oldingisi hech qachon.",
      },
    },
    verify: {
      short: "Tasdiq",
      title: "Jonli sayt aytmaguncha hech narsaga ishonma",
      body: "SSH dan \"exit code 0\" isbot emas. Job ochiq domen orqali `/version.txt` ni u merge qilingan SHA ni qaytarmaguncha so'raydi: bu edge, konteyner va symlink hammasi yangi relizni ko'rsatayotganini isbotlaydi. Keyin 200 qaytarishi shart bo'lgan o'n oltita yo'lni, 404 qaytarishi shart bo'lgan bittasini so'raydi va ochiq CSP kengaymaganini tekshiradi.\n\nArxiv yuborilgandan keyin shulardan biri yiqilsa, job o'sha forced command'ni `rollback` bilan chaqiradi, u `current` ni oldingi relizga qaytaradi.",
      check: {
        q: "Nega \"bosh sahifa 200 qaytaradi\" emas, /version.txt tekshiriladi?",
        options: [
          "version.txt kichikroq",
          "Eski reliz ham 200 qaytaradi; o'quvchi yangisini olayotganini faqat SHA isbotlaydi",
          "Bosh sahifa keshlangan",
        ],
        answer: 1,
        why: "Muvaffaqiyatsiz almashinuv oldingi relizni onlayn va mutlaqo sog' qoldiradi. 200 o'tib ketardi; berilayotgan SHA ni merge qilingani bilan solishtirish deploy o'tmaganini aniqlaydi.",
      },
      fields: {
        "version.txt": "Build'da yoziladi, ikki marta tekshiriladi: receive'da va ochiq URL orqali.",
        GITHUB_SHA: "Merge qilingan commit: aynan u jonli bo'lishi kerak.",
        "404": "Yo'q sahifa yo'qligicha qolishi kerak, bosh sahifaga tushib qolmasin.",
        "connect-src": "Ochiq CSP boshqa manbalarga ulanishni hamon taqiqlashi shart.",
        rollback: "O'sha kalit, o'sha skript: oldingi relizga bitta so'z bilan.",
      },
    },
    lighthouse: {
      short: "Lighthouse",
      title: "main ga har push'da sifat byudjetlari",
      body: "Alohida workflow saytni yig'adi va Lighthouse CI ni oltita namunaviy sahifada yurgizadi, har biri uch marta, mediana bo'yicha baholanadi. Accessibility, best practices va SEO 100 bo'lishi shart; performance kamida 85, chunki umumiy CI runner'lari shovqinli.\n\nKeshlash ham shu byudjetning bir qismi: Astro yig'ilgan asset'larga kontent xeshli nom beradi, shuning uchun Caddy `/assets/*` ni bir yilga immutable qilib keshlay oladi, sahifa va feed'lar esa har yuklanishda qayta tekshiriladi.",
      check: {
        q: "Nega /assets/* bir yil keshlanishi mumkin, sahifalar esa no-cache?",
        options: [
          "Asset'lar hech qachon o'zgarmaydi",
          "O'zgargan asset yangi xeshli nom oladi; sahifa URL'i o'zgarmaydi, shuning uchun uni qayta tekshirish kerak",
          "Brauzerlar HTML da Cache-Control ni e'tiborsiz qoldiradi",
        ],
        answer: 1,
        why: "Xeshli asset'ning URL'i mazmuni bilan birga o'zgaradi, keshdagi nusxa hech qachon noto'g'ri bo'lolmaydi. Sahifa URL'i deploy'lar orasida bir xil qoladi, brauzer har safar so'rashi kerak.",
      },
      fields: {
        numberOfRuns: "Bitta sekin yurishni tekislash uchun har sahifaga uch yurish.",
        "categories:performance": "Kamida 0.85: haqiqiy, lekin runner shovqiniga chidamli.",
        aggregationMethod: "Eng yaxshi yoki eng yomoni emas, mediana yurish hal qiladi.",
        "categories:accessibility": "Mukammal 1 bo'lishi shart: accessibility regressiyasi to'xtatadi.",
        immutable: "Brauzer xeshli asset'ni hatto qayta tekshirmaydi ham.",
      },
    },
    demos: {
      short: "Demolar",
      title: "Mahsulotlarning namunaviy ma'lumotdagi jonli demolari",
      body: "`/demo` 24 ta mahsulotni namunaviy ma'lumotda ishlaydigan statik nusxa sifatida ko'rsatadi; ularni har bir mahsulot reposidagi demo pull request'lar yasagan, orasida gym kundaligi va Halvet sayti ham bor. Mehmon akkauntsiz haqiqiy interfeysni bosib ko'ra oladi.\n\nUlar o'sha relizning ichida, lekin o'z qoidalari bilan yashaydi: o'z CSP si, `noindex` va client-side yo'nalishlar ishlashi uchun har demoga o'z `index.html` zaxirasi. Maxfiylik skani baribir demoning 1297 faylini ham o'qiydi, chunki adashgan token aynan ko'chirilgan natijada yashirinadi.",
      fields: {
        "24": "Mahsulot demolari va uch tildagi galereya sahifasi.",
        "index.html": "/demo/gym/plan kabi yo'l demoning o'z ilova qobig'ini ochadi.",
        noindex: "Demolar qidiruv natijasi emas; mahsulot sahifalari natija.",
        "1297": "Har bir demo fayli token va maxfiy kalit skanidan o'tadi.",
        "256 pages": "Demolar qo'shilgandan keyingi saytning o'z sahifalari.",
      },
    },
    org: {
      short: "Tashkilot",
      title: "Sayt atrofidagi tashkilot",
      body: "`.github` reposida tashkilot profili va har bir repo uchun sukut bo'yicha contributing qo'llanmasi, xulq kodeksi va xavfsizlik siyosati turadi. Uchta jamoa (core, maintainers, contributors) admin, maintain va write huquqlariga mos; CODEOWNERS core'ni ko'rsatadi. Har bir repoda ruleset, push protection'li secret scanning va yopiq zaiflik xabari yoqilgan.\n\nopen-source-fund reposi O'zbekistondagi mustaqil open-source quruvchilar uchun rejadagi fondni tasvirlaydi. Uning birinchi qatori fond ochiq emasligini aytadi: ariza qabul qilinmaydi, hech kimga pul va'da qilinmagan, chunki Wonmor hali yuridik shaxs emas. Mahsulot kodining o'zi dtwinuz tashkilotida; wonmortech sayt va umumiy ochiq materiallarni saqlaydi.",
      fields: {
        ".github": "Bu yerdagi community fayllari o'zinikisi yo'q har bir repoga tatbiq bo'ladi.",
        teams: "Huquqlar odamga emas, jamoaga beriladi.",
        "push protection": "Ma'lum formatdagi siri bor push yetib bormasdan rad etiladi.",
        GITHUB_TOKEN: "Workflow ko'proq so'ramasa, faqat o'qish.",
        PLANNED: "Halollik qoidasi: reja birinchi qatordayoq reja deb yoziladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Ikki tashkilot: dtwinuz'da mahsulot kodi, wonmortech'da sayt, tokenlar, brend, fond va community fayllari. 2) Sayt uch tildagi statik Astro; server faqat fayl beradi. 3) O'quvchi saqlangan mavzu va tilni chizishdan oldingi skriptdan, qidiruvni esa serversiz oladi. 4) Muharrir Sveltia CMS dan foydalanadi: har saqlash commit, baza esa reponing o'zi. 5) Hamma joyda bitta build buyrug'i, undan keyin natijani o'qiydigan to'siqlar: manbali sxema, CSP, maxfiylik skani, havolalar, illyustratsiyalar. 6) Har o'zgarish majburiy build tekshiruvli PR, qotirilgan action'lar va faqat o'qish tokenlari. 7) Deploy forced-command kalit orqali: releases/<sha>, atomar symlink almashinuvi, tekshirilgan Caddy konfigi, versiya tekshiruvi, smoke test, avtomatik rollback. 8) Lighthouse CI accessibility, best practices va SEO ni 100 da ushlab turadi.",
    },
  },
  scenarios: {
    "stale-theme": {
      label: "Mavzu unutildi",
      steps: {
        "theme-lost": {
          short: "Yo'qoldi",
          title: "Mavzu sahifadan sahifaga o'tmaydi",
          body: "Bir kunda ikki reliz mavzu qo'shdi: PR #10 uchta, PR #12 yana to'rtta. Mehmonlar Paper'ni tanlab keyingi sahifaga o'tishdi va yana tizim mavzusini olishdi. Sahifa HTML i yangi edi, lekin `/js/boot.js` oddiy URL va bir kunlik brauzer keshi bilan berilardi, shuning uchun ko'p brauzerlar yangi nomlarni bilmaydigan kechagi nusxani ishlatib turdi.",
          check: {
            q: "Nega HTML yangilandi-yu, skript yangilanmadi?",
            options: [
              "Skript buzilgan edi",
              "HTML no-cache, skript esa o'zgarmagan URL'da max-age=86400 bilan edi",
              "CDN sekin edi",
            ],
            answer: 1,
            why: "max-age bilan brauzer bir kun davomida serverdan so'ramaydi ham. URL bir xil qolsa, serverdagi yangi fayl unga ko'rinmaydi.",
          },
          fields: {
            "Cache-Control": "Caddyfile'da /js/* uchun qo'yilgan: bir kun.",
            "max-age=86400": "24 soat davomida brauzer so'ramasdan o'z nusxasini ishlatadi.",
            "wm-theme": "Saqlangan tanlov to'g'ri edi; eski skript uni shunchaki tanimadi.",
          },
        },
        "theme-fix": {
          short: "Xesh URL",
          title: "URL'da kontent xeshi",
          body: "Endi layout build paytida `boot.js` ning qisqa SHA-256 xeshini hisoblaydi va `/js/boot.js?v=<hash>` ni yuklaydi. Fayldagi har qanday o'zgarish URL'ni o'zgartiradi, uning uchun keshdagi nusxa javob berolmaydi va bir kunlik kesh yana xavfsiz. Ikkinchi to'r sifatida header skripti eski boot skript o'tkazib yuborgan saqlangan mavzuni qayta qo'llaydi: kech bitta qayta chizish noto'g'ri mavzudan yaxshi.",
          fields: {
            sha256: "Build paytida faylning o'zidan hisoblanadi.",
            "v=": "Yangi query satri brauzer keshi uchun yangi URL.",
            "header.ts": "Hali ishlayotgan kamdan-kam eski nusxa uchun zaxira.",
            "by hand": "Qo'lda yozilgan versiya unutiladi; xesh unutilmaydi.",
          },
        },
      },
    },
    "honest-numbers": {
      label: "Halol raqamlar",
      steps: {
        "numbers-wrong": {
          short: "Noto'g'ri",
          title: "O'quvchi qayta chiqara olmaydigan bosh sahifa raqamlari",
          body: "Bosh sahifada \"635 merged PRs · Public GitHub search\" va \"15 live products\" yozilgan edi. Anonim GitHub qidiruvi 130 qaytaradi, chunki dtwinuz'ning ko'p repolari yopiq; egasining o'z qidiruvi esa 648. Ma'lumot faylidagi 16 mahsulotdan faqat 4 tasi haqiqatan ishlab turgan edi. Ikkala raqam ham TypeScript fayliga qo'lda ko'chirilgan edi.",
          check: {
            q: "Halol tuzatish qaysi?",
            options: [
              "Ochiq raqamni, 130 ni ko'rsatish",
              "To'liq kirish bilan sanash, shunday deb belgilash, sanani yozish, mahsulot sonini esa ma'lumotdan olish",
              "Barcha raqamlarni olib tashlash",
            ],
            answer: 1,
            why: "Raqam haqiqiy, yorlig'i noto'g'ri edi. Usuli yonida yozilgan sanali sanoqni tekshirsa bo'ladi; manbasi noto'g'ri qo'lda yozilgan raqamni emas.",
          },
          fields: {
            "130": "Kirish huquqi yo'q har kim ko'radigan son.",
            "648": "O'sha kuni egasi kirishi bilan o'sha so'rov.",
            "private repositories": "Sanalgan, lekin yorliq ochiq qidiruvni va'da qilgan.",
            "by hand": "Skript yo'q, sana yo'q, qayta sanash imkoni yo'q.",
          },
        },
        "numbers-fix": {
          short: "Sanaldi",
          title: "Egasi yurgizadigan, ma'lumot sifatida commit qilinadigan sanoq skripti",
          body: "`tools/count-numbers.mjs` GitHub CLI orqali repolar, merge qilingan pull request'lar va relizlarni sanaydi va `src/data/numbers.json` ni sana bilan yozadi. Uni egasi yurgizadi va faylni commit qiladi. CI uni ataylab hech qachon yurgizmaydi: yopiq repolarga kirishsiz build jimgina kichikroq raqamlarni chiqarib yuborardi. Mahsulot soni endi `products.json` dan hisoblanadi.",
          fields: {
            asOf: "Sanoq sanasi, raqamlar bilan birga ko'rsatiladi.",
            mergedPRs: "2026-11-14 da 659, to'liq kirish bilan sanalgan.",
            releases: "Barcha repolardagi qoralama bo'lmagan relizlar.",
            "CI never runs it": "Qisman ko'rinishdan olingan noto'g'ri raqam sanali raqamdan yomonroq.",
          },
        },
      },
    },
  },
};

export default text;
