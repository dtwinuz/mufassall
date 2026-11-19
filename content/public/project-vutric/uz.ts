import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Vutric, telefondan kompyuterga otilgan rasm",
  summary:
    "Vutric - wonmortech'ning ochiq kodli ilovasi: rasmni telefon ekrani chetidan otasiz, u kompyuter ekrani chetidagi yorug' halqadan otishingiz tezligi va burchagi bilan uchib chiqadi. Akkaunt yo'q, bulut yo'q, uchidan-uchigacha shifrlangan, internetsiz umumiy tarmoqda ham ishlaydi. Loyiha 0-bosqichdagi holatida to'liq: foydalanuvchi nimani ko'radi, Flutter telefon ilovasi bilan umumiy Rust yadro, iroh QUIC, fokusni hech qachon olmaydigan wgpu overlay, taxmin qilib bo'lmaydigan juftlash kodi, pipeline'lar (CI, fuzzing, mobil build'lar, rollback'li dizayn-tizimi sayti deploy'i) va ish qanday qoidalar bilan yuritiladi.",
  learn: [
    "Foydalanuvchi tomoni: galereyadan yuborish, otish harakati, kompyuterdagi Halqa, QR yoki olti raqam bilan juftlash",
    "Arxitektura: telefon bilan bayt-ma-bayt umumiy toza Rust yadro, yupqa platforma host'lari, QUIC ustida avval-preview protokoli",
    "Har bir asbob nega tanlangan: kalitlar va NAT uchun iroh, shaffof va bosish o'tadigan overlay uchun wgpu + DirectComposition, telefon uchun Flutter + flutter_rust_bridge",
    "Pipeline'lar: Windows va Linux'da CI, har bir parser'ni fuzzing, iOS va Android build'lari, o'zi orqaga qaytadigan atomik sayt deploy'i",
  ],
  nodes: {
    phone: "Telefon ilovasi",
    desk: "Kompyuter daemon'i",
    overlay: "wgpu overlay",
    find: "LAN'da topish",
    relay: "iroh relay",
    store: "Ishonch ombori",
    ci: "GitHub Actions",
    web: "vutric.wonmor.io",
  },
  metrics: {
    fps: "Overlay kadr tezligi",
    missed: "Bir yurishda o'tkazib yuborilgan vblank",
    unknown: "Kiritilgan notanish qurilmalar",
    stall: "Jim mijoz ortida kutish",
    bugs: "Ochiq fayl nomi xatolari",
    flaky: "Vaqt taxmini sabab yiqilgan main yurishlari",
  },
  steps: {
    what: {
      short: "Bu nima",
      title: "Rasmni oting, qo'nishini ko'ring",
      body: "Vutric (to'qilgan nom, repo `wonmortech/vutric`, Apache-2.0) telefon va kompyuter o'rtasida rasm va fayllarni bir harakat bilan yuboradi. Elementni telefon ekrani chetidan otasiz; kompyuter ekrani chetida portal ochiladi va element undan GPU'da chizilgan holda, otishingiz tezligi va burchagi bilan uchib chiqadi. Avval lokal tarmoq, uchidan-uchigacha shifrlash, akkauntsiz.\n\n\"Bir zumda\" hissining siri - **avval preview**: `FlingStart` kichik JPEG preview va harakatni olib keladi, qabul qiluvchi effektni darhol boshlaydi, to'liq fayl esa yonma-yon oqib keladi va BLAKE3 bilan tekshiriladi. Qabul qiluvchi `EffectStarted` ni faqat rasm ko'rsatilgan kadr ekranga chiqqandan keyin yuboradi. Topshiriqdagi maqsad: barmoq qo'yib yuborilgandan birinchi kadrgacha 100 ms dan kam.\n\nHolat, halol: 0-bosqich, texnik spike'lar. Windows overlay chiqish mezonlaridan o'tdi; tarmoq mezonlari ikki qurilma bilan haqiqiy Wi-Fi'da hali ochiq.",
      fields: {
        FlingStart: "Har otilgan element uchun bitta xabar: animatsiyani boshlash uchun boshqa hech narsa kerak emas.",
        gesture: "Otish tezligi va burchagi, rasm portaldan bosh barmoqdan qanday chiqqan bo'lsa shunday chiqadi.",
        preview: "Yuboruvchida yasalgan kichik JPEG; effekt 4 MB lik asldan emas, undan boshlanadi.",
        blake3: "Butun fayl hash'i: oqib kelgan baytlar saqlanishidan oldin unga solishtiriladi.",
        EffectStarted: "Rasm haqiqatan chizilgandan keyingi javob, shuning uchun aylanma vaqt halol yuqori chegara.",
        receiver_micros: "Qabul qiluvchining monoton soati: kechikish soatlarni sinxronlamasdan o'lchanadi.",
      },
    },
    send: {
      short: "Yuborish",
      title: "Telefon o'z galereyasi bilan ochiladi",
      body: "Egasi birinchi ekran tizim tanlagichi emas, Vutric ichidagi telefon galereyasi va fayllari bo'lishini so'radi (ADR-0008). Ikki tab: **Galereya** va **Fayllar**. Kichik rasmlar OS keshidan 200 px da olinadi, setka faqat ko'rinadigan kataklarni quradi va sahifasiga 120 tadan yuklaydi, shuning uchun minglab rasm tez ochiladi.\n\nIstagancha element bosasiz; har katakda raqami chiqadi va fayllar shu **bosish tartibida** ketadi. Bitta tugma: sessiya hali yo'q bo'lsa u \"Ulanib yuborish · N ta\" deydi va bitta ulanish oynasini ochadi: kompyuter QR'ini skanerlash, shu Wi-Fi'da topish yoki mening QR'imni ko'rsatish. Ko'p fayl - bitta `Offer`; qabul qiluvchi bir marta javob beradi.\n\nInterfeys o'zbek lotinida, i18n kalitlari bilan. Bularning hammasi Flutter'da qurilgan va testlangan, lekin backlog uni faqat haqiqiy telefonda sinalgandan keyin bajarildi deb belgilaydi.",
      fields: {
        Offer: "Taklif qilingan fayllar, bir xabarda ko'pi bilan 256 ta; kattaroq uzatish bir xil id'li bir necha taklif.",
        entries: "Har fayl nomi, turi va hajmi; qabul qiluvchi bitta bayt kelmasidan oldin qaror qiladi.",
        "tap order": "Foydalanuvchi tanlagan tartib qabul qiluvchi ko'radigan tartib.",
        OfferReply: "Butun uzatish uchun bitta ha yoki yo'q.",
        have: "Uzilgan uzatishdan qolgan baytlar: yuboruvchi shu joydan davom etadi va baribir butun faylni hash bilan isbotlaydi.",
      },
    },
    land: {
      short: "Qo'nish",
      title: "Kompyuterda: klaviaturangizni hech qachon olmaydigan halqa",
      body: "Kompyuterda rasm Send Zone chetidagi **Halqa** effektidan chiqadi, keyin karta uni ochishni taklif qiladi. Qat'iy talab: effekt o'ynayotganda siz muharriringizda yozishda davom etasiz. Overlay har bir oyna ustiga qisman shaffof, silliq piksellar chizishi, har bir bosishni pastga o'tkazishi va fokusni hech qachon olmasligi kerak.\n\nWindows'da oyna handle'idan yasalgan swapchain faqat noshaffof alfani beradi (wgpu issue 5661), bu ekranni qora qilib qo'yardi. Shuning uchun oyna bir marta shu kengaytirilgan stillar bilan yaratiladi, DirectComposition orqali kompozitsiya qilinadi va effektlar orasida ham shaffof holda ko'rinib turadi: ko'rsatish-yashirish yo'q, demak miltillash yo'q. Adapter shaffoflikni qila olmasa, overlay ish stolini yopib qo'ygandan ko'ra ishga tushmaslikni tanlaydi.\n\nQabul qiluvchi Android telefon Halqa'ni ilova ichida yoki heads-up bildirishnoma bilan ko'rsatadi; Vutric \"boshqa ilovalar ustidan chizish\" ruxsatini hech qachon so'ramaydi. Maqsadli mashinadagi birinchi o'lchov yetarli emas edi: 60 fps dan past va vblank'lar o'tkazib yuborilgan.",
      watch: "Overlay tuguniga qarang: effekt ishlaydi, lekin raqamlar 60 fps chizig'iga yetmaydi.",
      fields: {
        WS_EX_TRANSPARENT: "Kiritish pastdagi qaysi oyna bo'lsa, o'shanga o'tadi.",
        WS_EX_NOACTIVATE: "Ko'rsatish yoki chizish uni faol oynaga aylantirmaydi, kursoringiz joyida qoladi.",
        PreMultiplied: "DirectComposition orqali piksel-ma-piksel shaffoflik; shader premultiplied chiziqli rang chiqaradi.",
        "missed vblanks": "Ekran yangilanishiga tayyor bo'lmagan kadr: harakat tutiladi.",
      },
    },
    pair: {
      short: "Juftlash",
      title: "Juftlash: kalitni mahkamlaydigan QR",
      body: "Qurilmalar biror narsa almashishdan oldin juftlashadi. Ekranli qurilma juftlash ticket'i bor QR ko'rsatadi; kamerali qurilma uni skanerlaydi. Ticket qurilmaning **Ed25519 endpoint kalitini** olib yuradi, shuning uchun QUIC ulanishda o'zini boshqa qilib ko'rsatganni rad etadi. Unda multicast'ni tashlab yuboradigan tarmoqlar uchun 8 tagacha LAN manzil maslahati va juftlash oynasi ochiq turganda bir martalik sir ham bor.\n\nIkki tomonda ham kamera yo'qmi (kompyuterdan kompyuterga)? Qurilmani yaqindagilar ro'yxatidan tanlaysiz va ikki ekran solishtirish uchun olti raqam ko'rsatadi. Qo'lda yozilgan LAN manzil yoki qisqa `ABCD-EFGH` kodi ham ishlaydi va doim o'sha olti raqamli tekshiruv bilan tugaydi.\n\n0.2 spike'ning zaif joyi: listener o'ziga yetib kelgan har qanday qurilmani qabul qilardi, olti raqam esa ko'rsatilardi-yu, hech kim tasdiqlashi shart emas edi. Metrikadagi 100 % shu.",
      check: {
        q: "QR tengdoshning kalitini allaqachon mahkamlaydi. Unda yaqindagilardan juftlashda nega baribir olti raqamni solishtirish kerak?",
        options: [
          "Kerak emas; raqamlar faqat chiroy uchun",
          "QR bo'lmasa hech qanday kalit mahkamlanmagan: mDNS'ga javob bergan o'rtadagi odam ikki qurilma orasiga tushishi mumkin",
          "Chunki mDNS QR'dan sekinroq",
        ],
        answer: 1,
        why: "Skanerlangan QR dialer'ga qaysi kalitni kutishni aniq aytadi. Tarmoqda topilgan qurilma birinchi javob bergan har kim bo'lishi mumkin. Raqamlar aynan shu ulanishning TLS siridan olinadi, shuning uchun o'rtadagi odam ikki ekranda turli raqam chiqishiga sabab bo'ladi.",
      },
      fields: {
        v: "Protokol versiyasi: boshqa versiya taxmin qilinmaydi, rad etiladi.",
        id: "Endpoint kalitining 64 ta hex belgisi, har ulanishda QUIC tekshiradi.",
        a: "IP:port maslahatlari, eng yaxshisi birinchi; virtual adapterlar oxirida.",
        s: "16 tasodifiy bayt, faqat juftlash oynasi ochiqligida bor; takrorlangan qiymat havolani yaroqsiz qiladi.",
        PairProof: "Dialer joriy QR'ni o'qiganini isbotlaydi, listener uni ticket orqali juftlangan deb saqlay oladi.",
      },
    },
    crates: {
      short: "Arxitektura",
      title: "Toza yadro, yupqa host'lar",
      body: "Repo bitta Cargo workspace (`rust-toolchain.toml` da Rust 1.96 mahkamlangan, edition 2024). Shakli ataylab shunday:\n\n- **Toza yadro.** Protokol, framing, juftlash va fayl nomi xavfsizligida I/O yo'q, shuning uchun ular to'liq testlanadi va telefon bilan `flutter_rust_bridge` orqali bayt-ma-bayt umumiy. Telefon va kompyuter bir-biridan uzoqlashib keta olmaydi.\n- **Toza timeline.** Effekt vaqtning funksiyasi; renderer WGSL'dagi bitta scissor'li SDF o'tishi. Yangi effekt - timeline va shader, GPU'siz testlanadi va har bir host'ga ko'chadi.\n- **Yupqa host'lar.** Platformaga xos hamma narsa - shaffof, kiritish o'tadigan, faollashmaydigan sirt ekranga qanday chiqishi: Windows'da DirectComposition, KDE va wlroots'da layer-shell, GNOME'da Shell kengaytmasi, macOS'da `NSPanel`.\n\nXabarlar 4 baytli uzunlik ortida postcard'da kodlanadi; 128 KiB dan katta tana sarlavhaning o'zidan, hech narsa ajratilmasdan rad etiladi.",
      fields: {
        "vutric-core": "Socket ham, fayl ham yo'q: faqat bayt kiradi, qiymat chiqadi. Fuzzing va umumiy ishlatishni oson qilgan narsa shu.",
        "vutric-mobile": "Telefon ko'prigi: Dart kompyuter yurgizadigan o'sha Rust kodini chaqiradi.",
        "vutric-overlay": "Timeline + renderer; oynalar haqida hech narsa bilmaydi.",
        "vutric-host-win": "Chizish yo'lidagi Windows'ga xos yagona crate.",
        "128 KiB": "Yovuz uzunlik prefiksi qabul qiluvchini gigabaytlab xotira ajratishga majburlay olmaydi.",
      },
    },
    "overlay-fix": {
      short: "60 fps",
      title: "60 fps ni olib bergan ikki sozlama",
      body: "Spike 2560x1440 dagi o'rnatilgan Intel UHD 730 da uch variantni o'lchadi (ADR-0004). Frame latency 1 bo'lganda GPU'da zaxira yo'q edi va har yurishda 5 dan 14 tagacha vblank o'tkazib yuborildi. Ikki o'zgarish tuzatdi: `desired_maximum_frame_latency = 2` va **bo'lingan scissor'lar** - har kadr sirtni tozalaydi va faqat timeline qaytargan joylarni (portal, karta va iz) bo'yaydi, hech qachon butun ekranni emas.\n\nNarxi - navbatda bitta qo'shimcha kadr, taxminan 16.7 ms, silliq ritm uchun qabul qilingan; iliq oynadan birinchi kadr kechikishi 100 ms budjet ichida bemalol qoladi. Fokus har kadrda `GetForegroundWindow` bilan tekshirildi: 15 yurishda bir marta ham olinmadi.\n\nO'lchashdan ikki saboq: 0-sessiyadagi jarayon (servis, SSH shell) ko'rinadigan sirt yarata olmaydi, shuning uchun spike ish stoli sessiyasidan yurgizilishi kerak; o'lchov paytida ekranni yozib olish esa o'sha build'ni taxminan 41 fps gacha tushirdi.",
      check: {
        q: "Latency 2 navbatga taxminan 16.7 ms qo'shadi. Maqsad \"bir zumda\" bo'lsa, nega uni qabul qilish kerak?",
        options: [
          "Chunki 100 ms budjetda joy bor, tutilish esa bitta kadrdan ko'ra ko'proq ko'zga tashlanadi",
          "Chunki wgpu latency 1 ni qo'llamaydi",
          "Chunki tarmoq baribir sekinroq, hech narsa ahamiyatli emas",
        ],
        answer: 0,
        why: "Qo'yib yuborishdan pikselgacha budjet 100 ms, iliq birinchi kadr esa ko'pi bilan 10.7 ms oldi, demak bitta qo'shimcha kadr sig'adi. Uchish paytida tushib qolgan kadrlarni ko'z sezadi. Hali tekshirilmagan: NVIDIA va AMD GPU'lar, Windows 11, aralash DPI'li monitorlar.",
      },
      fields: {
        "union scissor": "Hammasini o'rab olgan bitta to'rtburchak: har kadrda ko'proq piksel bo'yaladi.",
        "split scissor": "Faqat portal va karta bo'yaladi.",
        "latency 2": "Swapchain ikki kadrni navbatga qo'ya oladi, sekin kadr yangilanishni o'tkazib yubormaydi.",
        "focus taken": "Taxmin emas, o'lchangan: oldingi oyna har kadrda tekshirildi.",
      },
    },
    net: {
      short: "Tarmoq",
      title: "iroh QUIC: avval shu Wi-Fi, kerak bo'lsa internet",
      body: "Har bir qurilma - tengdosh (ADR-0005): hamma joyda bir xil Rust yadro ishlaydi, doimiy Ed25519 identifikatorli iroh endpoint'ini saqlaydi va har qaysi qurilma boshqasiga yubora oladi, telefondan telefonga va kompyuterdan kompyuterga ham. **Nega iroh:** tengdosh kaliti bilan autentifikatsiya qilinadigan TLS 1.3 li QUIC, lokal topish, NAT teshish va shifrlangan relay zaxirasi bitta kutubxonada.\n\nTengdoshni topish: mDNS, ticket'dagi manzil maslahatlari va mDNS yomon ishlaydigan tarmoqlar uchun Vutric'ning o'z 41 baytli UDP beacon'i; ko'rinadigan qurilma so'rovga har manbaga 500 ms da ko'pi bilan bir marta javob beradi. Yetib borish: default'da avval lokal, keyin internet. Teshish ko'p tarmoqlarda ishlaydi; ishlamasa, iroh relay faqat shifrmatnni uzatadi. Faqat-LAN rejimi tarmoqdan tashqaridagi hech narsaga tegmaydi. Qurilma nomi qidiruv xizmatiga hech qachon e'lon qilinmaydi.\n\nHozircha bitta mashinada, ikki jarayonda o'lchangan: mDNS topish 138 ms, QUIC ulanish va Hello 6 ms. Bu Wi-Fi raqami emas, hisobot ham shunday deydi.",
      check: {
        q: "Mehmon va mehmonxona Wi-Fi'lari ko'pincha mijozlarni bir-biridan ajratadi. Vutric u yerda nima qiladi?",
        options: [
          "Tengdosh javob bermaguncha subnet'ni qattiqroq skanerlaydi",
          "Buni aniqlaydi (ticket manzillariga yetib bo'lmaydi) va Hotspot rejimini taklif qiladi: bitta telefon lokal tarmoq ochadi",
          "Rasmni Bluetooth orqali to'liq hajmda yuboradi",
        ],
        answer: 1,
        why: "Mijozlarni ajratish unicast'ni ham to'sadi, hech qanday topish usuli yordam bermaydi. Ilova buni aniqlab, SSID va paroli o'sha QR ichida bo'lgan faqat-lokal hotspot taklif qiladi. Bluetooth faqat topish va handshake uchun: 1 Mbit/s dan ancha past tezlikda bitta rasm o'nlab soniya ketardi.",
      },
      fields: {
        "41 bytes": "Qat'iy o'lcham: boshqasi beacon emas.",
        VTRC: "Sehrli baytlar: boshqa ilovadan adashib kelgan datagram darhol yiqiladi.",
        "endpoint id": "32 baytli kalit; manzil datagram'ning manba IP'sidan olinadi.",
        "dropped unread": "Beacon autentifikatsiyalanmagan, u faqat qayerga ulanishni aytadi; kalitni baribir QUIC tekshiradi.",
      },
    },
    trust: {
      short: "Ishonch",
      title: "Birinchi baytdan oldingi darvoza va taxmin qilib bo'lmaydigan raqamlar",
      body: "Spike'dagi olti raqamli kod `TLS exporter mod 10^6` edi. mDNS'ga javob beradigan o'rtadagi odam uni \"maydalashi\" mumkin: bitta qurbonning serveri sifatida u ikki kod mos kelguncha kalit ulushini qayta-qayta almashtiradi, taxminan 2^20 urinish, bir necha soniyalik CPU. ADR-0050 uni **avval-bog'lash-keyin-ochish** (commit-then-reveal) bilan almashtirdi, bu Bluetooth raqamli solishtirish sxemasi: hujumchi o'z nonce'ini boshqasini ko'rishidan oldin tanlashi shart, shuning uchun har urinish 10^-6 ehtimol bilan mos keladi va ikki ekranda ko'rinadigan juftlashga tushadi.\n\nIkkinchi yarmi - faqat endpoint kaliti bo'yicha kalitlangan **ishonch ombori**: nom yoki manzil qurilmani hech qachon ishonchli qilmaydi, qurilmani ko'rish uni hech qachon qo'shmaydi. Kirish QUIC kalitni autentifikatsiya qilishi bilanoq, control stream o'qilishidan oldin hal qilinadi; rad etilgan tengdosh 403 kodini oladi va u yuborgan hech narsa parse qilinmaydi. \"Hamma\" ko'pi bilan 10 daqiqa davom etadi, undan uzoqroqda tugaydigan oyna tugagan hisoblanadi, shuning uchun orqaga surilgan soat uni ochiq tutolmaydi.",
      check: {
        q: "Kimdir sozlamalar faylini \"hamma\" 2030 yilda tugaydigan qilib tahrirlaydi. Nima bo'ladi?",
        options: [
          "Notanish qurilmalar 2030 yilgacha yubora oladi",
          "Oyna tugagan hisoblanadi, chunki u 10 daqiqadan ko'proq oldinda tugaydi",
          "Ilova ishga tushishda yiqiladi",
        ],
        answer: 1,
        why: "Qoida faqat tugash vaqtiga emas, maksimal uzunlikka ham solishtiriladi: 10 daqiqadan uzun har qanday narsa allaqachon tugagan deb olinadi. Buzilgan ishonch fayli chetga olinadi va ombor bo'sh boshlanadi: qayta juftlash xavfsiz, taxmin qilish emas.",
      },
      fields: {
        PairCommit: "TLS siri va dialer tasodifiy qiymatining hash'i: bog'laydi, lekin hech narsani oshkor qilmaydi.",
        PairNonce: "Listener'ning tasodifiy qiymati, faqat bog'lanish kelgandan keyin yuboriladi.",
        PairReveal: "Bog'lanishni ochadi; mos kelmasa yoki tartibsiz kelsa - PairingTampered.",
        "six digits": "BLAKE3 derive-key rejimidan, bog'lanish va kod uchun alohida kontekstlar bilan.",
        "403": "QUIC ilova xatosi: dialer NotAdmitted turli xatosini oladi va UI uni tushuntira oladi.",
        "10 minutes": "AirDrop'dagidek: ochiqlik o'zini o'zi o'chiradi.",
      },
    },
    interop: {
      short: "Moslik",
      title: "Odamlar allaqachon ishlatadigan protokollarda gapirish",
      body: "Vutric bir yo'la bir nechta ilova o'rnini bosmoqchi, shuning uchun ADR-0010 adapterlar qo'shadi: har biri `vutric-compat-<nom>` crate'i bo'lib, begona protokolni o'sha ichki pipeline'ga ulaydi. LocalSend orqali kelgan fayl Vutric faylidagi kabi Halqa'ni, papka qoidalarini va galereya nusxasini oladi.\n\nQoidalar qattiq, chunki bu parser'lar notanishlarning baytlarini o'qiydi: har adapterda sandbox'langan parser jarayoni, o'sha PR'da fuzzer va haqiqiy ilovaga qarshi test bor. Masalan magic-wormhole adapteri `Interop` workflow'ida mos Python asbobiga, uning o'z mailbox serveri va transit relay'iga qarshi, hammasi runner'da, versiyalari mahkamlangan holda testlanadi, shuning uchun upstream relizi ataylab qilingan ko'tarish bo'lib ko'rinadi.\n\nAdapter notanish yuboruvchidan hech qachon avtomatik qabul qilmaydi.",
      fields: {
        LocalSend: "Ochiq spetsifikatsiya, HTTPS ustida REST, multicast va HTTP subnet skaneri.",
        "Quick Share": "Google'ning LAN rejimi, NearDrop hujjatlaganidek: UKEY2 handshake va protobuf freymlar.",
        "KDE Connect": "Faqat ulashish plagini: fayl kiradi-chiqadi, kompyuterni boshqaradigan hech narsa yo'q.",
        "magic-wormhole": "Qisqa kodli PAKE: umumiy tarmog'i yo'q ikki mashina orasida ham ishlaydi.",
        "same pipeline": "Parse'dan keyin bitta kod yo'li, saqlash qoidalari va effektlar protokolga qarab ajralmaydi.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: Windows va Linux, ogohlantirish = xato",
      body: "main'ga har push va har PR `ci.yml` ni `windows-latest` va `ubuntu-latest` da yurgizadi: overlay host'i faqat Windows kodi, qolgani ikkalasida ham build bo'lishi kerak. `RUSTFLAGS=-D warnings` va **pedantic** guruhi yoqilgan clippy har qanday ogohlantirishni xatoga aylantiradi; `--locked` `Cargo.lock` o'zgaradigan build'ni rad etadi.\n\nLinux'da job formatlashni ham tekshiradi va dizayn-tizimi saytida `tools/check-site.mjs` ni yurgizadi. `main` dagi ruleset ikkala tekshiruvni, bitta approve'ni va squash merge'ni talab qiladi.\n\nYAML'ni bitta cheklov shakllantirdi: tashkilot faqat GitHub'ga tegishli yoki tasdiqlangan action'larga ruxsat beradi, shuning uchun mashhur jamoat Rust keshi ishlatilmaydi, o'rniga `actions/cache` toolchain fayli va lockfile bo'yicha kalitlanadi.",
      fields: {
        RUSTFLAGS: "Butun job uchun o'rnatilgan, har qanday crate'dagi ogohlantirish build'ni to'xtatadi.",
        "check-site": "Saytning o'z qo'riqchisi: inline kod, begona manbalar, IPv4 manzillar va kirill harflari yiqitadi.",
        clippy: "Barcha target'lar, testlar ham; pedantic lint'lar ogohlantirish, ogohlantirishlar esa xato.",
        "--locked": "CI aynan ko'rib chiqilgan bog'liqliklar to'plamini build qiladi.",
        "actions/cache": "Registry va target papkalari toolchain + lockfile hash'i bo'yicha keshlanadi.",
      },
    },
    fuzz: {
      short: "Fuzzing",
      title: "Tengdosh kiritishini ko'radigan har bir parser fuzzing'dan o'tadi",
      body: "ADR-0051: tengdoshdan yoki fayldan bayt o'qiydigan har narsaning fuzz target'i bor, har target faqat \"panic yo'q\" ni emas, xossani tekshiradi. Freym dekoderi ko'pi bilan bitta freym va bitta o'qishni bufferlashi kerak; qabul qilingan har xabar o'zgarmay aylanib qaytishi kerak; saqlanadigan yo'l saqlash papkasi ichida qolishi va Windows, Linux va macOS'da yaroqli nom bo'lishi kerak.\n\n`fuzz/` - o'z workspace'idagi cargo-fuzz crate'i, shuning uchun nightly flag'lar asosiy build'ga yetib bormaydi. Har target oddiy funksiya, shuning uchun bir xil tekshiruvlar uch yo'l bilan yuradi: har push'da stable smoke yurishi (Windows'da ham ishlaydi), CI'da Linux'da AddressSanitizer'li libFuzzer va har qanday crash faylini qo'lda qayta o'ynash. libFuzzer Windows MSVC'da link bo'lmaydi, shuning uchun u faqat Linux'da yuradi.",
      check: {
        q: "Nega har fuzz target fuzz/src/lib.rs da oddiy funksiya sifatida yozilgan?",
        options: [
          "Bir xil xossa ham stable'da (smoke test), ham nightly libFuzzer ostida yurishi uchun",
          "Chunki libFuzzer Rust kodini chaqira olmaydi",
          "Binarlarni kichikroq qilish uchun",
        ],
        answer: 0,
        why: "`fuzz_targets/<nom>.rs` fayllari baytlarni shu funksiyalarga uzatadi, xolos. Stable smoke test o'sha funksiyalarni tasodifiy va bit'i almashtirilgan kiritishlar bilan chaqiradi, shuning uchun nightly yoki C++ toolchain'i yo'q hissa qo'shuvchi ham har tekshiruvni yurgizadi.",
      },
      fields: {
        smoke: "Deterministik va tez: har push'da bir necha soniya.",
        libfuzzer: "Qamrovga yo'naltirilgan; korpus yurishlar orasida keshlanadi.",
        targets: "Har bir adapter o'sha PR'da o'z freym parser'ini shu yerga qo'shadi.",
        "fuzz/regressions/": "Bir marta topilgan har crash abadiy qayta o'ynaladi.",
      },
    },
    mobile: {
      short: "Mobil build",
      title: "Telefon ilovasini build qilish: qiyin yo'l bilan topilgan iOS tuzoqlari",
      body: "Android APK egasining Windows mashinasida NDK bilan build bo'ladi. iPhone build'iga Mac kerak edi, shuning uchun u `iOS spike` workflow'ida yuradi va sideload uchun imzosiz IPA chiqaradi. iOS 3-bosqichdan oldinga faqat egasining iPhone'ida o'lchash uchun olingan.\n\nBu qadamning har qatori sodir bo'lgan xato: `libc` 0.2.190 iOS'da iroh tarmoq stekining ikki crate'ini buzdi, shuning uchun tuzatilgan nusxalar upstream reliz qilguncha `third_party/` ostida `[patch.crates-io]` bilan saqlanadi. Flutter linker'i Rust ko'prigini o'lik kod deb olib tashladi va ilova ochilishda yiqildi, shuning uchun o'lik kodni kesish o'chirilgan va CI ko'prik belgisi haqiqatan borligini `nm` bilan tekshiradi. arm64 macOS navbati timeout bo'ldi, shuning uchun job `macos-15-intel` da yuradi.\n\niOS'da yana topildi: multicast uchun bepul Apple ID ola olmaydigan Apple ruxsatnomasi kerak, shuning uchun `vutric-net` mDNS'siz ishlashda davom etadi va QR bilan juftlashadi.",
      fields: {
        "verified actions": "Uchinchi tomon setup action'iga ruxsat yo'q: Flutter o'z repozitoriyasidan clone qilinadi.",
        "third_party/netdev": "Upstream tuzatishi bilan vendored; tuzatish reliz bo'lgach olib tashlanadi.",
        "DEAD_CODE_STRIPPING=NO": "Aks holda linker Dart faqat ish vaqtida chaqiradigan Rust kodini o'chiradi.",
        frb_get_rust_content_hash: "flutter_rust_bridge eksport qiladigan belgi: u yo'q bo'lsa, ko'prik ham yo'q.",
      },
    },
    site: {
      short: "Sayt deploy",
      title: "Dizayn-tizimi sayti: atomik deploy, avtomatik rollback",
      body: "`site/` - vutric.wonmor.io dagi statik sahifa (cobalt va sand palitrasi, o'zida joylashgan Geist shriftlari, Canvas 2D'da chizilgan Halqa), dizayn-tizimi va ekranlarni hujjatlaydi. U saytga tegadigan main push'ida `deploy.yml` bilan, dtwin.uz ning umumiy edge proksisi ortida deploy qilinadi.\n\nServerdagi CI kaliti bitta buyruqqa bog'langan: `bin/receive` (authorized_keys'da `restrict,command=`), shuning uchun o'g'irlangan kalit reliz chiqarishdan boshqa hech narsa qila olmaydi. Host kaliti mahkamlangan, birinchi ulanishda ishonib qo'yilmaydi. Yangi reliz eskilari yoniga ochiladi va `releases/current` symlink almashtirish bilan o'tkaziladi; Caddy u orqali xizmat qiladi, shuning uchun bitta so'rov ham tushib qolmaydi.\n\nKeyin CI isbotlaydi: `version.txt` commit'ni ko'rsatguncha so'raydi, 7 ta yo'lni, 404 ni va CSP sarlavhasini tekshiradi. Yuborishdan keyin biror tekshiruv yiqilsa, workflow `rollback` ni yurgizadi, u `current` ni oldingi relizga qaytaradi.",
      check: {
        q: "Deploy yuborildi, lekin smoke test CSP sarlavhasi yo'qligini topdi. Nima bo'ladi?",
        options: [
          "Hech narsa: deploy qadami allaqachon muvaffaqiyatli bo'lgan",
          "Roll back qadami yuradi va current yana oldingi relizni ko'rsatadi",
          "Server saytni o'chirib yuboradi",
        ],
        answer: 1,
        why: "Rollback qadami yuborish qadami muvaffaqiyatli bo'lganda `failure()` da yuradi. Oldingi reliz hali diskda (5 tasi va oldingisi saqlanadi), shuning uchun orqaga qaytish yana bitta symlink almashtirish.",
      },
      fields: {
        "check-site": "CI'dagi o'sha qo'riqchi, yuborishdan oldin yana yurgiziladi.",
        "version.txt": "Sayt ichidagi commit SHA: jonli sahifa yangisi ekanining isboti.",
        "StrictHostKeyChecking=yes": "Server kaliti CI'da sir sifatida saqlanadi; notanish host rad etiladi.",
        rollback: "Faqat yuborish muvaffaqiyatli bo'lib, keyingi tekshiruv yiqilganda yuradi.",
        "bin/receive": "Majburiy buyruq: bu kalit serverga qildira oladigan yagona narsa.",
        "mv -T": "Eski symlink ustiga nomini o'zgartirish atomik: o'quvchi yo eski, yo yangi saytni ko'radi.",
      },
    },
    process: {
      short: "Jarayon",
      title: "Ish qanday tashkil qilingan",
      body: "2026-11-18 dan ish parallel oqimlarda yuradi, har biriga bitta AI sessiya, har oqim o'z git worktree'si va branch'ida: W1 telefon, W2 kompyuter, W3 tarmoq va moslik (keyinroq Linux, macOS va Android-native oqimlari ham). Har oqim o'z fayllariga va o'z ADR raqamlari oralig'iga yolg'iz egalik qiladi, shuning uchun ikki sessiya hech qachon bitta faylni tahrirlamaydi va qaror raqamida to'qnashmaydi. Ommaviy Rust API W3 niki va u uni faqat qo'shimcha tarzda o'zgartiradi; boshqalar `needs-w3` belgili issue orqali so'raydi.\n\nEgasining chizig'i - \"har jihatdan eng zo'ri\", tekshiriladigan qilingan: o'lchov ADR yoki hisobotga yozilmaguncha birorta tezlik da'vosi chiqmaydi. Misol: kompyuter oyna toolkit'i bir xil ekranni Slint, Tauri va Flutter'da o'lchab tanlandi (dasturiy renderer'li Slint 6.3 MB shaxsiy xotira ishlatdi, qolganlari taxminan 200 MB); bu ADR hali egasi kutayotgan taklif. Har bosqich hisobot va aniq ha yoki yo'q bilan tugaydi.",
      fields: {
        W1: "Dizayn handoff'idagi Flutter telefon ilovasi, Kotlin va Swift modullari.",
        W2: "Rust daemon, overlay kartalari va effektlar, kompyuter oynalari.",
        W3: "Yo'nalishlar, relay, ishonch va xavfsizlik, saqlash dvigateli, adapterlar, fuzzing.",
        "no performance claim": "O'lchangan raqam yoki hech narsa; taxmin hech qachon o'lchov deb yozilmaydi.",
        "go / no-go": "0-bosqich hali ochiq: uning tarmoq mezonlari haqiqiy Wi-Fi yurishini kutmoqda.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Vutric bir ekranda",
      body: "**Foydalanuvchi tomoni:** telefonning o'z galereyasida rasm tanlang, yuborishni bosing, oting; siz yozishda davom etayotganingizda rasm kompyuterdagi halqadan uchib chiqadi. Bir marta QR yoki olti raqamni solishtirib juftlang.\n\n**Texnik tomon:** telefon bilan flutter_rust_bridge orqali umumiy toza Rust yadro; kalit identifikator bo'lgan iroh QUIC, mDNS, 41 baytli beacon va shifrlangan relay; uzunligi tekshiriladigan postcard framing ustida avval-preview xabarlari; birinchi baytdan oldin qaror qiladigan ishonch ombori; DirectComposition orqali 60.3 fps va nol fokus yo'qotishli wgpu overlay.\n\n**Pipeline'lar:** ogohlantirish xato bo'lgan Windows va Linux CI'si, stable va libFuzzer'da 17 ta fuzz target, o'z qo'riqchi tekshiruvlari bilan iOS build, majburiy buyruqli kalit, atomik symlink almashtirish va avtomatik rollback'li sayt deploy'i.\n\n**Hali ochiq:** ikki qurilma bilan haqiqiy Wi-Fi o'lchovlari, diskret GPU'lar va Windows 11.",
    },
  },
  scenarios: {
    "stalled-client": {
      label: "Jim mijoz",
      steps: {
        "stall-bug": {
          short: "Tiqilish",
          title: "Bitta jim mijoz hammani ushlab turdi",
          body: "Birinchi tarmoq kodida listener ulanishlarni bittadan olardi: qabul, handshake, keyin keyingisi. QUIC ochib, keyin hech narsa yubormagan mijoz ortidagi har bir haqiqiy qurilmani to'sib qo'ydi. Hech qayerda timeout yo'q edi, shuning uchun jim tengdosh otishni yoki handshake'ni ham abadiy osiltirishi mumkin edi. Buni 0.2 kodining mustaqil review'i topdi.",
          fields: {
            "one at a time": "Ketma-ket qabul sikli: eng sekin mijoz hammaning sur'atini belgilaydi.",
            "sends nothing": "Shu tarmoqdagi hujumchi uchun arzon, yoki shunchaki buzuq telefon.",
            "t=7.9 s": "Haqiqiy telefon bekorga 7.8 s kutdi.",
            "no timeout": "Muddat bo'lmasa, \"kutyapti\" va \"o'lik\" bir xil ko'rinadi.",
          },
        },
        "stall-fix": {
          short: "Yonma-yon",
          title: "Handshake'lar yonma-yon, har kutish chegaralangan",
          body: "Endi har kiruvchi ulanish o'z vazifasini oladi, handshake 8 s, otishga javob 5 s muddatga ega. Yomon mijoz o'tkazib yuboriladi va listener ishlashda davom etadi. Bitta jarayonda haqiqiy jim mijoz va telefonga o'xshash haqiqiy mijoz bilan test o'lchaydi: oldin 7.8 s, endi 0.4 s dan kam.",
          fields: {
            "own task": "Bitta sekin tengdosh butun listener'ga emas, bitta vazifaga tushadi.",
            "8 s": "Yomon Wi-Fi'dagi sekin telefonga yetarli, muzlab qolgandek ko'rinmaslik uchun qisqa.",
            "5 s": "Otuvchi qabul qiluvchi javob bermaganini tez biladi.",
            "stalled_client.rs": "Tuzatish test bilan mahkamlangan, jimgina qaytib kela olmaydi.",
          },
        },
      },
    },
    "fuzz-finds": {
      label: "Fuzzer topdi",
      steps: {
        "fuzz-spaces": {
          short: "2 xato",
          title: "Birinchi smoke yurishi: Windows fayl nomidagi ikki tuzoq",
          body: "Stable smoke yurishi `sanitize` da ikki haqiqiy xato topdi - tengdosh bergan nomni xavfsiz fayl nomiga aylantiradigan funksiya. Uzun kengaytmani 16 belgigacha qisqartirish oxirida bo'sh joylar qoldirishi mumkin edi, Windows ularni jimgina tashlaydi, shuning uchun saqlangan nom tekshirilganidan farq qilardi. `com1 .tar.gz` esa COM1 qurilmasi deb tanilmadi, chunki Win32 nuqtadan oldingi bo'sh joylarga qaramaydi.",
          fields: {
            "trailing spaces": "Windows saqlashda ularni kesadi, tekshirilgan ikki xil nom bitta faylga aylanishi mumkin.",
            COM1: "Band qilingan qurilma nomi: uni ochish umuman fayl yaratmaydi.",
          },
        },
        "fuzz-long": {
          short: "3-xato",
          title: "libFuzzer 26 soniyada uchinchisini topdi",
          body: "CI'dagi birinchi libFuzzer yurishi tasodifiy yurish o'tkazib yuborgan birikmani topdi: o'zagi allaqachon 120 belgilik chegaragacha kesilgan band nom ustiga xavfsizlik prefiksi qo'shilib, chegaradan bitta belgiga oshib ketdi.",
          fields: {
            "120 characters": "O'zak uchun uzunlik chegarasi.",
            "121 characters": "Ketma-ket qo'llangan ikki to'g'ri qoida birgalikda chegarani buzdi.",
          },
        },
        "fuzz-fixed": {
          short: "Tuzatildi",
          title: "Tuzatildi va har push'da qayta o'ynaladi",
          body: "Har tuzatish regressiya testi bilan keldi. Band ro'yxatga COM0, LPT0, yuqori indeksli COM va LPT nomlari, CONIN$ va CONOUT$ qo'shildi. Prefiks endi belgi qo'shmaydi, oxirgi belgining o'rnini egallaydi. Yiqitgan kiritish `fuzz/regressions/` da saqlanadi va stable smoke yurishi uni har push'da qayta o'ynaydi.",
          fields: {
            "trailing spaces": "Kesish endi bo'sh joyni tozalaydi, tekshirilgan nom saqlangan nomning o'zi.",
            CONIN$: "Win32 band qilgan konsol qurilma nomlari.",
            "replaces the last character": "Uzunlik chegarasi har qoidadan keyin ham saqlanadi.",
            "fuzz/regressions/": "Bir marta topildi, abadiy testlanadi.",
          },
        },
      },
    },
    "flaky-smoke": {
      label: "Beqaror smoke",
      steps: {
        "flaky-bug": {
          short: "Main qizil",
          title: "PR'da yashil, main'da qizil, build bir xil",
          body: "macOS paketining smoke testi ilovani o'rnatadi va ulashish kengaytmasi hamda tezkor amal `pluginkit` da ro'yxatdan o'tganini tekshiradi. U qat'iy 2 soniya kutardi. Main branch'dagi bir yurishda tezkor amal hali ro'yxatda yo'q edi va job yiqildi, holbuki aynan shu build pull request'da o'tgan edi. Ro'yxatdan o'tish asinxron va runner'larda vaqti har xil.",
          fields: {
            "sleep 2": "Qat'iy kutish - birovning vaqti haqida taxmin.",
            "registered: NO": "Haqiqiy build, faqat soat tufayli yiqilgan.",
            asynchronous: "pluginkit tizim kengaytmani ro'yxatga qo'shishidan oldin qaytadi.",
          },
        },
        "flaky-fix": {
          short: "So'rab turish",
          title: "20 soniyagacha so'rab turish, faqat umuman chiqmasa yiqilish",
          body: "Tuzatish taxminni chegaralangan so'rov bilan almashtiradi: kengaytmani qo'shadi, har soniya tekshiradi, har 5 soniyada qayta qo'shadi va faqat 20 soniyadan keyin ham ro'yxatda bo'lmasa yiqiladi. Endi log ro'yxatdan o'tish qancha vaqt olganini aytadi, sekin runner sir emas, ko'rinadigan bo'ladi.",
          fields: {
            "re-add": "Birinchi ro'yxatdan o'tish yo'qolgan bo'lsa, keyingisi ushlaydi.",
            "after ~N s": "Vaqt logga yoziladi: keyin tendensiyani ko'rish mumkin.",
            "not listed after 20 s": "Haqiqiy xato baribir yiqiladi, aniq sabab bilan.",
          },
        },
      },
    },
  },
};

export default text;
