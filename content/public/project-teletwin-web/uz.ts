import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: TeleTwin Web",
  summary:
    "TeleTwin Web - Telegram Web A ning ochiq fork'i: xodim odatdagi Telegram akkauntidan foydalanadi, yonida esa \"Korxona\" papkasi paydo bo'ladi. U papkadagi chatlar Telegram'ga umuman yetmaydi, faqat korxonaning o'z TeleTwin serverida yashaydi. Admin bitta revoke bosgani bilan korxona qismi yo'qoladi, shaxsiy Telegram esa qoladi. Darsda foydalanuvchi yo'llari, korxona ma'lumotini Telegram'dan uzoq tutadigan router, sinxronlash dvigateli, desktop va Android qobiqlari hamda pipeline'lar: PR tekshiruvi, updater manifestli teg relizi, web deploy va upstream bilan sinxronlash ko'riladi.",
  learn: [
    "Foydalanuvchi nimani ko'radi: Telegram login, admin tasdiqlaydigan CorpGate korxona logini, \"Korxona\" papkasi va revoke",
    "callApi ichidagi bitta ilgak korxona ID'si bor har chaqiruvni provider'ga yo'naltiradi yoki bloklaydi, buning uchun alohida ID diapazoni bor",
    "Sinxronlash dvigateli WebSocket hub bilan ishlaydi, qayta ulanishda yetishmaganini oladi va korxona ma'lumotini diskka yozmaydi",
    "Tauri va Capacitor qobiqlari serverdagi build'ni ochadi, shuning uchun web deploy har o'rnatilgan ilovani yangilaydi; qobiqning o'zi qanday yangilanadi",
    "Pipeline'lar: PR tekshiruvi, 4 desktop platforma va Android uchun teg relizi, web deploy, saqlangan merge base bilan upstream sync",
  ],
  nodes: {
    user: "Xodim",
    ui: "TeleTwin Web",
    tg: "Telegram",
    server: "TeleTwin server",
    admin: "Admin",
    engine: "Sinx dvigatel",
    guard: "API router",
    worker: "GramJS worker",
    provider: "Korxona provider",
    cache: "Offline kesh",
    shells: "Desktop/Android",
    code: "teletwin branch",
    ci: "GitHub Actions",
    rel: "GitHub Release",
    up: "Telegram Web A",
  },
  metrics: {
    stale: "Korxona chatlari qolgan revoke qilingan qurilmalar",
    hooks: "Fork tekkan upstream fayllar",
    tests: "O'tgan unit testlar",
    jobs: "Relizda yiqilgan desktop job'lar",
    wait: "Kutish vaqti",
    conflicts: "Upstream sync'da konfliktli fayllar",
  },
  steps: {
    intro: {
      short: "Ikki dunyo",
      title: "Bitta messenjer, ikki dunyo",
      body: "TeleTwin hal qiladigan muammo: korxona ishi Telegram guruhlarida yuradi, xodim ketganda esa ish chatlari ham u bilan ketadi. TeleTwin to'liq Telegram klientini (oila, do'stlar, kanallar) saqlab qoladi va \"Korxona\" degan lokal papka qo'shadi. Undagi guruh, kanal va shaxsiy chatlar faqat korxonaning o'z TeleTwin serverida saqlanadi, Telegram ularni ko'rmaydi.\n\nBu repo (`dtwinuz/teletwin-web`, GPL-3.0, ochiq) - web klient va undan qurilgan Tauri desktop hamda Capacitor Android qobiqlari. Server, admin panel va klassik C++ desktop klient alohida yopiq repolarda, shuning uchun bu dars serverni faqat ochiq klient ishlatadigan kontrakt orqali tasvirlaydi. Ommaviy build `tele.dtwin.uz/web/` da ishlaydi.\n\nKorxona chatlari ro'yxati `GET /api/chats` dan keladi: kind 1 - guruh, 2 - kanal, 3 - boshqa xodim bilan shaxsiy chat.",
      fields: {
        Host: "Korxona serveri. Web build o'zini bergan serverni default qiladi, boshqa joyda tele.dtwin.uz ni; login oynasida o'zgartirsa bo'ladi.",
        kind: "1 guruh, 2 kanal, 3 shaxsiy chat. Klient har birini Web A dagi mos chat turi bilan chizadi.",
        canPost: "Kanalda faqat adminlar yozadi; false bo'lsa klient yozish maydonini yashiradi.",
        peerId: "Shaxsiy chatda: suhbatdosh xodim, shuning uchun chat o'sha odam bilan private chat bo'lib ko'rinadi.",
      },
    },
    gate: {
      short: "CorpGate",
      title: "Avval Telegram login, keyin majburiy korxona logini",
      body: "Xodim Telegram'ga odatdagidek kiradi (telefon va kod). Keyin CorpGate oynasi korxona hisobini so'raydi: usiz ilova ishlamaydi. Yangi xodim \"yangi profil yaratish\" ni bosadi: klient login, parol va Telegram user id bilan `register` yuboradi, admin so'rovni panelda tasdiqlaydi. Shu paytgacha login 403 va \"pending\" qaytaradi; gate har 15 soniyada qayta urinadi va admin \"ha\" deyishi bilan ichkariga kiritadi.\n\nKorxona logini har Telegram akkaunti uchun localStorage'da alohida saqlanadi, shuning uchun bitta brauzerdagi ikki Telegram akkauntining korxona sessiyalari ham alohida.",
      check: {
        q: "Yangi xodim ro'yxatdan o'tdi, admin hali tasdiqlamagan. Login chaqiruvi nima qaytaradi?",
        options: [
          "200 va hech qanday huquqsiz token",
          "403, tanasida pending; gate kutish oynasini ko'rsatadi va qayta urinadi",
          "401, klient Telegram'dan ham chiqaradi",
        ],
        answer: 1,
        why: "`buildForbiddenError` 403 tanasini o'qiydi: \"pending\" - tasdiq kutilmoqda, \"rejected\" - rad etilgan. 401 o'lgan sessiya uchun saqlangan va revoke'ni ishga tushiradi, revoke esa Telegram'ga tegmaydi.",
      },
      fields: {
        login: "Xodimning korxona logini, telefon raqami emas: korxona hisobi Telegram'dan alohida.",
        deviceId: "Admin sessiyalarni qurilma bo'yicha ko'radi va yopadi.",
        accessToken: "REST va hub uchun Bearer token. Bu yerda yashirilgan.",
        employee: "Xodim id'si klient ichida korxona user id'siga aylanadi, router qadamiga qarang.",
      },
    },
    folder: {
      short: "Korxona papkasi",
      title: "Korxona papkasi Telegram'ning qolgan qismi kabi ishlaydi",
      body: "\"Korxona\" ichida foydalanuvchi Web A ning odatiy oynalarini oladi: yuborish, javob, tahrir, o'chirish, o'qildi belgisi, typing, pin, reaksiya, so'rovnoma, rejalashtirilgan xabar, guruh va kanallarda thread, rasm, ovoz, video va fayl. Ustiga korxona imkoniyatlari qo'shilgan: `@all` va `@here`, hozir javob berishi kerak bo'lgan odamni ovozli \"uyg'otish\", issue havolasi ustida Jira kartochkasi, holat va DND (\"Holatim\"), xodim profili, eslatmali saqlangan xabarlar, faollik lentasi, kanallar katalogi, ichki web ilovalarni yagona kirish (SSO) bilan ochadigan \"Ilovalar\" papkasi hamda audio va video qo'ng'iroq (LiveKit).\n\nHar yuborishda `clientId` bor. Javob va xuddi shu xabarning hub orqali qaytgan nusxasi shu id bo'yicha birlashadi, shuning uchun pufak ikki marta chiqmaydi va \"yuborilmoqda\" holatida qotib qolmaydi.",
      fields: {
        entities: "Formatlash va mention'lar; `@all` - band qilingan xodim id'li mention.",
        replyToId: "Xuddi shu korxona chatidagi xabarga javob.",
        clientId: "Klient yaratgan id: POST javobi va hub nusxasini bitta pufakka birlashtiradi.",
        id: "Xabarning server id'si. Id'lar o'sib boradi, klient afterId bilan yetishmaganini oladi.",
        sentAt: "Server vaqti; klient uni foydalanuvchi vaqt zonasida ko'rsatadi.",
      },
    },
    revoke: {
      short: "Revoke",
      title: "Admin Revoke'ni bosadi: korxona qismi yo'qoladi",
      body: "Xodim ketganda admin uning hisobini revoke qiladi. Server hub orqali `logout` yuboradi, sinxronlash dvigateli esa korxonaga oid hamma narsani o'chiradi: saqlangan korxona logini, sessiya, har ochiq tabdagi korxona chatlari va xotiradagi media. \"Korxona kirishi bekor qilindi\" degan xabar chiqadi. Telegram sessiyasiga tegilmaydi: shaxsiy chatlar ishlashda davom etadi.\n\nQurilma oflayn bo'lsa, tozalash birinchi aloqada bo'ladi: 401 qaytargan istalgan REST chaqiruv yoki har hub qayta ulanishidan oldingi `GET /api/me` tekshiruvi xuddi shu revoke'ni ishga tushiradi. Diskda korxonaga oid hech narsa kutib turmaydi, kesh haqidagi qadamga qarang.",
      check: {
        q: "Admin Revoke'ni bosganda ketayotgan xodimning noutbuki yopiq edi. Ertasi kuni ertalab u korxona chatlarini oflayn o'qiy oladimi?",
        options: [
          "Ha, ilova onlayn bo'lguncha offline keshdan",
          "Yo'q: korxona chatlari offline keshga umuman yozilmaydi, serverga birinchi aloqa revoke bilan tugaydi",
          "Faqat har chatning oxirgi 100 xabarini",
        ],
        answer: 1,
        why: "`reduceGlobal` state saqlanishidan oldin korxona ma'lumotini olib tashlaydi, media esa faqat xotiradagi blob URL. Qayta yuklangandan keyin ko'rsatadigan narsa yo'q, birinchi `/api/me` esa 401 qaytaradi.",
      },
      fields: {
        logout: "Hub hodisasi, shuning uchun har onlayn qurilmada tozalash taxminan bir soniyada bo'ladi.",
        removeCredentials: "Shu Telegram akkaunti uchun saqlangan korxona tokenini unutadi.",
        removeCorpEverywhere: "Korxona chatlarini global state'dan olib tashlaydi; boshqa tablar multitab sync orqali ergashadi.",
        clearCorpMedia: "Xotiradagi korxona media blob URL'larini bo'shatadi.",
        "not touched": "Revoke faqat korxona hisobiga tegishli. Shaxsiy Telegram akkaunti kirgan holicha qoladi.",
      },
    },
    router: {
      short: "Router",
      title: "callApi dagi bitta ilgak korxona ma'lumotini Telegram'dan uzoq tutadi",
      body: "Web A dagi har bir Telegram API chaqiruvi `connector.ts` dagi `callApi` orqali o'tadi. TeleTwin shu joyga bitta router qo'ygan: `routeApiCall` argumentlarni (8 qavat chuqurlikkacha) aylanib korxona ID'sini qidiradi. Topsa va korxona provider'i shu metodni bilsa (`fetchMessages`, `sendMessage` va boshqa ko'plari), chaqiruv TeleTwin serverga REST so'rovga aylanadi. Provider'da bunday metod bo'lmasa, chaqiruv konsolga ogohlantirish yozib tashlab yuboriladi. Faqat korxona ID'si yo'q chaqiruvlar GramJS worker'ga va Telegram'ga yetadi.\n\nKorxona ID'lari alohida diapazonda: [2^48 - 2^32, 2^48) oralig'idagi bare id'lar, C++ desktop fork ham xuddi shu diapazonni ishlatadi. Haqiqiy Telegram id'lari ancha past, shuning uchun ular to'qnashmaydi va odatiy UI korxona chatlarini oddiy chat kabi chiza oladi.",
      check: {
        q: "Web A funksiyasi korxona provider'i bilmaydigan Telegram metodini argumentida korxona chat id'si bilan chaqiradi. Nima bo'ladi?",
        options: [
          "Chaqiruv Telegram'ga ketadi, u xato bilan javob beradi",
          "Router uni tashlab yuboradi: u GramJS worker'ga umuman yetmaydi",
          "Router korxona id'sini olib tashlab, qolganini yuboradi",
        ],
        answer: 1,
        why: "Bloklash - xavfsiz default. Hech kim xizmat qila olmaydigan, korxona id'si bor chaqiruv Telegram'ga xato sifatida ham yetmasligi kerak: argumentlarning o'zida korxona matni bo'lishi mumkin.",
      },
      fields: {
        routeApiCall: "Yagona yo'naltirish nuqtasi, callApi va callApiLocal ikkalasiga ulangan.",
        "depth 8": "Id'lar ichma-ich obyektlarda yashirinadi; aylanish arzon bo'lishi uchun cheklangan.",
        "2^48": "Korxona id'lari uchun band qilingan diapazon; Telegram id'lari bunchalik katta bo'lmaydi.",
        corp: "Provider korxona serverining REST API'si orqali xizmat qiladi.",
        blocked: "Tashlab yuboriladi va sanaladi; hisoblagich hali provider metodi kerak bo'lgan funksiyalarni topishga yordam beradi.",
        telegram: "Korxonaga havola yo'q: chaqiruv Telegram'ga o'zgarishsiz ketadi.",
      },
    },
    sync: {
      short: "Sinx",
      title: "Sinxronlash dvigateli: WebSocket hub va yetishmaganini olish",
      body: "Korxona sessiyasi boshlanganda dvigatel config'ni, chatlar ro'yxatini va har chatning oxirgi 100 xabarini yuklaydi, keyin hub'ni ochadi. Hub faqat WebSocket'da, negotiation'siz ishlaydi: long polling olib tashlangan, chunki revoke `logout` darhol yetib borishi kerak. Ulangandan keyin klient `Ready` ni chaqiradi va har yuklangan chat bo'yicha yetishmaganini oladi: oxirgi id'dan keyingi yangi xabarlar hamda oxirgi sinxdan beri tahrir, o'chirish va reaksiyalar.\n\nHub yopilganda dvigatel avval `GET /api/me` ni so'raydi. 401 - hisob revoke qilingan; boshqa javob - tarmoq muammosi, dvigatel 1, 2, 4 soniya va hokazo, ko'pi bilan 30 soniyadan keyin qayta ulanadi. Dvigatel faqat bosh tabda ishlaydi; boshqa tablar state'ni Web A ning multitab sinxi orqali oladi.",
      check: {
        q: "Nega dvigatel hub'ga qayta ulanishdan oldin GET /api/me ni chaqiradi?",
        options: [
          "Xodimning ko'rinadigan ismini yangilash uchun",
          "Revoke qilingan token socket'da shunchaki rad etilishi mumkin; /me revoke'ni (401) tarmoq xatosidan ajratadi",
          "SignalR buni talab qiladi",
        ],
        answer: 1,
        why: "Rad etilgan WebSocket sababni aytmaydi. REST chaqiruv aytadi: 401 - revoke, shuning uchun dvigatel abadiy qayta urinmay, tozalaydi.",
      },
      fields: {
        WebSockets: "Yagona transport; negotiation o'tkazib yuboriladi, token query'da ketadi.",
        Ready: "Serverga klient obuna bo'lganini aytadi, oradagi hech narsa yo'qolmaydi.",
        afterId: "Socket uzilganda o'tkazib yuborilgan xabarlarni olish.",
        changes: "Oxirgi sinx vaqtidan beri tahrir, o'chirish, reaksiya va pin'larni olish.",
        "401": "Sessiya yo'q: qayta ulanish o'rniga revoke.",
        "30 s": "Kutish chegarasi; muvaffaqiyatli ulanishdan keyin yana 1 soniyadan boshlanadi.",
      },
    },
    nocache: {
      short: "Diskka yo'q",
      title: "Korxonaga oid hech narsa diskka yozilmaydi",
      body: "Web A tez ochilish uchun state'ini brauzerga saqlaydi. TeleTwin saqlashga ilgak qo'ygan: state diskka ketishidan oldin `removeCorpData` har bir korxona chati va xabarini olib tashlaydi. Korxona mediasi korxona serveridan yuklanadi va faqat xotiradagi blob URL sifatida turadi, Web A ning media keshiga hech qachon tushmaydi. Revoke oflaynda ham ishlashi aynan shularga bog'liq.\n\nKichikroq ilgaklar boshqa yo'llarni yopadi: korxona qoralamasi Telegram'dan link preview so'ramaydi, korxona matni Telegram'ning AI xizmatlariga yuborilmaydi, korxona xabarini faqat korxona chatlariga forward qilish mumkin, sahifaning CSP'si esa tarmoq ulanishiga faqat o'z origin'i, Telegram web socket'lari va korxona serveriga ruxsat beradi.",
      fields: {
        reduceGlobal: "State'ni saqlashga tayyorlaydigan funksiya; ilgak uning boshida ishlaydi.",
        removeCorpData: "State'ning korxona chatlari, foydalanuvchilari va xabarlarisiz nusxasini qaytaradi.",
        blob: "Media xotirada yashaydi va tab yopilganda yoki revoke'da o'ladi.",
        "link preview": "Preview yasash qoralamadagi URL'ni Telegram'ga yuborgan bo'lardi.",
        "connect-src": "Kiritilgan begona kod ham ma'lumotni boshqa hostga yubora olmaydi.",
      },
    },
    shells: {
      short: "Qobiqlar",
      title: "Desktop va Android qobiqlari serverdagi web ilovani ochadi",
      body: "Tauri desktop ilova (Windows, macOS, Linux) va Capacitor Android ilova web kodni o'z ichiga olmaydi. `tauri.teletwin.conf.json` dagi `frontendDist` va `capacitor.config.json` dagi `server.url` serverdagi build'ga qaraydi. Shuning uchun har web deploy har o'rnatilgan desktop va telefonni bir zumda yangilaydi; yangi paket faqat qobiqning o'zi o'zgarganda kerak.\n\nQobiq o'zini ham yangilaydi. Desktop qobiq avval korxonaning update kanalini so'raydi, javob bo'lmasa eng yangi GitHub Release'dagi `latest.json` ga o'tadi. Tauri minisign imzosini repodagi ochiq kalit bilan tekshiradi va boshqasini rad etadi. Android `/api/updates/android` ni so'raydi, APK'ni yuklaydi va tizim installer'ini chaqirishdan oldin uning SHA-256 qiymatini kanal bergan qiymat bilan solishtiradi.",
      check: {
        q: "Jamoa korxona papkasidagi React komponentida xatoni tuzatdi. Xodimlar nimani o'rnatishi kerak?",
        options: [
          "Yangi desktop paket va yangi APK",
          "Hech narsa: qobiqlar serverdagi web build'ni yuklaydi, keyingi web deploy hammaga yetadi",
          "Faqat APK, Tauri o'zi yangilanadi",
        ],
        answer: 1,
        why: "Qobiqlar serverdagi ilovaga ochilgan yupqa oyna. Faqat Rust, Java yoki qobiq sozlamasidagi o'zgarish yangi paket talab qiladi va updater orqali o'tadi.",
      },
      fields: {
        "latest.json": "Reliz workflow'i yozadigan updater manifesti.",
        version: "O'rnatilgan versiya bilan solishtiriladi; faqat kattarog'i taklif qilinadi.",
        platforms: "Har platformaga bitta yozuv: windows-x86_64, darwin-aarch64, darwin-x86_64, linux-x86_64.",
        signature: "Installer'ning minisign imzosi. Boshqa kalit bilan imzolangan paket rad etiladi.",
        url: "Installer qayerdan yuklanadi.",
      },
    },
    ci: {
      short: "PR tekshiruvi",
      title: "Pull request tekshiruvi: tsc, eslint, vitest",
      body: "Default branch `teletwin` ga har pull request bitta job'ni yurgizadi: o'rnatish, butun repo bo'yicha TypeScript, eslint va vitest. Eslint `src/teletwin/` va faqat PR o'zgartirgan fayllarda ishlaydi, chunki upstream Web A kodida joriy toolchain bilan yuzlab uslub xatolari bor; hammasini lint qilish har PR'ni hech kim tuzata olmaydigan sabab bilan qizil qilardi. Unit testlar korxona kodi yonida: router, id diapazoni, ro'yxatdan o'tish oqimi, forward bloki, qo'ng'iroqlar, matnlar.\n\nWorkflow org'ning supply-chain qoidalariga amal qiladi: action'lar commit SHA'ga mahkamlangan, `persist-credentials: false`, faqat o'qish ruxsati va yangi commit kelganda eski run'ni bekor qiladigan concurrency guruhi. Desktop build PR'da yurmaydi; reliz qadamidagi ssenariy buning narxini ko'rsatadi.",
      check: {
        q: "Nega eslint faqat src/teletwin va o'zgargan fayllarni tekshiradi?",
        options: [
          "Actions daqiqalarini tejash uchun",
          "Upstream kodi lint'dan toza emas; to'liq lint har PR'ni jamoa egasi bo'lmagan kod sababli yiqitardi",
          "Eslint Teact fayllarini o'qiy olmaydi",
        ],
        answer: 1,
        why: "Fork upstream fayllarini upstream'ga iloji boricha yaqin saqlamoqchi. U yerda yuzlab uslub xatolarini tuzatish har upstream sync'da konflikt yaratardi.",
      },
      fields: {
        SHA: "Ko'chirilgan teg workflow ostidagi action kodini almashtira olmaydi.",
        tsc: "Tip tekshiruvi upstream va fork kodini birga qamraydi: ilgaklar baland ovoz bilan sinadi.",
        changed: "Faqat PR tekkan fayllar va butun korxona kodi lint qilinadi.",
        vitest: "Upstream testlari va fork'ning o'z `*.test.ts` fayllari.",
        "cancel-in-progress": "Yangi push o'sha branch'ning eski run'ini to'xtatadi.",
        "223/223": "PR #56 dagi son; o'sha PR Scorecard zaifliklarini ham tozalagan.",
      },
    },
    release: {
      short: "Reliz",
      title: "Teg 4 desktop platforma va Android'ni quradi",
      body: "Reliz `vX.Y.Z` tegidan boshlanadi. `teletwin-release.yml` desktop workflow'ini (matritsa: Windows NSIS, macOS arm64 va x64, Linux deb va AppImage) va Android workflow'ini (secret'lardagi barqaror kalit bilan imzolangan tester APK, shuning uchun yangi build eskisining ustiga o'rnatiladi, hamda reliz AAB) chaqiradi. Publish job fayllarni yig'adi, `latest.json` updater manifestini yozadi, reliz izohiga SHA-256 ro'yxatini qo'yadi va GitHub Release'ni `--verify-tag` bilan yaratadi.\n\n`v*` teglari ruleset bilan himoyalangan: push qilingan tegni surib ham, o'chirib ham bo'lmaydi, shuning uchun buzilgan reliz yangi versiya raqamini oladi. Desktop paketlar hali kod-imzosiz; izohda shu yozilgan.",
      check: {
        q: "v2.13.0 relizi teg push qilingandan keyin yiqildi. Tuzatish merge qilindi. Qanday chiqariladi?",
        options: [
          "v2.13.0 tegini yangi commit'ga surish",
          "Yangi v2.13.1 tegini push qilish: v* teglari himoyalangan",
          "Eski workflow run'ini qayta yurgizish",
        ],
        answer: 1,
        why: "Himoyalangan tegni surib bo'lmaydi, qayta yurgizish esa yana eski commit'ni quradi. Yangi versiya updater uchun ham halol, u versiya raqamlarini solishtiradi.",
      },
      fields: {
        nsis: "Windows installer; macOS app va dmg, Linux deb va AppImage oladi.",
        minisign: "tauri-action har updater paketini imzolaydi; maxfiy kalit repo secret'i.",
        android: "Xuddi shu teg Android workflow'ida APK va AAB'ni quradi.",
        "latest.json": "`.sig` fayllaridan yig'iladi: har platformaga bitta imzo va URL.",
        sha256sum: "Izohdagi checksum'lar, istalgan odam yuklanganini tekshira oladi.",
        protected: "Ruleset reliz teglarini surish va o'chirishni taqiqlaydi.",
      },
    },
    deploy: {
      short: "Web deploy",
      title: "Web deploy: hamma klient uchun bitta statik build",
      body: "Web qism - statik build: `BASE_URL` bilan `npm run build:production` `dist/` ni yozadi. Yopiq server repo'sidagi deploy skripti uni korxona serveri beradigan papkaga ko'chiradi, source map va build statistikasi yuklanmaydi (ular sababli to'liq `dist/` taxminan 212 MB, haqiqatan yuklanadigani taxminan 20 MB). Sayt dtwin.uz ning umumiy edge proksisi ortida turadi.\n\nShu bitta qadam brauzerlarni, PWA'ni, har desktop qobiqni va har telefonni yangilaydi. Shuning uchun web deploy teg relizidan alohida: ko'p o'zgarishlar web o'zgarishi va yangi paket talab qilmaydi.",
      fields: {
        "build:production": "Vite production build; Telegram api_id va api_hash git'ga tushmaydigan .env dan olinadi.",
        "source maps": "Serverga yuklanmaydi: hajmni ikki baravar oshiradi, foydalanuvchiga foydasi yo'q.",
        "deploy-web.sh": "Server bilan birga turadi, chunki hosting serverniki; bu repo faqat dist/ ni beradi.",
        frontendDist: "Desktop qobiqning boshlang'ich URL'i.",
        "server.url": "Android qobiqning boshlang'ich URL'i.",
      },
    },
    upstream: {
      short: "Upstream",
      title: "Umumiy tarixsiz upstream'ga ergashish",
      body: "Fork orphan import sifatida boshlangan: birinchi commit - `6002824` dagi Telegram Web A, upstream tarixisiz. Shuning uchun `git merge upstream/master` uchun merge base yo'q. Uning o'rniga oxirgi olingan upstream commit `.upstream-base` faylida saqlanadi, `scripts/upstream-sync.sh` esa `git merge-tree --merge-base` bilan haqiqiy uch tomonlama merge qiladi. Faqat fork'ga tegishli yo'llar doim bizniki qoladi, o'chirilgan fayllar o'chiqligicha qoladi, skript `.upstream-base` ni yangilaydi.\n\nKorxona kodi `src/teletwin/` da (taxminan 6 500 qator) va hech qachon konflikt bermaydi. Upstream fayllari ichida faqat kichik ilgaklar bor, har biri `TeleTwin:` izohi bilan belgilangan; ilgaklar jadvalida 33 ta fayl. Sync'dan keyin `TeleTwin:` belgilari soni avvalgisi bilan teng bo'lishi shart. 2026-11-01 dagi sinov upstream'ning oxirgi 20 commit'ini qayta qo'llagan: konflikt 4 ta faylda, to'rttasi ham ilgak.",
      check: {
        q: "Nega korxona kodi alohida papkada, upstream fayllarida esa faqat kichik belgilangan ilgaklar?",
        options: [
          "Teact shuni talab qiladi",
          "Upstream merge'lari faqat ilgaklarda konflikt beradi, belgilar soni esa ilgak yo'qolganini ko'rsatadi",
          "Bundle kichikroq bo'ladi",
        ],
        answer: 1,
        why: "Yangi fayllar hech qachon konflikt bermaydi. Belgisi bor kichik ilgakni qo'lda qayta qo'yish va sanash oson, shuning uchun merge'dan keyin guard jimgina yo'qolsa, bu ushlanadi.",
      },
      fields: {
        ".upstream-base": "Tarix bera olmaydigan merge base.",
        "merge-tree": "Rename aniqlaydigan haqiqiy uch tomonlama merge, ko'rib chiqish uchun index'ga yoziladi.",
        "always ours": "Upstream'ning o'z build chiqishi, testlari va workflow'lari qaytmasligi kerak.",
        "TeleTwin:": "Har ilgakdagi belgi; har sync'dan keyin soni tekshiriladi.",
        "4 files": "ChatExtra.tsx, language.d.ts, vite.config.ts, vitest.config.ts.",
      },
    },
    tools: {
      short: "Asboblar",
      title: "Asboblar va har birining sababi",
      body: "Telegram Web A (TypeScript, Teact, Web Worker ichida GramJS) GPL-3.0 ostida to'liq va tez Telegram klientini beradi; noldan yozish hech qachon variant bo'lmagan. `@microsoft/signalr` korxona serveri SignalR hub protokolida gaplashgani uchun bor, faqat WebSocket bilan. `livekit-client` korxona qo'ng'iroqlarini olib keladi. Tauri 2 upstream'ning `tauri/` papkasida allaqachon bor edi va uch OS uchun kichik native qobiq beradi. Capacitor 8 xuddi shu web ilovani Android uchun o'raydi, ustiga bildirishnoma, yuklab olish va APK updater uchun kichik Java ko'prik; iOS qobig'i tayyorlangan va Apple developer akkauntini kutmoqda.\n\nKod atrofida: unit testlar uchun vitest, workflow auditi uchun zizmor, npm, cargo, gradle va actions uchun oylik guruhlangan Dependabot va 7 kunlik cooldown, hamda `.npmrc` dagi `min-release-age=3`: paket o'rnatilishidan oldin kamida 3 kunlik bo'lishi kerak.",
      fields: {
        signalr: "Korxona serverining hub protokoli klienti.",
        "livekit-client": "Qo'ng'iroqlar uchun WebRTC media; join token'ni server beradi.",
        tauri: "Tizim webview'li Rust qobiq: kichik installer, ichida imzolangan updater.",
        capacitor: "Android qobiq; ko'prik WebView'da yo'q narsalarni qo'shadi.",
        vitest: "tsc bilan bitta PR job'ida yuradigan tez unit testlar.",
        zizmor: "Sizib chiqqan checkout credential kabi xavfli workflow naqshlarini topadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "TeleTwin Web'dan olinadigan saboqlar.\n\n1) Messenjer yozish o'rniga yetuk klientni fork qiling va qatlam qo'shing: korxona kodi o'z papkasida, upstream fayllariga faqat kichik belgilangan ilgaklar. 2) Yagona tor joyga (`callApi`) bitta router qo'ying va korxona id'si bor har narsa uchun bloklashni default qiling. 3) Korxona obyektlariga alohida id diapazoni bering, shunda odatiy UI ularni to'qnashuvsiz ko'rsatadi. 4) Revoke'ni haqiqiy qiling: hub `logout`, qayta ulanishdan oldin 401 tekshiruvi va diskda korxonaga oid hech narsa yo'q. 5) Qobiqlarni yupqa saqlang: ular serverdagi build'ni yuklaydi, web deploy hammani yangilaydi, o'zlari esa faqat imzolangan va tekshirilgan paket bilan yangilanadi. 6) Himoyalangan teglardan manifest va checksum bilan reliz qiling. 7) Upstream'ga saqlangan merge base bilan ergashing va har sync'dan keyin ilgaklarni sanang. 8) PR tekshiruvi nimani qamramasligini unutmang: desktop build'ni.",
    },
  },
  scenarios: {
    "tauri-lockstep": {
      label: "Faqat npm bump",
      steps: {
        "lock-break": {
          short: "Qizil reliz",
          title: "Yashil Dependabot PR to'rtala desktop job'ni sindiradi",
          body: "Dependabot PR #46 npm guruhini ko'tardi: 40 ta yangilanish, orasida Tauri plagin paketlari ham bor. PR tekshiruvi (tsc, eslint, vitest) yashil edi, shuning uchun merge qilindi. Keyingi teg v2.13.0 to'rtala desktop job'da yiqildi: npm plagin paketlari va Rust plagin crate'larining minor versiyalari farq qilsa, tauri-action qurishni rad etadi.\n\nPR tekshiruvi desktop ilovani hech qachon qurmaydi, desktop workflow esa push'da faqat `tauri/**` o'zgarganda yuradi. npm tomoni `package.json` da, shuning uchun relizgacha hech narsa yurmadi.",
          check: {
            q: "Merge'dan oldin buni qaysi tekshiruv ushlagan bo'lardi?",
            options: [
              "vitest'ni ikki marta yurgizish",
              "PR branch'i uchun desktop ilovani qurish (teletwin-desktop.yml ni workflow_dispatch bilan)",
              "package.json ustida eslint",
            ],
            answer: 1,
            why: "npm paketlarini crate'lar bilan faqat tauri-action solishtiradi. Desktop workflow'ni PR branch'ida yurgizish yoki crate'larni o'sha PR'da ko'tarish bo'shliqni yopadi.",
          },
          fields: {
            "#46": "Guruhlangan npm yangilanishi: bitta PR, 40 paket.",
            green: "PR tekshiruvi o'tdi: unga Tauri build kirmaydi.",
            mismatched: "tauri-action'ning npm plaginlari Rust crate'lariga mosligini tekshirishi.",
            "2.5.1": "Cargo.toml da qolgan Rust crate versiyasi.",
            "2.7.0": "Bump'dan keyingi npm versiyasi.",
          },
        },
        "lock-fix": {
          short: "Birga ko'tarish",
          title: "Crate'larni moslash, yangi teg, qoidani yozish",
          body: "PR #50 Rust crate'larini npm bilan bir xil minor versiyaga ko'tardi va `Cargo.lock` ni yangiladi. `v2.13.0` himoyalangan teg bo'lgani uchun reliz `v2.13.1` sifatida qayta qurildi: bu barcha desktop paketlar, APK va `latest.json` bor GitHub Release.\n\nDoimiy yechim - qoida: `@tauri-apps/*` ni o'zgartiradigan har PR `tauri/Cargo.toml` dagi mos crate'ni ham o'zgartiradi yoki merge'dan oldin o'z branch'ida desktop workflow'ni yurgizadi.",
          fields: {
            "Cargo.toml": "Crate'lar ~ bilan npm minor'iga mahkamlangan: ~2.7, ~2.5, ~2.14.",
            "Cargo.lock": "O'zgarishdan keyingi aniq versiyalar.",
            "v2.13.1": "Yangi teg, chunki eskisini surib bo'lmaydi.",
            workflow_dispatch: "PR branch'i uchun desktop build'ni qo'lda yurgizish.",
          },
        },
      },
    },
    "voice-hang": {
      label: "Ovoz 60 s osiladi",
      steps: {
        "voice-stuck": {
          short: "Osildi",
          title: "Korxona ovozli xabari bir daqiqa aylanadi",
          body: "Prodda korxona ovozli xabarlari taxminan 60 soniya aylanib turardi. Web A audioni service worker orqali qismlab oqim qiladi, provider esa korxona mediasini media hash ustidagi regex bilan taniydi. Regex faqat ixtiyoriy `progressive/` prefiksiga ruxsat berardi, service worker esa sxema, host va yo'li bilan to'liq URL'ni beradi.\n\nNatijada so'rov korxona mediasiga o'xshamadi: hech bir provider javob bermadi, pleer esa o'z timeout'ini kutdi.",
          check: {
            q: "Nega rasmlar ishladi-yu, ovozli xabarlar osildi?",
            options: [
              "Rasmlar kichikroq",
              "Rasmlar qisqa media hash bilan yuklanadi; ovoz service worker orqali oqadi, u to'liq URL yuboradi",
              "Server ovozni sekinroq beradi",
            ],
            answer: 1,
            why: "Faqat progressive (oqimli) yo'l service worker orqali to'liq URL bilan o'tardi; regex qisqa hash shakli uchun yozilgan edi.",
          },
          fields: {
            "service worker": "Oqimli media qismlarini pleerga beradigan Web A worker'i.",
            "old regex": "Korxona media hash'i oldida faqat `progressive/` tura olardi.",
            "full URL": "Service worker aslida beradigan narsa.",
            RE_CORP_MEDIA_HASH: "Media so'rovi korxona mediasi ekanini hal qiladigan naqsh.",
            "60 s": "Foydalanuvchi ko'rgani: pleer taslim bo'lguncha aylanib turgan belgi.",
          },
        },
        "voice-fix": {
          short: "Istalgan yo'l",
          title: "Hash oldida istalgan yo'lni qabul qilish",
          body: "`caafd44` commit'i bitta regex'ni o'zgartirdi: endi `photo` yoki `document` va korxona prefiksi oldida istalgan yo'l tura oladi. Bitta parser qisqa shaklni ham, to'liq URL'ni ham qabul qiladi, `media.ts` esa faylni korxona serveridan korxona tokeni bilan xotiradagi blob sifatida oladi.\n\nDeploy'dan oldin ovozli xabarni ijro etadigan skript tuzatishni tasdiqladi. Kutish taxminan bir daqiqadan odatiy ijroga tushdi.",
          fields: {
            "new regex": "`^(?:.*\\/)?` slash bilan tugaydigan istalgan prefiksni qabul qiladi.",
            parseCorpMediaHash: "Provider va media loader ishlatadigan yagona parser.",
            blob: "Fayl xotirada qoladi, diskka yozmaslik qoidasiga mos.",
            playback: "Korxona ovozli xabarini boshidan oxirigacha ijro etadigan skript.",
          },
        },
      },
    },
    approval: {
      label: "Qo'lda tasdiq",
      steps: {
        "appr-wait": {
          short: "Kutilmoqda",
          title: "Yangi xodim administratorni kutadi",
          body: "Yangi xodim CorpGate ekranidan ro'yxatdan o'tadi. Administrator \"ha\" demaguncha har kirish \"pending\" bilan 403 qaytaradi. Klient ro'yxatni shu Telegram akkaunti uchun sessionStorage'da saqlaydi, kutish ekranini ko'rsatadi va xuddi shu kirishni har 15 soniyada qaytaradi. Hech narsani qayta bosish shart emas, tabni qayta yuklash ham kutish holatini saqlaydi.",
          check: {
            q: "Nega klient xodimdan keyinroq kirishni so'ramasdan har 15 s qayta urinadi?",
            options: [
              "Server 15 s dan sekin kirishlarni rad etadi",
              "Tasdiq admin tomonidagi qo'lda qadam; so'rov tsikli ilovani u bo'lishi bilan xodim hech narsa qilmasdan ochadi",
              "Buni Telegram talab qiladi",
            ],
            answer: 1,
            why: "Tasdiq boshqa ilovada, boshqa odam tomonidan bo'ladi. Qisqa qayta urinish tsikli hali tokeni yo'q akkaunt uchun push kanalisiz uni avtomatik ochilishga aylantiradi.",
          },
          fields: {
            password: "Faqat qayta urinishlar uchun sessionStorage'da saqlanadi. Bu yerda yashirilgan.",
            "403": "Forbidden: akkaunt bor, lekin hali kira olmaydi.",
            pending: "Kutishni rad etishdan ajratadigan javob tanasi.",
            sessionStorage: "Tab bo'yicha, tab yopilganda yo'qoladi; kalit - Telegram user id.",
            "15 s": "src/teletwin/index.ts dagi PENDING_RETRY_INTERVAL.",
          },
        },
        "appr-ok": {
          short: "Tasdiqlandi",
          title: "Administrator tasdiqlaydi: keyingi urinish ilovani ochadi",
          body: "Administrator so'rovni admin panelda tasdiqlaydi. Keyingi urinish access token bilan 200 oladi; klient shu Telegram akkaunti uchun korxona loginini saqlaydi, kutish yozuvini o'chiradi va sinx dvigatelni ishga tushiradi. Agar administrator rad etsa, 403 \"rejected\" deydi, urinishlar to'xtaydi va xodim administratorga murojaat qilish haqidagi xabarni ko'radi.",
          fields: {
            approves: "Korxona serverining admin panelidagi qo'lda qaror.",
            "200": "Oddiy kirish javobi: token va xodim.",
            pending: "Yozuv o'chiriladi, shuning uchun qayta yuklash to'g'ri ilovaga olib boradi.",
            rejected: "Yakuniy: boshqa urinish yo'q.",
          },
        },
      },
    },
    "offline-revoke": {
      label: "Oflayndagi revoke",
      steps: {
        "off-stale": {
          short: "Yetmagan voqea",
          title: "logout voqeasi uxlab yotgan noutbukka yetmaydi",
          body: "Administrator noutbuki yopiq turgan xodimni revoke qildi. Hub voqeasi yetkazilmadi, chunki soket allaqachon o'lik edi. Tab hali ham korxona chatlarini xotirada ushlab turibdi, qopqoq ochilishi bilan ular ekranda bo'lardi. Diskda hech narsa yo'q: reduceGlobal har saqlashdan oldin korxona ma'lumotini olib tashlagan.",
          check: {
            q: "Bu noutbuk uyg'onganda tozalanishini nima kafolatlaydi?",
            options: [
              "Administrator uni yana revoke qilishi kerak",
              "Hub'ga qayta ulanishdan oldin dvigatel GET /api/me ni chaqiradi; 401 xuddi shu revoke'ni ishga tushiradi",
              "Keyingi Telegram kirishi",
            ],
            answer: 1,
            why: "O'tkazib yuborilgan push mobil va uxlayotgan qurilmalarda odatiy. Qayta ulanishdagi tekshiruv har qanday o'tkazib yuborilgan logout'ni xuddi shu tozalashga aylantiradi, voqeaning yetkazilishi shart emas.",
          },
          fields: {
            logout: "Odatda qurilmani taxminan bir soniyada tozalaydigan hub voqeasi.",
            "never delivered": "Soket uyqu bilan o'ldi; server unga yeta olmaydi.",
            "in memory": "Faqat ochiq tab holati; qayta yuklashda baribir yo'qoladi.",
            reduceGlobal: "Korxona ma'lumotini diskdan tashqarida ushlaydi, oflaynda o'qiydigan narsa yo'q.",
          },
        },
        "off-wipe": {
          short: "401 tozalaydi",
          title: "Uyg'onganda GET /api/me 401 qaytaradi va dvigatel revoke qiladi",
          body: "Noutbuk uyg'onganda hub'ga qayta ulanish `GET /api/me` dan boshlanadi. Token revoke qilingan akkauntniki, server 401 qaytaradi va dvigatel `revoke()` ni ishga tushiradi: hub voqeasi bilan bir xil yo'l. Korxona logini, chatlar va media har tabda yo'qoladi; Telegram sessiyasi qoladi. 401 qaytargan har qanday boshqa REST chaqiruv ham xuddi shunday qiladi.",
          fields: {
            Authorization: "Revoke qilingan korxona tokeni. Bu yerda yashirilgan.",
            "401": "Sessiya yo'q: tozalash signali.",
            revoke: "Hub voqeasi, REST 401 va qayta ulanish tekshiruvi uchun bitta funksiya.",
          },
        },
      },
    },
  },
};

export default text;
