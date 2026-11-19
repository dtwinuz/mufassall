import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: dtwinuz manzarasi",
  summary:
    "Har loyiha ikki GitHub tashkilotida turadi: dtwinuz (mahsulotlar, asboblar va bitg kiritish usuli) va wonmortech (studiya sayti, ochiq ishonch asboblari va jamoat foydasi loyihalari). Dars ularni bitta yetkazib berish tizimi sifatida ko'radi. Avval u yerda nima borligini turi bo'yicha guruhlab ko'rsatadi, keyin tashkilotlar qanday boshqarilishini: teamlar, CODEOWNERS, faqat squash merge, custom property'lar va Free tarif chegaralari. So'ng o'zgarish yo'lidan boradi: kichik Actions budjeti to'laydigan CI, qadalgan action'lar va guruhli Dependabot, GHCR'dagi image'lar, uzilishsiz deploy va A+ xavfsizlik sarlavhalari bilan bitta umumiy edge proxy, OpenSSF tekshiruvlari va demo standarti. Ssenariylar - tashkilot darajasidagi haqiqiy hodisalar.",
  learn: [
    "Ikki tashkilotda nima bor, turi bo'yicha guruhlangan, va nega private repolar bu yerda faqat ochiq tavsifi bilan chiqadi",
    "Free tarifda boshqaruv: teamlar, CODEOWNERS, faqat squash merge, custom property'lar va private repolar nimani olmaydi",
    "Kichik Actions budjeti ish tartibini qanday shakllantiradi: bitta so'rov, bitta PR, bitta CI run",
    "Supply chain: SHA'ga qadalgan action'lar, cooldown'li oylik guruhli Dependabot, SBOM va provenance'li GHCR image'lar",
    "Har sayt uchun bitta umumiy edge proxy: atomik symlink deploy, majburiy CSP va security.txt, va bunga olib kelgan hodisalar",
  ],
  nodes: {
    dev: "Dasturchi",
    gh: "GitHub org'lar",
    g1: "Messenjer",
    g2: "Savdo, biznes",
    g3: "Hayot, ta'lim",
    g4: "Dev, ops asbob",
    g5: "bitg",
    g6: "Org fayllari",
    w1: "Studiya, brend",
    w2: "Ochiq ishonch",
    w3: "Jamoat foydasi",
    w4: "Muhandislik",
    actions: "GitHub Actions",
    ghcr: "GHCR",
    server: "Server",
    edge: "Edge Caddy",
    users: "Mehmonlar",
    openssf: "OpenSSF",
  },
  metrics: {
    lowest: "Saytlarning eng past Observatory bahosi",
    budget: "Oyiga CI uchun mavjud pul",
    prs: "Bitta so'rov uchun PR'lar",
    denied: "Reliz push'ini rad etadigan package'lar",
    cut: "Deploy uzgan yuklashlar",
    nocert: "Sertifikatsiz hostlar",
  },
  steps: {
    intro: {
      short: "Ikki org",
      title: "Ikki tashkilot, bitta yetkazib berish tizimi",
      body: "dtwinuz mahsulotlarni saqlaydi: korporativ messenjer, savdo asboblari, shaxsiy ilovalar, dasturchi asboblari va 2026 yilgi o'zbek lotin alifbosi uchun bitg kiritish usuli. wonmortech studiyani saqlaydi: wonmor.io sayti, dizayn tizimi, ochiq ishonch asboblari va jamoat foydasi loyihalari. Ikkalasi bir xil qoidalar, bir xil CI naqshlari, bir xil edge proxy va bir xil demo standartidan foydalanadi.\n\ndtwinuz Free tarifida, 30 repo bilan: 11 public va 19 private. Har a'zo uchun ikki bosqichli autentifikatsiya majburiy, a'zolar public repo yarata olmaydi, standart huquq - read. Yozish huquqi faqat teamlar orqali beriladi.",
      fields: {
        plan: "Free: pullik o'rinlar yo'q, private repolar nimani majburlay olishini shu hal qiladi.",
        public_repos: "11 public: kodi, issue'lari va sahifalari ochiq.",
        total_private_repos: "19 private: dars ularni faqat ochiq bir qatorli tavsifi bilan ko'rsatadi.",
        two_factor_requirement_enabled: "2FA'siz a'zo tashkilotdan chiqariladi.",
        default_repository_permission: "read: yozish faqat team orqali.",
      },
    },
    products: {
      short: "dtwinuz",
      title: "dtwinuz'da nima bor, turi bo'yicha",
      body: "dtwinuz'ning har loyihasi, turi bo'yicha. Messenjer: TeleTwin, korxona papkali korporativ Telegram - server, web klient va desktop klient. Savdo va biznes: operobot2 AI savdo xizmati va uning salafi, restoran sayti, quruvchilar sayti, kiyim katalogi. Hayot va ta'lim: namozga tayangan reja, mashg'ulot kundaligi, klinik bilim bazasi, masjid xaritasi va shu kurs platformasi. Dasturchi va ops asboblari: tunnellar, MCP gateway, bug yig'ish, 3D model kutubxonasi, davomat, ofis raqamli egizagi va mahsulot shabloni. bitg va uning paketlari. Org fayllari.\n\nPrivate repolar faqat tashkilot sahifasida allaqachon ochiq turgan tavsif bilan chiqadi. Ikki repo loyiha emas (zaxira ombori va ichki kontent reposi), ular tashlab ketilgan.",
      fields: {
        messaging: "TeleTwin: web klient public, server va desktop fork private.",
        sales: "operobot2 va halvet public; qolganlari private.",
        life: "gym-dtwin va mufassall public.",
        "dev tools": "Hammasi private; demolari wonmor.io/demo da ochiq.",
        bitg: "Eng ochiq loyiha: kiritish usuli, Homebrew tap, Scoop bucket, Hunspell lug'ati.",
        org: "Profil va community fayllar, Allstar siyosatlari, a'zolar profili, portfolio.",
      },
    },
    wonmortech: {
      short: "wonmortech",
      title: "wonmortech'da nima bor: hammasi public",
      body: "wonmortech'ning 13 reposi ham public. Studiya guruhi - uch tildagi wonmor.io sayti, org profili, brend, dizayn tokenlari, sayt postlari ortidagi tadqiqot yozuvlari va hali ochilmagan rejalashtirilgan open-source fond. Ishonch guruhida uchta asbob: muhr (Bitcoin va ochiq Merkle jurnaliga bog'langan vaqt isbotlari), sanad (tekshiriladigan sertifikatlar) va shaffof (Merkle bilan muhrlangan xayriya hisobotlari). Jamoat foydasi: kar va eshituvchi odamlar uchun tilouz, va uz-open-data. Muhandislik: deploy-kit va vutric.\n\nIkkala tashkilotning jonli demolari, private dtwinuz loyihalari ham, wonmor.io/demo ostida beriladi.",
      fields: {
        studio: "Ochiq yuz: sayt, brend, tokenlar va har post ortidagi tadqiqot.",
        trust: "Token yo'q, pul bilan ishlanmaydi: istalgan kishi tekshira oladigan ochiq isbotlar.",
        "public good": "Ochiq ma'lumotli notijorat loyihalar.",
        engineering: "Qayta ishlatiladigan qismlar: deploy-kit - shu darsdagi edge deploy naqshi.",
        "wonmor.io/demo": "Har jonli demo uchun bitta joy, private repolar uchun ham.",
      },
    },
    governance: {
      short: "Qoidalar",
      title: "Boshqaruv: teamlar, CODEOWNERS, faqat squash",
      body: "Barcha huquqlarni uchta team tashiydi: core (admin), maintainers (maintain) va contributors (write). Har repoda `* @dtwinuz/core` bilan `CODEOWNERS` bor, shuning uchun har yo'lning egasi core. Merge faqat squash: merge commit va rebase merge o'chirilgan, squash sarlavhasi - PR sarlavhasi, merge'dan keyin branch o'chiriladi. Bitta PR main branch'da bitta commit bo'ladi: tarix o'qiladi, revert oson.\n\nRepo sozlamalari buni to'g'ridan-to'g'ri ko'rsatadi, bu yerda teletwin-web uchun.",
      check: {
        q: "Nega PR sarlavhasi commit sarlavhasi bo'lgan faqat squash merge?",
        options: [
          "Repo kichikroq bo'ladi",
          "Bitta PR - main'da bitta commit: tarix PR ro'yxatidek o'qiladi, bitta revert bitta o'zgarishni qaytaradi",
          "Free tarifda GitHub buni talab qiladi",
        ],
        answer: 1,
        why: "Oraliq commit'lar PR ichida qoladi. Main branch har commit'da bitta ko'rib chiqilgan birlikni saqlaydi, revert yoki bisect'ga aynan shu kerak.",
      },
      fields: {
        allow_squash_merge: "Qolgan yagona merge tugmasi.",
        allow_merge_commit: "O'chiq: main'da merge pufakchalari yo'q.",
        allow_rebase_merge: "O'chiq: alohida oraliq commit'lar main'ga tushmaydi.",
        squash_merge_commit_title: "PR_TITLE: ko'rib chiqilgan sarlavha commit sarlavhasi bo'ladi.",
        delete_branch_on_merge: "Merge qilingan branch'lar o'zi yo'qoladi.",
      },
    },
    properties: {
      short: "Property'lar",
      title: "Custom property'lar, issue turlari va Project'lar",
      body: "Har repo beshta org darajasidagi custom property oladi: product, tier (production, mvp, prototype yoki internal), stack, deploy (vps-compose, vps-ghcr, vps-static, client-release yoki none) va live_url. Ular bir qarashda repo nima ekanini, qanchalik yetilganini va qanday yetkazilishini aytadi va butun tashkilot bo'ylab filtrlanadi. wonmortech xuddi shu g'oyani kind, tier, stack, deploy va live_url bilan ishlatadi.\n\nIssue turlari tashkilot uchun bir marta belgilangan: Task, Bug, Feature, Epic, Security, Docs va Chore. Org darajasidagi Project doskalari kattaroq mahsulotlarni kuzatadi, har biriga bittadan.",
      fields: {
        product: "Bitta mahsulot repolarini guruhlaydi, masalan uchta TeleTwin reposi.",
        tier: "Bu yerda mvp: jonli va ishlatiladi, hali o'smoqda.",
        stack: "Ko'p tanlov: bu repo TypeScript, Rust qobiq va Android.",
        deploy: "vps-static: edge proxy ortidagi statik build.",
        live_url: "Mahsulot qayerda ishlaydi.",
      },
    },
    freeplan: {
      short: "Free tarif",
      title: "Free tarif private repolarga nimani bermaydi",
      body: "Free tarifda ruleset va branch protection faqat public repolarda ishlaydi. Private repo ruleset so'roviga 403 qaytaradi, u yerdagi CODEOWNERS o'qiladi, lekin review so'ralmaydi. Shuning uchun public repolarda qoidalarni server majburlaydi: himoyalangan `v*` reliz teglari, squash va majburiy tekshiruvli PR'lar. Private repolarda himoya - team huquqlari, hujjat sifatida CODEOWNERS va PR orqali ishlash odati.\n\nBu ongli tanlov: tashkilot o'rinlar uchun emas, CI daqiqalari uchun to'laydi.",
      check: {
        q: "Reliz tegini hech kim siljita olmaydigan qilib qayerda himoyalash mumkin?",
        options: [
          "Istalgan repoda, private yoki public",
          "Bu tarifda faqat public repolarda: private'lar ruleset uchun 403 oladi",
          "Hech qayerda, teglarni har doim siljitish mumkin",
        ],
        answer: 1,
        why: "Private repolarda ruleset pullik tarif talab qiladi. teletwin-web public bo'lgani uchun v* teglarini himoyalaydi; private repo jarayonga tayanishi kerak.",
      },
      fields: {
        "403": "API private repo uchun ruleset'ni rad etadi.",
        "private repo": "Server qoidalari emas, team huquqlari va odat.",
        CODEOWNERS: "Baribir foydali: kim nimaga egalik qilishi xaritasi.",
        "public repo": "To'liq ruleset'lar, pullik tarifdagidek.",
        "v*": "Siljitib ham, o'chirib ham bo'lmaydigan reliz teglari.",
      },
    },
    actions: {
      short: "CI budjeti",
      title: "CI puli: kichik budjet va har so'rovga bitta PR",
      body: "Public repolar bepul runner'larda ishlaydi. Private repolar oyiga 2,000 Linux daqiqani tekin oladi, taxminan $12, tashkilot esa ustiga stop usage yoqilgan $10 budjet qo'shadi, shuning uchun nazoratdan chiqqan workflow hisob yozmaydi, to'xtaydi. Codespaces, Packages va LFS budjetlari ataylab $0.\n\nBudjet ish qoidasini tug'diradi: bitta so'rov bitta branch, bitta PR, bitta CI run, bitta merge va bitta deploy'ga tushadi. Commit'lar branch'da yig'iladi, push'lar ham kamaytiriladi, chunki har push yangi run boshlaydi.",
      check: {
        q: "So'rov 4 job'li CI'li bitta private repoda oltita kichik tuzatish talab qiladi. Eng arzon to'g'ri yo'l qaysi?",
        options: [
          "Oltita PR, har tuzatishga bittadan, ko'rib chiqish oson bo'lsin",
          "Oltita commit'li bitta branch va bo'limma-bo'lim tavsifli bitta PR",
          "Har tuzatishni to'g'ridan-to'g'ri main'ga push qilish",
        ],
        answer: 1,
        why: "Oltita PR oltita to'liq CI run va main'da oltita run turadi. Bitta PR commit'larni ko'rib chiqish uchun alohida saqlaydi va bitta run turadi.",
      },
      fields: {
        "public repos": "Standart runner'lar tekin.",
        "2,000 Linux minutes": "Private repolar uchun oylik limit.",
        $10: "Tashkilotning Actions uchun o'z oylik budjeti.",
        "stop usage": "Budjet tugasa, job'lar ko'proq hisob yozish o'rniga to'xtaydi.",
        "one PR": "Daqiqalarni budjet ichida ushlaydigan qoida.",
      },
    },
    supply: {
      short: "Supply chain",
      title: "Supply chain: qadalgan action'lar va xotirjam yangilanishlar",
      body: "Tashkilot har action to'liq commit SHA'ga qadalishini talab qiladi (`sha_pinning_required`), shuning uchun siljitilgan teg workflow nimani yurgizishini o'zgartira olmaydi. Workflow'lar `persist-credentials: false` bilan checkout qiladi, job'ga ko'proq kerak bo'lmasa faqat o'qish huquqida qoladi va zizmor bilan audit qilinadi.\n\nDependabot oyiga bir marta, ekotizim bo'yicha guruhlab, 7 kunlik cooldown bilan ishlaydi: barcha action yangilanishlariga bitta PR, npm'ga bitta, cargo'ga bitta, gradle'ga bitta, va bir haftadan yosh versiya yo'q. Kamroq PR - kamroq CI run ham.",
      fields: {
        monthly: "Kichik PR'lar oqimi o'rniga oyiga bitta yangilanish raundi.",
        cooldown: "Yangi reliz Dependabot taklif qilishidan oldin 7 kunlik bo'lishi kerak.",
        groups: "Bitta ekotizimning barcha yangilanishlari bitta PR'da.",
        sha_pinning_required: "Org sozlamasi: qadalmagan action'li workflow ishlamaydi.",
        zizmor: "Workflow fayllarini xavfli naqshlar uchun statik audit.",
      },
    },
    ghcr: {
      short: "GHCR",
      title: "SBOM va provenance bilan GHCR'dagi image'lar",
      body: "Konteyner sifatida yetkaziladigan mahsulotlar image'ni reliz workflow'ida build qiladi va GitHub Container Registry'ga `ghcr.io/dtwinuz/<repo>/<name>` ko'rinishida push qiladi. Mahsulot shabloni source label'ni qo'yadi, SBOM va build provenance'ni biriktiradi va image'ni Trivy bilan skanerlaydi. Server faqat Docker Compose bilan pull qiladi va qayta ishga tushiradi; bu `vps-ghcr` deploy property'si.\n\nBitta tafsilot muhim: package repo'ning Actions'iga yozish huquqini berishi kerak, aks holda push rad etiladi. Ssenariy package'lar tashkilotga qo'lda ko'chirilganda nima bo'lganini ko'rsatadi.",
      check: {
        q: "Image'ga biriktirilgan build provenance nimani isbotlaydi?",
        options: [
          "Image'da zaifliklar yo'qligini",
          "Aynan shu image'ni qaysi workflow run va commit build qilganini",
          "Server uni pull qilganini",
        ],
        answer: 1,
        why: "Provenance - artefakt qanday build qilingani haqidagi imzolangan bayonot. Ma'lum zaifliklarni provenance emas, Trivy skani qidiradi.",
      },
      fields: {
        image: "Har mahsulot image'i uchun bitta nom naqshi.",
        label: "org.opencontainers.image.source image'ni o'z reposiga bog'laydi.",
        SBOM: "Image ichidagi har paket ro'yxati.",
        Trivy: "Build qilingan image'ni ma'lum zaifliklar uchun skanerlaydi.",
        "vps-ghcr": "Shu yo'l bilan yetkaziladigan mahsulotlar deploy property'si.",
      },
    },
    edge: {
      short: "Edge",
      title: "Har sayt uchun bitta edge proxy",
      body: "Ikkala tashkilotning har sayti oldida bitta Caddy turadi: *.dtwin.uz mahsulotlari, *.wonmor.io studiya saytlari va o'z domenidagi bitg.uz. U har host uchun sertifikatni avtomatik oladi va har hostni xususiy Docker tarmog'i orqali o'z konteyneriga yo'naltiradi; konteynerlarning ochiq porti yo'q.\n\nEdge umumiy bo'lgani uchun u yerdagi xato bir vaqtda har saytga ta'sir qiladi. Shuning uchun edge faqat PR, merge va o'z deploy skripti orqali o'zgaradi; serverda qo'lda tahrir taqiqlangan. 2026-11-13 gacha xavfsizlik sarlavhalari saytdan saytga farq qilardi, bitta sayt Mozilla Observatory'da atigi D (30) olgan edi.",
      fields: {
        "*.dtwin.uz": "Mahsulot saytlari.",
        "*.wonmor.io": "Studiya va ishonch asboblari.",
        certificates: "Caddy har host uchun beradi va yangilaydi.",
        rule: "Edge o'zgarishi PR, merge, deploy: hech qachon qo'lda tahrir emas.",
        Observatory: "Mozilla sarlavha skaneri: eng pasti D edi.",
      },
    },
    zerodt: {
      short: "Qayta ishga tushirmasdan",
      title: "Uzilishsiz statik deploy: relizlar va bitta symlink",
      body: "Ochiq `wonmortech/deploy-kit` edge va statik saytlar hozir ishlatadigan naqshni tasvirlaydi. Reliz eskisi yonidagi o'z papkasiga yuklanadi. Caddy yangi reliz config'ini tekshiradi. Keyin `mv -T` `current` symlink'ini bitta atomik rename bilan almashtiradi, `caddy reload` esa uni silliq qo'llaydi: ochiq ulanishlar eski fayllarda ishlashda davom etadi. Health check yangi relizni tasdiqlash uchun `version.txt` ni o'qiydi. Oxirgi uchta reliz saqlanadi, shuning uchun rollback - yana bitta symlink almashtirish va reload.\n\n`grace_period` ataylab qo'yilmagan, chunki Caddy uni reload'da ham qo'llaydi va sekin yuklashlarni kesardi.",
      check: {
        q: "Nega yangi fayllarni eskisi ustiga ko'chirish o'rniga symlink almashtiriladi?",
        options: [
          "Linux'da ko'chirish sekinroq",
          "Rename atomik: mehmon butun eski yoki butun yangi relizni ko'radi, hech qachon aralashini emas, rollback esa yana bitta rename",
          "Caddy ko'chirilgan fayllarni bera olmaydi",
        ],
        answer: 1,
        why: "Faylma-fayl ko'chirish yarim yangi sahifalar va eski asset'lar bilan oyna qoldiradi. rename(2) havolani bir qadamda almashtiradi.",
      },
      fields: {
        releases: "Har relizga bitta papka, commit va vaqt bilan nomlangan.",
        "caddy validate": "Buzuq config hech qachon jonli bo'lmaydi.",
        rename: "rename(2) bir fayl tizimida atomik.",
        "caddy reload": "Silliq: qayta ishga tushirish yo'q, ulanishlar uzilmaydi.",
        KEEP_RELEASES: "3: tez rollback uchun yetarli.",
        grace_period: "Ataylab qo'yilmagan: u uzun yuklashlarni tugatardi.",
      },
    },
    headers: {
      short: "Sarlavhalar",
      title: "Xavfsizlik sarlavhalari: hamma joyda majburiy CSP va security.txt",
      body: "Edge PR #336 (2026-11-13) umumiy Caddy snippet'lari orqali har saytga majburiy Content Security Policy va `security.txt` berdi. Ular bilan HSTS, nosniff, frame taqiqi, qat'iy referrer siyosati va permissions siyosati keladi. Observatory baholari C, D, B va B+ dan har saytda A+ ga o'tdi, eng past ball endi 100.\n\nbitg.uz javobi to'plamni ko'rsatadi. Har saytning CSP'si faqat o'sha sayt yuklaydigan narsani sanaydi; bitg.uz brauzerdagi konverteri uchun WebAssembly'ga va o'z analitika hostiga ruxsat beradi.",
      fields: {
        "Content-Security-Policy": "Faqat hisobot emas, majburiy: boshqa origin'dan skript ishlamaydi.",
        "Strict-Transport-Security": "Brauzerlar bir yil faqat HTTPS ishlatadi.",
        nosniff: "Brauzer e'lon qilingan kontent turiga ishonadi.",
        DENY: "Hech qaysi sayt bu sahifalarni frame ichiga ololmaydi.",
        "security.txt": "Zaiflik haqida qayerga xabar berish, yangilash kerak bo'lgan muddat bilan.",
      },
    },
    openssf: {
      short: "OpenSSF",
      title: "OpenSSF: Allstar, Scorecard va badge'lar",
      body: "OpenSSF Allstar `dtwinuz/.allstar` da saqlangan siyosatlar bilan har public dtwinuz reposini kuzatadi. Private, arxivlangan va fork repolar chiqarib tashlangan. Scorecard siyosati Token-Permissions yoki Vulnerabilities 8 dan past bo'lsa issue ochadi. Binary-artifacts siyosati to'rtta nomlangan faylga ruxsat beradi, har birining ma'lum upstream manbasi bor: Gradle wrapper va upstream Telegram Web A bilan keladigan uchta WebAssembly build. Boshqa siyosatlar branch protection, CODEOWNERS, xavfli workflow'lar va secret scanning'ni qamraydi.\n\nBuning ustiga loyihalar OpenSSF Best Practices badge'ini oladi: bitg Gold'ga, muhr, sanad va shaffof Silver'ga yetgan.",
      check: {
        q: "Nega binary-artifacts tekshiruvini o'chirish o'rniga har ruxsat etilgan binar fayl nomlanadi?",
        options: [
          "Allstar'ni o'chirib bo'lmaydi",
          "Har yangi binar baribir issue ko'taradi; faqat ma'lum, hujjatlangan manbali fayllarga ruxsat",
          "Nomlangan fayllar kichikroq",
        ],
        answer: 1,
        why: "Umumiy o'chirish PR'ga yashirincha qo'shilgan binarni yashirardi. Qisqa nomli ro'yxat qolgan hamma narsa uchun signalni saqlaydi.",
      },
      fields: {
        optOutPrivateRepos: "Allstar faqat public repolarni kuzatadi.",
        "Token-Permissions": "Workflow'lar keragidan ko'p token huquqi so'ramasligi kerak.",
        threshold: "8: undan past ball repoda issue ochadi.",
        ignoreFiles: "Ruxsat etilgan to'rt binar, har birining manbasi yonida yozilgan.",
        Gold: "Eng yuqori Best Practices darajasi, bitg'da.",
      },
    },
    demo: {
      short: "Demo standarti",
      title: "Demo standarti: har loyiha o'zini halol ko'rsatadi",
      body: "Har loyiha maket emas, haqiqiy UI bo'lgan jonli demo oladi: ilova `--mode demo` bilan build qilinadi, API'siga brauzerning o'zida real ko'rinishdagi ma'lumotli mock javob beradi. Demo halol: demo belgisi, to'qilgan ismlar, hech qaysi abonentda yo'q `+998 00` raqamlar va qayta yuklashda tiklanadigan o'zgarishlar. Playwright smoke testlari har sahifani ochadi, README skrinshotlarini ham Playwright generatsiya qiladi, hech qachon qo'lda olinmaydi.\n\nDemolar wonmor.io/demo/<repo> ostida beriladi, private repolar uchun ham, shuning uchun loyihani kodini ochmasdan ko'rish mumkin. Production bundle'da mock'dan hech narsa yo'q.",
      fields: {
        "--mode demo": "Mock kodini o'z ichiga oladigan yagona build.",
        honest: "Real ko'rinishli, lekin hech qachon o'zini haqiqiy mijozlar deb ko'rsatmaydi.",
        Playwright: "Smoke testlar har o'zgarishdan keyin demoni ishlaydigan holda saqlaydi.",
        screenshots: "Demodan qayta generatsiya qilinadi, shuning uchun eskirmaydi.",
        "wonmor.io/demo": "Ikkala tashkilot uchun ochiq vitrina.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Manzaradan nimani olish kerak.\n\n1) Ikki org, bitta tizim: bir xil qoidalar, CI naqshlari, edge va demo standarti. 2) Yozish huquqi faqat teamlar orqali, hamma joyda CODEOWNERS, PR sarlavhali faqat squash merge. 3) Tarifni bil: Free'da faqat public repolar server majburlaydigan ruleset oladi; private repolar huquq va jarayonga tayanadi. 4) CI daqiqalariga pul kabi qara: stop usage'li kichik budjet, har so'rovga bitta PR, kamaytirilgan push'lar. 5) Har action'ni SHA'ga qada va bog'liqliklarni oyiga bir marta, guruhlab, cooldown bilan yangila. 6) Image'larni SBOM va provenance bilan yetkaz, package'larni ularga push qiladigan repolarga bog'la. 7) Bitta umumiy edge faqat PR orqali o'zgaradi; statik deploy symlink almashtiradi va reload qiladi, hech qachon qayta ishga tushirmaydi. 8) Har public repo va saytda majburiy CSP, security.txt, Allstar va Scorecard. 9) Har loyiha uchun testlar ishlaydigan holda saqlaydigan haqiqiy, halol demo.",
    },
  },
  scenarios: {
    "budget-out": {
      label: "CI to'xtadi",
      steps: {
        "ci-stop": {
          short: "$0",
          title: "Har private repoda CI to'rt kunga to'xtaydi",
          body: "2026-11-01 dan 11-04 gacha hech qaysi private dtwinuz reposida birorta job boshlanmadi. Xabar muvaffaqiyatsiz to'lovlar yoki xarajat limiti haqida gapirardi. Haqiqiy sabab limit edi: private repolar uchun tekin daqiqalar tugagan, tashkilot budjeti esa $0 edi, shuning uchun boshqa hech narsa ishlay olmadi.",
          check: {
            q: "Job xabari muvaffaqiyatsiz to'lovlarni tilga oladi. Avval nimani tekshirish kerak?",
            options: [
              "Billing API orqali tashkilot budjeti va shu oylik sarfni",
              "Workflow YAML'ni",
              "Runner label'larini",
            ],
            answer: 0,
            why: "Bitta xabar ikkala sababni ham qamraydi. Budjet va sarfni o'qish bir daqiqada muammo limitdami yoki to'lovdami ekanini aytadi.",
          },
          fields: {
            "spending limit": "Xabarning to'g'ri qismi.",
            "free minutes": "Private repolar uchun tekin daqiqalar tugadi.",
            $0: "O'sha paytdagi org budjeti: tekin daqiqalardan ortig'i yo'q.",
            payments: "Xabarda tilga olingan, lekin sabab emas.",
          },
        },
        "budget-set": {
          short: "Budjet",
          title: "Karta, $10 budjet va uni o'qish yo'li",
          body: "2026-11-05 da tashkilotga karta qo'shildi va stop usage yoqilgan oyiga $10 Actions budjeti qo'yildi. Tekin daqiqalar bilan birga bu oyiga taxminan $22 CI. Budjet va sarfni billing API orqali o'qish mumkin, CI to'xtaganda endi birinchi qadam shu.",
          fields: {
            $10: "Actions uchun yangi oylik budjet.",
            "stop usage": "Nazoratdan chiqqan workflow ko'proq hisob yozmaydi.",
            budgets: "Budjetni ko'rsatadigan API.",
            usage: "Shu oy nima sarflanganini ko'rsatadigan API.",
          },
        },
        "pr-flood": {
          short: "12 PR",
          title: "Bitta so'rov 12 ta pull request'ga aylanadi",
          body: "2026-11-06 da ofis 3D egizagi reposidagi bitta so'rov 12 PR'ga bo'lindi, #140 dan #151 gacha. Har PR 4 job yurgizdi, faqat e2e job'ning o'zi 10-15 daqiqa oldi. Har merge main'da yana bitta run boshladi. Kichik budjet bunga chiday olmaydi.",
          fields: {
            "#140": "Bitta so'rovdan 12 PR'ning birinchisi, #140 dan #151 gacha.",
            "4 jobs": "Har PR'ga, e2e bilan.",
            e2e: "Brauzer test job'i, har biri 10-15 daqiqa.",
            "12 PRs": "O'n ikkita to'liq run, ustiga main'da o'n ikkita run.",
          },
        },
        "one-pr": {
          short: "Bitta PR",
          title: "Qoida: bitta so'rov, bitta PR",
          body: "O'shandan beri egasining qoidasi: bitta so'rovning hamma ishi alohida commit'lar bilan bitta branch'ga va bo'limma-bo'lim tavsifli bitta PR'ga tushadi. Testlar avval lokal yurgiziladi, push'lar kamaytiriladi, flaky CI esa faqat yiqilgan job'lar uchun qayta yurgiziladi. Bitta so'rov endi bitta CI run, bitta merge va bitta deploy turadi.",
        },
      },
    },
    "ghcr-denied": {
      label: "GHCR 403",
      steps: {
        "push-denied": {
          short: "Rad etildi",
          title: "Tashkilotga ko'chgandan keyin reliz push'i rad etiladi",
          body: "Repolar dtwinuz tashkilotiga ko'chgandan keyin beshta konteyner package unga qo'lda nusxalandi. Ularning hech biri repoga bog'lanmagan edi. Keyingi reliz, do'kon reposining v0.4.0 si, push'da `denied: permission_denied: read_package` bilan yiqildi. Source label bilan qayta push ham package'ni bog'lamadi.",
          check: {
            q: "Reliz qo'lda nusxalangan package'da permission_denied bilan yiqildi. Run'ni qayta yurgizish kerakmi?",
            options: [
              "Ha, bu registry'ning vaqtinchalik xatosi",
              "Yo'q: package repo'ning Actions'iga yozish huquqini bermaguncha xuddi shunday yiqiladi",
              "Ha, lekin yangi teg bilan",
            ],
            answer: 1,
            why: "Xato tarmoq haqida emas, package huquqlari haqida. Workflow'dagi hech narsa uni o'zgartira olmaydi; package'dagi sozlama o'zgartirishi kerak.",
          },
          fields: {
            "docker push": "Reliz job'ining oxirgi qadami.",
            permission_denied: "Package bu repo Actions'iga yozishga ruxsat bermaydi.",
            repository: "none: nusxalangan package hech qaysi repoga bog'lanmagan.",
            label: "Source label yangi package'larni bog'laydi, mavjudlarini emas.",
          },
        },
        "push-ok": {
          short: "UI tuzatish",
          title: "Package'ni web UI'da bog'lash",
          body: "Tuzatish faqat web UI'da bor: package sozlamalari, Manage Actions access, repo'ni Write roli bilan qo'shish. Buning uchun REST yoki GraphQL endpoint yo'q. Beshta package'ning har biriga o'z reposi qo'shilgach, reliz push'lari yana ishladi.",
          fields: {
            "Manage Actions access": "Qaysi repolar push qila olishini sanaydigan package sozlamasi.",
            Write: "Reliz workflow'iga kerak bo'lgan rol.",
            GraphQL: "Ikkala API ham bu sozlamani o'zgartira olmaydi.",
            retry: "Sozlama o'zgarmaguncha befoyda.",
          },
        },
      },
    },
    "edge-cut": {
      label: "Uzilgan yuklash",
      steps: {
        "cut-791": {
          short: "791 KB",
          title: "Bitta sayt deploy'i boshqasidagi yuklashni uzadi",
          body: "2026-11-12 kuni 20:43 UTC da boshqa saytning deploy'i config o'zgarishi uchun umumiy edge konteynerini qayta yaratdi. Har saytning har ochiq ulanishi u bilan uzildi, bitg o'rnatuvchisining yuklanishi 791 KB da to'xtadi. Uch daqiqadan keyingi ikkinchi uzilish edge'dan emas, mijozning o'z tarmog'idan edi.",
          check: {
            q: "Nega bog'liq bo'lmagan sayt deploy'i bitg.uz yuklashini uzdi?",
            options: [
              "Ikki sayt bitta domenni bo'lishadi",
              "Ikkalasini bitta edge konteyneri beradi, deploy esa o'sha konteynerni qayta yaratdi",
              "Yuklash juda katta edi",
            ],
            answer: 1,
            why: "Umumiy proxy qayta ishga tushishlarini ham bo'lishadi. Uni qayta yaratish ortidagi har sayt uchun qayta ishga tushirishdir.",
          },
          fields: {
            "791 KB": "O'rnatuvchi yuklanishi to'xtagan joy.",
            recreated: "docker compose config o'zgarishi uchun konteynerni almashtirdi.",
            "every open connection": "Barcha saytlar jonli ulanishlarini birdan yo'qotadi.",
            "client network": "Ikkinchi uzilishning boshqa sababi bor edi; loglar mijoz timeout'ini ko'rsatdi.",
          },
        },
        "cut-fix": {
          short: "Reload",
          title: "Kontent o'zgarishi uchun edge hech qachon qayta yaratilmaydi",
          body: "2026-11-13 dan edge va bitg sayti relizlar, symlink va `caddy reload` bilan deploy qilinadi. Konteyner faqat compose fayli yoki muhit o'zgarganda qayta yaratiladi. Isbot production'da olindi: edge deploy'i paytidagi 76 soniyalik o'rnatuvchi yuklanishi tugadi, sha256 mos keldi va konteynerning ishga tushgan vaqti o'zgarmadi.",
          fields: {
            "compose file": "Konteynerni qayta yaratishning qolgan yagona sababi.",
            "mv -T": "current symlink'ining atomik almashinuvi.",
            "76 s": "Deploy'dan omon qolgan uzun yuklash.",
            sha256: "Fayl to'liq va o'zgarmagan holda yetdi.",
          },
        },
      },
    },
    "www-cert": {
      label: "TLS'siz www",
      steps: {
        "www-nx": {
          short: "NXDOMAIN",
          title: "Edge tayyor, lekin www mavjud emas",
          body: "www.bitg.uz edge'da bitg.uz ga yo'naltirish uchun sozlangan edi, lekin www uchun DNS yozuvi qiymati IP manzil bo'lgan CNAME edi. CNAME nomga ko'rsatishi kerak, shuning uchun resolver'lar NXDOMAIN qaytardi. Sertifikat markazi www ga yeta olmadi, Caddy sertifikat ola olmadi va qayta urinish backoff'iga tushdi.",
          check: {
            q: "Qiymati IP manzil bo'lgan CNAME yozuvida nima xato?",
            options: [
              "Hech narsa, u A yozuvi kabi ishlaydi",
              "CNAME boshqa hostni nomlashi kerak; u yerdagi IP resolve bo'lmaydi, nom ishlamaydi",
              "U faqat www uchun ishlaydi",
            ],
            answer: 1,
            why: "Manzil A (yoki AAAA) yozuviga tegishli. CNAME - boshqa nomga taxallus.",
          },
          fields: {
            CNAME: "Boshqa nomga taxallus, hech qachon manzilga emas.",
            NXDOMAIN: "Resolver nom mavjud emasligini aytadi.",
            ACME: "Caddy sertifikat olish uchun ishlatadigan protokol; unga nom resolve bo'lishi kerak.",
            backoff: "Caddy har muvaffaqiyatsiz urinishdan keyin uzoqroq kutadi.",
          },
        },
        "www-fix": {
          short: "A yozuvi",
          title: "Yozuvni tuzat, keyin edge'ni uyg'ot",
          body: "CNAME o'chirildi va www uchun A yozuvi qo'shildi. Caddy hali backoff'da kutayotgan edi, shuning uchun config'ini majburan qayta yuklash uni darhol urinishga majbur qildi va sertifikat taxminan 10 soniyada berildi. www endi yagona kanonik host https://bitg.uz ga 301 bilan javob beradi.",
          fields: {
            "A record": "Manzil uchun to'g'ri yozuv turi.",
            "--force": "O'zgarmagan config'ni ham qayta yuklaydi, bu sertifikat urinishini qayta boshlaydi.",
            "10 s": "Reload'dan haqiqiy sertifikatgacha.",
            "301": "Kanonik hostga doimiy yo'naltirish.",
          },
        },
      },
    },
  },
};

export default text;
