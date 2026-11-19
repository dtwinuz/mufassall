import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: Tilo, kar va eshituvchi odamlar orasidagi ko'prik",
  summary:
    "Tilo - wonmortech'ning ochiq kodli, notijorat platformasi: kar, zaif eshituvchi va gapira olmaydigan odamlar bilan eshituvchilar orasidagi devorni olib tashlaydi, avval O'zbekistonda. Bugun u telefondagi sinov ilovasi (jonli subtitr, vaziyat kartalari, video xabar, favqulodda karta), sayt-prezentatsiya, konsept demo va tadqiqot rejasi; shaxsiy hech narsa Tilo serveriga yetib bormaydi. Loyiha to'liq: foydalanuvchi yo'llari, ilova butunlay brauzerda qanday ishlaydi, maxfiylik qarorlari, rejadagi tarjimon qo'ng'iroqlari va imo-ishora dataseti, saytni tekshiradigan, deploy qiladigan va orqaga qaytaradigan pipeline'lar.",
  learn: [
    "Foydalanuvchi tomoni: yuzma-yuz subtitr, vaziyat kartalari, video xabar va favqulodda karta - kar odam va eshituvchi ulardan qanday foydalanadi",
    "Nega hammasi qurilmada ishlaydi: rozilik bilan brauzer nutqni tanishi, MediaRecorder, oflayn kartalar uchun service worker, lotindan yasaladigan o'zbek kirill yozuvi",
    "Maxfiylik konfiguratsiya sifatida: kamera va mikrofonni faqat /app/ ostida ochadigan CSP va Permissions-Policy",
    "Pipeline'lar: havola va sizish tekshiruvlari, REUSE va DCO, rollback'li atomik deploy, jadval bo'yicha Telegram postlari; va hali faqat reja bo'lgan narsalar",
  ],
  nodes: {
    deaf: "Kar foydalanuvchi",
    hearing: "Eshituvchi odam",
    app: "Tilo ilovasi",
    stt: "Brauzer nutq dvigateli",
    web: "tilo.wonmor.io",
    sw: "Oflayn kesh",
    vri: "Rejadagi platforma",
    data: "Imo-ishora dataseti",
    ci: "GitHub Actions",
    tg: "Telegram kanal",
  },
  metrics: {
    offline: "Internetsiz ochiladigan kartalar",
    server: "Tilo'ga yuborilgan shaxsiy ma'lumot",
    nolink: "Ilovaga yo'l yo'q kompyuter slaydlari",
    stuck: "Tekshiruvlari ishga tushmaydigan PR'lar",
    unlicensed: "Litsenziya tekshiruvidan o'tmagan fayllar",
  },
  steps: {
    what: {
      short: "Bu nima",
      title: "Tilo olib tashlamoqchi bo'lgan devor",
      body: "Kar odam shifoxona, bank yoki idoraga borsa, uni ko'pincha hech kim tushunmaydi, u ham eshituvchining gapini tushunmaydi. Malakali imo-ishora tarjimoni kam, ochiq imo-ishora lug'ati va ma'lumot yo'q, favqulodda xizmatlarda yozma yoki video kanal yo'q. Tilo (repo `wonmortech/tilouz`; kod Apache-2.0, hujjatlar CC BY 4.0) shu uchun notijorat platforma, avval O'zbekiston, keyin MDH.\n\nTamoyillari README'da yozilgan: kar odamlar boshqaradi (\"biz haqimizda bizsiz hech narsa\"), bepul va ochiq, maxfiylik birinchi, chunki yuz videosi biometrik ma'lumot, reja reja deb yoziladi, mavjud xizmatlar bilan raqobat emas, hamkorlik.\n\nFoydalanuvchi bugun ochishi mumkin bo'lgan narsa - `/app/` dagi sinov ilovasi: telefonda to'rt modul va bosh ekranda bitta va'da. Karta matnlari kar maslahat kengashini kutayotgan qoralama, ilova buni ochiq aytadi.",
      fields: {
        "Yuzma-yuz suhbat": "Ilovaning yuragi: ikki odam bitta telefon orqali gaplashadi.",
        "Vaziyat kartalari": "Tushunmovchilik eng og'ir bo'ladigan joylar uchun tayyor iboralar.",
        "Video xabar": "Telefonda yozilgan imo-ishora tilidagi xabar.",
        "Favqulodda karta": "Favqulodda holat uchun: raqamlar va notanish odamga ko'rsatiladigan karta.",
        "nothing is sent": "Bu siyosat qatori emas, arxitektura: ilova yuboradigan Tilo backend'ining o'zi yo'q.",
      },
    },
    talk: {
      short: "Subtitr",
      title: "Yuzma-yuz: eshituvchi gapiradi, kar odam o'qiydi",
      body: "Telefon ikki odam orasida turadi. Eshituvchi **Gapirish** tugmasini bosib gapiradi; uning so'zlari kar odam uchun katta subtitr bo'lib chiqadi, kulrang oraliq qator esa hali shakllanayotgan iborani ko'rsatadi. Tanish xato qilishi mumkin, shuning uchun har subtitr qatori tugma: bosing va so'zni tuzating. Kar odam javob yozadi, **Ko'rsatish** ni bosadi va uni ovoz bilan o'qittirishi mumkin. **Burish** tugmasi ekranni qarshidagi odamga buradi.\n\nTanish Web Speech API orqali brauzerning o'z dvigatelidan foydalanadi. **Nega:** bepul, server kerak emas va bugun Chrome va Edge'da ishlaydi. Narxi - halollik: ko'p brauzerlar ovozni o'z ishlab chiqaruvchisiga yuboradi, shuning uchun birinchi ishga tushirishdan oldin ilova aynan shuni aytadigan rozilik oynasini ko'rsatadi. Rozi bo'lmagan yozish rejimidan foydalanadi, unda eshituvchi gapirish o'rniga yozadi.\n\nInterfeysda juda kattagacha uch matn o'lchami, yorug' va qorong'i mavzu bor, kamaytirilgan harakat sozlamasi hurmat qilinadi.",
      check: {
        q: "Brauzer dvigateli ovozni o'z ishlab chiqaruvchisiga yuborishi mumkin. Nega Tilo baribir o'z serveri o'rniga undan foydalanadi?",
        options: [
          "Chunki o'z serveri tezroq bo'lardi",
          "Tilo serveri nutqni o'zi yig'ardi; brauzer dvigateli bilan Tilo hech narsa saqlamaydi, buni oldindan aytadi va yozish rejimini taklif qiladi",
          "Chunki brauzer dvigateli o'zbek tilida boshqalardan aniqroq",
        ],
        answer: 1,
        why: "Sinov ilovasining umuman backend'i yo'q, shuning uchun Tilo tomonida sizadigan yoki talab qilinadigan hech narsa yo'q. Qolgan xavf (brauzer ishlab chiqaruvchisi) mikrofon yoqilishidan oldin aytiladi, rad etish esa hech kimni chetda qoldirmaydi. O'zida joylashgan tanigich rejada bor, aniqligi o'lchangandan keyin.",
      },
      fields: {
        SpeechRecognition: "Web Speech API; Chrome'da webkitSpeechRecognition prefiksi bilan.",
        interimResults: "Odam gapirayotganda qisman taxminlar keladi, o'quvchi kutib qolmaydi.",
        "tap it to correct": "Tanish xatolari kutilgan; foydalanuvchi ularni tuzatadi, hech narsa hech qayerga yuborilmaydi.",
        SpeechSynthesisUtterance: "Yozilgan javob uchun qurilmadagi nutq sintezi.",
        sttOk: "Rozilik faqat shu qurilmada, lokal sozlamalarda eslab qolinadi.",
        "writing mode": "Na mikrofon, na uchinchi tomon kerak bo'lmagan zaxira yo'l.",
      },
    },
    cards: {
      short: "Kartalar",
      title: "Muhim joylar uchun vaziyat kartalari",
      body: "Sakkiz to'plam, 47 karta: umumiy, shifoxona, dorixona, bank, taksi, politsiya, idora va do'kon. Karta - bitta aniq gap (\"Men karman. Iltimos, yozib yoki imo-ishora bilan gapiring.\"), kar odam uni ochib eshituvchiga butun ekranda ko'rsatadi, yonida ruscha varianti va ovoz bilan o'qish tugmasi bor.\n\nMa'lumot sahifa yonidagi oddiy JSON fayl, shuning uchun iborani o'zgartirish kod emas, kontent tahriri. Fayl o'zi nima ekanini aytadi: `status: draft`, matnlar kar maslahat kengashi va ikki kar ekspert tekshiruvidan o'tmagani va imo-ishora videolarini keyin kar imo-ishorachilar yozishi haqida izoh; ungacha har karta \"imo-ishora videosi: kutilmoqda\" deb ko'rsatadi.\n\nKarta matnlari o'zbek lotini va rus tilida bor; o'zbek kirill yozuvi yasaladi (7-qadam).",
      fields: {
        status: "Kar maslahat kengashi tasdiqlaguncha qoralama: ilova buni har kartada ko'rsatadi.",
        sets: "Har vaziyatga bitta to'plam, har birida ikonka va ikki tildagi sarlavha.",
        title: "Tarjima qilingan to'plam nomi; uchinchi til yasaladi.",
        cards: "general.deaf kabi barqaror id'lar, kelajakdagi imo-ishora videosi to'g'ri kartaga ulanishi uchun.",
        uz: "O'zbek lotinidagi asl matn; kirill undan olinadi.",
      },
    },
    video: {
      short: "Video, SOS",
      title: "Video xabar va favqulodda karta, hech narsa yuklanmaydi",
      body: "**Video xabar:** kar odam old kamerani yoqib, imo-ishora tilida xabar yozadi. Oldindan ko'rish ko'zgudek teskari, yozuv esa yo'q, ilova buni tushuntiradi, chunki imo-ishorachining chap va o'ng qo'li muhim. Yozgandan keyin hajmi va davomiyligini ko'rsatadi va faylni telefonning ulashish oynasi orqali, odatda Telegram'ga yuborishni taklif qiladi. Brauzer ulasha olmasa, **Saqlash** uni yuklab oladi. Bundan boshqa yo'l bilan klip telefondan chiqmaydi.\n\n**Favqulodda karta:** \"Men karman. Menga matn yoki imo-ishora kerak\", 101 (yong'in), 102 (politsiya), 103 (tez yordam) va 112 raqamlari, faqat shu telefonda saqlanadigan ixtiyoriy manzil maydoni. Ilova o'z chegaralarini ochiq aytadi: u favqulodda xizmat o'rnini bosmaydi va 112 ga matn yoki video orqali murojaat qilish yo'li hali topilmagan, shuning uchun karta yaqindagi odamdan qo'ng'iroq qilishni so'raydi.",
      check: {
        q: "SOS manzili qutqaruvchilarga yordam berishi mumkin bo'lsa ham, nega u localStorage'da saqlanadi va hech qayerga yuborilmaydi?",
        options: [
          "Chunki localStorage tezroq",
          "Uni qabul qiladigan 112 kanali yo'q; serverda saqlash faqat kar odamlar uy manzillari ro'yxatini yaratardi",
          "Chunki brauzerlar manzil yuborishni taqiqlaydi",
        ],
        answer: 1,
        why: "Favqulodda xizmatlarga haqiqiy matn kanali bo'lmasa, yuklash hech kimga yordam bermaydi va nozik baza yaratadi. Telefonda saqlangan manzil kerak bo'lganda kartada ko'rsatiladi.",
      },
      fields: {
        getUserMedia: "Kameraga kirish, siyosat bo'yicha faqat /app/ da ruxsat etilgan.",
        MediaRecorder: "Brauzerda yozadi; klip xotirada blob bo'lib yashaydi.",
        "navigator.share": "Web Share API faylni foydalanuvchi tanlagan ilovaga uzatadi.",
        localStorage: "Bitta kalit ostidagi qurilma sozlamalari; o'qish o'ralgan, to'silgan xotira ilovani buzmaydi.",
        "no text or video channel": "FAQ'da yashirilmagan, kartaning o'zida aytilgan.",
      },
    },
    privacy: {
      short: "Maxfiylik",
      title: "Kamera va mikrofon qayerda ishlatilishini server hal qiladi",
      body: "Butun sayt Caddy xizmat qiladigan statik fayllar. Maxfiylik faqat matndagi va'da emas, u sarlavhalarda. `/app/` dan tashqaridagi har sahifa uchun Permissions-Policy `camera=(), microphone=()`: brauzer so'ragan har qanday skriptni rad etadi. Faqat `/app/` ostida u `camera=(self), microphone=(self)` va faqat u yerda yozilgan kliplar `blob:` URL'lardan ijro etilishi mumkin.\n\nCSP skriptlarga faqat saytning o'zidan ruxsat beradi, `connect-src 'self'` sahifa boshqa hech qanday host bilan gaplasha olmasligini bildiradi, `frame-ancestors 'none'` esa ilovani fishing sahifasi ichiga joylashni to'xtatadi. Nomlar kontent-hash qilinmagani uchun barcha fayllar qayta tekshiriladi (`no-cache`); shriftlar 30 kun keshlanadi.\n\nSinov ilovasining o'z sozlamalari (til, matn o'lchami, mavzu, SOS manzili) bitta localStorage kalitida, `tilo.app.v1` da yashaydi.",
      fields: {
        "Content-Security-Policy": "Faqat o'sha manbadan skript va ulanishlar: hatto kiritilgan skript ham ma'lumotni tashqariga yubora olmaydi.",
        "Permissions-Policy": "Kamera va mikrofon bu manba uchun faqat /app/ ostida ruxsat etilgan.",
        "Cache-Control": "Har safar qayta tekshirish, tuzatish keyingi tashrifdayoq ko'rinadi.",
      },
    },
    offline: {
      short: "Oflayn",
      title: "Kartalar internetsiz ochiladi",
      body: "Shifoxona yerto'lasi yoki taksida ko'pincha signal yo'q, karta aynan o'shanda kerak. Mahsulot rejasi (06a, M3) kartalar oflayn ochilishini talab qiladi, shuning uchun `/app/` o'z qobig'ini keshlaydigan service worker ro'yxatdan o'tkazadi: sahifa, skriptlar, stillar, `cards.json`, ikonka va shriftlar.\n\nStrategiya - **avval tarmoq, zaxira sifatida kesh**: onlayn bo'lganda har so'rov tarmoqqa boradi va keshdagi nusxani yangilaydi, shuning uchun yangi reliz keyingi onlayn tashrifda olinadi; oflaynda keshdagi nusxa javob beradi. Worker faqat qobiq ro'yxatidagi yo'llar uchun o'z manbasiga GET so'rovlariga tegadi. Foydalanuvchi yaratgan hech narsani keshlamaydi. Qobiq tayyor bo'lgach ilova \"Ilova internetsiz ham ochiladi\" deb ko'rsatadi.\n\nNutqni tanish ko'p brauzerlarda baribir tarmoqni talab qiladi; u ishlamasa ilova buni aytadi.",
      check: {
        q: "Nega ilova qobig'i uchun avval kesh emas, avval tarmoq?",
        options: [
          "Avval kesh tuzatishdan keyin ham kesh nomi o'zgarmaguncha eski cards.json va app.js ni berishda davom etardi",
          "Avval tarmoq batareyani kamroq ishlatadi",
          "Service worker avval keshni qila olmaydi",
        ],
        answer: 0,
        why: "Kar kengash tuzatadigan qoralama matnlarda yangilik muhim: avval tarmoq ulanish bo'lganda eng yangi versiyani ko'rsatadi va faqat ulanish yo'q bo'lganda zaxiraga o'tadi.",
      },
      fields: {
        SHELL: "Ilova ishga tushishi uchun kerak bo'lgan aniq fayllar ro'yxati; boshqa hech narsa ushlanmaydi.",
        "network first": "Iloji bo'lsa doim yangi kontent.",
        "fall back": "Oflaynda oxirgi yaxshi nusxa javob beradi.",
        "only paths in SHELL": "Tor qamrov worker saytning qolgan qismini buza olmasligini bildiradi.",
        never: "Videolar va subtitrlar xotirada qoladi; keshda faqat ommaviy fayllar.",
      },
    },
    script: {
      short: "Yozuvlar",
      title: "Ikki manbadan o'zbek lotini, o'zbek kirili, rus tili",
      body: "O'zbek tili lotinda va ko'plab katta yoshdagilar uchun kirillda yoziladi. Har qatorning uch nusxasini saqlash o'rniga ilova o'zbek lotini va rus tilini saqlaydi, o'zbek kirillini esa `translit.js` dagi kichik qoidaga asoslangan transliteratsiya bilan yasaydi, sozlamalar uni alohida til sifatida taklif qiladi.\n\nQoidalar digraflarni (o', g', sh, ch, yo, yu, ya, ye), joyiga qarab e/e tanlovini va `iya` dan oldingi `ts` bitta harfga aylanadigan o'zlashma so'zlarni hal qiladi. `{mb}` kabi o'rinbosarlar transliteratsiyadan oldin almashtiriladi va keyin qaytariladi, shuning uchun raqam o'rni hech qachon kirill harflarga aylanmaydi. Ma'lum bo'shliqlar (sirk kabi o'zlashma) kodda sanalgan va inson tekshiruviga qoldirilgan; sozlamalar \"xato ko'rsangiz, xabar bering\" deydi.",
      fields: {
        uzc: "O'zbek kirill uchun sozlama qiymati; sahifa lang'i uz-Cyrl bo'ladi.",
        "by rules": "Deterministik va mitti: lug'at ham, tarmoq ham yo'q.",
        politsiya: "O'zlashma qoidasi: lotinda ts, kirillda bitta harf.",
        placeholders: "Shablon o'rinlari transliteratsiyadan himoyalangan.",
        "human review": "Qoidalar o'zini mukammal ko'rsatmaydi; xabarlar odamlarga boradi.",
      },
    },
    plan: {
      short: "Reja",
      title: "Rejada nima bor: inson tarjimonga qo'ng'iroqlar",
      body: "MVP'ning asosiy moduli hali qurilmagan va hujjatlar buni aytadi: bir tugma bilan inson imo-ishora tarjimoniga videoqo'ng'iroq (VRI), ish soatlari ochiq e'lon qilinadi. Texnik reja (docs/06b) uni ochiq komponentlardan, har biri nega tanlangani bilan loyihalaydi: qo'ng'iroqlar uchun Jigasi bilan Jitsi Meet (Apache-2.0, lobby, tarjimonni pin qilish, mobil SDK), provayderga bog'lanmagan ASR router ortidagi jonli o'zbek va rus subtitrlari uchun WhisperLive, imo-ishora lug'ati sifatida Global Signbank, matndan imo-ishoraga uchun spoken-to-signed-translation.\n\nBu tanlovlar ortidagi tamoyillar: yadroda ruxsat beruvchi litsenziyalar, copyleft faqat alohida servislarda; biometrik ma'lumot O'zbekistonda saqlanadi (ZRU-547 qonuni, 27-1-modda); vendorlarning xato foizi da'volariga ishonib qolinmaydi, Tilo o'zi o'lchaydi; til kodlari yopiq enum emas, konfiguratsiya; secret'lar hech qachon repoda emas. Qo'ng'iroqning o'zi login talab qilmaydi: anonim sessiya va shaxsiy ma'lumotsiz statistika.",
      fields: {
        "anonymous session token": "Shoshib turgan kar foydalanuvchi avval ro'yxatdan o'tishi shart emas.",
        "every 15 s": "Kutayotgan foydalanuvchi navbat yurayotganini doim ko'radi.",
        "recording off": "Qo'ng'iroqlar default'da yozilmaydi: yuz biometrik ma'lumot.",
        lobby: "Eshituvchi tomon QR orqali kiradi; tarjimon uni ichkariga qo'yadi.",
        "no personal data": "Homiylar odamlarni emas, daqiqa va kutishlarni oladi.",
      },
    },
    dataset: {
      short: "Dataset",
      title: "Ochiq, rozilik bilan yig'ilgan o'zbek imo-ishora tili dataseti",
      body: "Bugun ochiq o'zbek imo-ishora tili ma'lumoti yo'q. docs/06c birinchisini bosqichma-bosqich rejalashtiradi: 50 belgilik protokol sinovidan boshlab, keyin mahsulot ehtiyojiga qarab tanlangan 300 ta yadro belgi (vaziyat kartalari, ota-onalar moduli, ikki alifbo uchun daktil), kar maslahat kengashi tasdig'i bilan.\n\nYuragi - rozilik modeli. Har biri alohida beriladigan va alohida qaytariladigan besh qatlam: ishtirok, videoni ilovada ko'rsatish, dunyo bo'ylab ochiq dataset, Tilo'ning o'z o'qitishi, nomi aytilgan tadqiqot hamkorlari. Rozilik imo-ishora videosi va oddiy matn bilan tushuntiriladi. Matnda pose va skelet ma'lumoti anonim emasligi ochiq yoziladi. Ochiq datasetdan chiqish odamni kelajakdagi nashrlardan olib tashlaydi, hujjatlar esa allaqachon nashr qilingan nusxalarni qaytarib bo'lmasligini oldindan aytadi.\n\nOchiq video va pose CC BY-SA 4.0, asboblar Apache-2.0 ostida rejalashtirilgan, notijorat (NC) litsenziya hech qachon; mos kelmaydigan shartli datasetlar ochiq nashrga qo'shilmaydi.",
      fields: {
        D1: "Birinchi ommaviy nashr: 30 dan 50 gacha imo-ishorachidan 300 belgi.",
        consent: "Qatlamli, imo-ishorachi lug'atda bo'lib, o'qitish to'plamida bo'lmasligi mumkin.",
        "withdrawn on its own": "Bitta qatlamdan chiqish boshqalarini bekor qilmaydi.",
        "not anonymous": "Tana harakati odamni aniqlab berishi mumkin; aksini va'da qilish yolg'on bo'lardi.",
        "CC BY-SA 4.0": "Hosilalar ochiq qoladi; yakuniy tanlov kar kengash va yurist bilan.",
      },
    },
    ci: {
      short: "CI",
      title: "Har pull request'dagi tekshiruvlar",
      body: "Build qadami yo'q: `site/` repoda qanday bo'lsa, xuddi shunday xizmat qilinadi. Shuning uchun tekshiruvlar aks holda foydalanuvchiga to'g'ridan-to'g'ri yetib boradigan narsani qo'riqlaydi. `check-site.mjs` yetishmayotgan sahifalarda, buzuq lokal havolalarda, inline skriptlarda (CSP ularni to'sardi), uchinchi tomon manbalarida va hech qachon nashr qilinmasligi kerak bo'lgan matnda yiqiladi: IP manzillar, telefon raqamlari, shaxsiy e-mail'lar, tokenlar, yopiq kalitlar.\n\nREUSE muvofiqligi har fayl o'z litsenziyasini aytishini ta'minlaydi, bu Apache-2.0 kod, CC BY 4.0 hujjatlar va OFL shriftlar aralash repoda muhim. Konsept demoning Playwright smoke testi bor: har marshrut, asosiy oqimlar, konsolda xato yo'q. DCO job'i har commit'da `Signed-off-by` talab qiladi, main'da OpenSSF Scorecard yuradi. Uchinchi tomon action'lari commit SHA bilan mahkamlangan.",
      fields: {
        "check-site.mjs": "Bog'liqliksiz, build'siz: site/ ni o'qib, baland ovozda yiqiladigan Node skripti.",
        REUSE: "Har fayl uchun mashina tekshira oladigan litsenziyalash.",
        Playwright: "Merge'dan oldin haqiqiy brauzer demoni bosib chiqadi.",
        "Signed-off-by": "Hissa qo'shuvchi o'zgarishni yuborishga haqli ekanini tasdiqlaydi (Developer Certificate of Origin).",
        Scorecard: "README badge'i uchun nashr qilinadigan ta'minot zanjiri tekshiruvlari.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: atomik almashtirish, isbot, rollback",
      body: "Saytga tegadigan main push'i `deploy.yml` ni yurgizadi. Workflow saytni yana tekshiradi, commit SHA'ni `version.txt` ga yozadi va sayt hamda Caddyfile tarball'ini SSH orqali uzatadi. CI kaliti serverda faqat bitta buyruqni yurgiza oladi: `bin/receive`; host kaliti mahkamlangan.\n\nServerda reliz o'z papkasiga ochiladi; o'zgargan Caddyfile hech narsa joyidan qo'zg'almasdan oldin tekshiriladi; keyin `releases/current` atomik symlink almashtirish bilan o'tkaziladi va Caddy qayta yuklanadi. Caddy konfiguratsiya va relizlarni faqat o'qish uchun ulaydigan konteynerda, dtwin.uz ning umumiy edge proksisi ortida ishlaydi.\n\nKeyin CI jonli `version.txt` SHA'ga teng bo'lguncha kutadi va smoke test yurgizadi; yuborishdan keyin biror narsa yiqilsa, `rollback` `current` ni oldingi relizga qaytaradi. **Nega shunday:** build yo'q, uzilish yo'q, CI kaliti serverda boshqa hech narsa qila olmaydi.",
      check: {
        q: "Yangi Caddyfile'da sintaksis xatosi bor. U qachon ushlanadi?",
        options: [
          "Qayta yuklashdan keyin, foydalanuvchilar xato olganda",
          "Serverda almashtirishdan oldin: caddy validate yiqiladi va hech narsa o'zgarmaydi",
          "Hech qachon: Caddy yomon qatorlarga qaramaydi",
        ],
        answer: 1,
        why: "`receive.sh` relizlarni almashtirishdan oldin yangi konfiguratsiyani konteyner ichida tekshiradi; tekshiruv yiqilsa, jonli sayt va konfiguratsiya tegilmay qoladi. Qayta yuklash baribir yiqilsa, orqaga almashtiradi.",
      },
      fields: {
        "version.txt": "Jonli sayt beradigan SHA qaysi reliz jonli ekanini isbotlaydi.",
        "bin/receive": "Majburiy buyruq: o'g'irlangan CI kaliti faqat nashr qilishi yoki orqaga qaytarishi mumkin.",
        "caddy validate": "Buzuq konfiguratsiya ishlab turganining o'rnini hech qachon egallamaydi.",
        "releases/current": "Caddy xizmat qiladigan symlink; uning ustiga nom o'zgartirish atomik.",
        rollback: "Oldingi reliz saqlanadi, orqaga qaytish bitta almashtirish.",
        "read-only": "Veb-server o'z fayllarini o'zgartira olmaydi.",
      },
    },
    telegram: {
      short: "Telegram",
      title: "Kuniga ikki marta o'zi post qiladigan kanal",
      body: "Loyihaning Telegram kanaliga Toshkent vaqti bilan 09:00 va 19:00 da `content/telegram/posts.json` dagi ro'yxatdan fakt posti chiqadi (\"bilasizmi\" kabi rubrikalar, har biri manbalari bilan). Jadvalli workflow `tools/telegram-post.mjs` ni repo secret'laridagi bot tokeni bilan yurgizadi.\n\nSkript **holatsiz**: birinchi kundan sanaganda N-post N-slotda chiqadi, shuning uchun post qilingandan keyin hech narsani repoga qaytarib commit qilish kerak emas. Actions cron kechikib boshlanishi mumkinligi uchun slot aniq daqiqa bilan emas, yarim kun bilan (Toshkent tushidan oldin yoki keyin) tanlanadi. Qo'lda yurgizish id bo'yicha aniq postni yuborishi mumkin, `--plan` esa hech narsa post qilmasdan butun jadvalni chiqaradi.",
      fields: {
        chat_id: "Ommaviy kanal; testlar uchun muhit o'zgaruvchisi bilan almashtirish mumkin.",
        text: "Har fakt oxirida manba havolasi bo'lgan HTML.",
        parse_mode: "Telegram qalin matn va havolalarni HTML'dan chizadi.",
        ok: "Telegram rad etsa, job yiqiladi va sababini ko'rsatadi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Tilo bir ekranda",
      body: "**Foydalanuvchi tomoni:** tuzatsa bo'ladigan jonli subtitrli telefon ilovasi, 8 to'plamda 47 vaziyat kartasi, telefon orqali ulashiladigan imo-ishora video xabarlari va favqulodda karta; o'zbek lotini, o'zbek kirili va rus tili; katta matn va qorong'i mavzu.\n\n**Texnik tomon:** statik fayllar va PWA, halol rozilik oynasi ortidagi brauzer nutqni tanishi, MediaRecorder va Web Share API, oflayn kartalar uchun avval-tarmoq service worker, qoidaga asoslangan transliteratsiya. Backend yo'q: shaxsiy hech narsa Tilo'ga yetmaydi. Kamera va mikrofon qayerda ruxsat etilishini sarlavhalar hal qiladi.\n\n**Pipeline'lar:** havola va sizish uchun sayt tekshiruvi, REUSE, DCO, demoda Playwright, Scorecard; majburiy buyruqli kalit, tekshiruv, version.txt bilan isbot va rollback'li atomik deploy; jadvalli, holatsiz Telegram postlari.\n\n**Reja, hali qurilmagan:** Jitsi'da tarjimon videoqo'ng'iroqlari, ASR router, imo-ishora lug'ati va besh qatlamli rozilikka ega ochiq dataset.",
    },
  },
  scenarios: {
    "hidden-app": {
      label: "Yashirin ilova",
      steps: {
        "hidden-bug": {
          short: "Yetib bo'lmaydi",
          title: "Ilova chiqdi, lekin kompyuterdagi mehmonlar uni topa olmadi",
          body: "Sayt-prezentatsiya kompyuterda slayd-deck sifatida ishlaydi. Deck rejimida havolali footer yashiringan, `/app/` havolali chaqiriq esa 26 slayddan faqat oxirgisida turardi. Shuning uchun sinov ilovasi jonli bo'lishi bilanoq kompyuterdagi mehmonning unga yetib borishga deyarli yo'li yo'q edi.",
          fields: {
            "26 slides": "Mehmon hikoyani bosib o'tadi; ko'pchilik oxirigacha yetmaydi.",
            footer: "Havolalar uchun odatiy joy bu ko'rinishda yo'q.",
            "last slide": "Ilovaga yagona havola.",
            unreachable: "O'sha kuni kompyuter brauzeridan topildi.",
          },
        },
        "hidden-fix": {
          short: "Yuqori panel",
          title: "Doim ko'rinadigan ilova tugmasi",
          body: "Tuzatish kichik edi: o'zbek, rus va ingliz sahifalarida ikkala yuqori panelda (deck ko'rinishi va hikoya ko'rinishi) ilova tugmasi. 400 px dan torda faqat ikonka qoladi, ekran o'quvchilar uni baribir aytishi uchun aria-label bilan.",
          fields: {
            "both top bars": "Mehmon qaysi ko'rinishda bo'lmasin, tugma o'sha yerda.",
            "uz, ru and en": "Uchta statik sahifa, uchta tahrir.",
            "aria-label": "Faqat ikonkali tugmaning ham yordamchi texnologiya uchun nomi bor.",
          },
        },
      },
    },
    "actions-off": {
      label: "Actions o'chiq",
      steps: {
        "off-bug": {
          short: "CI yo'q",
          title: "Tekshiruvlari hech qachon boshlanmagan pull request",
          body: "PR #18 GitHub Actions'ni o'chirib qo'ygan akkauntdan ochilgan edi. Har workflow `startup_failure` bilan tugadi. Yopib qayta ochish, bo'sh commit va qo'lda ishga tushirish hech narsani o'zgartirmadi, o'sha akkauntning merge'i ham deploy'ni boshlamagan bo'lardi: CI darvozasi ham, deploy ham aktor uchun Actions ishlashiga bog'liq.",
          fields: {
            startup_failure: "Workflow bitta qadamni ham yurgizmadi.",
            "empty commit": "O'sha akkauntdan yangi push o'sha to'siqqa uriladi.",
            workflow_dispatch: "Qo'lda ishga tushirish ham o'sha aktor uchun rad etiladi.",
            deploy: "Deploy bo'lmasa, jonli sayt jimgina eski holicha qoladi.",
          },
        },
        "off-fix": {
          short: "Yangi qoida",
          title: "Actions ishlaydigan akkauntdan ochish va merge qilish",
          body: "O'shandan beri qoida: pull request'lar Actions yoqilgan maintainer akkauntidan ochiladi va squash-merge qilinadi, ikkinchi maintainer approve qiladi. Har commit'dagi sign-off qoladi. Sinov ilovasi, kompyuter tuzatishi va konsept demo (PR #19 dan #21 gacha) hammasi shu yo'l bilan o'tdi.",
          fields: {
            "squash-merge": "Ruleset talab qilganidek, main'da har o'zgarishga bitta commit.",
            "second maintainer": "Ruleset boshqa odamdan bitta approve so'raydi.",
            "Signed-off-by": "DCO tekshiruvi hali ham majburiy.",
            "went through this way": "O'zgarishdan keyingi uchta PR, har birida tekshiruv va deploy.",
          },
        },
      },
    },
    "reuse-lint": {
      label: "Litsenziya tekshiruvi",
      steps: {
        "reuse-bug": {
          short: "133 fayl",
          title: "Litsenziyalar yozilgan, lekin asbob qaraydigan joyda emas",
          body: "Brend to'plamining README'si qaysi litsenziya nimani qoplashini allaqachon aytgan edi: rasmlar CC BY 4.0, brend kodi Apache-2.0, shriftlar OFL 1.1. Lekin REUSE asbobi o'qiydigan `REUSE.toml` faylida bu papkalar uchun qoida yo'q edi. `reuse lint` litsenziya ma'lumotisiz 133 faylni sanadi va tekshiruv yiqildi.",
          fields: {
            "brand/README.md": "Inson o'quvchi uchun to'g'ri, asbob uchun ko'rinmas.",
            "REUSE.toml": "REUSE'ga qaysi litsenziya qayerda amal qilishini aytadigan yo'l qoidalari fayli.",
            "133 files": "Logolar, shriftlar va deck asboblari.",
          },
        },
        "reuse-fix": {
          short: "433/433",
          title: "Qoidalarni mashina uchun takrorlash",
          body: "PR #2 README qoidalarini `REUSE.toml` ga ko'chirdi, deck asboblariga izoh qo'shdi va GSAP uchun uning asl litsenziya matniga ishora qiladigan litsenziya havola faylini qo'shdi. Shundan keyin `reuse lint` barcha 433 fayl muvofiq deb xabar berdi, keyingi har pull request shunga tutiladi.",
          fields: {
            "mirrors the rules": "Yangi litsenziya qarori yo'q, faqat o'sha qaror mashina o'qiy oladigan joyda.",
            "LicenseRef-GSAP-Standard": "GSAP SPDX litsenziyasi emas, shuning uchun nomli havola fayli oladi.",
            "433/433": "Repodagi har fayl o'z litsenziyasini aytadi.",
          },
        },
      },
    },
  },
};

export default text;
