import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Graceful shutdown",
  summary:
    "Checkout API load balanser ortida 6 ta pod'da ishlaydi, soniyasiga 1 200 ta so'rovga xizmat qiladi, websocket'larni ochiq ushlaydi va o'sha jarayonning o'zida fon vazifalarini bajaradi. Kuniga uch marta deploy bo'ladi va har bir deploy ish o'rtasida turgan 6 ta jarayonni to'xtatadi. Dars bitta eski pod'ni oxirigacha kuzatadi: signal, avval readiness'ning false bo'lishi, soniyalab trafik yuborishda davom etadigan balanser, grace period ichida muddatli drain, uzoq yashaydigan ulanishlar, vazifalar, kirish tomonda esa warm-up'dan keyingi readiness va bog'liqliklarni tekshirmasligi kerak bo'lgan liveness probe.",
  learn: [
    "Deploy paytida ishlanayotgan so'rovlar bilan nima bo'ladi: SIGTERM, unga parallel ketadigan endpoint olib tashlash, grace period va SIGKILL",
    "Toza chiqish tartibi: readiness false, balanserlarni kutish, qabul qilishni to'xtatish, muddatli drain, pool'larni oxirida yopish, flush",
    "Uzoq yashaydigan ulanishlar va fon vazifalari: jitter bilan qayta ulanish, vazifani tugatish yoki qaytarish, idempotent handler'lar",
    "Startup, readiness va liveness probe'lari va bog'liqlikni tekshiradigan liveness probe nega kichik uzilishni restart siklga aylantiradi",
  ],
  nodes: {
    web: "Foydalanuvchilar",
    lb: "Load balanser",
    old: "Pod v41 (eski)",
    new: "Pod v42 (yangi)",
    db: "Baza",
    queue: "Vazifalar navbati",
    orch: "Orkestrator",
  },
  metrics: {
    err: "Yiqilgan so'rovlar",
    p99: "So'rov p99",
    cut: "Pod boshiga uzilgan so'rovlar",
    reconn: "Websocket qayta ulanishlari",
    jobcut: "Deploy boshiga uzilgan vazifalar",
    restarts: "Pod restart'lari",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Deploy ishlab turgan pod'ga nima qiladi",
      body: "Checkout API 6 ta pod'da ishlaydi, har birida soniyasiga 200 ta so'rov, taxminan 1 900 ta ochiq websocket va bitta vazifa worker'i. Rolling deploy yangi pod'ni ishga tushiradi, u tayyor bo'lishini kutadi, keyin eski pod'lardan birini to'xtatadi.\n\nTo'xtatish ikki narsani **bir vaqtda** boshlaydi: pod endpoint'lar ro'yxatidan olib tashlanadi, har bir balanser bundan o'z jadvali bo'yicha 1-10 s ichida xabar topadi, jarayon esa **SIGTERM** oladi. Grace period tugaganda jarayon hali ishlayotgan bo'lsa, u ushlab bo'lmaydigan SIGKILL oladi.",
      watch: "Balanserlar yetib olishini hech narsa kutmaydi. Deploy xatolarining ko'pi aynan shu oraliqdan keladi.",
      fields: {
        Ready: "Yangi pod readiness tekshiruvidan o'tdi va trafik oladi.",
        Terminating: "Eski pod chiqib ketyapti; grace period soati hozir boshlanadi.",
        "in parallel": "Endpoint olib tashlash va SIGTERM ketma-ket emas. SIGTERM'dan keyin ham trafik kelishi mumkin.",
        "1-10 s": "Hamma balanser bu pod'ga yuborishni to'xtatguncha qancha vaqt o'tadi.",
        SIGTERM: "To'xtashga muloyim iltimos. Ilova uni ushlab, ishini tugatib olishi mumkin.",
        SIGKILL: "Jarayon joyida o'ldiriladi. Undan keyin hech narsa bajarilmaydi.",
      },
    },
    sigkill: {
      short: "SIGKILL",
      title: "Signal ilovaga yetib bormaydi",
      body: "Konteyner ilovani shell orqali ishga tushiradi, shuning uchun PID 1 ilova emas, `/bin/sh`. Shell'da SIGTERM handler'i yo'q va u signalni uzatmaydi. Ilova to'xtash kerakligini bilmaydi, 40 s ishlashda davom etadi, keyin SIGKILL bilan hammasi birdan o'ladi.\n\nIshlanayotgan 23 ta so'rov uziladi va balanser 502 qaytaradi. 1 900 ta websocket bir millisekundda uziladi va hammasi birdan qayta ulanadi. Yarmigacha bajarilgan vazifa hech qachon tasdiqlanmaydi. Har bir pod chiqib ketish uchun to'liq 40 s oladi, shuning uchun deploy shovqinli bo'lishi ustiga sekin ham.",
      check: {
        q: "Nega ilova butun grace period davomida ishlashda davom etdi?",
        options: [
          "Ilova band edi va so'rovlarini tugatish uchun 40 s kerak edi",
          "SIGTERM PID 1 bo'lgan shell'ga bordi, u signalni na ushlaydi, na uzatadi, shuning uchun ilova uni umuman olmadi",
          "Orkestrator SIGTERM'ni faqat grace period'dan keyin yuboradi",
        ],
        answer: 1,
        why: "Signalni faqat konteynerning PID 1 i oladi. Ilovani to'g'ridan-to'g'ri (exec form) yoki signallarni uzatadigan kichik init jarayoni ostida ishga tushiring va ilovada SIGTERM handler'i borligiga ishonch hosil qiling.",
      },
      fields: {
        PID: "Konteyner ichidagi jarayon raqamlari. Signalni PID 1 oladi.",
        "/bin/sh -c": "Ilovani shell ishga tushirgan va PID 1 bo'lib olgan.",
        "not forwarded": "Shell SIGTERM'ga e'tibor bermaydi; ilova uni eshitmaydi.",
        "137": "128 + 9: SIGKILL bilan o'ldirilgan.",
        "502": "Balanser so'rov o'rtasida ulanishni yo'qotdi va xato bilan javob beradi.",
        "1 900": "Hamma websocket birdan uziladi, demak hamma client birdan qayta ulanadi.",
        "no ack": "Navbat vazifa tugaganini hech qachon bilmaydi; keyinroq uni yana beradi.",
      },
    },
    handler: {
      short: "Handler",
      title: "Ilova SIGTERM'ni eshitadi va ketayotganini aytadi",
      body: "Endi ilova PID 1 sifatida ishlaydi (exec form) va unda SIGTERM handler'i bor. U birinchi navbatda o'zining **readiness** holatini false qiladi: `/readyz` `draining` bilan 503 qaytaradi. Bu pod'ni health-check qiladigan har bir balanserga yangi so'rov yuborishni to'xtatishni aytadi.\n\nLekin u xizmat qilishni to'xtatmaydi. Hali kelayotgan so'rovlar odatdagidek bajariladi, ishlanayotgan 17 tasi davom etadi. Readiness rotatsiyadan chiqarishni so'rash, to'xtash emas.",
      fields: {
        "/readyz": "Balanserlar bu yerga trafik yuborish-yubormaslikni hal qilish uchun chaqiradigan endpoint.",
        status: "`draining`: tirik, ishini tugatyapti, yangi narsa yubormang.",
        in_flight: "Hozir xizmat qilinayotgan so'rovlar.",
        accepting: "Hali true: balanserlar yetib olguncha yangi ulanishlar qabul qilinadi.",
      },
    },
    "lb-lag": {
      short: "Kechikish",
      title: "Balanser yana 9 soniya yuboraveradi",
      body: "Handler'ning birinchi versiyasi readiness'ni o'zgartirib, tinglayotgan soketni darhol yopib qo'ygan edi. Balanser buni hali bilmasdi: u har 2 s da tekshiradi va 2 marta xato kerak, endpoint yangilanishi esa 9.2 s dan keyin keldi.\n\nShu 9.2 s davomida bu pod'ga yuborilgan har bir so'rov yopiq portga urildi: connection refused, foydalanuvchiga 502. Soniyasiga 200 ta so'rov, bitta pod'dan 1 840 ta xato, deploy boshiga 11 000 ga yaqin.",
      check: {
        q: "Readiness allaqachon false. Nega so'rovlar kelishda davom etadi?",
        options: [
          "Balanser readiness'ga e'tibor bermaydi",
          "Readiness va endpoint yangilanishlari so'rab turiladi va tarqaladi: har bir balanser bundan soniyalar o'tib, o'z jadvali bo'yicha xabar topadi",
          "Client'lar pod'ning IP manzilini keshlab olgan",
        ],
        answer: 1,
        why: "Hech narsa barcha balanserlarga bir zumda yetkazilmaydi. Health check'lar interval va xato chegarasi bilan ishlaydi, endpoint ro'yxatlari asinxron tarqaladi. Pod eng sekin balanser yetib olguncha xizmat qilishda davom etishi kerak.",
      },
      fields: {
        "listener closed": "Xato: trafik hali bu yerga yo'naltirilayotganda port yopiladi.",
        "Connection refused": "Portni endi hech kim tinglamaydi; balanser buni 502 ga aylantiradi.",
        "health check": "Har 2 s da, 2 ta xato kerak: balanser o'zi voz kechguncha 6 s gacha.",
        "endpoint update": "Orkestrator ro'yxati nihoyat shu balanserga yetib keldi.",
        "1 840 errors": "Tezlik ko'paytirilgan kechikish, bitta pod'ning o'zidan.",
      },
    },
    wait: {
      short: "Kutish",
      title: "Balanserlar yetib olguncha xizmat qilishda davom et",
      body: "Yechim: to'xtashdan oldin kutish. SIGTERM'dan keyin ilova ready-false holatida qoladi, lekin **10 s** davomida qabul qilishda davom etadi, bu eng sekin balanserga kerak bo'lgandan uzoqroq. Shundan keyingina qabul qilishni to'xtatadi va drain qiladi.\n\nHammasi Terminating'dan boshlanadigan grace period ichiga sig'ishi kerak: 10 s kutish, ko'pi bilan 25 s drain, bir necha soniya zaxira, 40 s da SIGKILL. Ilovani o'zgartirib bo'lmasa, 10 s uxlaydigan `preStop` hook xuddi shu kutishni SIGTERM yuborilishidan oldin qiladi, lekin u o'sha 40 s ichida hisoblanadi.",
      watch: "Drain muddatini grace period minus kutishdan kam qo'ying, aks holda SIGKILL drain'ning o'rtasida keladi.",
      fields: {
        terminationGracePeriodSeconds: "Terminating'dan SIGKILL'gacha bo'lgan butun budjet.",
        "keep accepting": "Ready false, lekin port ochiq qoladi.",
        "0-10 s": "Balanserlar hali trafik yuborib turadigan oraliq.",
        "stop accepting": "Bundan buyon yangi ulanish yo'q.",
        "drain deadline": "Qat'iy chegara: chiqish budjet ichida qolishi uchun hali ishlayotgan narsa uziladi.",
        SIGKILL: "Oxirgi chora, drain muddatidan 5 s keyin.",
        preStop: "SIGTERM'dan oldin ishlaydigan hook. Uning uxlashi grace period'dan olinadi.",
      },
    },
    drain: {
      short: "Drain",
      title: "Qabul qilishni to'xtat, boshlanganini tugat, keyin chiq",
      body: "10 s da ilova tinglayotgan soketni va bo'sh turgan keep-alive ulanishlarni yopadi. Hali ishlanayotgan so'rovlarga javoblar `Connection: close` bilan ketadi, shunda client'lar yopilish arafasidagi ulanishga keyingi so'rovni yubormaydi.\n\n17 ta so'rovning oxirgisi 1.3 s dan keyin tugaydi. Faqat shundan keyin baza pool'i yopiladi: uni birinchi yopish hali undan foydalanayotgan so'rovlarni yiqitardi. Log va metrikalar flush qilinadi, shunda pod'ning oxirgi soniyalari yo'qolmaydi, jarayon esa 0 kodi bilan chiqadi.",
      check: {
        q: "Nega baza pool'i SIGTERM paytida emas, oxirgi so'rovdan keyin yopiladi?",
        options: [
          "Farqi yo'q, pool chiqishda o'zi yopiladi",
          "Ishlanayotgan so'rovlarga u hali kerak: uni birinchi yopish drain'ni baza xatolari to'lqiniga aylantiradi",
          "Pool'ni yopish bir necha soniya oladi",
        ],
        answer: 1,
        why: "Bog'liqliklarning teskari tartibida to'xtat: avval yangi ishni to'xtat, keyin joriy ish tugashiga yo'l qo'y, keyin o'sha ish ishlatgan narsalarni yop, eng oxirida uni tasvirlaydigan narsalarni flush qil.",
      },
      fields: {
        "stop accepting": "Tinglayotgan soket yopiladi; balanserlar baribir endi bu yerga yubormaydi.",
        "Connection: close": "Keep-alive client'larga bu ulanishni qayta ishlatmaslikni aytadi.",
        "in flight 0": "Boshlangan har bir so'rov tugadi.",
        "db pool closed": "Uni hech narsa ishlata olmay qolgandan keyin, oxirida yopiladi.",
        flushed: "Buferdagi log va metrikalar jarayon yo'qolishidan oldin yuboriladi.",
        "exit 0": "Toza chiqish: drain boshlanganidan 1.4 s keyin, SIGKILL'dan ancha oldin.",
        deadline: "Biror narsa osilib qolsa, deploy'ni ushlab turish o'rniga 35 s da uziladi.",
      },
    },
    "long-lived": {
      short: "Websocket'lar",
      title: "Uzoq ulanishlar: client'lardan jitter bilan qaytishni so'ra",
      body: "Websocket soatlab ochiq turishi mumkin, shuning uchun drain uni kuta olmaydi. 1 900 tasini birdan uzib tashlash esa 1 900 ta client'ni bir soniyada, qolgan pod'larga qayta ulanishga majbur qiladi.\n\n10 s da pod har bir client'ga `reconnect` xabarini yuboradi va 1012, service restart kodi bilan yopadi. Client tasodifiy 0 dan 10 s gacha kutadi va qayta ulanadi, tayyor pod'ga tushadi. Server-Sent Events uchun pod `retry:` maslahatidan keyin oqimni tugatadi, brauzer esa oxirgi event id'dan davom ettiradi. Bir soniyada 1 900 ta emas, 10 s davomida soniyasiga 190 ta qayta ulanish.",
      watch: "Kutilmagan uzilishdan keyingi o'z qayta ulanishiga ham client'lar jitter qo'shishi kerak, aks holda crash ham xuddi shunday sakrash yaratadi.",
      fields: {
        reconnect: "Ilova xabari: server ketyapti, qayta ulan.",
        retry_in_ms: "Tasodifiy kechikish oralig'i: 0 dan 10 s gacha.",
        "1012": "Service restart uchun standart websocket yopish kodi.",
        "random(0..10 s)": "Jitter qayta ulanishlarni 10 s ga yoyadi.",
        "Last-Event-ID": "Brauzer yangi serverga oqim qayerda to'xtaganini aytadi.",
        "190 reconnects/s": "O'sha 1 900 ta client, o'n barobar tekisroq.",
      },
    },
    jobs: {
      short: "Vazifalar",
      title: "Fon vazifalari: tugat yoki qaytarib ber",
      body: "O'sha jarayondagi vazifa worker'i ham o'sha SIGTERM'ni oladi. U darhol yangi xabar olishni to'xtatadi. Muddat ichida tugaydigan vazifa tugatiladi va tasdiqlanadi (ack). Uzun vazifa, yana 4 daqiqa kerak bo'lgan eksport, oxirgi checkpoint'da to'xtaydi va navbatga qaytariladi (nack), shunda boshqa pod uni darhol oladi.\n\nPod baribir o'lib qolsa, navbat vazifani 120 s lik **visibility timeout**'dan keyin yana beradi. Har ikki holatda vazifa ikki marta bajarilishi mumkin, shuning uchun har bir handler idempotent bo'lishi kerak: eksport o'sha faylni vazifa id'si ostida qayta yozadi.",
      check: {
        q: "Pod hisob-faktura emailini yuboradigan vazifaning o'rtasida o'ldirildi. Vazifa bilan nima bo'ladi?",
        options: [
          "Yo'qoladi: pod uni olganda navbat uni o'chirib tashlagan",
          "Visibility timeout'dan keyin yana ko'rinadi va ikkinchi marta bajariladi, handler idempotent bo'lmasa email ikki marta ketadi",
          "Pod o'lgani uchun navbat uni bekor qiladi",
        ],
        answer: 1,
        why: "Ack bo'lmasa, navbat vazifa yiqildi deb hisoblaydi va uni yana beradi. Worker'ni o'ldirishni xavfsiz qiladigan narsa shu, handler esa ishni allaqachon qilganini sezishi kerakligining sababi ham shu.",
      },
      fields: {
        "stop receiving": "Bundan buyon yangi vazifa yo'q.",
        ack: "Vazifa bajarildi; navbat uni o'chiradi.",
        nack: "Vazifa timeout'ni kutmasdan hozir qaytariladi.",
        "visibility timeout": "Olingan vazifa navbat uni yana taklif qilgunicha qancha yashirin turadi.",
        "runs twice": "Ish va ack orasida o'ldirildi: vazifa boshqa joyda yana bajariladi.",
        idempotent: "Ikki marta bajarish bir marta bajarish bilan bir xil natija beradi.",
      },
    },
    "liveness-loop": {
      short: "Restart sikli",
      title: "Bazani tekshiradigan liveness probe",
      body: "To'xtash ishning yarmi; ikkinchi yarmi pod'lar tirikligi qanday baholanishi. Liveness probe `/healthz` ni chaqiradi, `/healthz` esa bazada `SELECT 1` bajaradi. Bazada failover bo'ladi, u 20 s oladi.\n\n3 ta muvaffaqiyatsiz probe'dan keyin orkestrator 6 ta pod'ning hammasini o'ldiradi: ular sog'lom, lekin liveness boshqacha deydi. Ular sovuq holda ishga tushadi va birortasi ham tayyor emas. Birinchi tayyor bo'lgani butun trafikni oladi, sekinlashadi, uning `/healthz` i timeout bo'ladi va u yana o'ldiriladi. Bazadagi 20 s lik uzilish 6 daqiqalik to'xtashga aylanadi.",
      check: {
        q: "Liveness probe nimani tekshirishi kerak?",
        options: [
          "Har bir bog'liqlikni, shunda biror narsa noto'g'ri bo'lsa pod restart bo'ladi",
          "Faqat jarayonning o'zi qotib qolganmi: restart bazani tuzata olmaydi, faqat sovuq start qo'shadi",
          "Hech narsani; liveness probe'larni o'chirib qo'yish kerak",
        ],
        answer: 1,
        why: "Restart faqat qotib qolgan jarayon uchun to'g'ri davo: deadlock, to'xtab qolgan event loop. Bog'liqlik muammosida u sig'im eng kerak bo'lgan paytda sog'lom pod'larni olib tashlaydi.",
      },
      fields: {
        livenessProbe: "Undan o'tmaslik: bu konteynerni o'ldir va qayta ishga tushir degani.",
        "SELECT 1": "Xato: liveness probe ichida boshqa tizimni tekshirish.",
        failover: "Baza tomonidagi oddiy 20 s lik hodisa.",
        "6 of 6": "Hamma pod bir paytda yiqiladi, chunki ularning bazasi umumiy.",
        "0 ready": "Qizib kelayotgan sovuq pod'lar: hech kim xizmat qila olmaydi.",
        "killed again": "Ortiqcha yuk probe'ni yana yiqitadi: restart sikli.",
      },
    },
    probes: {
      short: "Probe'lar",
      title: "Uchta probe, uchta savol",
      body: "Har bir probe bitta savolga javob beradi. **Startup**: ilova ishga tushib bo'ldimi? Bu 60 s gacha cho'zilishi mumkin, boshqa probe'lar uni kutadi. **Readiness**: hozir bu yerga trafik kelsinmi? Faqat warm-up'dan keyin, baza pool'i ochilgan, narxlar keshi yuklangan va 50 ta warm-up so'rovi bajarilgandan keyin, drain paytida esa yo'q. **Liveness**: jarayon qotib qoldimi? U faqat jarayonning o'zini, keng chegara bilan tekshiradi.\n\nEndi baza ishlamay qolsa, so'rovlar 503 bilan tez yiqiladi, pod'lar esa turaveradi. Baza qaytganda ular darhol, issiq holda xizmat qiladi.",
      watch: "Umumiy bog'liqlik sababli readiness'ni yiqitish hamma pod'ni birdan chiqarib yuboradi va balanserda trafik yuboradigan joy qolmaydi. Readiness pod'ning o'z holati haqida bo'lsin.",
      fields: {
        startupProbe: "Sekin startga vaqt beradi, shunda liveness hali ishga tushayotgan pod'ni o'ldirmaydi.",
        readinessProbe: "Rotatsiyaga kirish yoki chiqish. Hech qachon restart emas.",
        livenessProbe: "Faqat qotib qolgan jarayonni restart qil: 10 s oraliqda 6 ta xato.",
        "no dependencies": "Baza, kesh va boshqa servislar liveness'ning qismi emas.",
        "warm-up": "Yangi pod faqat birinchi so'rovlari tez bo'ladigan paytda trafik oladi.",
        "nobody restarts": "Bog'liqlikdagi uzilish endi restart sikliga ko'paymaydi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "To'xtash va ishga tushish uchun yetti qoida.\n\n1) SIGTERM ilovaga yetib borishiga ishonch hosil qil: uni PID 1 sifatida yoki signallarni uzatadigan init ostida ishga tushir. 2) SIGTERM'da avval readiness'ni false qil va xizmat qilishda davom et. 3) Balanserlaringiz yuborishni to'xtatishi uchun kerak bo'lgandan uzoqroq kut (bu yerda 10 s), ilovada yoki preStop sleep bilan. 4) Keyin qabul qilishni to'xtat, Connection: close yubor, ishlanayotgan so'rovlarni grace period'ga sig'adigan muddat bilan drain qil, pool'larni oxirida yop, log va metrikalarni flush qil. 5) Uzoq ulanishdagi client'lardan jitter bilan qayta ulanishni so'ra. 6) Fon vazifalari: yangisini olishni to'xtat, joriysini tugat yoki qaytar, handler'larni idempotent qil. 7) Readiness faqat warm-up'dan keyin; liveness jarayonni tekshiradi, hech qachon bog'liqlikni emas.",
    },
  },
  scenarios: {
    "fast-exit": {
      label: "SIGTERM'da chiqish",
      steps: {
        "exit-now": {
          short: "Darhol chiqish",
          title: "Tezroq deploy, har birida 502",
          body: "Deploy 75 s oladi va kimdir uni tezlashtiradi: SIGTERM handler'i endi exit(0) chaqiradi. Pod signaldan 4 ms keyin yo'qoladi.\n\nIshlanayotgan 17 ta so'rov uziladi, keyingi 9 s davomida balanser hech kim tinglamayotgan portga yuborishda davom etadi. Pod boshiga 1 850 ga yaqin xato, deploy boshiga 11 000, kuniga uchta deploy. Har safar kimdir yangi versiya chiqarganda foydalanuvchilar checkout'da 502 to'lqinini ko'radi.",
          check: {
            q: "Balanser har bir pod'ni health-check qiladi. Nega u bu to'lqinning oldini olmaydi?",
            options: [
              "Oldini oladi: xatolar faqat yangi versiyadagi bug'lardan keladi",
              "Health check o'lik pod'ni faqat interval va chegaradan keyin, soniyalar o'tib sezadi; shu paytgacha trafik yopiq portga ketadi",
              "Balanser har bir yiqilgan so'rovni boshqa pod'da qayta uradi",
            ],
            answer: 1,
            why: "Health check muammoni u sodir bo'lgandan keyin aniqlaydi. Bu oraliqdan qochishning yagona yo'li: balanserlar pod'ni olib tashlaguncha u xizmat qilishda davom etishi, exit(0) esa aynan shuni o'tkazib yuboradi.",
          },
          fields: {
            "Idempotency-Key": "Client xavfsiz qayta urinishi mumkin, lekin ko'p foydalanuvchi shunchaki xato sahifasini ko'radi.",
            "502": "Balanser pod'dan javob ololmadi.",
            error: "Pod ulanishni so'rov o'rtasida yopdi.",
            pod: "Pod SIGTERM'dan 4 ms keyin, hech bir balanser bilmasdan chiqib ketdi.",
          },
        },
        "exit-fix": {
          short: "Tuzatish",
          title: "Drain'ni tashlab ketmasdan tezroq deploy",
          body: "exit(0) qaytarib olinadi: ready false, 10 s kutish, 25 s muddatli drain, chiqish. Tezlik boshqa joydan keladi: bir vaqtda ikkita yangi pod ishga tushadi, shuning uchun 6 ta pod 75 s emas, 40 s da almashadi.\n\nIkki himoya buning qaytishiga yo'l qo'ymaydi. Staging'dagi har bir rollout yuk testi ostida o'tadi va bitta 5xx paydo bo'lsa ham yiqiladi. Production'da rollout paytida 5xx ulushi 0.1% dan oshsa, rollout pauza qilinadi.",
          fields: {
            revert: "To'liq to'xtash ketma-ketligiga qaytish.",
            maxSurge: "Bir vaqtda ko'proq yangi pod: so'rovlarni uzmaydigan tezroq rollout.",
            "load test": "Deploy xatolari hech kim ular uchun to'lamaydigan staging'da topiladi.",
            "pause the rollout": "Yomon to'xtash oltita emas, birinchi pod'dan keyin to'xtaydi.",
          },
        },
      },
    },
  },
};

export default text;
