import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Loyiha: gym.dtwin, brauzerdagi mashg'ulot kundaligi",
  summary:
    "gym.dtwin bu ochiq kodli mashg'ulot kundaligi: 1827 mashq, rejalar, dam olish taymerli set yozish, rekordlar va progress, o'zbek, rus va ingliz tilida, akkauntsiz. Hammasi brauzerda bitta profil hujjati bo'lib yashaydi. Sportchi qanday reja tuzadi, mashq qiladi va progressini ko'radi; domen yadrosi, generatsiya qilinadigan katalog, zaxira va import, service worker va hali deploy qilinmagan sinxron API qanday qurilgan; CI va qo'lda deploy uni qanday ishlatib turadi.",
  learn: [
    "Sportchi yo'li: progression qoidali reja, RIR va qayta yuklashdan omon qoladigan dam olish taymerli jonli mashg'ulot, keyin rekordlar va grafiklar",
    "Local-first ma'lumot: localStorage'da bitta profil hujjati, har yozuvda updatedAt va o'chirish tombstone'lari, kelajakdagi sinxronga tayyor",
    "Testlangan sof yadro (1RM, progression, disk hisobi) va litsenziyasi aniq ochiq datasetlardan generatsiya qilinadigan katalog",
    "Haqiqiy eksportlarda sinalgan zaxira va CSV import, service worker orqali offline, workflow'larni ham tekshiradigan CI va oldingi build'ni saqlaydigan deploy",
  ],
  nodes: {
    phone: "Sportchi telefoni",
    edge: "dtwin.uz edge proksi",
    site: "gym-dtwin (Caddy)",
    store: "localStorage",
    sources: "Ochiq datasetlar",
    build: "Katalog skriptlari",
    sw: "Service worker",
    api: "Sinxron API (deploy qilinmagan)",
    ci: "GitHub Actions",
    owner: "Maintainer",
  },
  metrics: {
    exercises: "Katalogdagi mashqlar",
    tests: "O'tgan testlar",
    precache: "Offline uchun keshlangan fayllar",
    unmatched: "Mos kelmagan Hevy nomlari",
    skipped: "Importda tashlab ketilgan qatorlar",
    manual: "Qo'lda restart kerak bo'lgan deploy'lar",
  },
  steps: {
    intro: {
      short: "Bu nima",
      title: "Akkauntsiz mashg'ulot kundaligi",
      body: "gym.dtwin og'irlik ko'taradiganlar uchun: haftani rejalashtirish, zalda har bir setni yozish, nima kuchayayotganini ko'rish. U brauzerda ochiladi, bosh ekranga o'rnatiladi va offline ishlaydi. Ro'yxatdan o'tish yo'q: butun kundalik brauzer localStorage'idagi bitta JSON hujjat.\n\nBu dtwin ekotizimidagi tajriba, kodi ochiq. Imkoniyatlar ochiq kodli openGym ilovasiga qarab tanlangan, lekin uning AGPL kodi, matnlari va mashq mediasi ko'chirilmagan: hammasi xulq-atvordan boshlab qayta yozilgan, katalog esa ochiq litsenziyali datasetlardan olingan.",
      fields: {
        settings: "Til, birliklar, mavzu, tanlangan 1RM formulasi va o'nlab mashg'ulot sozlamalari.",
        routines: "Rejalar; har bir yozuvning o'z updatedAt i bor.",
        workouts: "Hajmi va rekord qo'yilgan mashqlari bilan tugagan mashg'ulotlar.",
        active: "Davom etayotgan mashg'ulot yoki null; qayta yuklashdan omon qoladi.",
        deleted: "Tombstone'lar: nima va qachon o'chirilgani, kelajakdagi sinxron uni qaytarib olib kelmasin.",
        updatedAt: "Millisekund; soat orqaga ketsa ham doim o'sadi.",
      },
    },
    plan: {
      short: "Reja",
      title: "Keyingi mashg'ulot qoidalari yozilgan reja",
      body: "Sportchi tayyor dasturlardan birini tanlaydi yoki muharrirda routine'lar tuzadi, keyin ularni haftaga yoki rotatsiya qilib (A, B, dam olish, ...) joylaydi. Routine ichidagi har bir mashq bu slot: setlar, takrorlar oralig'i, boshlang'ich vazn, dam olish vaqti, ixtiyoriy superset guruhi va zal band bo'lganda uchun zaxira mashqlar.\n\nEng muhim maydon progression siyosati. `double` bilan ilova avval 8 dan 10 gacha oralig'ida ko'proq takror so'raydi va har bir set 10 ga yetgandagina 2.5 kg qo'shadi. Reja bu maqsad; haqiqatda nima bo'lgani alohida yoziladi.",
      fields: {
        repsMin: "Takrorlar oralig'ining pasti; reps esa tepasi.",
        prog: "Progression siyosati: off, linear, greyskull, double, triple yoki ushlab turish uchun time.",
        inc: "Maqsadga yetilganda qancha vazn qo'shish.",
        restSec: "Shu mashq uchun standart dam olish.",
        sg: "Superset guruhi: bir xil id li qo'shni slotlar navbatlashadi.",
        subs: "Rejalangan zaxiralar, 5 tagacha, skameyka band bo'lsa bir bosishda.",
      },
    },
    workout: {
      short: "Mashg'ulot",
      title: "Zalda: setlar, RIR va dam olish taymeri",
      body: "Mashg'ulot ekrani bugungi retseptni sababi bilan ko'rsatadi, masalan \"ko'proq vazn: o'tgan safar hamma takrorlar bajarilgan\". Sportchi setlarni belgilaydi, vazn va takrorni to'g'rilaydi va har bir setni zaxiradagi takrorlar bilan baholashi mumkin. Warm-up setlar, drop set, rest-pause, chap-o'ng alohida yozish va shtanga uchun disklar ro'yxati hammasi bor.\n\nDam olish taymeri qolgan soniyalar emas, tugash vaqti sifatida saqlanadi, shuning uchun tabni yopish yoki telefonni o'chirib yoqish uni yo'qotmaydi. Mashg'ulotning o'zi `profile.active` da yashaydi; u unutilsa, kunlar o'tib emas, oxirgi belgilangan setda yakunlanadi.",
      check: {
        q: "Nega dam olish taymeri kamayib boradigan hisoblagich emas, endsAt sifatida saqlanadi?",
        options: [
          "Kamroq xotira oladi",
          "Hisoblagich sahifa bilan o'ladi; tugash vaqtini reload, uyqu yoki o'chib-yonishdan keyin qayta hisoblasa bo'ladi",
          "Brauzerlar taymer yurgiza olmaydi",
        ],
        answer: 1,
        why: "Telefonlar fondagi tablarni to'xtatadi va sahifalarni o'ldiradi. Mutlaq tugash vaqti bilan ilova qaytganda shunchaki endsAt minus hozirni hisoblaydi va taymer to'g'ri bo'ladi.",
      },
      fields: {
        rx: "Shu mashg'ulot uchun retsept, keyingisi u bilan solishtirsin deb saqlanadi.",
        why: "load: hamma takror bajarilgan, demak ko'proq vazn; boshqa sabablar hold, deload, effort va boshqalar.",
        rir: "Zaxiradagi takrorlar: 0 bu muvaffaqiyatsizlikkacha. Progression va 1RM bahosiga kiradi.",
        endsAt: "Dam olish tugaydigan mutlaq vaqt.",
        lastAt: "Oxirgi belgilangan set: unutilgan mashg'ulot shu yerda yopiladi.",
      },
    },
    progress: {
      short: "Progress",
      title: "Rekordlar, taxminiy maksimum va grafiklar",
      body: "Har bir tugagan mashg'ulot rekordlarni yangilaydi. Kuch taxminiy bir martalik maksimum bilan kuzatiladi, zaxiradagi takrorlar ham hisobga olinadi: 2 ta zaxira bilan 100 kg x 5 muvaffaqiyatsizlikkacha 7 takror deb o'qiladi. 12 takrordan yuqorisi juda shovqinli deb e'tiborga olinmaydi. Yettita formula bor; standarti Epley.\n\nProgress sahifalari mashg'ulot va hajmni, 12 oylik faollik xaritasini, tana xaritasida mushak bo'yicha haftalik setlarni, har mashq uchun e1RM grafigini, maqsad chizig'i bilan tana vaznini, o'lchamlar va progress fotolarni ko'rsatadi. Fotolar IndexedDB da qoladi va qurilmadan chiqmaydi.",
      fields: {
        e1rm: "Taxminiy bir martalik maksimum: turli takror sonlari orasida solishtiriladigan kuch raqami.",
        REP_CAP: "12 dan ortiq takrorli set kuch rekordi bermaydi.",
        formulas: "Turli formula turli sportchiga mos; tanlov sozlamada.",
        IndexedDB: "Fotolar katta va shaxsiy: zaxira ham, sinxron ham tegmaydigan alohida ombor.",
      },
    },
    catalogue: {
      short: "Katalog",
      title: "Ochiq ma'lumotdan generatsiya qilingan 1827 mashq",
      body: "Katalog qo'lda yozilmaydi. Skriptlar 876 mashq va ularning 1746 rasmi uchun free-exercise-db (public domain) ni oladi, rasmlarni WebP ga o'girib saytning o'zidan beradi, dublikatlar olib tashlangach MIT litsenziyali datasetdan faqat matnli yozuvlar qo'shadi va tana xaritasi uchun MuscleMap konturlarini konvertatsiya qiladi. O'zbekcha va ruscha nomlar, qadamlar va sinonimlarni loyihaning o'zi yozgan.\n\nQidiruv kirill va lotinni, zal jargonini va xatolarni tushunadi va 30 ms dan tez javob beradi. Litsenziyalar NOTICE da; mos kelmaydigan litsenziyali manbalardan ma'lumot shunchaki ishlatilmaydi.",
      check: {
        q: "Nega katalog JSON faylni tahrirlash bilan emas, skriptlar bilan generatsiya qilinadi?",
        options: [
          "Skriptlar uni kichikroq qiladi",
          "Upstream yangilanishi yoki dedupe qoidasi o'zgarishini qotirilgan manbadan qayta yurgizsa bo'ladi, litsenziya izi esa aniq qoladi",
          "JSON 1827 yozuvni sig'dirolmaydi",
        ],
        answer: 1,
        why: "Generatsiya qilingan ma'lumot qayta chiqariladi: upstream commit'ni qotir, qayta yurgiz, diff'ni ko'r. Qo'lda tahrirlar keyingi importda yo'qolardi va qaysi matn qaysi litsenziyadan kelganini chalkashtirardi.",
      },
      fields: {
        Unlicense: "Public domain: asosiy katalog va uning rasmlari.",
        "1746": "480 px li rasmlar, o'z serverimizda, lazy yuklanadi.",
        dedupe: "Bir xil harakat va mos jihoz: birlashtiriladi; Smith mashinasi va richag: alohida qoladi.",
        MuscleMap: "MIT konturlar, tana xaritasi uchun upstream'dan o'girilgan.",
        "1827": "PR #87 dagi yumshoqroq dedupe'dan keyingi jami.",
        "not used": "AGPL kod va xususiy media qoida bo'yicha kirmaydi.",
      },
    },
    core: {
      short: "Yadro",
      title: "Testli sof domen yadrosi",
      body: "Arifmetika bo'lgan hamma narsa `src/core/` da UI'siz oddiy funksiyalar sifatida yashaydi: birliklar, 1RM, progression, warm-up rampalari, disk hisobi, hajm, mushak yuklamasi, tiklanish, jadvallar, rekordlar, CSV. Ular unit testlar bilan qoplangan va ilovada, demoda va importerda bir xil ishlaydi.\n\nDisk hisoblagich sportchida bor disklar ustidagi kichik knapsack, chorak birliklarda yechiladi, 1.25 kg disklar butun son bo'lib qolsin; vaznni yig'ib bo'lmasa, pastdagi eng yaqinini qaytaradi. Progression vazn va sabab kodini qaytaradi, UI uni gapga tarjima qiladi.",
      check: {
        q: "Sportchi hamma takrorni bajardi, lekin har bir setni RIR 0 deb baholadi. Keyingi mashg'ulot nima so'raydi?",
        options: [
          "Ko'proq vazn, takrorlar bajarilgan",
          "O'sha vaznni yana bir marta, effort sababi bilan",
          "Deload",
        ],
        answer: 1,
        why: "Har setda takrorlarni chegarada bajarish sakrash juda katta bo'lishi belgisi. Qoida vazn qo'shishdan oldin uni bir marta takrorlaydi (o'rtacha RIR 0.5 yoki past); baholanmagan setlarda oddiy qoida qoladi.",
      },
      fields: {
        solvePlates: "Bor juftlardan har tomonga eng kam disk.",
        "quarter units": "Vazn 4 ga ko'paytirilsa butun son bo'ladi, qidiruv aniq.",
        why: "Har bir retsept uchun sportchiga ko'rsatiladigan sabab kodi.",
        effort: "Hamma takror bor, lekin chegarada: vazn qo'shishdan oldin ushlab tur.",
        deload: "Bir vaznda takroriy muvaffaqiyatsizlikdan keyin 90% ga tushib qayta qurish.",
      },
    },
    backup: {
      short: "Zaxira",
      title: "Ma'lumot sportchiniki",
      body: "Serverda hech narsa yo'qligi uchun kundalikni olib chiqish va qaytarish oson bo'lishi shart. Zaxira bu kind va versiyasi bor bitta JSON fayl. Tiklash ikkalasini va shaklni tekshiradi; har qanday xatoda hech narsa o'zgarmaydi, joriy profil esa Undo bilan pre-restore nusxa sifatida saqlanadi.\n\nCSV eksport RFC 4180 ga va jadvallar to'g'ri ochishi uchun BOM ga amal qiladi, formula in'ektsiyasidan himoya qiladi. CSV import Strong, Hevy va FitNotes eksportlarini sarlavhasidan taniydi, mashq nomlarini katalogga moslaydi, ishonchsizlarini sportchiga ko'rsatadi, noma'lum nomlarni o'z mashqiga aylantiradi.",
      fields: {
        kind: "Gym zaxirasi bo'lmagan fayllarni rad etadi.",
        v: "Format versiyasi, kelajakdagi format eski fayllarni ko'chira olsin.",
        exportedAt: "Zaxira qachon qilingani, tiklashdan oldin ko'rsatiladi.",
        "pre-restore": "Tiklashdan oldingi profil, qaytish uchun bir bosish.",
        "RFC 4180": "Umumiy CSV standarti; = + - @ bilan boshlangan katakka prefiks qo'yiladi, jadval uni yurgizmasin.",
        "custom exercises": "Hech narsa tushib qolmaydi: mos kelmagan nom sportchining o'z mashqi bo'ladi.",
      },
    },
    offline: {
      short: "Offline",
      title: "Zal yerto'lasi uchun service worker",
      body: "Zallarda ko'pincha signal yo'q. Service worker ilova qobig'i va barcha kod bo'laklarini, lazy sahifalar bilan birga, oldindan keshlaydi, shuning uchun bitta onlayn tashrifdan keyin istalgan sahifa offline ochiladi. Mashq rasmlari birinchi ko'rilganda keshlanadi, 60 kunga 600 tagacha, joy tugasa birinchi bo'lib ular o'chiriladi.\n\nYangilanishlar mashg'ulotni hech qachon bo'lmaydi: yangi versiya kutadi va Yangilash tugmasini faqat faol mashg'ulot yo'q paytda ko'rsatadi. Server tomoni ham muhim: `/assets`, `/ex` yoki `/icons` ostidagi yo'q fayl endi 404 qaytaradi, chunki `index.html` bilan javob berish worker'ni HTML sahifani skript yoki rasm deb keshlashga olib kelishi mumkin edi.",
      check: {
        q: "Nega yo'q /assets/x.js SPA ning index.html ini emas, 404 qaytarishi shart?",
        options: [
          "404 sahifalar tezroq",
          "Service worker HTML ni skript URL'i ostida saqlab, keyin uni kod sifatida berardi",
          "Qidiruv tizimlari talab qiladi",
        ],
        answer: 1,
        why: "SPA zaxirasi sahifa yo'llari uchun to'g'ri, fayllar uchun noto'g'ri. .js yoki rasm URL'i ostida keshlangan HTML sahifa ilovani offline'da reload'lardan ham omon qoladigan tarzda buzadi.",
      },
      fields: {
        precache: "50 fayl, taxminan 3.8 MB, o'rnatishda keshlanadi.",
        CacheFirst: "Rasm keshda bo'lsa keshdan; tarmoq faqat bo'shliqlarni to'ldiradi.",
        NetworkOnly: "Kelajakdagi sinxron API hech qachon keshdan javob olmaydi.",
        "profile.active": "Mashg'ulot ketayotganda yangilash taklifi kutadi.",
        "404": "Mavjud bo'lmagan fayllar SPA sahifasiga tushib qolmasligi kerak.",
      },
    },
    sync: {
      short: "Sinxron",
      title: "Qurilmalararo sinxron: yozilgan, lekin yoqilmagan",
      body: "Qurilmalar orasida sinxron uchun kichik server (`node:http` va `node:sqlite`, freymvorksiz) va klient kodi bor va testlangan, lekin deploy qilinmagan: `VITE_SYNC_ENABLED` build bayrog'i o'chiq, u o'chiq bo'lsa sinxron kodi bundle'ga ham kirmaydi. Reja: dtwin.uz orqali OAuth va PKCE bilan kirish, keyin klient oxirgi ko'rgan revisiya bilan `GET` va `PUT /api/data`.\n\nOrada boshqa qurilma yozgan bo'lsa, server o'z nusxasi bilan 409 qaytaradi; klient yozuvlarning `updatedAt`, tombstone'lar va maydon bo'yicha `stamps` orqali birlashtiradi va qayta urinadi. Ma'lum cheklovlar yozib qo'yilgan: soati noto'g'ri qurilma o'z tahrirlarini ustun qiladi, ikki qurilmada boshlangan ikki mashg'ulotdan faqat yangisi qoladi.",
      check: {
        q: "Nega merge'ga profil updatedAt idan tashqari maydon bo'yicha stamps kerak?",
        options: [
          "Joy tejash uchun",
          "Sozlama va lug'atlarning o'z vaqti yo'q; bitta umumiy vaqt bilan A dagi mavzu o'zgarishi va B dagi dam olish o'zgarishidan biri yo'qolardi",
          "SQLite talab qiladi",
        ],
        answer: 1,
        why: "Yozuvlar ro'yxatlarida har birining o'z updatedAt i bor. Sozlama va lug'atlarda yo'q, shuning uchun yo'l bo'yicha stamp bo'lmasa keyingi hujjat har bir maydonni, boshqa qurilma tegmaganlarini ham, bosib ketardi.",
      },
      fields: {
        baseRev: "Bu tahrir asoslangan server revisiyasi.",
        stamps: "Sozlama yo'li bo'yicha oxirgi o'zgarish vaqti, faqat bayroq yoqilganda yoziladi.",
        rev: "Serverning joriy revisiyasi; 409 da klient birlashtirib qayta urinadi.",
        Authorization: "Faqat xotirada turadigan qisqa umrli access token.",
      },
    },
    ci: {
      short: "CI",
      title: "Har pull request'da lint, test va build",
      body: "CI har bir pull request va main ga push'da oxlint, vitest to'plamini (oxirgi bog'liqlik tuzatishidan keyin 465 test) va tip tekshiruvli build'ni yurgizadi; faqat hujjat o'zgarsa o'tkazib yuboradi. Workflow'larning o'zini zizmor tekshiradi, u sizgan credential yoki template injection kabi o'rta darajali topilmada yiqiladi.\n\nTa'minot zanjiri gigiyenasi aniq: SHA ga qotirilgan action'lar, faqat o'qish tokenlari, oylik guruhlangan Dependabot yangilanishlari. OpenSSF Scorecard build vaqtidagi paketlarda uchta advisory topganda, ikkitasi npm override bilan tuzatildi, tuzatilgan relizi yo'q uchinchisi esa `osv-scanner.toml` da sababi va tugash sanasi bilan yozib qo'yildi.",
      fields: {
        oxlint: "JS va TS uchun tez linter.",
        "persist-credentials": "Checkout tokenni ortida qoldirmaydi.",
        "zizmor.yml": "GitHub Actions workflow'larining statik tahlili.",
        "osv-scanner.toml": "Qabul qilingan xavf qayta qarash sanasi bilan yozib qo'yiladi.",
        override: "Tranzitiv bog'liqlikning tuzatilgan versiyasini majburlaydi.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Oxirgi build'ni saqlaydigan qo'lda deploy",
      body: "Deploy'ni maintainer bitta skript bilan yurgizadi; CI deploy qilmaydi. U yig'adi, qisqa commit'ni (daraxtda o'zgarish bo'lsa `-dirty` bilan) REVISION fayliga yozadi, staging papkaga yuklaydi va jonli build'ni `dist.prev` ga nusxalaydi. Keyin yangi fayllarni berilayotgan papkaga joyida sinxronlaydi, chunki konteyner shu papkani bind-mount qilgan va aynan o'sha katalogni ko'rib turishi kerak.\n\nKonteynerdagi Caddy faqat fayl beradi; TLS va domen dtwin.uz ning umumiy edge proksisida.",
      check: {
        q: "Nega dist.new ni dist ga qayta nomlash o'rniga dist/ ga rsync qilinadi?",
        options: [
          "rsync tezroq",
          "Konteyner dist katalogini mount qilgan; rename'dan keyin u eski, endi ko'chirilgan katalogni ko'rishda davom etardi",
          "Rename atomar emas",
        ],
        answer: 1,
        why: "Bind mount nomga emas, unga berilgan katalogga ergashadi. Mazmunni almashtirish o'sha katalogni saqlaydi, ishlayotgan konteyner yangi fayllarni darhol ko'radi.",
      },
      fields: {
        REVISION: "Commit qilinmagan koddan build'ni -dirty bilan belgilaydi, ko'rinib tursin.",
        "dist.prev": "Qo'lda qaytish uchun oldingi build.",
        rsync: "O'zgarishlarni ko'chiradi va yo'q bo'lgan fayllarni o'chiradi.",
        inode: "Katalogning shaxsi, bind mount aynan shunga yopishadi.",
        sha256: "O'zgargan Caddyfile'ni aniqlaydi (ssenariyga qarang).",
      },
    },
    demo: {
      short: "Demo",
      title: "Fiktiv sportchidagi jonli demo",
      body: "O'sha ilova wonmor.io/demo/gym/ uchun demo rejimida yig'iladi. Bo'sh kundalik o'rniga u fiktiv sportchining 36 haftasini haqiqiy session engine orqali o'ynaydi, shuning uchun progression, rekordlar va grafiklar haqiqiy odamnikidek chiqadi. Sanalar bugunga nisbatan, o'zgarishlar xotirada qoladi, reload namunani tiklaydi.\n\nDemoda service worker ham, yordam vidjeti ham yo'q, uning kodi faqat demo rejimida import qilinadi, shuning uchun prod build aynan o'sha xeshli fayl nomlarini saqlaydi. Playwright to'plami har sahifani ochadi va konsoldagi har qanday xatoda yiqiladi; README skrinshotlari ham o'sha demodan.",
      fields: {
        "seed.ts": "Namunaviy ma'lumot, yozilmagan, generatsiya qilingan.",
        "session engine": "Sportchi ishlatadigan o'sha kod, tarix izchil chiqadi.",
        "in memory": "Mehmon demoni keyingisi uchun buzolmaydi.",
        Playwright: "15 brauzer testi, npm run test:demo bilan.",
        "same hashed file names": "Demo prod bundle'ni o'zgartirmaganining isboti.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "1) Akkaunt yo'q: kundalik localStorage'dagi bitta JSON hujjat, har yozuvda updatedAt va o'chirishlar uchun tombstone. 2) Rejada maqsad va progression siyosati, mashg'ulotda esa nima bo'lgani, RIR va tugash vaqti sifatida saqlangan taymer bilan. 3) Arifmetika sof, testli yadroda: yetti formulali 1RM, sabab kodli progression, chorak birlikdagi disk hisobi. 4) 1827 mashqli katalog ochiq litsenziyali ma'lumotdan generatsiya qilinadi; AGPL kod va xususiy media hech qachon ishlatilmaydi. 5) Zaxira, CSV eksport va import boshqa ilovalarning haqiqiy eksportlarida sinalgan. 6) Service worker zal yerto'lasini muammo bo'lmaydigan qiladi va mashg'ulot paytida hech qachon yangilanmaydi. 7) Sinxron loyihalangan va testlangan, lekin shartlari bajarilguncha o'chiq. 8) CI har PR ni lint, test va build qiladi va o'z workflow'larini ham tekshiradi; deploy oldingi build'ni saqlaydi va Caddy'ni faqat konfigi o'zgarganda restart qiladi.",
    },
  },
  scenarios: {
    "caddy-restart": {
      label: "Konfig qo'llanmadi",
      steps: {
        "header-stale": {
          short: "Eski",
          title: "Diskda yangi Caddyfile, xotirada eskisi",
          body: "PR #89 dagi offline ishi Caddyfile'ni o'zgartirdi: manifest uchun content type va yo'q asset'lar uchun 404. Deploy faylni yukladi va `docker compose up -d` ni yurgizdi, u esa hech narsa qilmadi, chunki image va mount'lar o'zgarmagan edi. Caddy ishga tushganda o'qigan konfigni ushlab turadi, shuning uchun yangi sarlavhalar kimdir konteynerni qo'lda restart qilgandan keyingina paydo bo'ldi.",
          check: {
            q: "Nega compose up yangi konfigni qo'llamadi?",
            options: [
              "Fayl yuklanmagan edi",
              "compose konteynerni faqat ta'rifi o'zgarganda qayta yaratadi; mount ichidagi o'zgargan fayl ta'rif o'zgarishi emas",
              "Caddy faylni rad etdi",
            ],
            answer: 1,
            why: "compose nuqtai nazaridan hech narsa o'zgarmadi: o'sha image, o'sha volume'lar. Ichidagi jarayonga reload qilish aytilishi yoki u restart qilinishi kerak.",
          },
          fields: {
            Caddyfile: "Konteynerga bitta fayl sifatida mount qilingan.",
            "nothing to recreate": "compose up idempotent: o'sha ta'rif, o'sha konteyner.",
            "does not watch": "Caddy fayl o'zgarganda o'zi reload qilmaydi.",
            "manual restart": "Deploy skripti hech qachon odam eslab qolishiga tayanmasligi kerak bo'lgan qadam.",
          },
        },
        "header-fix": {
          short: "Solishtir",
          title: "Faqat konfig o'zgarganda restart",
          body: "PR #90 yuklashdan oldin serverdagi Caddyfile'ning SHA-256 xeshini yozib oladi va keyin solishtiradi. Farq qilsa, skript konteynerni restart qiladi; qilmasa, hech narsa qilmaydi. Oddiy deploy'lar uzilishsiz davom etadi, konfig o'zgarishi esa uni olib kelgan o'sha deploy'da qo'llanadi.",
          fields: {
            OLD_CADDY: "Yuklashdan oldingi xesh.",
            sha256sum: "Fayl o'zgarganini bilishning arzon va aniq yo'li.",
            restart: "Faqat yangi konfig uchun: yangi sarlavhalar darhol ishlaydi.",
            "no gap": "Ko'p deploy faqat fayllarni o'zgartiradi, Caddy ularni baribir yangi beradi.",
          },
        },
      },
    },
    "strong-2018": {
      label: "Import hammasini tashladi",
      steps: {
        "import-zero": {
          short: "Nol qator",
          title: "Eski Strong eksporti hech narsa import qilmaydi",
          body: "Importer GitHub'da topilgan 22 ta ochiq eksport faylida sinaldi. 2018 yildagi bitta Strong eksporti hech narsa import qilmadi. Har bir ma'lumot qatori bitta juft qo'shtirnoqqa o'ralgan edi, shuning uchun parser har qatorda bitta katakni ko'rdi, birliklar esa ustun nomlari ichida edi (`lbs`, `mi.`). 67 qatorning hammasi tashlab ketildi. 2018 va 2019 yillardagi boshqa fayllarda nuqtali mil ustuni tanilmadi va kilometr deb o'qilgan bo'lardi.",
          check: {
            q: "Bu xatolardan eng xavflisi qaysi?",
            options: [
              "Tashlab ketilgan qatorlar",
              "Kilometr deb o'qilgan millar: import muvaffaqiyatli o'tadi, ma'lumot esa jimgina noto'g'ri",
              "Qo'shtirnoqlar",
            ],
            answer: 1,
            why: "Tashlab ketilgan qatorlar ko'rinadi: oldindan ko'rish nol mashg'ulot ko'rsatadi. Noto'g'ri birlik toza import qilinadi va hech qanday ogohlantirishsiz har bir kardio yozuvini buzadi.",
          },
          fields: {
            "one cell": "Butun qator bitta qo'shtirnoqli qiymat bo'lib keladi.",
            "column name": "Eski eksportlar birlikni qiymatga emas, sarlavhaga qo'ygan.",
            "mi.": "Oxirida nuqtali mil: ma'lum birliklar ro'yxatida yo'q edi.",
            "67 rows": "O'sha fayldagi hamma narsa.",
          },
        },
        "import-fixed": {
          short: "Tuzatildi",
          title: "Formatlarni tuzat, haqiqiy fayllarni repodan tashqarida qoldir",
          body: "Bitta katakli qator qaytadan bo'linadi; sarlavhadagi birlik so'zlari o'sha ustunning birligi deb o'qiladi, oxiridagi nuqta e'tiborsiz qoldiriladi; 12 soatdan uzun davomiylik, ya'ni yoqilib qolgan taymer, tashlanadi. Yangi aliaslar mos kelmagan Hevy nomlarini 12.8% dan 6.2% ga tushirdi. Test fixture'lari har bir g'alati holatni to'qima qatorlar bilan takrorlaydi, hech kimning haqiqiy mashg'ulot ma'lumoti commit qilinmaydi.",
          fields: {
            "single cell": "Maydonlarni o'qishdan oldin aniqlanadi va qayta bo'linadi.",
            "trailing dot": "mi. va mi bir xil birlik.",
            "12 h": "Undan uzun mashg'ulot mashq emas, unutilgan taymer.",
            "12.8%": "Tuzatishdan oldin mos kelmagan Hevy nomlari; keyin 6.2%.",
            synthetic: "Format g'alatiliklari bor, lekin hech kimning ma'lumoti ko'chirilmagan fixture'lar.",
          },
        },
      },
    },
  },
};

export default text;
