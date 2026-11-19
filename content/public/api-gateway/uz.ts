import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "API gateway",
  summary:
    "Marketplace ilovasi uchta servisga uchta ochiq host orqali murojaat qiladi va har biri TLS, token tekshiruvi va limitlarni o'zicha qaytadan yozadi. Oldiga qo'yilgan bitta gateway chegaradagi ishni o'z zimmasiga oladi: yo'naltirish, TLS, autentifikatsiya, kvotalar, hajm cheklovlari, mobil ekran uchun yig'ish va canary relizlar. Keyin o'sha gateway hammasini birdan yiqitadigan yagona nuqtaga va biznes mantiq jimgina to'planadigan joyga aylanadi.",
  learn: [
    "Host va path bo'yicha yo'naltirish, TLS ni chegarada tugatish, har marshrutga o'z timeout'i",
    "Chegarada autentifikatsiya: tokenni bir marta tekshirish, ichkariga tasdiqlangan identifikatorni uzatish, klient yuborganini olib tashlash",
    "Kalit bo'yicha rate limit, oylik kvota va hajm cheklovlari; zanjirdagi beshta chaqiruvni qisman javob bilan bittaga aylantiradigan BFF",
    "Header va user hash bo'yicha canary; gateway yagona nosozlik nuqtasi va \"xudo\" qatlam sifatida; gateway, load balancer va service mesh farqi",
  ],
  nodes: {
    app: "Mobil ilova",
    catalog: "Katalog",
    orders: "Buyurtmalar",
    profile: "Profil",
    gw: "API gateway",
    partner: "Hamkor",
    bff: "Bosh ekran BFF",
    orders2: "Buyurtmalar v2",
    l4: "Load balancer",
    gw2: "Gateway #2",
    wallet: "Hamyon",
  },
  metrics: {
    edge: "Tokenni o'zi tekshiradigan servislar",
    spoof: "Soxta identifikatorli so'rovlar",
    p99: "Katalog p99",
    home: "Bosh ekran 3G da",
    exposed: "Yomon relizdan zarar ko'rganlar",
    outage: "O'tgan oydagi to'liq uzilish",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Uchta servis, uchta ochiq host",
      body: "Marketplace ilovasi katalog, buyurtmalar va profil servislariga to'g'ridan-to'g'ri murojaat qiladi, har birining o'z hosti bor. Har servis TLS ni o'zi tugatadi, JWT ni o'z kutubxonasi bilan tekshiradi, o'z CORS qoidalari va limit haqida o'z tushunchasi bor.\n\nBosh ekranga uchalasi ham kerak, shuning uchun telefon uchta TLS ulanish ochadi: 3G tarmoqda 2,1 s. Buyurtmalar servisining yomon relizi bir zumda hamma foydalanuvchiga yetib boradi.",
      fields: {
        Host: "Uchta ochiq nomdan biri. Klient tizimning ichki tuzilishini biladi.",
        Authorization: "Har servis bu tokenni o'zi o'qiydi va o'zi tekshiradi.",
        "three public hosts": "Uchta sertifikat, uchta DNS nomi; servis bo'linsa, uchta narsani ko'chirish kerak.",
        "TLS certificate": "Muddati o'tgani o'sha servisni yiqitadi, uni esa faqat eslab qolgan odam yangilaydi.",
        "JWT check": "Uchta implementatsiya: bittasi albatta `aud` yoki `exp` ni tekshirishni unutadi.",
        CORS: "Brauzer qoidalari har servisda takrorlangan, yana har xil.",
      },
    },
    gateway: {
      short: "Gateway",
      title: "Bitta kirish eshigi: host va path bo'yicha yo'naltirish",
      body: "Yagona ochiq manzilni gateway egallaydi. U TLS ni bitta sertifikat bilan tugatadi va host hamda path bo'yicha yo'naltiradi: `/v1/orders/*` buyurtmalarga, `partners.shop.example` hamkorlar API'siga. Har marshrutning o'z timeout'i bor, shuning uchun sekin buyurtma chaqiruvi ulanishni 60 s ushlab turolmaydi.\n\nServislarga endi internetdan kirib bo'lmaydi. Telefon bitta hostga bitta ulanish saqlaydi, bosh ekran 1,5 s ga tushadi.",
      check: {
        q: "TLS endi gateway'da tugaydi. Gateway'dan servislargacha bo'lgan yo'l-chi?",
        options: [
          "Oddiy HTTP yetadi: bu bizning ichki tarmoq",
          "Uni ham shifrlash (mTLS) va servislar faqat gateway'dan trafik qabul qilishi",
          "O'sha ochiq sertifikat bilan qayta shifrlash",
        ],
        answer: 1,
        why: "\"Ichkari\" xavfsizlik chegarasi emas: buzilgan pod yoki adashgan so'rov oddiy HTTP ni o'qiy oladi. mTLS ham shifrlaydi, ham chaqiruvchi aynan gateway ekanini isbotlaydi. Bu keyingi qadamda, servislar gateway qo'ygan header'larga ishona boshlaganda muhim bo'ladi.",
      },
      fields: {
        tls: "TLS shu yerda tugaydi: bitta sertifikat, avtomatik yangilanadi.",
        host: "Turli hostlar turli upstream'ga ketishi mumkin: ochiq API, hamkorlar.",
        path: "Path prefiksi servisni tanlaydi; klient ichki nomlarni hech qachon bilmaydi.",
        timeout: "Har marshrutga alohida: profil 1 s da javob beradi yoki umuman bermaydi, buyurtmalarga 5 s.",
        mTLS: "Ichkarida ham shifrlangan, servislar gateway'ni boshqalardan ajrata oladi.",
      },
    },
    "edge-auth": {
      short: "Chegarada auth",
      title: "Tokenni bir marta tekshir, ichkariga tasdiqlangan identifikatorni uzat",
      body: "Gateway JWT ni tekshiradi: keshdagi ochiq kalit bilan imzo, `exp`, `aud`. Keyin klient yuborgan barcha `X-User-*` header'larini olib tashlaydi va o'zinikini qo'yadi: user id, scope'lar va har bir servis logga yozadigan yangi `X-Request-Id`.\n\nXom token chegarada qoladi. Servislar tasdiqlangan header'larni o'qiydi, token tekshiruvining uchta nusxasi nolga tushadi. Avtorizatsiya esa joyida qoladi: buyurtmalar servisi buyurtma `u_5120` niki ekanini baribir tekshiradi.",
      watch: "Header'ga faqat uni gateway'dan boshqa hech kim qo'ya olmasa ishonsa bo'ladi. Avval olib tashla, keyin qo'y, har bir marshrutda.",
      check: {
        q: "Gateway tokenni tekshirdi va `X-User-Id` ni uzatadi. Buyurtmalar servisi o'zining `WHERE customer_id = ...` shartidan voz kecha oladimi?",
        options: [
          "Ha: autentifikatsiyani gateway allaqachon qildi",
          "Yo'q: gateway kim chaqirayotganini biladi, qaysi buyurtmalar uniki ekanini faqat servis biladi",
          "Ha, agar scope orders:read bo'lsa",
        ],
        answer: 1,
        why: "Gateway autentifikatsiya qiladi va scope kabi umumiy tekshiruvlarni bajara oladi. Egalik esa faqat servisda bor ma'lumotga bog'liq. Undan voz kechilsa, tizimga kirgan har bir foydalanuvchi har bir buyurtmani ko'radi: avtorizatsiya darsidagi IDOR.",
      },
      fields: {
        "X-User-Id": "Gateway token subject'idan qo'yadi, hech qachon klientdan olmaydi.",
        "X-User-Scopes": "Token nimaga ruxsat berishi, ichkaridagi umumiy tekshiruvlar uchun.",
        "X-Request-Id": "Chegarada yaratiladi, har servis logga yozadi: so'rovni kuzatish uchun bitta id.",
        "X-Forwarded-For": "Klient manzili, gateway uni qanday ko'rgan bo'lsa.",
        removed: "Avval olib tashla, keyin qo'y: klient yuborgan identifikator header'i servisga yetmasligi shart.",
        ownership: "Ma'lumotga bog'liq avtorizatsiya servisda qoladi.",
      },
    },
    flood: {
      short: "Toshqin",
      title: "Bitta hamkor kaliti katalogni yeb qo'yadi",
      body: "Hamkorning narx yig'uvchi skripti qidiruvni aylanib so'raydi: bitta kalitdan soniyasiga 3 000 so'rov, holbuki butun katalog odatda 400 ta so'rovga xizmat qiladi. Katalog p99 hamma uchun 120 ms dan 2,6 s ga chiqadi.\n\nShu bilan birga `POST /v1/reviews` istalgan hajmdagi body'ni qabul qiladi: 48 MB lik sakkizta body worker xotirasini to'ldirishga yetadi.",
      fields: {
        "X-Api-Key": "Hamkorni aniqlaydi: limitni aynan shu bo'yicha sanash kerak.",
        "3 000": "Barcha foydalanuvchilarning odatiy trafigidan yetti baravardan ko'p.",
        "400/s": "Katalog shunga mo'ljallangan.",
        "48 MB": "Chegarasiz body xotiraga hujum, hatto hech kim buni niyat qilmagan bo'lsa ham.",
      },
    },
    limits: {
      short: "Limitlar",
      title: "Kalitga limit, oyga kvota, marshrutga hajm",
      body: "Har API kalitning tarifi bor: soniyalar uchun burst bilan rate, oy uchun kvota. Gateway bitta umumiy omborda sanaydi, shuning uchun uchta instance limitni uch baravar oshirib yubormaydi. Rate oshsa javob `Retry-After` bilan `429`; kvota tugasa, oyning 1-sanasigacha `429`.\n\nBody 1 MB bilan cheklangan (upload'lar 20 MB gacha oqim bilan), header'lar 16 KB, URL 8 KB. Juda katta body o'qilmasdan `413` oladi. Skript o'zining soniyasiga 200 tasiga tushadi, katalog p99 yana 130 ms.",
      check: {
        q: "Hamkor soniyasiga roppa-rosa o'z rate'iga teng 200 ta so'rov yuboradi. Nima bo'ladi va qachon?",
        options: [
          "Hech narsa: u rate ichida",
          "Taxminan 28 soatdan keyin 20 000 000 lik oylik kvotaga yetadi va 1-sanagacha 429 oladi",
          "2 soniyadan keyin burst tugaydi",
        ],
        answer: 1,
        why: "200 × 86 400 = kuniga 17 280 000, demak 20 000 000 taxminan 27,8 soatda tugaydi. Rate servislarni soniyama-soniya himoya qiladi, kvota esa oyni va hisob-kitobni. Ikkalasi ham kerak.",
      },
      fields: {
        burst: "Rate'dan yuqori qisqa sakrashlarga ruxsat, bir martada shuncha.",
        "req/month": "Kvota: texnik limit ustidan biznes limiti.",
        "1 MB": "Standart body chegarasi; kattaroq marshrutlar alohida, ochiq yozilgan istisno.",
        "413": "Content-Length header'i bo'yicha, body'ning bir bayti ham yig'ilmasdan rad etiladi.",
        "Retry-After": "Odobli klientga qachon qayta urinishni aytadi.",
      },
    },
    chatty: {
      short: "Ko'p chaqiruv",
      title: "Bitta ekran uchun zanjirdagi beshta chaqiruv",
      body: "Bosh ekranning 5-versiyasi bannerlar, tavsiyalar va aksiyalarni qo'shadi. Har chaqiruvga oldingisining ma'lumoti kerak: profildan shahar, tavsiyalar uchun oxirgi buyurtmalar. Borib-kelishi 300 ms bo'lgan 3G telefonda zanjirdagi beshta chaqiruv 2,4 s oladi.\n\nJavoblar umumiy maqsadli: bu ekran hech qachon ko'rsatmaydigan 210 KB maydon.",
      watch: "Telefonda kechikish asosan borib-kelishlar. Zanjirdagi beshta tez chaqiruv bitta sekin chaqiruvdan qimmat.",
      fields: {
        "RTT 300 ms": "Server qanchalik tez bo'lmasin, har chaqiruv buni kamida bir marta to'laydi.",
        "needs the user": "Zanjir: bu javobsiz keyingi chaqiruv boshlanolmaydi.",
        "needs the orders": "Tavsiyalar buyurtmalarni kutadi, ular esa profilni kutgan edi.",
        "5 round trips": "Server vaqtidan oldin 5 × 300 ms tarmoq.",
        "210 KB": "Ortiqcha yuklash: API umumiy, ekran esa aniq.",
      },
    },
    bff: {
      short: "BFF",
      title: "Ekran uchun backend: bitta chaqiruv, ichkarida parallel",
      body: "Kichik Bosh ekran BFF (backend for frontend) `GET /v1/home` ga egalik qiladi. Chaqiruv 1 ms turadigan data markaz ichida u profil va buyurtmalarni parallel o'qiydi, keyin bannerlar va tavsiyalarni oladi va ekran chizadigan maydonlarnigina qaytaradi.\n\nTavsiyalarga 150 ms vaqt ajratilgan. Ulgurmasa, BFF baribir qolgani bilan `200` qaytaradi va nimasi yetishmasligini sanab beradi. Bitta borib-kelish: 2,4 s o'rniga 650 ms.",
      check: {
        q: "Tavsiyalar chaqiruvi timeout bo'ldi. `/v1/home` nima qaytarishi kerak?",
        options: [
          "Butun ekranga 504",
          "Qolgan hamma narsa bilan 200, tavsiyalar null va qisman deb belgilangan",
          "Tavsiyalar javob berguncha, qancha cho'zilsa ham kutish",
        ],
        answer: 1,
        why: "Yo'q karusel uchun mijoz buyurtmalarini ko'rmay qolmasligi kerak. Har qism uchun alohida qaror qiling: profil va buyurtmalar muhim (ular yiqilsa, ekran ham yiqiladi), tavsiyalar va bannerlar ixtiyoriy va bo'sh holatga tushadi. Ilova nima olgan bo'lsa, shuni ko'rsatadi.",
      },
      fields: {
        "X-Request-Id": "Xuddi shu id to'rtta ichki chaqiruvga ham boradi: ekran uchun bitta trace.",
        orders: "Profil bilan parallel olinadi, ekran ko'rsatadiganigacha qisqartiriladi.",
        recommendations: "150 ms ga ulgurmadi: xato emas, null.",
        partial: "Ilovaga qaysi qismlarni yashirish yoki keyinroq qayta so'rashni aytadi.",
        took_ms: "Butun ekran uchun server vaqti, ichki chaqiruvlar bilan birga.",
      },
    },
    canary: {
      short: "Canary",
      title: "Foydalanuvchilarning 5% ini yangi versiyaga yubor",
      body: "O'tgan oy buyurtmalar relizi checkout'ni hamma uchun 12 daqiqaga buzdi. Endi gateway qoida bo'yicha yo'naltiradi: `X-Canary: 1` li xodimlar telefonlari va id'si hash'i bo'yicha foydalanuvchilarning 5% i buyurtmalar v2 ga, qolganlar v1 ga. Buzadigan API o'zgarishlari yangi path oladi, `/v2/...`, ikkalasi yonma-yon yashaydi.\n\nGateway status va kechikishni versiya bo'yicha logga yozadi. v2 da xatolar 4,1%, v1 da 0,2%, va bitta config push uning og'irligini 0 ga qaytaradi.",
      check: {
        q: "Nega so'rovlarning tasodifiy 5% i emas, user id hash'i bo'yicha yo'naltiriladi?",
        options: [
          "Hash tasodifiy sondan tezroq",
          "Foydalanuvchi har so'rovda v1 va v2 orasida sakraydi: ma'lumotlar aralashadi, xatolarni qayta chiqarib bo'lmaydi",
          "Tasodifiy yo'naltirishni logga yozib bo'lmaydi",
        ],
        answer: 1,
        why: "Tasodifiy yo'naltirishda bitta savatni bir sessiya ichida v1 o'qiydi, v2 yozadi. Barqaror hash har foydalanuvchini bitta versiyada ushlaydi, shuning uchun buzilgan versiya logda topsa bo'ladigan aniq 5% ga zarar yetkazadi.",
      },
      fields: {
        "X-Canary": "Testerlar uchun ochiq tanlov, v2 ni mijozlar ko'rishidan oldin.",
        "hash(user_id)": "Barqaror: o'sha foydalanuvchi har safar o'sha guruhga tushadi.",
        "same user": "Bir sessiya ichida versiyalar orasida sakrash yo'q.",
        "per version": "Xato va kechikish versiya bo'yicha ajratilgan: canary raqam bilan baholanadi.",
        "weight back to 0": "Orqaga qaytish qayta deploy emas, yo'naltirish o'zgarishi.",
      },
    },
    spof: {
      short: "SPOF",
      title: "Gateway hammasini yiqitadi",
      body: "Chegirmalarni tezroq chiqarish uchun kimdir ularni gateway plaginiga yozdi: hech kimga tegishli bo'lmagan 1 900 qator. Bitta shahar qoidasida nil bo'lgan config yagona gateway instance'iga yetib boradi. Har bir worker birinchi `/v1/home` da yiqiladi, qayta ishga tushadi va yana yiqiladi.\n\n47 daqiqa davomida barcha marshrutlar ishlamaydi, chegirmaga hech qanday aloqasi yo'q hamkor API'si ham. Tuzatish uchun narxlar jamoasi va platforma jamoasi bitta xonaga yig'ilishi kerak.",
      watch: "Hamma narsa gateway orqali o'tadi, demak undagi har narsa umumiy xavf. U yerdagi biznes mantiq uni servislar oldidagi yangi monolitga aylantiradi.",
      fields: {
        "pricing.lua": "Chegara qatlamidagi biznes qoidalar: yo'naltirish bilan deploy bo'ladi, yo'naltirish bilan yiqiladi.",
        "owned by nobody": "Gateway narxlar jamoasiniki emas, qoida esa platforma jamoasiniki emas.",
        "one instance": "Trafikni oladigan ikkinchi nusxa yo'q.",
        "every route": "Bitta yomon plagin unga umuman tegmaydigan marshrutlarni ham buzadi.",
        "47 minutes": "Bitta funksiyadagi xato uchun to'liq uzilish.",
      },
    },
    thin: {
      short: "Yupqa va zaxirali",
      title: "Bir nechta instance, bosqichma-bosqich config, biznes mantiqsiz",
      body: "Gateway ikki zonada uchta stateless instance bo'lib ishlaydi, oldida ularning sog'lig'ini har 2 s da tekshiradigan L4 load balancer. Config git'da yashaydi, CI da tekshiriladi, avval bitta instance'ga, qolganlariga 10 daqiqadan keyin boradi.\n\nChegirmalar narxlar servisiga qaytadi. Gateway'da faqat chegara ishlari qoladi: yo'naltirish, TLS, auth, kalitlar, limitlar, request id. Yomon config endi uchta instance'dan bittasini buzadi, balancer uni 6 s ichida chiqarib tashlaydi.",
      check: {
        q: "Bulardan qaysi biri gateway'ga tegishli?",
        options: [
          "1 MB bilan cheklangan marshrutda 30 MB lik body'ni rad etish",
          "Savat summasi 50 000 so'mdan kam bo'lsa buyurtmani rad etish",
          "Javobga mijozning bonus ballarini qo'shish",
        ],
        answer: 0,
        why: "Hajm chegarasi HTTP so'rovning xossasi: hamma servis uchun bir xil, chegarada tekshirish arzon. Minimal buyurtma va bonus ballar biznes qoidalari: biznes bilan birga o'zgaradi, uning ma'lumoti kerak va ularga egalik qiladigan servisga tegishli.",
      },
      fields: {
        "3 instances": "Stateless nusxalar: limit hisoblagichlari xotirada emas, umumiy omborda.",
        L4: "TCP ulanishlarni taqsimlaydi, sog'liqni tekshiradi, URL haqida hech narsa bilmaydi.",
        "in git": "Har marshrut o'zgarishi review'dan o'tadi va orqaga qaytariladi.",
        "1 instance first": "Yomon config trafikning hammasiga emas, uchdan biriga, bir necha daqiqa zarar beradi.",
        "back to the pricing service": "Biznes qoidalar ularga egalik qiladigan jamoaga qaytadi.",
        "6 s": "2 s oraliqdagi uchta muvaffaqiyatsiz tekshiruv, keyin instance chiqariladi.",
      },
    },
    compare: {
      short: "Taqqoslash",
      title: "Load balancer, gateway, service mesh",
      body: "Load balancer ulanishlarni bitta narsaning sog'lom nusxalari orasida taqsimlaydi, URL va tokenlarni o'qimaydi. API gateway north-south trafikni boshqaradi: klientlardan tizim ichiga, kalitlar, kvotalar, ochiq versiyalar va BFF lar shu yerda.\n\nService mesh east-west trafikni boshqaradi: servisdan servisga, har servis yonidagi sidecar'da mTLS, qayta urinishlar va timeout'lar. Ular raqib emas, qatlamlar: ko'p tizimlarda gateway oldida balancer, orqasida mesh ishlaydi.",
      check: {
        q: "Buyurtmalar klaster ichida profilni soniyasiga 2 000 marta chaqiradi. Bu chaqiruvlar API gateway orqali o'tishi kerakmi?",
        options: [
          "Ha: hamma trafik uchun bitta joy soddaroq",
          "Yo'q: east-west chaqiruvlar to'g'ridan-to'g'ri yoki mesh orqali boradi; gateway klientlar uchun",
          "Ha, chaqiruvlarga rate limit qo'llanishi uchun",
        ],
        answer: 1,
        why: "Ichki chaqiruvlarni chegara orqali aylantirish bir hop qo'shadi, ichki trafikni klient kvotalari ostiga qo'yadi va klasterdan hech qachon chiqmaydigan chaqiruvlarni gateway'ga bog'laydi. Ichki identifikatsiya va qayta urinishlar mesh'ning ishi.",
      },
      fields: {
        "L4 load balancer": "Ulanish kiradi, ulanish chiqadi: tez va so'rov ichini ko'rmaydi.",
        "north-south": "Tizim chegarasini kesib o'tadigan trafik.",
        "east-west": "Tizim ichidagi servislar orasidagi trafik.",
        sidecar: "Har servis yonidagi proxy, servislarga tarmoq kodi kerak bo'lmaydi.",
        "all three": "Har biri bitta yo'lning boshqa qatlamini hal qiladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "API gateway uchun yetti qoida.\n\n1) Bitta ochiq kirish: host va path bo'yicha yo'naltiring, TLS ni shu yerda tugating, har marshrutga o'z timeout'ini bering, servislarni internetdan yoping. 2) Tokenni chegarada bir marta tekshiring, klient yuborgan har bir identifikator header'ini olib tashlang, keyin tasdiqlanganini qo'ying; servislar egalikni baribir tekshiradi. 3) Limitlarni kalit bo'yicha umumiy omborda sanang: burst bilan rate, oylik kvota, 429 va 413 bilan javob beradigan hajm chegaralari. 4) Mobil ekran uchun BFF servislarni parallel chaqiradi va ixtiyoriy qism yiqilsa qisman javob qaytaradi. 5) Canary header va barqaror user hash bo'yicha, versiyalar metrikasi bilan baholanadi, og'irlik bilan orqaga qaytariladi. 6) Balancer ortida bir nechta stateless instance ishlating va config o'zgarishlarini bosqichma-bosqich chiqaring. 7) Biznes mantiqni tashqarida qoldiring; balancer, gateway va mesh uchta tanlov emas, uchta qatlam.",
    },
  },
  scenarios: {
    unstripped: {
      label: "Tozalanmagan header",
      steps: {
        "spoof-route": {
          short: "Yangi marshrut",
          title: "Yangi marshrut klientning X-User-Id iga ishonadi",
          body: "Hamyon jamoasi `/v1/wallet/*` ni eski marshrut shablonidan qo'shadi. Gateway tokenni tekshiradi, lekin shablonda tozalash qadami yo'q: u o'z `X-User-Id` ini klient yuborganining orqasidan qo'shib qo'yadi.\n\nHamyon freymvorki birinchi qiymatni o'qiydi. O'z haqiqiy tokeni bor istalgan odam `X-User-Id: u_0042` qo'shib, boshqa birovning balansini o'qiy oladi. Loglarda kuniga 240 ta shunday so'rov.",
          check: {
            q: "Bu marshrutda token tekshirilgan edi. Soxtalashtirish nega ishladi?",
            options: [
              "Token imzosi tekshirilmagan",
              "Klient header'i olib tashlanmagan, servis esa birinchi kelgan qiymatga ishongan",
              "Rate limit juda baland edi",
            ],
            answer: 1,
            why: "Haqiqiy token chaqiruvchi kimligini isbotlaydi, lekin servis unga umuman qaramadi: header'ni o'qidi. Gateway faqat qo'shib qo'ysa, servisga ikkita qiymat yetadi va freymvork bittasini tanlaydi. Avval olib tashla, keyin qo'y.",
          },
          fields: {
            "X-User-Id": "Bitta so'rovda ikki qiymat: birinchisi klientniki, ikkinchisi gateway'niki.",
            appended: "Qo'shib qo'yish klient yuborgan narsani saqlab qoladi.",
            "first value": "Ko'p freymvorklar shu nomdagi birinchi header'ni qaytaradi.",
            template: "Har marshrutga nusxalangan chegara qoidalari: qaysidir marshrut ularni albatta o'tkazib yuboradi.",
            user_id: "Boshqa birovning hisobi, 200 OK bilan berildi.",
          },
        },
        "strip-all": {
          short: "Hammasini tozala",
          title: "Identifikator header'larini bir marta, har qanday marshrutdan oldin tozala",
          body: "Tozalash marshrut shablonlaridan gateway'ning har so'rov uchun birinchi qadamiga ko'chadi: tashqaridan kelgan barcha `X-User-*` va `X-Internal-*` header'lari tashlanadi. Auth'li marshrutlar keyin `X-User-Id` ni tokendan qo'yadi, hech qachon qo'shib qo'ymaydi. Auth bloki yo'q marshrut CI dan o'tmaydi.\n\nCI testi har bir marshrutni soxta header va boshqa birovning tokeni bilan chaqiradi. Gateway orqali soxtalashtirish to'xtaydi. Kuniga uchtasi qoladi: ofis tarmog'idagi admin vosita hamyonga gateway'ni chetlab, to'g'ridan-to'g'ri murojaat qiladi.",
          fields: {
            "before any route": "Marshrutga emas, hammaga: yangi marshrut buni unutolmaydi.",
            "never append": "Qo'yish almashtiradi: tokendan olingan bitta qiymat.",
            "fails the config check": "Auth yo'qligi review izohi emas, build xatosi.",
            "every route": "Qoidani ertaga qo'shiladigan marshrutlar uchun ham isbotlaydigan test.",
            directly: "Gateway orqali o'tmaydigan yo'l uning birorta qoidasini olmaydi.",
          },
        },
        "verify-inside": {
          short: "Ichkarida tekshir",
          title: "Servislar oddiy header'ni emas, imzolangan identifikatorni tekshiradi",
          body: "Gateway endi identifikatorni qisqa imzolangan token sifatida yuboradi: 60 s umr, auditoriya `wallet`, subject foydalanuvchi. Hamyon imzoni tekshiradi va usiz kelgan har qanday so'rovni rad etadi: gateway'dan bo'ladimi, ofis tarmog'idanmi yoki boshqa joydanmi.\n\nKeyin jamoa loglarni qidiradi: header token bilan mos kelmagan 1 912 ta o'tgan so'rov, 37 ta hisob. Ularning egalariga xabar beriladi. Soxta identifikatorlar nolga tushadi.",
          fields: {
            "X-Identity": "Gateway imzolagan: boshqa hech kim yasay olmaydigan header.",
            "60 s": "Logga sizib chiqsa ham foydalanish uchun juda qisqa.",
            "aud=wallet": "Hamyon uchun berilgan tokenni boshqa servisda qayta ishlatib bo'lmaydi.",
            "401": "Haqiqiy identifikator yo'q, javob ham yo'q: tarmoq yo'li endi ahamiyatsiz.",
            "37 accounts": "Allaqachon yetkazilgan zarar, topildi va xabar qilindi.",
          },
        },
      },
    },
  },
};

export default text;
