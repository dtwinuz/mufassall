import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Connection pooling",
  summary:
    "20 ta instance'dagi buyurtmalar API soniyasiga 2 000 ta so'rovga xizmat qiladi, har birida 5 ms lik bitta so'rov bor, baza esa 200 tagacha ulanishga ruxsat beradigan PostgreSQL. Har so'rovga yangi ulanish ochish so'rovning o'zidan qimmatga tushadi; har instance'ga pool qo'yish buni tuzatadi, keyin esa bazaning limitidan oshib ketadi. Pool hajmini Little qonuni belgilaydi, kutishni acquire timeout cheklaydi, oqish va uzun tranzaksiyalar ushlanadi, baza oldiga pooler qo'yiladi, bo'sh ulanishlar esa tarmoqdan oldin yopiladi.",
  learn: [
    "Yangi TCP + TLS + autentifikatsiya ulanishi necha millisekund turadi va baza buning uchun nega butun bir jarayon bilan to'laydi",
    "Nega pool hajmi ko'paytirilgan instance'lar soni max_connections ga sig'ishi kerak va pool Little qonuni bilan qanday hisoblanadi",
    "Acquire timeout, oqish va uzun tranzaksiyalar: baza bo'sh turganda pool qanday quriydi",
    "Transaction rejimidagi pooler va u nimani buzadi, balanser ortidagi idle timeout'lar va HTTP keep-alive pool'lari",
  ],
  nodes: {
    web: "Do'kon client'lari",
    api: "Buyurtmalar API (20 instance)",
    db: "PostgreSQL",
    pay: "To'lov provayderi",
    pooler: "Pooler",
    nlb: "Ichki TCP balanser",
  },
  metrics: {
    p99: "So'rov p99",
    newconn: "Bazaga yangi ulanishlar",
    conns: "Bazadagi ulanishlar",
    dbmem: "Ulanishlarga ketgan xotira",
    wait: "Pool'da kutish p99",
    err: "Yiqilgan so'rovlar",
  },
  steps: {
    setup: {
      short: "Boshlanish",
      title: "Har bir so'rov o'z ulanishini ochadi",
      body: "Buyurtmalar API 20 ta instance'da ishlaydi va soniyasiga 2 000 ta so'rovga xizmat qiladi. Har bir so'rov 5 ms davom etadigan bitta SQL so'rov bajaradi. Kod bazaga ulanish ochadi, so'rovni bajaradi va ulanishni yopadi.\n\nSo'rovning o'zi arzon qismi. U boshlanishidan oldin client va server TCP handshake, TLS handshake va parol almashinuvini bajaradi, PostgreSQL esa ulanish uchun butunlay yangi jarayon (process) ishga tushiradi: 5 ms lik ish uchun 8.5 ms tayyorgarlik, soniyasiga 2 000 marta.",
      watch: "Soniyasiga 2 000 ta jarayon ishga tushirish bazaning so'rovlarga sarflashi mumkin bo'lgan CPU'sini ham yeydi.",
      fields: {
        TCP: "Faqat soketni ochish uchun bitta borib-kelish.",
        "forks a backend process": "PostgreSQL har bir ulanishga alohida operatsion tizim jarayoni bilan xizmat qiladi.",
        "TLS 1.3": "Shifrlashni sozlash: yana borib-kelishlar va kalit almashish hisob-kitobi.",
        "SCRAM-SHA-256": "Parol tekshiruvi: bir nechta xabar va ikkala tomonda minglab hash aylanishlari.",
        SELECT: "Haqiqiy ish: 5 ms.",
        "2 000 times a second": "Har bir so'rov tayyorgarlikni qaytadan to'laydi, keyin ulanishni tashlab yuboradi.",
      },
    },
    pool: {
      short: "Pool",
      title: "Pool ulanishlarni ochiq saqlaydi va qarzga beradi",
      body: "Endi har bir instance'da **connection pool** bor. So'rov ochiq ulanishni **qarzga oladi**, SQL so'rovini bajaradi va qaytarib beradi; ulanish keyingi so'rov uchun ochiq qoladi. Tayyorgarlik har so'rovga emas, har ulanishga bir marta to'lanadi.\n\np99 41 ms dan 16 ms ga tushadi, yangi ulanishlar deyarli nolga tushadi, baza esa jarayon ishga tushirishga CPU sarflashni to'xtatadi. Sozlamalar kutubxonaning misolidan ko'chirilgan va ulardan ikkitasi tez orada muhim bo'lib qoladi.",
      fields: {
        maximum_pool_size: "Bu instance ochishi mumkin bo'lgan eng ko'p ulanish: 50.",
        minimum_idle: "Hech narsa bo'lmayotganda ham ochiq turadigan ulanishlar.",
        connection_timeout: "So'rov bo'sh ulanishni qancha kutadi: odatiy qiymati 30 s.",
        borrow: "Ulanishni ol, ishlat, qaytar. Hech narsa ochilmaydi va yopilmaydi.",
        reused: "Bitta ulanish soniyasiga 100 ga yaqin so'rovga xizmat qiladi.",
      },
    },
    "too-many": {
      short: "Juda ko'p",
      title: "50 talik 20 ta pool 200 ga sig'maydi",
      body: "Dushanba ertalab sekin hisobot so'rovi ulanishlarni uzoqroq ushlab turadi, so'rovlar to'planib qoladi va har bir pool o'zining 50 talik maksimumi tomon o'sadi. Yigirma instance **1 000** ta ulanish so'raydi. Baza 200 taga ruxsat beradi va 3 tasini superuser'larga saqlaydi, shuning uchun 198-ulanish rad etiladi.\n\nmax_connections ni 1 000 ga ko'tarish yechim emas. Har bir ulanish o'z xotirasi taxminan 10 MB bo'lgan jarayon: faqat ulanishlarning o'ziga 10 GB. 16 yadroli mashina esa bir paytda taxminan 16 ta so'rovni bajara oladi xolos; qolgan 984 tasi kutadi va lock'lar hamda kesh uchun talashadi.",
      check: {
        q: "Nega shunchaki max_connections = 1 000 qilib qo'ya qolmaslik kerak?",
        options: [
          "PostgreSQL 200 tadan ortiq ulanishga ruxsat bermaydi",
          "Har bir ulanish taxminan 10 MB lik jarayon, 16 yadro esa bir paytda 16 ga yaqin so'rov bajaradi: qolganlari faqat kutadi, xotira yeydi va talashishni oshiradi",
          "Chunki tarmoq 1 000 ta ulanishni ko'tarolmaydi",
        ],
        answer: 1,
        why: "Ko'proq ulanish CPU qo'shmaydi. Har yadroga bir nechta ulanishdan keyin o'tkazuvchanlik o'smay qo'yadi, kechikish esa o'sadi, xotira narxi ham oshib boraveradi. Yechim: kamroq ulanish, lekin yaxshiroq ishlatilgan.",
      },
      fields: {
        "1 000 connections wanted": "Pool maksimumi ko'paytirilgan instance'lar: baza qabul qila olishi kerak bo'lgan son.",
        max_connections: "Bazaning qat'iy limiti.",
        FATAL: "Baza yangi ulanishni to'g'ridan-to'g'ri rad etadi.",
        "one OS process": "Har bir ulanish uchun xotira, rejalashtirish va umumiy tuzilmalarda joy.",
        "16-core": "Bir paytda haqiqatan nechta so'rov bajarilishi mumkin.",
      },
    },
    size: {
      short: "Hajm",
      title: "Pool hajmini Little qonuni bilan hisobla",
      body: "Bir vaqtda nechta ulanish band bo'lishi tezlik ko'paytirilgan davomiylikka teng (**Little qonuni**): soniyasiga 2 000 so'rov ko'paytirilgan 5 ms, barcha instance'lar uchun birgalikda 10 ta ulanish. Portlashlar va sekin so'rovlar uchun uch barobar qilamiz: 30.\n\nBudjet: baza ruxsat bergan son minus boshqalarga kerak bo'lgani. 200 dan 3 tasi superuser'larga, 17 tasi cron vazifalar, admin vositalar va replikaga ketadi, qoladi 180. Har instance'ga 5 talik pool: eng ko'pi bilan 20 x 5 = 100, o'sish uchun 80 ta qoladi.",
      watch: "Kichik pool sekin pool degani emas: instance'dagi 5 ta ulanish soniyasiga 5 ms lik 100 ta so'rovga bemalol yetadi.",
      check: {
        q: "So'rovlar 5 ms dan 20 ms ga sekinlashdi, trafik o'sha soniyasiga 2 000. Endi nechta ulanish band?",
        options: ["10, avvalgidek", "40: to'rt barobar uzoq, demak bir vaqtda to'rt barobar ko'p band", "2 000, har so'rovga bittadan"],
        answer: 1,
        why: "Band ulanishlar = tezlik x davomiylik = 2 000 x 0.02 s = 40. Sekin so'rovlarga ko'proq ulanish kerak; shuning uchun zaxira muhim va tez-tez tugaydigan pool ko'pincha pool kichikligini emas, so'rovlar sekinligini bildiradi.",
      },
      fields: {
        "rate x time": "Little qonuni: bir vaqtda nechtasi jarayonda.",
        "= 10": "Barcha 20 ta instance bo'yicha o'rtacha band ulanishlar.",
        headroom: "Portlashlar va o'rtachadan sekin so'rovlar uchun zaxira.",
        budget: "Qolganlar o'z ulanishlarini olgandan keyin ilovaga qoladigan qism.",
        "per instance": "Budjet o'sishni hisobga olib instance'larga bo'lingan.",
      },
    },
    queue: {
      short: "Navbat",
      title: "Pool bo'sh bo'lsa, qisqa kut",
      body: "5 ta ulanishning hammasi band bo'lsa, keyingi so'rov pool navbatida kutadi. Kutubxonaning odatiy sozlamasi uni **30 s** kutishga qo'yadi, bu har qanday client kutishidan ancha uzoq, shuning uchun bitta yomon daqiqa minglab osilib qolgan so'rovga aylanadi.\n\nEndi acquire timeout 250 ms. O'z vaqtida ulanish ololmagan so'rov darhol Retry-After bilan 503 oladi, client qayta urinishi mumkin, thread'lar esa ushlanib qolmaydi. Pool nechta ulanish band, bo'sh va kutayotganini eksport qiladi, shunda to'lgan pool sezilishidan oldin ko'rinadi.",
      check: {
        q: "Yomon daqiqada 30 s lik acquire timeout nima qiladi?",
        options: [
          "Yomon hech narsa: so'rovlar shunchaki kutadi va keyinroq muvaffaqiyatli bo'ladi",
          "So'rovlar thread va xotirani ushlab 30 s osilib turadi, client'lar ancha oldin voz kechib qayta urinadi, navbat esa o'sishda davom etadi",
          "Pool maksimumidan ko'p ulanish ochadi",
        ],
        answer: 1,
        why: "Client'ning o'z timeout'idan uzoq kutish behuda: javob hech kim tinglamay qo'ygandan keyin keladi. Qisqa acquire timeout ortiqcha yukni tez va qayta urinsa bo'ladigan xatolarga aylantiradi.",
      },
      fields: {
        "Retry-After": "Client'ga qachon qayta urinish ma'noli ekanini aytadi.",
        active: "Hozir qarzga berilgan ulanishlar: 5 tasi ham.",
        pending: "Ulanish kutayotgan so'rovlar.",
        waited_ms: "250 ms lik acquire timeout tugadi.",
      },
    },
    held: {
      short: "Ushlangan",
      title: "Ushlab turilgan, lekin ishlamayotgan ulanishlar",
      body: "Bir haftadan keyin baza yarim bo'sh turgan holda pool yana quriydi. `pg_stat_activity` ikki xil isrofni ko'rsatadi.\n\nPulni qaytarish endpoint'i tranzaksiya ochadi, buyurtmani yangilaydi, keyin COMMIT'dan oldin to'lov provayderini chaqiradi, taxminan 0.9 s. Ulanish butun shu vaqt **idle in transaction** holatida turadi va qator lock'larini ushlab qoladi. Yana bitta xato yo'li ulanishni qaytarmasdan chiqib ketadi: bu **oqish** (leak). Har bunday xato bitta ulanishni butunlay olib ketadi, toki pool bo'shab qolguncha.",
      check: {
        q: "Soniyasiga 50 ta pul qaytarish har biri ulanishni 0.9 s ushlab turadi. Bu nechta ulanish oladi?",
        options: ["Taxminan 1", "Taxminan 45", "50"],
        answer: 1,
        why: "Yana Little qonuni: 50 x 0.9 s = bir vaqtda 45 ta band ulanish, bu 100 talik pool ajrata oladiganidan ko'p. Baza shu vaqt ichida hech narsa qilmaydi: ulanish boshqa servisni kutadi.",
      },
      fields: {
        "idle in transaction": "Tranzaksiya ochiq, lekin hech qanday so'rov bajarilmayapti: ulanish va uning lock'lari kutib turibdi.",
        in_tx: "Tranzaksiya qancha vaqtdan beri ochiq.",
        "payment provider": "Tranzaksiya ochiq turganda qilingan sekin tashqi chaqiruv.",
        "never returned": "Oqish: xato yo'lida qarzga olingan va hech qachon qaytarilmagan.",
      },
    },
    "held-fix": {
      short: "Qaytarish",
      title: "Kech ol, erta qaytar, har doim qaytar",
      body: "Uchta o'zgarish. Har bir qarz olish ulanishni har qanday yo'lda, xatolarda ham qaytaradigan blok ichida turadi. Ulanish 2 s dan ko'p ushlansa, pool stack trace yozadi, shunda keyingi oqish o'z qatorini o'zi ko'rsatadi. Baza tranzaksiyada 10 s bo'sh turgan har qanday sessiyani yopadi.\n\nTashqi chaqiruv esa tashqariga chiqadi: avval to'lov provayderi chaqiriladi, keyin qisqa tranzaksiya natijani 4 ms da yozadi. Pul qaytarishlar endi 45 ta emas, 0.2 ta ulanish band qiladi.",
      watch: "Tranzaksiya ochiq turganda hech qachon tarmoqni, foydalanuvchini yoki boshqa tizimdagi lock'ni kutma.",
      fields: {
        using: "Ichkarida nima bo'lishidan qat'i nazar, blok tugaganda ulanish qaytariladi.",
        leak_detection_threshold: "2 s dan ko'p ushlandi: kim olganini logga yoz.",
        idle_in_transaction_session_timeout: "Ochiq tranzaksiyasini unutgan sessiyalarni baza o'zi yopadi.",
        "then BEGIN": "Tranzaksiya sekin chaqiruvdan oldin emas, keyin boshlanadi.",
      },
    },
    pooler: {
      short: "Pooler",
      title: "Baza oldida pooler",
      body: "Instance'lardagi pool'lar baribir ko'payadi: instance'lar ikki barobar bo'lsa, ulanishlar ham ikki barobar. Baza oldidagi **pooler** bu bog'liqlikni uzadi. Instance'lar unga ulanadi, bu arzon, chunki unda har client uchun jarayon yo'q, u esa PostgreSQL'ga 25 ta haqiqiy ulanish ushlab turadi.\n\n**Transaction rejimida** client haqiqiy ulanishni faqat bitta tranzaksiya davomida ushlaydi va COMMIT'da qaytaradi. Bugun 100 ta client, ertaga 400 ta, server ulanishlari esa baribir 25 ta, chunki istalgan paytda faqat 10 tachasi band.",
      fields: {
        pool_mode: "Transaction rejimi: server ulanishi bitta tranzaksiyaga qarzga beriladi.",
        max_client_conn: "Pooler nechta ilova ulanishini qabul qiladi. Ular arzon.",
        default_pool_size: "Bazaga haqiqiy ulanishlar: xotira talab qiladigan son shu.",
        "server connections": "Instance'lar soni qancha bo'lmasin, 25 da qoladi.",
        "until COMMIT": "Tranzaksiyadan keyin o'sha server ulanishi boshqa client'ga xizmat qiladi.",
      },
    },
    "txn-mode": {
      short: "Tuzoqlar",
      title: "Transaction rejimi nimani buzadi",
      body: "Tranzaksiyada emas, sessiyada yashaydigan hamma narsa endi buziladi, chunki o'sha client'ning keyingi tranzaksiyasi boshqa server ulanishida bajarilishi mumkin.\n\n- Bitta ulanishda tayyorlangan **prepared statement** boshqasida yo'q: driver'da server tomonidagi prepared statement'larni o'chir yoki ularni kuzatadigan pooler versiyasini ishlat.\n- **SET** ulanishni keyin oladigan odamga o'tib ketadi: tranzaksiya ichida SET LOCAL ishlat.\n- **Sessiya advisory lock'lari** bitta ulanishda olinib, boshqasida qo'yib yuboriladi: tranzaksiya darajasidagi lock'ni ishlat.\n- **LISTEN**, vaqtinchalik jadvallar va uzun migratsiyalarga haqiqiy sessiya kerak: ularga to'g'ridan-to'g'ri ulanish yoki session rejimidagi pool ber.",
      check: {
        q: "So'rov tranzaksiyadan tashqarida `SET search_path = tenant_42` qiladi, keyin o'z SQL so'rovini. Nima buzilishi mumkin?",
        options: [
          "Hech narsa, SET faqat shu so'rovga ta'sir qiladi",
          "SQL so'rov sozlamasiz boshqa server ulanishida bajarilishi, keyingi client esa tenant_42 ning search_path'ini olishi mumkin",
          "Pooler SET buyruqlarini rad etadi",
        ],
        answer: 1,
        why: "Transaction rejimida SET va so'rov ikkita tranzaksiya va ikkita ulanishga tushishi mumkin. Sozlama birinchisida keyin keladigan kim bo'lsa, o'shaning uchun qoladi. Bitta tranzaksiya ichidagi SET LOCAL xavfsiz.",
      },
      fields: {
        "prepared statement": "Bitta server ulanishida tayyorlangan, uni hech ko'rmagan boshqasida bajarilgan.",
        "SET search_path": "Sessiya sozlamasi: bu client ketgandan keyin ham ulanishda qoladi.",
        pg_advisory_lock: "Sessiya lock'i: uni so'rovingiz emas, ulanish ushlaydi.",
        LISTEN: "Bitta ulanish bitta client bilan qolishini talab qiladi.",
        session: "Transaction rejimi siz uchun saqlamaydigan narsa.",
      },
    },
    idle: {
      short: "Bo'sh",
      title: "Tarmoq bo'sh ulanishlarni jimgina unutadi",
      body: "Pooler ichki TCP balanser ortida turadi, balanser esa **350 s** jimlikdan keyin oqimni hech bir tomonga aytmasdan tashlab yuboradi. Ilova pool'i bo'sh ulanishlarni 600 s saqlaydi. Tunda trafik kam, ko'p ulanishlar soatlab jim turadi.\n\n06:58 da birinchi so'rov shulardan biri orqali ketadi. Hech kim javob bermaydi, TCP paketni qayta yuboradi va kutishni faqat 15 s lik soket timeout'i tugatadi. Bu timeout bo'lmasa, kernel taxminan 15 daqiqa urinishda davom etardi.",
      check: {
        q: "Nega ertalabki birinchi so'rov darhol yiqilmasdan osilib qoladi?",
        options: [
          "Pooler hali uxlayapti va uyg'onishi uchun 15 s kerak",
          "Balanser ulanishni reset yubormasdan unutdi, shuning uchun ilova paketlari yo'qoladi va TCP timeout bo'lguncha qayta yuboraveradi",
          "Baza tunda qayta ishga tushgan",
        ],
        answer: 1,
        why: "Tashlab yuborilgan oqim xato bermaydi, faqat jimlik. Client sekin serverni o'lik yo'ldan ajrata olmaydi, shuning uchun soket timeout'ini yoki kernel'ning qayta yuborish limitini kutadi.",
      },
      fields: {
        "idle_timeout 350 s": "350 s jimlikdan keyin balanser ulanishni unutadi.",
        "600 s": "Pool bo'sh ulanishlarni tarmoqdan uzoqroq saqlaydi.",
        retransmits: "TCP paketni qayta-qayta bo'shliqqa yuboradi.",
        "socket timeout": "Ilovaning o'z limiti: 15 s, keyin xato va yangi ulanish.",
        "15 minutes": "Hech kim timeout qo'ymasa, kernel odatda shuncha vaqt urinadi.",
      },
    },
    keepalive: {
      short: "Keep-alive",
      title: "Har bir pool bo'sh ulanishlarini birinchi bo'lib yopadi",
      body: "Qoida: ulanishni ushlab turgan tomon uni o'rtadagi biror narsa unutishidan oldin yopishi kerak. Baza pool'i endi bo'sh ulanishlarni balanserning 350 s idan kam, 300 s da yopadi, har bir ulanishni biroz tasodifiy farq bilan 30 daqiqada almashtiradi va har 60 s da TCP keepalive yuboradi.\n\nHTTP uchun ham xuddi shunday. API to'lov provayderiga **keep-alive** pool ushlab turadi: u yerda yangi ulanish TCP va TLS uchun 31 ms turadi, qayta ishlatilgani esa hech narsa. Provayder bo'sh ulanishlarni 60 s da yopadi, shuning uchun client o'zinikini 50 s da yopadi va server yopayotgan soketga so'rov yubormaydi.",
      watch: "Qayta ishlatilgan ulanishda reset bilan yiqilgan so'rov allaqachon bajarilgan bo'lishi mumkin. Uni avtomatik ravishda faqat idempotent bo'lsa qayta yubor.",
      fields: {
        max_lifetime: "Eski ulanishlar jadval bo'yicha almashtiriladi, hammasi birdan qayta ulanmasligi uchun tasodifiy farq bilan.",
        tcp_keepalive: "Jim ulanishga kichik tekshiruv paketlari: o'lik yo'l bir daqiqa atrofida topiladi.",
        "keep-alive": "HTTP ulanishi keyingi so'rov uchun ochiq qoladi.",
        "new connection": "Pool bo'lmasa har bir so'rov to'laydigan narx.",
        reused: "Ko'p so'rovlar handshake'larni umuman o'tkazib yuboradi.",
        "Keep-Alive": "Server bo'sh ulanishni qancha saqlashini aytadi: 60 s.",
        max_per_host: "Baza uchun bo'lgan qoidaning o'zi: har bir manzilga limit.",
        idempotent: "Reset'dan keyin faqat takrorlash xavfsiz bo'lgan so'rov qayta yuboriladi.",
      },
    },
    recap: {
      short: "Xulosa",
      title: "Xulosa",
      body: "Connection pool uchun yetti qoida.\n\n1) Yangi ulanish TCP, TLS, autentifikatsiya va PostgreSQL'da butun bir jarayon turadi: har so'rovga ulanish ochma, qayta ishlat. 2) Pool hajmi ko'paytirilgan instance'lar soni, qo'shuv boshqa hammasi, max_connections ga sig'ishi kerak; har yadroga bir nechtadan ko'p ulanish bazani tezlashtirmaydi, sekinlashtiradi. 3) Hajmni Little qonuni bilan hisobla: tezlik x so'rov vaqti, ustiga zaxira. 4) Acquire timeout'ni qisqa qil va 30 s navbatda turgandan ko'ra 503 qaytar. 5) Ulanishni har bir yo'lda qaytar, oqishni aniqla va tarmoq chaqiruvi davomida tranzaksiyani ochiq qoldirma. 6) Transaction rejimidagi pooler ilova instance'larini baza ulanishlaridan ajratadi; sessiya holatidan (prepared statement, SET, advisory lock, LISTEN) qoch yoki bunday ishlarga to'g'ridan-to'g'ri ulanish ber. 7) Bo'sh ulanishlarni tarmoqdan oldin yop va HTTP keep-alive pool'lariga ham xuddi shunday qara.",
    },
  },
  scenarios: {
    autoscale: {
      label: "Autoscaling ikki barobar",
      steps: {
        "scale-out": {
          short: "Kengayish",
          title: "Autoscaler API'ni ikki barobar qiladi, baza yo'q deydi",
          body: "Aksiya boshlanadi, API CPU'si 80% ga yetadi va autoscaler 20 ta instance'dan 40 taga o'tadi. Har bir yangi instance o'zining 5 talik pool'ini ochadi. 40 x 5 qo'shuv 17 ta boshqa ulanish 217 bo'ladi, baza esa 200 taga ruxsat beradi.\n\nYangi instance'lar ulana olmaydi, readiness tekshiruvidan o'tmaydi va qayta-qayta restart bo'ladi. Qo'shimcha instance'lar baribir yordam bera olmasdi: sekin qism baza edi, ko'proq chaqiruvchi esa faqat ko'proq kutish qo'shadi.",
          check: {
            q: "Aksiyadan oldin buni nima to'xtatishi kerak edi?",
            options: [
              "Aksiyaga mo'ljallangan kattaroq baza",
              "Instance'lar x pool hajmini bitta budjet deb qarash: autoscaler maksimumi va pool hajmi maksimumda ham sig'adigan qilib birga belgilanadi",
              "Yangi instance'larda uzunroq acquire timeout",
            ],
            answer: 1,
            why: "Pool hajmi 20 ta instance uchun tanlangan, autoscaler limiti esa CPU uchun. Ularni hech kim ko'paytirib ko'rmagan. Ikkala son bazaning ulanish budjetiga qarab birgalikda belgilanishi kerak.",
          },
          fields: {
            "20 -> 40": "Autoscaler baza ulanishlariga emas, CPU'ga qarab ishlaydi.",
            "217 > 200": "Pool hajmi x instance'lar qo'shuv boshqalar, limitdan oshdi.",
            "remaining connection slots": "Oxirgi joylar superuser'larga saqlangan; ilova rad etiladi.",
            readiness: "Baza ulanishisiz yangi instance hech qachon tayyor bo'lmaydi.",
            bottleneck: "Limit baza bo'lsa, ko'proq ilova instance'i sig'im qo'shmaydi.",
          },
        },
        "scale-fix": {
          short: "Budjet",
          title: "Pool hajmi va autoscaler uchun bitta budjet",
          body: "Pool hajmi endi autoscaler maksimumidan kelib chiqadi: ilova uchun 180 ta ulanish bo'lingan eng ko'pi 40 ta instance, har instance'ga 4 ta. Ikkala son bitta config faylda turadi, shuning uchun birini o'zgartirgan odam ikkinchisini ham ko'radi.\n\n40 ta instance'da baza 160 ta ulanish ko'radi, budjet ichida. Ulanishlar max_connections ning 80% idan oshganda alert ishlaydi. 40 tadan ko'p instance'ga o'tish uchun kattaroq pool emas, avval pooler kerak.",
          fields: {
            budget: "Ilova jami ishlatishi mumkin bo'lgan ulanishlar.",
            max_replicas: "Autoscaler shifti, pool hajmi yoniga yozilgan.",
            "floor(180 / 40)": "Budjet bo'lingan hech qachon bo'lishi mumkin bo'lgan eng ko'p instance'ga.",
            alert: "Baza rad eta boshlashidan oldin ogohlantiradi.",
            pooler: "Baza ulanishlarini oshirmasdan instance'larni ko'paytirish yo'li.",
          },
        },
      },
    },
  },
};

export default text;
