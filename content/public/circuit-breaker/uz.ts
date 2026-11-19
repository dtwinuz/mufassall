import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Circuit breaker",
  summary:
    "Mahsulot API har bir sahifani ikki servisdan yig'adi: sharhlar va ombor qoldig'i. Sharhlar servisi sekinlashadi va 2 s timeout bo'lsa ham API'ning barcha thread'larini egallab oladi, natijada sharhlarga umuman aloqasi yo'q sahifalar ham yiqiladi. Aniq chegaralar bilan sozlangan circuit breaker bu zanjirni to'xtatadi, zaxira javob sahifani foydali saqlaydi, bulkhead esa breaker ko'rmaydigan \"yarim kasal\" holatni yopadi. Oxirida qayta urinishlar, har instance'dagi holat, alert'lar va juda past qo'yilgan chegara ko'rib chiqiladi.",
  learn: [
    "Timeout bo'lsa ham bitta sekin servis uni chaqirayotgan servisni qanday yiqitadi va buning hisob-kitobi",
    "Closed, open va half-open holatlari aniq chegaralar bilan: 20 ta chaqiruvdan 50%, sekin chaqiruv ham xato hisoblanadi, 30 s ochiq, 3 ta sinov chaqiruvi",
    "Zaxira javoblar (keshdagi qiymat, qisqartirilgan javob, Retry-After bilan 503) va bulkhead: har bir servisga alohida limit",
    "Qayta urinish breaker'ga nisbatan qayerda turadi, har instance'dagi va umumiy holat, qaysi metrika va alert'lar kerak",
  ],
  nodes: {
    web: "Internet do'kon",
    api: "Mahsulot API",
    reviews: "Sharhlar servisi",
    stock: "Ombor servisi",
    rdb: "Sharhlar bazasi",
    sdb: "Ombor bazasi",
    breaker: "Breaker (API ichida)",
    cache: "Zaxira kesh",
  },
  metrics: {
    p99: "Sahifa p99",
    err: "Yiqilgan sahifalar",
    threads: "Band API thread'lari",
    revcalls: "Sharhlarga chaqiruv",
    opens: "Breaker ochilishi",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Har bir mahsulot sahifasi ikki servisdan so'raydi",
      body: "Internet do'kon soniyasiga 600 ta mahsulot sahifasini ochadi. Har biri uchun mahsulot API **sharhlar** servisini (80 ms) va **ombor** servisini (20 ms) chaqiradi va javoblarni birlashtiradi.\n\nAPI 12 ta instance'da ishlaydi, har birida 200 ta ishchi thread. Oddiy kunda thread'larning to'rtdan biri band, sahifa p99 esa 180 ms.",
      fields: {
        "Server-Timing": "Bu sahifa uchun har bir servis qancha vaqt oldi: yaxshi kunda ham eng sekini sharhlar.",
        in_stock: "Ombor servisidan. Usiz mijoz sotib ololmaydi.",
        reviews: "Sharhlar servisidan. Bo'lsa yaxshi: usiz ham sahifa foydali.",
      },
    },
    cascade: {
      short: "Zanjir",
      title: "Sharhlar sekinlashadi, API ham u bilan birga o'ladi",
      body: "Sharhlar bazasida og'ir qayta indekslash boshlanadi va sharhlar servisi 80 ms o'rniga 10 s da javob beradi. API 2 s dan keyin voz kechadi, demak har bir chaqiruv baribir thread'ni 2 s ushlab turadi.\n\nSoniyasiga 600 chaqiruv ko'paytirilgan 2 s, bir vaqtda kutayotgan 1 200 ta chaqiruv degani, instance'da esa 200 ta thread bor. Bir necha soniyada har bir thread sharhlarni kutadi, so'rovlar ularning ortida navbatga turadi, hatto sharhlarni hech qachon chaqirmaydigan savat ham yiqiladi. Bo'lsa yaxshi bo'lgan servisdagi muammo butun do'kon to'xtashiga aylandi: bu **zanjirli nosozlik** (cascading failure).",
      watch: "Endi API'ni chaqirayotganlar ham o'z thread'larini uni kutib ushlab turadi, shuning uchun zanjir yana bir pog'ona yuqoriga ko'tarilishi mumkin.",
      check: {
        q: "API'da allaqachon 2 s timeout bor. Nega baribir thread'lar tugaydi?",
        options: [
          "Timeout sekin javoblarda ishlamaydi, faqat rad etilgan ulanishlarda ishlaydi",
          "Har bir chaqiruv baribir 2 s gacha kutadi: 600/s x 2 s = 1 200 ta kutayotgan chaqiruv, bu 200 ta thread'dan olti barobar ko'p",
          "Sharhlar sekin bo'lganda API'ga ko'proq trafik qaytaradi",
        ],
        answer: 1,
        why: "Timeout bitta chaqiruv qancha kutishini cheklaydi, nechta chaqiruv bir vaqtda kutishini emas. Bir vaqtdagi chaqiruvlar soni = tezlik x kutish (Little qonuni). 2 s kutishda API'ga 1 200 ta thread kerak, unda esa 200 ta. Kerakli narsa: baribir xato bo'ladigan chaqiruvlarni umuman qilmaslik.",
      },
      fields: {
        "200/200 busy": "Bu instance'ning hamma ishchi thread'lari band.",
        timeout: "2 s lik timeout ishlaydi, lekin bunday tezlikda har chaqiruvga 2 s juda uzoq.",
        "in flight": "Tezlik x kutish: bir paytda nechta chaqiruv kutib turibdi.",
        "/v1/cart": "Sharhlardan foydalanmaydi, lekin bo'sh thread topolmaydi: zanjir aynan shu.",
      },
    },
    closed: {
      short: "Closed",
      title: "Xatolarni va sekin chaqiruvlarni sanaydigan breaker",
      body: "Endi API sharhlarni **circuit breaker** orqali chaqiradi. U **closed** (yopiq) bo'lganda har bir chaqiruv o'tadi, breaker esa oxirgi 20 ta chaqiruv natijasini eslab qoladi. Ularning kamida yarmi xato bo'lsa, u ochiladi.\n\nChaqiruv xato bersa yoki 1 s dan uzoq davom etsa, xato hisoblanadi. Eng muhimi sekinlik qoidasi: zanjirli nosozlikda sharhlar xato qaytarmadi, shunchaki sekin edi. Faqat xatolarni sanaydigan breaker hech qachon ochilmagan bo'lardi.",
      watch: "Sekinlik chegarasini timeout'dan emas, servisning haqiqiy p99 idan (bu yerda 250 ms) keng zaxira bilan oling.",
      check: {
        q: "Nega faqat xato va timeout'larni sanash yetmaydi?",
        options: [
          "Chunki timeout'dan qisqa sekin javob ham thread'ni ushlab turadi: 1.9 s lik javoblar bitta ham xatosiz pool'ni quritadi",
          "Chunki xatolarni HTTP client allaqachon sanaydi",
          "Sabab yo'q: sekin chaqiruvlar muvaffaqiyatli, demak hammasi joyida",
        ],
        answer: 0,
        why: "Tugaydigan narsa thread'lar, thread esa chaqiruv qancha davom etsa, shuncha band, xato bo'ladimi yo'qmi farqi yo'q. 1 s dan sekin chaqiruvlarni sanash breaker'ga timeout'gacha yetmasdan sekinlikka javob berish imkonini beradi.",
      },
      fields: {
        CLOSED: "Oddiy holat: chaqiruvlar o'tadi, natijalar sanaladi.",
        window: "Bir daqiqalik emas, oxirgi 20 ta chaqiruvdan iborat siljuvchi oyna: har qanday trafikda ishlaydi.",
        minimum_calls: "20 ta chaqiruvgacha qaror yo'q: 2 tadan 1 ta xato hali 50% xato degani emas.",
        failure_rate_threshold: "Oynaning yarmi xato bo'lsa ochiladi.",
        slow_call_duration: "1 s dan sekini xato hisoblanadi, bu odatiy p99 dan to'rt barobar ko'p.",
        wait_in_open: "Qayta urinishdan oldin qancha vaqt chaqirmay turish.",
        trial_calls: "Orqaga qaytishni nechta sinov chaqiruvi hal qiladi.",
      },
    },
    open: {
      short: "Open",
      title: "Open: kutma, darhol rad et",
      body: "Oxirgi 20 ta chaqiruvdan 14 tasi 1 s dan sekin, 2 tasi xato: 80%. Breaker **ochiladi** (open). Keyingi 30 s davomida API sharhlarni umuman chaqirmaydi: chaqiruv 0.2 ms da rad etiladi, sahifa esa o'sha qismsiz yig'iladi.\n\nThread'lar kutishni to'xtatadi, band ulush 100% dan 30% ga tushadi, savat yana ishlaydi. Sharhlar servisi bu instance'dan trafik olmaydi va qayta indekslashni tugatib olishi mumkin.",
      fields: {
        OPEN: "Chaqiruvlar yuborilmaydi. Har biri o'sha zahoti rad etiladi.",
        "slower than 1 s": "Xato emas, shunchaki juda sekin: sekinlik qoidasi bo'yicha xato hisoblanadi.",
        "failure rate": "20 tadan 16 tasi, ya'ni 80%, 50% chegaradan yuqori.",
        "not permitted": "2 000 ms emas, 0.2 ms: thread darhol bo'shaydi.",
      },
    },
    fallback: {
      short: "Zaxira",
      title: "O'rniga nima javob berish kerak",
      body: "Ochiq breaker faqat \"chaqirma\" deydi. Mijoz nima olishi alohida qaror va u har bir endpoint uchun qabul qilinadi:\n\n- **keshdagi qiymat**: zaxira keshdagi oxirgi to'g'ri reyting, eskirgan deb belgilangan;\n- **qisqartirilgan javob**: sharhlar blokisiz sahifa va buni aytib turadigan header;\n- **Retry-After: 30 bilan 503**: faqat sharhlardan iborat endpoint uchun, masalan `/v1/products/88/reviews`, shunda client'lar darhol qayta urinmasdan breaker kutish vaqtidan keyin qaytadi.\n\nMahsulot sahifasi birinchisini ishlatadi: 9 daqiqa oldingi reyting reytingsizlikdan yaxshiroq.",
      watch: "Zaxira javobda hech qachon ma'lumot to'qima. Ombor qoldig'i yoki narx uchun eskirgan yoki o'ylab topilgan qiymat yo'q narsani sotib yuborishi mumkin; u yerda halol xato to'g'ri javob.",
      fields: {
        "X-Degraded": "Javobning qaysi qismlari jonli emasligini client'ga va loglarga aytadi.",
        stale: "Reyting sharhlar servisidan emas, keshdan keldi.",
        reviews_age_s: "Keshdagi qiymat necha yoshda: 540 s. UI \"9 daqiqa oldingi reyting\" deb yozishi mumkin.",
      },
    },
    "half-open": {
      short: "Half-open",
      title: "Half-open: uchta sinov chaqiruvi hal qiladi",
      body: "30 s dan keyin breaker **half-open** (yarim ochiq) holatga o'tadi va aynan 3 ta haqiqiy chaqiruvni o'tkazadi. Qolgan har bir chaqiruv hali ham zaxira javob oladi. Uchalasi ham taxminan 100 ms da javob beradi, breaker yopiladi, oynasini tozalaydi va trafik qaytadi.\n\nAgar 3 tadan 2 tasi xato bo'lganda, breaker yana 30 s ga ochilardi. Nega bitta emas, uchta: bitta sinov sog'lom servisda tasodifan yiqilishi yoki kasal servisda tasodifan o'tib ketishi mumkin.",
      check: {
        q: "Nega 30 s dan keyin butun trafikni shunchaki qo'yib yuborib ko'rmaslik kerak?",
        options: [
          "Natija bir xil bo'lardi: sharhlar hali kasal bo'lsa, breaker bir zumda yana ochiladi",
          "Soniyasiga 600 chaqiruv hali kasal yoki endi qizib kelayotgan servisga uriladi: oyna to'lguncha zanjir takrorlanadi",
          "Sharhlar servisi qayta ishga tushgandan keyin 3 tadan ortiq chaqiruv qabul qila olmaydi",
        ],
        answer: 1,
        why: "Qaytayotgan servis ko'pincha sovuq: keshlari bo'sh, ulanishlar pool'i kichik. To'liq trafik uni yana yiqitishi mumkin, 20 ta chaqiruv sanalguncha esa API thread'lari yana uni kutadi. Bir nechta sinov chaqiruvi uni deyarli tekinga tekshiradi.",
      },
      fields: {
        HALF_OPEN: "Sinov holati: belgilangan sondagi chaqiruv o'tadi, qolganlari zaxira javob oladi.",
        "trial 1": "Health check emas, haqiqiy so'rov: sahifa aslida ishlatadigan yo'lni tekshiradi.",
        fallback: "3 ta sinovdan tashqari chaqiruvlar natijani kutmaydi.",
        CLOSED: "Yana oddiy holat, sanash noldan boshlanadi.",
        "OPEN again": "Muvaffaqiyatsiz sinov 30 s lik kutishni qaytadan boshlaydi.",
      },
    },
    "half-sick": {
      short: "Yarim kasal",
      title: "Sekin, lekin breaker ochiladigan darajada emas",
      body: "Bir haftadan keyin sharhlarning uchta replikasidan birida disk buziladi. Chaqiruvlarning uchdan biri 1.9 s davom etadi, timeout'dan biroz kam. Sekinlar ulushi 30%, 50% chegaradan past, shuning uchun breaker yopiq qoladi va u haq: chaqiruvlarning 70% i joyida.\n\nLekin thread'lar boshqacha sanaladi: 600 x (0.7 x 0.08 s + 0.3 x 1.9 s) = 376 ta thread kerak, bor-yo'g'i 200 ta. Pool yana quriydi va breaker yopiq turgan holda sahifalar yana yiqiladi.",
      check: {
        q: "Bu yerda ochilishi uchun chegarani 25% ga tushirish kerakmi?",
        options: [
          "Ha, past chegara har doim xavfsizroq",
          "Yo'q: unda 70% i joyida bo'lgan barcha sharhlar kesib tashlanadi va odatiy tebranishlarda ham ochiladi; yetishmayotgan narsa sharhlar nechta thread egallashi mumkinligiga limit",
          "Yo'q, buning o'rniga timeout'ni 5 s ga oshirish kerak",
        ],
        answer: 1,
        why: "Breaker \"bu servis buzildimi?\" degan savolga javob beradi. Bu yerda u buzilmagan, qisman sekin. Muammo shundaki, u barcha thread'larni egallab olishi mumkin. Buning uchun boshqa xato chegarasi emas, bir vaqtdagi chaqiruvlarga limit kerak.",
      },
      fields: {
        "30% of calls": "Bitta kasal replikadan kelayotgan sekin chaqiruvlar.",
        "slow call rate": "30% 50% dan past: o'z qoidalariga ko'ra breaker'da ochilish uchun sabab yo'q.",
        CLOSED: "Yopiq va to'g'ri, API esa baribir cho'kmoqda.",
        "threads needed": "Yana Little qonuni: o'rtacha kutish x tezlik.",
      },
    },
    bulkhead: {
      short: "Bulkhead",
      title: "Bulkhead: har bir servisga alohida limit",
      body: "Kema korpusi ichidagi to'siqlar kabi **bulkhead** API sig'imini bo'laklarga ajratadi: sharhlarga bir vaqtda ko'pi bilan 60 ta chaqiruv, omborga ko'pi bilan 40 ta, qolgan thread'lar esa tashqi chaqiruvlarga hech qachon ishlatilmaydi. Sharhlar uchun 60 ta joy to'lganda yangi chaqiruv navbatga qo'yilmaydi, 0.1 ms da rad etiladi va sahifa keshdagi reytingni oladi.\n\nEndi soniyasiga atigi 96 ta sharh chaqiruvi o'tadi, ko'p sahifalar keshdagi reytingni ko'rsatadi. Lekin bitta ham sahifa yiqilmaydi, ombor va savat esa hech narsani sezmaydi.",
      watch: "Bulkhead rad etishi sharhlar servisining xatosi emas. Uni breaker oynasida sanatmang, aks holda to'lgan bulkhead breaker'ni o'zi ochib yuboradi.",
      fields: {
        max_concurrent: "To'siq: bitta servisga bir vaqtda bundan ko'p chaqiruv yo'q.",
        max_wait: "0 ms: to'lgan bulkhead thread'lar navbatini o'stirmasdan darhol rad etadi.",
        rest: "Kasal servis hech qachon ololmaydigan thread'lar.",
        rejected: "Chaqiruv darhol rad etiladi va zaxira javob ishlatiladi.",
      },
    },
    retries: {
      short: "Qayta urinish",
      title: "Qayta urinish breaker'dan tashqarida va budjet ichida",
      body: "Sharhlar yana sog'lom, jamoa esa vaqti-vaqti bilan yiqiladigan chaqiruv uchun bitta qayta urinish qo'shmoqchi. O'ramlar tartibi muhim: **qayta urinish** tashqarida, keyin breaker, bulkhead va ichkarida 1 s timeout. Har bir urinish breaker orqali o'tadi, shuning uchun breaker har bir xatoni ko'radi.\n\nQayta urinish zarar keltirmasligi uchun ikki qoida bor. Ochiq breaker rad etgan chaqiruvga qayta urinilmaydi: u yana rad etiladi. Va qayta urinishlar chaqiruvlarning ko'pi bilan 5% i bo'ladi, shunda haqiqiy nosozlikda ular yukni ikki barobar emas, soniyasiga 30 ta chaqiruvga oshiradi.",
      check: {
        q: "Qayta urinish breaker ichiga qo'yildi: breaker 3 ta urinish qilgan bitta chaqiruvni ko'radi. Nima buziladi?",
        options: [
          "Hech narsa, bu shunchaki boshqa tartib",
          "Breaker timeout bo'lgan uchta urinish uchun bitta xato sanaydi, shuning uchun kechroq ochiladi, har bir sanalgan chaqiruv esa thread'ni 3 s ushlab turishi mumkin",
          "Breaker uch barobar tez-tez ochiladi",
        ],
        answer: 1,
        why: "Breaker ichida qayta urinishlar xatolarni undan yashiradi va thread band turish vaqtini ko'paytiradi. Tashqarida esa har bir urinish sanaladi, ochiq breaker qayta urinishlarni ham to'xtatadi.",
      },
      fields: {
        retry: "Eng tashqi o'ram: yana urinish kerakmi, shuni hal qiladi.",
        "breaker records": "Har bir urinish sanaladi, shuning uchun xato ulushi haqiqiy.",
        jitter: "Pauzaning tasodifiy qismi: ko'p so'rovlarning qayta urinishlari birga kelmaydi.",
        budget: "Qayta urinishlar chaqiruvlarning 5% i bilan cheklangan: 600 ustiga soniyasiga 30 ta.",
        "not permitted": "Ochiq breaker javobning o'zi, qayta urinish kerak bo'lgan xato emas.",
      },
    },
    instances: {
      short: "Instance'lar",
      title: "Odatda har instance'ga bitta breaker yetarli",
      body: "12 ta API instance'ining har birida o'z breaker'i bor va u faqat o'z chaqiruvlarini sanaydi. Har instance'da soniyasiga 50 ta sharh chaqiruvi bo'lsa, 20 ta chaqiruvlik oyna 0.4 s da to'ladi, shuning uchun 14:02 da 12 tasi ham bir-biridan bir soniya ichida ochildi.\n\nTashqi xotirada saqlanadigan umumiy breaker holati ularni aniq kelishtirardi, lekin har bir chaqiruvga tarmoq qadamini va yiqilishi mumkin bo'lgan yana bitta bog'liqlikni qo'shadi. Bu faqat har instance shunchalik kam chaqiruv ko'radiki, oynasi daqiqalab to'ladigan holatda o'zini oqlaydi.",
      fields: {
        "each counts only its own calls": "O'n ikkita mustaqil breaker, hech qanday kelishuvsiz.",
        "fills in 0.4 s": "Trafik yetarli bo'lsa, har instance yangi ma'lumot bo'yicha qaror qiladi.",
        "all 12": "Ular biroz farqli vaqtda ochiladi, bundan zarar yo'q.",
        "shared state": "Aniq kelishuv, lekin kechikish va yangi nosozlik nuqtasi evaziga.",
      },
    },
    alerts: {
      short: "Alert'lar",
      title: "Ochilgan breaker ko'rinib turishi kerak",
      body: "Breaker nosozlikni mijozlardan yashiradi, demak uni jamoadan ham yashirishi mumkin. Har bir instance har bir breaker holatini, o'tishlar hisoblagichini va rad etilgan chaqiruvlar hisoblagichini eksport qiladi.\n\nBoshlash uchun ikki alert yetarli: kamida 3 ta instance'da 2 daqiqadan ko'p ochiq turish navbatchi muhandisni uyg'otadi, chunki servis haqiqatan ishlamayapti; 15 daqiqada 4 martadan ko'p ochilish tiket ochadi, chunki breaker **tebranmoqda** (flapping) va sozlamalari ehtimol noto'g'ri.",
      fields: {
        breaker_state: "Har bir servisga bitta gauge: har instance'da closed, open yoki half-open.",
        breaker_transitions_total: "Har bir o'zgarishni sanaydi. Kuzatiladigan raqam: soatiga ochilishlar.",
        breaker_not_permitted_total: "Nechta chaqiruv zaxira javob oldi: mijozlarga ta'sir hajmi.",
        "open for more than 2 min": "Tebranish emas: kimdir servisga qarashi kerak.",
        flapping: "Sog'lom servisda qayta-qayta ochilib-yopilish: noto'g'ri chegara belgisi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Circuit breaker uchun yetti qoida.\n\n1) Timeout bitta chaqiruv qancha kutishini cheklaydi, nechtasi kutishini emas: tezlik x kutish thread'laringizga sig'ishi kerak. 2) Sekin chaqiruvlarni xato deb sana, chegarani odatiy p99 dan ancha yuqori qo'y. 3) Yetarlicha chaqiruvli oyna bo'yicha qaror qil (bu yerda 20 tadan 50%), belgilangan vaqt ochiq tur (30 s), orqaga qaytishni bir nechta sinov chaqiruvi (3) hal qilsin. 4) Zaxira javobni har endpoint uchun tanla: keshdagi qiymat, qisqartirilgan javob yoki Retry-After bilan 503; hech qachon ma'lumot to'qima. 5) Breaker haqli ravishda e'tiborsiz qoldiradigan qisman kasal holat uchun har servisga bulkhead qo'sh. 6) Qayta urinish breaker'dan tashqarida, rad etishdan keyin hech qachon, budjet ichida. 7) Odatda har instance'dagi holat yetarli; uzoq ochiq turishga va tebranishga alert qo'y.",
    },
  },
  scenarios: {
    flapping: {
      label: "Juda past chegara",
      steps: {
        "flap-open": {
          short: "Tebranish",
          title: "Har bir kichik tebranishda ochiladigan breaker",
          body: "\"Tezroq reaksiya bo'lsin\" deb kimdir breaker'ni 10 ta chaqiruvlik oynada 10% xatoda ochiladigan qilib, sekinlik chegarasini 300 ms qilib qo'yadi. Sharhlarning oddiy deploy'ida bitta replika qayta ishga tushadi, 10 tadan 2 ta chaqiruv 340 ms davom etadi va breaker ochiladi.\n\n30 s dan keyin sinovlar o'tadi va u yopiladi, keyingi garbage collection pauzasigacha. Soatiga 14 marta ochilish, har biri sharhlarni sahifadan 30 s ga yashiradi, holbuki sharhlar servisi butun vaqt sog'lom edi.",
          check: {
            q: "Sog'lom servisda breaker'ni nima ochib yubordi?",
            options: [
              "Sharhlar aslida yiqilayotgan edi va breaker haq edi",
              "10 ta chaqiruvlik oyna va 10% chegara bitta sekin chaqiruv uni ochadi degani, 300 ms esa odatiy 250 ms lik p99 ga juda yaqin: oddiy shovqin nosozlikka o'xshab ko'rinadi",
              "Ochiq holatdagi 30 s lik kutish juda qisqa",
            ],
            answer: 1,
            why: "Har bir servisda tebranishlar bo'ladi: deploy'lar, GC pauzalari, sovuq kesh. Chegara sog'lom servisning eng yomon odatiy oynasidan yuqorida turishi, oyna esa bitta chaqiruv hal qila olmaydigan darajada katta bo'lishi kerak.",
          },
          fields: {
            failure_rate_threshold: "10%: 10 ta chaqiruvlik oynada bitta yomon chaqiruv yetarli.",
            OPEN: "Sharhlar har bir sahifadan 30 s ga yo'qoladi.",
            HALF_OPEN: "Sinovlar o'tadi, chunki servis boshidan joyida edi.",
            "GC pause": "Oddiy 320 ms pauza, endi breaker'ni ochishga yetadi.",
            "14 opens": "Har biri sahifada 30 s lik teshik, uni breaker'ning o'zi yaratgan.",
          },
        },
        "flap-fix": {
          short: "O'lchash",
          title: "Chegarani o'lchangan tebranishlardan qo'y",
          body: "Jamoa bir haftalik ma'lumotga qaraydi. Sog'lom kundagi eng yomon 20 ta chaqiruvlik oynada 15% xato bo'lgan, p99 410 ms. 14:02 dagi haqiqiy nosozlikda 80%.\n\nSozlamalar 20 ta chaqiruvdan 50% ga, har qanday qarordan oldin kamida 20 ta chaqiruvga va 1 s lik sekinlik chegarasiga qaytariladi: odatiy shovqindan ancha yuqori, haqiqiy nosozlikdan ancha past. Ochilishlar nolga tushadi, eski sozlamalarda 3 marta ishlagan tebranish alert'i esa buni mijozlardan oldin ushlagan bo'lardi.",
          fields: {
            minimum_calls: "20 tadan kam chaqiruvda qaror yo'q.",
            "worst 20-call window": "Sog'lom haftaning shovqin darajasi: chegara undan yuqori bo'lishi kerak.",
            "real outage": "Breaker aynan shu uchun bor: chegara undan past bo'lishi kerak.",
            "flapping alert": "Kuzatilgan soatlik ochilishlar noto'g'ri sozlamani erta ushlaydi.",
          },
        },
      },
    },
  },
};

export default text;
